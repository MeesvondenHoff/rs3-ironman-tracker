import { useEffect, useMemo, useState } from "react";
import {
  DAY_NAMES, isDone, isUnlocked, loadChecks, PERIOD_LABEL, REPEATABLES, saveCheck, summarize, untilText,
  type Repeatable,
} from "../lib/repeatables";
import { stepState, type EvalContext, type Route, type RouteStep } from "../lib/route";
import { Icon } from "./ui";

interface Props {
  route: Route;
  ctx: EvalContext;
  items?: Repeatable[];
}

/** Weekritme: terugkerende activiteiten met afvinken en automatische reset (UTC). */
export default function WeekRhythm({ route, ctx, items = REPEATABLES }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [checks, setChecks] = useState(() => loadChecks(items));

  // Elke halve minuut bijwerken, zodat vinkjes na de reset vanzelf vervallen.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const steps = useMemo(() => {
    const m = new Map<string, RouteStep>();
    for (const p of route.phases) for (const s of p.steps) m.set(s.id, s);
    return m;
  }, [route]);

  const stepOpen = (id: string) => {
    const s = steps.get(id);
    if (!s) return false;
    const st = stepState(s, ctx);
    return st.available || st.done;
  };
  const visible = items.filter((i) => isUnlocked(i, stepOpen));
  const locked = items.filter((i) => !isUnlocked(i, stepOpen));
  const groups = summarize(visible, checks, now);

  const toggle = (item: Repeatable) => {
    const t = Date.now();
    const done = isDone(checks[item.id], item.period, t);
    const at = done ? null : t;
    saveCheck(item.id, at);
    setChecks((c) => ({ ...c, [item.id]: at ?? undefined }));
    setNow(t);
  };

  return (
    <section className="week panel" aria-labelledby="week-title">
      <header className="week-head">
        <h2 id="week-title"><Icon name="week" />Weekritme</h2>
        <p className="week-sub">Resets in UTC: dagelijks om 00:00, wekelijks woensdag om 00:00, maandelijks de 1e om 00:00.</p>
      </header>

      {groups.map((g) => (
        <div key={g.period} className="week-group">
          <div className="week-group-head">
            <h3>{PERIOD_LABEL[g.period]}</h3>
            <p className="week-count">
              <strong>{g.open} van {g.total}</strong> open, reset over {untilText(g.nextReset - now)}
            </p>
          </div>
          <ul className="week-list">
            {g.items.map((item) => {
              const done = isDone(checks[item.id], item.period, now);
              const boxId = `rep-${item.id}`;
              return (
                <li key={item.id} className={done ? "rep done" : "rep"}>
                  <input id={boxId} type="checkbox" checked={done} onChange={() => toggle(item)} />
                  <div className="rep-main">
                    <label htmlFor={boxId} className="rep-title">
                      {item.title}
                      {item.dayOfWeek !== undefined && <span className="rep-tag">op {DAY_NAMES[item.dayOfWeek]}</span>}
                      {item.optional && <span className="rep-tag">optioneel</span>}
                    </label>
                    <p className="rep-detail">{item.detail}</p>
                    <p className="rep-meta">
                      {item.stop && <span>Stoppunt: {item.stop}</span>}
                      <a href={item.wikiUrl} target="_blank" rel="noreferrer">Wiki</a>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {locked.length > 0 && (
        <p className="week-later">
          Later: {locked.map((i) => `${i.title}${i.unlockedBy ? ` (zodra stap ${i.unlockedBy} beschikbaar is)` : ""}`).join(", ")}.
        </p>
      )}
    </section>
  );
}
