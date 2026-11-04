import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fallbackNotice, fetchAccount, fetchPluginSnapshot, mergeSkills, overlayPluginQuests, parseHiscoreLite, parsePluginSnapshot,
  questPointsOf, type PluginSnapshot, type Quest,
} from "../src/lib/api";
import { createPluginInbox, nextSnapshot, validateSync, type StoredPluginSnapshot } from "../src/server/pluginInbox";
import { readFileSync } from "node:fs";
import { SKILLS, XP_TABLE } from "../src/lib/skills";

// De in-game plugin (plugin/ons-pap-sync) post naar de dev-server; de app leest /api/plugin/latest.
// Deze tests dekken de vorm van die snapshot, het mengen met hiscores en quests, en de handler in de dev-server.

const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const HISCORES = fx("hiscores.txt");
const QUESTS = fx("quests.json");
const fixtureQuests: Quest[] = JSON.parse(QUESTS).quests;
const HS = parseHiscoreLite(HISCORES).skills;

/** Plugin-skills gelijk aan de hiscores, met extra XP voor de opgegeven skills. */
function pluginSkills(extra: Record<string, number> = {}) {
  return SKILLS.map((name, id) => ({ id, name, level: HS[id].level, xp: HS[id].xp + (extra[name] ?? 0) }));
}

function snapshot(over: Partial<PluginSnapshot> = {}): PluginSnapshot {
  return {
    v: 1, account: "Ons Pap", sentAt: 1_793_000_000, receivedAt: "2026-11-12T20:00:00.000Z",
    skills: pluginSkills(), quests: null, questsAt: null, ...over,
  };
}

type Mode = "ok" | "redirect";
function mockApi(opts: { rm?: Mode; plugin?: "404" | "html" | "throw" | PluginSnapshot }) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/hiscore/")) return new Response(HISCORES, { status: 200 });
    if (url.startsWith("/api/runemetrics/")) {
      if (opts.rm === "redirect") return new Response(null, { status: 302, headers: { location: "https://www.runescape.com/unavailable" } });
      if (url.includes("/quests")) return new Response(QUESTS, { status: 200 });
      return new Response(fx("profile.json"), { status: 200 });
    }
    if (url === "/api/plugin/latest") {
      const p = opts.plugin;
      if (p === undefined || p === "404") return new Response('{"error":"x"}', { status: 404 });
      if (p === "html") return new Response("<!doctype html><title>app</title>", { status: 200 });
      if (p === "throw") throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify(p), { status: 200 });
    }
    throw new Error(`onverwachte url ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("plugin-snapshot inlezen", () => {
  it("leest de vorm van /api/plugin/latest", () => {
    const raw = { ...snapshot(), quests: [{ id: 1, name: "Cook's Assistant", status: "COMPLETED", questPoints: 1, members: false }], questsAt: "2026-11-12T19:00:00.000Z" };
    const p = parsePluginSnapshot(JSON.parse(JSON.stringify(raw)))!;
    expect(p.account).toBe("Ons Pap");
    expect(p.skills).toHaveLength(29);
    expect(p.skills[0]).toEqual({ id: 0, name: "Attack", level: HS[0].level, xp: HS[0].xp });
    expect(p.quests).toHaveLength(1);
    expect(p.questsAt).toBe("2026-11-12T19:00:00.000Z");
  });

  it("weigert een antwoord in een andere vorm", () => {
    expect(parsePluginSnapshot(null)).toBeNull();
    expect(parsePluginSnapshot({ v: 2, account: "Ons Pap", skills: [], receivedAt: "2026-11-12T20:00:00Z" })).toBeNull();
    expect(parsePluginSnapshot({ v: 1, account: "Ons Pap", skills: "nee", receivedAt: "2026-11-12T20:00:00Z" })).toBeNull();
    expect(parsePluginSnapshot({ v: 1, account: "Ons Pap", skills: [] })).toBeNull();
  });

  it("herkent XP in tienden aan de levels en deelt dan door 10", () => {
    const tenths = SKILLS.map((name, id) => ({ id, name, level: 50, xp: XP_TABLE[50] * 10 + 5 }));
    const p = parsePluginSnapshot({ ...snapshot(), skills: tenths })!;
    expect(p.skills[0].xp).toBe(XP_TABLE[50]);
    const whole = parsePluginSnapshot({ ...snapshot(), skills: SKILLS.map((name, id) => ({ id, name, level: 50, xp: XP_TABLE[50] + 5 })) })!;
    expect(whole.skills[0].xp).toBe(XP_TABLE[50] + 5);
  });
});

describe("plugin-snapshot mengen met de hiscores", () => {
  it("hogere plugin-XP wint, met bron plugin en de rank van de hiscores", () => {
    const plug = snapshot({ skills: pluginSkills({ Attack: 100_000 }) });
    const rows = mergeSkills(HS, null, plug);
    const atk = rows.find((r) => r.name === "Attack")!;
    expect(atk.source).toBe("plugin");
    expect(atk.xp).toBe(HS[0].xp + 100_000);
    expect(atk.rank).toBe(HS[0].rank);
    expect(rows.filter((r) => r.source === "plugin")).toHaveLength(1);
  });

  it("lagere of gelijke plugin-XP verliest van de hiscores", () => {
    const lower = snapshot({ skills: pluginSkills().map((s) => ({ ...s, xp: Math.max(0, s.xp - 1000) })) });
    expect(mergeSkills(HS, null, lower).every((r) => r.source === "hiscore")).toBe(true);
    expect(mergeSkills(HS, null, snapshot()).every((r) => r.source === "hiscore")).toBe(true);
  });

  it("zonder plugin verandert er niets", () => {
    expect(mergeSkills(HS, null, null)).toEqual(mergeSkills(HS, null));
  });

  it("fetchAccount neemt de plugin mee en zet de bron in de melding", async () => {
    mockApi({ rm: "ok", plugin: snapshot({ skills: pluginSkills({ Necromancy: 5000 }) }) });
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.skills.find((s) => s.name === "Necromancy")!.source).toBe("plugin");
    expect(d.pluginAt).toBe("2026-11-12T20:00:00.000Z");
    const n = fallbackNotice(d, new Date("2026-11-05T19:00:00Z"))!;
    expect(n.title).toBe("Aangevuld met de plugin");
    expect(n.body).toHaveLength(1);
    expect(n.body[0]).toMatch(/^Plugin-snapshot van .+\.$/);
  });

  it("negeert een snapshot van een ander account", async () => {
    mockApi({ rm: "ok", plugin: snapshot({ account: "Iemand Anders", skills: pluginSkills({ Attack: 999_999 }) }) });
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.skills.every((s) => s.source !== "plugin")).toBe(true);
    expect(d.pluginAt).toBeNull();
    expect(fallbackNotice(d)).toBeNull();
  });

  it("een plugin die niets toevoegt, geeft geen melding", async () => {
    mockApi({ rm: "ok", plugin: snapshot() });
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.pluginAt).toBeNull();
    expect(fallbackNotice(d)).toBeNull();
  });
});

describe("ontbrekend endpoint", () => {
  it.each(["404", "html", "throw"] as const)("geeft geen fout bij %s", async (mode) => {
    const fn = mockApi({ rm: "ok", plugin: mode });
    await expect(fetchPluginSnapshot()).resolves.toBeNull();
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.errors).toEqual([]);
    expect(d.sourceErrors).toEqual([]);
    expect(d.pluginAt).toBeNull();
    expect(fn.mock.calls.some(([u]) => String(u) === "/api/plugin/latest")).toBe(true);
  });
});

describe("plugin-quests", () => {
  const pq = (name: string, status: "COMPLETED" | "STARTED" | "NOT_STARTED", questPoints = 1) => ({
    id: null, name, status, questPoints, members: true, difficulty: null, eligible: null,
  });

  it("legt de status van de plugin over de bestaande lijst en voegt onbekende quests toe", () => {
    const base = fixtureQuests.slice(0, 3).map((q) => ({ ...q, status: "NOT_STARTED" as const }));
    const out = overlayPluginQuests(base, [pq(base[1].title.toUpperCase(), "COMPLETED"), pq("Nieuwe Quest", "STARTED")]);
    expect(out).toHaveLength(4);
    expect(out[1]).toEqual({ ...base[1], status: "COMPLETED" });
    expect(out[0]).toBe(base[0]);
    expect(out[3]).toMatchObject({ title: "Nieuwe Quest", status: "STARTED", userEligible: true });
  });

  it("na de stop wint een nieuwere plugin-questlijst van de opslag: bron plugin", async () => {
    const prevQuests = fixtureQuests.map((q) => ({ ...q }));
    const target = prevQuests.find((q) => q.status !== "COMPLETED")!;
    const plug = snapshot({ quests: [pq(target.title, "COMPLETED", target.questPoints)], questsAt: "2026-11-12T20:00:00.000Z" });
    mockApi({ rm: "redirect", plugin: plug });
    const prev = {
      account: "Ons Pap", fetchedAt: "2026-11-08T20:00:00.000Z", skills: [], overall: null, profile: null,
      profileSource: { kind: "computed" as const, at: "2026-11-08T20:00:00.000Z" }, quests: prevQuests,
      questsSource: { kind: "live" as const, at: "2026-11-08T20:00:00.000Z" }, questPoints: questPointsOf(prevQuests), errors: [], sourceErrors: [],
    };
    const d = await fetchAccount("Ons Pap", { previous: prev, bundled: null });
    expect(d.questsSource).toEqual({ kind: "plugin", at: "2026-11-12T20:00:00.000Z" });
    expect(d.quests!.find((q) => q.title === target.title)!.status).toBe("COMPLETED");
    expect(d.questPoints).toBe(questPointsOf(prevQuests)! + target.questPoints);
    const n = fallbackNotice(d, new Date("2026-11-12T21:00:00Z"))!;
    expect(n.body[0]).toBe("De queststatus komt uit de plugin; skills en XP komen live van de hiscores.");
    expect(n.body).not.toContain("Vink nieuwe quests zelf af in de Route-tab.");
    expect(n.body.at(-1)).toMatch(/^Plugin-snapshot van /);
  });

  it("zolang RuneMetrics live is, wint de live questlijst", async () => {
    mockApi({ rm: "ok", plugin: snapshot({ quests: [pq("Cook's Assistant", "NOT_STARTED")], questsAt: "2026-11-12T20:00:00.000Z" }) });
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.questsSource?.kind).toBe("live");
  });
});

// ---------------------------------------------------------------------------------------------------------
// Dev-server-handler
// ---------------------------------------------------------------------------------------------------------

function fakeReq(method: string, url: string, body?: string, headers: Record<string, string> = {}): IncomingMessage {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]) as unknown as IncomingMessage;
  Object.assign(req, { method, url, headers });
  return req;
}

function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: "",
    headers,
    setHeader(k: string, v: string) { headers[k.toLowerCase()] = v; },
    end(b?: string) { res.body = b ?? ""; },
    json() { return JSON.parse(res.body); },
  };
  return res;
}
type FakeRes = ReturnType<typeof fakeRes>;

describe("dev-server: /api/plugin/sync en /api/plugin/latest", () => {
  let dir: string;
  let clock = new Date("2026-11-12T20:00:00.000Z");
  let inbox: ReturnType<typeof createPluginInbox>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "plugin-inbox-"));
    clock = new Date("2026-11-12T20:00:00.000Z");
    inbox = createPluginInbox({ dir, now: () => clock });
  });
  afterEach(async () => rm(dir, { recursive: true, force: true }));

  async function call(method: string, url: string, body?: unknown, headers?: Record<string, string>) {
    const res = fakeRes();
    const next = vi.fn();
    const text = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    await inbox(fakeReq(method, url, text, headers), res as unknown as ServerResponse, next);
    return { res, next };
  }

  const sync = (over: Record<string, unknown> = {}) => ({
    v: 1, account: "Ons Pap", sentAt: 1_793_000_000,
    skills: [{ id: 0, name: "Attack", level: 5, xp: 432 }],
    quests: [{ id: 1, name: "Cook's Assistant", status: "COMPLETED", questPoints: 1, members: false }],
    events: [{ at: 1_793_000_000, kind: "levelup", text: "Attack level 5 gehaald" }],
    ...over,
  });

  it("GET latest geeft 404 zolang er niets is ontvangen", async () => {
    const { res } = await call("GET", "/api/plugin/latest");
    expect(res.statusCode).toBe(404);
  });

  it("POST schrijft latest.json en events.jsonl; GET geeft de snapshot terug", async () => {
    const { res } = await call("POST", "/api/plugin/sync", sync());
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, skills: 1, quests: 1, events: 1 });

    const stored: StoredPluginSnapshot = JSON.parse(await readFile(join(dir, "latest.json"), "utf8"));
    expect(stored).toMatchObject({ v: 1, account: "Ons Pap", receivedAt: clock.toISOString(), questsAt: clock.toISOString() });
    const lines = (await readFile(join(dir, "events.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines).toEqual([{ account: "Ons Pap", receivedAt: clock.toISOString(), at: 1_793_000_000, kind: "levelup", text: "Attack level 5 gehaald" }]);

    const get = await call("GET", "/api/plugin/latest?x=1");
    expect(get.res.statusCode).toBe(200);
    expect(get.res.headers["cache-control"]).toBe("no-store");
    expect(parsePluginSnapshot(get.res.json())).toMatchObject({ account: "Ons Pap", skills: [{ name: "Attack", xp: 432 }] });
  });

  it("een bundel zonder quests houdt de quests van de vorige snapshot; events worden aangevuld", async () => {
    await call("POST", "/api/plugin/sync", sync());
    const firstAt = clock.toISOString();
    clock = new Date("2026-11-12T20:00:10.000Z");
    const { res } = await call("POST", "/api/plugin/sync", sync({
      quests: null, skills: [{ id: 0, name: "Attack", level: 6, xp: 600 }], events: [{ at: 1_793_000_010, kind: "xp", text: "Attack +168 XP" }],
    }));
    expect(res.statusCode).toBe(200);
    const stored: StoredPluginSnapshot = JSON.parse(await readFile(join(dir, "latest.json"), "utf8"));
    expect(stored.skills[0].xp).toBe(600);
    expect(stored.quests).toHaveLength(1);
    expect(stored.questsAt).toBe(firstAt);
    expect(stored.receivedAt).toBe(clock.toISOString());
    const lines = (await readFile(join(dir, "events.jsonl"), "utf8")).trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  it("weigert ongeldige JSON en een ontbrekend account of skills-array", async () => {
    expect((await call("POST", "/api/plugin/sync", "{niet json")).res.statusCode).toBe(400);
    expect((await call("POST", "/api/plugin/sync", sync({ account: "  " }))).res.statusCode).toBe(400);
    expect((await call("POST", "/api/plugin/sync", sync({ skills: {} }))).res.statusCode).toBe(400);
    expect((await call("POST", "/api/plugin/sync", sync({ v: 2 }))).res.json().error).toMatch(/versie/);
    expect((await call("GET", "/api/plugin/latest")).res.statusCode).toBe(404);
  });

  it("geeft een vriendelijke 405 op andere methodes", async () => {
    const put = await call("PUT", "/api/plugin/sync", sync());
    expect(put.res.statusCode).toBe(405);
    expect(put.res.headers.allow).toBe("POST");
    expect(put.res.json().error).toMatch(/POST/);
    const get = await call("GET", "/api/plugin/sync");
    expect(get.res.statusCode).toBe(405);
    const del = await call("DELETE", "/api/plugin/latest");
    expect(del.res.statusCode).toBe(405);
    expect(del.res.headers.allow).toBe("GET, HEAD");
  });

  it("weigert een POST vanaf een andere website, maar niet vanaf localhost", async () => {
    expect((await call("POST", "/api/plugin/sync", sync(), { origin: "https://example.com" })).res.statusCode).toBe(403);
    expect((await call("POST", "/api/plugin/sync", sync(), { origin: "http://localhost:5173" })).res.statusCode).toBe(200);
  });

  it("weigert een te grote body", async () => {
    const small = createPluginInbox({ dir, now: () => clock, maxBodyBytes: 50 });
    const res = fakeRes();
    await small(fakeReq("POST", "/api/plugin/sync", JSON.stringify(sync())), res as unknown as ServerResponse, vi.fn());
    expect((res as FakeRes).statusCode).toBe(413);
  });

  it("laat andere paden door naar de volgende middleware", async () => {
    const { res, next } = await call("GET", "/api/hiscore/x");
    expect(next).toHaveBeenCalledOnce();
    expect(res.body).toBe("");
  });
});

describe("validateSync en nextSnapshot", () => {
  it("laat losse foute regels weg in plaats van alles af te keuren", () => {
    const r = validateSync({
      v: 1, account: "Ons Pap", skills: [{ id: 0, name: "Attack", level: 5, xp: 432 }, { id: "x" }],
      quests: [{ name: "A", status: "COMPLETED" }, { name: "B", status: "KLAAR" }],
      events: [{ kind: "levelup", text: "x" }, { kind: "drop", text: "y" }],
    }, new Date("2026-11-12T20:00:00Z"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.skills).toHaveLength(1);
    expect(r.value.quests).toHaveLength(1);
    expect(r.value.events).toEqual([{ at: Date.parse("2026-11-12T20:00:00Z") / 1000, kind: "levelup", text: "x" }]);
    expect(r.value.sentAt).toBeNull();
  });

  it("neemt geen quests over van een ander account", () => {
    const prev: StoredPluginSnapshot = {
      v: 1, account: "Iemand", sentAt: null, receivedAt: "2026-11-12T19:00:00.000Z", skills: [],
      quests: [{ id: 1, name: "A", status: "COMPLETED", questPoints: 1, members: true, difficulty: null, eligible: null }], questsAt: "2026-11-12T19:00:00.000Z",
    };
    const next = nextSnapshot({ v: 1, account: "Ons Pap", sentAt: null, skills: [], quests: null, events: [] }, prev);
    expect(next.quests).toBeNull();
    expect(next.questsAt).toBeNull();
  });
});
