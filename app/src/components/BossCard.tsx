import type { Boss, BossDrop } from "../lib/bosses";
import { Icon } from "./ui";

/** "2026-11-03" wordt "3 november 2026". */
export function checkedText(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const DROP_TIERS: { key: keyof Boss["drops"]; label: string }[] = [
  { key: "progress", label: "Nodig voor progressie" },
  { key: "useful", label: "Handig" },
  { key: "rest", label: "De rest" },
];

function DropList({ drops }: { drops: BossDrop[] }) {
  return (
    <ul className="boss-drops">
      {drops.map((d) => (
        <li key={d.item}>
          <span className="drop-item">{d.item}</span>
          {d.rate && <span className="drop-rate">{d.rate}</span>}
          {d.note && <span className="drop-note">{d.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Volledige, uitklapbare bosskaart onder een stap in de Route-tab. */
export function BossCard({ boss, open }: { boss: Boss; open?: boolean }) {
  return (
    <details className="boss-card" open={open || undefined}>
      <summary>
        <Icon name="boss" />
        <span className="boss-card-title">Bosskaart: {boss.name}</span>
        {boss.location && <span className="boss-card-loc">{boss.location}</span>}
      </summary>
      <div className="boss-body">
        <p className="boss-summary">{boss.summary}</p>

        <section className="boss-sec">
          <h4>Eisen</h4>
          <ul>{boss.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>

        <section className="boss-sec">
          <h4>Gear voor een Necromancy-ironman</h4>
          <dl className="boss-gear">
            {boss.ironmanGear.map((g) => (
              <div key={g.slot}>
                <dt>{g.slot}</dt>
                <dd>
                  <span className="gear-item">{g.item}</span>
                  <span className="gear-how">{g.how}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="boss-sec">
          <h4>Mechanics</h4>
          <ol className="boss-mech">{boss.mechanics.map((m) => <li key={m}>{m}</li>)}</ol>
        </section>

        <section className="boss-sec">
          <h4>Drops voor een ironman</h4>
          <div className="boss-drop-tiers">
            {DROP_TIERS.filter((t) => boss.drops[t.key].length > 0).map((t) => (
              <div key={t.key} className={`drop-tier tier-${t.key}`}>
                <h5>{t.label}</h5>
                <DropList drops={boss.drops[t.key]} />
              </div>
            ))}
          </div>
        </section>

        {boss.uncertain && boss.uncertain.length > 0 && (
          <section className="boss-sec boss-uncertain">
            <h4>Onzeker</h4>
            <ul>{boss.uncertain.map((u) => <li key={u}>{u}</li>)}</ul>
          </section>
        )}

        <p className="sources">
          Gecontroleerd op runescape.wiki op {checkedText(boss.checked)}:{" "}
          {boss.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ", "}
              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
            </span>
          ))}
        </p>
      </div>
    </details>
  );
}

/** Korte bosskaart op de perkamentkaart (Vanavond). */
export function BossBrief({ boss, onOpen }: { boss: Boss; onOpen: () => void }) {
  const progress = boss.drops.progress;
  return (
    <div className="boss-brief">
      <p className="sheet-label boss-brief-title"><Icon name="boss" />Bosskaart: {boss.name}</p>
      <p>{boss.summary}</p>
      <ul className="boss-brief-mech">
        {boss.mechanics.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
      </ul>
      {progress.length > 0 && (
        <p className="boss-brief-drops">
          <span className="sheet-label">Waar je voor komt:</span>{" "}
          {progress.map((d) => (d.rate ? `${d.item} (${d.rate})` : d.item)).join(", ")}
        </p>
      )}
      <button type="button" className="linklike" onClick={onOpen}>Volledige bosskaart met eisen, gear en drops</button>
    </div>
  );
}
