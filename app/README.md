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
van de Ironman-hiscores. QP = som van `questPoints` van voltooide quests uit RuneMetrics.

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
