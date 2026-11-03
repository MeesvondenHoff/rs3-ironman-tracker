import type { ReactNode } from "react";
import { questLink } from "../lib/questLinks";

// Kleine presentatiebouwstenen die op meerdere schermen terugkomen.

const STYLE_LABEL: Record<string, string> = { active: "actief", afk: "AFK", mixed: "actief en AFK" };
const TYPE_LABEL: Record<string, string> = {
  quest: "quest",
  skill: "skill trainen",
  unlock: "unlock",
  gear: "uitrusting",
  misc: "overig",
};

/** Speelstijl met een vorm per stijl (ruit = actief, open cirkel = AFK, half = gemengd), zodat kleur niet de enige drager is. */
export function StyleMark({ style }: { style: string }) {
  return (
    <span className={`style-mark s-${style}`}>
      <span className="glyph" aria-hidden="true" />
      {STYLE_LABEL[style] ?? style}
    </span>
  );
}

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

/** Icoonnaam voor een staptype (valt terug op het algemene teken). */
export function typeIcon(type: string): string {
  return type in TYPE_LABEL ? type : "misc";
}

const clampPct = (f: number) => Math.round(Math.min(1, Math.max(0, f)) * 1000) / 10;

/** Voortgangsbalk. `mark` (0-1) zet een tussenmarkering, bijvoorbeeld waar het volgende level ligt op weg naar een fasedoel. */
export function Bar({ fraction, label, className, mark }: { fraction: number; label?: string; className?: string; mark?: number }) {
  const pct = clampPct(fraction);
  return (
    <div className={`bar ${className ?? ""}`} role="img" aria-label={label ?? `${pct}%`}>
      <div className="fill" style={{ width: `${pct}%` }} />
      {mark !== undefined && mark > 0 && mark < 1 && <div className="bar-mark" style={{ left: `${clampPct(mark)}%` }} />}
    </div>
  );
}

/** Rustige lege cel in plaats van een streepje; schermlezers horen "geen". */
export function Nil({ label = "geen" }: { label?: string }) {
  return (
    <span className="nil">
      <span className="sr-only">{label}</span>
    </span>
  );
}

/*
  Kleine lijntekens (16 x 16, currentColor). Ze dragen nooit alleen de betekenis:
  er staat altijd tekst naast, dus ze zijn aria-hidden.
*/
const ICONS: Record<string, ReactNode> = {
  combat: <path d="M3 3l8 8M9 12.5l3.5-3.5M11.8 11.8l1.7 1.7M13 3l-8 8M7 12.5L3.5 9M4.2 11.8l-1.7 1.7" />,
  gather: <><path d="M2.5 6Q8 1 13.5 6" /><path d="M8 3.6V14" /></>,
  artisan: <><path d="M8.5 2.5l5 5-2.2 2.2-5-5z" /><path d="M8.2 7.8L2.5 13.5" /></>,
  support: <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.3l1.6 3.7L8 11.7 6.4 8z" /></>,
  goal: <path d="M4 14V2.5M4 3h8.5L10.3 5.6l2.2 2.6H4" />,
  quest: <><path d="M4.5 11V3.8c0-.7.5-1.3 1.2-1.3h7v9.2a1.8 1.8 0 0 1-3.6 0V11H2.5v.7c0 1 .8 1.8 1.8 1.8h6.6" /><path d="M7 5.5h3.5M7 8h3.5" /></>,
  skill: <path d="M4 9.5l4-4 4 4M4 13l4-4 4 4" />,
  unlock: <><circle cx="5.2" cy="8" r="2.6" /><path d="M7.8 8h6M12 8v2.6M10.2 8v2" /></>,
  gear: <path d="M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z" />,
  misc: <path d="M8 2.8l5.2 5.2L8 13.2 2.8 8z" />,
  hours: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2.2 1.4" /></>,
  auto: <><path d="M13 8a5 5 0 1 1-1.6-3.7" /><path d="M11.8 1.8v2.8H9" /></>,
  manual: <><path d="M3 3h10v10H3z" /><path d="M5.6 8.1l1.8 1.8 3-3.6" /></>,
  refresh: <><path d="M13 8a5 5 0 1 1-1.6-3.7" /><path d="M11.8 1.8v2.8H9" /></>,
  place: <><path d="M8 14.2s4.6-4.3 4.6-7.7a4.6 4.6 0 0 0-9.2 0c0 3.4 4.6 7.7 4.6 7.7z" /><circle cx="8" cy="6.5" r="1.7" /></>,
  note: <><path d="M3.5 2.5h6l3 3v8h-9z" /><path d="M9.5 2.5v3h3M5.6 8.6h4.8M5.6 11h3.2" /></>,
  boss: <path d="M2.5 13h11M3.2 13l-.7-7.5 3.2 2.7L8 3.5l2.3 4.7 3.2-2.7-.7 7.5" />,
  week: <><path d="M2.5 4h11v9.5h-11z" /><path d="M2.5 7h11M5.5 2.5v3M10.5 2.5v3" /></>,
  link: <><path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5" /><path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" /></>,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={`icon ${className ?? ""}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] ?? ICONS.misc}
    </svg>
  );
}

/** Het merkteken van de app: dezelfde gouden ironman-helm als de favicon. */
export function HelmMark() {
  return (
    <svg className="helm" viewBox="0 0 64 64" width="52" height="52" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#17202a" stroke="#d6ae5c" strokeWidth="3" />
      <path d="M32 10c-10.5 0-18 7.6-18 18v9c0 2 1 3.4 2.6 4.2L22 44h20l5.4-2.8C49 40.4 50 39 50 37v-9c0-10.4-7.5-18-18-18z" fill="#d6ae5c" />
      <path d="M20 30h24v5H20z" fill="#17202a" />
      <path d="M30 35h4v9h-4z" fill="#17202a" />
      <path d="M18 47h28v5H18z" fill="#9a7735" />
    </svg>
  );
}

/** Vaste locatieregel van een stap: plaatsteken plus plaatsnaam. Zonder locatie niets. */
export function LocationLine({ location, className }: { location?: string; className?: string }) {
  if (!location || !location.trim()) return null;
  return (
    <p className={`loc-line ${className ?? ""}`}>
      <Icon name="place" />
      <span><span className="sr-only">Locatie: </span>{location}</span>
    </p>
  );
}

/** Een meta-kenmerk van een stap: klein teken plus tekst. */
export function Badge({ icon, children, className }: { icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`badge ${className ?? ""}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

const nl1 = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

/** "1,5 uur", "een half uur", "45 minuten". */
export function hoursText(h: number): string {
  if (h <= 0) return "geen tijd";
  if (h === 0.5) return "een half uur";
  if (h < 1) return `${Math.round(h * 60)} minuten`;
  return `${nl1(Math.round(h * 10) / 10)} uur`;
}

/** Omrekening van resterende uren naar weken bij 7-15 uur speeltijd per week. */
export function weeksText(hours: number): string {
  if (hours <= 0) return "";
  const lo = Math.max(1, Math.round(hours / 15));
  const hi = Math.max(1, Math.round(hours / 7));
  if (hours <= 7) return "past in één speelweek";
  if (lo === hi) return `ongeveer ${lo} ${lo === 1 ? "week" : "weken"}`;
  return `${lo} tot ${hi} weken`;
}

/** Percentage gedane stappen, afgerond op hele procenten ("47%"). */
export function pctText(done: number, total: number): string {
  return `${total > 0 ? Math.round((done / total) * 100) : 0}%`;
}

/** Korte fasenaam: het deel voor de dubbele punt ("Startmotor: ritme, geld..." wordt "Startmotor"). */
export function shortPhase(title: string): string {
  const i = title.indexOf(":");
  return i > 0 ? title.slice(0, i) : title;
}

type Tone = "error" | "warn" | "info";

/** Melding met richting: wat er is, en wat je eraan doet. */
export function Notice({ tone, title, children, action }: { tone: Tone; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`notice n-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <p className="notice-title">{title}</p>
      {children && <div className="notice-body">{children}</div>}
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}

export function Check({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={met ? "check met" : "check"}>
      <span className="check-glyph" aria-hidden="true">{met ? "✓" : "○"}</span>
      <span>
        <span className="sr-only">{met ? "Gehaald: " : "Nog niet: "}</span>
        {children}
      </span>
    </li>
  );
}

/**
 * Kleine externe link naar de RS3-wiki voor een quest: de Quick guide als die bestaat, anders de questpagina.
 * `label` "kind" toont "Quick guide" of "Wiki" (Quests-tab); "title" toont de questnaam (route, perkamentkaart).
 */
export function QuestGuideLink({ title, label = "kind" }: { title: string; label?: "kind" | "title" }) {
  const l = questLink(title);
  const href = l.quickGuide ?? l.wiki;
  const kind = l.quickGuide ? "Quick guide" : "Wiki";
  const hint = l.quickGuide ? `Quick guide van ${title} op de RS3-wiki` : `${title} op de RS3-wiki (geen Quick guide)`;
  return (
    <a className={`quest-link${l.quickGuide ? "" : " ql-wiki"}`} href={href} target="_blank" rel="noopener" title={hint}>
      <Icon name="link" />
      {label === "kind" ? (
        <>{kind}<span className="sr-only"> van {title} (opent in een nieuw tabblad)</span></>
      ) : (
        <>{title}{!l.quickGuide && <span className="ql-kind"> (wiki)</span>}<span className="sr-only"> ({l.quickGuide ? "Quick guide, " : ""}opent in een nieuw tabblad)</span></>
      )}
    </a>
  );
}

/** Regel met per quest een link naar de Quick guide (of de wikipagina). Zonder quests niets. */
export function QuestGuides({ quests, className }: { quests: string[]; className?: string }) {
  if (quests.length === 0) return null;
  return (
    <p className={`quest-guides ${className ?? ""}`}>
      <span className="qg-label">{quests.length === 1 ? "Questgids:" : "Questgidsen:"}</span>{" "}
      {quests.map((q, i) => (
        <span key={q}>
          {i > 0 && ", "}
          <QuestGuideLink title={q} label="title" />
        </span>
      ))}
    </p>
  );
}
