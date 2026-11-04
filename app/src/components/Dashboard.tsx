import { useState } from "react";
import type { AccountData } from "../lib/api";
import { accountCombat, runemetricsStopped } from "../lib/api";
import { Markdown } from "../lib/markdown";
import {
  nextStep, phaseProgress, stepState,
  type EvalContext, type LoadedRoute, type NextStep, type RoutePhase,
} from "../lib/route";
import { baseFor7Days, diff, fmtDay, forAccount, type Snapshot } from "../lib/snapshots";
import { fmt, fmtSigned } from "../lib/skills";
import { bossForStep } from "../lib/bosses";
import { stepQuests } from "../lib/questLinks";
import { loadNote } from "../lib/storage";
import { BossBrief } from "./BossCard";
import RouteTrail from "./RouteTrail";
import WeekRhythm from "./WeekRhythm";
import { Bar, Check, hoursText, Icon, LocationLine, Nil, Notice, QuestGuides, shortPhase, StyleMark, typeLabel, weeksText } from "./ui";

interface Props {
  account: string;
  data: AccountData | null;
  loading: boolean;
  /** Ophalen is mislukt; de melding bovenaan geeft dan al richting. */
  failed: boolean;
  route: LoadedRoute | null;
  routeError: string | null;
  ctx: EvalContext;
  snapshots: Snapshot[];
  refresh: () => void;
  openStep: (id: string, opts?: { boss?: boolean }) => void;
  toggleManual: (id: string) => void;
}

export default function Dashboard({ account, data, loading, failed, route, routeError, ctx, snapshots, refresh, openStep, toggleManual }: Props) {
  if (!data) {
    if (failed && !loading) return null;
    return (
      <section className="empty">
        <h2>{loading ? `Gegevens van ${account} worden opgehaald` : `Nog geen gegevens van ${account}`}</h2>
        <p>Met de skills en quests van het account rekent de app uit wat je volgende stap is en hoe ver de route is.</p>
        {!loading && <button type="button" className="btn btn-gold" onClick={refresh}>Gegevens ophalen</button>}
      </section>
    );
  }

  if (routeError || !route) {
    return (
      <div className="tonight">
        {routeError ? (
          <Notice tone="error" title="De route kon niet geladen worden">
            <p>Zonder route is er geen volgende stap. Controleer of src/data/route.json geldige JSON is volgens research/ROUTE-SCHEMA.md.</p>
            <p className="notice-raw">Melding: {routeError}</p>
          </Notice>
        ) : (
          <p className="muted">Route laden</p>
        )}
        <AccountFacts data={data} snapshots={snapshots} />
      </div>
    );
  }

  const phases = route.route.phases;
  const next = nextStep(route.route, ctx);
  const progress = phases.map((ph) => phaseProgress(ph, ctx));
  const currentIdx = next ? phases.indexOf(next.phase) : phases.length - 1;
  const current = phases[currentIdx];

  return (
    <div className="tonight">
      {route.notice && (
        <Notice tone="warn" title="Je ziet de voorbeeldroute">
          <p>{route.notice} Zet de echte route terug in src/data/route.json om met je eigen plan te werken.</p>
        </Notice>
      )}

      <div className="tonight-top">
        <div className="tonight-main">
          {next ? (
            <NextSheet next={next} phaseNo={currentIdx + 1} phaseCount={phases.length} openStep={openStep} toggleManual={toggleManual} />
          ) : (
            <section className="sheet">
              <p className="sheet-kicker">Route voltooid</p>
              <h2 className="sheet-title">Alle stappen zijn afgerond</h2>
              <p>Volgens deze route is het account combat-klaar. Tijd voor een nieuwe route in src/data/route.json.</p>
            </section>
          )}
          <WeekRhythm route={route.route} ctx={ctx} />
        </div>
        <PhaseColumn phase={current} no={currentIdx + 1} count={phases.length} pp={progress[currentIdx]} ctx={ctx} />
      </div>

      <RouteTrail phases={phases} progress={progress} currentIdx={next ? currentIdx : -1} goal={route.route.meta.goal} />

      <div className="tonight-bottom panel">
        <Upcoming route={route} ctx={ctx} next={next} openStep={openStep} />
        <Activities data={data} />
        <AccountFacts data={data} snapshots={snapshots} />
      </div>
    </div>
  );
}

function NextSheet({ next, phaseNo, phaseCount, openStep, toggleManual }: {
  next: NextStep; phaseNo: number; phaseCount: number; openStep: (id: string, opts?: { boss?: boolean }) => void; toggleManual: (id: string) => void;
}) {
  const { step, state } = next;
  const note = loadNote(step.id);
  const boss = bossForStep(step.id);
  const open = state.completeChecks.filter((c) => !c.met).length;
  const [marked, setMarked] = useState<{ id: string; title: string } | null>(null);
  const markDone = () => {
    toggleManual(step.id);
    setMarked({ id: step.id, title: step.title });
  };
  return (
    <section className="sheet" aria-labelledby="next-title">
      <p className="sheet-kicker">Je volgende stap</p>
      <h2 className="sheet-title" id="next-title">{step.title}</h2>
      <LocationLine location={step.location} className="sheet-loc" />
      <QuestGuides quests={stepQuests(step)} className="sheet-qg" />

      <dl className="sheet-facts">
        <div><dt>Soort</dt><dd>{typeLabel(step.type)}</dd></div>
        <div><dt>Speelstijl</dt><dd><StyleMark style={step.style} /></dd></div>
        {step.estHours !== undefined && <div><dt>Tijd</dt><dd>{hoursText(step.estHours)}</dd></div>}
        <div><dt>Fase</dt><dd>{phaseNo} van {phaseCount}, {shortPhase(next.phase.title)}</dd></div>
      </dl>

      {!state.available && (
        <div className="sheet-blocked">
          <p><strong>Nog niet beschikbaar.</strong> Eerst nodig:</p>
          <ul className="checks">{state.missing.map((m) => <Check key={m.label} met={false}>{m.label}</Check>)}</ul>
        </div>
      )}

      {state.completeChecks.length > 0 && (
        <div className="sheet-block">
          <p className="sheet-label">Klaar zodra je dit hebt{open > 0 && open < state.completeChecks.length && `, nog ${open} te gaan`}</p>
          <ul className="checks">
            {state.completeChecks.map((c) => <Check key={c.label} met={c.met}>{c.label}</Check>)}
          </ul>
        </div>
      )}

      {step.detail && <div className="sheet-detail"><Markdown text={step.detail} /></div>}
      {note.trim() !== "" && (
        <div className="sheet-note-box">
          <p className="sheet-label"><Icon name="note" />Jouw notitie</p>
          <p className="sheet-note-text">{note}</p>
        </div>
      )}
      {boss && <BossBrief boss={boss} onOpen={() => openStep(step.id, { boss: true })} />}
      {step.why && (
        <details className="why">
          <summary>Waarom deze stap</summary>
          <Markdown text={step.why} />
        </details>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn-ink" onClick={markDone}>Markeer als gedaan</button>
        {state.auto && <p className="sheet-note">Vinkt ook vanzelf af zodra je stats het halen na vernieuwen.</p>}
        <button type="button" className="btn btn-ink-quiet" onClick={() => openStep(step.id)}>Bekijk in de route</button>
      </div>
      {marked && (
        <p className="sheet-undo" role="status">
          {marked.title} staat op gedaan.{" "}
          <button type="button" className="linklike" onClick={() => { toggleManual(marked.id); setMarked(null); }}>Ongedaan maken</button>
        </p>
      )}
    </section>
  );
}

function PhaseColumn({ phase, no, count, pp, ctx }: {
  phase: RoutePhase; no: number; count: number; pp: { done: number; total: number; remainingHours: number }; ctx: EvalContext;
}) {
  const weeks = weeksText(pp.remainingHours);
  return (
    <section className="phase-col" aria-labelledby="phase-col-title">
      <p className="phase-col-no">Fase {no} van {count}</p>
      <h2 id="phase-col-title">{phase.title}</h2>
      <Bar fraction={pp.total ? pp.done / pp.total : 0} label={`${pp.done} van ${pp.total} stappen gedaan`} className="bar-gold" />
      <p className="phase-col-count">
        <strong>{pp.done} van {pp.total}</strong> stappen gedaan.
        {pp.remainingHours > 0 && <> Nog {hoursText(pp.remainingHours)}{weeks && `, ${weeks}`}.</>}
      </p>
      {phase.targets && phase.targets.length > 0 && (
        <>
          <h3>Doelen van deze fase</h3>
          <ul className="targets">
            {phase.targets.map((t) => {
              const cur = ctx.levels.get(t.skill) ?? 1;
              const met = cur >= t.level;
              return (
                <li key={t.skill} className={met ? "met" : ""}>
                  <span className="t-skill">{t.skill}</span>
                  <span className="t-lvl">
                    <span className="sr-only">nu </span>{cur}
                    <span className="t-of"> / {t.level}</span>
                  </span>
                  <Bar fraction={Math.min(1, cur / t.level)} label={`${t.skill} ${cur} van ${t.level}`} className={met ? "bar-moss" : ""} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function Upcoming({ route, ctx, next, openStep }: {
  route: LoadedRoute; ctx: EvalContext; next: NextStep | null; openStep: (id: string) => void;
}) {
  if (!next) return null;
  const open = route.route.phases.flatMap((ph) => ph.steps.map((s) => ({ s, st: stepState(s, ctx) }))).filter((x) => !x.st.done && x.s.id !== next.step.id);
  const after = open.slice(0, 3);
  // Wie vanavond liever een andere speelstijl wil: eerste beschikbare stap in de andere stijl.
  const wantAfk = next.step.style !== "afk";
  const alt = open.find((x) => x.st.available && (wantAfk ? x.s.style === "afk" : x.s.style === "active"));

  return (
    <section className="col" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title">Daarna</h2>
      <ol className="mini-steps">
        {after.map(({ s, st }) => (
          <li key={s.id}>
            <button type="button" className="linklike" onClick={() => openStep(s.id)}>{s.title}</button>
            <span className="mini-meta">
              <StyleMark style={s.style} />
              {s.estHours !== undefined && <span>{hoursText(s.estHours)}</span>}
              {!st.available && <span className="blocked-tag">nog niet beschikbaar</span>}
            </span>
          </li>
        ))}
      </ol>
      {alt && (
        <div className="alt">
          <h3>{wantAfk ? "Liever AFK vanavond?" : "Zin in actief spelen?"}</h3>
          <button type="button" className="linklike" onClick={() => openStep(alt.s.id)}>{alt.s.title}</button>
          <span className="mini-meta">
            <StyleMark style={alt.s.style} />
            {alt.s.estHours !== undefined && <span>{hoursText(alt.s.estHours)}</span>}
          </span>
        </div>
      )}
    </section>
  );
}

function Activities({ data }: { data: AccountData }) {
  const acts = data.profile?.activities ?? [];
  const cached = data.profileSource?.kind === "cached";
  return (
    <section className="col" aria-labelledby="acts-title">
      <h2 id="acts-title">Laatst in de game</h2>
      {cached && (
        <p className="muted acts-note">Laatst bekend, van {fmtDay(data.profileSource.at)}. RuneMetrics geeft geen nieuwe activiteiten meer.</p>
      )}
      {!data.profile ? (
        <p className="muted">
          {runemetricsStopped()
            ? "Recente activiteiten kwamen uit RuneMetrics, en die is gestopt. Wat je speelt, zie je terug in de XP-winst in het Logboek."
            : "RuneMetrics gaf geen profiel terug, dus recente activiteiten ontbreken. Zet het profiel op openbaar en vernieuw."}
        </p>
      ) : acts.length === 0 ? (
        <p className="muted">Nog geen activiteiten. Na je volgende sessie verschijnen hier levels en quests.</p>
      ) : (
        <ul className="acts">
          {acts.slice(0, 5).map((a, i) => (
            <li key={i}>
              <span className="act-text">{a.text}</span>
              <span className="act-date">{a.date}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AccountFacts({ data, snapshots }: { data: AccountData; snapshots: Snapshot[] }) {
  const p = data.profile;
  const totalLevel = Math.max(p?.totalskill ?? 0, data.overall?.level ?? 0, data.skills.reduce((a, s) => a + s.level, 0));
  const totalXp = Math.max(p?.totalxp ?? 0, data.overall?.xp ?? 0, data.skills.reduce((a, s) => a + s.xp, 0));
  const mine = forAccount(snapshots, data.account);
  const b7 = baseFor7Days(mine);
  const week = b7 && mine.length >= 2 ? diff(b7.base, mine[mine.length - 1]) : null;
  // Uit de questlijst (live of laatst bekend), zodat dit dezelfde stand is als de quest points.
  const questsDone = data.quests ? data.quests.filter((q) => q.status === "COMPLETED").length : p?.questscomplete ?? null;
  const questsTotal = data.quests ? data.quests.length : p ? p.questscomplete + p.questsstarted + p.questsnotstarted : null;
  const liveRank = data.profileSource?.kind === "live" ? p?.rank : null;

  return (
    <section className="col" aria-labelledby="facts-title">
      <h2 id="facts-title">Account</h2>
      <dl className="facts">
        <div><dt>Combat</dt><dd>{fmt(accountCombat(data))}</dd></div>
        <div><dt>Totaal level</dt><dd>{fmt(totalLevel)}</dd></div>
        <div><dt>Totaal XP</dt><dd>{fmt(totalXp)}</dd></div>
        <div>
          <dt>{b7?.full ? "XP deze week" : "XP sinds eerste snapshot"}</dt>
          <dd>{week ? fmtSigned(week.totalXp) : <span className="muted">na 2 snapshots</span>}</dd>
        </div>
        <div><dt>Quest points</dt><dd>{fmt(data.questPoints)}</dd></div>
        <div><dt>Quests klaar</dt><dd>{questsDone !== null && questsTotal ? `${questsDone} van ${questsTotal}` : <Nil label="onbekend" />}</dd></div>
        <div><dt>Ironman-rank</dt><dd>{data.overall?.rank ? fmt(data.overall.rank) : <Nil label="onbekend" />}</dd></div>
        <div><dt>RuneMetrics-rank</dt><dd>{liveRank ? fmt(Number(String(liveRank).replace(/,/g, ""))) : <Nil label="onbekend" />}</dd></div>
      </dl>
    </section>
  );
}
