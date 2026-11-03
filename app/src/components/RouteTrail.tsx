import type { PhaseProgress, RoutePhase } from "../lib/route";
import { hoursText, shortPhase, weeksText } from "./ui";

interface Props {
  phases: RoutePhase[];
  progress: PhaseProgress[];
  /** Index van de fase met de volgende stap, -1 als alles klaar is. */
  currentIdx: number;
  goal?: string;
}

/**
 * Het spoor van start naar combat-klaar. Elke fase is een etappe waarvan de lengte
 * meeschaalt met de geschatte uren, zodat lange fases ook lang ogen.
 */
export default function RouteTrail({ phases, progress, currentIdx, goal }: Props) {
  const done = progress.reduce((a, p) => a + p.done, 0);
  const total = progress.reduce((a, p) => a + p.total, 0);
  const remaining = progress.reduce((a, p) => a + p.remainingHours, 0);
  const weeks = weeksText(remaining);
  // Uren per fase uit de stappen zelf, zodat het gevulde deel past bij de gedane uren.
  const stepHours = phases.map((ph) => ph.steps.reduce((a, s) => a + (s.estHours ?? 0), 0));
  const hoursAll = stepHours.reduce((a, h) => a + h, 0);
  const hoursDone = Math.max(0, hoursAll - remaining);

  return (
    <section className="trail-wrap" aria-labelledby="trail-title">
      <div className="trail-head">
        <h2 id="trail-title">Op weg naar combat-klaar</h2>
        <p>
          {done} van {total} stappen gedaan
          {hoursDone > 0 && <>, goed voor {hoursText(Math.round(hoursDone * 10) / 10)} van de {hoursText(Math.round(hoursAll))}</>}.
          {remaining > 0 && <> Nog ongeveer {hoursText(Math.round(remaining))}{weeks && `: ${weeks} bij 7 tot 15 uur per week`}.</>}
        </p>
        {goal && <p className="trail-goal">{goal}</p>}
      </div>

      <ol className="trail">
        {phases.map((ph, i) => {
          const pp = progress[i];
          const hours = ph.estHours ?? ph.steps.reduce((a, s) => a + (s.estHours ?? 0), 0);
          // Gevuld deel naar rato van gedane uren; zonder urenschatting naar rato van stappen.
          const frac = stepHours[i] > 0 ? (stepHours[i] - pp.remainingHours) / stepHours[i] : pp.total ? pp.done / pp.total : 0;
          const state = pp.total > 0 && pp.done === pp.total ? "done" : i === currentIdx ? "current" : i < currentIdx ? "partial" : "ahead";
          return (
            <li
              key={ph.id}
              className={`leg leg-${state}`}
              style={{ ["--w" as string]: Math.max(4, hours || 1), ["--i" as string]: i }}
              aria-current={i === currentIdx ? "step" : undefined}
            >
              <span className="waypoint" aria-hidden="true">{i + 1}</span>
              <span className="leg-track" aria-hidden="true">
                <span className="leg-fill" style={{ width: `${Math.round(frac * 100)}%` }} />
              </span>
              <span className="leg-label">
                <span className="leg-name" title={ph.title}>
                  <span className="sr-only">Fase {i + 1}: </span>{shortPhase(ph.title)}
                </span>
                <span className="leg-meta">
                  {pp.done} van {pp.total}
                  {i === currentIdx && <span className="here">je bent hier</span>}
                </span>
              </span>
            </li>
          );
        })}
        <li className="leg-end" aria-label="Einddoel: combat-klaar">
          <span className="waypoint waypoint-end" aria-hidden="true" />
          <span className="leg-label"><span className="leg-name">Combat-klaar</span></span>
        </li>
      </ol>
    </section>
  );
}
