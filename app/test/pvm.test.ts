import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { QuestStatus } from "../src/lib/api";
import { BOSSES, validateBosses, validateReady, type Boss } from "../src/lib/bosses";
import {
  bossReadiness, closestBoss, firstRouteStep, loadPvmChecks, pvmKey, savePvmChecks, sortBosses, togglePvmCheck,
} from "../src/lib/pvm";
import type { EvalContext, LoadedRoute, Route } from "../src/lib/route";
import { exportAll, importAll, KEYS } from "../src/lib/storage";
import PvmView from "../src/components/PvmView";

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

const real: Route = JSON.parse(readFileSync(new URL("../src/data/route.json", import.meta.url), "utf8"));
const example: Route = JSON.parse(readFileSync(new URL("../src/data/route.example.json", import.meta.url), "utf8"));

function ctxOf(levels: Record<string, number>, quests: Record<string, QuestStatus> | null): EvalContext {
  return {
    levels: new Map(Object.entries(levels)),
    questStatus: quests ? new Map(Object.entries(quests)) : null,
    manual: {},
  };
}

const base: Boss = {
  boss: "test",
  name: "Testboss",
  stepIds: [],
  checked: "2026-11-04",
  summary: "s",
  requirements: ["r"],
  ironmanGear: [{ slot: "Wapens", item: "w", how: "h" }],
  mechanics: ["m"],
  drops: { progress: [], useful: [{ item: "x" }], rest: [] },
  sources: [{ title: "t", url: "https://runescape.wiki/w/T" }],
  ready: {
    skills: { Defence: 70, Necromancy: 80 },
    quests: ["Troll Stronghold", "Priest in Peril"],
    unlocks: [
      { id: "curses", label: "Ancient Curses", how: "The Temple at Senntisten, Prayer 50" },
      { id: "devotion", label: "Devotion", how: "One Piercing Note", auto: { quests: ["One Piercing Note"] } },
      { id: "deflect", label: "Deflect Melee", auto: { quests: ["The Temple at Senntisten"], skills: { Prayer: 71 } } },
    ],
    gear: [{ id: "t70", label: "T70-wapens", how: "Kili's Knowledge V" }],
  },
};

describe("PvM-gereedheid", () => {
  const ctx = ctxOf(
    { Defence: 43, Necromancy: 80, Prayer: 45 },
    { "Troll Stronghold": "STARTED", "Priest in Peril": "COMPLETED", "One Piercing Note": "COMPLETED", "The Temple at Senntisten": "COMPLETED" },
  );

  it("mengt automatische en handmatige eisen in score en ontbrekende items", () => {
    const r = bossReadiness(base, ctx, { [pvmKey("test", "t70")]: true });
    expect(r.total).toBe(8);
    expect(r.done).toBe(4); // Necromancy, Priest in Peril, Devotion en het T70-vinkje
    expect(r.unknown).toBe(0);
    const skills = r.groups.find((g) => g.key === "skills")!.checks;
    expect(skills.map((c) => [c.label, c.met, c.auto])).toEqual([["Defence 70 (nu 43)", false, true], ["Necromancy 80 (nu 80)", true, true]]);
    const quests = r.groups.find((g) => g.key === "quests")!.checks;
    expect(quests.map((c) => c.label)).toEqual(["Troll Stronghold (gestart)", "Priest in Peril"]);
    const deflect = r.groups.find((g) => g.key === "unlocks")!.checks.find((c) => c.id === "deflect")!;
    expect(deflect).toMatchObject({ auto: true, met: false, source: "hiscores en questlijst", detail: "nog nodig: Prayer 71 (nu 45)" });
    // automatische items eerst, daarna de handmatige
    expect(r.missing.map((c) => c.id)).toEqual(["skill:Defence", "quest:Troll Stronghold", "deflect", "curses"]);
    expect(r.missing.find((c) => c.id === "curses")).toMatchObject({ auto: false, key: "test:curses" });
  });

  it("telt 3 van 8 zonder handmatige vinkjes en zonder accountdata alles open", () => {
    expect(bossReadiness(base, ctx, {}).done).toBe(3);
    const empty = bossReadiness(base, ctxOf({}, {}), {});
    expect(empty.done).toBe(0);
    expect(empty.groups[0].checks[0].label).toBe("Defence 70");
  });

  it("telt quests niet mee als de questlijst ontbreekt", () => {
    const r = bossReadiness(base, ctxOf({ Defence: 70, Necromancy: 80, Prayer: 71 }, null), { "test:curses": true, "test:t70": true });
    // quests (2) en de twee unlocks met een quest-eis zijn niet te controleren
    expect(r.unknown).toBe(4);
    expect(r.total).toBe(4);
    expect(r.done).toBe(4);
    expect(r.missing).toEqual([]);
    const quests = r.groups.find((g) => g.key === "quests")!.checks;
    expect(quests.every((c) => c.unknown && !c.met)).toBe(true);
  });

  it("werkt zonder ready-blok", () => {
    const { ready: _ready, ...noReady } = base;
    expect(bossReadiness(noReady, ctx, {})).toMatchObject({ done: 0, total: 0, missing: [] });
  });
});

describe("Volgorde en dichtstbij", () => {
  it("sorteert op routevolgorde, bosses zonder stap daarna in json-volgorde", () => {
    const order = sortBosses(BOSSES, real).map((b) => b.boss);
    expect(order.slice(0, 3)).toEqual(["ivar", "kril", "vindicta"]);
    expect(order.slice(3)).toEqual(BOSSES.filter((b) => b.stepIds.length === 0).map((b) => b.boss));
    expect(order).toContain("araxxor");
    // zonder route of met een route zonder deze stappen blijft de json-volgorde staan
    expect(sortBosses(BOSSES, null).map((b) => b.boss)).toEqual(BOSSES.map((b) => b.boss));
    expect(sortBosses(BOSSES, example).map((b) => b.boss)).toEqual(BOSSES.map((b) => b.boss));
  });

  it("sorteert een omgekeerde lijst terug", () => {
    const rev = [...BOSSES].reverse();
    expect(sortBosses(rev, real).slice(0, 3).map((b) => b.boss)).toEqual(["ivar", "kril", "vindicta"]);
  });

  it("vindt de eerste routestap en de boss die het dichtst bij klaar is", () => {
    const kril = BOSSES.find((b) => b.boss === "kril")!;
    const arax = BOSSES.find((b) => b.boss === "araxxor")!;
    expect(firstRouteStep(kril, real)).toBe("p6-04");
    expect(firstRouteStep(arax, real)).toBeNull();
    expect(firstRouteStep(kril, example)).toBeNull();

    const ctx = ctxOf({ Constitution: 70, Agility: 60, Necromancy: 75, Defence: 75, Prayer: 43 }, { "Troll Stronghold": "COMPLETED" });
    const list = sortBosses(BOSSES, real).map((b) => bossReadiness(b, ctx, {}));
    // Ivar mist 4 eisen (quest en drie gear-vinkjes), K'ril 5: de minste open eisen wint
    expect(closestBoss(list)?.boss.boss).toBe("ivar");
    const ivarDone = Object.fromEntries(BOSSES.find((b) => b.boss === "ivar")!.ready!.gear.map((i) => [pvmKey("ivar", i.id), true]));
    const listK = sortBosses(BOSSES, real).map((b) => bossReadiness(b, { ...ctx, questStatus: new Map([["Troll Stronghold", "COMPLETED"], ["Visions of Havenhythe", "COMPLETED"]]) }, ivarDone));
    expect(closestBoss(listK)?.boss.boss).toBe("kril");
    // een verre boss met weinig eisen wint niet op één gehaalde quest
    const fresh = sortBosses(BOSSES, real).map((b) => bossReadiness(b, ctxOf({ Necromancy: 37 }, { "Priest in Peril": "COMPLETED" }), {}));
    expect(closestBoss(fresh)?.boss.boss).toBe("ivar");
    // helemaal klaar telt niet als "dichtstbij"
    const krilDone = Object.fromEntries((kril.ready!.unlocks.concat(kril.ready!.gear)).map((i) => [pvmKey("kril", i.id), true]));
    const list2 = sortBosses(BOSSES, real).map((b) => bossReadiness(b, ctx, krilDone));
    expect(list2.find((r) => r.boss.boss === "kril")).toMatchObject({ done: 11, total: 11 });
    expect(closestBoss(list2)?.boss.boss).not.toBe("kril");
  });
});

describe("Validatie van ready", () => {
  it("de echte bossdata is geldig en elke boss heeft een checklist", () => {
    expect(validateBosses(BOSSES, real)).toEqual([]);
    for (const b of BOSSES) {
      expect(b.ready, b.boss).toBeDefined();
      const r = bossReadiness(b, ctxOf({}, {}), {});
      expect(r.total).toBeGreaterThan(0);
    }
    for (const name of ["araxxor", "helwyr", "twin-furies", "gregorovic"]) expect(BOSSES.some((b) => b.boss === name)).toBe(true);
  });

  it("meldt een onbekende skill, een ongeldig level en dubbele id's", () => {
    const bad: Boss = {
      ...base,
      ready: {
        skills: { Defense: 70, Necromancy: 130 },
        quests: ["Priest in Peril", "Priest in Peril"],
        unlocks: [{ id: "x", label: "X" }, { id: "y", label: "Y", auto: { skills: { Slayr: 10 } } }],
        gear: [{ id: "x", label: "dubbel" }],
      },
    };
    const issues = validateReady(bad);
    expect(issues.some((i) => i.includes("onbekende skill 'Defense'"))).toBe(true);
    expect(issues.some((i) => i.includes("ongeldig level 130"))).toBe(true);
    expect(issues.some((i) => i.includes("dubbele id 'x'"))).toBe(true);
    expect(issues.some((i) => i.includes("dubbele quest 'Priest in Peril'"))).toBe(true);
    expect(issues.some((i) => i.includes("'y': onbekende skill 'Slayr'"))).toBe(true);
    // validateBosses neemt de ready-controle mee
    expect(validateBosses([bad], real).length).toBe(issues.length);
  });

  it("lege stepIds mag; de stepId-controle geldt alleen voor gevulde lijsten", () => {
    expect(validateBosses([{ ...base, stepIds: [] }], real)).toEqual([]);
    expect(validateBosses([{ ...base, stepIds: ["bestaat-niet"] }], real)).toEqual(["bosses.json: 'test' wijst naar onbekende stap 'bestaat-niet'"]);
  });
});

describe("Vinkjes in de opslag", () => {
  beforeEach(() => localStorage.clear());

  it("bewaart onder rs3t:pvm en schakelt per sleutel", () => {
    expect(KEYS.pvm).toBe("rs3t:pvm");
    let m = togglePvmCheck({}, "kril:t70-weapons");
    m = togglePvmCheck(m, "kril:food");
    m = togglePvmCheck(m, "kril:food");
    expect(m).toEqual({ "kril:t70-weapons": true });
    savePvmChecks({ ...m, "kril:oud": false });
    expect(JSON.parse(localStorage.getItem("rs3t:pvm")!)).toEqual({ "kril:t70-weapons": true });
    expect(loadPvmChecks()).toEqual({ "kril:t70-weapons": true });
  });

  it("negeert rommel in de opslag", () => {
    localStorage.setItem("rs3t:pvm", JSON.stringify(["geen map"]));
    expect(loadPvmChecks()).toEqual({});
    localStorage.setItem("rs3t:pvm", JSON.stringify({ "a:b": true, "a:c": "ja" }));
    expect(loadPvmChecks()).toEqual({ "a:b": true });
  });

  it("gaat mee in export en import", () => {
    savePvmChecks({ "vindicta:super-attack": true, "araxxor:antipoison": true });
    const file = JSON.parse(JSON.stringify(exportAll()));
    expect(file.data["rs3t:pvm"]).toEqual({ "vindicta:super-attack": true, "araxxor:antipoison": true });
    localStorage.clear();
    savePvmChecks({ "kril:food": true });
    importAll(file);
    expect(loadPvmChecks()).toEqual({ "vindicta:super-attack": true, "araxxor:antipoison": true });
  });
});

describe("PvM-tab", () => {
  const loaded: LoadedRoute = { route: real, file: "src/data/route.json", notice: null };
  const noop = () => {};

  it("toont score, bronnen, vinkjes en de knop naar de route", () => {
    const ctx = ctxOf({ Constitution: 70, Agility: 60, Necromancy: 75, Defence: 43, Prayer: 43 }, { "Troll Stronghold": "COMPLETED" });
    const checks = { "kril:food": true, "kril:t70-weapons": true, "kril:t70-armour": true, "kril:spiritbound-hammer": true };
    const html = renderToStaticMarkup(createElement(PvmView, { route: loaded, ctx, hasData: true, checks, toggle: noop, openStep: noop }));
    expect(html).toContain("PvM-klaar");
    expect(html).toContain("Het dichtstbij: <strong>K&#x27;ril Tsutsaroth</strong>, 9 van 11 klaar.");
    expect(html).toContain("Defence 75 (nu 43)");
    expect(html).toContain("uit de hiscores");
    expect(html).toContain("uit de questlijst");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Naar de route");
    expect(html).toContain("Bosskaart: Araxxor");
    expect(html).not.toMatch(/·|→|←/); // geen middle dots of pijlen
  });

  it("meldt dat quests niet gecontroleerd konden worden", () => {
    const ctx = ctxOf({ Necromancy: 50 }, null);
    const html = renderToStaticMarkup(createElement(PvmView, { route: loaded, ctx, hasData: true, checks: {}, toggle: noop, openStep: noop }));
    expect(html).toContain("Quests konden niet gecontroleerd worden");
    expect(html).toContain("niet gecontroleerd: de questlijst ontbreekt");
  });
});
