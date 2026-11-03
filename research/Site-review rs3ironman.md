# Site-review: rs3ironman.com

Stand: 3 november 2026. Onderzoek met voorstellen; de route, de scripts en de app zijn niet gewijzigd. De keuze is aan Mees.

**Wat de site is.** Een stap-voor-stap-walkthrough voor een **verse (hardcore) RS3-ironman** naar de **Trimmed Completionist Cape**. De site is gebouwd met PHP en jQuery. Er zijn 2.209 hoofdtaken ("Main Task List"), 28 "Secondary Tasks" en 25 repeatables. De laatste regel van de lijst luidt "More steps coming soon (last updated 18/10/2026)". De gids is dus actueel: Havenhythe, Ivar, Wendlewick en de Reaper-regels van 2026 staan erin.

**Cookies.** Geen cookie-banner. De privacyverklaring noemt alleen een essentiële PHP-sessiecookie voor de login. Er was dus niets te weigeren.

## Bezochte pagina's

| URL | Wat |
|---|---|
| https://rs3ironman.com/ | Startpagina met tracker; met de keuze "All tasks" alle 2.209 hoofdtaken geladen en gelezen |
| https://rs3ironman.com/ (tab "Secondary Tasks") | 28 secundaire taken |
| https://rs3ironman.com/ (paneel "Repeatable Tasks") | 25 repeatables |
| https://rs3ironman.com/login/ | Inlogformulier (niet ingevuld) |
| https://rs3ironman.com/register/ | Registratieformulier (niet ingevuld) |
| https://rs3ironman.com/privacy-policy | Privacyverklaring |

De site heeft maar één inhoudspagina; de lijsten komen via AJAX-endpoints (`/submits/filter-tasks.php`, `load-tasks.php`, `load-task-type.php`). Die zijn dezelfde bron als de pagina en zijn als HTML opgehaald en als tekst gelezen.

**Niet te lezen:** wat ingelogde gebruikers zien (eigen voortgang, "manage your characters", eigen taken). Er is bewust geen account gemaakt. De functie "custom tasks" is alleen uit de code afgeleid (`toggle-custom-task.php`).

**Is de inhoud bruikbaar?** Beperkt. Het doel (comp cape, hardcore) en de opzet (elke achievement, elk huisdier, Magic via Shattered Worlds in de eerste uren) wijken sterk af van een combat-klaar Necromancy-route bij 7-15 u/week. Necromancy staat er pas rond taak 730 (Kili) en 1.450-1.480 (T40, Vessel of the Harbinger). De afzonderlijke tips zijn wel vaak praktisch en actueel.

---

## a) Opzet en functies

| # | Functie | Wat het doet | Iets voor onze app? |
|---|---|---|---|
| 1 | **Eén doorlopende takenlijst** | Elke taak is één handeling ("Lodestone to …, COMPLETE the … quest"). Quests krijgen een vast werkwoord: START, PROGRESS (… UNTIL …) of COMPLETE. | Misschien. Het werkwoord-label (start/verder/afronden) maakt questketens die over fases lopen duidelijk; onze stappen zijn grover. |
| 2 | **Focusvenster** | De eerste open taak krijgt de status "active". Afgevinkte taken schuiven weg; alleen de twee laatst gedane blijven zichtbaar. De lijst laadt zelf nieuwe taken bij tot het gekozen aantal (25/50/75/100/alle). | **Ja.** Op de Route-tab de gedane stappen van de huidige fase inklappen, op de laatste twee na. Zo blijft de focus op "nu". |
| 3 | **Annotaties per taak** | Drie soorten onder de taak: *information* (tip), *warning* (gevaar of "niet vergeten") en *achievement* (welke achievement je hiermee haalt). | **Ja**, voor *waarschuwing* en *tip*. Wij hebben alleen `detail` en `why`; een apart veld `warnings` (bijv. "bewaar de shield", "gevaarlijk zonder Protect from Magic") valt meer op. |
| 4 | **Wikilink per taak** | Een wiki-icoon links van de taak, vaak met een anker (bijv. `…/Quick_guide#Getting_started`). | **Ja**, klein: een veld `wiki` per stap, met een icoon in de Route-tab. |
| 5 | **Repeatables-paneel** | Een aparte kolom, te openen met een knop met teller ("Repeatable Tasks (25)"). Per item een label Daily/Weekly/Monthly en een korte tip. **Nieuwe repeatables verschijnen automatisch** zodra een taak in de hoofdlijst ze vrijspeelt (bijv. na Call of the Ancestors: Nemi Forest en Trinks' Tasks). | **Ja, hoog.** Ons weekritme (p1-01) als checklist met teller, waarbij een item pas verschijnt als de vrijspelende stap of quest gedaan is (bijv. Reaper na p5-11). |
| 6 | **Main / Secondary** | Twee tabbladen. Secondary = tijdrovende taken die je altijd kunt doen en die de hoofdlijst niet blokkeren (Menaphos-katten, Shooting Stars, Temple Trekking, farmdieren). | Misschien. Bij ons: stappen "naast de route" (bijv. haaien, Herblore optioneel) als aparte lijst, zodat de volgende stap niet blijft hangen. |
| 7 | **Filter en paginagrootte** | Een tekstfilter op taken en een keuze 25/50/75/100/alle. | Misschien. Zoeken in de route is handig bij 62 stappen; paginagrootte is overbodig. |
| 8 | **Account en meerdere characters** | Voortgang op de server na inloggen (e-mail en wachtwoord), met meerdere characters per account. Zonder login wordt niets bewaard. Ingelogde gebruikers kunnen eigen taken toevoegen. | Nee voor de login (onze app is lokaal en voor één account). **Eigen taken toevoegen** is wel een idee (zie de review van ironman.guide, "notities"). |
| 9 | **"Last updated"-regel** | De laatste taak meldt de datum van de laatste update. | Ja, klein: de datum `meta.updated` uit `route.json` zichtbaar in de app. |

---

## b) Inhoudelijke vergelijking met onze route

Alleen de taken die overlappen met onze route; getoetst aan de RS3-wiki (API, 3 november 2026).

| Route-stap | Wat rs3ironman zegt (taaknummer) | Wikitoets | Gevolg |
|---|---|---|---|
| p1-11 / p1-02 Menaphos | Na The Jack of Spades **dagelijks corrupted scarabs "bursten"**: "quickest way to level Slayer"; niet meer dan circa 36 per dag (304). Soul obelisks dagelijks voor reputatie (303). | **Bevestigd** (wiki *Corrupted Scarab (Menaphos)*): de scarabs verschijnen bij elke Shifting Tombs-ingang, in de zandsteenmijn en buiten de Sophanem Slayer Dungeon. Een event duurt 5 minuten en komt per wereld elke 60-120 minuten terug. Per burst krijg je Slayer-XP (1/5 small XP lamp) en reputatie; vanaf 24 per dag halveert dat en daarna neemt het verder af. Gemiddeld 1.232 coins per burst. Elke stamp kost circa 1/16 van je LP. Friends chat "Soulobby" roept spawns om. | Voorstel 1. |
| p2-09 Ivar | Minstens 9 kills, één kill met de juiste protect-prayer bij elke special; colossal bones **direct begraven**: ze kunnen niet op altaren (1441-1442). | **Bevestigd** (wiki *Colossal bone*, *Ivar, King of Bones*). Achievement "Protect From Ivar". | Voorstel 2; zelfde correctie als in de review van thersguide. |
| p2-08 Fort Forinthry | Town Hall T1 levert rested XP; die omzetten in bonus-XP, aanbevolen op **Herblore** (490). | Rested XP staat al in de route. | Kleine tip voor p2-08 (voorstel 4). |
| p2-03 / p2-01 Necromancy | Lesser communion rituals tot Necromancy 20, deathshead moths vangen voor mementos (38-39). Later: Slayer-punten met Necromancy bij Vannaka, elke 10e taak bij Chaeldar (1470). | Chaeldar vraagt Lost City (al gecorrigeerd in onze review). | Geen wijziging. |
| p3-09 / p5-12 Haunted Mine en Tarn | Lair of Tarn Razorlor **alleen als je Slayer 40 bent**, anders later (702, 1435). | Komt overeen met onze route (p5-12 na Slayer 40). | - |
| p5-11 Reaper | Begin met Reaper-taken zodra het kan (1989). | Komt overeen (Slayer 45, combat 50). | - |
| p1-01 weekritme | Repeatables: Herby Werby, Penguins, Troll Invasion, God Statues, Giant Oyster, Managing Miscellania, Water filtration, Anachronia base camp, Help Meg, Circus, Broken Home, Tears of Guthix, Familiarisation, Town Hall rested XP, Agoroth, farm, Nemi Forest, Trinks, scarabs, obelisks, dragonstones in Anachronia, Daily Challenges, herb run, Big Chinchompa. | Grotendeels al afgewogen in `Review EIPG en RS Guy.md` (afgewezen om tijd). | Geen extra voorstel, behalve de scarabs. |
| p1-12 / p1-13 / p1-09 quests | Waterfall, Holy Grail en Dragon Slayer worden gedaan met **Magic** (Shattered Worlds tot Magic 30, Ranged 30, Defence 20 als start; 45-48). | Shattered Worlds is in onze route bewust afgewezen (actief; status van anima omstreden). | Geen wijziging. |
| p3-06 Fishing | Fishing via fly fishing tot 52 en later 70; Wendlewick-viskwekerij (Trader Woes) als tussenstap. | Viskwekerij: Fishing 45, Farming 25, Trader Woes; actiever (wiki *Havenhythe fish farm*). | Geen wijziging (AFK-rol van Fishing). |

**Nieuwe content 2025-2026 die rs3ironman noemt en onze route mist:** de Havenhythe-achievements rond Wendlewick (Trader Woes, canoe-stations, Secrets of Amberfell), Hermit Permits, sanguine crawlers voor "Sanguine matter", en Jackalopes voor Hunter tot 50 met een ferret. Geen daarvan draagt direct bij aan combat-klaar.

---

## c) Voorstellen voor de route

| # | Stap | Wat verandert | Waarom | Bron | Effect |
|---|---|---|---|---|---|
| 1 | **Nieuwe stap p1-20** Corrupted scarabs (Menaphos), of een regel in p1-02 | Na The Jack of Spades: als je in Menaphos bent (bijv. tijdens het pickpocketen in p1-02), sluit je aan bij friends chat "Soulobby" en burst je bij een melding tot circa 23 scarabs per dag (daarna halveert de opbrengst). Eten op de action bar, want elke stamp kost LP. | Slayer-XP zonder combat en circa 1.232 coins per burst. Het combineert met de marketeers in dezelfde stad en past bij Slayer 1 en een kleine geldbuffer. De DailyScape Overhaul noemt de scarabs niet; de dagelijkse afname staat nog op de wiki. | https://rs3ironman.com/ (taak 304) ; wiki *Corrupted Scarab (Menaphos)* | Circa 5-10 min per keer, onregelmatig. Brengt Slayer de eerste levels omhoog en levert coins. Risico: met Constitution ~21 snel laag LP; geen echte dood als je eet. De XP per burst bij Slayer 1 is klein (lampformule), dus **onzeker** hoeveel levels. |
| 2 | **p2-09** Ivar en **p5-06** Prayer | Colossal bones **begraven**, niet offeren. De zin in p5-06 aanpassen. Optioneel minstens één kill met de juiste protect-prayers voor de achievement "Protect From Ivar". | De wiki bevestigt dat colossal bones niet op altaren of de Ectofuntus kunnen. | https://rs3ironman.com/ (taken 1441-1442) ; wiki *Colossal bone* | **Correctie**; 0 u. |
| 3 | **p1-02** Geldbuffer | Als alternatief bij de marketeers: de soul obelisks in Menaphos voor reputatie. Alleen als Mees de Port district-reputatie wil (die vraagt de RS Guy-guide voor Fishing 65). | Lage prioriteit: in onze route is reputatie geen doel. | https://rs3ironman.com/ (taak 303) | Laag. Liever niet opnemen. |
| 4 | **p2-08** Fort Forinthry | Bij de Town Hall: rested XP als bonus-XP op **Herblore** of **Prayer** zetten, de skills die een ironman het moeilijkst traint. | Sluit aan op de lamp-adviezen in CLAUDE.md 4.8 (lampen in moeilijke skills). | https://rs3ironman.com/ (taak 490) | 0 u extra; geen risico. |

**Bewust niet overgenomen:** Shattered Worlds in het begin, elke achievement en elk huisdier, Temple Trekking, Dominion Tower, Nemi Forest, Trinks' Tasks, Managing Miscellania, Water filtration en de comp-cape-volgorde in het algemeen.
