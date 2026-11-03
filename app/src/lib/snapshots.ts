import type { AccountData } from "./api";
import { SKILLS, type SkillName } from "./skills";

export const MAX_SNAPSHOTS = 200;

export interface Snapshot {
  ts: string;
  account: string;
  xp: Record<string, number>;
  levels: Record<string, number>;
  totalXp: number;
  qp: number | null;
}

export function toSnapshot(d: AccountData): Snapshot {
  const xp: Record<string, number> = {};
  const levels: Record<string, number> = {};
  for (const s of d.skills) {
    xp[s.name] = s.xp;
    levels[s.name] = s.level;
  }
  return {
    ts: d.fetchedAt,
    account: d.account,
    xp,
    levels,
    totalXp: d.skills.reduce((a, s) => a + s.xp, 0),
    qp: d.questPoints,
  };
}

const sameAccount = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function forAccount(list: Snapshot[], account: string): Snapshot[] {
  return list.filter((s) => sameAccount(s.account, account)).sort((a, b) => a.ts.localeCompare(b.ts));
}

function identical(a: Snapshot, b: Snapshot): boolean {
  return a.qp === b.qp && SKILLS.every((k) => (a.xp[k] ?? 0) === (b.xp[k] ?? 0));
}

/**
 * Voegt een snapshot toe. Is er niets veranderd sinds de vorige snapshot van dit account,
 * dan wordt hij overgeslagen zodat de 200 plekken voor echte voortgang blijven.
 */
export function addSnapshot(list: Snapshot[], snap: Snapshot): { list: Snapshot[]; added: boolean } {
  const mine = forAccount(list, snap.account);
  const last = mine[mine.length - 1];
  if (last && identical(last, snap)) return { list, added: false };
  const next = [...list, snap].sort((a, b) => a.ts.localeCompare(b.ts));
  return { list: next.slice(Math.max(0, next.length - MAX_SNAPSHOTS)), added: true };
}

export interface SnapDiff {
  from: Snapshot;
  to: Snapshot;
  perSkill: { skill: SkillName; xp: number; levels: number }[];
  totalXp: number;
  qp: number | null;
}

export function diff(from: Snapshot, to: Snapshot): SnapDiff {
  const perSkill = SKILLS.map((skill) => ({
    skill,
    xp: (to.xp[skill] ?? 0) - (from.xp[skill] ?? 0),
    levels: (to.levels[skill] ?? 1) - (from.levels[skill] ?? 1),
  }));
  return {
    from,
    to,
    perSkill,
    totalXp: perSkill.reduce((a, s) => a + s.xp, 0),
    qp: from.qp !== null && to.qp !== null ? to.qp - from.qp : null,
  };
}

/** Basis voor "sinds 7 dagen": laatste snapshot van minstens 7 dagen oud, anders de oudste. */
export function baseFor7Days(mine: Snapshot[], now = Date.now()): { base: Snapshot; full: boolean } | null {
  if (mine.length < 2) return null;
  const cutoff = now - 7 * 24 * 3600 * 1000;
  let base: Snapshot | null = null;
  for (const s of mine) if (Date.parse(s.ts) <= cutoff) base = s;
  if (base) return { base, full: true };
  return { base: mine[0], full: false };
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
}
