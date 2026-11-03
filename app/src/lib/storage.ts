// Alle app-data staat in localStorage onder het prefix "rs3t:".
export const PREFIX = "rs3t:";

export const KEYS = {
  account: PREFIX + "account",
  manual: PREFIX + "manualChecks",
  snapshots: PREFIX + "snapshots",
  lastData: PREFIX + "lastData",
  tab: PREFIX + "tab",
} as const;

// Notities per stap: rs3t:note:<stap-id> = tekst (als JSON-string).
export const NOTE_PREFIX = PREFIX + "note:";
export const noteKey = (stepId: string) => NOTE_PREFIX + stepId;

export function loadNote(stepId: string): string {
  const v = load<unknown>(noteKey(stepId), "");
  return typeof v === "string" ? v : "";
}

/** Bewaart de notitie; een lege notitie verwijdert de sleutel. */
export function saveNote(stepId: string, text: string): void {
  if (text.trim() === "") {
    try {
      localStorage.removeItem(noteKey(stepId));
    } catch {
      /* opslag niet beschikbaar */
    }
  } else save(noteKey(stepId), text);
}

/** Notities uit een (geëxporteerd) data-object, per stap-id. */
export function notesFrom(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith(NOTE_PREFIX) && typeof v === "string" && v.trim() !== "") out[k.slice(NOTE_PREFIX.length)] = v;
  }
  return out;
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage schrijven mislukt", key, e);
  }
}

export interface ExportFile {
  app: "rs3-ironman-tracker";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
  /** Leesbaar overzicht: notities per stap-id (staan ook in data onder rs3t:note:<id>). */
  notes?: Record<string, string>;
}

export interface ImportResult {
  /** Aantal ingelezen sleutels. */
  total: number;
  /** Aantal notities daarvan. */
  notes: number;
}

export function exportAll(): ExportFile {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const raw = localStorage.getItem(k);
    if (raw === null) continue;
    try {
      data[k] = JSON.parse(raw);
    } catch {
      data[k] = raw;
    }
  }
  return { app: "rs3-ironman-tracker", version: 1, exportedAt: new Date().toISOString(), data, notes: notesFrom(data) };
}

/**
 * Vervangt alle rs3t:-sleutels door de inhoud van het bestand. Gooit bij een ongeldig bestand.
 * Notities uit het overzichtsveld `notes` vullen aan wat niet al in `data` stond (bijv. een met de hand gemaakt bestand).
 */
export function importAll(json: unknown): ImportResult {
  const f = json as Partial<ExportFile>;
  if (!f || f.app !== "rs3-ironman-tracker" || typeof f.data !== "object" || f.data === null) {
    throw new Error("Geen geldig export-bestand van deze app.");
  }
  const merged: Record<string, unknown> = { ...(f.data as Record<string, unknown>) };
  if (f.notes && typeof f.notes === "object") {
    for (const [id, text] of Object.entries(f.notes)) {
      if (typeof text === "string" && text.trim() !== "" && !(noteKey(id) in merged)) merged[noteKey(id)] = text;
    }
  }
  const entries = Object.entries(merged).filter(([k]) => k.startsWith(PREFIX));
  const existing: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) existing.push(k);
  }
  existing.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of entries) localStorage.setItem(k, JSON.stringify(v));
  return { total: entries.length, notes: Object.keys(notesFrom(Object.fromEntries(entries))).length };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
