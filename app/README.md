# RS3 Ironman Tracker

Lokale tracker- en planningsapp voor het RS3 Ironman-account "Ons Pap". Vite + React + TypeScript, geen backend.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
```

Overige scripts: `npm run build` (typecheck + productiebuild), `npm run typecheck`, `npm test` (vitest).
Vanuit Claude Code start `.claude/launch.json` (configuratie `rs3-tracker`) dezelfde dev-server.

## Indeling

Vijf tabs (de laatst gekozen tab wordt onthouden; oude waarden `dashboard`, `snapshots` en `history` worden omgezet):

- **Vanavond**: de volgende stap als perkamenten opdrachtbrief (soort, actief/AFK, tijd, locatie, wat nog nodig is,
  je eigen notitie, een korte bosskaart als de stap een boss is, afvinken met ongedaan maken), daaronder het
  Weekritme, de huidige fase met doelen, het spoor van alle fases naar combat-klaar
  (etappes schalen met de geschatte uren, met een weekschatting bij 7-15 uur per week), de stappen daarna met
  een alternatief in de andere speelstijl, recente activiteiten en kerngetallen.
- **Route**: alle fases als uitklapbare secties (huidige fase open) met "x van y stappen (z%)" naast de urenbalk,
  stappen aan een tijdlijn met vinkjes, locatieregel, notitieveld, markdown-details, bosskaarten, bronnen en
  contractwaarschuwingen. "Bekijk in de route" op Vanavond springt naar de stap.
- **Skills**: de skilltabel (stond eerst op het dashboard), met de doelen van de huidige fase bovenaan.
- **Quests**: zoeken en filteren op status, eisen gehaald en route; per quest een link naar de Quick guide op de RS3-wiki (of de wikipagina).
- **Logboek**: XP-winst, alle snapshots (voorheen Snapshots en Geschiedenis) en back-up downloaden/terugzetten.

Componenten: `src/components/` (`Dashboard`, `WeekRhythm`, `BossCard`, `RouteTrail`, `RouteView`, `SkillsView`,
`QuestsView`, `LogbookView`, `HistoryView`, gedeelde stukjes in `ui.tsx`, waaronder `LocationLine` en de lijntekens
`place`, `note`, `boss` en `week`). Logica in `src/lib/`: `route`, `repeatables`, `bosses`, `storage`, `snapshots`,
`skills`, `api`, `questLinks`.

## Thema

Eén donker thema, "kaarttafel": leisteen `#17202A` als ondergrond, één perkamenten vlak (`#EBDFC4`, inkt
`#2A2016`) voor de volgende stap, RS3-goud `#D6AE5C` voor spoor, focus en huidige positie. Speelstijl heeft
kleur en vorm: smidsvuur `#E58C5A` met een ruit voor actief, maanlicht `#8DB4D8` met een open cirkel voor AFK.
Lettertypes: Alegreya (koppen) en Alegreya Sans (tekst en tabellen) via Google Fonts in `index.html`, met
Georgia en systeemfonts als fallback. Alle kleuren, radii (`--r-*`), afstanden (`--s1` t/m `--s5`) en de
maximale breedte (`--max`, 1160 px) zijn tokens bovenaan `src/styles.css`.

Atmosfeer: de tafel krijgt lamplicht van boven (`--lamp`), een donkere rand (`--slate-edge`), een heel fijne
korrel en vage hoogtelijnen achter de kop. Inhoud ligt op panelen (`.panel`: `--slate-raised` met een verloop en
een dunne lichte bovenrand `--edge-light`, geen schaduwwolk). De kop toont het helm-merkteken (`HelmMark` in
`ui.tsx`, gelijk aan de favicon), de accountnaam en combat, totaal level en QP als feitenrij. De tabbalk is een
verdiepte goot met het actieve tabblad opgetild en goud onderstreept. Skills staan gegroepeerd (fasedoelen,
combat, verzamelen, ambacht, ondersteuning) met eigen lijntekens (`Icon` in `ui.tsx`); balken naar een fasedoel
dragen een markering voor het volgende level. Lege cellen tonen een kort lijntje (`Nil`), queststatus is een
pill. In de route zijn fases panelen, krijgt de volgende stap een gouden rail en is de meta per stap een rij
badges. Het spoor op Vanavond vult naar rato van gedane uren.

Responsive tot telefoonbreedte (het spoor wordt dan verticaal). Beweging (tabwissel, afvinkmoment, spoor,
draaiende vernieuwknop) staat uit bij `prefers-reduced-motion`.

## Proxy (vite.config.ts)

De RuneScape-API's sturen geen CORS-headers, dus de browser praat via de Vite dev-server:

| App-pad | Doorgestuurd naar |
| --- | --- |
| `/api/hiscore/m=hiscore_ironman/index_lite.ws?player=ons%20pap` | `https://secure.runescape.com/m=hiscore_ironman/index_lite.ws?...` |
| `/api/runemetrics/profile/profile?user=ons%20pap&activities=20` | `https://apps.runescape.com/runemetrics/profile/profile?...` |
| `/api/runemetrics/quests?user=ons%20pap` | `https://apps.runescape.com/runemetrics/quests?...` |

De proxy bestaat alleen in `npm run dev` (en niet in `vite preview` of een statische build).

Skills: per skill wint de bron met de meeste XP (RuneMetrics loopt vaak voor op de hiscores); de rank komt altijd
van de Ironman-hiscores. QP = som van `questPoints` van voltooide quests uit de questlijst (live of terugval, zie hieronder).

## Ontvangstpunt voor de plugin (dev-server)

De in-game plugin `../plugin/ons-pap-sync` (prototype, zie `../plugin/README.md`) post naar de dev-server. Een kleine
Vite-plugin in `vite.config.ts` hangt de handler uit `src/server/pluginInbox.ts` (alleen Node, niet in de app-bundel)
aan de middleware:

| Pad | Wat |
| --- | --- |
| `POST /api/plugin/sync` | Controleert `v` (1), `account` en de `skills`-array, schrijft `.plugin/latest.json` en voegt de events toe aan `.plugin/events.jsonl` (een JSON-regel per event). Een bundel zonder quests houdt de laatst ontvangen questlijst. |
| `GET /api/plugin/latest` | De laatste snapshot (met `receivedAt` en `questsAt`), of 404. |

Andere methodes krijgen een 405, een te grote body een 413, een POST met een `Origin` van een andere site dan
localhost een 403. `app/.plugin/` staat in `.gitignore`. Het ontvangstpunt bestaat alleen in `npm run dev`.

In de app is de plugin een derde bron naast hiscores en RuneMetrics (`fetchPluginSnapshot` in `src/lib/api.ts`,
alleen in de dev-server; ontbreekt het endpoint, dan wordt de bron stil overgeslagen). Skills: hoogste XP wint, bron
`plugin` (sterretje in de Skills-tab). Quests: alleen als de questbron niet live is en de snapshot nieuwer is; dan
legt de app de status van de plugin over de laatst bekende lijst en is `questsSource.kind` `plugin`. Heeft de plugin
iets aangevuld, dan staat in de melding "Plugin-snapshot van <tijd>". Komt de XP van de plugin in tienden (zoals bij
RuneMetrics), dan herkent de app dat aan de levels en deelt hij door 10.

## Stop van RuneMetrics en de terugval

Jagex zet de RuneMetrics- en Adventurer's Log-API op 10 november 2026 uit (`../research/API en plugins.md`). De
ironman-hiscores blijven werken. De app vangt dat op in `fetchAccount` (`src/lib/api.ts`):

- Elke fout van RuneMetrics telt mee: HTTP-fout, doorverwijzing (de app volgt die niet, `redirect: "manual"`),
  een antwoord dat geen JSON is of een netwerkfout.
- **Quests**: de laatst bekende lijst, uit `rs3t:lastData` of anders de meegeleverde `src/data/quests-snapshot.json`
  (alleen voor het account in dat bestand). Is de meegeleverde lijst nieuwer dan de opslag, dan wint die. QP komt uit
  dezelfde lijst. Nieuwe quests vink je zelf af in de Route-tab (handmatig vinkje wint altijd).
- **Profiel**: het laatst bekende profiel voor activiteiten; combat is dan nooit lager dan wat de hiscores opleveren.
  Zonder opgeslagen profiel berekent `combatLevel(skills)` combat uit de hiscores. De RuneMetrics-rank toont alleen live.
- **Skills**: de hiscores, met het laatst bekende profiel als ondergrens (XP daalt nooit), zodat het Logboek geen
  negatieve winst toont zolang de hiscores nog achterlopen.
- `AccountData.questsSource` (`live`, `cached`, `bundled`) en `profileSource` (`live`, `cached`, `computed`) zeggen
  waar het vandaan komt, met `at` = de datum van die stand. Fouten van RuneMetrics staan in `sourceErrors`, niet in
  `errors`, dus Vernieuwen voelt niet als mislukt zolang de hiscores lukken.
- De app toont dan één rustige melding (`fallbackNotice`), bijvoorbeeld "RuneMetrics is gestopt (10 november 2026).
  Queststatus van 8 november 2026 uit de laatste opslag; skills en XP komen live van de hiscores." Zolang RuneMetrics
  werkt, is er geen melding en verandert er niets.

Meegeleverde questlijst verversen (vanuit de projectmap). Het script pakt de nieuwste
`research/snapshots/<datum> runemetrics quests.json`, of een opgegeven bestand in dezelfde vorm (`{"quests": [...]}`,
bijvoorbeeld een omgezette export uit de nieuwe API), en zet `fetchedAt` op de datum uit de bestandsnaam:

```bash
python -I research/scripts/update_quest_snapshot.py
python -I research/scripts/update_quest_snapshot.py "research/snapshots/<datum> runemetrics quests.json" --account "Ons Pap"
```

**Nieuwe API.** Profiel en quests lopen via één bron, `ACCOUNT_SOURCE` in `src/lib/api.ts` (nu `runeMetricsSource`).
Zodra de nieuwe web-API op developer.runescape.com gedocumenteerd is: een proxyregel in `vite.config.ts` toevoegen
(de enige plek met de host), `fetchProfileV2` en `fetchQuestsV2` schrijven die naar `Profile` en `Quest` vertalen, en
`ACCOUNT_SOURCE` omzetten. De terugval blijft daarna gewoon werken.

## Route

De route komt uit `src/data/route.json` (contract: `../research/ROUTE-SCHEMA.md`, geleverd door de research).
`src/lib/route.ts` laadt via `import.meta.glob` lazy `src/data/route.json`; ontbreekt dat bestand of is het
ongeldig, dan valt de app terug op `src/data/route.example.json` en toont een melding. De Route-tab toont ook
contractwaarschuwingen (onbekende skill- of questnamen, dubbele id's, onbekende bron-id's).

- Stappen met `completeWhen` worden automatisch afgevinkt tegen live levels en queststatus.
- Elke stap kun je ook handmatig afvinken (localStorage, per stap-id). Een handmatig vinkje wint altijd, ook bij een stap met `completeWhen`; dat vangt op dat RuneMetrics achterloopt of een quest anders kent (bijv. Rune Mysteries naast Rune Mythos).
- Niet gehaalde `requires` geeft "nog niet beschikbaar".
- "Volgende stap" = eerste niet-afgevinkte stap waarvan de `requires` gehaald zijn.

## Locatie, notities en bosskaarten

- **Locatie**: optioneel veld `location` per stap in `route.json` (korte plaatsnaam). Staat als vaste regel met een
  plaatsteken op de stapkaart en op de perkamentkaart; zonder veld geen regel.
- **Notities**: per stap een uitklapbaar veld "Notitie" in de Route-tab, opgeslagen onder `rs3t:note:<stap-id>`
  (JSON-string; leeg = sleutel weg). Een stap met notitie krijgt een klein notitieteken; de notitie van de volgende
  stap staat ook op de perkamentkaart.
- **Bosskaarten**: `src/data/bosses.json` (Ivar p2-09, K'ril Tsutsaroth p6-04, Vindicta p6-07; Queen Black Dragon
  staat erin met lege `stepIds` omdat die stap is uitgesteld tot Herblore omhoog gaat). Per boss
  `boss` (id), `name`, `stepIds`, `location`, `checked` (datum van de wikicontrole), `summary`, `requirements`,
  `ironmanGear` (`slot`, `item`, `how`), `mechanics` (maximaal 6), `drops` (`progress`, `useful`, `rest`, elk met
  `item`, optioneel `rate` en `note`), `uncertain` en `sources`. De koppeling loopt via `stepIds`, dus `route.json`
  hoeft niet te veranderen. Onbekende stap-id's verschijnen bij de contractwaarschuwingen in de Route-tab.
  Alles is gecontroleerd op runescape.wiki (nooit OSRS); wat onzeker bleef, staat in `uncertain` en op de kaart.

## Questgidsen

`src/data/quest-links.json`: per RuneMetrics-quest (sleutel = de titel zoals RuneMetrics hem geeft) `wiki` (questpagina) en,
als die bestaat, `quickGuide` (`<pagina>/Quick_guide`), plus `checked` (controledatum), `source` (snapshot) en `mapped`
(titels die anders heten op de wiki). Alleen runescape.wiki, nooit OSRS. `src/lib/questLinks.ts` levert
`questLink(title)` (`{wiki, quickGuide?}`; een onbekende titel krijgt alleen de wikipagina volgens het naampatroon),
`wikiUrl`, `quickGuideUrl` en `stepQuests(step)`. De Quests-tab toont per rij "Quick guide" of "Wiki"; stappen met
quests in `completeWhen.quests` of `requires.quests` krijgen in de Route-tab en op de perkamentkaart een regel
"Questgids" met per quest een link. Alle links openen in een nieuw tabblad.

Verversen (bijvoorbeeld na een nieuwe RuneMetrics-snapshot met nieuwe quests), vanuit de projectmap:

```bash
python -I research/scripts/build_quest_links.py "research/snapshots/<datum> runemetrics quests.json"
```

Het script controleert de pagina's in batches van 50 via `https://runescape.wiki/api.php?action=query` (met
redirects) en meldt titels zonder wikipagina; die vul je aan in `MAPPING` bovenin het script.

## Weekritme

`src/data/repeatables.json`, stand na de DailyScape Overhaul (16 maart 2026). Velden: `id`, `title`,
`period` (`daily`, `weekly`, `monthly`), `detail`, `wikiUrl`, optioneel `stop` (stoppunt), `unlockedBy` (stap-id),
`dayOfWeek` (0 = zondag, 3 = woensdag) en `optional`.

- Afvinken bewaart het tijdstip onder `rs3t:repeat:<id>` (ms sinds 1970). Een item is gedaan als dat tijdstip op of
  na de laatste reset ligt; daarna vervalt het vinkje vanzelf.
- Resets in UTC (RS3-tijd): dagelijks 00:00, wekelijks woensdag 00:00, maandelijks de 1e om 00:00. De pure functies
  staan in `src/lib/repeatables.ts` (`lastReset`, `nextReset`, `isDone`, `summarize`, `untilText`).
- Per periode "x van y open" en "reset over ...". Items met `unlockedBy` (Reaper-taken: `p5-11`) verschijnen pas als
  die stap beschikbaar of gedaan is; daarvoor staan ze onder "Later".

## Snapshots en opslag

Alles staat in localStorage onder het prefix `rs3t:` (account, vinkjes, snapshots, laatste data).

- Elke "Vernieuwen" bewaart een snapshot (datum, XP en level per skill, QP), maximaal 200; de oudste valt weg.
  Is er niets veranderd sinds de vorige snapshot, dan wordt er geen nieuwe opgeslagen.
- Logboek: XP-winst sinds de vorige snapshot en sinds 7 dagen (de laatste snapshot van minstens 7 dagen
  oud; bestaat die nog niet, dan sinds de eerste snapshot). Dezelfde verschillen staan als kolommen bij Skills.
- Logboek, alle snapshots: per snapshot de XP-verschillen per skill ten opzichte van de vorige.
- Back-up: het Logboek exporteert alle `rs3t:`-sleutels als JSON-bestand (dus ook notities en weekritme-vinkjes),
  met daarnaast een leesbaar veld `notes` (stap-id naar tekst). Terugzetten vervangt alle sleutels; notities uit
  `notes` die niet in `data` staan, worden aangevuld.

Invention gebruikt in-game een eigen elite-XP-curve; de app benadert die met de standaardtabel (1-120).
