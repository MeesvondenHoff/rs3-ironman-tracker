import { useMemo } from "react";
import { BOSSES } from "../lib/bosses";
import {
  bossReadiness, closestBoss, firstRouteStep, sortBosses, type BossReadiness, type PvmCheck, type PvmGroup, type PvmGroupKey,
} from "../lib/pvm";
import type { EvalContext, LoadedRoute } from "../lib/route";
import { BossCard } from "./BossCard";
import { Bar, Icon, LocationLine, Notice } from "./ui";

interface Props {
  route: LoadedRoute | null;
  ctx: EvalContext;
  hasData: boolean;
  /** Handmatige vinkjes, sleutel "<boss>:<id>". */
  checks: Record<string, boolean>;
  toggle: (key: string) => void;
  openStep: (id: string, opts?: { boss?: boolean }) => void;
}

const GROUP_ICON: Record<PvmGroupKey, string> = { skills: "skill", quests: "quest", unlocks: "unlock", gear: "gear" };

/** "Defence 70 (nu 43), Quest: ..." voor de korte regel "Nog nodig". */
function missingText(r: BossReadiness, max = 4): string {
  const labels = r.missing.map((c) => c.label);
  if (labels.length <= max) return labels.join(", ");
  return `${labels.slice(0, max).join(", ")} en nog ${labels.length - max}`;
}

export default function PvmView({ route, ctx, hasData, checks, toggle, openStep }: Props) {
  const list = useMemo(() => {
    const bosses = sortBosses(BOSSES.filter((b) => b.ready), route?.route ?? null);
    return bosses.map((b) => bossReadiness(b, ctx, checks));
  }, [route, ctx, checks]);
  const closest = closestBoss(list);
  const questsUnknown = ctx.questStatus === null;

  return (
    <section className="pvm">
      <header className="page-head">
        <h2>PvM-klaar</h2>
        <p className="page-sub">
          Per boss wat je nodig hebt voor een eerste kill. Skills en quests vinkt de app zelf af uit de hiscores en de questlijst;
          unlocks en gear vink je zelf af.
        </p>
        {closest ? (
          <p className="pvm-closest">
            Het dichtstbij: <strong>{closest.boss.name}</strong>, {closest.done} van {closest.total} klaar.
            {closest.missing.length > 0 && <> Nog nodig: {missingText(closest, 3)}.</>}
          </p>
        ) : list.length > 0 && list.every((r) => r.total > 0 && r.done === r.total) ? (
          <p className="pvm-closest">Voor elke boss in de lijst ben je klaar.</p>
        ) : null}
      </header>

      {(questsUnknown || !hasData) && (
        <div className="notices pvm-notices">
          {!hasData && (
            <Notice tone="info" title="Nog geen accountgegevens">
              <p>Skills en quests staan op open tot de hiscores en de questlijst geladen zijn. Klik op Vernieuwen.</p>
            </Notice>
          )}
          {hasData && questsUnknown && (
            <Notice tone="info" title="Quests konden niet gecontroleerd worden">
              <p>De questlijst ontbreekt. Quest-eisen tellen daarom niet mee in de scores en staan als niet gecontroleerd.</p>
            </Notice>
          )}
        </div>
      )}

      <div className="pvm-list">
        {list.map((r) => (
          <PvmBoss key={r.boss.boss} r={r} route={route} toggle={toggle} openStep={openStep} />
        ))}
      </div>
    </section>
  );
}

function PvmBoss({ r, route, toggle, openStep }: {
  r: BossReadiness; route: LoadedRoute | null; toggle: (key: string) => void; openStep: Props["openStep"];
}) {
  const { boss } = r;
  const step = firstRouteStep(boss, route?.route ?? null);
  const complete = r.total > 0 && r.done === r.total;
  const headId = `pvm-${boss.boss}`;
  return (
    <article className={`panel pvm-boss${complete ? " is-ready" : ""}`} aria-labelledby={headId}>
      <div className="pvm-head">
        <div className="pvm-title">
          <h3 id={headId}><Icon name="boss" />{boss.name}</h3>
          <LocationLine location={boss.location} />
        </div>
        <div className="pvm-score">
          <p className="pvm-count">
            <strong>{r.done}</strong> van {r.total} klaar
            {r.unknown > 0 && <span className="pvm-unknown-count"> ({r.unknown} niet gecontroleerd)</span>}
          </p>
          <Bar fraction={r.total > 0 ? r.done / r.total : 0} className={complete ? "bar-moss" : "bar-gold"}
            label={`${r.done} van ${r.total} eisen klaar voor ${boss.name}`} />
        </div>
      </div>

      <p className="pvm-missing">
        {r.missing.length === 0
          ? r.unknown > 0 ? "Alles wat te controleren is, is klaar." : "Alles klaar voor een eerste kill."
          : <><span className="pvm-missing-label">Nog nodig:</span> {missingText(r, 6)}</>}
      </p>

      <div className="pvm-groups">
        {r.groups.filter((g) => g.checks.length > 0).map((g) => (
          <PvmGroupBlock key={g.key} g={g} boss={boss.boss} toggle={toggle} />
        ))}
      </div>

      <div className="pvm-foot">
        <BossCard boss={boss} />
        {step && (
          <button type="button" className="btn pvm-route" onClick={() => openStep(step, { boss: true })}>
            Naar de route
          </button>
        )}
      </div>
    </article>
  );
}

const SOURCE_TEXT: Record<string, string> = {
  hiscores: "uit de hiscores",
  questlijst: "uit de questlijst",
  "hiscores en questlijst": "uit de hiscores en de questlijst",
};

function groupSource(g: PvmGroup): string | null {
  if (g.key === "skills") return SOURCE_TEXT.hiscores;
  if (g.key === "quests") return SOURCE_TEXT.questlijst;
  return null;
}

function PvmGroupBlock({ g, boss, toggle }: { g: PvmGroup; boss: string; toggle: (key: string) => void }) {
  const src = groupSource(g);
  const done = g.checks.filter((c) => c.met).length;
  const counted = g.checks.filter((c) => !c.unknown).length;
  return (
    <section className={`pvm-group g-${g.key}`}>
      <h4>
        <Icon name={GROUP_ICON[g.key]} />
        {g.label}
        <span className="pvm-group-count">{counted > 0 ? `${done} van ${counted}` : "niet gecontroleerd"}</span>
      </h4>
      {src && <p className="pvm-src"><Icon name="auto" />{src}</p>}
      <ul className="pvm-items">
        {g.checks.map((c) => <PvmItem key={c.id} c={c} boss={boss} toggle={toggle} groupSource={!!src} />)}
      </ul>
    </section>
  );
}

function PvmItem({ c, boss, toggle, groupSource }: { c: PvmCheck; boss: string; toggle: (key: string) => void; groupSource: boolean }) {
  if (!c.auto && c.key) {
    const id = `pvm-${boss}-${c.id}`;
    return (
      <li className={`pvm-item manual${c.met ? " met" : ""}`}>
        <input type="checkbox" id={id} checked={c.met} onChange={() => toggle(c.key!)} />
        <label htmlFor={id} className="pvm-item-main">
          <span className="pvm-label">{c.label}</span>
          {c.how && <span className="pvm-how">{c.how}</span>}
        </label>
      </li>
    );
  }
  const state = c.unknown ? "unknown" : c.met ? "met" : "open";
  return (
    <li className={`pvm-item auto ${state}`}>
      <span className="pvm-glyph" aria-hidden="true">{c.unknown ? "?" : c.met ? "✓" : "○"}</span>
      <span className="pvm-item-main">
        <span className="pvm-label">
          <span className="sr-only">{c.unknown ? "Niet gecontroleerd: " : c.met ? "Gehaald: " : "Nog niet: "}</span>
          {c.label}
        </span>
        {c.unknown && <span className="pvm-how">niet gecontroleerd: de questlijst ontbreekt</span>}
        {c.detail && <span className="pvm-how pvm-detail">{c.detail}</span>}
        {c.how && <span className="pvm-how">{c.how}</span>}
        {!groupSource && c.source && <span className="pvm-auto-tag">{SOURCE_TEXT[c.source]}</span>}
      </span>
    </li>
  );
}
