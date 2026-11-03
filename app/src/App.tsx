import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { combatLevel, fetchAccount, type AccountData } from "./lib/api";
import { loadRoute, makeContext, type LoadedRoute } from "./lib/route";
import { addSnapshot, fmtDate, toSnapshot, type Snapshot } from "./lib/snapshots";
import { fmt } from "./lib/skills";
import { KEYS, load, save } from "./lib/storage";
import Dashboard from "./components/Dashboard";
import RouteView from "./components/RouteView";
import SkillsView from "./components/SkillsView";
import QuestsView from "./components/QuestsView";
import LogbookView from "./components/LogbookView";
import { HelmMark, Icon, Notice } from "./components/ui";

const TABS = [
  ["vanavond", "Vanavond"],
  ["route", "Route"],
  ["skills", "Skills"],
  ["quests", "Quests"],
  ["logboek", "Logboek"],
] as const;
type Tab = (typeof TABS)[number][0];

// Oude tabnamen (voor de herindeling) wijzen naar hun nieuwe plek.
const LEGACY_TAB: Record<string, Tab> = { dashboard: "vanavond", snapshots: "logboek", history: "logboek" };
function initialTab(): Tab {
  const t = load<string>(KEYS.tab, "vanavond");
  if (TABS.some(([id]) => id === t)) return t as Tab;
  return LEGACY_TAB[t] ?? "vanavond";
}

const DEFAULT_ACCOUNT = "Ons Pap";

/** Vertaalt een foutmelding uit de API-laag naar wat er mis is en wat je kunt doen. */
function explain(msg: string, account: string): { title: string; hint: string } {
  if (/niet gevonden|NO_PROFILE|geen profiel/i.test(msg))
    return {
      title: `Account "${account}" niet gevonden`,
      hint: "Controleer de spelling via Ander account. Alleen Ironman-accounts staan op deze hiscores.",
    };
  if (/privé/i.test(msg))
    return {
      title: "Het RuneMetrics-profiel staat op privé",
      hint: "Zet RuneMetrics in de game op openbaar en klik daarna op Vernieuwen. Zonder dat profiel ontbreken quests en activiteiten.",
    };
  if (/HTTP 5|fetch|network/i.test(msg))
    return {
      title: "De RuneScape-servers geven nu geen antwoord",
      hint: "Probeer het over een paar minuten opnieuw. De app werkt alleen via npm run dev, omdat de proxy daar zit.",
    };
  return { title: "Gegevens ophalen mislukt", hint: "Probeer opnieuw te vernieuwen. Blijft het misgaan, controleer dan de accountnaam." };
}

export default function App() {
  const [account, setAccount] = useState<string>(() => load(KEYS.account, DEFAULT_ACCOUNT));
  const [accountInput, setAccountInput] = useState(account);
  const [data, setData] = useState<AccountData | null>(() => {
    const d = load<AccountData | null>(KEYS.lastData, null);
    return d && d.account === account ? d : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => load(KEYS.snapshots, []));
  const [manual, setManual] = useState<Record<string, boolean>>(() => load(KEYS.manual, {}));
  const [route, setRoute] = useState<LoadedRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [focusStep, setFocusStep] = useState<{ id: string; n: number; boss?: boolean } | null>(null);
  const switchRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => save(KEYS.tab, tab), [tab]);
  useEffect(() => save(KEYS.manual, manual), [manual]);

  useEffect(() => {
    loadRoute().then(setRoute, (e) => setRouteError(e instanceof Error ? e.message : String(e)));
  }, []);

  const updateSnapshots = useCallback((list: Snapshot[]) => {
    setSnapshots(list);
    save(KEYS.snapshots, list);
  }, []);

  const inflight = useRef(false);
  const refresh = useCallback(async (name: string) => {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const d = await fetchAccount(name);
      setData(d);
      save(KEYS.lastData, d);
      // localStorage is de bron van waarheid voor snapshots; zo blijft deze callback zuiver.
      const { list, added } = addSnapshot(load<Snapshot[]>(KEYS.snapshots, []), toSnapshot(d));
      if (added) updateSnapshots(list);
      else setInfo("Niets veranderd sinds de vorige snapshot, dus er is geen nieuwe bewaard.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, [updateSnapshots]);

  // Eerste keer automatisch ophalen als er nog niets in de cache staat.
  useEffect(() => {
    if (!data) void refresh(account);
  }, [account]);

  const changeAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = accountInput.trim();
    if (!name || name === account) return;
    setAccount(name);
    save(KEYS.account, name);
    setData(null);
    setError(null);
    setInfo(null);
    if (switchRef.current) switchRef.current.open = false;
  };

  const ctx = useMemo(() => makeContext(data?.skills ?? null, data?.quests ?? null, manual), [data, manual]);
  const toggleManual = (id: string) => setManual((m) => ({ ...m, [id]: !m[id] }));

  const openStep = (id: string, opts?: { boss?: boolean }) => {
    setFocusStep((f) => ({ id, n: (f?.n ?? 0) + 1, boss: opts?.boss }));
    setTab("route");
  };

  const reloadFromStorage = () => {
    setSnapshots(load(KEYS.snapshots, []));
    setManual(load(KEYS.manual, {}));
    const acc = load(KEYS.account, DEFAULT_ACCOUNT);
    setAccount(acc);
    setAccountInput(acc);
    const d = load<AccountData | null>(KEYS.lastData, null);
    setData(d && d.account === acc ? d : null);
  };

  const openSwitch = () => {
    if (!switchRef.current) return;
    switchRef.current.open = true;
    document.getElementById("account-input")?.focus();
  };

  const p = data?.profile;
  const name = p?.name ?? account;
  const err = error ? explain(error, account) : null;
  const totalLevel = data
    ? Math.max(p?.totalskill ?? 0, data.overall?.level ?? 0, data.skills.reduce((a, s) => a + s.level, 0))
    : 0;

  return (
    <div className="app">
      <header className="masthead">
        <div className="ident">
          <HelmMark />
          <div className="ident-text">
            <h1>{name}</h1>
            {data ? (
              <dl className="ident-facts">
                <div className="ident-mode"><dt className="sr-only">Spelmodus</dt><dd>Ironman</dd></div>
                <div><dt>combat</dt><dd>{fmt(p?.combatlevel ?? combatLevel(data.skills))}</dd></div>
                <div><dt>totaal level</dt><dd>{fmt(totalLevel)}</dd></div>
                {data.questPoints !== null && <div><dt>quest points</dt><dd>{fmt(data.questPoints)}</dd></div>}
              </dl>
            ) : (
              <p className="ident-sub">Ironman-voortgang en planning</p>
            )}
          </div>
        </div>

        <div className="controls">
          <div className="refresh">
            <button type="button" className={`btn btn-gold btn-refresh${loading ? " is-loading" : ""}`} onClick={() => refresh(account)} disabled={loading}>
              <Icon name="refresh" />
              {loading ? "Bezig met ophalen" : "Vernieuwen"}
            </button>
            <p className="updated" aria-live="polite">
              {data ? <>Bijgewerkt {fmtDate(data.fetchedAt)}</> : loading ? "Gegevens worden opgehaald" : "Nog niet opgehaald"}
            </p>
          </div>
          <details className="account-switch" ref={switchRef}>
            <summary>Ander account</summary>
            <form onSubmit={changeAccount}>
              <label htmlFor="account-input">Accountnaam</label>
              <div className="account-row">
                <input id="account-input" value={accountInput} onChange={(e) => setAccountInput(e.target.value)} autoComplete="off" />
                <button type="submit" className="btn" disabled={!accountInput.trim() || accountInput.trim() === account}>
                  Wissel
                </button>
              </div>
            </form>
          </details>
        </div>
      </header>

      <nav className="tabs" aria-label="Onderdelen">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className="tab" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="notices">
        {err && (
          <Notice
            tone="error"
            title={err.title}
            action={
              <>
                <button type="button" className="btn" onClick={() => refresh(account)} disabled={loading}>Opnieuw proberen</button>
                <button type="button" className="btn" onClick={openSwitch}>Ander account kiezen</button>
              </>
            }
          >
            <p>{err.hint}</p>
            <p className="notice-raw">Melding: {error}</p>
          </Notice>
        )}
        {data && data.errors.length > 0 && (
          <Notice tone="warn" title="Een deel van de gegevens ontbreekt">
            {data.errors.map((e) => (
              <p key={e}>{explain(e, account).hint} <span className="notice-raw">({e})</span></p>
            ))}
          </Notice>
        )}
        {info && <p className="quiet-info" role="status">{info}</p>}
      </div>

      <main key={tab} className="tab-panel">
        {tab === "vanavond" && (
          <Dashboard
            account={account}
            data={data}
            loading={loading}
            failed={!!error}
            route={route}
            routeError={routeError}
            ctx={ctx}
            snapshots={snapshots}
            refresh={() => refresh(account)}
            openStep={openStep}
            toggleManual={toggleManual}
          />
        )}
        {tab === "route" && (
          <RouteView
            route={route}
            routeError={routeError}
            ctx={ctx}
            quests={data?.quests ?? null}
            toggleManual={toggleManual}
            hasData={!!data}
            focusStep={focusStep}
          />
        )}
        {tab === "skills" && <SkillsView data={data} route={route} ctx={ctx} snapshots={snapshots} refresh={() => refresh(account)} loading={loading} />}
        {tab === "quests" && <QuestsView quests={data?.quests ?? null} route={route?.route ?? null} hasData={!!data} />}
        {tab === "logboek" && (
          <LogbookView account={account} snapshots={snapshots} setSnapshots={updateSnapshots} onImported={reloadFromStorage} />
        )}
      </main>
    </div>
  );
}
