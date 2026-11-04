import type { AccountData } from "../lib/api";
import { nextStep, type EvalContext, type LoadedRoute } from "../lib/route";
import { baseFor7Days, diff, forAccount, type Snapshot } from "../lib/snapshots";
import type { SkillRow } from "../lib/api";
import { fmt, fmtSigned, maxLevel, progressFor, XP_TABLE } from "../lib/skills";
import { Bar, Icon, Nil } from "./ui";

// Indeling zoals de RS3-wiki: combat, verzamelen (gathering), ambacht (artisan), ondersteuning (support).
const GROUPS: { id: string; icon: string; title: string; skills: string[] }[] = [
  { id: "combat", icon: "combat", title: "Combat", skills: ["Attack", "Strength", "Defence", "Constitution", "Ranged", "Magic", "Necromancy", "Prayer", "Summoning"] },
  { id: "gather", icon: "gather", title: "Verzamelen", skills: ["Mining", "Fishing", "Woodcutting", "Farming", "Hunter", "Divination", "Archaeology"] },
  { id: "artisan", icon: "artisan", title: "Ambacht", skills: ["Smithing", "Crafting", "Fletching", "Construction", "Firemaking", "Herblore", "Runecrafting", "Cooking", "Invention"] },
  { id: "support", icon: "support", title: "Ondersteuning", skills: ["Agility", "Thieving", "Slayer", "Dungeoneering"] },
];

interface Props {
  data: AccountData | null;
  route: LoadedRoute | null;
  ctx: EvalContext;
  snapshots: Snapshot[];
  refresh: () => void;
  loading: boolean;
}

export default function SkillsView({ data, route, ctx, snapshots, refresh, loading }: Props) {
  if (!data)
    return (
      <section className="empty">
        <h2>Nog geen skills opgehaald</h2>
        <p>Haal de gegevens op om levels, XP en de afstand tot je volgende level te zien.</p>
        {!loading && <button type="button" className="btn btn-gold" onClick={refresh}>Gegevens ophalen</button>}
      </section>
    );

  const mine = forAccount(snapshots, data.account);
  const prevDiff = mine.length >= 2 ? diff(mine[mine.length - 2], mine[mine.length - 1]) : null;
  const b7 = baseFor7Days(mine);
  const weekDiff = b7 && mine.length >= 2 ? diff(b7.base, mine[mine.length - 1]) : null;

  // Doelen van de huidige fase, zodat je ziet welke skills nu tellen.
  const next = route ? nextStep(route.route, ctx) : null;
  const targets = new Map((next?.phase.targets ?? []).map((t) => [t.skill, t.level]));

  // Skills met een fasedoel krijgen een eigen groep bovenaan; de rest staat in de vaste RS3-groepen.
  const byName = new Map(data.skills.map((s) => [s.name as string, s]));
  const pick = (names: string[]) => names.map((n) => byName.get(n)).filter((s): s is SkillRow => !!s);
  const goalRows = (next?.phase.targets ?? []).map((t) => byName.get(t.skill)).filter((s): s is SkillRow => !!s);
  const placed = new Set(goalRows.map((s) => s.name as string));
  const known = new Set(GROUPS.flatMap((g) => g.skills));
  const sections = [
    ...(goalRows.length ? [{ id: "goal", icon: "goal", title: "Doelen van deze fase", rows: goalRows }] : []),
    ...GROUPS.map((g) => ({ ...g, rows: pick(g.skills).filter((s) => !placed.has(s.name)) })),
    { id: "other", icon: "misc", title: "Overig", rows: data.skills.filter((s) => !known.has(s.name) && !placed.has(s.name)) },
  ].filter((g) => g.rows.length > 0);

  return (
    <section>
      <header className="page-head">
        <h2>Skills</h2>
        <p className="page-sub">
          {targets.size > 0 ? <>Skills met een fasedoel staan bovenaan, met het level dat deze fase vraagt. </> : null}
          XP-winst komt uit je snapshots{mine.length < 2 ? "; na twee keer vernieuwen verschijnt die hier" : ""}.
        </p>
      </header>
      <div className="table-wrap">
        <table className="skills data">
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col" className="num">Level</th>
              <th scope="col" className="col-prog">Naar volgend level</th>
              <th scope="col" className="num">XP</th>
              <th scope="col" className="num">Sinds vorige</th>
              <th scope="col" className="num" title={b7 && !b7.full ? "Nog geen 7 dagen aan snapshots: sinds de eerste" : undefined}>
                {b7 && !b7.full ? "Sinds eerste" : "Sinds 7 dagen"}
              </th>
              <th scope="col" className="num col-rank">Rank</th>
            </tr>
          </thead>
          {sections.map((g) => (
            <tbody key={g.id} className={`skill-group sg-${g.id}`}>
              <tr className="group-row">
                <th scope="rowgroup" colSpan={7}>
                  <span className="group-title">
                    <Icon name={g.icon} />
                    {g.title}
                  </span>
                  <span className="group-sum">
                    {g.id === "goal"
                      ? `${g.rows.filter((s) => s.level >= (targets.get(s.name) ?? 0)).length} van ${g.rows.length} gehaald`
                      : `samen level ${fmt(g.rows.reduce((a, s) => a + s.level, 0))}`}
                  </span>
                </th>
              </tr>
              {g.rows.map((s) => {
                const pr = progressFor(s.name, s.xp);
                const dPrev = prevDiff?.perSkill.find((x) => x.skill === s.name)?.xp ?? 0;
                const dWeek = weekDiff?.perSkill.find((x) => x.skill === s.name)?.xp ?? 0;
                const goal = targets.get(s.name);
                const goalMet = goal !== undefined && s.level >= goal;
                const goalXp = goal !== undefined ? XP_TABLE[goal] : 0;
                return (
                  <tr key={s.name} className={goal ? (goalMet ? "goal goal-met" : "goal") : undefined}>
                    <th scope="row">
                      {s.name}
                      {s.source === "runemetrics" && <span className="src-mark" title="XP uit RuneMetrics, recenter dan de hiscores">*</span>}
                      {s.source === "plugin" && <span className="src-mark" title="XP uit de plugin-snapshot, recenter dan de hiscores">*</span>}
                      {goal && <span className="goal-tag">doel {goal}</span>}
                    </th>
                    <td className="num lvl">{s.level}<span className="of">/{maxLevel(s.name)}</span></td>
                    <td className="col-prog">
                      {pr.maxed ? <span className="maxed">maximaal</span> : goal && !goalMet ? (
                        <span className="prog">
                          <Bar
                            fraction={s.xp / goalXp}
                            mark={XP_TABLE[pr.nextLevel ?? s.level] / goalXp}
                            label={`${Math.round((s.xp / goalXp) * 100)}% van de XP voor doel ${goal}; de markering is level ${pr.nextLevel}`}
                            className="bar-gold bar-goal"
                          />
                          <span className="prog-text">nog {fmt(goalXp - s.xp)} XP tot doel {goal}, {fmt(pr.xpToNext)} tot level {pr.nextLevel}</span>
                        </span>
                      ) : (
                        <span className="prog">
                          <Bar fraction={pr.fraction} label={`${Math.round(pr.fraction * 100)}% naar level ${pr.nextLevel}`} className={goalMet ? "bar-moss" : "bar-gold"} />
                          <span className="prog-text">nog {fmt(pr.xpToNext)} XP</span>
                        </span>
                      )}
                    </td>
                    <td className="num">{fmt(s.xp)}</td>
                    <td className={dPrev ? "num gain" : "num"}>{dPrev ? fmtSigned(dPrev) : <Nil label="geen winst" />}</td>
                    <td className={dWeek ? "num gain" : "num"}>{dWeek ? fmtSigned(dWeek) : <Nil label="geen winst" />}</td>
                    <td className="num col-rank">{s.rank ? fmt(s.rank) : <Nil label="geen rank" />}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="footnote">
        * XP uit RuneMetrics, die vaak voorloopt op de hiscores. De rank komt altijd van de Ironman-hiscores. Invention gebruikt hier de standaard XP-curve.
      </p>
    </section>
  );
}
