import data from "../data/repeatables.json";
import { load, PREFIX, save } from "./storage";

// Terugkerende activiteiten (Weekritme). Alle resets volgen RS3-tijd = UTC:
// dagelijks 00:00 UTC, wekelijks woensdag 00:00 UTC, maandelijks de 1e om 00:00 UTC.

export type Period = "daily" | "weekly" | "monthly";

export interface Repeatable {
  id: string;
  title: string;
  period: Period;
  detail: string;
  wikiUrl: string;
  /** Stoppunt: wanneer je ermee kunt ophouden. */
  stop?: string;
  /** Stap-id: het item verschijnt pas als die stap beschikbaar (of gedaan) is. */
  unlockedBy?: string;
  /** 0 = zondag ... 6 = zaterdag (UTC), als het item aan een dag vastzit. */
  dayOfWeek?: number;
  /** Alleen doen als het past bij wat je toch al doet. */
  optional?: boolean;
}

export const REPEATABLES = data as Repeatable[];
export const PERIODS: Period[] = ["daily", "weekly", "monthly"];
export const PERIOD_LABEL: Record<Period, string> = { daily: "Dagelijks", weekly: "Wekelijks", monthly: "Maandelijks" };
export const DAY_NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

const DAY = 86_400_000;
/** RS3-weekreset: woensdag. */
export const WEEKLY_RESET_DAY = 3;

/** Tijdstip (ms, UTC) van de laatste reset op of voor `now`. */
export function lastReset(period: Period, now: number): number {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (period === "daily") return midnight;
  if (period === "weekly") return midnight - ((d.getUTCDay() - WEEKLY_RESET_DAY + 7) % 7) * DAY;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/** Tijdstip (ms, UTC) van de eerstvolgende reset na `now`. */
export function nextReset(period: Period, now: number): number {
  if (period === "daily") return lastReset("daily", now) + DAY;
  if (period === "weekly") return lastReset("weekly", now) + 7 * DAY;
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** Gedaan = afgevinkt op of na de laatste reset. */
export function isDone(checkedAt: number | null | undefined, period: Period, now: number): boolean {
  return typeof checkedAt === "number" && Number.isFinite(checkedAt) && checkedAt >= lastReset(period, now);
}

/** "3 dagen en 4 uur", "5 uur en 12 minuten", "12 minuten". */
export function untilText(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  const part = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (days > 0) return hours > 0 ? `${part(days, "dag", "dagen")} en ${hours} uur` : part(days, "dag", "dagen");
  if (hours > 0) return mins > 0 ? `${hours} uur en ${part(mins, "minuut", "minuten")}` : `${hours} uur`;
  return part(mins, "minuut", "minuten");
}

/** Zichtbaar als er geen `unlockedBy` is, of als die stap in de route bestaat en beschikbaar of gedaan is. */
export function isUnlocked(item: Repeatable, stepOpen: (id: string) => boolean): boolean {
  return !item.unlockedBy || stepOpen(item.unlockedBy);
}

export interface PeriodSummary {
  period: Period;
  items: Repeatable[];
  open: number;
  total: number;
  nextReset: number;
}

export function summarize(items: Repeatable[], checks: Record<string, number | undefined>, now: number): PeriodSummary[] {
  return PERIODS.map((period) => {
    const list = items.filter((i) => i.period === period);
    const open = list.filter((i) => !isDone(checks[i.id], period, now)).length;
    return { period, items: list, open, total: list.length, nextReset: nextReset(period, now) };
  }).filter((s) => s.total > 0);
}

// ---------- Opslag: rs3t:repeat:<id> = tijdstip van afvinken (ms) ----------

export const repeatKey = (id: string) => `${PREFIX}repeat:${id}`;

export function loadChecks(items: Repeatable[]): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const i of items) {
    const v = load<unknown>(repeatKey(i.id), null);
    if (typeof v === "number") out[i.id] = v;
  }
  return out;
}

export function saveCheck(id: string, at: number | null): void {
  if (at === null) {
    try {
      localStorage.removeItem(repeatKey(id));
    } catch {
      /* opslag niet beschikbaar */
    }
  } else save(repeatKey(id), at);
}
