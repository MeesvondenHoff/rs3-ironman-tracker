import { diff, fmtDate, forAccount, type Snapshot } from "../lib/snapshots";
import { fmt, fmtSigned } from "../lib/skills";

/** Per snapshot het XP-verschil per skill ten opzichte van de snapshot ervoor, nieuwste eerst. */
export default function HistoryView({ account, snapshots }: { account: string; snapshots: Snapshot[] }) {
  const mine = forAccount(snapshots, account);
  if (mine.length === 0) return <p className="empty-line">Hier komt per snapshot te staan welke skills XP kregen.</p>;

  const rows = mine.map((s, i) => ({ snap: s, d: i > 0 ? diff(mine[i - 1], s) : null })).reverse();

  return (
    <div className="table-wrap">
      <table className="history data">
        <thead>
          <tr>
            <th scope="col">Datum</th>
            <th scope="col" className="num">Totaal XP</th>
            <th scope="col" className="num">Winst</th>
            <th scope="col" className="num">QP</th>
            <th scope="col">Skills met XP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ snap, d }) => (
            <tr key={snap.ts}>
              <th scope="row" className="nowrap">{fmtDate(snap.ts)}</th>
              <td className="num">{fmt(snap.totalXp)}</td>
              <td className={d?.totalXp ? "num gain" : "num muted"}>{d ? fmtSigned(d.totalXp) : "eerste"}</td>
              <td className="num">
                {fmt(snap.qp)}
                {d?.qp ? <span className="gain"> ({fmtSigned(d.qp)})</span> : null}
              </td>
              <td>
                {d ? (
                  <ul className="gain-list">
                    {d.perSkill
                      .filter((p) => p.xp !== 0)
                      .sort((a, b) => b.xp - a.xp)
                      .map((p) => (
                        <li key={p.skill}>
                          {p.skill} <span className="gain">{fmtSigned(p.xp)}</span>
                          {p.levels > 0 && <strong> +{p.levels} {p.levels === 1 ? "level" : "levels"}</strong>}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <span className="muted">startpunt</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
