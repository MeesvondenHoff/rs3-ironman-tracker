import data from "../data/quest-links.json";
import type { RouteStep } from "./route";

// Links naar de RS3-wiki (runescape.wiki, nooit OSRS) per quest. De data komt uit
// research/scripts/build_quest_links.py, dat het bestaan van elke Quick guide via de MediaWiki-API controleert.

export interface QuestLink {
  /** De questpagina op runescape.wiki. */
  wiki: string;
  /** De Quick guide-subpagina, alleen als die bestaat. */
  quickGuide?: string;
}

export interface QuestLinkData {
  /** Datum van de controle op de wiki (JJJJ-MM-DD). */
  checked: string;
  /** RuneMetrics-snapshot waaruit de questlijst komt. */
  source?: string;
  /** RuneMetrics-titel naar wikititel, waar die afwijken. */
  mapped?: Record<string, string>;
  quests: Record<string, QuestLink>;
}

export const QUEST_LINKS = data as QuestLinkData;
export const WIKI_BASE = "https://runescape.wiki/w/";

/**
 * Wiki-URL bij een paginatitel: spaties als underscores, speciale tekens URL-encoded; apostrofs, haakjes,
 * komma's, dubbele punten en schuine strepen blijven staan (zoals de wiki zelf linkt).
 */
export function wikiUrl(title: string): string {
  const path = encodeURIComponent(title.trim().replace(/ /g, "_"))
    .replace(/%2C/g, ",")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/");
  return WIKI_BASE + path;
}

/** Quick guide-URL bij een paginatitel (zonder te weten of die bestaat). */
export function quickGuideUrl(title: string): string {
  return wikiUrl(`${title.trim()}/Quick guide`);
}

/**
 * Links voor een quest (RuneMetrics-titel). Uit de gecontroleerde data als de quest erin staat;
 * anders alleen de wikipagina volgens het naampatroon, want een ongecontroleerde Quick guide kan ontbreken.
 */
export function questLink(title: string, d: QuestLinkData = QUEST_LINKS): QuestLink {
  return d.quests[title] ?? { wiki: wikiUrl(title) };
}

/** Quests van een stap (eerst `completeWhen`, dan `requires`), zonder dubbelen. */
export function stepQuests(step: Pick<RouteStep, "completeWhen" | "requires">): string[] {
  return [...new Set([...(step.completeWhen?.quests ?? []), ...(step.requires?.quests ?? [])])];
}
