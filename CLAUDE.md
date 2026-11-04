# CLAUDE.md: RS3 Ironman (account "Ons Pap")

Stand: 3 november 2026. Alles in dit bestand geldt voor **RuneScape 3**, niet voor Old School RuneScape (OSRS). Skill-, item- en questnamen staan in het Engels zoals in-game.

Leeswijzer:
- **Hard** = technisch onmogelijk of door het spel geblokkeerd.
- **Zacht** = toegestaan, maar beperkt, onhandig of zonder beloning.
- **Onzeker** = de bron is onduidelijk, verouderd of spreekt zichzelf tegen; staat er dan ook expliciet bij.
- Wiki-paginanamen staan tussen haakjes achter een bewering; de volledige URL's staan in hoofdstuk 6.

---

## 1. Project

### Wat er in deze map staat

| Pad | Inhoud |
|---|---|
| `app/` | Vite + React + TypeScript-tracker voor Ons Pap. Start: `npm run dev --prefix app` (poort 5173). De dev-server proxyt `/api/hiscore` naar de RS3-hiscores en `/api/runemetrics` naar RuneMetrics, omdat die API's geen CORS-headers sturen. Tests: `npm test --prefix app` (Vitest). Typecheck: `npm run typecheck --prefix app`. |
| `app/src/data/route.json` | De route die de app toont. **Niet met de hand bewerken**: wordt gegenereerd door `research/scripts/build_route.py`. |
| `research/ROUTE-SCHEMA.md` | Het dataschema van `route.json`: het contract tussen research en app. |
| `research/Route Ons Pap.md` | De route in leesbare vorm, met fasetabellen die uit dezelfde bron komen als `route.json`. |
| `research/Guide-afweging.md` | Waarom welke guide hoeveel meeweegt. |
| `research/Review EIPG en RS Guy.md` | Stapsgewijze review van de Efficient Ironman Pathway Guide en de RS Guy-guide. |
| `research/Game-updates 2025-2026.md` | Alle RS3-game-updates van nov 2025 tot nov 2026, getoetst aan de route. |
| `research/API en plugins.md` | Officieel pluginsysteem (live sinds 19 okt 2026), publieke Jagex-API's (RuneMetrics stopt 10 nov 2026), wiki- en Weird Gloop-API, Alt1, wat mag volgens Jagex en welke bouwideeën voor de tracker (stand 4 nov 2026). |
| `research/In-game status.md` | In-game feiten die de API niet laat zien (nieuwste bovenaan, met datum). |
| `research/snapshots/` | Momentopnames van hiscores en RuneMetrics (profiel, quests). |
| `research/scripts/build_route.py` | Bron van `route.json` en van de faseblokken in `Route Ons Pap.md`. |
| `research/Site-review thersguide.md`, `Site-review rs3ironman.md`, `Site-review ironman.guide.md` | Wat uit die sites is overgenomen (inhoud alleen van de RS3-sites; van ironman.guide alleen UX-ideeën, want dat is OSRS). |
| `research/scripts/build_quest_links.py` | Bouwt `app/src/data/quest-links.json` (Quick guide-link per quest) uit een RuneMetrics-questsnapshot; zie `app/README.md`. |
| `research/scripts/validate_route.py` | Valideert `route.json` tegen het schema en de quest-snapshot: `python -I research/scripts/validate_route.py "<pad naar RS3 Ironman>"`. |

### Repo en werken vanaf een andere computer

- GitHub: privérepo `https://github.com/MeesvondenHoff/rs3-ironman-tracker` (branch `main`, remote `origin`). Mees gaf op 2026-11-03 toestemming om bij dit project zelf te committen en te pushen; doe dat na elke afgeronde wijziging, met een Nederlandse commitboodschap.
- Alle projectkennis staat in dit bestand en in `research/`; Claude Code laadt `CLAUDE.md` vanzelf zodra de map open staat. Er is geen kennis die alleen in het geheugen van één computer leeft; staat iets alleen in een chat, zet het dan hier of in `research/In-game status.md`.
- Op een andere computer: `git clone` van de repo, daarna `npm install --prefix app` en `npm run dev --prefix app`. De app bewaart vinkjes, notities en snapshots in localStorage van de browser, dus die reizen niet mee; gebruik de back-up (Logboek, exporteren/terugzetten) om ze over te zetten.
- **Urgent (vastgelegd 2026-11-04)**: de RuneMetrics- en Adventurer's Log-API stoppen op 10 november 2026 (Jagex-nieuws 26 okt en 2 nov). De app haalt profiel, activiteiten en quests daar vandaan (`app/src/lib/api.ts`), en `build_quest_links.py` en `validate_route.py` gebruiken de RuneMetrics-questsnapshot. De vervangende web-API wordt gedocumenteerd op developer.runescape.com; zodra die er is de app omzetten. Hiscores blijven werken. Details: `research/API en plugins.md`.
- Wiki en curl: de wiki blokkeert alleen de standaard-User-Agent; met een beschrijvende User-Agent (bijv. `OnsPapTracker/0.1 (research; contact via github MeesvondenHoff)`) werken `?action=raw` en `api.php` gewoon met curl.
- Openstaand (vastgelegd 2026-11-03): de route opnieuw toetsen zodra de Late-Game Rebalance en de MTX-verwijdering (november 2026) en de Remastered Journey met het nieuwe Elvarg-model (2 december 2026, raakt Dragon Slayer, stap p1-09) live zijn. Staat ook in `research/In-game status.md`.

### Account en doel

- **Account**: "Ons Pap", RS3 **solo standaard Ironman** (niet Hardcore, niet Group Ironman; bevestigd door Mees op 2026-11-03). Het account zit op een **Jagex Account** (bevestigd 2026-11-03): de optie bij Mr Ex om het Book of diplomacy nooit te verkopen werkt daarom niet, wel de verlenging van de de-iron-wachttijd tot 90 dagen. Alles over Group Ironman in dit bestand is alleen achtergrond en geldt niet voor dit account.
- **Speler**: Mees. Doel is combat-klaar mid game: combat 100+, tier 70-80 gear, Slayer, eerste bosses.
- **Speelstijl**: overdag vaak AFK-skilling naast het werk, 's avonds actieve gameplay. Samen 7 tot 15 uur per week. Plan AFK-stappen dus als dagvulling en actieve stappen (quests, Slayer, bosses) als avondwerk.
- **Wat Mees leuk vindt**: PvM boven alles (Araxxor, Vindicta, nieuwe bosses leren), unieke drops, betere gear halen en het account zien groeien. Combat-klaar is de eerste mijlpaal, niet het einddoel: daarna gaat het om bossprogressie (GWD2/Vindicta, Araxxor en verder).
- **Terugkerende speler**: Mees speelde RS3 vóór Necromancy (dus vóór augustus 2023). Necromancy, de Combat Style Modernisation (maart 2026), de rebalances van 2026 en Fort Forinthry zijn nieuw voor hem; leg die zonder aannames uit als ze langskomen. Bevestigd op 2026-11-03: Necromancy als hoofdstijl en bosses pas na combat-klaar (Ivar in fase 2 als vroege uitzondering).
- **Rol van Claude tijdens het gamen**: quick guide voor snelle vragen. Kort antwoorden, altijd eerst de RS3-wiki raadplegen (nooit uit het hoofd bij eisen, drops, mechanics of getallen), elke tip door de ironman-toets (hoofdstuk 3) halen, en bij een boss altijd eisen, aanbevolen gear voor een ironman en de kernmechanics geven.
- **Blijft ironman**: Mees wil hoe dan ook ironman blijven (2026-11-03). De-ironing, Group Ironman of Hardcore komen nooit als optie in route of advies; stap p1-15 zet de de-iron-wachttijd bij Mr Ex op 90 dagen als slot op de deur.
- **Route-keuze**: Necromancy als hoofdstijl. Zie `Route Ons Pap.md` voor de onderbouwing.
- **Bossvolgorde** (besluit 2026-11-03): K'ril is de eerste boss; de Queen Black Dragon is uitgesteld tot Herblore omhoog gaat (antifire vraagt Herblore 69 met een anti-dragon shield, super antifire Herblore 85). Na fase 1 volgt de brug naar Vindicta (stap p6-07); Zaros's Bastion in GWD2 vraagt Attack 80 (boostbaar). Besluit Mees 2026-11-03: Attack 30 naar 70 (plus super attack, Herblore 45) is de eerste stap ná combat-klaar, als voorwaarde voor Vindicta; zie 'Na fase 1' in Route Ons Pap.md.

### Werkregels

1. **Alleen RS3-bronnen.** Gebruik runescape.wiki en officiële RS3-nieuwsberichten, nooit oldschool.runescape.wiki. OSRS heeft andere ironman-regels (bijvoorbeeld Ultimate Ironman en een eigen Group Ironman).
2. **Geen Double XP-advies.** Ironmen krijgen tijdens Double XP-events geen XP-boost (Double XP). Plan nooit rond DXP en negeer DXP-tips uit guides en nieuws.
3. **In-game feiten** die de API niet toont, komen in `research/In-game status.md`, met datum.
4. **Bij een routewijziging**:
   - pas `build_route.py` aan;
   - regenereer `route.json` en valideer met `validate_route.py`;
   - werk de fasetabellen in `Route Ons Pap.md` bij;
   - behoud bestaande stap-id's (nieuwe stappen krijgen een nieuw id).
5. **Ironman-toets**: elk advies (guide, forum, nieuws) eerst toetsen aan hoofdstuk 3 van dit bestand. Veel algemene RS3-guides gaan uit van de Grand Exchange.
6. **Bij twijfel** over een regel: de RS3-wikipagina zelf lezen (`https://runescape.wiki/w/<Titel>?action=raw`, met een beschrijvende User-Agent) en de datum van de laatste update controleren.
7. **Questbeloningen op de questpagina zelf controleren.** De verzameltabellen op de wiki (zoals "Quests for Agility experience") tellen "Additional rewards" mee zonder hun level-eis. Voorbeeld van 2026-11-03: de tabel noemde 10.000 Agility-XP voor Myths of the White Lands, maar die zit in een grot die Agility 55 vraagt; de quest zelf geeft een lamp van 500 XP. Lees dus per quest de secties Rewards en Additional rewards, en noteer beloningen met een eis als latere bonus, niet als directe opbrengst. Geldt voor subagents én voor snelle antwoorden tijdens het gamen.
8. **Bouwwerk gaat naar een subagent** (op deze computers `bouwer-opus` voor programmeerwerk, `bouwer-sonnet`/`bouwer-haiku` alleen voor mechanisch werk); de hoofdchat verkent, beslist en controleert. Bestaan die agenttypes niet op de computer waar je zit, gebruik dan de gewone agent.

Bronnen hoofdstuk 1: projectbestanden; Double XP.

---

## 2. Wat Ironman Mode in RS3 is

### Kern

Ironman Mode is een spelmodus waarin de speler volledig zelfvoorzienend moet zijn. Uitgezet zijn:
- trading met andere spelers;
- de Assist System;
- de Grand Exchange (op een paar uitzonderingen na);
- loot uit PvP.

Ook groepsactiviteiten en minigames waar een ironman zou profiteren van de inzet van anderen zijn beperkt (Ironman Mode).

### Ontstaan en varianten

| Modus | Release | Kenmerk | Badge |
|---|---|---|---|
| Ironman | 13 oktober 2014 | Basisregels | Donkergrijze halter |
| Hardcore Ironman | 13 oktober 2014 | Als Ironman, plus één leven | Rood doodshoofd |
| Group Ironman (regular) | 28 oktober 2024 | 2 tot 5 spelers, vrij handelen binnen de groep, gedeelde Group Ironman Storage | Grijze helm |
| Competitive Group Ironman | 28 oktober 2024 | Strengere regels: elke hulp van buiten de groep kost drops en XP | Grijze helm met gouden bogen |

- Een bèta met ongeveer 130 spelers liep vanaf 30 september 2014 (Ironman Mode).
- **RS3 kent anno 2026 dus wél Group Ironman.** Regular groepen zijn ranked of unranked. Een groep wordt unranked als er ooit een speler in zat die al vóór de lancering een gewone Ironman was (Group Ironman Mode).
- **Ultimate Ironman bestaat niet in RS3.** De Ironman Mode-pagina noemt alleen de vier modi hierboven. Dit is afgeleid, er is geen aparte bevestiging.
- **Leagues en Fresh Start Worlds** zijn aparte, tijdelijke spelmodi en geen ironman-varianten.

### Hoe je ironman wordt

- Kiezen kan alleen bij het aanmaken van het personage (Play Mode op het creatiescherm). Na het verlaten van de tutorial kan het niet meer (Ironman Mode).
- Een gewone Ironman kan later naar Group Ironman overstappen via het groepsinterface op de **Iron Enclave**, het eiland met de portal in Lumbridge. **Dat is onomkeerbaar** (Group Ironman Mode, Iron Enclave).

### De-ironing

| Vraag | Antwoord | Bron |
|---|---|---|
| Hoe? | Koop bij **Mr Ex** (Edgeville, net noord van de bank) een **book of diplomacy** voor 50.000 coins en lees het. | Mr Ex, Book of diplomacy |
| Wanneer gaat het in? | Na een wachttijd van **7 dagen**, als bescherming tegen gekaapte accounts. Op een Jagex Account kun je die bij Mr Ex verlengen tot **90 dagen**. | Book of diplomacy, Ironman Mode (patch 6 juli 2015) |
| Omkeerbaar? | **Nee.** Het boek verwijdert de status permanent. | Book of diplomacy |
| Kun je het jezelf onmogelijk maken? | Je kunt Mr Ex vragen het boek nooit te verkopen. **Op een Jagex Account kan dat niet**; dan is alleen de verlenging tot 90 dagen mogelijk. | Mr Ex |
| Hardcore | Een Hardcore koopt een **jar of divine light** (100.000 coins) en wordt daarmee een gewone Ironman. Mr Ex bewaart de jar. Een "verzegelde" jar opent pas bij de laatste dood en blokkeert ook de verkoop van het book of diplomacy. | Jar of divine light, Mr Ex |
| Group Ironman | Wie nooit uit GIM wil, regelt dat bij Iroh op de Iron Enclave, niet bij Mr Ex. | Group Ironman Mode (patch 2 december 2024) |
| Gevolgen | Na de wachttijd vallen alle beperkingen weg: GE, trading, Double XP enzovoort. Auras die GIM-spelers automatisch hadden, worden bij het verlaten van de modus vergrendeld. | Book of diplomacy, Group Ironman Mode |
| Hiscores | Bij de-ironing of dood maakt het spel een **eenmalige momentopname** voor het Hardcore-leaderboard (nieuws juli 2026). | Update: The Week Ahead: GE Improvements, Capes and the HCIM Leaderboards |

**Onzeker:** wat er met een gewone Ironman op de Ironman-hiscores gebeurt na de-ironing. De wiki noemt alleen de momentopname voor Hardcore.

### Hiscores en herkenbaarheid

- **Hiscores**: er zijn aparte hiscores voor Ironman en voor Hardcore Ironman. Ironmen staan óók op de gewone hiscores. Hardcores staan ook op de Ironman-hiscores (HiScores).
  - De app gebruikt de Ironman-hiscores; die staan apart van de gewone.
- **Hardcore die zijn status verliest**: blijft op de Hardcore-hiscores staan. De naam wordt doorgestreept en een tooltip noemt de doodsoorzaak (Ironman Mode).
- **Herkenbaarheid**:
  - De chatbadge is niet uit te zetten. Een Premier-badge kan niet aan (Ironman Mode).
  - Titels: Ironman, Ironwoman of Iron (als prefix of suffix). Na 5 jaar en een gesprek met Mr Ex komen daar "the Ironman Btw" en varianten bij.
  - Overrides: **Ironman Armour** (helm en harnas) of Ironman (Hardcore). Na 5 jaar komt er een goudgerande variant bij.
- **Prijsweergave**: examine en de price checker tonen de **High Level Alchemy-waarde** in plaats van de GE-waarde. Loot beams en de waarschuwing bij droppen boven 500.000 werken nog wél op GE-waarde (Ironman Mode).

### Hardcore: alleen het verschil

| Regel | Inhoud | Bron |
|---|---|---|
| Levens | Eén leven. Bij de laatste dood wordt het account een gewone Ironman (sinds 13 juli 2020; daarvoor werd het account vergrendeld). | Ironman Mode |
| Extra levens | Mr Ex verkoopt twee **divine coins**: bij 1.000 total level voor 100.000 coins en bij 1.600 total level voor 10 miljoen coins. | Mr Ex |
| Spullen bij dood | Sinds 29 augustus 2023 gelden de gewone doodsregels: spullen naar Death's Office, terug te kopen tegen de normale prijs. Het leven gaat wel verloren. | Ironman Mode |
| Safe deaths | Geen levensverlies bij doden die ook voor een gewone speler "safe" zijn. Voorbeelden: POH, Dungeoneering, de practice mode van boss-instances, Fight Cave/Kiln, Troll Invasion, Shattered Worlds, sommige questgevechten. Ook een redding door een sign/portent of life/death of door Immortality telt als safe. | Ironman Mode |
| Melding | Een globale melding bij een Hardcore-dood vanaf 1.000 total level. | Ironman Mode |

Ons Pap is geen Hardcore, dus deze regels gelden niet voor de route.

Bronnen hoofdstuk 2: Ironman Mode, Group Ironman Mode, Iron Enclave, Mr Ex, Book of diplomacy, Jar of divine light, HiScores, Update: Group Ironman Launch, Update: The Week Ahead: GE Improvements, Capes and the HCIM Leaderboards.

---

## 3. Beperkingen, volledig en precies

De eerste tabel volgt de officiële restrictietabel op de wiki-pagina Ironman Mode, aangevuld met de losse pagina's. GIM staat voor Group Ironman, CGIM voor Competitive Group Ironman.

### 3.1 Handel, Grand Exchange, items van anderen

| Onderwerp | Ironman | Hard/zacht | Toelichting | Bron |
|---|---|---|---|---|
| Trading met spelers | Nee | Hard | Uitzonderingen: zie de volgende twee regels. | Ironman Mode |
| Bonds ontvangen | Ja | - | Ook via trade van een ander. | Ironman Mode, Bond |
| Bonds weggeven of verhandelen | Nee | Hard | | Ironman Mode, Bond |
| Heroes' Quest-items | Ja | - | Alleen de miscellaneous key en Pete's candlestick zijn verhandelbaar. | Ironman Mode |
| Grand Exchange | Alleen kopen van bonds en bepaalde cosmetica | Hard | Kopen kan: bonds, sommige override- en animatietokens, title scrolls en (sinds 28 september 2026) enkele Leagues 2-furniture plans. Sinds juli 2026 verbergt de zoekfunctie wat een ironman niet mag kopen. **Verkopen kan niet.** | Ironman Mode, Grand Exchange, Update: Havenhythe Part II out now!, Update: The Week Ahead: GE Improvements… |
| Drops van spelers oprapen | Nee | Hard | Uitzondering: bones van de dood van een andere speler. | Ironman Mode |
| Monsterdrops die een ander eerst aanviel | Nee | Hard | Op een paar speciale items na (Maul of omens, planken bij Yakamaru, Eir's helmet/spear). | Ironman Mode |
| Items aan een main geven | Ja, eenrichtingsverkeer | Zacht | Item laten vallen (riskant) of via de Treasure chest uit Carnillean Rising. | Ironman Mode |
| Gift of Friendship (+1% XP) | Ja | Zacht | Ontvangen pas na de quest **Eclipse of the Heart**. | Ironman Mode, Gift of Friendship |

### 3.2 Microtransacties, bonds, Treasure Hunter, Marketplace

| Onderwerp | Ironman | Hard/zacht | Toelichting | Bron |
|---|---|---|---|---|
| Treasure Hunter | Nooit toegestaan, en **verwijderd op 19 januari 2026** | Hard | Ironmen konden nooit keys krijgen of spelen. | Treasure Hunter, 2025 microtransactions proposal |
| Progressie-MTX (prismatic lamps/stars, protean items, portables, elite training dummies, advanced pulse cores, Slayer Wildcards) | Nee | Hard | Sinds 19 januari 2026 voor niemand meer te koop. Bestaande items blijven bruikbaar tot **23 november 2026**. | 2025 microtransactions proposal, Update: Havenhythe Part II out now! |
| Bonds kopen | Ja, op de GE met coins | - | Dit is de GE-uitzondering. | Grand Exchange |
| Bonds inwisselen | Membership, bankruimte, RuneCoins, naamswijziging | - | **Niet** voor Radiant Stars (bonus XP). | Template: Permanent bond merchandise |
| Radiant Stars (bonus XP voor echt geld, sinds 19 januari 2026) | Nee | Hard | | Radiant Star |
| Marketplace | Alleen cosmetica | Zacht | Sinds 19 januari 2026 cosmetica en Radiant Stars (die laatste niet voor ironmen). | Marketplace, Radiant Star |
| Oddments | Verwijderd op 19 januari 2026 | - | Omwisselen naar coins gold alleen voor niet-ironmen. Wapens uit de oude Oddments store (Imcando pistol, Serpentine wand, Ban hammer) blijven voor ironmen op tier 1-stats (sinds 8 februari 2021). | 2025 microtransactions proposal, Ironman Mode |
| Solomon's General Store | Wicked pouches, challenge gems en citadel boosters waren al niet te koop | Hard | Winkel verwijderd in april 2026. | Ironman Mode, Premier Membership |
| Premier / 12-Month Membership | Membership en cosmetica wel | Zacht | Oude ironman-afwijkingen (bijv. 3.000 coins per maand in plaats van items) zijn met de uitfasering in 2026 vervallen. | Premier Membership |
| Legendary pet-abilities | Nee | Hard | Life saver, slayer finisher, repair en fertiliser werken niet. | Ironman Mode |
| Advanced pulse core van een ander | Geen effect | Hard | | Ironman Mode |
| Vic the trader / Portable Trader (bonus XP ruilen) | Nee | Hard | | Ironman Mode, Vic the trader |

### 3.3 PvP en Wilderness

| Onderwerp | Ironman | Hard/zacht | Bron |
|---|---|---|---|
| PvP-loot | Nee | Hard | Ironman Mode |
| PvP-XP | Nee | Hard | Ironman Mode |
| Summoning scrolls uit de familiar van een gedode speler | Nee (sinds 19 augustus 2019) | Hard | Ironman Mode, Wilderness |
| Wilderness-PvM, Wilderness Slayer (Mandrith), Bandit Duty Free, Chaos altar | Ja | - | Wilderness, Ironman Mode/Guide/Shop Run |
| Wilderness Flash Events, Warbands | **Verwijderd** op 16 maart 2026 (voor iedereen) | - | DailyScape Overhaul |

### 3.4 Groepscontent, bossen, raids, Dungeoneering

| Onderwerp | Ironman | Hard/zacht | Toelichting | Bron |
|---|---|---|---|---|
| Bossen met niet-ironmen | Ja (sinds 20 september 2022) | - | Samen in instances, geen matchmaking-beperking meer. Drops gaan **op dezelfde manier als bij gewone accounts, inclusief LootShare**. | Update: Combat Mini Strike, LootShare, Instance |
| Verplicht instance gebruiken | Nee meer (sinds 20 september 2022) | - | Daarvoor moesten ironmen een instance gebruiken waar die bestond. | Instance |
| Instance-kosten | Voor iedereen weg sinds 20 juli 2026 (Mid-Game Rebalance) | - | De oude ironman-korting verviel al in 2022. | Update: Patch Notes: Mid-Game Rebalance, Instance |
| Group-boss-mechanic drops | Ja | - | | Ironman Mode |
| XP bij gedeelde kills | Naar rato van eigen damage | Zacht | Niet de volle XP van het monster. | Ironman Mode |
| Wie krijgt de drop (gewone monsters) | Taggable monster: wie eerst aanviel. Untaggable: wie de meeste damage deed. | Zacht | Volgens de Drops-pagina moet een ironman bij untaggable monsters de meeste damage doen, ook als hij eerst taggede. | Drops |
| CoinShare | **Onzeker** | - | Geen RS3-bron zegt expliciet of een ironman item shards krijgt. Shards zijn bedoeld om te verkopen of te verzamelen; een ironman kan ontbrekende shards niet bijkopen, dus het heeft voor hem geen nut. | CoinShare, Item shards |
| Raids: Liberation of Mazcab | Ja | - | Coffer-systeem: elke deelnemer krijgt zijn eigen loot. Daglockout weg sinds 16 maart 2026. Puzzel is met minder dan 4 spelers te doen sinds 28 oktober 2024. | Drops, Liberation of Mazcab, DailyScape Overhaul |
| Dungeoneering | Ja, ook met niet-ironmen (sinds **11 mei 2026**, Dungeoneering Remastered) | - | Daarvoor alleen met andere ironmen (sinds 16 mei 2022). CGIM alleen binnen de eigen groep. | Ironman Mode, Update: Patch Notes: Dungeoneering Remastered, Dungeoneering |
| Social (Co-op) Slayer | Nee | Hard | GIM alleen binnen de groep. | Slayer, Ironman Mode |
| Assist System | Nee | Hard | | Assist System |
| Clan avatar XP-buff (3-6%) | Nee | Hard | De resource-buff (50% op skill plots) en grondstoffen verzamelen via de avatar mogen wel (sinds 6 augustus 2018). | Clan avatar |

**Ondersteuning door anderen in gevechten** (Ironman Mode, tabel "Combat and bosses"):

| Effect van een andere speler | Werkt op ironman? |
|---|---|
| Heal Other / Heal Group, Vengeance Other / Group | Ja, als je de eis zelf hebt vrijgespeeld (Lunar Diplomacy; Livid farm-punten voor Vengeance Other) |
| Shield Dome, Ruby Aurora, Intercept, Prism of Dowsing / Salvation | Ja, na unlock (The Light Within voor Shield Dome/Aurora) |
| Kal'gerion demon special (Crit-i-Kal) | Ja |
| Cure Other / Group, Tele-Group, Tele-other, Boost Potion Share | Nee |
| Ice Asylum, Prism of Loyalty van een ander | Nee |
| Soul Link, Teamwork Protection (Seren prayers) | Nee |

### 3.5 Minigames en Distractions & Diversions

| Activiteit | Meedoen | Beloningen voor ironman | Bron |
|---|---|---|---|
| Fist of Guthix, Heist (de oude cops-and-robbers-minigame) | Nee | Geen. Music-unlocks krijg je door te proberen binnen te gaan. | Ironman Mode |
| Thieving-Heists (Vault of Hereditas enz., sinds november 2025) | Ja | Volledig. De ironman-guide raadt het aan als geldbron. | Ironman Mode/Guide |
| Pest Control / Conquest | Ja | Alleen equipment, Void Knight seals en charms; geen XP, herb-, mineral- of seed-packs. Conquest-staking uit. | Ironman Mode |
| Soul Wars | Ja | Alles behalve random loot. Zeal voor XP en charms werkt (fix 28 oktober 2024). | Ironman Mode |
| Barbarian Assault | Ja | Geen gambles. Sinds 2 september 2024 zijn Penance trident en insignia's wel te koop. | Ironman Mode |
| Stealing Creation | Ja | Alleen Artisan's en Fletcher's outfit. Die zijn sinds 16 maart 2026 ook te koop bij Stanley Limelight voor 360 thaler per stuk. | Ironman Mode, DailyScape Overhaul |
| The Great Orb Project | Ja | Alleen cosmetica (bijv. Runecrafting outfit) en één Blood altar teleport. | Ironman Mode |
| Dominion Tower | Ja | Group rumbles uit, dus de titel "the Survivor" is onhaalbaar. | Ironman Mode |
| Thaler | Te verdienen in toegankelijke minigames | Alleen besteedbaar aan wat ironmen ook elders mogen. Hybrid armour wel; BA-recolours en diviner's outfit niet. | Ironman Mode |
| Fishing Trawler | Ja (sinds 29 juni 2026 volledig) | Ja | Update: Chill June Patch Week |
| Blast Furnace, Trouble Brewing, Sinkholes, Demon Flash Mobs | Ja (sinds 28 oktober 2024) | Ja (CGIM beperkt) | Ironman Mode, Sinkholes, Demon Flash Mob |
| TzHaar Fight Pit | Ja | Ja (alleen CGIM krijgt geen tokkul) | Ironman Mode |
| Evil Trees, Shooting Stars | Ja | Ja. Sinds 16 maart 2026 zonder dagcap; bij een star alleen beloning van een sprite die je zelf hielp vrijmaken. | Evil Tree, Shooting Star, DailyScape Overhaul |
| Guthixian Caches | Ja | Ja. Sinds 16 maart 2026 spelergestuurd vanaf Divination 35, XP gehalveerd. | Guthixian Cache, DailyScape Overhaul |
| Penguin Hide and Seek, Herby Werby, Tears of Guthix, Effigy Incubator | Ja | Ja. Effigy-sterren geven ironmen bonus XP in plaats van directe XP (sinds 28 september 2020). | Penguin Hide and Seek, Herby Werby, Tears of Guthix, Effigy Incubator |
| Holiday-event trainingsstations | Ja | XP wel. Lampen, bonus-XP-sterren en cash bags uit tijdelijke events meestal niet. | Ironman Mode |
| Event bonus XP of reputatie (bijv. Winter Weekends in het Artisans' Workshop) | - | Nee | Ironman Mode |

### 3.6 Winkels

**Basisregel**: ironmen mogen **alle gewone NPC-winkels** gebruiken, zowel kopen als verkopen.
- De voorraad is **persoonlijk** per speler (sinds 2 september 2009).
- Prijzen zijn **statisch** sinds 2012; kopen of verkopen verandert de prijs niet.
- General stores kopen bijna alles op. Verkopen aan een winkel is de ironman-variant van de Daily Challenge "Grand Exchange".

Bronnen: Shop, Challenge System.

**Winkels en verkopers die ironmen niet of beperkt mogen gebruiken:**

| Winkel / NPC | Regel | Hard/zacht | Bron |
|---|---|---|---|
| Vic the trader / Vic's Store | Uit | Hard | Vic the trader |
| Travelling Merchant | Voor iedereen verwijderd op 16 maart 2026 | - | DailyScape Overhaul |
| Solomon's General Store | Gedeeltelijk uit, sinds april 2026 helemaal verdwenen | Hard | Ironman Mode, Premier Membership |
| Pest Control, Great Orb Project, Stealing Creation, Soul Wars, Barbarian Assault | Alleen de items uit 3.5 | Hard | Ironman Mode |
| Mandrith | Geen brawling gloves (sinds 23 oktober 2017) | Hard | Ironman Mode |
| Stanley Limelight Traders (thaler) | Per item gemarkeerd; bijv. sacred clay armour niet | Hard | Stanley Limelight Traders |

**DailyScape-wijziging, 16 maart 2026**: bij veel winkels en gratis-item-NPC's reset de voorraad niet meer per dag. Hij bouwt over **7 dagen** op naar een nieuw, hoger maximum. De voorraad blijft persoonlijk. Eén run per week volstaat dus. Het gaat om:

- **Slayer-winkels**: alle masters en Burthorpe, Sophanem Slayer Supplies.
- **Runewinkels**: Magic Guild, Baba Yaga, Tutab, Void Knight, Lundail, Ali, Anachronia, Battle Runes, TzHaar-Mej-Roh, Aubury, Betty, Carwen.
- **Veren**: Gerrant, Lumbridge Fishing Supplies, Fishing Guild, Fernahei, Shantay Pass, Ava, Oo'glog Gift Shop, Island/Etceteria/Fremennik Fishmonger, Meena, Survival Shop.
- **Herblore**: Lighthouse, Meilyr, Aemad, Obli, Jatix, Sigmund, Granny Rowan.
- **Farming**: Sarah, Vanessa, Richard, Alice, Papa Mambo.
- **Summoning**: Contraband Yak Produce, Fresh Meat, Beefy Bill.
- **Overig**: Culinaromancer's Chest (eten), Rodney, Bandit Duty Free, Arhein, Anachronia Gem Shop, Razmire Builders' Merchants, Mami Rimba.
- **Gratis-item-NPC's**: Wizard Cromperty (pure essence), Geoffrey (flax), Weird Old Man (potato cacti), Bert (sand), Coeden (logs), Lupe (ritual supplies), Dell Monti (fruit), Razmire Keelgan (planken), Rosie's supplies, The Black Marketeer.

Bron: DailyScape Overhaul, Update: Patch Notes: Dailyscape Overhaul.

**Onzeker:**
- De exacte nieuwe maxima per winkel. De wiki markeert dit zelf als nog uit te zoeken.
- Of runes nog per dag resetten. De Shop-pagina en de Shop Run-guide zeggen "per dag", maar die tekst is ouder dan de overhaul, en de overhaul noemt rune stores juist als winkels die 7 dagen opbouwen. Ga uit van de overhaul en controleer in-game.

### 3.7 Huizen, citadel, port, farm, Miscellania

| Onderwerp | Ironman | Hard/zacht | Toelichting | Bron |
|---|---|---|---|---|
| POH van een ander bezoeken / gasten uitnodigen | Ja | - | | Ironman Mode |
| Functionele meubels in het POH van een ander (altaar, portals, enz.) | Nee | Hard | GIM wel binnen de groep. Een eigen gilded altar is dus nodig. | Ironman Mode |
| Gasten in het huis van een ironman | Mogen meubels gebruiken, maar geen incense burners aansteken | Hard | | Ironman Mode, Player-owned house |
| Homestead (sinds de POH-rework van 13 juli 2026) | Meedoen mag, ook met niet-ironmen | - | | Ironman Mode, Player-owned house |
| Sunken Pyramid (player-owned Slayer dungeon) van een ander | Nee, en anderen ook niet in die van een ironman (sinds eind 2024) | Hard | | Sunken Pyramid, Ironman Mode |
| Clan Citadel skill plots | Ja, maar **25% van de normale XP** | Zacht | | Ironman Mode, Clan Citadel |
| Clan Citadel wekelijkse bonus XP (Quartermaster) | **Onzeker** | - | De ironman-guide "Repeatable events" noemt het als weekly; de Clan Citadel-pagina zegt niets over ironmen. | Ironman Mode/Guide/Repeatable events |
| Player-owned port | Ja, zonder ironman-beperkingen | - | Eis: level 90 in één van twaalf skills. Bron van Tetsu-, Death Lotus- en Seasinger's-gear en scrimshaws. | Player-owned port, Ironman Mode/Guide |
| Player-owned farm | Ja | - | Geen dieren uit Falador party-ballonnen (sinds 14 januari 2019). Pen construction kits voor beans zijn een optie voor ironmen met lage levels. | Ironman Mode, Player-owned farm |
| Managing Miscellania | Ja | - | Kost coins. Herbs: 61 per dag voor 50.000 coins per dag. Beste bron van mahogany logs voor ironmen. | Managing Miscellania, Ironman Mode/Guide/Herblore, Ironman Mode/Guide |
| Divine locations van anderen | Nee, en anderen geven jou geen extra loot | Hard | Sinds 16 maart 2026 kan niemand meer nieuwe divine locations maken. | Divine location, DailyScape Overhaul |
| Portable skilling stations en elite training dummies van anderen | Nee | Hard | Uitzondering: luminite injectors in het Artisans' Workshop en de grill in Waiko. Te koop waren ze al niet; MTX-portables verdwijnen per 23 november 2026. | Portable skilling stations, Ironman Mode |

### 3.8 XP: wat telt en wat niet

| Bron | Ironman | Hard/zacht | Bron |
|---|---|---|---|
| Double XP-events (volgende: 6 t/m 16 november 2026) | **Geen boost** | Hard | Double XP |
| Bonus XP kopen (Radiant Stars), Vic, Treasure Hunter-sterren en -lampen | Nee | Hard | Radiant Star, Vic the trader, Treasure Hunter |
| Lampen uit tijdelijke events | Meestal niet | Zacht | Ironman Mode |
| Quest-XP en quest-lampen/tomes | Ja | - | Ironman Mode/Guide |
| Daily Challenges | Ja. Sinds 16 maart 2026 zonder weektrack, extend of reroll; ironmen krijgen andere varianten (bijv. verkopen aan een winkel). | - | Challenge System |
| Penguin Hide and Seek, Herby Werby, Tears of Guthix, Circus, Troll Invasion, Giant Oyster, God Statues, Effigy Incubator | Ja | - | Ironman Mode/Guide, Ironman Mode/Guide/Repeatable events |
| Agoroth (black pearl, bonus XP), Fort Forinthry Town Hall (rested XP, bonus XP) | Ja; geen ironman-uitzondering gevonden | - | Bonus experience |
| Clan Citadel | 25% XP op plots; weekbonus onzeker | Zacht | Clan Citadel |
| Clan avatar XP-buff | Nee | Hard | Clan avatar |
| Gift of Friendship | Ja, na Eclipse of the Heart | Zacht | Gift of Friendship |
| Seizoensevents (bijv. Easter Bunny's burrow) | XP wel | - | Ironman Mode |
| Soul Wars zeal naar XP | Ja | - | Ironman Mode |
| Reaper-taken | Volle Slayer-XP (de halvering verviel op 17 oktober 2016) | - | Soul Reaper |

### 3.9 Overige systemen

| Onderwerp | Ironman | Toelichting | Bron |
|---|---|---|---|
| Invention en augmenteren | Geen eigen beperkingen | Componenten komen alleen uit eigen disassembly, Scavenging en drops; er is geen markt. Sinds 20 juli 2026 bestaan er geen negatieve perks meer. | Ironman Mode/Guide/Invention, Augmentation, Update: Patch Notes: Mid-Game Rebalance |
| Archaeology-relics | Geen ironman-beperking gevonden | Advanced pulse cores als boost: niet voor ironmen. Materialen en artefacten moet je zelf verzamelen. | Archaeology |
| Soul Reaper | Ja, normaal | Sinds 16 maart 2026: Slayer 45 en combat 50, geen dagcap, max 300 reaper points per week, levert ook Slayer-punten op. | DailyScape Overhaul, Soul Reaper |
| Achievements | Sommige hebben een ironman-variant | Bijv. "It's Dangerous to go Alone" (dungeon alleen in high complexity), "Kitchen Aid", "Gone Fishing", "Catching Some Rays" (rocktail koken op de Witchaven-docks), "Cops and Robbers". | Ironman Mode |
| Quests | Ironman-only eisen | Je moet questitems zelf maken. Dat geeft extra skill-eisen, bijv. Smithing 20 voor de steel bars in Desert Treasure. Bijna al die eisen zijn boostable. | Ironman Mode/Guide/Quests |
| Achievement-gebaseerde F2P-taken | Enkele onhaalbaar als F2P-ironman | Niet relevant: Ons Pap is member. | Ironman Mode |

Bronnen hoofdstuk 3: Ironman Mode, Group Ironman Mode, Grand Exchange, Bond, Template: Permanent bond merchandise, Treasure Hunter, 2025 microtransactions proposal, Radiant Star, Marketplace, Premier Membership, Vic the trader, Wilderness, Drops, LootShare, CoinShare, Item shards, Instance, Liberation of Mazcab, Dungeoneering, Slayer, Assist System, Clan Citadel, Clan avatar, Shop, Stanley Limelight Traders, DailyScape Overhaul, Player-owned house, Sunken Pyramid, Player-owned port, Player-owned farm, Managing Miscellania, Divine location, Portable skilling stations, Double XP, Bonus experience, Challenge System, Soul Reaper, Shooting Star, Evil Tree, Guthixian Cache, Penguin Hide and Seek, Herby Werby, Tears of Guthix, Effigy Incubator, Sinkholes, Demon Flash Mob, Gift of Friendship, Archaeology, Augmentation, Ironman Mode/Guide/Quests, en de Update-pagina's: Combat Mini Strike, Patch Notes: Dungeoneering Remastered, Chill June Patch Week, Patch Notes: Dailyscape Overhaul, Patch Notes: Mid-Game Rebalance, Havenhythe Part II out now!, The Week Ahead: GE Improvements…, RSAhead & Treasure Hunter Winding Down.

---

## 4. Wat dit betekent voor progressie naar mid game

### 4.1 Geld

Coins blijven nodig, want ironmen kunnen niets op de GE verkopen.

**Waar het geld naartoe gaat:**

| Afvoer | Orde van grootte | Bron |
|---|---|---|
| Spirit shards (25 coins per stuk bij Pikkupstix en andere Summoning-winkels) | Grootste post. 55-74 met spirit jellies kost ongeveer 7,3 miljoen; 74-86 met granite lobsters ongeveer 32 miljoen. | Spirit shards, Ironman Mode/Guide/Summoning |
| Managing Miscellania | Tot 50.000 per dag in de coffers | Managing Miscellania |
| Winkelruns (runes, veren, vials, secondaries, seeds) | Wekelijks | Ironman Mode/Guide/Shop Run |
| Reclaim-kosten van augmented items (bijv. Sunspear 600.000) | Eenmalig per reclaim | Ironman Mode/Guide/Invention |
| Book of diplomacy en Hardcore-items | Alleen bij de-ironing | Mr Ex |

Instance-kosten zijn sinds 20 juli 2026 verdwenen. De zin "coins nodig voor instance fees" in de wiki-guide is dus verouderd.

**Waar het geld vandaan komt (volgens de ironman-guide):**

| Fase | Methode | Bron |
|---|---|---|
| Vroeg | Rune arrows maken en aan general stores verkopen (153 coins per stuk, onbeperkt); gecraftte items verkopen | Ironman Mode/Guide |
| Vroeg | Shooting Stars: 35.000 coins plus 70 cosmic, 30 astral en 40 gold stone spirits per star, sinds maart 2026 zonder dagcap | Ironman Mode/Guide, DailyScape Overhaul |
| Vroeg | Pickpocketen van Menaphite marketeers of de gullible tourist (gift offerings van 25.000 tot 74.800 coins); corrupted scarabs; water filtration system | Ironman Mode/Guide |
| Vroeg | Eenmalig: Magical Dice uit May's Quest Caravan (250.000 coins, tot 4 keer); Stronghold of Security en Stronghold of Player Safety (elk 10.000) | Ironman Mode/Guide |
| Mid | Slayer-drops alchen (salvage, battlestaves), gargoyles, adamant dragons | Ironman Mode/Guide |
| Mid | Safecracking, Crux Eqal Knights (Thieving 83), Heists (Thieving 95+) | Ironman Mode/Guide |
| Altijd | **High Level Alchemy** vroeg vrijspelen; Runecrafting 44 voor eigen nature runes. Niet alles alchen: sommige items leveren meer op bij een general store. | Ironman Mode/Guide |

### 4.2 Consumables

| Soort | Ironman-bronnen | Bron |
|---|---|---|
| **Food** | Vroeg: cake (Bakery Stall stelen), tuna, lobster, swordfish. Mid: desert sole, catfish, beltfish (Menaphos), shark. Cooked eeligator (1.875 lp) en super restores bij de Mazcab Emergency Merchants in Kanatah: herstelt 1 per 2 minuten en werkt als bank. | Ironman Mode/Guide, Ironman Mode/Guide/Melee |
| **Potions** | Herbs komen uit Slayer-drops (aberrant spectres, banshees, ankou, vyres), Farming, Miscellania en Temple Trekking. Secondaries uit Jatix, Meilyr en Granny Rowan (Fort Forinthry). Vials uit Herblore-winkels. Juju vials alleen bij Papa Mambo. Lampen in Herblore stoppen is gangbaar. | Ironman Mode/Guide/Herblore, Ironman Mode/Guide/Shop Run, Ironman Mode/Guide/Slayer |
| **Runes** | Wekelijkse rune-shop-run (bouwt sinds 16 maart 2026 7 dagen op). Zelf Runecrafting (Runespan, sinds maart 2026 met dubbele punten; Necromantic runes in Um na Rune Mythos). Shooting stars voor cosmic en astral. Caitlin's staff (The Blood Pact) geeft onbeperkt air runes. Sinds 2 maart 2026 kosten Magic-abilities runes (15% kans per cast). | Ironman Mode/Guide/Runecrafting, DailyScape Overhaul, Ironman Mode/Guide/Melee, research/Game-updates 2025-2026.md |
| **Ammo / bolts** | Lowe's Archery Emporium tot adamant arrows; rune bolts bij Valaine en Hickton. Broad bolts na een Slayer-unlock (300 punten; ook in Slayer-winkels te koop). Royal bolts van de Queen Black Dragon. | Ironman Mode/Guide/Ranged |
| **Charms** | Alleen zelf: drops, Charming imp (Dungeoneering), **spirit moths** in Havenhythe vanaf Hunter 18 (sinds maart 2026), charming moths in de Wilderness (Hunter 88). Charms zijn voor niemand verhandelbaar. | Charms, Ironman Mode/Guide/Summoning |
| **Spirit shards** | Kopen voor 25 coins. Deels terug door pouches te ruilen bij Bogrog of Lord Amlodd (70%, Amlodd na Hard Tirannwn ongeveer 10% meer). | Spirit shards |
| **Planks** | Razmire Keelgan: wekelijks gratis planken (na Morytania legs 2), sinds de DailyScape-wijziging 210 planks, 140 oak of 70 teak per week. Miscellania voor mahogany logs. Sawmill. | Razmire Keelgan, Ironman Mode/Guide |
| **Bones / ashes** | Underworld Grimoire 1 (Easy Underworld achievements) stuurt botten naar focus storage; dat raadt de ironman-guide sterk aan. Bonecrusher en Twisted bird skull necklace via Dungeoneering-tokens. Ivar, King of Bones dropt altijd een colossal bone (sinds maart 2026); die kun je alleen begraven (400 XP), niet offeren. | Ironman Mode/Guide/Prayer, Ironman Mode/Guide/Efficient Ironman Pathway Guide |

### 4.3 Gear tier 50 t/m 80 zonder GE

Uitgangspunt van de ironman-guides: smithen en craften voor tank-gear, boss-drops voor power-gear, quests en winkels voor gaten.

**Onzeker:** de gear-tabellen op de wiki zijn grotendeels van vóór de Combat Style Modernisation (2 en 9 maart 2026) en de Mid-Game Rebalance (20 juli 2026). Tiers en bronnen kloppen nog. Of tank-gear nog nuttig is, en hoe abilities en ammo werken, kan veranderd zijn. Toets het per item op de itempagina.

**Necromancy (hoofdstijl van de route)**

| Tier | Hoe | Eisen | Bron |
|---|---|---|---|
| 20-60 | Zelf maken via Kili's Knowledge-taken; per 10 levels opwaarderen met ensouled bars en ink uit rituals | Necromancy-level (niet boostable) plus de taak per tier | Ironman Mode/Guide/Necromancy |
| 70 | Kili's Knowledge V. Tank: United Barrows necroplasm + 100 dragon souls of 20 greater communion rituals. Power: 5 hideous moleskin (Giant mole) + 5 royal chitin (Kalphite Queen). | **The Spirit of War**; Smithing 65 voor het wapen, Crafting 65 en Defence 70 voor armour (projectbronnen) | Ironman Mode/Guide/Necromancy |
| 80 | Kili's Knowledge VI. Tank: Spiritbound hammer (vier GWD1-generals) + 150 Slayer-souls of 30 greater communion rituals. Power: Zaryte fragments (Nex) + tortured soul essence (QBD). | Necromancy 80, Smithing 75 (projectbronnen) | Ironman Mode/Guide/Necromancy |
| - | Wekelijks Thalmund's Wares (woensdag, City of Um) voor greater ensouled cloth, powerful ink, impure essence en moonstone | | Ironman Mode/Guide/Necromancy |

**Melee**

| Tier | Item | Bron | Bron |
|---|---|---|---|
| 50 | Rock-shell armour (power) | Dagannoth Rex of craften | Ironman Mode/Guide/Melee |
| 50-53 | Rune armour +3 (tank) | Smithing, of Scavvo (Champions' Guild, 33 QP) | Ironman Mode/Guide/Melee |
| 60-63 | Orikalkum +3 (tank) | Smithing | Ironman Mode/Guide/Melee |
| 65 | Superior rock-shell (power) | Wilderness shared loot table + Fremennik equipment patch | Ironman Mode/Guide/Melee |
| 70 | Barrows (tank, augmentable), Bandos (power) | Barrows, General Graardor | Ironman Mode/Guide/Melee |
| 74 / 79 | Necronium +4, Bane +4 (tank) | Smithing | Ironman Mode/Guide/Melee |
| 75 / 78 | Vanquish, Sunspear (hybride wapens) | 150 quest points bij May; River of Blood | Ironman Mode/Guide |
| 80 | Anima core of Zaros (Vindicta & Gorvek), Torva (Nex) | Bossen | Ironman Mode/Guide/Melee |

**Ranged**

| Tier | Item | Bron | Bron |
|---|---|---|---|
| 50 | Blue d'hide (Valaine en Oziach), Spined (Dagannoths op Waterbirth), Rune crossbow + off-hand (Valaine) | Winkels en drops | Ironman Mode/Guide/Ranged |
| 60-70 | Red/black salamander (Hunter), Crystal bow/chakram, Blisterwood stakes, Armadyl (Kree'arra) | Hunter, quests, boss | Ironman Mode/Guide/Ranged |
| 75 | Dinosaurhide (Big Game Hunter, Crafting 93), Undead dragonhide, Hand cannon, Vanquish | Diverse | Ironman Mode/Guide/Ranged |
| 78-80 | Sunspear, Chaotic crossbow (Dungeoneering-tokens), Anima Core of Zamorak (Twin Furies), Pernix (Nex), Royal bolts (QBD) | Quest, tokens, bossen | Ironman Mode/Guide/Ranged |

**Magic**

| Tier | Item | Bron | Bron |
|---|---|---|---|
| 50 | Blue mystic (Marvellous Mysticism + Oziach), Skeletal (Wallasalki) | Winkel en drops | Ironman Mode/Guide/Magic |
| 60 | Lunar equipment | Lunar Diplomacy | Ironman Mode/Guide/Magic |
| 60 (wapen) | Guthix staff | Milestone-item in de guide | Ironman Mode/Guide |
| 65 | Superior skeletal | Fremennik patches, Deathmatch of Wilderness-loot | Ironman Mode/Guide/Magic |
| 70 | Robes of Subjugation | K'ril Tsutsaroth | Ironman Mode/Guide/Magic |
| 80 | Anima Core of Seren (Helwyr), Virtus (Nex) | Bossen | Ironman Mode/Guide/Magic |

**Wat bij elke stijl helpt:**
- Salve amulet (e) tegen undead.
- Enhanced Excalibur (Seers' achievements) voor healing.
- Infernal Puzzle Box: geen adrenalineverlies buiten combat.
- Bonecrusher en Charming imp.

Bron: Ironman Mode/Guide (Milestone items), Ironman Mode/Guide/Slayer.

### 4.4 Slayer

| Punt | Inhoud | Bron |
|---|---|---|
| **Smoking Kills zo vroeg mogelijk** | Zonder deze quest krijg je maar de helft van de Slayer-punten. | Ironman Mode/Guide/Slayer |
| Punten sparen | Taken 1 t/m 9 bij Jacquelyn (Lumbridge), de 10e en 50e bij de hoogste master. | Ironman Mode/Guide/Slayer |
| Volgorde van unlocks | De wiki-guide zet de Slayer helmet (400) vooraan, maar die bonus geldt **alleen voor melee** en de black mask vraagt Slayer 58 + Cabin Fever; voor een Necromancy-speler is hij in fase 1 nutteloos (gecorrigeerd 2026-11-03, wiki Slayer helmet). Onze volgorde: ring of slaying (300; ook voor Invention-componenten), sneller doden (400), dan sparen; Bonecrusher/Charming imp aan de toolbelt (500 per stuk), broad bolts (300). | Ironman Mode/Guide/Slayer, Slayer helmet |
| Taken | Een ironman kiest taken op bruikbare drops (herbs, seeds, bones/ashes, salvage), niet op GE-waarde. Prefer: undead, aberrant spectres, vyrewatch, demons, abyssal demons. | Ironman Mode/Guide/Slayer |
| Reaper | Sinds 16 maart 2026 vanaf Slayer 45 en combat 50; levert ook Slayer-punten op; herrollen kost 30 Slayer-punten. | DailyScape Overhaul |

### 4.5 Summoning

- Zwaar en duur voor ironmen. Kosten per band: zie 4.1. Charms moet je zelf farmen.
- **Spirit moths** in Havenhythe (Hunter 18+, sinds maart 2026) zijn een nieuwe charmbron.
- Lampen zijn volgens de ironman-guide een goede manier om lage en middelhoge Summoning-levels over te slaan.

Bronnen: Ironman Mode/Guide/Summoning, Charms.

### 4.6 Prayer

**Onzeker:** de wiki-guide is deels van vóór de Early-Game Rebalance (16 februari 2026). Toen kreeg het Fort Forinthry-altaar minder bonus en werden POH-altaren het snelst. Zie `Game-updates 2025-2026.md`.

| Fase | Methode | Bron |
|---|---|---|
| 1-18 | The Restless Ghost, Ghosts Ahoy | Ironman Mode/Guide/Prayer |
| Basis | Underworld Grimoire voor botten; Bonecrusher plus necklace | Ironman Mode/Guide/Prayer |
| 18+ | Ectofuntus met ashes (beste XP per bot; First Age outfit voor 6.000 ecto-tokens) | Ironman Mode/Guide/Prayer |
| 40+ | Offeren: Chaos altar (+50% per afgeronde Wilderness-takenset), eigen POH-altaar (gilded altar van een ander mag niet) | Ironman Mode/Guide/Prayer, Ironman Mode |
| Vroeg (vanaf maart 2026) | Ivar, King of Bones: altijd een colossal bone. **Alleen begraven** (400 XP); kan niet op een altaar of de Ectofuntus (wiki Colossal bone). | Ironman Mode/Guide/Efficient Ironman Pathway Guide, Colossal bone |
| 75+ | Vyres met Sunspear (na River of Blood) | Ironman Mode/Guide/Prayer |

### 4.7 Invention-materialen

- Geen markt, dus alles via disassembly.
- **Basis- en uncommon-componenten**: white en black equipment uit winkels (goedkoop per component), White Knight Master Armoury (na Wanted), Martin Thwait (claws, throwing knives), insulated boots en enchanted gem packs uit Slayer-winkels.
- **Rare componenten**: specifieke drops of Scavenging.
- **Training**: Sunspear augmenteren en disassemblen (reclaim 600.000), Death guard / Skull lantern van tier 70-90, siphons op item level 12.
- **Niet disassemblen**:
  - de 24 Barrows-stukken die je nodig hebt voor pets;
  - Nex-armour, die nodig is voor tier 92.

Bron: Ironman Mode/Guide/Invention.

### 4.8 Veelgemaakte fouten van beginnende RS3-ironmen

Afgeleid uit de waarschuwingen in de wiki-guides en de ironman-regels. De wiki heeft geen aparte lijst "veelgemaakte fouten". Ook een officiële Jagex-ironman-guide ontbreekt; de officiële bron zijn de patch notes.

| Fout | Waarom fout | Bron |
|---|---|---|
| Rekenen op Double XP of XP-events | Ironmen krijgen geen boost | Double XP |
| Smoking Kills uitstellen | Halve Slayer-punten tot de quest af is | Ironman Mode/Guide/Slayer |
| Alles alchen of verkopen | Herbs, seeds, bones, Barrows-stukken en bossdrops heb je later zelf nodig (Herblore, Prayer, pets, tier 92). Sommige items leveren meer op bij een general store. | Ironman Mode/Guide, Ironman Mode/Guide/Invention |
| Lampen in makkelijke skills stoppen | De guides adviseren moeilijke skills (Summoning, Herblore). Een lamp die je nog niet kunt gebruiken (bijv. Herblore 85-lampen) vernietigen en later terughalen bij Relomia. | Ironman Mode/Guide/Summoning, Ironman Mode/Guide/Herblore, Efficient Ironman Pathway Guide |
| Botten laten liggen | De Underworld Grimoire en Bonecrusher maken van elke kill Prayer-voorraad | Ironman Mode/Guide/Prayer |
| Repeatables laat vrijspelen | De EIPG zet het vrijspelen van repeatables bewust in deel 1 | Efficient Ironman Pathway Guide |
| GE-prijzen gebruiken om waarde in te schatten | Voor een ironman telt de alch- of gebruikswaarde; examine toont dat, loot beams niet | Ironman Mode, Ironman Mode/Guide/Slayer |
| Starterwapens wegdoen | Caitlin's staff (gratis air runes) en Kayle's chargebow (geen ammo) bewaren | Efficient Ironman Pathway Guide |
| Coins verspillen voor Summoning | Shards kosten miljoenen; ruil pouches terug bij Bogrog of Amlodd en plan je charms | Spirit shards, Ironman Mode/Guide/Summoning |
| Overstappen naar Group Ironman of de-ironen "om te proberen" | Beide zijn onomkeerbaar | Group Ironman Mode, Book of diplomacy |
| Main-guides volgen | Die gaan uit van de GE, portables, Treasure Hunter-items en het Assist System | Ironman Mode |

Bronnen hoofdstuk 4: Ironman Mode/Guide en de subpagina's Necromancy, Melee, Ranged, Magic, Slayer, Summoning, Prayer, Invention, Herblore, Runecrafting, Shop Run, Repeatable events en Efficient Ironman Pathway Guide; Spirit shards, Charms, Razmire Keelgan, Managing Miscellania, DailyScape Overhaul, Update: Patch Notes: Mid-Game Rebalance; projectbestand `research/Game-updates 2025-2026.md`.

---

## 5. Veelgestelde vragen en misverstanden

| Vraag | Kort antwoord |
|---|---|
| Kan een ironman in een team bossen? | **Ja**, ook met gewone spelers en in dezelfde instance, sinds 20 september 2022. Drops gaan als bij gewone accounts, inclusief LootShare. Combat-XP krijg je naar rato van je eigen damage. Bij CoinShare is onzeker of het iets oplevert. |
| Moet een ironman de meeste damage doen? | Bij bossen niet meer (2022-patch). Bij untaggable gewone monsters wel, volgens de Drops-pagina. |
| Kan hij items van Treasure Hunter krijgen? | **Nee**, nooit gekund. Treasure Hunter bestaat sinds 19 januari 2026 ook niet meer. |
| Telt Double XP? | **Nee.** Ironmen krijgen geen DXP-boost. |
| Kan hij bonds kopen of gebruiken? | Kopen op de GE met coins: **ja**. Van een ander ontvangen: **ja**. Weggeven of verhandelen: **nee**. Inwisselen voor membership, bankruimte, RuneCoins of een naamswijziging: **ja**. Voor Radiant Stars: **nee**. |
| Kan hij Radiant Stars (bonus XP) kopen? | **Nee.** |
| Kan hij een lift krijgen in een POH van een ander (altaar, portals, gilded altar)? | Het huis **bezoeken mag**, de **functionele meubels gebruiken niet**. Alleen GIM binnen de eigen groep kan dat. |
| Mag hij in een Homestead met mains? | Ja. |
| Kan hij een Clan Citadel gebruiken? | Ja, maar skill plots geven maar 25% XP en de avatar-XP-buff werkt niet. De resource-buff wel. Of de weekbonus-XP werkt, is onzeker. |
| Kan hij met anderen Dungeoneering doen? | Ja, sinds 11 mei 2026 ook met niet-ironmen. |
| Kan hij Raids doen? | Ja, Liberation of Mazcab, met eigen loot via het coffer-systeem. |
| Kan iemand hem helpen met skills (Assist System)? | Nee. |
| Kan hij spullen van een main krijgen? | Nee, alleen bonds en twee Heroes' Quest-items. Omgekeerd kan hij wél items laten vallen voor een main. |
| Mag hij winkels gebruiken? | Ja, alle gewone NPC-winkels (persoonlijke voorraad, vaste prijzen). Sinds 16 maart 2026 bouwt de voorraad bij veel winkels 7 dagen op. |
| Kan hij portables of training dummies van anderen gebruiken? | Nee (op een paar uitzonderingen na, zie 3.7). |
| Krijgt hij beloningen in minigames? | Meestal wel, met beperkingen: zie 3.5. Fist of Guthix en de Heist-minigame zijn dicht. |
| Wat gebeurt er bij de-ironing? | Book of diplomacy (50.000 coins bij Mr Ex) lezen. Na 7 dagen (op een Jagex Account tot 90 dagen te verlengen) vervallen alle beperkingen. Onomkeerbaar. |
| Kan hij Group Ironman worden? | Ja, via de Iron Enclave, maar dat is onomkeerbaar en geldt niet voor dit project. |
| Telt een XP-lamp uit een quest? | Ja. Lampen uit tijdelijke events meestal niet. |
| Wat ziet hij bij examine? | De High Alchemy-waarde, niet de GE-prijs. |
| Is OSRS-advies bruikbaar? | Nee. OSRS heeft andere regels, andere winkels en andere varianten. |

---

## 6. Bronnen

Alle pagina's geraadpleegd op **2026-11-03**, als ruwe wikitekst via `https://runescape.wiki/api.php?action=parse&page=<Titel>&prop=wikitext`.
- Update-pagina's zijn wiki-kopieën van officiële RS3-nieuwsberichten op secure.runescape.com; de link naar het origineel staat bovenaan elke pagina.
- De officiële support-pagina "Remove Ironman status" gaf HTTP 403. Daarvoor is de wiki-citatie op Mr Ex en Book of diplomacy gebruikt.

### Ironman-modus

| Pagina | URL |
|---|---|
| Ironman Mode | https://runescape.wiki/w/Ironman_Mode |
| Group Ironman Mode | https://runescape.wiki/w/Group_Ironman_Mode |
| Iron Enclave | https://runescape.wiki/w/Iron_Enclave |
| Mr Ex | https://runescape.wiki/w/Mr_Ex |
| Book of diplomacy | https://runescape.wiki/w/Book_of_diplomacy |
| Jar of divine light | https://runescape.wiki/w/Jar_of_divine_light |
| HiScores | https://runescape.wiki/w/HiScores |

### Ironman-guides

| Pagina | URL |
|---|---|
| Ironman Mode/Guide | https://runescape.wiki/w/Ironman_Mode/Guide |
| Ironman Mode/Guide/Efficient Ironman Pathway Guide | https://runescape.wiki/w/Ironman_Mode/Guide/Efficient_Ironman_Pathway_Guide |
| Ironman Mode/Guide/Shop Run | https://runescape.wiki/w/Ironman_Mode/Guide/Shop_Run |
| Ironman Mode/Guide/Repeatable events | https://runescape.wiki/w/Ironman_Mode/Guide/Repeatable_events |
| Ironman Mode/Guide/Quests | https://runescape.wiki/w/Ironman_Mode/Guide/Quests |
| Ironman Mode/Guide/Necromancy | https://runescape.wiki/w/Ironman_Mode/Guide/Necromancy |
| Ironman Mode/Guide/Melee | https://runescape.wiki/w/Ironman_Mode/Guide/Melee |
| Ironman Mode/Guide/Ranged | https://runescape.wiki/w/Ironman_Mode/Guide/Ranged |
| Ironman Mode/Guide/Magic | https://runescape.wiki/w/Ironman_Mode/Guide/Magic |
| Ironman Mode/Guide/Slayer | https://runescape.wiki/w/Ironman_Mode/Guide/Slayer |
| Ironman Mode/Guide/Summoning | https://runescape.wiki/w/Ironman_Mode/Guide/Summoning |
| Ironman Mode/Guide/Prayer | https://runescape.wiki/w/Ironman_Mode/Guide/Prayer |
| Ironman Mode/Guide/Invention | https://runescape.wiki/w/Ironman_Mode/Guide/Invention |
| Ironman Mode/Guide/Herblore | https://runescape.wiki/w/Ironman_Mode/Guide/Herblore |
| Ironman Mode/Guide/Runecrafting | https://runescape.wiki/w/Ironman_Mode/Guide/Runecrafting |

### Handel, MTX en XP

| Pagina | URL |
|---|---|
| Grand Exchange | https://runescape.wiki/w/Grand_Exchange |
| Bond | https://runescape.wiki/w/Bond |
| Template:Permanent bond merchandise | https://runescape.wiki/w/Template:Permanent_bond_merchandise |
| Treasure Hunter | https://runescape.wiki/w/Treasure_Hunter |
| 2025 microtransactions proposal | https://runescape.wiki/w/2025_microtransactions_proposal |
| Radiant Star | https://runescape.wiki/w/Radiant_Star |
| Marketplace | https://runescape.wiki/w/Marketplace |
| Premier Membership | https://runescape.wiki/w/Premier_Membership |
| Vic the trader | https://runescape.wiki/w/Vic_the_trader |
| Double XP | https://runescape.wiki/w/Double_XP |
| Bonus experience | https://runescape.wiki/w/Bonus_experience |
| Challenge System (Daily Challenges) | https://runescape.wiki/w/Challenge_System |
| Gift of Friendship | https://runescape.wiki/w/Gift_of_Friendship |

### Groepscontent en combat

| Pagina | URL |
|---|---|
| Drops | https://runescape.wiki/w/Drops |
| LootShare | https://runescape.wiki/w/LootShare |
| CoinShare | https://runescape.wiki/w/CoinShare |
| Item shards | https://runescape.wiki/w/Item_shards |
| Instance | https://runescape.wiki/w/Instance |
| Liberation of Mazcab | https://runescape.wiki/w/Liberation_of_Mazcab |
| Dungeoneering | https://runescape.wiki/w/Dungeoneering |
| Slayer | https://runescape.wiki/w/Slayer |
| Assist System | https://runescape.wiki/w/Assist_System |
| Wilderness | https://runescape.wiki/w/Wilderness |
| Sinkholes | https://runescape.wiki/w/Sinkholes |
| Demon Flash Mob | https://runescape.wiki/w/Demon_Flash_Mob |

### Activiteiten, winkels en systemen

| Pagina | URL |
|---|---|
| Shop | https://runescape.wiki/w/Shop |
| Stanley Limelight Traders | https://runescape.wiki/w/Stanley_Limelight_Traders |
| DailyScape Overhaul | https://runescape.wiki/w/DailyScape_Overhaul |
| Player-owned house | https://runescape.wiki/w/Player-owned_house |
| Sunken Pyramid | https://runescape.wiki/w/Sunken_Pyramid |
| Clan Citadel | https://runescape.wiki/w/Clan_Citadel |
| Clan avatar | https://runescape.wiki/w/Clan_avatar |
| Player-owned port | https://runescape.wiki/w/Player-owned_port |
| Player-owned farm | https://runescape.wiki/w/Player-owned_farm |
| Managing Miscellania | https://runescape.wiki/w/Managing_Miscellania |
| Soul Reaper | https://runescape.wiki/w/Soul_Reaper |
| Shooting Star | https://runescape.wiki/w/Shooting_Star |
| Evil Tree | https://runescape.wiki/w/Evil_Tree |
| Guthixian Cache | https://runescape.wiki/w/Guthixian_Cache |
| Penguin Hide and Seek | https://runescape.wiki/w/Penguin_Hide_and_Seek |
| Herby Werby | https://runescape.wiki/w/Herby_Werby |
| Tears of Guthix | https://runescape.wiki/w/Tears_of_Guthix |
| Effigy Incubator | https://runescape.wiki/w/Effigy_Incubator |
| Divine location | https://runescape.wiki/w/Divine_location |
| Portable skilling stations | https://runescape.wiki/w/Portable_skilling_stations |
| Archaeology | https://runescape.wiki/w/Archaeology |
| Augmentation | https://runescape.wiki/w/Augmentation |
| Spirit shards | https://runescape.wiki/w/Spirit_shards |
| Charms | https://runescape.wiki/w/Charms |
| Razmire Keelgan | https://runescape.wiki/w/Razmire_Keelgan |

### Officiële updates (wiki-kopie, met link naar het RS3-nieuwsbericht)

| Pagina | Datum | URL |
|---|---|---|
| Update:Combat Mini Strike - This Week In RuneScape | 20 september 2022 | https://runescape.wiki/w/Update:Combat_Mini_Strike_-_This_Week_In_RuneScape |
| Update:Group Ironman Launch - This Week In RuneScape | 28 oktober 2024 | https://runescape.wiki/w/Update:Group_Ironman_Launch_-_This_Week_In_RuneScape |
| Update:RSAhead & Treasure Hunter Winding Down - This Week In RuneScape | 12 januari 2026 | https://runescape.wiki/w/Update:RSAhead_%26_Treasure_Hunter_Winding_Down_-_This_Week_In_RuneScape |
| Update:Patch Notes: Early-Game Rebalance | 16 februari 2026 | https://runescape.wiki/w/Update:Patch_Notes:_Early-Game_Rebalance |
| Update:Patch Notes: Dailyscape Overhaul | 16 maart 2026 | https://runescape.wiki/w/Update:Patch_Notes:_Dailyscape_Overhaul |
| Update:DailyScape Overhaul & Free Runemetrics for Members | 16 maart 2026 | https://runescape.wiki/w/Update:DailyScape_Overhaul_%26_Free_Runemetrics_for_Members |
| Update:Patch Notes: Dungeoneering Remastered | 11 mei 2026 | https://runescape.wiki/w/Update:Patch_Notes:_Dungeoneering_Remastered |
| Update:Chill June Patch Week | 29 juni 2026 | https://runescape.wiki/w/Update:Chill_June_Patch_Week |
| Update:Everything you need to know about Player Owned Housing! | 13 juli 2026 | https://runescape.wiki/w/Update:Everything_you_need_to_know_about_Player_Owned_Housing! |
| Update:Patch Notes: Mid-Game Rebalance | 20 juli 2026 | https://runescape.wiki/w/Update:Patch_Notes:_Mid-Game_Rebalance |
| Update:The Week Ahead: GE Improvements, Capes and the HCIM Leaderboards | 27 juli 2026 | https://runescape.wiki/w/Update:The_Week_Ahead:_GE_Improvements,_Capes_and_the_HCIM_Leaderboards |
| Update:Havenhythe Part II out now! | 28 september 2026 | https://runescape.wiki/w/Update:Havenhythe_Part_II_out_now! |
