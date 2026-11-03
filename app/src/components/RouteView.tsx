import { useEffect, useMemo, useRef, useState } from "react";
import type { Quest } from "../lib/api";
import { Markdown } from "../lib/markdown";
import {
  nextStep, phaseProgress, stepState, validateRoute,
  type EvalContext, type LoadedRoute, type RouteSource, type RouteStep,
} from "../lib/route";
import { BOSSES, bossForStep, validateBosses } from "../lib/bosses";
import { stepQuests } from "../lib/questLinks";
import { loadNote, saveNote } from "../lib/storage";
import { BossCard } from "./BossCard";
import { Badge, Bar, Check, hoursText, Icon, LocationLine, Notice, pctText, QuestGuides, StyleMark, typeIcon, typeLabel, weeksText } from "./ui";

interface Props {
  route: LoadedRoute | null;
  routeError: string | null;
  ctx: EvalContext;
  quests: Quest[] | null;
  toggleManual: (id: string) => void;
  hasData: boolean;
  /** Stap waar naartoe gescrold moet worden (n verandert bij elke nieuwe aanvraag). */
  focusStep: { id: string; n: number; boss?: boolean } | null;
}

function scrollToStep(id: string, openBoss = false) {
  const el = document.getElementById(`step-${id}`);
  if (!el) return;
  const det = el.closest("details");
  if (det) det.open = true;
  if (openBoss) {
    const card = el.querySelector<HTMLDetailsElement>("details.boss-card");
    if (card) card.open = true;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

export default function RouteView({ route, routeError, ctx, quests, toggleManual, hasData, focusStep }: Props) {
  const [hideDone, setHideDone] = useState(false);
  const issues = useMemo(
    () => (route ? [...validateRoute(route.route, quests), ...(route.notice ? [] : validateBosses(BOSSES, route.route))] : []),
    [route, quests],
  );

  useEffect(() => {
    if (focusStep && route) requestAnimationFrame(() => scrollToStep(focusStep.id, !!focusStep.boss));
  }, [focusStep, route]);

  if (routeError)
    return (
      <Notice tone="error" title="De route kon niet geladen worden">
        <p>Controleer of src/data/route.json geldige JSON is en voldoet aan research/ROUTE-SCHEMA.md, en herlaad daarna de pagina.</p>
        <p className="notice-raw">Melding: {routeError}</p>
      </Notice>
    );
  if (!route) return <p className="muted">Route laden</p>;

  const { meta, phases } = route.route;
  const sources = new Map((meta.sources ?? []).map((s) => [s.id, s]));
  const next = nextStep(route.route, ctx);

  return (
    <div className="route">
      <header className="page-head">
        <h2>{meta.goal ?? "Route"}</h2>
        <p className="page-sub">
          {meta.playstyle && <>{meta.playstyle}. </>}
          {meta.updated && <>Route bijgewerkt op {meta.updated}, </>}
          geladen uit <code>{route.file}</code>.
        </p>
        <div className="page-tools">
          <label className="toggle">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Afgeronde stappen verbergen
          </label>
          {next && <button type="button" className="btn" onClick={() => scrollToStep(next.step.id)}>Ga naar de volgende stap</button>}
        </div>
      </header>

      <div className="notices">
        {route.notice && (
          <Notice tone="warn" title="Je ziet de voorbeeldroute">
            <p>{route.notice} Zet de echte route terug in src/data/route.json om met je eigen plan te werken.</p>
          </Notice>
        )}
        {!hasData && (
          <Notice tone="info" title="Nog geen accountgegevens">
            <p>Stappen met een automatische controle worden pas afgevinkt na Vernieuwen.</p>
          </Notice>
        )}
        {hasData && !ctx.questStatus && (
          <Notice tone="warn" title="Quests ontbreken">
            <p>RuneMetrics gaf geen questlijst terug, dus quest-eisen tellen nu als niet gehaald. Zet het profiel op openbaar en vernieuw.</p>
          </Notice>
        )}
        {issues.length > 0 && (
          <details className="issues">
            <summary>De route-data heeft {issues.length} {issues.length === 1 ? "waarschuwing" : "waarschuwingen"}</summary>
            <p className="muted">Dit zijn fouten in route.json (bijvoorbeeld een verkeerd gespelde skill of quest). Pas ze aan in het bestand.</p>
            <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </details>
        )}
      </div>

      {phases.map((phase, pi) => {
        const pp = phaseProgress(phase, ctx);
        const isCurrent = next?.phase.id === phase.id;
        const complete = pp.total > 0 && pp.done === pp.total;
        const weeks = weeksText(pp.remainingHours);
        return (
          <details key={phase.id} className={`phase${isCurrent ? " phase-current" : ""}${complete ? " phase-done" : ""}`} open={isCurrent || undefined}>
            <summary>
              <span className="phase-no" aria-hidden="true">{pi + 1}</span>
              <span className="phase-name">
                <span className="sr-only">Fase {pi + 1}: </span>{phase.title}
                {isCurrent && <span className="here">huidige fase</span>}
              </span>
              <span className="phase-sum">
                <span>{pp.done} van {pp.total} stappen ({pctText(pp.done, pp.total)}){pp.remainingHours > 0 ? `, nog ${hoursText(pp.remainingHours)}` : ""}</span>
                <Bar fraction={pp.total ? pp.done / pp.total : 0} label={`${pp.done} van ${pp.total} stappen (${pctText(pp.done, pp.total)})`} className={complete ? "bar-moss" : "bar-gold"} />
              </span>
            </summary>

            <div className="phase-body">
              {phase.summary && <div className="phase-summary"><Markdown text={phase.summary} /></div>}
              <p className="phase-facts">
                {phase.estHours !== undefined && <>De hele fase is geschat op {hoursText(phase.estHours)}. </>}
                {pp.remainingHours > 0 && weeks && <>Wat nog open staat: {weeks}.</>}
              </p>
              {phase.targets && phase.targets.length > 0 && (
                <div className="phase-targets">
                  <h3>Doelen</h3>
                  <ul className="checks inline">
                    {phase.targets.map((t) => {
                      const cur = ctx.levels.get(t.skill);
                      return (
                        <Check key={t.skill} met={cur !== undefined && cur >= t.level}>
                          {t.skill} {t.level}{cur !== undefined && <span className="muted"> (nu {cur})</span>}
                        </Check>
                      );
                    })}
                  </ul>
                </div>
              )}
              <ol className="steps">
                {phase.steps.map((step) => (
                  <Step key={step.id} step={step} ctx={ctx} sources={sources} isNext={next?.step.id === step.id} toggleManual={toggleManual} hideDone={hideDone}
                    bossOpen={!!focusStep?.boss && focusStep.id === step.id} />
                ))}
              </ol>
            </div>
          </details>
        );
      })}
    </div>
  );
}

interface StepProps {
  step: RouteStep;
  ctx: EvalContext;
  sources: Map<string, RouteSource>;
  isNext: boolean;
  toggleManual: (id: string) => void;
  hideDone: boolean;
  /** Bosskaart meteen open (vanaf "Volledige bosskaart" op Vanavond). */
  bossOpen?: boolean;
}

function Step({ step, ctx, sources, isNext, toggleManual, hideDone, bossOpen }: StepProps) {
  const st = stepState(step, ctx);
  // Een kort moment bij afvinken: alleen als de stap in deze weergave van open naar gedaan gaat.
  const wasDone = useRef(st.done);
  const [justDone, setJustDone] = useState(false);
  const [note, setNote] = useState(() => loadNote(step.id));
  const changeNote = (text: string) => {
    setNote(text);
    saveNote(step.id, text);
  };
  const hasNote = note.trim() !== "";
  // Alleen bij het tonen bepalen of het notitieveld open staat, zodat het niet dichtklapt als je alles wist.
  const [noteOpen] = useState(hasNote);
  useEffect(() => {
    if (st.done && !wasDone.current) {
      setJustDone(true);
      const t = window.setTimeout(() => setJustDone(false), 900);
      wasDone.current = st.done;
      return () => window.clearTimeout(t);
    }
    wasDone.current = st.done;
  }, [st.done]);
  if (hideDone && st.done) return null;
  const blocked = !st.available && !st.done;
  const cls = ["step", st.done ? "done" : "", isNext ? "is-next" : "", blocked ? "blocked" : "", justDone ? "just-done" : ""].filter(Boolean).join(" ");
  const boxId = `chk-${step.id}`;
  const boss = bossForStep(step.id);
  return (
    <li className={cls} id={`step-${step.id}`} tabIndex={-1}>
      <span className="step-marker" aria-hidden="true" />
      <div className="step-main">
        <div className="step-head">
          <input
            id={boxId}
            type="checkbox"
            checked={st.done}
            disabled={st.auto && st.done && !ctx.manual[step.id]}
            title={st.auto && st.done && !ctx.manual[step.id] ? "Automatisch afgevinkt op basis van je stats" : undefined}
            onChange={() => toggleManual(step.id)}
          />
          <label htmlFor={boxId} className="step-title">{step.title}</label>
          {isNext && <span className="here">volgende stap</span>}
          {hasNote && (
            <span className="note-mark" title="Deze stap heeft een notitie">
              <Icon name="note" /><span className="sr-only">heeft een notitie</span>
            </span>
          )}
          <span className="step-id">{step.id}</span>
        </div>
        <LocationLine location={step.location} className="step-loc" />
        <QuestGuides quests={stepQuests(step)} className="step-qg" />
        <div className="step-meta">
          <Badge icon={typeIcon(step.type)}>{typeLabel(step.type)}</Badge>
          <span className="badge badge-style"><StyleMark style={step.style} /></span>
          {step.estHours !== undefined && <Badge icon="hours">{hoursText(step.estHours)}</Badge>}
          <Badge icon={st.auto ? "auto" : "manual"} className="badge-quiet">{st.auto ? "vinkt zichzelf af, of zelf afvinken" : "zelf afvinken"}</Badge>
        </div>
        {blocked && (
          <div className="step-blocked">
            <strong>Nog niet beschikbaar.</strong> Eerst nodig: {st.missing.map((m) => m.label).join(", ")}
          </div>
        )}
        {st.completeChecks.length > 0 && !st.done && (
          <ul className="checks inline">
            {st.completeChecks.map((c) => <Check key={c.label} met={c.met}>{c.label}</Check>)}
          </ul>
        )}
        {step.detail && <div className="step-detail"><Markdown text={step.detail} /></div>}
        {step.why && (
          <details className="why">
            <summary>Waarom deze stap</summary>
            <Markdown text={step.why} />
          </details>
        )}
        {boss && <BossCard boss={boss} open={bossOpen} />}
        <details className="why step-note" open={noteOpen || undefined}>
          <summary>{hasNote ? "Notitie" : "Notitie toevoegen"}</summary>
          <label className="sr-only" htmlFor={`note-${step.id}`}>Notitie bij {step.title}</label>
          <textarea
            id={`note-${step.id}`}
            className="note-field"
            rows={3}
            value={note}
            placeholder="Bijvoorbeeld: hoeveel bars heb ik al, lens niet vergeten"
            onChange={(e) => changeNote(e.target.value)}
          />
        </details>
        {step.sources && step.sources.length > 0 && (
          <details className="why sources">
            <summary>{step.sources.length === 1 ? "Bron" : `Bronnen (${step.sources.length})`}</summary>
            <p>
              {step.sources.map((id, i) => {
                const s = sources.get(id);
                return (
                  <span key={id}>
                    {i > 0 && ", "}
                    {s ? <a href={s.url} target="_blank" rel="noreferrer" title={s.note}>{s.title}</a> : <span className="muted">{id}</span>}
                  </span>
                );
              })}
            </p>
          </details>
        )}
      </div>
    </li>
  );
}
