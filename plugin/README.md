# Ons Pap sync (prototype)

Een plugin voor de officiële RS3-client (RuneScape Client API, Lua 5.4.8) die de tracker in `../app` voedt met
gegevens van je eigen personage. Alleen RS3; dit heeft niets met RuneLite of OSRS te maken.

Stand: 4 november 2026. **Niet getest in de game**: er was geen toegang tot de ontwikkelomgeving. De code is
geschreven tegen de documentatie op <https://developer.runescape.com/rs/> (gelezen op 4 november 2026) en is
bewust defensief: elke handler draait in `pcall`, en elke aanroep waarvan het gedrag niet letterlijk in de docs
staat, heeft in `main.lua` een commentaar `aanname: ...`.

## Wat de plugin doet

| Moment | Wat er gebeurt |
|---|---|
| Inschakelen terwijl je al ingelogd bent, of inloggen (`GameStateChanged` naar `GAME`) | Na ongeveer 3 seconden leest de plugin naam, level en XP van alle 29 skills. Daarna zoekt hij alle quests op (ongeveer 9 seconden, verspreid over ticks) en stuurt hij één volledige snapshot. |
| XP-winst (`SkillTransmit`) | De winst wordt verzameld. De eerste wijziging opent een venster van 17 servertikken (ongeveer 10 seconden); aan het eind gaat alles in één verzoek weg. Zo krijgt de app hooguit één verzoek per 10 seconden, ook als je onafgebroken XP krijgt. |
| Levelup | Bij een hoger level op basis van XP (niet het geboostte level) gaat er een event `levelup` mee, bijvoorbeeld "Necromancy level 50 gehaald". |
| Quest voltooid (`VarTransmit` op de voortgangsvariabele van de quest) | Event `quest` ("Quest voltooid: ..."), en de volgende verzending bevat de hele questlijst opnieuw. Hiervoor is geen `chatAccess` nodig. |
| Uitloggen (inlogscherm of lobby) | Wat nog in het venster zit, gaat met de laatst bekende stand mee. |
| Tracker draait niet | De plugin probeert het later opnieuw (eerst na ongeveer 30 seconden, dan steeds langer tot ongeveer 5 minuten) en bewaart intussen hooguit 100 events. |

Elk verzoek is een `POST` naar `http://localhost:5173/api/plugin/sync` met JSON:

```json
{
  "v": 1,
  "account": "Ons Pap",
  "sentAt": 1793300000,
  "skills": [{ "id": 0, "name": "Attack", "level": 30, "xp": 13363 }],
  "quests": [{ "id": 1, "name": "Cook's Assistant", "status": "COMPLETED", "questPoints": 1, "members": false, "difficulty": 0, "eligible": true }],
  "events": [{ "at": 1793300000, "kind": "levelup", "text": "Attack level 30 gehaald" }]
}
```

- `skills` bevat altijd alle skills die de plugin kon lezen, met de namen en de volgorde van `SKILLS` in
  `app/src/lib/skills.ts`. De Client API noemt Constitution `HITPOINTS`; de mappingtabel `SKILLS` bovenin
  `main.lua` vertaalt dat. `id` is de waarde van `SkillType` (0 tot en met 28), gelijk aan de volgorde van de
  hiscores.
- `quests` is `null` in een tussentijdse bundel zonder queststatuswijziging. De dev-server houdt dan de laatst
  ontvangen lijst vast.
- `kind` is `levelup`, `quest` of `xp` (één `xp`-event per skill per venster, bijvoorbeeld "Attack +1234 XP").
- Lua heeft in deze API geen JSON-bibliotheek, dus `main.lua` heeft een kleine encoder die strings escapet en
  ongeldige UTF-8 vervangt.

Wat de plugin niet doet: geen input naar de game sturen, geen acties, geen verborgen informatie, niets over
andere spelers (richtlijnen: "Plugins cannot export any information about other players"). Logregels staan
standaard uit (`CONFIG.debug = false`), zoals Good practice vraagt; fouten worden wel altijd gelogd.

## Wat zeker is en wat een aanname

Zeker (letterlijk in de docs, met de pagina erbij):

- Manifestvelden `name`, `version`, `contactEmailAddress`, `requiredDependencies`, `optionalDependencies`,
  `requiredPermissions`, `optionalPermissions`, `urls` (`structure.html`).
- `Plugin.HasPermission(PluginPermissions.httpAccess)` en `Plugin.urls.<naam>` (`core/plugin.html`).
- `HTTPRequest.new(baseURL, path)`, `:AddHeader(key, value)`, `:Post(data, completionCallback)`, `:Cancel()` en
  de velden `successful`, `failed`, `timedOut`, `responseCode`, `errorInfo` (`core/http.html`).
- `Event.<Naam>.Subscribe(refName, fn)` met `SkillTransmit` (`skill`, `oldXP`, `newXP`, `oldGameplayLevel`,
  `newGameplayLevel`), `VarTransmit` (`var`, `oldValue`, `newValue`), `GameStateChanged` (`oldState`,
  `newState`, enum `GameState` met `LOGINSCREEN` 10, `LOBBY` 20, `GAME` 30) en `ServerLogic` (ongeveer elke
  0,6 s) (`core/events.html`).
- `Player.IsAvailable()`, `Player.GetEntity()`, `Player.GetXPUncapped(skill)`, `Player.GetLevelUncapped(skill)`
  en de enum `SkillType` met waarden 0 tot en met 28 (`game/player.html`); `PlayerEntity.isValid` en
  `.displayName` (`game/entity/playerentity.html`).
- `config.Quest.FromID(id)` en de velden `id`, `name`, `deprecated`, `type`, `isMembers`, `questPoints`,
  `difficulty`, `canStartQuest`, `hasStartedQuest`, `hasFinishedQuest`, `masterQuestVars[].varPlayer`
  (`game/config/questtype.html`); `VarType.id`, `isVarBit`, `baseVar` (`game/config/vartype.html`).
- `log`, `print` (`core/index.html`). Lua 5.4.8 (`getting-started.html`).

Aannames (staan ook als commentaar in `main.lua`):

1. `config.Quest.FromID(id)` geeft `nil` of een fout voor een id zonder quest, en alle quest-id's liggen onder
   1500. Er is geen gedocumenteerde manier om alle quests op te sommen; alleen het consolecommando `pan Quest`
   kopieert de lijst. Klopt de bovengrens niet, dan `CONFIG.questScanMaxId` ophogen (controleer met `pan Quest`).
2. `hasFinishedQuest` en `hasStartedQuest` lezen bij elke opvraag de actuele stand.
3. `masterQuestVars` is een Lua-lijst die bij 1 begint; `VarTransmit` meldt de voortgangsvariabele (of bij een
   VarBit de basisvariabele) als een quest verder of klaar is.
4. `cfg.type` is een getal uit de enum `QuestType` (`NORMAL` = 0); alleen gewone quests gaan mee.
5. `SkillType.ATTACK` enzovoort zijn getallen. De voorbeelden op `game/player.html` schrijven soms
   `SkillType.Attack`; daarom valt de plugin terug op de gedocumenteerde waarden.
6. `Player.GetXPUncapped` geeft hele XP-punten. RuneMetrics gebruikt tienden; als de plugin dat ook blijkt te
   doen, ziet de app dat aan de levels en deelt hij door 10 (`pluginXpInTenths` in `app/src/lib/api.ts`).
7. `displayName` is de naam zoals de hiscores hem kennen; een harde spatie (U+00A0) wordt een gewone spatie.
8. `os.time()` bestaat in de sandbox. Zo niet, dan stuurt de plugin `sentAt: null` en events zonder tijd; de
   dev-server vult dan zijn eigen tijd in.
9. De standaardbibliotheken `string`, `table`, `math` en `utf8` zijn beschikbaar (`string.len` staat in een
   voorbeeld; de rest niet).
10. De client voegt `Plugin.urls.tracker` en het pad gewoon samen tot `http://localhost:5173/api/plugin/sync`.
11. `GAME` en `LOADING` wisselen elkaar ook af bij laden en teleporteren; een nieuwe sessie begint daarom alleen
    als er nog geen loopt, en eindigt alleen in het inlogscherm of de lobby.
12. `SkillTransmit` kan bij het inloggen voor elke skill afgaan; winst telt pas na de eerste snapshot.
13. De completion-callback van `HTTPRequest:Post` komt altijd. Voor de zekerheid breekt de plugin een verzoek
    na ongeveer 60 seconden af.

## Laden in de ontwikkelomgeving

Volgens de tutorial "Accessing the API" en `managing.html`:

1. Join de plugin-betawereld (link op de tutorialpagina) en klik in de lobby op "import save". Voortgang daar
   telt niet op de live werelden.
2. Kopieer de map `ons-pap-sync` naar `dev_plugins` in de betamap van de client, standaard
   `C:\ProgramData\Jagex\RuneScape-BETA\dev_plugins\ons-pap-sync`. Of laat de client naar deze projectmap
   kijken met `plugins_setpath <pad naar de map plugin>`.
3. Start de tracker: `npm run dev --prefix app` (poort 5173).
4. Open de console met Alt + de toets onder Esc en typ:
   - `plugins_refresh` (kort `prf`) om de map opnieuw te scannen;
   - `plugins_list` (kort `plist`) om te controleren dat `ons-pap-sync` erbij staat;
   - `plugins_permissions_request ons-pap-sync` (kort `ppr`) om de permissie `httpAccess` te vragen, of direct
     `plugins_permissions_enable ons-pap-sync httpAccess` (kort `ppe`);
   - `plugins_enable ons-pap-sync` (kort `pon`).
5. Na een wijziging in `main.lua`: `plugins_reload ons-pap-sync` (kort `prl`).
6. Controleer in de app: `GET http://localhost:5173/api/plugin/latest` toont de snapshot, `app/.plugin/events.jsonl`
   de events. Zet tijdelijk `CONFIG.debug = true` voor meer logregels in de console.

Testpunten in de game: komt `displayName` overeen met de hiscorenaam; vindt de questscan alle quests (aantal
vergelijken met de Quests-tab); is XP in hele punten; gaat er bij een levelup precies één event mee; volgt na een
afgeronde quest een `quest`-event; blijft de client soepel tijdens de questscan.

## Publiceren op mod.io

Volgens `submission/process.html` en `submission/example.html`:

- **Bestanden**: een zip met `main.lua` en `plugin.json` bovenin (niet in een submap), versienummer in de
  bestandsnaam (bijvoorbeeld `ons-pap-sync-010.zip`), zonder dit README-bestand of andere ontwikkelbestanden. Het
  versienummer op mod.io moet gelijk zijn aan `version` in het manifest. Platforms Windows, Linux en Mac.
- **Listing**: naam (1 tot 50 tekens, ASCII), samenvatting (10 tot 150 tekens, niet beginnen met "This
  plugin..."), listing-afbeelding 16:9 van minstens 512x288, permissie-tags voor elke gevraagde permissie.
- **Verplichte onderdelen in de beschrijving**:
  1. **Email**: een echt contactadres (het manifest heeft nu de placeholder `vul-in@example.com`); liefst niet
     het adres van mod.io of RuneScape, want het is openbaar.
  2. **Feedback and collaboration**: waar feedback heen moet en of anderen mogen meewerken.
  3. **EULA**: de vaste verklaring over de Jagex EULA, woordelijk overnemen uit `submission/process.html`
     (sectie "EULA").
  4. **Permissions**: per permissie waarvoor hij dient; hier alleen `httpAccess`, voor het sturen van skills,
     XP, queststatus en level- en questmeldingen van je eigen personage naar de opgegeven URL.
  5. **Data Protection**: welk geval. Gegevens gaan naar een lokale app op je eigen computer; of dat telt als
     case 1 ("does not leave the local plugin") of case 2 (een endpoint met UK-adequaatheid, met
     beveiligingsmaatregelen en een privacyverklaring) is een open vraag voor de moderatie.

## Open vragen

- **Toegang tot de ontwikkelomgeving**: nodig om dit prototype ook maar één keer te draaien. Zonder test is
  inzenden zinloos; Jagex schrijft dat de moderatie geen QA is.
- **Localhost-URL**: `http.html` zegt alleen dat malformed URL's en URL-shorteners worden afgewezen. Of
  `http://localhost:5173` door de moderatie komt, staat nergens; vragen in de RuneScape Plugin Portal-discord.
  Komt het er niet door, dan is een eigen HTTPS-endpoint nodig (met de eisen van Data Protection case 2).
- **Alleen gepubliceerde plugins op live werelden**: ongepubliceerde plugins draaien alleen op de
  betawerelden, waar de voortgang los staat van het echte account. Echte gegevens van Ons Pap komen dus pas
  binnen als de plugin goedgekeurd op mod.io staat (wachtrij van 200+ inzendingen, batches om de twee weken).
- **Overlap met WikiSync** (in moderatie): als die plugin queststatus en skills al uitleesbaar maakt, is een
  eigen plugin misschien overbodig (Good practice: liever geen dubbele plugins).
- **Prestaties van de questscan**: 1500 aanroepen van `FromID` over 15 ticks; in de game nameten.
