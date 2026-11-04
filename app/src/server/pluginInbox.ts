// Ontvangstpunt voor de in-game plugin "Ons Pap sync" (../../../plugin/ons-pap-sync). Alleen Node, alleen in de
// dev-server: vite.config.ts hangt deze handler via configureServer aan de middleware. De app zelf importeert
// dit bestand niet.
//
//   POST /api/plugin/sync    JSON van de plugin; schrijft .plugin/latest.json en voegt events toe aan .plugin/events.jsonl
//   GET  /api/plugin/latest  de laatste snapshot (latest.json) of 404
//
// Andere methodes krijgen een 405 met een Allow-header. CORS is niet nodig: de plugin post rechtstreeks
// vanuit de game-client. Een verzoek met een Origin-header van een andere site dan localhost wordt geweigerd,
// zodat een willekeurige webpagina in de browser niets in de inbox kan zetten.

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

export const SYNC_PATH = "/api/plugin/sync";
export const LATEST_PATH = "/api/plugin/latest";
/** Een volledige snapshot met alle quests is ruim onder de 100 kB; alles boven 1 MB is geen plugin-verzoek. */
export const MAX_BODY_BYTES = 1_000_000;

export type PluginQuestStatus = "COMPLETED" | "STARTED" | "NOT_STARTED";
export type PluginEventKind = "levelup" | "quest" | "xp";

export interface PluginSkill {
  id: number;
  name: string;
  level: number;
  xp: number;
}
export interface PluginQuest {
  id: number | null;
  name: string;
  status: PluginQuestStatus;
  questPoints: number;
  members: boolean;
  difficulty: number | null;
  eligible: boolean | null;
}
export interface PluginEvent {
  /** Unix-seconden. */
  at: number;
  kind: PluginEventKind;
  text: string;
}

/** Wat de plugin stuurt, na validatie. */
export interface PluginSync {
  v: 1;
  account: string;
  sentAt: number | null;
  skills: PluginSkill[];
  quests: PluginQuest[] | null;
  events: PluginEvent[];
}

/** Inhoud van .plugin/latest.json (ook het antwoord van GET /api/plugin/latest). */
export interface StoredPluginSnapshot {
  v: 1;
  account: string;
  sentAt: number | null;
  /** ISO-tijd waarop de dev-server het verzoek ontving (klok van deze computer). */
  receivedAt: string;
  skills: PluginSkill[];
  /** Laatst bekende questlijst; blijft staan als een latere bundel zonder quests komt. */
  quests: PluginQuest[] | null;
  /** ISO-tijd van de verzending waarin `quests` zat. */
  questsAt: string | null;
}

const STATUSES = new Set<string>(["COMPLETED", "STARTED", "NOT_STARTED"]);
const KINDS = new Set<string>(["levelup", "quest", "xp"]);

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isInt = (x: unknown): x is number => isNum(x) && Number.isInteger(x);
/** RuneScape gebruikt in namen soms een harde spatie; die wordt een gewone spatie. */
const cleanName = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

function parseSkill(x: unknown): PluginSkill | null {
  if (!isObj(x) || !isInt(x.id) || x.id < 0 || x.id > 99) return null;
  if (typeof x.name !== "string" || !isInt(x.level) || x.level < 0 || !isNum(x.xp) || x.xp < 0) return null;
  return { id: x.id, name: x.name.slice(0, 40), level: x.level, xp: Math.floor(x.xp) };
}

function parseQuest(x: unknown): PluginQuest | null {
  if (!isObj(x) || typeof x.name !== "string" || x.name.trim() === "" || typeof x.status !== "string" || !STATUSES.has(x.status)) return null;
  return {
    id: isInt(x.id) ? x.id : null,
    name: x.name.trim().slice(0, 200),
    status: x.status as PluginQuestStatus,
    questPoints: isInt(x.questPoints) && x.questPoints >= 0 ? x.questPoints : 0,
    members: x.members !== false,
    difficulty: isInt(x.difficulty) ? x.difficulty : null,
    eligible: typeof x.eligible === "boolean" ? x.eligible : null,
  };
}

function parseEvent(x: unknown, nowSec: number): PluginEvent | null {
  if (!isObj(x) || typeof x.kind !== "string" || !KINDS.has(x.kind) || typeof x.text !== "string") return null;
  return { at: isNum(x.at) && x.at > 0 ? Math.floor(x.at) : nowSec, kind: x.kind as PluginEventKind, text: x.text.slice(0, 500) };
}

/**
 * Minimale controle: `v` is 1, `account` is een niet-lege string en `skills` is een array. Losse skills, quests
 * en events die niet kloppen, vallen weg in plaats van het hele verzoek af te keuren.
 */
export function validateSync(body: unknown, now: Date = new Date()): { ok: true; value: PluginSync } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: "verwacht een JSON-object" };
  if (body.v !== 1) return { ok: false, error: "onbekende versie (v moet 1 zijn)" };
  if (typeof body.account !== "string" || cleanName(body.account) === "") return { ok: false, error: "account ontbreekt" };
  if (!Array.isArray(body.skills)) return { ok: false, error: "skills moet een array zijn" };
  const nowSec = Math.floor(now.getTime() / 1000);
  const skills = body.skills.map(parseSkill).filter((s): s is PluginSkill => s !== null);
  const quests = Array.isArray(body.quests) ? body.quests.map(parseQuest).filter((q): q is PluginQuest => q !== null) : null;
  const events = Array.isArray(body.events) ? body.events.map((e) => parseEvent(e, nowSec)).filter((e): e is PluginEvent => e !== null) : [];
  return {
    ok: true,
    value: {
      v: 1,
      account: cleanName(body.account).slice(0, 40),
      sentAt: isNum(body.sentAt) ? Math.floor(body.sentAt) : null,
      skills,
      quests,
      events,
    },
  };
}

/** Nieuwe latest.json: quests blijven van de vorige snapshot als deze bundel er geen heeft (zelfde account). */
export function nextSnapshot(sync: PluginSync, prev: StoredPluginSnapshot | null, now: Date = new Date()): StoredPluginSnapshot {
  const receivedAt = now.toISOString();
  const same = prev && prev.account.toLowerCase() === sync.account.toLowerCase();
  const keepQuests = sync.quests === null && same;
  return {
    v: 1,
    account: sync.account,
    sentAt: sync.sentAt,
    receivedAt,
    // Een bundel heeft normaal alle skills; komt er een lege lijst, dan houden we de vorige stand.
    skills: sync.skills.length > 0 || !same ? sync.skills : prev!.skills,
    quests: sync.quests ?? (keepQuests ? prev!.quests : null),
    questsAt: sync.quests ? receivedAt : keepQuests ? prev!.questsAt : null,
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    // Bij een te grote body lezen we wel door (anders blijft de verbinding hangen), maar bewaren we niets meer.
    req.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buf.length;
      if (size <= limit) chunks.push(buf);
    });
    req.on("end", () => {
      if (size > limit) reject(Object.assign(new Error("te groot"), { tooLarge: true }));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

/** Alleen verzoeken zonder Origin (de game-client) of van localhost zelf. */
function originAllowed(origin: string | string[] | undefined): boolean {
  if (origin === undefined) return true;
  const o = Array.isArray(origin) ? origin[0] : origin;
  try {
    const host = new URL(o).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

async function readLatest(file: string): Promise<StoredPluginSnapshot | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as StoredPluginSnapshot;
  } catch {
    return null;
  }
}

export interface InboxOptions {
  /** Map voor latest.json en events.jsonl, bijvoorbeeld app/.plugin. */
  dir: string;
  now?: () => Date;
  maxBodyBytes?: number;
}

type Next = (err?: unknown) => void;

/**
 * Connect-middleware (zoals Vite die gebruikt). Geeft een promise terug, zodat tests kunnen wachten; Vite
 * negeert die. Verzoeken op andere paden gaan door naar `next`.
 */
export function createPluginInbox(opts: InboxOptions) {
  const now = opts.now ?? (() => new Date());
  const limit = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  const latestFile = join(opts.dir, "latest.json");
  const eventsFile = join(opts.dir, "events.jsonl");
  // Schrijfacties na elkaar, zodat twee snelle verzoeken latest.json niet door elkaar schrijven.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(job: () => Promise<T>): Promise<T> => {
    const run = queue.then(job, job);
    queue = run.catch(() => undefined);
    return run;
  };

  async function handleSync(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Gebruik POST voor /api/plugin/sync." }, { Allow: "POST" });
    if (!originAllowed(req.headers.origin)) return sendJson(res, 403, { error: "Alleen de plugin of localhost mag hierheen posten." });
    let text: string;
    try {
      text = await readBody(req, limit);
    } catch (e) {
      if ((e as { tooLarge?: boolean }).tooLarge) return sendJson(res, 413, { error: "Verzoek is te groot." });
      return sendJson(res, 400, { error: "Verzoek kon niet gelezen worden." });
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return sendJson(res, 400, { error: "Geen geldige JSON." });
    }
    const t = now();
    const checked = validateSync(json, t);
    if (!checked.ok) return sendJson(res, 400, { error: checked.error });
    const sync = checked.value;
    try {
      const snap = await serial(async () => {
        await mkdir(opts.dir, { recursive: true });
        const next = nextSnapshot(sync, await readLatest(latestFile), t);
        const tmp = `${latestFile}.tmp`;
        await writeFile(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
        await rename(tmp, latestFile);
        if (sync.events.length > 0) {
          const lines = sync.events.map((e) => JSON.stringify({ account: sync.account, receivedAt: next.receivedAt, ...e })).join("\n") + "\n";
          await appendFile(eventsFile, lines, "utf8");
        }
        return next;
      });
      return sendJson(res, 200, { ok: true, receivedAt: snap.receivedAt, skills: snap.skills.length, quests: snap.quests?.length ?? null, events: sync.events.length });
    } catch (e) {
      return sendJson(res, 500, { error: `Opslaan mislukt: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  async function handleLatest(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Gebruik GET voor /api/plugin/latest." }, { Allow: "GET, HEAD" });
    const snap = await readLatest(latestFile);
    if (!snap) return sendJson(res, 404, { error: "Nog geen plugin-snapshot ontvangen." });
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Cache-Control", "no-store");
      res.end();
      return;
    }
    return sendJson(res, 200, snap);
  }

  return async function pluginInbox(req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> {
    const pathname = (req.url ?? "").split("?")[0];
    try {
      if (pathname === SYNC_PATH) return await handleSync(req, res);
      if (pathname === LATEST_PATH) return await handleLatest(req, res);
    } catch (e) {
      return next(e);
    }
    next();
  };
}
