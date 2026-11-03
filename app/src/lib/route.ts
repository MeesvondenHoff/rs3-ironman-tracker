import type { Quest, QuestStatus, SkillRow } from "./api";
import { isSkillName } from "./skills";

// Typen volgens research/ROUTE-SCHEMA.md
export interface RouteSource {
  id: string;
  title: string;
  url: string;
  weight?: "hoog" | "midden" | "laag" | string;
  note?: string;
}

export interface Conditions {
  skills?: Record<string, number>;
  quests?: string[];
}

export type StepType = "quest" | "skill" | "unlock" | "gear" | "misc";
export type StepStyle = "active" | "afk" | "mixed";

export interface RouteStep {
  id: string;
  title: string;
  type: StepType | string;
  style: StepStyle | string;
  estHours?: number;
  /** Korte plaatsnaam ("Um, City of Um"); optioneel, wordt als vaste regel op de stapkaart getoond. */
  location?: string;
  detail?: string;
  why?: string;
  requires?: Conditions;
  completeWhen?: Conditions;
  sources?: string[];
}

export interface RoutePhase {
  id: string;
  title: string;
  summary?: string;
  estHours?: number;
  targets?: { skill: string; level: number }[];
  steps: RouteStep[];
}

export interface Route {
  meta: {
    account?: string;
    goal?: string;
    playstyle?: string;
    updated?: string;
    sources?: RouteSource[];
  };
  phases: RoutePhase[];
}

export interface LoadedRoute {
  route: Route;
  /** Pad (relatief aan src/) van het geladen bestand. */
  file: string;
  /** Melding als route.json ontbrak of niet te laden was. */
  notice: string | null;
}

// Vite-glob: route.json is optioneel. Ontbreekt het, dan bevat de map alleen route.example.json.
const modules = import.meta.glob<{ default: unknown }>(["../data/route.json", "../data/route.example.json"]);
const MAIN = "../data/route.json";
const EXAMPLE = "../data/route.example.json";

function assertRoute(x: unknown): Route {
  const r = x as Route;
  if (!r || typeof r !== "object" || !Array.isArray(r.phases)) throw new Error("ontbrekende 'phases'-array");
  r.meta = r.meta ?? {};
  for (const p of r.phases) {
    if (!p.id || !Array.isArray(p.steps)) throw new Error(`fase '${p.id ?? "?"}' mist id of steps`);
  }
  return r;
}

export async function loadRoute(): Promise<LoadedRoute> {
  let notice: string | null = null;
  if (modules[MAIN]) {
    try {
      const m = await modules[MAIN]();
      return { route: assertRoute(m.default), file: "src/data/route.json", notice: null };
    } catch (e) {
      notice = `src/data/route.json kon niet geladen worden (${e instanceof Error ? e.message : String(e)}); voorbeeldroute getoond.`;
    }
  } else {
    notice = "src/data/route.json ontbreekt; voorbeeldroute (route.example.json) getoond.";
  }
  const m = await modules[EXAMPLE]();
  return { route: assertRoute(m.default), file: "src/data/route.example.json", notice };
}

// ---------- Evaluatie ----------

export interface EvalContext {
  levels: Map<string, number>;
  /** null als de quests niet geladen konden worden. */
  questStatus: Map<string, QuestStatus> | null;
  manual: Record<string, boolean>;
}

export function makeContext(skills: SkillRow[] | null, quests: Quest[] | null, manual: Record<string, boolean>): EvalContext {
  return {
    levels: new Map((skills ?? []).map((s) => [s.name, s.level])),
    questStatus: quests ? new Map(quests.map((q) => [q.title, q.status])) : null,
    manual,
  };
}

export interface CondCheck {
  label: string;
  met: boolean;
}

export function checkConditions(c: Conditions | undefined, ctx: EvalContext): CondCheck[] {
  if (!c) return [];
  const out: CondCheck[] = [];
  for (const [skill, lvl] of Object.entries(c.skills ?? {})) {
    const cur = ctx.levels.get(skill);
    out.push({ label: `${skill} ${lvl}${cur !== undefined ? ` (nu ${cur})` : ""}`, met: cur !== undefined && cur >= lvl });
  }
  for (const q of c.quests ?? []) {
    const st = ctx.questStatus?.get(q);
    out.push({ label: `Quest: ${q}${st === "STARTED" ? " (gestart)" : ""}`, met: st === "COMPLETED" });
  }
  return out;
}

export function isAuto(step: RouteStep): boolean {
  const c = step.completeWhen;
  return !!c && (Object.keys(c.skills ?? {}).length > 0 || (c.quests ?? []).length > 0);
}

export interface StepState {
  auto: boolean;
  done: boolean;
  available: boolean;
  missing: CondCheck[];
  completeChecks: CondCheck[];
}

export function stepState(step: RouteStep, ctx: EvalContext): StepState {
  const auto = isAuto(step);
  const completeChecks = auto ? checkConditions(step.completeWhen, ctx) : [];
  // Handmatig afvinken telt altijd, ook bij een automatische stap: de API loopt
  // soms achter of kent een quest anders (bijv. Rune Mysteries na Rune Mythos).
  const done = (auto && completeChecks.every((c) => c.met)) || !!ctx.manual[step.id];
  const missing = checkConditions(step.requires, ctx).filter((c) => !c.met);
  return { auto, done, available: missing.length === 0, missing, completeChecks };
}

export interface PhaseProgress {
  done: number;
  total: number;
  remainingHours: number;
}

export function phaseProgress(phase: RoutePhase, ctx: EvalContext): PhaseProgress {
  let done = 0;
  let remainingHours = 0;
  for (const s of phase.steps) {
    if (stepState(s, ctx).done) done++;
    else remainingHours += s.estHours ?? 0;
  }
  return { done, total: phase.steps.length, remainingHours };
}

export interface NextStep {
  phase: RoutePhase;
  step: RouteStep;
  state: StepState;
}

/** Eerste niet-afgevinkte beschikbare stap; anders de eerste niet-afgevinkte stap. */
export function nextStep(route: Route, ctx: EvalContext): NextStep | null {
  let firstOpen: NextStep | null = null;
  for (const phase of route.phases) {
    for (const step of phase.steps) {
      const state = stepState(step, ctx);
      if (state.done) continue;
      if (state.available) return { phase, step, state };
      firstOpen ??= { phase, step, state };
    }
  }
  return firstOpen;
}

/** Quest-titels die in de route voorkomen, met de stap-id's waar ze in staan. */
export function questsInRoute(route: Route): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const p of route.phases)
    for (const s of p.steps)
      for (const q of new Set([...(s.requires?.quests ?? []), ...(s.completeWhen?.quests ?? [])])) {
        const arr = m.get(q) ?? [];
        arr.push(s.id);
        m.set(q, arr);
      }
  return m;
}

/** Contractcontrole: geeft leesbare waarschuwingen terug. */
export function validateRoute(route: Route, quests: Quest[] | null): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const sourceIds = new Set((route.meta.sources ?? []).map((s) => s.id));
  const questTitles = quests ? new Set(quests.map((q) => q.title)) : null;
  const checkSkills = (where: string, skills: Record<string, number> | undefined) => {
    for (const k of Object.keys(skills ?? {})) if (!isSkillName(k)) issues.push(`${where}: onbekende skill '${k}'`);
  };
  const checkQuests = (where: string, qs: string[] | undefined) => {
    if (!questTitles) return;
    for (const q of qs ?? []) if (!questTitles.has(q)) issues.push(`${where}: onbekende quest '${q}'`);
  };
  for (const p of route.phases) {
    if (ids.has(p.id)) issues.push(`dubbel id '${p.id}'`);
    ids.add(p.id);
    for (const t of p.targets ?? []) if (!isSkillName(t.skill)) issues.push(`${p.id} targets: onbekende skill '${t.skill}'`);
    for (const s of p.steps) {
      if (ids.has(s.id)) issues.push(`dubbel id '${s.id}'`);
      ids.add(s.id);
      checkSkills(`${s.id} requires`, s.requires?.skills);
      checkSkills(`${s.id} completeWhen`, s.completeWhen?.skills);
      checkQuests(`${s.id} requires`, s.requires?.quests);
      checkQuests(`${s.id} completeWhen`, s.completeWhen?.quests);
      for (const src of s.sources ?? []) if (!sourceIds.has(src)) issues.push(`${s.id}: onbekende bron '${src}'`);
    }
  }
  return issues;
}
