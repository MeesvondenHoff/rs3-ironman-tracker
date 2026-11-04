import type { Boss, ReadyItem } from "./bosses";
import { checkConditions, type Conditions, type EvalContext, type Route } from "./route";
import { KEYS, load, save } from "./storage";

// PvM-klaar-checklist: per boss de eisen uit bosses.json (`ready`), automatisch afgevinkt waar de
// accountdata dat kan (skills uit de hiscores, quests uit de questlijst) en verder met de hand.
// Handmatige vinkjes staan in localStorage onder rs3t:pvm als { "<boss>:<id>": true }.

export type PvmGroupKey = "skills" | "quests" | "unlocks" | "gear";

/** Waar een automatisch vinkje vandaan komt. */
export type PvmSource = "hiscores" | "questlijst" | "hiscores en questlijst";

export interface PvmCheck {
  /** Uniek binnen de boss: "skill:Defence", "quest:<titel>" of de id uit bosses.json. */
  id: string;
  label: string;
  how?: string;
  met: boolean;
  /** true: de app vinkt af; false: de speler vinkt af. */
  auto: boolean;
  source?: PvmSource;
  /** true als de questlijst ontbreekt en dit item dus niet te controleren is; telt dan niet mee. */
  unknown?: boolean;
  /** Bij een automatisch unlock- of gear-item: welke deel-eisen nog open staan. */
  detail?: string;
  /** Sleutel in de vinkjes-map (alleen handmatige items). */
  key?: string;
}

export interface PvmGroup {
  key: PvmGroupKey;
  label: string;
  checks: PvmCheck[];
}

export interface BossReadiness {
  boss: Boss;
  groups: PvmGroup[];
  done: number;
  /** Aantal eisen dat meetelt (zonder de niet te controleren quests). */
  total: number;
  /** Open eisen, automatische eerst. */
  missing: PvmCheck[];
  /** Aantal eisen dat niet gecontroleerd kon worden (questlijst ontbreekt). */
  unknown: number;
}

export const GROUP_LABEL: Record<PvmGroupKey, string> = {
  skills: "Skills",
  quests: "Quests",
  unlocks: "Unlocks",
  gear: "Gear",
};

export const pvmKey = (boss: string, id: string) => `${boss}:${id}`;

export function loadPvmChecks(): Record<string, boolean> {
  const v = load<unknown>(KEYS.pvm, {});
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, b] of Object.entries(v as Record<string, unknown>)) if (b === true) out[k] = true;
  return out;
}

/** Bewaart alleen aangevinkte items, zodat de back-up klein en leesbaar blijft. */
export function savePvmChecks(checks: Record<string, boolean>): void {
  save(KEYS.pvm, Object.fromEntries(Object.entries(checks).filter(([, v]) => v)));
}

export function togglePvmCheck(checks: Record<string, boolean>, key: string): Record<string, boolean> {
  const next = { ...checks };
  if (next[key]) delete next[key];
  else next[key] = true;
  return next;
}

const stripQuest = (label: string) => label.replace(/^Quest: /, "");

function sourceOf(c: Conditions): PvmSource {
  const s = Object.keys(c.skills ?? {}).length > 0;
  const q = (c.quests ?? []).length > 0;
  return s && q ? "hiscores en questlijst" : q ? "questlijst" : "hiscores";
}

function itemCheck(boss: Boss, item: ReadyItem, ctx: EvalContext, manual: Record<string, boolean>): PvmCheck {
  const auto = item.auto && (Object.keys(item.auto.skills ?? {}).length > 0 || (item.auto.quests ?? []).length > 0);
  if (!auto) {
    const key = pvmKey(boss.boss, item.id);
    return { id: item.id, label: item.label, how: item.how, met: !!manual[key], auto: false, key };
  }
  const c = item.auto!;
  const conds = checkConditions(c, ctx);
  const unknown = ctx.questStatus === null && (c.quests ?? []).length > 0;
  const open = conds.filter((x) => !x.met).map((x) => stripQuest(x.label));
  return {
    id: item.id,
    label: item.label,
    how: item.how,
    met: !unknown && open.length === 0,
    auto: true,
    source: sourceOf(c),
    unknown: unknown || undefined,
    detail: !unknown && open.length > 0 ? `nog nodig: ${open.join(", ")}` : undefined,
  };
}

/** Gereedheid van één boss: checks per groep, score en wat er nog ontbreekt. */
export function bossReadiness(boss: Boss, ctx: EvalContext, manual: Record<string, boolean>): BossReadiness {
  const r = boss.ready ?? { skills: {}, quests: [], unlocks: [], gear: [] };
  const questsUnknown = ctx.questStatus === null;

  const skills: PvmCheck[] = Object.entries(r.skills ?? {}).map(([skill, lvl]) => {
    const [c] = checkConditions({ skills: { [skill]: lvl } }, ctx);
    return { id: `skill:${skill}`, label: c.label, met: c.met, auto: true, source: "hiscores" };
  });
  const quests: PvmCheck[] = (r.quests ?? []).map((q) => {
    const [c] = checkConditions({ quests: [q] }, ctx);
    return {
      id: `quest:${q}`,
      label: stripQuest(c.label),
      met: !questsUnknown && c.met,
      auto: true,
      source: "questlijst",
      unknown: questsUnknown || undefined,
    };
  });
  const unlocks = (r.unlocks ?? []).map((i) => itemCheck(boss, i, ctx, manual));
  const gear = (r.gear ?? []).map((i) => itemCheck(boss, i, ctx, manual));

  const groups: PvmGroup[] = [
    { key: "skills", label: GROUP_LABEL.skills, checks: skills },
    { key: "quests", label: GROUP_LABEL.quests, checks: quests },
    { key: "unlocks", label: GROUP_LABEL.unlocks, checks: unlocks },
    { key: "gear", label: GROUP_LABEL.gear, checks: gear },
  ];
  const all = groups.flatMap((g) => g.checks);
  const counted = all.filter((c) => !c.unknown);
  const open = counted.filter((c) => !c.met);
  return {
    boss,
    groups,
    done: counted.length - open.length,
    total: counted.length,
    missing: [...open.filter((c) => c.auto), ...open.filter((c) => !c.auto)],
    unknown: all.length - counted.length,
  };
}

/**
 * Bosses op routevolgorde: de positie van de eerste stepId die in de route voorkomt.
 * Bosses zonder (bekende) stap komen daarna, in de volgorde van bosses.json.
 */
export function sortBosses(list: Boss[], route: Route | null): Boss[] {
  const pos = new Map<string, number>();
  let i = 0;
  for (const p of route?.phases ?? []) for (const s of p.steps) pos.set(s.id, i++);
  const first = (b: Boss) => {
    for (const id of b.stepIds) {
      const n = pos.get(id);
      if (n !== undefined) return n;
    }
    return Infinity;
  };
  return list
    .map((b, idx) => ({ b, idx, at: first(b) }))
    .sort((x, y) => (x.at === y.at ? x.idx - y.idx : x.at - y.at))
    .map((x) => x.b);
}

/** De eerste stap van de boss die in de route staat, voor de knop "Naar de route". */
export function firstRouteStep(boss: Boss, route: Route | null): string | null {
  if (!route) return null;
  const ids = new Set(route.phases.flatMap((p) => p.steps.map((s) => s.id)));
  return boss.stepIds.find((id) => ids.has(id)) ?? null;
}

/**
 * De boss die het dichtst bij klaar is: de minste open eisen, bij gelijkspel het hoogste deel gehaald en
 * daarna de vroegste in de lijst (die al op routevolgorde staat). Bosses die helemaal klaar zijn tellen niet.
 * Bewust niet alleen de fractie: een verre boss met weinig eisen (Araxxor) zou anders winnen op één toevallig gehaalde quest.
 */
export function closestBoss(list: BossReadiness[]): BossReadiness | null {
  let best: BossReadiness | null = null;
  for (const r of list) {
    if (r.total === 0 || r.done === r.total) continue;
    if (!best) { best = r; continue; }
    const open = r.total - r.done, bestOpen = best.total - best.done;
    if (open < bestOpen || (open === bestOpen && r.done / r.total > best.done / best.total)) best = r;
  }
  return best;
}
