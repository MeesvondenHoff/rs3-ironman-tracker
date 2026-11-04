import bundledJson from "../data/quests-snapshot.json";
import type { PluginQuest, StoredPluginSnapshot } from "../server/pluginInbox";
import { levelForXp, maxLevel, SKILLS, type SkillName } from "./skills";
import { fmtDate, fmtDay } from "./snapshots";

export type QuestStatus = "COMPLETED" | "STARTED" | "NOT_STARTED";

export interface Quest {
  title: string;
  status: QuestStatus;
  difficulty: number;
  members: boolean;
  questPoints: number;
  userEligible: boolean;
}

export interface Activity {
  date: string;
  text: string;
  details: string;
}

export interface Profile {
  name: string;
  combatlevel: number;
  totalskill: number;
  totalxp: number;
  questscomplete: number;
  questsstarted: number;
  questsnotstarted: number;
  rank: string | null;
  activities: Activity[];
  skillvalues: { id: number; level: number; xp: number; rank?: number }[];
}

export interface HiscoreRow {
  rank: number | null; // null = niet op de lijst (rank -1)
  level: number;
  xp: number;
}

export interface SkillRow {
  name: SkillName;
  level: number;
  xp: number;
  /** Ironman-hiscore-rank, null als niet gerankt. */
  rank: number | null;
  source: "hiscore" | "runemetrics" | "plugin";
}

/**
 * Waar quests en profiel vandaan komen. `at` is het moment waarop die gegevens echt zijn opgehaald
 * (bij "cached" dus de oorspronkelijke ophaaldatum, niet het moment van vernieuwen).
 * - live: net opgehaald bij de quest- en profielbron (nu RuneMetrics);
 * - cached: laatst bekende gegevens uit `rs3t:lastData`;
 * - bundled: de meegeleverde questlijst `src/data/quests-snapshot.json`;
 * - computed: geen profiel bekend, combat is berekend uit de hiscores;
 * - plugin: queststatus uit de snapshot van de in-game plugin (nieuwer dan de andere bron).
 */
export interface QuestsSource {
  kind: "live" | "cached" | "bundled" | "plugin";
  at: string;
}
export interface ProfileSource {
  kind: "live" | "cached" | "computed";
  at: string;
}

export interface AccountData {
  account: string;
  fetchedAt: string;
  skills: SkillRow[];
  overall: HiscoreRow | null;
  /** Live of laatst bekend profiel (zie profileSource); null als er geen profiel bekend is. */
  profile: Profile | null;
  profileSource: ProfileSource;
  quests: Quest[] | null;
  /** null als er helemaal geen questlijst is (ander account zonder opslag). */
  questsSource: QuestsSource | null;
  /** Som van questPoints van COMPLETED quests, uit dezelfde lijst (en dus met dezelfde bron) als `quests`. */
  questPoints: number | null;
  /** Fouten die de gebruiker iets moeten zeggen (hiscores). */
  errors: string[];
  /** Ruwe meldingen van de quest- en profielbron; de app valt dan terug en toont één rustige melding. */
  sourceErrors: string[];
  /** Ontvangsttijd van de plugin-snapshot als die skills of quests heeft aangevuld, anders null. */
  pluginAt?: string | null;
}

/** De meegeleverde questlijst (verversen met research/scripts/update_quest_snapshot.py). */
export interface QuestSnapshot {
  account: string;
  fetchedAt: string;
  quests: Quest[];
}
export const BUNDLED_QUESTS: QuestSnapshot = bundledJson as unknown as QuestSnapshot;

/** Dag waarop Jagex de RuneMetrics- en Adventurer's Log-API uitzet. */
export const RUNEMETRICS_STOP = "2026-11-10";
export const runemetricsStopped = (now: Date = new Date()) => now.getTime() >= Date.parse(RUNEMETRICS_STOP + "T00:00:00Z");

const enc = (name: string) => encodeURIComponent(name.trim());
const sameAccount = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function parseHiscoreLite(text: string): { overall: HiscoreRow; skills: HiscoreRow[] } {
  const lines = text.trim().split(/\r?\n/);
  const rows: HiscoreRow[] = [];
  for (let i = 0; i < 30; i++) {
    const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec((lines[i] ?? "").trim());
    if (!m) throw new Error(`Hiscores: onverwacht formaat op regel ${i + 1}`);
    const rank = Number(m[1]);
    rows.push({ rank: rank < 0 ? null : rank, level: Number(m[2]), xp: Math.max(0, Number(m[3])) });
  }
  return { overall: rows[0], skills: rows.slice(1) };
}

async function fetchHiscore(name: string) {
  const res = await fetch(`/api/hiscore/m=hiscore_ironman/index_lite.ws?player=${enc(name)}`);
  if (res.status === 404) throw new Error("Hiscores: speler niet gevonden op de Ironman-hiscores.");
  if (!res.ok) throw new Error(`Hiscores: HTTP ${res.status}`);
  return parseHiscoreLite(await res.text());
}

export function parseProfile(j: any): Profile {
  if (j && typeof j.error === "string") {
    const why = j.error === "PROFILE_PRIVATE" ? "profiel staat op privé" : j.error === "NO_PROFILE" ? "geen profiel gevonden" : j.error;
    throw new Error(`RuneMetrics-profiel: ${why}`);
  }
  if (!j || typeof j.name !== "string") throw new Error("RuneMetrics-profiel: onverwacht antwoord");
  return {
    name: j.name,
    combatlevel: j.combatlevel,
    totalskill: j.totalskill,
    totalxp: j.totalxp,
    questscomplete: j.questscomplete,
    questsstarted: j.questsstarted,
    questsnotstarted: j.questsnotstarted,
    rank: j.rank ?? null,
    activities: Array.isArray(j.activities) ? j.activities : [],
    skillvalues: Array.isArray(j.skillvalues) ? j.skillvalues : [],
  };
}

/** Vertaalt een RuneMetrics-questantwoord naar de questlijst; gooit bij een lege of afwijkende lijst. */
export function parseQuests(j: any): Quest[] {
  if (!j || !Array.isArray(j.quests)) throw new Error("RuneMetrics-quests: onverwacht antwoord");
  if (j.quests.length === 0) throw new Error("RuneMetrics-quests: lege lijst (profiel privé?)");
  return j.quests as Quest[];
}

/**
 * JSON ophalen via de dev-proxy. Een doorverwijzing (na de stop stuurt RuneMetrics mogelijk door naar
 * www.runescape.com/unavailable), een foutstatus of een antwoord dat geen JSON is, wordt een gewone fout.
 */
async function getJson(url: string, label: string): Promise<any> {
  const res = await fetch(url, { redirect: "manual" });
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) throw new Error(`${label}: doorgestuurd (dienst gestopt?)`);
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${label}: geen geldig antwoord (geen JSON)`);
  }
}

// RuneMetrics loopt via de proxy in vite.config.ts; daar staat de host, hier alleen het pad.
const RUNEMETRICS = "/api/runemetrics";

export async function fetchProfileRuneMetrics(name: string): Promise<Profile> {
  return parseProfile(await getJson(`${RUNEMETRICS}/profile/profile?user=${enc(name)}&activities=20`, "RuneMetrics-profiel"));
}

export async function fetchQuestsRuneMetrics(name: string): Promise<Quest[]> {
  return parseQuests(await getJson(`${RUNEMETRICS}/quests?user=${enc(name)}`, "RuneMetrics-quests"));
}

/** Bron voor profiel en quests: het enige punt dat wisselt als de nieuwe Jagex-API er is. */
export interface AccountSource {
  profile: (name: string) => Promise<Profile>;
  quests: (name: string) => Promise<Quest[]>;
}

export const runeMetricsSource: AccountSource = { profile: fetchProfileRuneMetrics, quests: fetchQuestsRuneMetrics };

// RuneMetrics stopt op 10 november 2026; daarna faalt deze bron en valt fetchAccount terug op opslag en hiscores.
// Nieuwe web-API (documentatie komt op developer.runescape.com): een proxyregel in vite.config.ts toevoegen,
// fetchProfileV2 en fetchQuestsV2 schrijven die naar Profile en Quest vertalen, en ACCOUNT_SOURCE hieronder omzetten.
export const ACCOUNT_SOURCE: AccountSource = runeMetricsSource;

/**
 * Combineert hiscores, RuneMetrics en (als die er is) de plugin-snapshot. Per skill wint de bron met de hoogste
 * XP: RuneMetrics en de plugin lopen vaak voor op de hiscores, terwijl de hiscores de Ironman-rank leveren.
 * XP daalt nooit, dus een oudere plugin-snapshot verliest vanzelf van nieuwere hiscores.
 */
export function mergeSkills(hs: HiscoreRow[] | null, profile: Profile | null, plugin: PluginSnapshot | null = null): SkillRow[] {
  return SKILLS.map((name, id) => {
    const h = hs?.[id];
    const r = profile?.skillvalues.find((s) => s.id === id);
    const p = plugin?.skills.find((s) => s.name === name) ?? plugin?.skills.find((s) => s.id === id);
    const rXp = r ? Math.floor(r.xp / 10) : -1;
    const hXp = h ? h.xp : -1;
    const pXp = p ? p.xp : -1;
    const rank = h?.rank ?? null;
    if (p && pXp > hXp && pXp > rXp) {
      const level = p.level >= 1 ? p.level : levelForXp(pXp, maxLevel(name));
      return { name, level, xp: pXp, rank, source: "plugin" as const };
    }
    if (r && rXp > hXp) {
      return { name, level: r.level, xp: rXp, rank, source: "runemetrics" as const };
    }
    return { name, level: h?.level ?? 1, xp: Math.max(0, hXp), rank, source: "hiscore" as const };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Derde bron: de in-game plugin "Ons Pap sync" (../plugin/ons-pap-sync). De plugin post naar de dev-server
// (src/server/pluginInbox.ts); de app leest de laatste snapshot via GET /api/plugin/latest. In een
// productiebuild bestaat dat endpoint niet en wordt deze bron stil overgeslagen.
// ---------------------------------------------------------------------------------------------------------

export type PluginSnapshot = StoredPluginSnapshot;

const PLUGIN_LATEST = "/api/plugin/latest";

/**
 * De Client API zegt niet of XP in hele punten of in tienden komt (RuneMetrics gebruikt tienden). Kloppen de
 * levels beter bij XP/10 dan bij XP, dan delen we alles door 10.
 */
function pluginXpInTenths(skills: PluginSnapshot["skills"]): boolean {
  let whole = 0;
  let tenths = 0;
  for (const s of skills) {
    const name = SKILLS[s.id];
    if (!name || s.xp <= 0) continue;
    const cap = maxLevel(name);
    if (levelForXp(s.xp, cap) === s.level) whole++;
    if (levelForXp(Math.floor(s.xp / 10), cap) === s.level) tenths++;
  }
  return tenths > whole;
}

/** Leest het antwoord van /api/plugin/latest; null als het niet de verwachte vorm heeft. */
export function parsePluginSnapshot(j: any): PluginSnapshot | null {
  if (!j || typeof j !== "object" || j.v !== 1 || typeof j.account !== "string" || !Array.isArray(j.skills)) return null;
  const receivedAt = typeof j.receivedAt === "string" && Date.parse(j.receivedAt) ? (j.receivedAt as string) : null;
  if (!receivedAt) return null;
  const skills = (j.skills as any[]).filter(
    (s) => s && Number.isInteger(s.id) && typeof s.name === "string" && Number.isFinite(s.level) && Number.isFinite(s.xp) && s.xp >= 0,
  ) as PluginSnapshot["skills"];
  const tenths = pluginXpInTenths(skills);
  const quests = Array.isArray(j.quests)
    ? ((j.quests as any[]).filter((q) => q && typeof q.name === "string" && ["COMPLETED", "STARTED", "NOT_STARTED"].includes(q.status)) as PluginQuest[])
    : null;
  return {
    v: 1,
    account: j.account,
    sentAt: Number.isFinite(j.sentAt) ? j.sentAt : null,
    receivedAt,
    skills: skills.map((s) => ({ id: s.id, name: s.name, level: s.level, xp: tenths ? Math.floor(s.xp / 10) : Math.floor(s.xp) })),
    quests,
    questsAt: !quests ? null : typeof j.questsAt === "string" && Date.parse(j.questsAt) ? j.questsAt : receivedAt,
  };
}

/** Laatste plugin-snapshot, of null als er geen is, het endpoint ontbreekt of het antwoord niet klopt. Gooit nooit. */
export async function fetchPluginSnapshot(): Promise<PluginSnapshot | null> {
  if (!import.meta.env.DEV) return null; // alleen de dev-server heeft dit endpoint
  try {
    const res = await fetch(PLUGIN_LATEST, { cache: "no-store" });
    if (!res.ok) return null;
    return parsePluginSnapshot(await res.json());
  } catch {
    return null;
  }
}

/** Questlijst van de plugin in de vorm van de app. */
export function pluginQuests(list: PluginQuest[]): Quest[] {
  return list.map((q) => ({
    title: q.name,
    status: q.status,
    difficulty: typeof q.difficulty === "number" ? q.difficulty : 0,
    members: q.members !== false,
    questPoints: typeof q.questPoints === "number" ? q.questPoints : 0,
    userEligible: q.eligible !== false,
  }));
}

/**
 * Legt de queststatus van de plugin over een bestaande lijst: bij dezelfde titel (hoofdletters tellen niet)
 * wint de status van de plugin, de rest van de velden blijft. Quests die alleen de plugin kent, komen erbij.
 */
export function overlayPluginQuests(base: Quest[] | null, list: PluginQuest[]): Quest[] {
  const fromPlugin = pluginQuests(list);
  if (!base) return fromPlugin;
  const key = (t: string) => t.trim().toLowerCase();
  const byTitle = new Map(fromPlugin.map((q) => [key(q.title), q]));
  const merged = base.map((q) => {
    const p = byTitle.get(key(q.title));
    if (!p) return q;
    byTitle.delete(key(q.title));
    return { ...q, status: p.status };
  });
  return [...merged, ...byTitle.values()];
}

export const questPointsOf = (quests: Quest[] | null) =>
  quests ? quests.filter((q) => q.status === "COMPLETED").reduce((s, q) => s + q.questPoints, 0) : null;

/** Vult velden aan die in oudere opgeslagen data (rs3t:lastData van voor de fallback) ontbreken. */
export function normalizeAccountData(d: AccountData): AccountData {
  return {
    ...d,
    profileSource: d.profileSource ?? { kind: d.profile ? "live" : "computed", at: d.fetchedAt },
    questsSource: d.questsSource !== undefined ? d.questsSource : d.quests ? { kind: "live", at: d.fetchedAt } : null,
    errors: d.errors ?? [],
    sourceErrors: d.sourceErrors ?? [],
    pluginAt: d.pluginAt ?? null,
  };
}

const atOf = (src: { kind: string; at: string }, fetchedAt: string) => (src.kind === "live" ? fetchedAt : src.at);
const time = (iso: string) => Date.parse(iso) || 0;

/**
 * Laatst bekende questlijst: uit de opslag (rs3t:lastData) of anders de meegeleverde lijst.
 * Is de meegeleverde lijst nieuwer dan de opslag (na update_quest_snapshot.py), dan wint die.
 */
export function fallbackQuests(
  name: string,
  prev: AccountData | null,
  bundled: QuestSnapshot | null,
): { quests: Quest[]; source: QuestsSource } | null {
  let cached: { quests: Quest[]; source: QuestsSource } | null = null;
  if (prev?.quests && prev.questsSource) {
    const kind = prev.questsSource.kind === "bundled" ? "bundled" : "cached";
    cached = { quests: prev.quests, source: { kind, at: atOf(prev.questsSource, prev.fetchedAt) } };
  }
  const fromBundle =
    bundled && bundled.quests.length > 0 && sameAccount(bundled.account, name)
      ? { quests: bundled.quests, source: { kind: "bundled" as const, at: bundled.fetchedAt } }
      : null;
  if (cached && fromBundle) return time(fromBundle.source.at) > time(cached.source.at) ? fromBundle : cached;
  return cached ?? fromBundle;
}

export interface FetchOptions {
  /** Vorige data (rs3t:lastData); alleen gebruikt als het hetzelfde account is. */
  previous?: AccountData | null;
  /** Meegeleverde questlijst; standaard src/data/quests-snapshot.json. */
  bundled?: QuestSnapshot | null;
  /** Bron voor profiel en quests; standaard ACCOUNT_SOURCE. */
  source?: AccountSource;
  /** Plugin-snapshot ophalen; standaard fetchPluginSnapshot (alleen in de dev-server). */
  plugin?: () => Promise<PluginSnapshot | null>;
}

/**
 * Haalt hiscores, profiel en quests op. Faalt de profiel- of questbron (RuneMetrics stopt op 10 november 2026),
 * dan gebruikt de app de laatst bekende gegevens en komen skills van de hiscores; die fouten staan in `sourceErrors`
 * en niet in `errors`. Alleen als hiscores en profiel allebei ontbreken, gooit deze functie.
 */
export async function fetchAccount(name: string, opts: FetchOptions = {}): Promise<AccountData> {
  const source = opts.source ?? ACCOUNT_SOURCE;
  const bundled = opts.bundled === undefined ? BUNDLED_QUESTS : opts.bundled;
  const prev = opts.previous && sameAccount(opts.previous.account, name) ? normalizeAccountData(opts.previous) : null;

  const pluginFetch = opts.plugin ?? fetchPluginSnapshot;
  const [hs, prof, qs, pl] = await Promise.allSettled([fetchHiscore(name), source.profile(name), source.quests(name), pluginFetch()]);
  const fetchedAt = new Date().toISOString();
  const errors = hs.status === "rejected" ? [errMsg(hs.reason)] : [];
  const sourceErrors = [prof, qs].flatMap((r) => (r.status === "rejected" ? [errMsg(r.reason)] : []));

  const hiscore = hs.status === "fulfilled" ? hs.value : null;
  const liveProfile = prof.status === "fulfilled" ? prof.value : null;
  if (!hiscore && !liveProfile) throw new Error([...errors, ...sourceErrors].join("; ") || "Geen data ontvangen.");

  let profile: Profile | null = liveProfile;
  let profileSource: ProfileSource = { kind: "live", at: fetchedAt };
  if (!liveProfile) {
    if (prev?.profile) {
      profile = prev.profile;
      profileSource = { kind: "cached", at: atOf(prev.profileSource, prev.fetchedAt) };
    } else profileSource = { kind: "computed", at: fetchedAt };
  }

  let quests: Quest[] | null = null;
  let questsSource: QuestsSource | null = null;
  if (qs.status === "fulfilled") {
    quests = qs.value;
    questsSource = { kind: "live", at: fetchedAt };
  } else {
    const fb = fallbackQuests(name, prev, bundled);
    if (fb) {
      quests = fb.quests;
      questsSource = fb.source;
    }
  }

  // Plugin-snapshot van hetzelfde account: skills via de hoogste XP, quests alleen als de questbron niet live is
  // en de snapshot nieuwer is dan die bron (na de stop wint een recente snapshot dus van de opslag).
  const plugin = pl.status === "fulfilled" && pl.value && sameAccount(pl.value.account, name) ? pl.value : null;
  const questsLive = questsSource?.kind === "live";
  if (plugin?.quests && plugin.questsAt && !questsLive && (!questsSource || time(plugin.questsAt) > time(questsSource.at))) {
    quests = overlayPluginQuests(quests, plugin.quests);
    questsSource = { kind: "plugin", at: plugin.questsAt };
  }

  // Hiscores zijn leidend. XP daalt nooit, dus een laatst bekend profiel is een veilige ondergrens: zo zakt de
  // XP niet terug (en toont het Logboek geen negatieve winst) zolang de hiscores nog achterlopen op RuneMetrics.
  const skills = mergeSkills(hiscore?.skills ?? null, profile, plugin);
  const pluginUsed = skills.some((s) => s.source === "plugin") || questsSource?.kind === "plugin";

  return {
    account: name,
    fetchedAt,
    skills,
    overall: hiscore?.overall ?? null,
    profile,
    profileSource,
    quests,
    questsSource,
    questPoints: questPointsOf(quests),
    errors,
    sourceErrors,
    pluginAt: pluginUsed && plugin ? plugin.receivedAt : null,
  };
}

/** RS3-combatlevel als fallback wanneer RuneMetrics ontbreekt. */
export function combatLevel(skills: SkillRow[]): number {
  const l = (n: SkillName) => skills.find((s) => s.name === n)?.level ?? 1;
  const off = Math.max(l("Attack") + l("Strength"), 2 * l("Magic"), 2 * l("Ranged"), 2 * l("Necromancy"));
  return Math.floor((1.3 * off + l("Defence") + l("Constitution") + Math.floor(l("Prayer") / 2) + Math.floor(l("Summoning") / 2)) / 4);
}

/**
 * Combat voor de kop en het accountoverzicht. Live: het getal van het profiel. Laatst bekend: nooit lager dan
 * wat de live hiscores nu opleveren, want een opgeslagen getal veroudert. Geen profiel: berekend uit de skills.
 */
export function accountCombat(d: AccountData): number {
  const calc = combatLevel(d.skills);
  if (!d.profile) return calc;
  return d.profileSource?.kind === "cached" ? Math.max(d.profile.combatlevel, calc) : d.profile.combatlevel;
}

/**
 * De ene rustige melding als quests of profiel niet live zijn; null als alles live is (dan verandert er niets).
 * Na de stopdatum luidt die "RuneMetrics is gestopt"; daarvoor gaat het om een storing of een privéprofiel.
 */
export function fallbackNotice(d: AccountData, now: Date = new Date()): { title: string; body: string[]; raw: string[] } | null {
  const qs = d.questsSource;
  const ps = d.profileSource;
  const pluginLine = d.pluginAt ? `Plugin-snapshot van ${fmtDate(d.pluginAt)}.` : null;
  if ((!ps || ps.kind === "live") && qs?.kind === "live") {
    return pluginLine ? { title: "Aangevuld met de plugin", body: [pluginLine], raw: [] } : null;
  }
  if (!ps && qs === undefined) return null;
  const stopped = runemetricsStopped(now);
  const hiscoresOk = (d.errors ?? []).length === 0;
  const body: string[] = [];

  let first: string;
  if (!qs) first = "Er is geen questlijst van dit account bewaard";
  else if (qs.kind === "live") first = "De quests zijn live opgehaald";
  else if (qs.kind === "plugin") first = "De queststatus komt uit de plugin";
  else first = `Queststatus van ${fmtDay(qs.at)} uit ${qs.kind === "cached" ? "de laatste opslag" : "de meegeleverde lijst"}`;
  body.push(hiscoresOk ? `${first}; skills en XP komen live van de hiscores.` : `${first}.`);
  if (qs && (qs.kind === "cached" || qs.kind === "bundled")) body.push("Vink nieuwe quests zelf af in de Route-tab.");
  if (ps?.kind === "cached") body.push(`Activiteiten zijn van ${fmtDay(ps.at)}; combat volgt verder de hiscores.`);
  if (ps?.kind === "computed") body.push("Combat is berekend uit de hiscores.");
  if (!stopped && (d.sourceErrors ?? []).some((e) => /privé/i.test(e)))
    body.push("Staat het profiel op privé, zet RuneMetrics dan in de game op openbaar en vernieuw.");
  if (pluginLine) body.push(pluginLine);

  return {
    title: stopped ? "RuneMetrics is gestopt (10 november 2026)" : "RuneMetrics gaf nu geen antwoord",
    body,
    raw: stopped ? [] : d.sourceErrors ?? [],
  };
}
