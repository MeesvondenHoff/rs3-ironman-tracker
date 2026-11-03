import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QUEST_LINKS, questLink, quickGuideUrl, stepQuests, wikiUrl, type QuestLinkData } from "../src/lib/questLinks";
import { QuestGuideLink, QuestGuides } from "../src/components/ui";
import type { Route } from "../src/lib/route";

const W = "https://runescape.wiki/w/";

describe("wiki-URL's per quest", () => {
  it("zet spaties om in underscores", () => {
    expect(wikiUrl("Demon Slayer")).toBe(W + "Demon_Slayer");
    expect(quickGuideUrl("Demon Slayer")).toBe(W + "Demon_Slayer/Quick_guide");
  });
  it("laat apostrofs, haakjes, komma's en dubbele punten staan", () => {
    expect(wikiUrl("Cook's Assistant")).toBe(W + "Cook's_Assistant");
    expect(wikiUrl("Missing, Presumed Death")).toBe(W + "Missing,_Presumed_Death");
    expect(wikiUrl("Dimension of Disaster: Demon Slayer")).toBe(W + "Dimension_of_Disaster:_Demon_Slayer");
  });
  it("houdt het (miniquest)-achtervoegsel in de URL", () => {
    expect(wikiUrl("Sheep Shearer (miniquest)")).toBe(W + "Sheep_Shearer_(miniquest)");
    expect(quickGuideUrl("Sheep Shearer (miniquest)")).toBe(W + "Sheep_Shearer_(miniquest)/Quick_guide");
  });
  it("encodeert overige speciale tekens", () => {
    expect(wikiUrl("A & B?")).toBe(W + "A_%26_B%3F");
    expect(wikiUrl("Necromancy!")).toBe(W + "Necromancy!");
  });
  it("bouwt dezelfde URL als het script voor elke quest die niet gemapt of omgeleid is", () => {
    let same = 0;
    for (const [title, l] of Object.entries(QUEST_LINKS.quests)) {
      if (l.wiki !== wikiUrl(title)) continue; // gemapt of via een wiki-redirect: andere paginatitel
      same++;
      if (l.quickGuide) expect(l.quickGuide).toBe(quickGuideUrl(title));
    }
    expect(same).toBeGreaterThan(Object.keys(QUEST_LINKS.quests).length - 20);
  });
});

describe("questLink", () => {
  const d: QuestLinkData = {
    checked: "2026-11-03",
    quests: {
      "Cook's Assistant": { wiki: W + "Cook's_Assistant", quickGuide: W + "Cook's_Assistant/Quick_guide" },
      "Unstable Foundations": { wiki: W + "Unstable_Foundations" },
    },
  };
  it("geeft de Quick guide als die bestaat", () => {
    expect(questLink("Cook's Assistant", d)).toEqual({ wiki: W + "Cook's_Assistant", quickGuide: W + "Cook's_Assistant/Quick_guide" });
  });
  it("geeft zonder Quick guide alleen de wikipagina", () => {
    expect(questLink("Unstable Foundations", d)).toEqual({ wiki: W + "Unstable_Foundations" });
  });
  it("valt voor een onbekende quest terug op het naampatroon, zonder Quick guide", () => {
    expect(questLink("Nieuwe Quest (miniquest)", d)).toEqual({ wiki: W + "Nieuwe_Quest_(miniquest)" });
  });
});

describe("quest-links.json", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../../research/snapshots/2026-11-03 runemetrics quests.json", import.meta.url), "utf8")) as {
    quests: { title: string }[];
  };
  it("heeft een controledatum en elke RuneMetrics-quest", () => {
    expect(QUEST_LINKS.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const q of snapshot.quests) expect(QUEST_LINKS.quests[q.title], q.title).toBeDefined();
  });
  it("linkt alleen naar runescape.wiki, nooit naar de OSRS-wiki", () => {
    for (const l of Object.values(QUEST_LINKS.quests)) {
      expect(l.wiki.startsWith(W)).toBe(true);
      if (l.quickGuide) expect(l.quickGuide).toMatch(/^https:\/\/runescape\.wiki\/w\/.+\/Quick_guide$/);
    }
  });
  it("kent quests met en zonder Quick guide en de gemapte titels", () => {
    expect(questLink("Unstable Foundations").quickGuide).toBeUndefined();
    expect(questLink("Cook's Assistant").quickGuide).toBe(W + "Cook's_Assistant/Quick_guide");
    expect(questLink("Tears of Guthix").wiki).toBe(W + "Tears_of_Guthix_(quest)");
  });
  it("dekt alle quests uit de route", () => {
    const route = JSON.parse(readFileSync(new URL("../src/data/route.json", import.meta.url), "utf8")) as Route;
    for (const p of route.phases) for (const s of p.steps) for (const q of stepQuests(s)) expect(QUEST_LINKS.quests[q], q).toBeDefined();
  });
});

describe("stepQuests", () => {
  it("neemt completeWhen en requires samen, zonder dubbelen", () => {
    expect(stepQuests({ completeWhen: { quests: ["A", "B"] }, requires: { quests: ["B", "C"] } })).toEqual(["A", "B", "C"]);
    expect(stepQuests({})).toEqual([]);
  });
});

describe("questlinks in de interface", () => {
  it("toont Quick guide of Wiki en opent in een nieuw tabblad", () => {
    const qg = renderToStaticMarkup(createElement(QuestGuideLink, { title: "Cook's Assistant" }));
    expect(qg).toContain("Quick guide");
    expect(qg).toContain('target="_blank"');
    expect(qg).toContain('rel="noopener"');
    expect(qg).toContain("Cook&#x27;s_Assistant/Quick_guide");
    const wiki = renderToStaticMarkup(createElement(QuestGuideLink, { title: "Unstable Foundations" }));
    expect(wiki).toContain(">Wiki<");
    expect(wiki).toContain('href="https://runescape.wiki/w/Unstable_Foundations"');
  });
  it("toont per quest een link en niets zonder quests", () => {
    const html = renderToStaticMarkup(createElement(QuestGuides, { quests: ["Druidic Ritual", "Unstable Foundations"] }));
    expect(html).toContain("Questgidsen:");
    expect(html).toContain("Druidic_Ritual/Quick_guide");
    expect(html).toContain("(wiki)");
    expect(renderToStaticMarkup(createElement(QuestGuides, { quests: [] }))).toBe("");
  });
});
