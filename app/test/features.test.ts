import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BossCard, checkedText } from "../src/components/BossCard";
import { beforeEach, describe, expect, it } from "vitest";
import { BOSSES, bossForStep, bossIndex, MAX_MECHANICS, validateBosses, type Boss } from "../src/lib/bosses";
import {
  isDone, isUnlocked, lastReset, nextReset, REPEATABLES, summarize, untilText, type Repeatable,
} from "../src/lib/repeatables";
import type { Route } from "../src/lib/route";
import { exportAll, importAll, loadNote, noteKey, notesFrom, saveNote } from "../src/lib/storage";
import { LocationLine, pctText } from "../src/components/ui";

// Eenvoudige localStorage voor de node-omgeving van vitest.
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true, writable: true });

const U = (iso: string) => Date.parse(iso);
const example: Route = JSON.parse(readFileSync(new URL("../src/data/route.example.json", import.meta.url), "utf8"));
const real: Route = JSON.parse(readFileSync(new URL("../src/data/route.json", import.meta.url), "utf8"));

describe("Weekritme: resets in UTC", () => {
  it("dagelijks om 00:00 UTC", () => {
    expect(lastReset("daily", U("2026-11-03T15:30:00Z"))).toBe(U("2026-11-03T00:00:00Z"));
    expect(lastReset("daily", U("2026-11-03T00:00:00Z"))).toBe(U("2026-11-03T00:00:00Z"));
    expect(lastReset("daily", U("2026-11-02T23:59:59.999Z"))).toBe(U("2026-11-02T00:00:00Z"));
    expect(nextReset("daily", U("2026-11-03T23:59:00Z"))).toBe(U("2026-11-04T00:00:00Z"));
  });

  it("wekelijks op woensdag 00:00 UTC", () => {
    // 2026-11-04 is een woensdag.
    expect(new Date(U("2026-11-04T00:00:00Z")).getUTCDay()).toBe(3);
    expect(lastReset("weekly", U("2026-11-03T23:59:59Z"))).toBe(U("2026-10-28T00:00:00Z")); // dinsdagavond
    expect(lastReset("weekly", U("2026-11-04T00:00:00Z"))).toBe(U("2026-11-04T00:00:00Z")); // precies op de reset
    expect(lastReset("weekly", U("2026-11-04T00:00:01Z"))).toBe(U("2026-11-04T00:00:00Z"));
    expect(lastReset("weekly", U("2026-11-08T12:00:00Z"))).toBe(U("2026-11-04T00:00:00Z")); // zondag
    expect(nextReset("weekly", U("2026-11-04T00:00:00Z"))).toBe(U("2026-11-11T00:00:00Z"));
    expect(nextReset("weekly", U("2026-11-03T22:00:00Z"))).toBe(U("2026-11-04T00:00:00Z"));
  });

  it("maandelijks op de 1e 00:00 UTC, ook over de jaargrens", () => {
    expect(lastReset("monthly", U("2026-11-03T10:00:00Z"))).toBe(U("2026-11-01T00:00:00Z"));
    expect(lastReset("monthly", U("2026-10-31T23:59:59Z"))).toBe(U("2026-10-01T00:00:00Z"));
    expect(nextReset("monthly", U("2026-12-31T23:00:00Z"))).toBe(U("2027-01-01T00:00:00Z"));
  });

  it("gebruikt UTC, niet de lokale tijd: 01:30 Nederlandse tijd op woensdag is nog dinsdag in UTC", () => {
    // 2026-11-04 01:30 CET = 2026-11-04 00:30 UTC (al na de reset); 2026-11-04 00:30 CET = 2026-11-03 23:30 UTC (nog niet).
    expect(lastReset("weekly", U("2026-11-04T00:30:00+01:00"))).toBe(U("2026-10-28T00:00:00Z"));
    expect(lastReset("weekly", U("2026-11-04T01:30:00+01:00"))).toBe(U("2026-11-04T00:00:00Z"));
  });

  it("een vinkje telt tot de volgende reset", () => {
    const checked = U("2026-11-03T23:59:00Z"); // dinsdag vlak voor de weekreset
    expect(isDone(checked, "weekly", U("2026-11-03T23:59:59Z"))).toBe(true);
    expect(isDone(checked, "weekly", U("2026-11-04T00:00:00Z"))).toBe(false);
    expect(isDone(checked, "daily", U("2026-11-04T00:00:00Z"))).toBe(false);
    expect(isDone(checked, "monthly", U("2026-11-30T12:00:00Z"))).toBe(true);
    expect(isDone(checked, "monthly", U("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isDone(U("2026-11-04T00:00:00Z"), "weekly", U("2026-11-04T00:00:00Z"))).toBe(true);
    expect(isDone(undefined, "weekly", U("2026-11-04T00:00:00Z"))).toBe(false);
    expect(isDone(Number.NaN, "daily", U("2026-11-04T00:00:00Z"))).toBe(false);
  });

  it("schrijft de tijd tot de reset leesbaar uit", () => {
    expect(untilText(3 * 86_400_000 + 4 * 3_600_000)).toBe("3 dagen en 4 uur");
    expect(untilText(86_400_000)).toBe("1 dag");
    expect(untilText(5 * 3_600_000 + 12 * 60_000)).toBe("5 uur en 12 minuten");
    expect(untilText(60_000)).toBe("1 minuut");
    expect(untilText(0)).toBe("1 minuut");
  });

  it("telt per periode wat open staat", () => {
    const now = U("2026-11-05T12:00:00Z");
    const items: Repeatable[] = [
      { id: "a", title: "A", period: "weekly", detail: "", wikiUrl: "" },
      { id: "b", title: "B", period: "weekly", detail: "", wikiUrl: "" },
      { id: "c", title: "C", period: "monthly", detail: "", wikiUrl: "" },
    ];
    const s = summarize(items, { a: U("2026-11-04T08:00:00Z"), b: U("2026-11-03T08:00:00Z") }, now);
    expect(s.map((g) => [g.period, g.open, g.total])).toEqual([["weekly", 1, 2], ["monthly", 1, 1]]);
    expect(s[0].nextReset).toBe(U("2026-11-11T00:00:00Z"));
  });

  it("toont Reaper-taken pas als stap p5-11 open is", () => {
    const reaper = REPEATABLES.find((r) => r.id === "reaper")!;
    expect(reaper.unlockedBy).toBe("p5-11");
    expect(isUnlocked(reaper, () => false)).toBe(false);
    expect(isUnlocked(reaper, (id) => id === "p5-11")).toBe(true);
    expect(isUnlocked(REPEATABLES[0], () => false)).toBe(true);
  });

  it("de data is compleet en volgt het schema", () => {
    const ids = REPEATABLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["daily-challenges", "herby-werby", "penguins", "circus", "rune-shops", "thalmund", "troll-invasion", "reaper"]));
    for (const r of REPEATABLES) {
      expect(["daily", "weekly", "monthly"]).toContain(r.period);
      expect(r.wikiUrl).toMatch(/^https:\/\/runescape\.wiki\/w\//);
    }
    expect(REPEATABLES.find((r) => r.id === "thalmund")).toMatchObject({ dayOfWeek: 3, stop: "4 uncut moonstone" });
  });
});

describe("Notities per stap", () => {
  beforeEach(() => localStorage.clear());

  it("bewaart, leest en wist een notitie onder rs3t:note:<id>", () => {
    saveNote("p2-03", "nog 12 bars");
    expect(localStorage.getItem("rs3t:note:p2-03")).toBe(JSON.stringify("nog 12 bars"));
    expect(loadNote("p2-03")).toBe("nog 12 bars");
    saveNote("p2-03", "   ");
    expect(localStorage.getItem(noteKey("p2-03"))).toBeNull();
    expect(loadNote("onbekend")).toBe("");
  });

  it("neemt notities mee in export en import", () => {
    saveNote("p1-01", "eerst Herby Werby");
    saveNote("p6-05", "antifire!\ntweede regel");
    localStorage.setItem("rs3t:manualChecks", JSON.stringify({ "p1-01": true }));
    localStorage.setItem("ander:sleutel", "blijft buiten de export");
    const file = exportAll();
    expect(file.notes).toEqual({ "p1-01": "eerst Herby Werby", "p6-05": "antifire!\ntweede regel" });
    expect(file.data["rs3t:note:p6-05"]).toBe("antifire!\ntweede regel");
    expect(file.data["ander:sleutel"]).toBeUndefined();

    const roundTrip = JSON.parse(JSON.stringify(file));
    localStorage.clear();
    saveNote("p9-99", "wordt vervangen");
    const r = importAll(roundTrip);
    expect(r).toEqual({ total: 3, notes: 2 });
    expect(loadNote("p6-05")).toBe("antifire!\ntweede regel");
    expect(loadNote("p9-99")).toBe("");
  });

  it("vult notities aan uit het overzichtsveld als ze niet in data staan", () => {
    const r = importAll({ app: "rs3-ironman-tracker", version: 1, exportedAt: "", data: {}, notes: { "p3-01": "farm checken", "p3-02": "" } });
    expect(r).toEqual({ total: 1, notes: 1 });
    expect(loadNote("p3-01")).toBe("farm checken");
    expect(notesFrom({ "rs3t:note:x": "a", "rs3t:note:y": 5, "rs3t:tab": "route" })).toEqual({ x: "a" });
  });
});

describe("Bosskaarten", () => {
  it("koppelt Ivar, K'ril en Vindicta aan hun stappen; QBD is uitgesteld en hangt nergens aan", () => {
    expect(bossForStep("p2-09")?.boss).toBe("ivar");
    expect(bossForStep("p6-04")?.boss).toBe("kril");
    expect(bossForStep("p6-07")?.boss).toBe("vindicta");
    expect(bossForStep("p6-05")).toBeUndefined();
    expect(bossForStep("p1-01")).toBeUndefined();
  });

  it("de stap-id's bestaan in route.json en de data is volledig", () => {
    expect(validateBosses(BOSSES, real)).toEqual([]);
    for (const b of BOSSES) {
      expect(b.mechanics.length).toBeGreaterThan(0);
      expect(b.mechanics.length).toBeLessThanOrEqual(MAX_MECHANICS);
      expect(b.requirements.length).toBeGreaterThan(0);
      expect(b.ironmanGear.length).toBeGreaterThan(0);
      expect(b.drops.progress.length + b.drops.useful.length).toBeGreaterThan(0);
      expect(b.sources.every((s) => s.url.startsWith("https://runescape.wiki/"))).toBe(true);
      expect(b.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("meldt onbekende stappen, dubbele koppelingen en te veel mechanics", () => {
    const base = BOSSES[0];
    const bad: Boss[] = [
      { ...base, boss: "x", stepIds: ["p2-09", "bestaat-niet"], mechanics: Array(7).fill("m") },
      { ...base, boss: "y", stepIds: ["p2-09"] },
    ];
    const issues = validateBosses(bad, real);
    expect(issues.some((i) => i.includes("onbekende stap 'bestaat-niet'"))).toBe(true);
    expect(issues.some((i) => i.includes("hoort bij zowel 'x' als 'y'"))).toBe(true);
    expect(issues.some((i) => i.includes("meer dan 6 mechanics"))).toBe(true);
    expect(bossIndex(bad).get("p2-09")?.boss).toBe("x");
  });

  it("de voorbeeldroute heeft geen boss-stappen", () => {
    expect(validateBosses(BOSSES, example).length).toBe(BOSSES.reduce((a, b) => a + b.stepIds.length, 0));
  });
});

describe("Locatie en fasevoortgang", () => {
  it("de voorbeeldroute heeft een locatie bij twee stappen", () => {
    const withLoc = example.phases.flatMap((p) => p.steps).filter((s) => s.location);
    expect(withLoc.map((s) => [s.id, s.location])).toEqual([["ex-p1-01", "Taverley"], ["ex-p2-01", "Baxtorian Falls"]]);
  });

  it("schrijft de voortgang als percentage", () => {
    expect(pctText(7, 15)).toBe("47%");
    expect(pctText(0, 0)).toBe("0%");
    expect(pctText(3, 3)).toBe("100%");
  });
});

describe("Weergave", () => {
  it("locatieregel alleen als er een locatie is", () => {
    expect(renderToStaticMarkup(createElement(LocationLine, { location: "Taverley" }))).toContain("Taverley");
    expect(renderToStaticMarkup(createElement(LocationLine, {}))).toBe("");
    expect(renderToStaticMarkup(createElement(LocationLine, { location: "  " }))).toBe("");
  });
  it("bosskaart toont secties en bronnen", () => {
    const html = renderToStaticMarkup(createElement(BossCard, { boss: BOSSES[2] }));
    for (const h of ["Eisen", "Gear voor een Necromancy-ironman", "Mechanics", "Nodig voor progressie", "Handig", "De rest", "3 november 2026"]) {
      expect(html).toContain(h);
    }
    expect(checkedText("2026-11-03")).toBe("3 november 2026");
  });
});
