// Skillvolgorde zoals de hiscores (zonder Overall). De index is ook het RuneMetrics skill-id.
export const SKILLS = [
  "Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic",
  "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting",
  "Smithing", "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming",
  "Runecrafting", "Hunter", "Construction", "Summoning", "Dungeoneering",
  "Divination", "Invention", "Archaeology", "Necromancy",
] as const;

export type SkillName = (typeof SKILLS)[number];

const SKILLS_120 = new Set<SkillName>([
  "Dungeoneering", "Invention", "Slayer", "Herblore", "Farming", "Archaeology", "Necromancy",
]);

export const MAX_XP = 200_000_000;

export function isSkillName(s: string): s is SkillName {
  return (SKILLS as readonly string[]).includes(s);
}

export function maxLevel(skill: SkillName): number {
  return SKILLS_120.has(skill) ? 120 : 99;
}

// RS3 standaard XP-tabel: XP_TABLE[L] = benodigde XP voor level L (1..120).
// Invention gebruikt in-game een eigen "elite"-curve; hier benaderd met de standaardtabel.
export const XP_TABLE: number[] = (() => {
  const t = [0, 0];
  let points = 0;
  for (let lvl = 1; lvl < 120; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    t[lvl + 1] = Math.floor(points / 4);
  }
  return t;
})();

export function levelForXp(xp: number, cap = 120): number {
  let lvl = 1;
  while (lvl < cap && xp >= XP_TABLE[lvl + 1]) lvl++;
  return lvl;
}

export interface LevelProgress {
  level: number;
  maxed: boolean;
  nextLevel: number | null;
  xpToNext: number;
  /** 0..1 */
  fraction: number;
}

export function progressFor(skill: SkillName, xp: number): LevelProgress {
  const cap = maxLevel(skill);
  const level = levelForXp(xp, cap);
  if (level >= cap) return { level, maxed: true, nextLevel: null, xpToNext: 0, fraction: 1 };
  const from = XP_TABLE[level];
  const to = XP_TABLE[level + 1];
  return {
    level,
    maxed: false,
    nextLevel: level + 1,
    xpToNext: to - xp,
    fraction: Math.min(1, Math.max(0, (xp - from) / (to - from))),
  };
}

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString("nl-NL");
}

export function fmtSigned(n: number): string {
  if (n === 0) return "0";
  return (n > 0 ? "+" : "") + n.toLocaleString("nl-NL");
}
