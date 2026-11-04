import { useMemo, useState } from "react";
import { runemetricsStopped, type Quest, type QuestsSource, type QuestStatus } from "../lib/api";
import { questsInRoute, type Route } from "../lib/route";
import { fmt } from "../lib/skills";
import { fmtDay } from "../lib/snapshots";
import { Nil, QuestGuideLink } from "./ui";

const STATUS_LABEL: Record<QuestStatus, string> = { COMPLETED: "voltooid", STARTED: "gestart", NOT_STARTED: "niet gestart" };
const DIFFICULTY: Record<number, string> = { 0: "Novice", 1: "Intermediate", 2: "Experienced", 3: "Master", 4: "Grandmaster", 250: "Special" };

type StatusFilter = "" | QuestStatus;
type EligibleFilter = "" | "yes" | "no";

interface Props {
  quests: Quest[] | null;
  /** Waar de questlijst vandaan komt; niet live betekent een stand van een eerdere datum. */
  source?: QuestsSource | null;
  route: Route | null;
  hasData: boolean;
}

export default function QuestsView({ quests, source, route, hasData }: Props) {
  const [status, setStatus] = useState<StatusFilter>("");
  const [eligible, setEligible] = useState<EligibleFilter>("");
  const [onlyRoute, setOnlyRoute] = useState(false);
  const [q, setQ] = useState("");
  const inRoute = useMemo(() => (route ? questsInRoute(route) : new Map<string, string[]>()), [route]);

  const rows = useMemo(() => {
    if (!quests) return [];
    const needle = q.trim().toLowerCase();
    return quests
      .filter((x) => !status || x.status === status)
      .filter((x) => !eligible || (eligible === "yes") === x.userEligible)
      .filter((x) => !onlyRoute || inRoute.has(x.title))
      .filter((x) => !needle || x.title.toLowerCase().includes(needle))
      .sort((a, b) => b.questPoints - a.questPoints || a.title.localeCompare(b.title));
  }, [quests, status, eligible, onlyRoute, q, inRoute]);

  if (!quests)
    return (
      <section className="empty">
        <h2>Geen questlijst</h2>
        <p>
          {!hasData
            ? "Klik op Vernieuwen om de quests van het account op te halen."
            : runemetricsStopped()
              ? "RuneMetrics is gestopt en van dit account is geen eerdere questlijst bewaard. De route werkt wel: vink quests zelf af in de Route-tab."
              : "RuneMetrics gaf geen quests terug. Meestal staat het profiel op privé: zet RuneMetrics in de game op openbaar en klik op Vernieuwen."}
        </p>
      </section>
    );

  const done = quests.filter((x) => x.status === "COMPLETED");
  const qp = done.reduce((a, x) => a + x.questPoints, 0);
  const totalQp = quests.reduce((a, x) => a + x.questPoints, 0);
  const filtered = status || eligible || onlyRoute || q.trim();

  const reset = () => {
    setStatus("");
    setEligible("");
    setOnlyRoute(false);
    setQ("");
  };

  return (
    <section>
      <header className="page-head">
        <h2>Quests</h2>
        <p className="page-sub">
          {done.length} van {quests.length} quests voltooid, goed voor {fmt(qp)} van de {fmt(totalQp)} quest points. {inRoute.size} quests komen in de route voor.
          {source && source.kind !== "live" && (
            <> Stand van {fmtDay(source.at)} ({source.kind === "cached" ? "laatste opslag" : "meegeleverde lijst"}); nieuwe quests vink je af in de Route-tab.</>
          )}
        </p>
      </header>

      <div className="filters" role="search">
        <label className="field">
          <span>Zoeken</span>
          <input type="search" placeholder="Questnaam" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="">Alle</option>
            <option value="COMPLETED">Voltooid</option>
            <option value="STARTED">Gestart</option>
            <option value="NOT_STARTED">Niet gestart</option>
          </select>
        </label>
        <label className="field">
          <span>Eisen gehaald</span>
          <select value={eligible} onChange={(e) => setEligible(e.target.value as EligibleFilter)}>
            <option value="">Maakt niet uit</option>
            <option value="yes">Ja, kan ik starten</option>
            <option value="no">Nee, nog niet</option>
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={onlyRoute} onChange={(e) => setOnlyRoute(e.target.checked)} />
          Alleen quests uit de route
        </label>
        <p className="filter-count" aria-live="polite">{rows.length} getoond</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty empty-inline">
          <p>Geen quests die bij deze filters passen.</p>
          {filtered && <button type="button" className="btn" onClick={reset}>Filters wissen</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="quests data">
            <thead>
              <tr>
                <th scope="col">Quest</th>
                <th scope="col">Wiki</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">QP</th>
                <th scope="col">Moeilijkheid</th>
                <th scope="col">Members</th>
                <th scope="col">Eisen gehaald</th>
                <th scope="col">In route</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.title} className={x.status === "COMPLETED" ? "row-done" : undefined}>
                  <th scope="row">{x.title}</th>
                  <td className="ql-cell"><QuestGuideLink title={x.title} /></td>
                  <td><span className={`pill qstatus q-${x.status}`}><span className="pill-dot" aria-hidden="true" />{STATUS_LABEL[x.status] ?? x.status}</span></td>
                  <td className="num">{x.questPoints}</td>
                  <td>{DIFFICULTY[x.difficulty] ?? x.difficulty}</td>
                  <td className={x.members ? undefined : "muted"}>{x.members ? "ja" : "nee"}</td>
                  <td>{x.userEligible ? <span className="yes">ja</span> : <span className="muted">nee</span>}</td>
                  <td className="route-ids">{inRoute.has(x.title) ? inRoute.get(x.title)!.join(", ") : <Nil label="niet in de route" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
