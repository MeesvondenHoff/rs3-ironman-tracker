import bundledJson from "../data/quests-snapshot.json";
import { SKILLS, type SkillName } from "./skills";
import { fmtDay } from "./snapshots";

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
  source: "hiscore" | "runemetrics";
}

/**
 * Waar quests en profiel vandaan komen. `at` is het moment waarop die gegevens echt zijn opgehaald
 * (bij "cached" dus de oorspronkelijke ophaaldatum, niet het moment van vernieuwen).
 * - live: net opgehaald bij de quest- en profielbron (nu RuneMetrics);
 * - cached: laatst bekende gegevens uit `rs3t:lastData`;
 * - bundled: de meegeleverde questlijst `src/data/quests-snapshot.json`;
 * - computed: geen profiel bekend, combat is berekend uit de hiscores.
 */
export interface QuestsSource {
  kind: "live" | "cached" | "bundled";
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
 * Combineert hiscores en RuneMetrics. Per skill wint de bron met de hoogste XP:
 * RuneMetrics loopt vaak voor op de hiscores, terwijl de hiscores de Ironman-rank leveren.
 */
export function mergeSkills(hs: HiscoreRow[] | null, profile: Profile | null): SkillRow[] {
  return SKILLS.map((name, id) => {
    const h = hs?.[id];
    const r = profile?.skillvalues.find((s) => s.id === id);
    const rXp = r ? Math.floor(r.xp / 10) : -1;
    const hXp = h ? h.xp : -1;
    if (r && rXp > hXp) {
      return { name, level: r.level, xp: rXp, rank: h?.rank ?? null, source: "runemetrics" as const };
    }
    return { name, level: h?.level ?? 1, xp: Math.max(0, hXp), rank: h?.rank ?? null, source: "hiscore" as const };
  });
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

  const [hs, prof, qs] = await Promise.allSettled([fetchHiscore(name), source.profile(name), source.quests(name)]);
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

  return {
    account: name,
    fetchedAt,
    // Hiscores zijn leidend. XP daalt nooit, dus een laatst bekend profiel is een veilige ondergrens: zo zakt de
    // XP niet terug (en toont het Logboek geen negatieve winst) zolang de hiscores nog achterlopen op RuneMetrics.
    skills: mergeSkills(hiscore?.skills ?? null, profile),
    overall: hiscore?.overall ?? null,
    profile,
    profileSource,
    quests,
    questsSource,
    questPoints: questPointsOf(quests),
    errors,
    sourceErrors,
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
  if ((!ps || ps.kind === "live") && qs?.kind === "live") return null;
  if (!ps && qs === undefined) return null;
  const stopped = runemetricsStopped(now);
  const hiscoresOk = (d.errors ?? []).length === 0;
  const body: string[] = [];

  let first: string;
  if (!qs) first = "Er is geen questlijst van dit account bewaard";
  else if (qs.kind === "live") first = "De quests zijn live opgehaald";
  else first = `Queststatus van ${fmtDay(qs.at)} uit ${qs.kind === "cached" ? "de laatste opslag" : "de meegeleverde lijst"}`;
  body.push(hiscoresOk ? `${first}; skills en XP komen live van de hiscores.` : `${first}.`);
  if (qs && qs.kind !== "live") body.push("Vink nieuwe quests zelf af in de Route-tab.");
  if (ps?.kind === "cached") body.push(`Activiteiten zijn van ${fmtDay(ps.at)}; combat volgt verder de hiscores.`);
  if (ps?.kind === "computed") body.push("Combat is berekend uit de hiscores.");
  if (!stopped && (d.sourceErrors ?? []).some((e) => /privé/i.test(e)))
    body.push("Staat het profiel op privé, zet RuneMetrics dan in de game op openbaar en vernieuw.");

  return {
    title: stopped ? "RuneMetrics is gestopt (10 november 2026)" : "RuneMetrics gaf nu geen antwoord",
    body,
    raw: stopped ? [] : d.sourceErrors ?? [],
  };
}
