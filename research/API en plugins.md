# API's, plugins en wat we lokaal mogen bouwen

Stand: 4 november 2026. Alleen RS3. OSRS-zaken (RuneLite, OSRS-hiscores) staan hier hooguit als contrast en zijn dan gelabeld.

Leeswijzer zoals in `CLAUDE.md`: **hard** = bevestigd door een officiële bron of door een eigen test, **zacht** = waarschijnlijk of uit een niet-officiële bron, **onzeker** = niet bevestigd, verouderd of bronnen spreken elkaar tegen.

## Bron en werkwijze

- **Nieuws**: de officiële berichten staan op `secure.runescape.com/m=news/...`. Die gaven eerder al HTTP 404 aan automatische clients (zie `Game-updates 2025-2026.md`). De tekst komt daarom uit de wiki-kopie (`https://runescape.wiki/w/Update:<titel>?action=raw`); elke kopie linkt naar het origineel.
- **Developer-portaal**: `https://developer.runescape.com/rs/` gelezen met WebFetch. Het portaal noemt geen publicatiedatum of versie, alleen "Copyright © 2026 Jagex Ltd" en Lua 5.4.8.
- **Jagex-regels**: `https://legal.jagex.com/docs/rules/rules-of-runescape` en `https://legal.jagex.com/docs/rules/macro-and-client-features-not-permitted.md`, gelezen op 4 november 2026.
- **API's zelf**: getest met curl op 4 november 2026 rond 08:00 (UTC+1) voor `ons pap`.
- **Wiki-pagina's**: met de datum van hun laatste bewerking:
  - Application programming interface: 5 oktober 2026.
  - RuneMetrics: 3 november 2026.
  - Plugin: 29 oktober 2026.
  - Alt1 Toolkit: 19 juni 2025.
  - Help:APIs: 10 mei 2026.

---

## Het belangrijkste eerst

1. **Plugins zijn net uit, niet uitgezet.** "Plugins zijn uit" betekent hier: ze zijn verschenen. Het officiële pluginsysteem kwam live op **19 oktober 2026**. Er is geen bericht gevonden dat het daarna is gestopt of gepauzeerd. Batch 2 staat gepland voor donderdag 5 november 2026 (**hard**).
2. **De RuneMetrics-API stopt op 10 november 2026.** Dat geldt ook voor de Adventurer's Log-API. Er komt een vervangende web-API, maar die is op 4 november nog niet gepubliceerd. **Onze app leunt op RuneMetrics** voor profiel, activiteiten en quests. Over zes dagen valt dat dus weg (**hard** voor de datum, **onzeker** hoe de vervanger eruitziet).
3. **De hiscores blijven zover bekend.** In de aankondiging staan alleen RuneMetrics en de Adventurer's Log (**zacht**).
4. **De opdracht ging uit van een systeem uit 2025. Dat klopt niet.** Het officiële pluginsysteem werd in januari 2026 aangekondigd, de beta liep vanaf 6 oktober 2026 en de officiële start was op 19 oktober 2026. Wat er in 2025 al bestond, waren community-tools: Alt1 en de launcher Bolt, die ook Lua-plugins had. Jagex noemt Bolt in de beta-blog als voorloper. Bolt is verder niet onderzocht.

---

## 1. Het officiële pluginsysteem (RuneScape Client API en Plugin Hub)

### Wat het is

- Plugins zijn **Lua-code (Lua 5.4.8) die in de officiële client draait**. Je beheert ze via de Plugin Hub: een gereedschapskist-icoon op de ribbon, of in de modern-interface onder Settings. De plugins worden gehost op mod.io. **Hard**. Bronnen:
  - [Plugin](https://runescape.wiki/w/Plugin) (wiki, 29 oktober 2026);
  - [RuneScape Plugins Officially Available Now!](https://secure.runescape.com/m=news/runescape-plugins-officially-available-now) (19 oktober 2026);
  - [Getting started](https://developer.runescape.com/rs/getting-started.html).
- Wat een plugin kan (**hard**, volgens het portaal en de wiki):
  - accountvariabelen lezen, zoals queststatus, achievements en unlocks;
  - inventory en Grand Exchange-interface lezen;
  - entities (NPC's, spelers, objecten) en de camera lezen;
  - eigen UI tekenen;
  - in-game events volgen;
  - een eigen opslag gebruiken (Persistent DB);
  - **HTTP GET en POST** doen, alleen naar basis-URL's die in het manifest staan en met de permissie `httpAccess` ([HTTP](https://developer.runescape.com/rs/core/http.html)).

  Andere permissies zijn `chatAccess` en `trackingAccess` ([Managing](https://developer.runescape.com/rs/managing.html)).
- **Alleen goedgekeurde plugins draaien op live werelden.** Wat niet gepubliceerd is of nog in ontwikkeling is, draait alleen op aparte developer-werelden. Voortgang daar telt niet mee. **Hard** volgens de wiki ([Plugin](https://runescape.wiki/w/Plugin)): "Only plugins published on mod.io can run on live worlds". Een privé-plugin voor eigen gebruik op live werelden is dus niet mogelijk; alles gaat langs de moderatie van Jagex.
- **Een geverifieerd e-mailadres is verplicht** (mod.io-login). Later moet dat Jagex SSO worden ([RuneScape Plugins - FAQ](https://secure.runescape.com/m=news/runescape-plugins---faq), 26 oktober 2026). **Hard**.
- **Mobiel** krijgt het later; er is nog geen datum (dezelfde FAQ). **Hard**.

### Tijdlijn

| Datum | Gebeurtenis | Bron | Zekerheid |
|---|---|---|---|
| 19 januari 2026 | Aangekondigd in de roadmap: "plugin support to the RuneScape client before the end of 2026". | [The Roadmap That Changes RuneScape Forever](https://secure.runescape.com/m=news/the-roadmap-that-changes-runescape-forever) | hard |
| 18 juni 2026 | Check-in: Lua is gekozen, de principes staan vast (geen automatisering, geen verborgen informatie). | [API Project Check-In](https://secure.runescape.com/m=news/api-project-check-in) | hard |
| 5 augustus 2026 | Previews: Quest Helper, Entity Hider, Menu Entry Swapper. | [August's Month Ahead](https://secure.runescape.com/m=news/augusts-month-ahead) | hard |
| 6 oktober 2026 | Open beta op aparte werelden met 5 plugins plus de library PrettyUI. | [API Plugin Hub (Beta) Out Now!](https://secure.runescape.com/m=news/api-plugin-hub-beta-out-now) | hard |
| 19 oktober 2026 | Officieel live. Daarnaast staan de developer-omgeving en de inzendingen open. | [RuneScape Plugins Officially Available Now!](https://secure.runescape.com/m=news/runescape-plugins-officially-available-now) | hard |
| 23 oktober 2026 | Updates van de bestaande plugins. Op 26 en 29 oktober volgden "warm-fixes" aan de Mini-menu. | [October Patch Week](https://secure.runescape.com/m=news/the-week-ahead-october-patch-week), [Week Ahead 2 november](https://secure.runescape.com/m=news/the-week-ahead-double-xp-returns--new-marketplace-bundles) | hard |
| 26 oktober 2026 | FAQ: elke 2 weken een batch. Meer dan 250 plugins in draft en meer dan 200 wachten op moderatie. | [RuneScape Plugins - FAQ](https://secure.runescape.com/m=news/runescape-plugins---faq) | hard |
| 5 november 2026 (gepland) | Batch 2 met Agility Helper, Entity Highlighter, True Tile en Combat Recorder. Ground Items, Watchdog, Upkeeps, WikiSync en Museum Quiz zijn bijna klaar. Daarna, mogelijk op 19 november: Unified Logs, Drop Log en Farming and PoF Timer. | [Week Ahead 2 november](https://secure.runescape.com/m=news/the-week-ahead-double-xp-returns--new-marketplace-bundles) | hard voor de planning, onzeker of het zo doorgaat |

Plugins die nu live zijn: Quest Helper (69 quests), Menu Entry Swapper, Tilemarkers, Entity Hider, Job Gauges en PrettyUI (library). **Hard**.

### Uitgezet, gepauzeerd of beperkt?

- **Niet gevonden.** Gecontroleerd:
  - alle wiki-kopieën van het RS3-nieuws van 6 oktober tot en met 2 november 2026 (categorie 2026 updates, nieuwste bovenaan, tot en met "November's Month Ahead");
  - de wikipagina Plugin.

  Geen enkel bericht meldt dat plugins uitgezet of gepauzeerd zijn. De laatste berichten (2 en 3 november) kondigen juist batch 2 aan. **Hard** voor de stand per 4 november, 08:00.
- **Wel beperkingen**, en die horen bij het ontwerp:
  - plugins komen in batches via moderatie;
  - ze draaien alleen binnen de client ("Plug-ins cannot live in a window outside of the client", blog 19 oktober);
  - er is nog geen mobiel;
  - het verifiëren werkt niet met e-mailadressen waar een '+' in staat (FAQ).
- **Ironman**: in de plugin-blogs, de FAQ, de richtlijnen en de wikipagina staat niets over een andere behandeling van ironman-accounts. Gezocht op "ironman" in alle zes plugin-berichten en op de richtlijnenpagina. **Niet gevonden**, dus geen aanwijzing voor verschil.

### Het developer-portaal (developer.runescape.com)

- **Wat erop staat**: alleen de **Client API voor plugins**:
  - tutorial;
  - API-referentie (Core, Game, UI, Math);
  - submission: guidelines, process, UK adequacy, good practice;
  - console-commando's voor developer-werelden.

  **Hard**: zowel de startpagina als de sitemap is gecontroleerd. De sitemap is leeg, maar de navigatie geeft de volledige lijst.
- **Wat er niet op staat**: geen hiscores, RuneMetrics, Grand Exchange-web-API, clan-API of player count. Die documentatie bestaat op het portaal (nog) **niet**. De opdracht wilde het portaal gebruiken als primaire bron voor de web-API's (hoofdstuk 2), maar dat kan dus niet. Hoofdstuk 2 leunt daarom op de wiki en op eigen tests. **Hard**.
- **Komt het nog?** Jagex schreef op 2 november dat de vervangende RuneMetrics-API "will live alongside the API Plugin-Hub documentation". Op 4 november stond daar nog niets (`/web/` en `/api/` geven 404). **Hard** voor de stand nu; **onzeker** wanneer het komt.
- **Actueel?** Het portaal is in gebruik en hoort bij de lancering van 19 oktober 2026. Er staat nergens een versie- of wijzigingsdatum. **Zacht**.
- **Voorwaarden en rate limits** volgens het portaal:
  - geen rate limits genoemd, ook niet voor plugin-HTTP;
  - een plugin valt "at all times subject to the Jagex EULA" ([Submission process](https://developer.runescape.com/rs/submission/process.html));
  - data naar landen buiten het VK/de EER zonder adequaatheidsbesluit vraagt een uitzonderingsformulier; de VS staan niet op de lijst ([UK adequacy](https://developer.runescape.com/rs/submission/adequacy.html));
  - "Plugins cannot export any information about other players" ([Guidelines](https://developer.runescape.com/rs/submission/guidelines.html)).

  **Hard**.
- **Beleid over AI-code**: AI-tools gebruiken mag als je de code zelf begrijpt en reviewt. Onduidelijke of "unvetted AI" code kan worden afgewezen. Volgens de FAQ duurt het reviewen van volledig door AI gegenereerde plugins langer. **Hard**.

---

## 2. Officiële publieke web-API's van Jagex

Algemeen:
- Alle endpoints hieronder zijn **openbaar, zonder login**, tenzij anders vermeld.
- **Geen CORS-headers.** Dat is getest: er kwamen geen `Access-Control-*`-headers terug. Daarom proxyt `app/vite.config.ts` de aanroepen.
- Er staat Cloudflare voor (headers `Server: cloudflare` en `CF-RAY`).
- **Jagex publiceert nergens een rate limit.** De regels verbieden wel software die "Repeatedly asks for information from our website or is extremely demanding on our website" (zie hoofdstuk 5).
- Hoofdbron is de wiki: [Application programming interface](https://runescape.wiki/w/Application_programming_interface) (5 oktober 2026).

| API | URL-patroon | Geeft terug | Werkt voor Ons Pap (test 4 november 2026) | Status |
|---|---|---|---|---|
| Hiscores lite (normaal) | `https://secure.runescape.com/m=hiscore/index_lite.ws?player=<naam>` | CSV: 30 skillregels `rank,level,xp`, daarna 32 activiteitregels `rank,score` | ja, 200 | hard |
| Hiscores lite (Ironman) | `.../m=hiscore_ironman/index_lite.ws?player=<naam>` | idem, met ranks op het ironman-bord | ja, 200; dit gebruikt de app nu | hard |
| Hiscores lite (Hardcore) | `.../m=hiscore_hardcore_ironman/index_lite.ws?player=<naam>` | idem | 404, klopt want Ons Pap is geen HCIM | hard |
| Hiscores lite JSON | `.../m=hiscore/index_lite.json?player=<naam>` (ook `hiscore_ironman`) | JSON `{name, skills:[{id,name,rank,level,xp}], activities:[...]}` | ja, 200 | **zacht**: de wiki documenteert deze JSON-variant alleen voor OSRS; voor RS3 werkt hij wel maar staat hij niet beschreven. Let op: de skillnamen wijken af ("Hitpoints", "Runecraft") |
| Ranking | `.../m=hiscore/ranking.json?table=<skill>&category=0&size=<≤50>&toprank=<n>` | top-N per skill | ja | hard |
| userRanking | `.../c=<sessie>/m=hiscore/userRanking.json` | eigen rank | vraagt een ingelogde sessie, niet bruikbaar | hard |
| Leagues lite | `.../m=hiscore_leagues/index_lite.ws?player=<naam>` | idem | niet getest (niet relevant) | zacht |
| Seasonal | `.../m=temp-hiscores/getRankings.json?player=<naam>` en `getHiscoreDetails.json` | seizoensscores | 200, lege lijst `[]` | hard |
| Boss-groepsbord | `.../m=group_hiscores/v1//groups?groupSize=&size=&bossId=&page=` | snelste groepskills per boss (ranglijst, geen killcounts per speler) | ja | hard |
| GIM-bord | `.../m=runescape_gim_hiscores//v1/groupScores?...` | Group Ironman-ranglijst | niet relevant (solo-iron) | hard |
| RuneMetrics profile | `https://apps.runescape.com/runemetrics/profile/profile?user=<naam>&activities=<1-20>` | totaal, rank, combatlevel, `skillvalues`, laatste activiteiten | ja, 200 | **stopt 10 november 2026** |
| RuneMetrics quests | `https://apps.runescape.com/runemetrics/quests?user=<naam>` | 366 quests met status, moeilijkheid, QP, `userEligible` | ja, 200 (30 COMPLETED, 1 STARTED, 335 NOT_STARTED) | **stopt 10 november 2026** |
| RuneMetrics monthly XP | `https://apps.runescape.com/runemetrics/xp-monthly?searchName=<naam>&skillid=<id>` | 12 maanden XP per skill | **nee**: 302 naar `www.runescape.com/unavailable` | al dood (hard) |
| Adventurer's Log RSS | `https://secure.runescape.com/m=adventurers-log/rssfeed?searchName=<naam>` | RSS van de activiteiten (zelfde inhoud als RuneMetrics, alleen datum zonder tijd) | ja, 200 | **stopt 10 november 2026** |
| GE info | `https://secure.runescape.com/m=itemdb_rs/api/info.json` | `{"lastConfigUpdateRuneday":9014}` | ja | hard |
| GE catalogue | `.../m=itemdb_rs/api/catalogue/category.json?category=X` en `items.json?category=X&alpha=Y&page=Z` | items per categorie, 12 per pagina | niet getest | zacht |
| GE detail | `.../m=itemdb_rs/api/catalogue/detail.json?item=<id>` | prijs (afgerond, bijvoorbeeld "5.2m"), trends over 30/90/180 dagen | ja | hard |
| GE graph | `.../m=itemdb_rs/api/graph/<id>.json` | 180 dagen `daily` en `average` | ja | hard |
| Bestiary | `.../m=itemdb_rs/bestiary/beastData.json?beastid=<id>`, `beastSearch.json?term=`, `bestiaryNames.json?letter=`, `areaNames.json` | monsterstats (level, zwakte, gebieden, Slayer-categorie) | ja, 200 | hard dat het werkt; de wiki noemt de data "still available" sinds de site in 2015 verdween. **Zacht** of de data actueel is na de Combat Style Modernisation |
| Clans | `.../m=clan-hiscores/clanRanking.json`, `members_lite.ws?clanName=<clan>` | top-3 clans; CSV ledenlijst met clanrang, totale XP en kills | ja | hard |
| playerDetails | `.../m=website-data/playerDetails.ws?names=["<naam>"]&callback=...` | titel, clan; online-status alleen als je ingelogd bent | ja: `[{"isSuffix":false,"name":"ons pap","title":""}]` | hard |
| Player count | `https://www.runescape.com/player_count.js?varname=iPlayerCount&callback=...` | JSONP met het aantal spelers online (RS3 en OSRS samen) | ja, 78268 | hard |
| NXT-changelog | `https://content.runescape.com/downloads/changelog.json` | client-changelog | niet getest | zacht |
| Solomon's store | `.../m=mtxn_rs_shop/api/config` | - | **uitgezet**: de site sloot op 13 april 2026 (wiki) | hard |
| Item-DB-afbeeldingen | `.../m=itemdb_rs/obj_big.gif?id=X` | itemicoon | niet getest | zacht |

### Werkelijke respons (verkort, 4 november 2026)

Ironman hiscores lite (`ons%20pap`), 62 regels:
```
168459,627,1501350      <- Overall: rank, level, xp
188013,30,14581         <- Attack
...                     <- 28 skills, volgorde Attack ... Necromancy
53584,36,25932          <- Necromancy (regel 30)
-1,0                    <- regel 31: Bounty Hunter (activiteit: rank,score)
...
132696,750              <- regel 55: RuneScore = 750
-1,0                    <- regels 56-60: Clue Scrolls easy/medium/hard/elite/master
-1,0                    <- regels 61-62: Leagues CATALYST, Leagues II
```
Een `-1` bij rank betekent dat de speler niet gerankt is.

**De activiteiten na de 30 skills** (volgorde volgens de wiki, en het aantal is door de JSON-variant bevestigd: 32 stuks):
- Bounty Hunter, B.H. Rogues, Dominion Tower, The Crucible, Castle Wars games;
- B.A. Attackers, B.A. Defenders, B.A. Collectors, B.A. Healers;
- Duel Tournament, Mobilising Armies, Conquest, Fist of Guthix;
- GG: Athletics, GG: Resource Race;
- WE2: Armadyl Lifetime Contribution, WE2: Bandos Lifetime Contribution, WE2: Armadyl PvP kills, WE2: Bandos PvP kills;
- Heist Guard Level, Heist Robber Level, CFP: 5 game average;
- AF15: Cow Tipping, AF15: Rats killed after the miniquest;
- RuneScore;
- Clue Scrolls Easy/Medium/Hard/Elite/Master;
- Leagues: CATALYST, Leagues II: Equilibrium.

**Er staan geen boss-killcounts in.** **Hard**: dit is getest en klopt met de wiki. Let op: in de JSON-variant staan GG: Resource Race en GG: Athletics in omgekeerde volgorde ten opzichte van de wikilijst (**zacht**, kleine afwijking).

RuneMetrics profile (`activities=20`):
```json
{"name":"Ons Pap","rank":"934,009","totalskill":628,"totalxp":1503807,"combatlevel":43,
 "questsstarted":1,"questscomplete":30,"questsnotstarted":335,"loggedIn":"false",
 "skillvalues":[{"level":75,"xp":12152990,"rank":322740,"id":17}, ...],
 "activities":[{"date":"04-Nov-2026 07:47","details":"I levelled my Necromancy skill, I am now level 37.","text":"Levelled up Necromancy."}, ...]}
```
Wat bij de test opviel (**hard**, eigen test):
- `skillvalues.xp` staat in **tienden**: 12152990 is 1.215.299,0 Thieving-XP.
- `id` gebruikt de RuneMetrics-volgorde: 0 = Attack, 17 = Thieving.
- `activities` geeft 1 tot en met 20 items. Bij een waarde boven 20, of zonder parameter, kwamen er **maar 4** terug.
- De topvelden `magic`, `ranged` en `melee` passen niet bij de gelijknamige skills: `magic` 3464 is gelijk aan de Prayer-XP, `ranged` 15475 aan de Constitution-XP. Niet gebruiken.
- RuneMetrics liep voor op de hiscores: Necromancy 37 tegenover 36, totaal 628 tegenover 627. Dat past bij de huidige merge-logica in `app/src/lib/api.ts`.
- Een onbekende naam geeft `{"error":"NO_PROFILE","loggedIn":"false"}`.

### De stopzetting van RuneMetrics (belangrijk voor de app)

- **19 januari 2026**: RuneMetrics Pro is niet meer te koop. Jagex wil de website uitfaseren ([roadmap](https://secure.runescape.com/m=news/the-roadmap-that-changes-runescape-forever)). **Hard**.
- **20 maart 2026**: de RuneMetrics-website is dicht. De endpoints bleven werken ([RuneMetrics](https://runescape.wiki/w/RuneMetrics), wiki 3 november 2026). **Hard**.
- **26 oktober 2026**: "The RuneMetrics API will be fully sunset on November 10th". Er komt een nieuwe API, gemaakt samen met de makers van RunePixels en Friendlybot ([October Patch Week](https://secure.runescape.com/m=news/the-week-ahead-october-patch-week)). **Hard**.
- **2 november 2026**: de vervanger komt "later this week, ahead of the formal decommissioning of the Runemetrics and Adventurers Log API on November 10th". De documentatie komt op developer.runescape.com ([Week Ahead 2 november](https://secure.runescape.com/m=news/the-week-ahead-double-xp-returns--new-marketplace-bundles)). **Hard**.
- **Tegenspraak**: de wikipagina Application programming interface (laatst bewerkt op 5 oktober 2026) zegt nog "no announced shutdown date". Die pagina is ouder dan de aankondiging. Het nieuws van 26 oktober en 2 november gaat voor.
- **Gevolg voor de app**:
  - `fetchProfile` en `fetchQuests` in `app/src/lib/api.ts` werken na 10 november niet meer;
  - de hiscores blijven, maar geven geen quests en geen activiteiten;
  - het zelf afleiden van het quest-overzicht (`build_quest_links.py`, `validate_route.py` met de quest-snapshot) vraagt dan de nieuwe API, of een plugin zoals WikiSync.

  Wat de vervanger precies teruggeeft, is **onzeker** tot Jagex het publiceert.

---

## 3. Niet-officiële maar bruikbare API's

### RS3-wiki (MediaWiki)

- `https://runescape.wiki/api.php` (MediaWiki-API) en `https://runescape.wiki/w/<Titel>?action=raw` (ruwe wikitekst). Allebei getest en werkend vanaf dit systeem, met curl en een eigen User-Agent. **Hard**.
- **Gebruiksregels** ([Help:APIs](https://runescape.wiki/w/Help:APIs), 10 mei 2026, **hard**):
  - Er is geen expliciete rate limit. De wiki behoudt zich wel het recht voor om te blokkeren als het gebruik "threatens the stability". Voor GE-prijzen ligt die grens volgens de wiki pas bij "double-digit queries per second for a sustained period".
  - Het enige verzoek: "please set a User-Agent that describes what you're using it for". User-Agents als `python-requests` en `ApacheHttpClient` worden standaard geblokkeerd.
- Een eerdere notitie in `CLAUDE.md` zegt dat de wiki curl blokkeert. Bij deze test met een beschrijvende User-Agent werkte curl wel. Waarschijnlijk wordt de standaard-UA geweigerd. **Zacht**.

### Weird Gloop exchange-API (prijzen)

- `https://api.weirdgloop.org/exchange/history/rs/latest?id=<id>|<id>` of `?name=<naam>`. Tot 100 items per aanroep. Geeft `{id, timestamp, price, volume}`.
- Daarnaast `/all`, `/sample` en `/last90d`, elk 1 item per aanroep.
- Documentatie: [Usage and APIs](https://runescape.wiki/w/RuneScape:Grand_Exchange_Market_Watch/Usage_and_APIs) (27 oktober 2026) en `https://api.weirdgloop.org`. Er zijn ook bulkpagina's met alle prijzen in één bestand, zoals `Module:GEPricesByIDs/data.json`.
- Getest: `{"Steadfast boots":{"id":"21787","timestamp":"2026-11-03T16:16:13.000Z","price":4088428,"volume":21}}`. **Hard**.
- Dezelfde gebruiksregels als de wiki: User-Agent zetten en redelijk tempo.
- **Voor een ironman** is dit alleen een referentie: de waarde van een drop, of de hoogte van een alch. High-alchwaarden staan op de wiki-itempagina's, niet in deze API. Geen handelsadvies.

---

## 4. Alt1 Toolkit (runeapps.org)

- **Wat het is**:
  - een Windows-programma (Windows 7 of hoger, alleen Windows);
  - eigen Chromium-browser waarin "apps" (webpagina's) draaien;
  - leest de game **via schermpixels**, met beeldherkenning en OCR (`alt1/ocr`);
  - tekent overlays over de client.

  Bronnen: [runeapps.org/alt1](https://runeapps.org/alt1) en de bibliotheek [skillbert/alt1 op GitHub](https://github.com/skillbert/alt1) (laatste commit 28 mei 2026). **Hard**.
- **Geen input naar de game**:
  - De API-typedefinities (`src/base/alt1api.ts`) bevatten alleen drie groepen functies: pixels lezen (permissie "pixel"), overlays tekenen ("overlay") en spelstatus lezen ("gamestate": muispositie, of RS actief is, tijd sinds de laatste klik).
  - Er is geen functie om klikken of toetsen te sturen.
  - De site zegt zelf: "not intended as a cheat or botting client".
  - Apps kunnen sinds Alt1 1.6.0 alleen nog binnen het RS-venster capturen.

  **Hard** voor de API zoals gepubliceerd. **Zacht** voor gesloten delen: Alt1 is "partially open-sourced".
- **Standpunt van Jagex**:
  - Alt1 is **niet goedgekeurd**: geen "Approved Client".
  - Mod Infinity zei in oktober 2015 dat het "fine to use" was, maar wel op eigen risico ([Alt1 Toolkit](https://runescape.wiki/w/Alt1_Toolkit), wiki 19 juni 2025). **Let op: die bron is van 2015, dus ouder dan 2025.**
  - Een nieuwere officiële uitspraak over Alt1 is **niet gevonden**. Gezocht in support.runescape.com, legal.jagex.com en het plugin-nieuws.
  - De supportpagina over specificaties noemt alleen goedgekeurde third-party clients voor OSRS (RuneLite, HDOS; OSRS-contrast). Voor RS3 noemt ze geen enkele.
  - Status: **onzeker/grijs, maar gedoogd**.
- **Huidige status**:
  - Laatste Alt1-desktoprelease: **1.6.0 van 1 januari 2023** ([Alt1 Updates](https://runeapps.org/alt1/updates)).
  - De apps zelf updaten los daarvan, wekelijks.
  - Het aantal downloads op de site is 1.124.299.
  - Of Alt1 werkt met de **Vulkan-renderer** (open beta sinds 7 september 2026) is **niet gevonden**. De changelog van 1.6.0 noemt alleen OpenGL-capture.
- **Opvolger**: er is geen "Alt1 2", maar makers van Alt1-apps stappen over naar officiële plugins:
  - Clue Trainer (Zyklop) gaat naar de Plugin API "with feature parity", omdat de API "beyond the limitations of simple screen reading and 2d overlays" gaat ([API & Plugins September Preview](https://secure.runescape.com/m=news/api--plugins-september-preview));
  - de Quest Helper is gemaakt door onder meer de maker van Alt1's Quest Helper.

  Zacht oordeel: voor nieuwe dingen is de officiële Plugin API de logische opvolger.
- **Nuttige Alt1-apps voor een ironman** (lijst van runeapps.org, **hard**): AFK Warden (waarschuwt voor uitloggen bij inactiviteit en dergelijke), XpMeter, Droplogger, Clue Solver, Farming timer, Player Profile, World Map, Stats lookup, DGKey (Dungeoneering).
- **Zelf een Alt1-app bouwen**:
  - Een Alt1-app is een gewone webpagina met een `appconfig.json`: `appName`, `appUrl`, `iconUrl`, standaardafmetingen en `"permissions": "pixel,overlay"` ([alt1minimal](https://github.com/skillbert/alt1minimal), voorbeeldapp).
  - Toevoegen gaat met een "add app"-knop of een `alt1://`-link.
  - De npm-bibliotheek `alt1` werkt ook in een gewone browser; dan is het `alt1`-object er niet en vallen de pixel- en overlayfuncties weg.
  - **Dus ja**: de tracker (Vite + React) kan als Alt1-app draaien. Hij moet dan wel ergens te bereiken zijn, bijvoorbeeld `http://localhost:5173`. Of Alt1 een localhost-URL accepteert, is **niet getest**.
  - De ontwikkelaarsdocumentatie bestaat uit de README en de map `docs/` in de GitHub-repo (base, ocr, font- en imagedata-loaders). Daarin staat zelf "WIP ... All API's exposed WILL change". Een aparte docs-site op runeapps.org is niet gevonden.

---

## 5. Wat mag volgens Jagex

### De regels letterlijk

Bron: [Rules of RuneScape](https://legal.jagex.com/docs/rules/rules-of-runescape). De pagina zegt "Last updated 11 months ago", dus ongeveer december 2025. **Hard**.
- Macroing: "using software or hardware that can help you play the game with the software or hardware doing things for you that you should be doing yourself."
- "Our games are meant to be played by humans".

Niet toegestaan is software die:
- "Performs things in-game for you that you're meant to be doing yourself."
- "Tries to look at or change the communications between your device and our game worlds."
- "Changes parts of our game." en "Using edited versions of our game code is not allowed."
- "Repeatedly asks for information from our website or is extremely demanding on our website." Met de toelichting: "Each page on our website should only load if you open the page yourself."
- "Gets around the normal steps used to log in."

Aanvullend: [Macro and client features not permitted](https://legal.jagex.com/docs/rules/macro-and-client-features-not-permitted.md) (geen datum, **hard**). Een functie die niet op de "Approved Client list" staat, mag niet als hij:
- "Generates input to our game applets. This includes software that automatically moves the mouse pointer or generates mouse clicks or key presses."
- "Makes repeated page/content requests ... (each page/content request should only be in direct response to a user request each time)".

De link "Third Party Client Guidelines" op die pagina gaat naar een OSRS-nieuwsbericht (`?oldschool=1`); OSRS-contrast, niet verder gebruikt.

Pluginrichtlijnen ([Guidelines](https://developer.runescape.com/rs/submission/guidelines.html), "may evolve over time", geen datum, **hard**):
- **Plugins may**: "Support planning, tracking, and progression using known or historical information" en "Provide notifications or summaries based on visible or known information".
- **Plugins must not**: "Automatically perform actions for the player" en "Reveal hidden, future, or otherwise inaccessible information".
- **Uitdrukkelijk toegestaan bij moderatie**: "XP calculators and trackers, logging, and manual markers or notes".
- **Verboden**: "Automating gameplay actions or sending inputs/actions to the game".

### Overzicht

| Categorie | Wat | Waarom (bron) | Zekerheid |
|---|---|---|---|
| **Zeker toegestaan** | Handmatige trackers, notities en planning buiten de game (zoals deze app) | Raakt de game niet; niets in de regels verbiedt het | hard |
| | Goedgekeurde plugins uit de Plugin Hub gebruiken | Jagex modereert ze en noemt ze "authorized, safe and do not contravene any rules" (Check-In, 18 juni 2026) | hard |
| | Een eigen plugin maken die tracking, logging of meldingen doet en die laten goedkeuren | Richtlijnen: "XP calculators and trackers, logging" toegestaan | hard |
| | Publieke API's (hiscores, RuneMetrics zolang die er is, GE, wiki) lezen **op verzoek van de gebruiker** | Openbare endpoints; de regel eist "in direct response to a user request" | hard |
| **Grijs** | Alt1 Toolkit (schermlezen plus overlay, geen input) | Niet goedgekeurd; Jagex-uitspraak "fine to use" is van 2015; "at own risk" | onzeker |
| | Automatisch periodiek pollen van de Jagex-API's (bijvoorbeeld elke 10 minuten op de achtergrond) | Botst letterlijk met "each page/content request should only be in direct response to a user request". Een laag tempo valt in de praktijk waarschijnlijk niet op, maar de regel is streng | zacht: grijs |
| | Third-party launchers met plugins (zoals Bolt) | Niet op een goedgekeurde lijst gevonden. Een zoekresultaat citeert de Jagex Accounts-FAQ: de Jagex Launcher ondersteunt alleen de officiële clients en RuneLite (OSRS). Die pagina gaf zelf HTTP 403 en is dus niet gelezen | onzeker |
| **Verboden** | Input automatiseren (klikken, toetsen, muisbewegingen), macro's, bots | Letterlijk verboden (beide legal-pagina's en de pluginrichtlijnen) | hard |
| | Client-injectie of een aangepaste client | "Changes parts of our game", "edited versions of our game code" | hard |
| | Netwerkverkeer onderscheppen of manipuleren (packets) | "look at or change the communications between your device and our game worlds" | hard |
| | Verborgen informatie tonen of mechanics voorspellen | Pluginrichtlijnen | hard |
| | Data over andere spelers exporteren via een plugin | Pluginrichtlijnen | hard |

---

## 6. Wat wij lokaal kunnen bouwen

Gerangschikt op **nut voor Mees** (PvM, progressie zien, weinig gedoe) en **risico**. Geen code; alleen wat het vraagt.

| # | Idee | Nut | Binnen de regels? | Wat het technisch vraagt |
|---|---|---|---|---|
| 1 | **Overstappen op de vervangende RuneMetrics-API** (zodra die er is) en zolang de hiscores als bron vooropzetten | Zeer hoog: zonder dit verliest de app vanaf 10 november activiteiten en quests | ja | Wachten op de documentatie (developer.runescape.com, deze week beloofd), dan `fetchProfile`/`fetchQuests` en de Vite-proxy aanpassen. Tot die tijd: de hiscores werken door, en de laatste quest-snapshot vóór 10 november bewaren als vangnet. Ook `build_quest_links.py` en `validate_route.py` gebruiken een RuneMetrics-questsnapshot |
| 2 | **Automatische sessielog uit hiscore-diffs** (XP per skill per sessie) | Hoog: laat groei zien, vult het Logboek zonder moeite | ja, als het ophalen gebeurt bij openen of op een klik; grijs bij achtergrondpolling | Bij elke handmatige verversing een snapshot opslaan (de app doet dit al deels) en de verschillen per tijdvak tonen. De ironman-hiscores zijn exact op XP. Activiteiten ("Levelled up X") zijn er vanaf 10 november alleen via de nieuwe API |
| 3 | **Drop- en bosslog uit activiteiten** | Middel: RuneMetrics-activiteiten zijn mager. Ze bevatten **alleen opvallende drops** (een vaste lijst zeldzame items en pets, "I found a ..."), boss-mijlpalen ("I killed N ...", na 100 kills "a great number of") en quests, levels en XP-mijlpalen. Geen gewone drops, maximaal 20 items per aanroep. In de snapshot van 3 november staan alleen "Levelled up", "Quest complete", "300 songs unlocked", "500 Total levels gained" en "30 Quest Points obtained"; geen enkele drop | ja | Activiteiten bij elke verversing ontdubbelen (datum plus tekst) en zo een historie opbouwen. Bron: [RuneMetrics/Adventurer's Log](https://runescape.wiki/w/RuneMetrics/Adventurer's_Log) (wiki, 11 april 2026). **Onzeker** of de nieuwe API dit veld houdt. Een volledige drop-log komt pas via de Drop Log-plugin (in moderatie, mogelijk 19 november) |
| 4 | **Boss-killcounts** | Hoog voor PvM-plezier | ja | **Niet uit de hiscores**: de lite-output heeft na de 30 skills alleen 32 minigame- en clue-activiteiten, geen bosses (getest). Opties: handmatig tellen in de app (veilig, nu al te bouwen), activiteiten-mijlpalen parsen (zie 3), of later de plugins Combat Recorder (batch 2) of Unified Logs gebruiken. Of die data kunnen exporteren, is **onzeker** |
| 5 | **Clue-tellers en RuneScore** | Laag tot middel | ja | Staan wél in de hiscores (regels 55-60). Simpel toe te voegen aan de skilltabel of het Logboek |
| 6 | **Eigen Lua-plugin "Ons Pap sync"** die quest-, unlock- en inventory-data via `httpAccess` naar de lokale tracker POST | Zeer hoog op termijn: de app weet dan precies wat het account heeft, ook dingen die geen API toont | ja volgens de richtlijnen ("tracking", "logging"), maar **alleen na goedkeuring en publicatie op mod.io**. Lokaal testen kan alleen op developer-werelden zonder echte voortgang | Lua leren, plugin indienen (wachtrij van 200+, batches om de 2 weken), manifest-URL. **Onzeker** of `http://localhost` als basis-URL wordt goedgekeurd: het portaal noemt localhost niet. Veel werk en onzeker; eerst kijken wat WikiSync biedt |
| 7 | **WikiSync afwachten** (in moderatie, batch 2 of 3) | Middel tot hoog: voor Leagues stuurde WikiSync voortgang naar de wiki | ja (officiële plugin) | **Onzeker** of de RS3-WikiSync een uitleesbare API levert zoals bij OSRS (OSRS-contrast). Volgen, niet bouwen |
| 8 | **Tracker als Alt1-app** (overlay naast de game) | Laag tot middel: de app staat al in een browser naast de game | grijs (Alt1 is niet goedgekeurd) | `appconfig.json` toevoegen en de app via `alt1://` toevoegen. Zonder pixel- of overlay-functies voegt dit weinig toe. Vulkan-compatibiliteit onbekend. Niet aanbevolen |
| 9 | **Discord-webhook of desktopmelding** (bijvoorbeeld "stap afgerond", "level 50 Necromancy gehaald", weekritme-herinnering) | Middel | ja, mits de gegevens van een handmatige verversing komen; de melding zelf raakt Jagex niet | Discord-webhook-URL (privé) of de Notification-API van de browser vanuit de lokale app. In-game meldingen komen straks via de Watchdog-plugin (in moderatie) |
| 10 | **Prijsreferentie bij drops** (waarde van wat Mees vond, alch-waarde) | Laag | ja | Weird Gloop `latest` (100 ids per aanroep) of de bulkpagina van de wiki, met User-Agent. Alleen als referentie, geen handelsadvies |

### Aanbeveling: eerst deze drie

1. **De app voorbereiden op 10 november (idee 1).** Dit is urgent:
   - maak de hiscores leidend;
   - bewaar nu een verse quest-snapshot;
   - stap over op de vervangende API zodra Jagex de documentatie publiceert.

   Zonder dit verliest de app over zes dagen quests en activiteiten.
2. **Sessielog en historie uit hiscore-diffs (idee 2), plus clue-tellers en RuneScore (idee 5).** Laag risico, meteen bruikbaar, en het past bij "het account zien groeien". Ophalen alleen bij openen of op een klik, zodat het binnen de letter van de regels blijft.
3. **Een handmatige boss-KC- en drop-log in de app (ideeën 3 en 4).** Dit vult het gat dat geen enkele API dicht. Activiteiten-mijlpalen kunnen dienen als automatische aanvulling, zolang die beschikbaar blijven. De Drop Log- en Combat Recorder-plugins in de game zijn dan de bron, en de app is het overzicht.

Pas daarna, als WikiSync en de nieuwe API live zijn: kijken of een eigen plugin (idee 6) nog iets toevoegt.

---

## Open punten

- Hoe de vervangende RuneMetrics-API eruitziet: endpoints, velden, of activiteiten en quests erin blijven, en of hij CORS of een key heeft. Komt "later this week" volgens Jagex (2 november 2026).
- Of de hiscores echt buiten de stopzetting vallen. Ze worden niet genoemd. **Zacht**.
- Of Alt1 werkt met de Vulkan-renderer: niet gevonden.
- Of een plugin naar `localhost` mag posten: het portaal zegt er niets over.
- Of WikiSync voor RS3 een openbare uitleesbare API krijgt.
- Een recente (na 2015) officiële uitspraak van Jagex over Alt1: niet gevonden.
- Het document "2026 08 17 - Third Party Software" (PDF op legal.jagex.com, onder Partners and third parties): de tekst kon niet worden uitgelezen. Waarschijnlijk is het een licentielijst van software die Jagex zelf gebruikt, geen spelersbeleid. **Onzeker**.
