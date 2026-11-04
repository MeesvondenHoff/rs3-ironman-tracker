import data from "../data/bosses.json";
import type { Conditions, Route } from "./route";
import { isSkillName } from "./skills";

// Bosskaarten. Koppeling aan de route via `stepIds`, zodat route.json niet hoeft te veranderen.

export interface BossGear {
  slot: string;
  item: string;
  /** Hoe een ironman eraan komt. */
  how: string;
}

export interface BossDrop {
  item: string;
  rate?: string;
  note?: string;
}

/** Een eis die de speler zelf afvinkt (unlock of gear), of die de app afvinkt als `auto` gezet is. */
export interface ReadyItem {
  /** Uniek binnen de boss; de vinkjes staan in localStorage onder "<boss>:<id>". */
  id: string;
  label: string;
  /** Hoe een ironman eraan komt. */
  how?: string;
  /**
   * Optioneel: als dit gezet is, vinkt de app het item zelf af via de hiscores en de questlijst
   * (bijv. Devotion via de quest One Piercing Note). Dan is het item niet handmatig aan te vinken.
   */
  auto?: Conditions;
}

/** Gestructureerde PvM-klaar-checklist van een boss (Pvm-tab). */
export interface BossReady {
  /** Automatisch via de hiscores. */
  skills: Record<string, number>;
  /** Automatisch via de questlijst (exacte wiki-titel). */
  quests: string[];
  /** Handmatig: gebeden, abilities, killcount en dergelijke. */
  unlocks: ReadyItem[];
  /** Handmatig: wapens, armour, potions en eten. */
  gear: ReadyItem[];
}

export interface Boss {
  boss: string;
  name: string;
  stepIds: string[];
  location?: string;
  /** Datum waarop alles op runescape.wiki is gecontroleerd. */
  checked: string;
  summary: string;
  requirements: string[];
  ironmanGear: BossGear[];
  mechanics: string[];
  drops: { progress: BossDrop[]; useful: BossDrop[]; rest: BossDrop[] };
  uncertain?: string[];
  sources: { title: string; url: string }[];
  ready?: BossReady;
}

// Via unknown: TypeScript leidt uit de JSON per boss andere optionele skillsleutels af, die niet direct met Record<string, number> overlappen.
export const BOSSES = data as unknown as Boss[];
export const MAX_MECHANICS = 6;

export function bossIndex(list: Boss[] = BOSSES): Map<string, Boss> {
  const m = new Map<string, Boss>();
  for (const b of list) for (const id of b.stepIds) if (!m.has(id)) m.set(id, b);
  return m;
}

const INDEX = bossIndex();

export function bossForStep(stepId: string, list?: Boss[]): Boss | undefined {
  return list ? bossIndex(list).get(stepId) : INDEX.get(stepId);
}

/** Controle van het `ready`-blok: bekende skillnamen, geldige levels en unieke id's binnen de boss. */
export function validateReady(b: Boss): string[] {
  const issues: string[] = [];
  const r = b.ready;
  if (!r) return issues;
  const where = `bosses.json: '${b.boss}' ready`;
  const checkSkills = (ctx: string, skills: Record<string, number> | undefined) => {
    for (const [k, v] of Object.entries(skills ?? {})) {
      if (!isSkillName(k)) issues.push(`${where}${ctx}: onbekende skill '${k}'`);
      if (!Number.isInteger(v) || v < 1 || v > 120) issues.push(`${where}${ctx}: ongeldig level ${v} voor '${k}'`);
    }
  };
  checkSkills("", r.skills);
  const seenQuest = new Set<string>();
  for (const q of r.quests ?? []) {
    if (seenQuest.has(q)) issues.push(`${where}: dubbele quest '${q}'`);
    seenQuest.add(q);
  }
  const seenId = new Set<string>();
  for (const item of [...(r.unlocks ?? []), ...(r.gear ?? [])]) {
    if (!item.id || !item.id.trim()) issues.push(`${where}: item '${item.label}' heeft geen id`);
    else if (seenId.has(item.id)) issues.push(`${where}: dubbele id '${item.id}'`);
    seenId.add(item.id);
    if (!item.label || !item.label.trim()) issues.push(`${where}: item '${item.id}' heeft geen label`);
    checkSkills(` '${item.id}'`, item.auto?.skills);
  }
  return issues;
}

/** Contractcontrole van de bossdata tegen de geladen route. Lege `stepIds` mag: zo'n boss zit (nog) niet in de route. */
export function validateBosses(list: Boss[], route: Route): string[] {
  const issues: string[] = [];
  const stepIds = new Set(route.phases.flatMap((p) => p.steps.map((s) => s.id)));
  const seenBoss = new Set<string>();
  const seenStep = new Map<string, string>();
  for (const b of list) {
    if (seenBoss.has(b.boss)) issues.push(`bosses.json: dubbele boss '${b.boss}'`);
    seenBoss.add(b.boss);
    if (b.mechanics.length > MAX_MECHANICS) issues.push(`bosses.json: '${b.boss}' heeft meer dan ${MAX_MECHANICS} mechanics`);
    issues.push(...validateReady(b));
    for (const id of b.stepIds) {
      if (!stepIds.has(id)) issues.push(`bosses.json: '${b.boss}' wijst naar onbekende stap '${id}'`);
      const other = seenStep.get(id);
      if (other && other !== b.boss) issues.push(`bosses.json: stap '${id}' hoort bij zowel '${other}' als '${b.boss}'`);
      seenStep.set(id, b.boss);
    }
  }
  return issues;
}
