import { useRef, useState } from "react";
import { baseFor7Days, diff, fmtDate, forAccount, MAX_SNAPSHOTS, type SnapDiff, type Snapshot } from "../lib/snapshots";
import { fmt, fmtSigned } from "../lib/skills";
import { downloadJson, exportAll, importAll } from "../lib/storage";
import HistoryView from "./HistoryView";
import { Nil } from "./ui";

interface Props {
  account: string;
  snapshots: Snapshot[];
  setSnapshots: (list: Snapshot[]) => void;
  onImported: () => void;
}

/** Snapshots, XP-winst, geschiedenis en gegevensbeheer op één plek. */
export default function LogbookView({ account, snapshots, setSnapshots, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const mine = forAccount(snapshots, account);
  const last = mine[mine.length - 1];
  const prev = mine.length >= 2 ? diff(mine[mine.length - 2], last) : null;
  const b7 = baseFor7Days(mine);
  const week = b7 && mine.length >= 2 ? diff(b7.base, last) : null;

  const doExport = () => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const file = exportAll();
    downloadJson(`rs3-tracker-${stamp}.json`, file);
    const n = Object.keys(file.notes ?? {}).length;
    setMsg({ ok: true, text: `Back-up gedownload, met ${n} ${n === 1 ? "notitie" : "notities"} bij stappen.` });
  };

  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (!window.confirm("Importeren vervangt alle huidige app-gegevens (snapshots, vinkjes, notities, weekritme, account). Doorgaan?")) return;
      const r = importAll(json);
      onImported();
      setMsg({ ok: true, text: `Back-up teruggezet: ${r.total} onderdelen ingelezen, waarvan ${r.notes} ${r.notes === 1 ? "notitie" : "notities"}.` });
    } catch (e) {
      setMsg({ ok: false, text: `Terugzetten mislukt: ${e instanceof Error ? e.message : String(e)} Kies een JSON-bestand dat met Download back-up is gemaakt.` });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clearMine = () => {
    if (!window.confirm(`Alle ${mine.length} snapshots van ${account} verwijderen? Dit kan niet ongedaan worden, tenzij je eerst een back-up downloadt.`)) return;
    const key = account.trim().toLowerCase();
    setSnapshots(snapshots.filter((s) => s.account.trim().toLowerCase() !== key));
    setMsg({ ok: true, text: `Snapshots van ${account} verwijderd.` });
  };

  return (
    <div className="logbook">
      <header className="page-head">
        <h2>Logboek</h2>
        <p className="page-sub">
          Elke keer dat je vernieuwt en er iets veranderd is, bewaart de app een snapshot van je XP en quest points.
          {mine.length > 0 && <> Er {mine.length === 1 ? "is" : "zijn"} {mine.length} {mine.length === 1 ? "snapshot" : "snapshots"} van {account}, de laatste van {fmtDate(last.ts)}.</>}
        </p>
      </header>

      <section className="log-section panel" aria-labelledby="gain-title">
        <h3 id="gain-title">XP-winst</h3>
        {mine.length === 0 ? (
          <p className="empty-line">Nog geen snapshots van {account}. Klik op Vernieuwen om de eerste te bewaren.</p>
        ) : mine.length === 1 ? (
          <p className="empty-line">
            De eerste snapshot staat er sinds {fmtDate(last.ts)}. Speel een sessie en klik daarna op Vernieuwen: dan zie je hier wat je gewonnen hebt.
          </p>
        ) : (
          <GainTable
            prev={prev}
            week={week}
            weekLabel={b7?.full ? `Sinds 7 dagen (${fmtDate(b7.base.ts)})` : `Sinds eerste snapshot (${b7 ? fmtDate(b7.base.ts) : "-"})`}
          />
        )}
      </section>

      <section className="log-section panel" aria-labelledby="hist-title">
        <h3 id="hist-title">Alle snapshots</h3>
        <HistoryView account={account} snapshots={snapshots} />
      </section>

      <section className="log-section panel" aria-labelledby="data-title">
        <h3 id="data-title">Gegevens bewaren</h3>
        <p className="muted">
          Alles staat alleen in deze browser, ook je notities bij stappen en het weekritme ({snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"} in totaal, maximaal {MAX_SNAPSHOTS}). Download af en toe een back-up.
        </p>
        <div className="data-actions">
          <button type="button" className="btn" onClick={doExport}>Download back-up</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Zet back-up terug</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button type="button" className="btn btn-danger" onClick={clearMine} disabled={!mine.length}>Verwijder snapshots van {account}</button>
        </div>
        {msg && <p className={msg.ok ? "result ok" : "result fail"} role="status">{msg.text}</p>}
      </section>
    </div>
  );
}

function GainTable({ prev, week, weekLabel }: { prev: SnapDiff | null; week: SnapDiff | null; weekLabel: string }) {
  if (!prev || !week) return null;
  const cell = (n: number) => <td className={n ? "num gain" : "num"}>{n ? fmtSigned(n) : <Nil label="geen winst" />}</td>;
  const rows = prev.perSkill.map((p, i) => ({ p, w: week.perSkill[i] }));
  const moved = rows.filter((r) => r.p.xp !== 0 || r.w.xp !== 0);
  const still = rows.length - moved.length;
  return (
    <div className="table-wrap">
      <table className="gains data">
        <thead>
          <tr>
            <th scope="col">Skill</th>
            <th scope="col" className="num">Sinds vorige ({fmtDate(prev.from.ts)})</th>
            <th scope="col" className="num">{weekLabel}</th>
          </tr>
        </thead>
        <tbody>
          {moved.map(({ p, w }) => (
            <tr key={p.skill}>
              <th scope="row">{p.skill}</th>
              {cell(p.xp)}
              {cell(w.xp)}
            </tr>
          ))}
          {still > 0 && (
            <tr className="quiet-row">
              <td colSpan={3}>{still} skills zonder XP-winst in deze periodes.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Totaal XP</th>
            <td className="num">{fmtSigned(prev.totalXp)}</td>
            <td className="num">{fmtSigned(week.totalXp)}</td>
          </tr>
          <tr>
            <th scope="row">Quest points</th>
            <td className="num">{prev.qp === null ? <Nil /> : fmtSigned(prev.qp)}</td>
            <td className="num">{week.qp === null ? <Nil /> : fmtSigned(week.qp)}</td>
          </tr>
          <tr>
            <th scope="row">Stand nu</th>
            <td className="num" colSpan={2}>{fmt(prev.to.totalXp)} XP en {fmt(prev.to.qp)} quest points</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
