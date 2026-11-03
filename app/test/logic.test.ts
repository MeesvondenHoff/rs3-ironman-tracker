import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { combatLevel, mergeSkills, parseHiscoreLite, parseProfile, type AccountData, type Quest } from "../src/lib/api";
import { Markdown } from "../src/lib/markdown";
import {
  loadRoute, makeContext, nextStep, phaseProgress, questsInRoute, stepState, validateRoute, type Route,
} from "../src/lib/route";
import { addSnapshot, baseFor7Days, diff, forAccount, MAX_SNAPSHOTS, toSnapshot, type Snapshot } from "../src/lib/snapshots";
import { levelForXp, maxLevel, progressFor, XP_TABLE } from "../src/lib/skills";

const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const hiscores = parseHiscoreLite(fx("hiscores.txt"));
const profile = parseProfile(JSON.parse(fx("profile.json")));
const quests: Quest[] = JSON.parse(fx("quests.json")).quests;
const example: Route = JSON.parse(fx("../../src/data/route.example.json"));

describe("XP-tabel", () => {
  it("kent bekende RS3-grenzen", () => {
    expect(XP_TABLE[2]).toBe(83);
    expect(XP_TABLE[92]).toBe(6_517_253);
    expect(XP_TABLE[99]).toBe(13_034_431);
    expect(XP_TABLE[120]).toBe(104_273_167);
  });
  it("berekent level en voortgang met de juiste cap", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(1_079_150)).toBe(73);
    expect(maxLevel("Slayer")).toBe(120);
    expect(maxLevel("Attack")).toBe(99);
    expect(progressFor("Attack", 20_000_000).maxed).toBe(true);
    expect(progressFor("Slayer", 20_000_000).maxed).toBe(false);
    const p = progressFor("Thieving", 1_079_150);
    expect(p.level).toBe(73);
    expect(p.xpToNext).toBe(XP_TABLE[74] - 1_079_150);
  });
});

describe("API-parsers", () => {
  it("leest de hiscores-lite (rank -1 wordt null)", () => {
    expect(hiscores.overall).toEqual({ rank: 192178, level: 511, xp: 1276114 });
    expect(hiscores.skills).toHaveLength(29);
    expect(hiscores.skills[0]).toEqual({ rank: null, level: 5, xp: 432 }); // Attack
    expect(hiscores.skills[17].level).toBe(73); // Thieving
  });
  it("weigert een HTML-foutpagina", () => {
    expect(() => parseHiscoreLite("<html>404</html>")).toThrow();
  });
  it("geeft een leesbare fout bij een privé-profiel", () => {
    expect(() => parseProfile({ error: "PROFILE_PRIVATE" })).toThrow(/privé/);
  });
  it("neemt per skill de bron met de meeste XP", () => {
    const merged = mergeSkills(hiscores.skills, profile);
    const thieving = merged.find((s) => s.name === "Thieving")!;
    expect(thieving.source).toBe("runemetrics");
    expect(thieving.level).toBe(74);
    expect(thieving.xp).toBe(1_116_426);
    expect(thieving.rank).toBe(51514); // rank blijft van de Ironman-hiscores
    expect(merged.find((s) => s.name === "Slayer")!.level).toBe(1);
    expect(combatLevel(merged)).toBeGreaterThan(0);
  });
});

function accountData(skillsOverride: Record<string, number> = {}): AccountData {
  const skills = mergeSkills(hiscores.skills, profile).map((s) =>
    skillsOverride[s.name] !== undefined ? { ...s, level: skillsOverride[s.name], xp: XP_TABLE[skillsOverride[s.name]] } : s,
  );
  return {
    account: "Ons Pap",
    fetchedAt: "2026-11-03T08:00:00.000Z",
    skills,
    overall: hiscores.overall,
    profile,
    quests,
    questPoints: quests.filter((q) => q.status === "COMPLETED").reduce((a, q) => a + q.questPoints, 0),
    errors: [],
  };
}

describe("Route-evaluatie", () => {
  const d = accountData();
  const ctx = makeContext(d.skills, d.quests, {});

  it("vinkt automatisch af op quest en skill, handmatig via localStorage-map", () => {
    const [p1, p2] = example.phases;
    expect(stepState(p1.steps[0], ctx).done).toBe(true); // Druidic Ritual is COMPLETED
    expect(stepState(p1.steps[1], ctx).done).toBe(false); // Agility 13 < 30
    expect(stepState(p1.steps[2], ctx)).toMatchObject({ auto: false, done: false });
    expect(stepState(p1.steps[2], makeContext(d.skills, d.quests, { "ex-p1-03": true })).done).toBe(true);
    // handmatig vinkje wint ook bij een automatische stap die de API nog niet als gehaald ziet
    expect(stepState(p1.steps[1], makeContext(d.skills, d.quests, { "ex-p1-02": true }))).toMatchObject({ auto: true, done: true });
    const blocked = stepState(p2.steps[2], ctx);
    expect(blocked.available).toBe(false);
    expect(blocked.missing.map((m) => m.label)).toEqual(["Attack 20 (nu 5)", "Quest: Waterfall Quest"]);
  });

  it("telt fasevoortgang en resterende uren", () => {
    expect(phaseProgress(example.phases[0], ctx)).toEqual({ done: 1, total: 3, remainingHours: 2.5 });
  });

  it("kiest als volgende stap de eerste open, beschikbare stap", () => {
    expect(nextStep(example, ctx)?.step.id).toBe("ex-p1-02");
    const allP1 = makeContext(accountData({ Agility: 30 }).skills, quests, { "ex-p1-03": true });
    expect(nextStep(example, allP1)?.step.id).toBe("ex-p2-01");
  });

  it("telt quest-voorwaarden als niet gehaald zonder questdata", () => {
    expect(stepState(example.phases[0].steps[0], makeContext(d.skills, null, {})).done).toBe(false);
  });

  it("valideert het contract (voorbeeldroute is schoon, fouten worden gemeld)", () => {
    expect(validateRoute(example, quests)).toEqual([]);
    const bad: Route = JSON.parse(JSON.stringify(example));
    bad.phases[0].steps[0].completeWhen = { skills: { Agilty: 5 }, quests: ["Bestaat Niet"] };
    bad.phases[0].steps[1].id = bad.phases[0].steps[0].id;
    const issues = validateRoute(bad, quests);
    expect(issues.some((i) => i.includes("onbekende skill 'Agilty'"))).toBe(true);
    expect(issues.some((i) => i.includes("onbekende quest 'Bestaat Niet'"))).toBe(true);
    expect(issues.some((i) => i.startsWith("dubbel id"))).toBe(true);
  });

  it("vindt de quests uit de route", () => {
    expect([...questsInRoute(example).keys()].sort()).toEqual(["Druidic Ritual", "Priest in Peril", "Waterfall Quest"]);
  });

  it("laadt route.json of valt terug op route.example.json", async () => {
    const r = await loadRoute();
    expect(["src/data/route.json", "src/data/route.example.json"]).toContain(r.file);
    if (r.file.endsWith("example.json")) expect(r.notice).toMatch(/route\.json/);
    expect(r.route.phases.length).toBeGreaterThan(0);
  });
});

describe("Snapshots", () => {
  const base = toSnapshot(accountData());
  const at = (iso: string, extra: Partial<Snapshot> = {}): Snapshot => ({ ...base, ts: iso, ...extra });

  it("slaat ongewijzigde snapshots over", () => {
    const { list } = addSnapshot([], base);
    expect(addSnapshot(list, at("2026-11-04T00:00:00Z")).added).toBe(false);
  });

  it("bewaart maximaal 200 en gooit de oudste weg", () => {
    let list: Snapshot[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++) {
      list = addSnapshot(list, at(new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString(), { qp: i })).list;
    }
    expect(list).toHaveLength(MAX_SNAPSHOTS);
    expect(list[0].qp).toBe(5);
  });

  it("rekent verschillen en de 7-dagenbasis uit", () => {
    const old = at("2026-10-20T00:00:00Z", { xp: { ...base.xp, Thieving: 1_000_000 }, qp: 40 });
    const mid = at("2026-10-27T12:00:00Z", { xp: { ...base.xp, Thieving: 1_050_000 }, qp: 42 });
    const now = at("2026-11-03T12:00:00Z");
    const mine = forAccount([now, old, mid], "ons pap");
    expect(mine.map((s) => s.ts)).toEqual([old.ts, mid.ts, now.ts]);
    const b = baseFor7Days(mine, Date.parse("2026-11-03T12:00:00Z"))!;
    expect(b.full).toBe(true);
    expect(b.base.ts).toBe(mid.ts);
    const dd = diff(b.base, now);
    expect(dd.perSkill.find((p) => p.skill === "Thieving")!.xp).toBe(base.xp.Thieving - 1_050_000);
    expect(dd.qp).toBe((base.qp ?? 0) - 42);
    expect(baseFor7Days([mid, now], Date.parse("2026-11-01T00:00:00Z"))!.full).toBe(false);
  });
});

describe("Markdown", () => {
  it("rendert vet, links, lijsten en blokkeert javascript-links", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, { text: "Doe **dit** en [wiki](https://runescape.wiki).\n\n- een\n- twee\n\n[x](javascript:alert(1))" }),
    );
    expect(html).toContain("<strong>dit</strong>");
    expect(html).toContain('href="https://runescape.wiki"');
    expect(html).toContain("<ul><li>een</li><li>twee</li></ul>");
    expect(html).not.toContain("javascript:");
  });
});
