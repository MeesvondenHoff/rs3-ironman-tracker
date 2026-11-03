import { SKILLS, type SkillName } from "./skills";

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

export interface AccountData {
  account: string;
  fetchedAt: string;
  skills: SkillRow[];
  overall: HiscoreRow | null;
  profile: Profile | null;
  quests: Quest[] | null;
  /** Som van questPoints van COMPLETED quests (RuneMetrics), null als quests niet beschikbaar. */
  questPoints: number | null;
  errors: string[];
}

const enc = (name: string) => encodeURIComponent(name.trim());

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

async function fetchProfile(name: string): Promise<Profile> {
  const res = await fetch(`/api/runemetrics/profile/profile?user=${enc(name)}&activities=20`);
  if (!res.ok) throw new Error(`RuneMetrics-profiel: HTTP ${res.status}`);
  return parseProfile(await res.json());
}

async function fetchQuests(name: string): Promise<Quest[]> {
  const res = await fetch(`/api/runemetrics/quests?user=${enc(name)}`);
  if (!res.ok) throw new Error(`RuneMetrics-quests: HTTP ${res.status}`);
  const j = await res.json();
  if (!j || !Array.isArray(j.quests)) throw new Error("RuneMetrics-quests: onverwacht antwoord");
  if (j.quests.length === 0) throw new Error("RuneMetrics-quests: lege lijst (profiel privé?)");
  return j.quests as Quest[];
}

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

export async function fetchAccount(name: string): Promise<AccountData> {
  const [hs, prof, qs] = await Promise.allSettled([fetchHiscore(name), fetchProfile(name), fetchQuests(name)]);
  const errors: string[] = [];
  const err = (r: PromiseSettledResult<unknown>) => {
    if (r.status === "rejected") errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  };
  err(hs);
  err(prof);
  err(qs);

  const hiscore = hs.status === "fulfilled" ? hs.value : null;
  const profile = prof.status === "fulfilled" ? prof.value : null;
  const quests = qs.status === "fulfilled" ? qs.value : null;
  if (!hiscore && !profile) throw new Error(errors.join(" · ") || "Geen data ontvangen.");

  return {
    account: name,
    fetchedAt: new Date().toISOString(),
    skills: mergeSkills(hiscore?.skills ?? null, profile),
    overall: hiscore?.overall ?? null,
    profile,
    quests,
    questPoints: quests ? quests.filter((q) => q.status === "COMPLETED").reduce((s, q) => s + q.questPoints, 0) : null,
    errors,
  };
}

/** RS3-combatlevel als fallback wanneer RuneMetrics ontbreekt. */
export function combatLevel(skills: SkillRow[]): number {
  const l = (n: SkillName) => skills.find((s) => s.name === n)?.level ?? 1;
  const off = Math.max(l("Attack") + l("Strength"), 2 * l("Magic"), 2 * l("Ranged"), 2 * l("Necromancy"));
  return Math.floor((1.3 * off + l("Defence") + l("Constitution") + Math.floor(l("Prayer") / 2) + Math.floor(l("Summoning") / 2)) / 4);
}
