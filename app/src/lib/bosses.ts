import data from "../data/bosses.json";
import type { Route } from "./route";

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
}

export const BOSSES = data as Boss[];
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

/** Contractcontrole van de bossdata tegen de geladen route. */
export function validateBosses(list: Boss[], route: Route): string[] {
  const issues: string[] = [];
  const stepIds = new Set(route.phases.flatMap((p) => p.steps.map((s) => s.id)));
  const seenBoss = new Set<string>();
  const seenStep = new Map<string, string>();
  for (const b of list) {
    if (seenBoss.has(b.boss)) issues.push(`bosses.json: dubbele boss '${b.boss}'`);
    seenBoss.add(b.boss);
    if (b.mechanics.length > MAX_MECHANICS) issues.push(`bosses.json: '${b.boss}' heeft meer dan ${MAX_MECHANICS} mechanics`);
    for (const id of b.stepIds) {
      if (!stepIds.has(id)) issues.push(`bosses.json: '${b.boss}' wijst naar onbekende stap '${id}'`);
      const other = seenStep.get(id);
      if (other && other !== b.boss) issues.push(`bosses.json: stap '${id}' hoort bij zowel '${other}' als '${b.boss}'`);
      seenStep.set(id, b.boss);
    }
  }
  return issues;
}
