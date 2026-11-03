import { describe, expect, it } from "vitest";
import { hoursText, shortPhase, typeIcon, weeksText } from "../src/components/ui";

describe("presentatiehulpjes", () => {
  it("schrijft uren leesbaar uit", () => {
    expect(hoursText(0.5)).toBe("een half uur");
    expect(hoursText(0.3)).toBe("18 minuten");
    expect(hoursText(1)).toBe("1 uur");
    expect(hoursText(18.5)).toBe("18,5 uur");
    expect(hoursText(0)).toBe("geen tijd");
  });
  it("rekent resterende uren om naar weken bij 7-15 uur per week", () => {
    expect(weeksText(0)).toBe("");
    expect(weeksText(5)).toBe("past in één speelweek");
    expect(weeksText(18)).toBe("1 tot 3 weken");
    expect(weeksText(192)).toBe("13 tot 27 weken");
  });
  it("kort fasetitels in tot het deel voor de dubbele punt", () => {
    expect(shortPhase("Startmotor: ritme, geld en snelle unlocks")).toBe("Startmotor");
    expect(shortPhase("Eerste bosses")).toBe("Eerste bosses");
  });
  it("kiest per staptype een teken en valt terug op het algemene", () => {
    expect(typeIcon("quest")).toBe("quest");
    expect(typeIcon("gear")).toBe("gear");
    expect(typeIcon("iets-nieuws")).toBe("misc");
  });
});
