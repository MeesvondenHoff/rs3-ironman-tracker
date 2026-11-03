# Site-review: ironman.guide (alleen opzet en functies)

Stand: 3 november 2026. De spelinhoud is **OSRS** en dus onbruikbaar voor Ons Pap; deze review gaat alleen over functies en UX-patronen die onze app (`app/`) zou kunnen overnemen. Er is niets aan de app veranderd.

**Wat de site is.** Een interactieve versie van Oziris' Ironman Efficiency Guide ("v4 edition", 576+ stappen in 7 secties), met tools: Gear, Bosses, Money, AFK, Dry Calc, Quests en References.

**Cookies.** De consent-manager (CMP) stond al gesloten met een bestaande keuze: 0 vendors toegestaan, alleen de basisdoelen. Dat komt overeen met "alles weigeren", vermoedelijk in een eerdere sessie in hetzelfde browserprofiel. Er is niets geaccepteerd.

**Let op.** De site heeft gebruiksvoorwaarden die automatisch uitlezen (scrapers, crawlers) verbieden. Daarom zijn alleen de pagina's hieronder handmatig bekeken; er is niets massaal opgehaald en er is geen inhoud overgenomen.

## Bezochte pagina's (8)

`https://ironman.guide/`, `/guide/early-game`, `/gear`, `/money-making`, `/afk`, `/bosses`, `/quests`, `/drop-calculator`.

**Getest:** twee stappen afgevinkt en weer teruggezet (localStorage-sleutel `ironman-guide-progress`, een lijst met stap-id's); de schakelaar Original/Enhanced aan en weer uit (`ironman-guide-enhanced-mode`); het menu "Modes" en het "Sync RSN"-venster geopend (geen naam ingevuld).

**Niet bekeken:** `/articles`, `/herblore`, `/crafting`, `/hcim`, `/uim`, `/gim` en de overige guide-secties. Ze volgen hetzelfde patroon en zijn OSRS-inhoud.

---

## Wat de site doet, in het kort

- **Stappenlijst per sectie.** Bovenaan een schakelaar "Original Guide / Enhanced (2026)" en een balk "Section Progress x / y (%)". Elke stap is een kaart met een checkbox (aria: "Mark as complete") en een of meer regels met vaste iconen:
  - 📍 locatie;
  - 📜 quest, met ✓ als de quest in deze stap wordt afgerond;
  - 🎯 skilldoel ("15 firemaking");
  - ⚠️ waarschuwing per modus ("HCIM: …");
  - een losse notitieregel en links naar een afbeelding (kaart, safespot) of video.
- **Enhanced-modus.** Voegt stappen toe (286 in plaats van 281 in sectie 1.1) en labels zoals "NEW QUEST" en "Modern Alternative", met een uitleg van wat er sinds de originele gids in het spel veranderde.
- **Gear.** Tabbladen per stijl met tabellen "Item / How an ironman gets it / Requirement". Daaronder interactieve upgradepaden: filter op stijl en fase (Early/Mid/Late/Endgame, met combatbereik), weergave List of Flow, aanbevolen loadouts per fase, en items die je aanklikt voor stats, bron en "upgrades into". Elk item heeft een bron-label (Quest, Shop, Boss, Slayer, Minigame, Crafting).
- **Money.** Kaarten met fase, type (Skilling/Thieving/Slayer/PvM/Passive/Processing), intensiteit (afk/medium/high/intense), soort opbrengst (High Alch/Mixed/coins) en coins per uur als bereik. Filters op fase en type, sorteren op "Highest GP" of "Lowest Effort". Uitgangspunt: alleen echte coins (alch-waarde en winkelverkoop), geen beurswaarde.
- **AFK.** Een tabel met methode, level, **AFK-tijd (minuten tussen klikken)**, klikken per uur, XP/u, XP per AFK-moment en **wat het oplevert** (bijv. "Raw sharks"). Een label IRON markeert methodes met een ironman-notitie. Filters per skill, Skilling/Combat, een minimum AFK-tijd (2/5/10 min+) en sorteren (Most AFK, XP/hr, XP per AFK, Level).
- **Bosses.** Een genummerde bossladder per fase met stijl, eisen, prioriteitsdrops (Priority/Important/Nice to have) en links naar een ironman-gids en de wiki.
- **Quests.** Questvolgorde in 6 fases, mijlpaal-quests gemarkeerd, per quest de skill- en questeisen, en tabbladen Quest Chains en Top XP.
- **Dry Calc.** Kans op een drop bij een gegeven drop rate en kill count, met presets.
- **Overig.** Dark-mode-knop, "Sync RSN" (stats ophalen via Wise Old Man, een OSRS-dienst) en een totale voortgangsbalk in de kopbalk.

---

## Functies om over te nemen, geprioriteerd

"Wat wij al hebben" volgt `app/README.md`. Inspanning: **klein** = een paar uur (data-veld plus weergave), **middel** = een nieuw tabblad of datasetje, **groot** = nieuwe dataset met eigen research plus een nieuwe interactie.

### Hoog

| # | Functie | Wat het is | Wat wij al hebben | Wat het voor onze app betekent | Inspanning |
|---|---|---|---|---|---|
| H1 | **Locatie, quest en skilldoel als vaste regels per stap** | 📍 locatie, 📜 quest (✓ = afronden in deze stap), 🎯 skilldoel als aparte, herkenbare regels op elke stapkaart. | `detail` (markdown), `requires` en `completeWhen`; locaties staan los in de tekst. | Schema uitbreiden met `location` (bijv. "Menaphos, Merchant district") en eventueel `teleport` ("Menaphos-lodestone"). Het skilldoel en de quest kunnen uit `completeWhen` komen. Tonen op Vanavond (opdrachtbrief) en in de Route-tab als badgerij. `build_route.py` vult het per stap; `validate_route.py` controleert het. | Klein-middel (62 stappen data invullen) |
| H2 | **Weekritme-tracker met resets** (patroon van ironman.guide, rs3ironman en thersguide) | Repeatables met afvinken, label Daily/Weekly/Monthly, automatische reset en een teller van wat nog open staat. | Alleen tekst in stap p1-01. | Een blok "Weekritme" op Vanavond of een eigen sub-tab: Herby Werby, Penguins, rune shop run, Troll Invasion, Thalmund (woensdag), later Reaper. Per item: cyclus, resetmoment (00:00 UTC), stoppunt ("stop bij …"), vrijgespeeld door stap-id of quest. Vinkjes in localStorage met de datum; vervallen na de reset. Data: nieuw `research/weekritme.json` of een sectie in `route.json` (schema-uitbreiding). | Middel |
| H3 | **Sectievoortgang "x / y (%)"** | Per sectie een balk met het aantal gedane stappen en een percentage. | Het spoor op Vanavond vult naar rato van gedane uren; per fase geen telling. | In de Route-tab per fase-paneel "7 / 15 stappen (47%)" plus de bestaande urenbalk. Komt uit bestaande data. | Klein |
| H4 | **AFK-methodenlijst gekoppeld aan de speelstijl** | Tabel met AFK-tijd tussen klikken, XP/u en wat het oplevert, filterbaar per skill en sorteerbaar op "meest AFK". | De badges actief/AFK per stap en "alternatief in de andere speelstijl" op Vanavond. | Een dataset `afk-methods.json` (RS3) voor de skills van de route: Necromancy (bound skeletons, marauders), Fishing/Cooking, Divination, Smithing (burial gauntlets), Crafting (gem rocks), Thieving (marketeers). Per methode: level, minuten AFK, XP/u, opbrengst (bijv. "ashes voor Prayer", "coins"), bron-URL. Op Vanavond: "AFK-blok: kies uit …", gefilterd op de doelen van de huidige fase. Eventueel een sub-tab "AFK" onder Skills. | Middel (de data vraagt RS3-wikiresearch) |

### Midden

| # | Functie | Wat het is | Wat wij al hebben | Wat het voor onze app betekent | Inspanning |
|---|---|---|---|---|---|
| M1 | **Gear-progressie per stijl en tier met ironman-bron** | Per stijl en fase de items, met "hoe een ironman het krijgt", eisen en "upgrades into"; bron-label per item. | Gear staat verspreid in de stappen (p2-03, p4-02, p4-08, p5-10) en in CLAUDE.md 4.3. | Een tab of sectie "Gear" met eerst alleen **Necromancy** T1-T90 (wapens en armour), later melee/ranged/magic uit CLAUDE.md 4.3. Per tier: item, bron (Kili-taak, ritual, chaotic via Dungeoneering, boss), eisen (Necromancy, Smithing/Crafting, quest), status (gehaald / volgende / later, af te leiden uit levels) en de **route-stap waarin het gebeurt**. Data: `gear.json` uit de research. | Middel |
| M2 | **"Original vs Enhanced" als "wiki-route vs onze route"** | Een schakelaar tussen de originele gids en een versie met moderne alternatieven en labels als "NEW QUEST" en "Modern Alternative". | `Review EIPG en RS Guy.md` met oordelen per guide-stap; in de app alleen onze route. | Niet de hele wiki-route tonen (te groot), maar per stap labels: **"afwijking van guide"** (met de reden uit de review), **"nieuw sinds 2026"** (Ivar, DailyScape) en **"gecorrigeerd"**. Data: veld `badges` per stap in `route.json`, gevuld door `build_route.py`. Een schakelaar kan dan de reden bij elke stap tonen of verbergen. | Klein-middel |
| M3 | **Notities per stap** | Bij ironman.guide alleen vaste notities van de gidsmaker; bij rs3ironman kunnen ingelogde gebruikers eigen taken toevoegen. | Niets persoonlijks per stap. | Een tekstveld per stap ("hoeveel bars heb ik al", "lens niet vergeten"), opgeslagen in localStorage onder `rs3t:note:<stap-id>`, en meegenomen in de bestaande back-up-export. | Klein |
| M4 | **Geldmethoden-overzicht** | Kaarten met fase, type, intensiteit en coins/u; filter en sorteren op "meeste coins" of "minste moeite". | Geld zit in p1-02 en CLAUDE.md 4.1. | Een sectie "Geld" met RS3-ironmanmethodes: marketeers, corrupted scarabs, shooting stars, rune arrows aan general stores, alchen vanaf Magic 55, Slayer-alchables. Per methode: fase, actief/AFK (zelfde badges), eisen, coins/u (alch- of winkelwaarde, nooit beurswaarde), bron. Koppeling met de geldafvoer (spirit shards, runes). | Middel |
| M5 | **Bossladder met prioriteitsdrops** | Genummerde bosses per fase, met stijl, eisen en drops in drie prioriteiten. | Fase 6 (K'ril, QBD) en p2-09 (Ivar) als stappen. | Een kleine kaart per boss in de route (Ivar, K'ril Tsutsaroth, QBD): eisen (gelinkt aan `requires`), aanbevolen stijl en gear-tier, drops die voor een ironman tellen (bijv. royal bolts en tortured soul essence van QBD voor T80). | Klein-middel |

### Laag

| # | Functie | Wat het is | Wat wij al hebben | Wat het voor onze app betekent | Inspanning |
|---|---|---|---|---|---|
| L1 | **Afbeeldings- en videolinks per stap** | Links naar een kaart of safespot-afbeelding en video's. | Bronnen per stap (`sources`). | Een optioneel veld `media` (wiki-kaartlink, bijv. Mhekarnahz-ingang, Ivar-locatie). Alleen waar het echt helpt. | Klein |
| L2 | **Waarschuwingen per modus** | ⚠️ "HCIM: …" alleen voor bepaalde modi. | Niet nodig: Ons Pap is één solo-ironman. | Het idee "aparte waarschuwingsregel" zit al in H1; modusfilters overslaan. | - |
| L3 | **Sync RSN** | Stats importeren via Wise Old Man (OSRS-dienst). | Hebben we al via de RS3-hiscores en RuneMetrics (Vernieuwen). | Niets nieuws; hooguit de status "laatst gesynchroniseerd" prominenter in de kop. | - |
| L4 | **Dry Calc** | Kans op een drop gegeven rate en kill count. | Niets. | Een mini-calculator bij bossstappen (bijv. K'ril-uniques, QBD-componenten): "na n kills heb je x% kans gehad". Leuk, geen route-waarde. | Klein |
| L5 | **Questvolgorde-pagina** | Fases, mijlpalen, Quest Chains en Top XP. | De Quests-tab met filters op status, eisen en route. | Een kolom "route-stap" en "waarom in de route" bij de quests die in de route staan; een sortering "XP-beloning" voor lamp-quests. | Klein |
| L6 | **Dark-mode-schakelaar** | Licht/donker wisselen. | Eén donker thema ("kaarttafel"). | Niet nodig. | - |
| L7 | **Totale voortgang in de kopbalk** | Percentage van de hele gids altijd zichtbaar. | Combat, totaal level en QP in de kop; het spoor op Vanavond. | Eventueel "route 23%" in de feitenrij. | Klein |

### Ideeën uit de andere twee sites (zelfde lijst, kort)

- **thersguide:** het eisen-blok met "alleen wat ontbreekt" en huidig vs vereist level; "bevestigd door RuneMetrics" vs "bevestigd door jou"; skilltraining per levelband in de Skills-tab; een Quick guide-link per queststap.
- **rs3ironman:** het focusvenster (alleen de laatste twee gedane stappen zichtbaar); repeatables die verschijnen zodra ze vrijgespeeld zijn; werkwoorden start/verder/afronden voor questketens; secundaire lijst naast de route.

Zie `Site-review thersguide.md` en `Site-review rs3ironman.md`.
