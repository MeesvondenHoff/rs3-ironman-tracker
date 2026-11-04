import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountCombat, BUNDLED_QUESTS, combatLevel, fallbackNotice, fetchAccount, normalizeAccountData, questPointsOf,
  type AccountData, type Quest, type QuestSnapshot,
} from "../src/lib/api";
import { toSnapshot } from "../src/lib/snapshots";

// Na 10 november 2026 stopt RuneMetrics. Deze tests bootsen dat na met een nep-fetch:
// de hiscores blijven werken, RuneMetrics stuurt door (302), geeft 404 of HTML in plaats van JSON.

const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const HISCORES = fx("hiscores.txt");
const PROFILE = fx("profile.json");
const QUESTS = fx("quests.json");
const fixtureQuests: Quest[] = JSON.parse(QUESTS).quests;

type Mode = "ok" | "redirect" | "404" | "html" | "network";

function respond(mode: Mode, body: string): Response {
  switch (mode) {
    case "ok": return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    case "redirect": return new Response(null, { status: 302, headers: { location: "https://www.runescape.com/unavailable" } });
    case "404": return new Response("Not Found", { status: 404 });
    case "html": return new Response("<!doctype html><title>Unavailable</title>", { status: 200, headers: { "content-type": "text/html" } });
    case "network": throw new TypeError("Failed to fetch");
  }
}

function mockApi(opts: { hiscores?: "ok" | "404"; profile?: Mode; quests?: Mode }) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/hiscore/")) return opts.hiscores === "404" ? new Response("", { status: 404 }) : new Response(HISCORES, { status: 200 });
    if (url.startsWith("/api/runemetrics/profile/")) return respond(opts.profile ?? "ok", PROFILE);
    if (url.startsWith("/api/runemetrics/quests")) return respond(opts.quests ?? "ok", QUESTS);
    throw new Error(`onverwachte url ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const STOPPED = { profile: "redirect", quests: "redirect" } as const;
const AFTER_STOP = new Date("2026-11-12T19:00:00Z");
const BEFORE_STOP = new Date("2026-11-05T19:00:00Z");

/** Data zoals die op 8 november live is opgeslagen in rs3t:lastData. */
async function savedLive(): Promise<AccountData> {
  mockApi({});
  const d = await fetchAccount("Ons Pap");
  vi.unstubAllGlobals();
  return { ...d, fetchedAt: "2026-11-08T20:00:00.000Z", profileSource: { kind: "live", at: "2026-11-08T20:00:00.000Z" }, questsSource: { kind: "live", at: "2026-11-08T20:00:00.000Z" } };
}

const OLD_BUNDLE: QuestSnapshot = { account: "Ons Pap", fetchedAt: "2026-11-01", quests: fixtureQuests.slice(0, 5) };

describe("fallback: zolang RuneMetrics werkt verandert er niets", () => {
  it("alles live, geen melding", async () => {
    mockApi({});
    const d = await fetchAccount("Ons Pap");
    expect(d.profileSource.kind).toBe("live");
    expect(d.questsSource?.kind).toBe("live");
    expect(d.errors).toEqual([]);
    expect(d.sourceErrors).toEqual([]);
    expect(d.questPoints).toBe(questPointsOf(fixtureQuests));
    expect(accountCombat(d)).toBe(d.profile!.combatlevel);
    expect(fallbackNotice(d, AFTER_STOP)).toBeNull();
  });

  it("vraagt RuneMetrics zonder redirects te volgen", async () => {
    const fn = mockApi({});
    await fetchAccount("Ons Pap");
    const rm = fn.mock.calls.filter(([u]) => String(u).startsWith("/api/runemetrics"));
    expect(rm).toHaveLength(2);
    for (const call of rm) expect((call as unknown[])[1]).toMatchObject({ redirect: "manual" });
  });
});

describe("fallback: quests", () => {
  it("valt terug op de quests uit rs3t:lastData (cached), met de oorspronkelijke datum", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: prev, bundled: OLD_BUNDLE });
    expect(d.quests).toEqual(prev.quests);
    expect(d.questsSource).toEqual({ kind: "cached", at: "2026-11-08T20:00:00.000Z" });
    expect(d.errors).toEqual([]);
    expect(d.sourceErrors).toHaveLength(2);
    expect(d.sourceErrors.join(" ")).toMatch(/doorgestuurd/);
  });

  it("valt zonder opslag terug op de meegeleverde lijst (bundled)", async () => {
    mockApi({ profile: "404", quests: "404" });
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.quests).toBe(BUNDLED_QUESTS.quests);
    expect(d.quests!.length).toBeGreaterThan(300);
    expect(d.questsSource).toEqual({ kind: "bundled", at: BUNDLED_QUESTS.fetchedAt });
    expect(d.errors).toEqual([]);
  });

  it("vangt ook HTML in plaats van JSON en een netwerkfout op", async () => {
    mockApi({ profile: "html", quests: "network" });
    const d = await fetchAccount("Ons Pap", { previous: null, bundled: OLD_BUNDLE });
    expect(d.questsSource?.kind).toBe("bundled");
    expect(d.sourceErrors.join(" ")).toMatch(/geen JSON/);
    expect(d.errors).toEqual([]);
  });

  it("neemt de meegeleverde lijst als die nieuwer is dan de opslag", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const newer: QuestSnapshot = { account: "Ons Pap", fetchedAt: "2026-12-01", quests: fixtureQuests.slice(0, 3) };
    const d = await fetchAccount("Ons Pap", { previous: prev, bundled: newer });
    expect(d.questsSource).toEqual({ kind: "bundled", at: "2026-12-01" });
    expect(d.quests).toHaveLength(3);
  });

  it("gebruikt geen opslag of meegeleverde lijst van een ander account", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const d = await fetchAccount("Iemand Anders", { previous: prev });
    expect(d.quests).toBeNull();
    expect(d.questsSource).toBeNull();
    expect(d.questPoints).toBeNull();
    expect(fallbackNotice(d, AFTER_STOP)?.body[0]).toMatch(/geen questlijst/);
  });

  it("rekent QP uit de fallback-lijst, ook in de snapshot", async () => {
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: null, bundled: OLD_BUNDLE });
    const expected = OLD_BUNDLE.quests.filter((q) => q.status === "COMPLETED").reduce((a, q) => a + q.questPoints, 0);
    expect(d.questPoints).toBe(expected);
    expect(toSnapshot(d).qp).toBe(expected);
  });

  it("houdt bij herhaald terugvallen de datum van de laatste live stand vast", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const once = await fetchAccount("Ons Pap", { previous: prev, bundled: OLD_BUNDLE });
    const twice = await fetchAccount("Ons Pap", { previous: once, bundled: OLD_BUNDLE });
    expect(twice.questsSource).toEqual({ kind: "cached", at: "2026-11-08T20:00:00.000Z" });
    expect(twice.profileSource).toEqual({ kind: "cached", at: "2026-11-08T20:00:00.000Z" });
  });
});

describe("fallback: profiel", () => {
  it("profiel weg, hiscores oké: geen fout, combat berekend uit de hiscores", async () => {
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: null });
    expect(d.errors).toEqual([]);
    expect(d.profile).toBeNull();
    expect(d.profileSource.kind).toBe("computed");
    expect(d.skills.every((s) => s.source === "hiscore")).toBe(true);
    expect(accountCombat(d)).toBe(combatLevel(d.skills));
    expect(accountCombat(d)).toBeGreaterThan(3);
  });

  it("gebruikt het laatst bekende profiel voor activiteiten, en als ondergrens voor de XP", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: prev });
    expect(d.profileSource).toEqual({ kind: "cached", at: "2026-11-08T20:00:00.000Z" });
    expect(d.profile?.activities.length).toBeGreaterThan(0);
    // XP daalt nooit: geen enkele skill zakt onder de laatst bekende stand, dus geen negatieve XP-winst.
    for (const s of d.skills) expect(s.xp).toBeGreaterThanOrEqual(prev.skills.find((x) => x.name === s.name)!.xp);
    expect(toSnapshot(d).totalXp).toBe(toSnapshot(prev).totalXp);
    expect(accountCombat(d)).toBe(Math.max(prev.profile!.combatlevel, combatLevel(d.skills)));
  });

  it("hiscores die de opgeslagen stand inhalen, winnen", async () => {
    const prev = await savedLive();
    const low = { ...prev.profile!, skillvalues: prev.profile!.skillvalues.map((s) => ({ ...s, xp: 0 })) };
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: { ...prev, profile: low } });
    expect(d.skills.every((s) => s.source === "hiscore")).toBe(true);
  });

  it("gooit alleen als ook de hiscores falen", async () => {
    mockApi({ hiscores: "404", ...STOPPED });
    await expect(fetchAccount("Ons Pap", { previous: null })).rejects.toThrow(/niet gevonden/);
  });
});

describe("fallback: melding", () => {
  it("na 10 november: één rustige melding met de stand en de Route-tab", async () => {
    const prev = await savedLive();
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: prev, bundled: OLD_BUNDLE });
    const n = fallbackNotice(d, AFTER_STOP)!;
    expect(n.title).toBe("RuneMetrics is gestopt (10 november 2026)");
    expect(n.body[0]).toBe("Queststatus van 8 november 2026 uit de laatste opslag; skills en XP komen live van de hiscores.");
    expect(n.body).toContain("Vink nieuwe quests zelf af in de Route-tab.");
    expect(n.raw).toEqual([]);
  });

  it("met de meegeleverde lijst noemt de melding die bron", async () => {
    mockApi(STOPPED);
    const d = await fetchAccount("Ons Pap", { previous: null, bundled: OLD_BUNDLE });
    expect(fallbackNotice(d, AFTER_STOP)!.body[0]).toBe("Queststatus van 1 november 2026 uit de meegeleverde lijst; skills en XP komen live van de hiscores.");
  });

  it("voor 10 november: storing, met de ruwe melding erbij", async () => {
    mockApi({ profile: "ok", quests: "404" });
    const d = await fetchAccount("Ons Pap", { previous: null, bundled: OLD_BUNDLE });
    const n = fallbackNotice(d, BEFORE_STOP)!;
    expect(n.title).toBe("RuneMetrics gaf nu geen antwoord");
    expect(n.raw).toEqual(["RuneMetrics-quests: HTTP 404"]);
  });

  it("vult oude opgeslagen data (zonder bronvelden) aan als live", () => {
    const legacy = { account: "Ons Pap", fetchedAt: "2026-11-03T08:00:00.000Z", skills: [], overall: null, profile: null, quests: fixtureQuests, questPoints: 1, errors: [] };
    const d = normalizeAccountData(legacy as unknown as AccountData);
    expect(d.questsSource).toEqual({ kind: "live", at: "2026-11-03T08:00:00.000Z" });
    expect(d.profileSource.kind).toBe("computed");
    expect(d.sourceErrors).toEqual([]);
  });
});
