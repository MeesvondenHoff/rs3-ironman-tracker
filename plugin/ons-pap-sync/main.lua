-- Ons Pap sync (prototype, versie 0.1.0)
--
-- Stuurt de skills, de XP en de queststatus van je EIGEN personage naar de lokale tracker-app
-- (Vite dev-server op http://localhost:5173, endpoint POST /api/plugin/sync).
--
-- Wat de plugin doet:
--   * bij inschakelen en bij inloggen: een volledige snapshot (accountnaam, alle skills met level en XP,
--     queststatus van alle quests);
--   * bij XP-winst: de wijzigingen verzamelen en hooguit eens per ongeveer 10 seconden gebundeld versturen;
--   * bij een levelup of een voltooide quest: een event meesturen.
--
-- Wat de plugin NIET doet: geen input naar de game sturen, geen acties uitvoeren, geen verborgen informatie
-- lezen en niets over andere spelers verzamelen. Alleen gegevens die de speler zelf ook in de game ziet.
--
-- Geschreven tegen de documentatie op https://developer.runescape.com/rs/ (gelezen op 4 november 2026),
-- zonder test in de game. Elke aanroep waarvan het gedrag niet letterlijk in de documentatie staat, heeft
-- een commentaar "aanname: ...". Zie ook plugin/README.md in de projectmap.

---------------------------------------------------------------------------------------------------------
-- Instellingen
---------------------------------------------------------------------------------------------------------

local CONFIG = {
    -- Uitgebreide logregels in de console. Uit bij publicatie (richtlijn "Console logging" in Good practice).
    debug = false,
    -- Pad achter de basis-URL "tracker" uit plugin.json.
    syncPath = "/api/plugin/sync",
    -- ServerLogic loopt ongeveer elke 0,6 s (docs: core/events.html). 17 ticks is dus ongeveer 10 seconden.
    bundleTicks = 17,
    -- Wachten na inloggen voordat we de skills lezen, zodat de server de stats heeft doorgestuurd (ca. 3 s).
    loginDelayTicks = 5,
    -- Quests opzoeken via config.Quest.FromID(id): van 0 tot en met questScanMaxId, zoveel per tick.
    questScanMaxId = 1500,
    questScanPerTick = 100,
    -- Na een mislukte verzending: eerst ca. 30 s wachten, daarna steeds dubbel zo lang tot ca. 5 minuten.
    retryTicksMin = 50,
    retryTicksMax = 500,
    -- Maximaal aantal events dat we vasthouden als de tracker niet draait (de oudste vallen weg).
    maxQueuedEvents = 100,
    -- Een verzending die na ca. 60 s nog loopt, breken we af (voor het geval de callback nooit komt).
    inFlightMaxTicks = 100,
}

-- Eén logregel naar de console. log() zet de pluginnaam ervoor (docs: core/index.html).
-- aanname: log() voegt zijn argumenten samen zoals in de voorbeelden en struikelt niet over accolades in de
-- tekst (de parameter heet "format"); lukt log() niet, dan gaat de regel via print().
local function say(message)
    local ok = pcall(log, message)
    if not ok then pcall(print, "Ons Pap sync: " .. tostring(message)) end
end

local function debugLog(message)
    if CONFIG.debug then say(message) end
end

---------------------------------------------------------------------------------------------------------
-- Skills: dezelfde namen en volgorde als SKILLS in app/src/lib/skills.ts
---------------------------------------------------------------------------------------------------------

-- De Client API noemt de skills in hoofdletters (docs: game/player.html, enum SkillType) en heeft
-- HITPOINTS waar de hiscores en de app "Constitution" zeggen. De waarden 0 t/m 28 staan in de docs en
-- volgen dezelfde volgorde als de hiscores, dus het id dat we meesturen is meteen de index in SKILLS.
local SKILLS = {
    { key = "ATTACK",        value = 0,  name = "Attack" },
    { key = "DEFENCE",       value = 1,  name = "Defence" },
    { key = "STRENGTH",      value = 2,  name = "Strength" },
    { key = "HITPOINTS",     value = 3,  name = "Constitution" },
    { key = "RANGED",        value = 4,  name = "Ranged" },
    { key = "PRAYER",        value = 5,  name = "Prayer" },
    { key = "MAGIC",         value = 6,  name = "Magic" },
    { key = "COOKING",       value = 7,  name = "Cooking" },
    { key = "WOODCUTTING",   value = 8,  name = "Woodcutting" },
    { key = "FLETCHING",     value = 9,  name = "Fletching" },
    { key = "FISHING",       value = 10, name = "Fishing" },
    { key = "FIREMAKING",    value = 11, name = "Firemaking" },
    { key = "CRAFTING",      value = 12, name = "Crafting" },
    { key = "SMITHING",      value = 13, name = "Smithing" },
    { key = "MINING",        value = 14, name = "Mining" },
    { key = "HERBLORE",      value = 15, name = "Herblore" },
    { key = "AGILITY",       value = 16, name = "Agility" },
    { key = "THIEVING",      value = 17, name = "Thieving" },
    { key = "SLAYER",        value = 18, name = "Slayer" },
    { key = "FARMING",       value = 19, name = "Farming" },
    { key = "RUNECRAFTING",  value = 20, name = "Runecrafting" },
    { key = "HUNTER",        value = 21, name = "Hunter" },
    { key = "CONSTRUCTION",  value = 22, name = "Construction" },
    { key = "SUMMONING",     value = 23, name = "Summoning" },
    { key = "DUNGEONEERING", value = 24, name = "Dungeoneering" },
    { key = "DIVINATION",    value = 25, name = "Divination" },
    { key = "INVENTION",     value = 26, name = "Invention" },
    { key = "ARCHAEOLOGY",   value = 27, name = "Archaeology" },
    { key = "NECROMANCY",    value = 28, name = "Necromancy" },
}

-- Per SkillType-waarde de regel in SKILLS.
local SKILL_BY_TYPE = {}
for _, s in ipairs(SKILLS) do
    -- aanname: SkillType.<NAAM> bestaat zoals in de tabel op game/player.html (de voorbeelden op die pagina
    -- schrijven soms SkillType.Attack); valt dat tegen, dan gebruiken we de gedocumenteerde waarde.
    local ok, fromEnum = pcall(function() return SkillType[s.key] end)
    if not ok then fromEnum = nil end
    s.type = (type(fromEnum) == "number") and fromEnum or s.value
    SKILL_BY_TYPE[s.type] = s
end

---------------------------------------------------------------------------------------------------------
-- Kleine, veilige JSON-encoder (de Client API levert geen JSON-bibliotheek)
---------------------------------------------------------------------------------------------------------

local JSON_NULL = {}                          -- markeert een expliciete null
local ARRAY_MT = { __name = "jsonArray" }      -- markeert een tabel als JSON-array, ook als hij leeg is

local function jsonArray(t)
    return setmetatable(t or {}, ARRAY_MT)
end

local ESCAPES = { ['"'] = '\\"', ["\\"] = "\\\\", ["\b"] = "\\b", ["\f"] = "\\f", ["\n"] = "\\n", ["\r"] = "\\r", ["\t"] = "\\t" }

local function encodeString(s)
    -- Ongeldige UTF-8 zou ongeldige JSON opleveren: vervang dan alle niet-ASCII-bytes door "?".
    -- aanname: de standaardbibliotheek utf8 van Lua 5.4 is beschikbaar; zo niet, dan altijd vervangen.
    if s:find("[\128-\255]") and not (utf8 and utf8.len(s)) then
        s = s:gsub("[\128-\255]", "?")
    end
    s = s:gsub('[%c"\\]', function(c)
        return ESCAPES[c] or string.format("\\u%04x", c:byte())
    end)
    return '"' .. s .. '"'
end

local encodeValue

local function encodeTable(t, depth)
    if depth > 20 then error("JSON: te diep genest") end
    local parts = {}
    if getmetatable(t) == ARRAY_MT then
        for i = 1, #t do parts[i] = encodeValue(t[i], depth + 1) end
        return "[" .. table.concat(parts, ",") .. "]"
    end
    local keys = {}
    for k in pairs(t) do
        if type(k) ~= "string" then error("JSON: objectsleutel moet een string zijn") end
        keys[#keys + 1] = k
    end
    table.sort(keys)
    for _, k in ipairs(keys) do
        parts[#parts + 1] = encodeString(k) .. ":" .. encodeValue(t[k], depth + 1)
    end
    return "{" .. table.concat(parts, ",") .. "}"
end

encodeValue = function(v, depth)
    local tv = type(v)
    if v == nil or v == JSON_NULL then return "null" end
    if tv == "boolean" then return v and "true" or "false" end
    if tv == "number" then
        if v ~= v or v == math.huge or v == -math.huge then return "null" end
        if math.type(v) == "integer" then return string.format("%d", v) end
        if v == math.floor(v) and math.abs(v) < 2^53 then return string.format("%d", math.floor(v)) end
        return string.format("%.14g", v)
    end
    if tv == "string" then return encodeString(v) end
    if tv == "table" then return encodeTable(v, depth) end
    error("JSON: type " .. tv .. " wordt niet ondersteund")
end

local function toJson(v)
    return encodeValue(v, 0)
end

---------------------------------------------------------------------------------------------------------
-- Hulpfuncties
---------------------------------------------------------------------------------------------------------

-- Unix-tijd in seconden, of nil.
-- aanname: os.time() is beschikbaar in de plugin-sandbox (de docs noemen de os-bibliotheek niet). Zonder
-- os.time sturen we geen tijd mee; de tracker vult dan zijn eigen ontvangsttijd in.
local function nowUnix()
    local ok, t = pcall(function() return os.time() end)
    if ok and type(t) == "number" then return t end
    return nil
end

-- Roept fn aan in pcall en logt een fout in plaats van de plugin te laten crashen.
local function guarded(label, fn)
    return function(...)
        local ok, err = pcall(fn, ...)
        if not ok then say("Ons Pap sync: fout in " .. label .. ": " .. tostring(err)) end
    end
end

local function safeCall(fn, ...)
    local ok, result = pcall(fn, ...)
    if ok then return result end
    return nil
end

-- Leest een enumwaarde; valt terug op de waarde uit de docs als de enum ontbreekt of geen getal geeft.
local function enumValue(enumTable, key, documented)
    local ok, v = pcall(function() return enumTable[key] end)
    if ok and type(v) == "number" then return v end
    return documented
end

-- Getal of standaardwaarde (de JSON-encoder kan alleen gewone Lua-waarden aan).
local function num(v, default)
    if type(v) == "number" then return v end
    return default
end

-- Waarden uit de docs (core/events.html, enum GameState).
local STATE_LOGINSCREEN = enumValue(GameState, "LOGINSCREEN", 10)
local STATE_LOBBY = enumValue(GameState, "LOBBY", 20)
local STATE_GAME = enumValue(GameState, "GAME", 30)

-- Naam van het eigen personage, zoals de hiscores hem kennen.
local function readAccountName()
    if not safeCall(Player.IsAvailable) then return nil end
    local entity = safeCall(Player.GetEntity)
    if not entity or not entity.isValid then return nil end
    local name = entity.displayName
    if type(name) ~= "string" or name == "" then return nil end
    -- aanname: displayName is de weergavenaam zonder tags. RuneScape gebruikt in namen soms een harde spatie
    -- (U+00A0); die maken we een gewone spatie, zodat de naam gelijk is aan die op de hiscores.
    name = name:gsub("\194\160", " "):gsub("^%s+", ""):gsub("%s+$", "")
    return name
end

---------------------------------------------------------------------------------------------------------
-- Toestand
---------------------------------------------------------------------------------------------------------

local state = {
    account = nil,          -- naam van het ingelogde personage, nil buiten een sessie
    lastAccount = nil,      -- naam uit de vorige sessie (om events niet aan een ander personage te hangen)
    skills = {},            -- per SkillType-waarde: { xp = n, level = n }
    gains = {},             -- per SkillType-waarde: XP-winst in het huidige bundelvenster
    events = {},            -- events die nog verstuurd moeten worden: { seq, at, kind, text }
    eventSeq = 0,           -- volgnummer, zodat we na verzending precies de verstuurde events weghalen
    loginCountdown = nil,   -- ticks tot we de skills lezen na inloggen of inschakelen
    windowTicks = nil,      -- ticks sinds het bundelvenster opende, nil als er niets klaarstaat
    retryTicks = 0,         -- ticks wachten na een mislukte verzending
    retryStep = 0,
    inFlight = nil,         -- lopend HTTPRequest (we houden een verwijzing vast)
    inFlightTicks = 0,
    snapshotPending = false,-- volledige snapshot moet nog weg
    quests = {
        scanning = false,
        nextId = 0,
        list = {},          -- [{ cfg, id, name, questPoints, members, difficulty, status, eligible }]
        byVar = {},         -- per VarPlayer-id: lijst van quests die die variabele volgen
        available = false,  -- true als er minstens één quest gevonden is
        dirty = false,      -- queststatus gewijzigd sinds de laatste verzending
    },
}

local function pushEvent(kind, text)
    local list = state.events
    state.eventSeq = state.eventSeq + 1
    list[#list + 1] = { seq = state.eventSeq, at = nowUnix(), kind = kind, text = text }
    while #list > CONFIG.maxQueuedEvents do table.remove(list, 1) end
end

local function openWindow()
    if state.windowTicks == nil then state.windowTicks = 0 end
end

---------------------------------------------------------------------------------------------------------
-- Skills lezen
---------------------------------------------------------------------------------------------------------

-- Leest level en XP van alle skills via de Player-tabel (docs: game/player.html).
-- We gebruiken de "Uncapped"-varianten: het echte level op basis van XP, zonder boosts of
-- free-to-play-limiet, zoals de hiscores dat ook tonen.
-- aanname: GetXPUncapped geeft hele XP-punten (geen tienden zoals RuneMetrics). De app controleert dit
-- zelf tegen het level en deelt door 10 als de getallen op tienden wijzen.
local function readAllSkills()
    local result = {}
    for _, s in ipairs(SKILLS) do
        local xp = safeCall(Player.GetXPUncapped, s.type)
        local level = safeCall(Player.GetLevelUncapped, s.type)
        if type(xp) == "number" and type(level) == "number" then
            result[s.type] = { xp = xp, level = level }
        end
    end
    return result
end

local function skillsPayload()
    local out = jsonArray()
    for _, s in ipairs(SKILLS) do
        local cur = state.skills[s.type]
        if cur then
            out[#out + 1] = { id = s.value, name = s.name, level = cur.level, xp = cur.xp }
        end
    end
    return out
end

---------------------------------------------------------------------------------------------------------
-- Quests lezen
---------------------------------------------------------------------------------------------------------

-- Er is geen gedocumenteerde manier om alle quests op te sommen (alleen het consolecommando "pan Quest").
-- Daarom lopen we de id's af met config.Quest.FromID(id) (docs: game/config/questtype.html), verspreid
-- over ServerLogic-ticks zodat de client niet hapert.
-- aanname: FromID geeft nil (of een fout, die pcall opvangt) voor een id zonder quest.
-- aanname: alle quest-id's liggen onder CONFIG.questScanMaxId (het voorbeeld in de docs noemt id 456).

local QUEST_TYPE_NORMAL = enumValue(QuestType, "NORMAL", 0)

-- aanname: hasFinishedQuest en hasStartedQuest geven bij elke opvraag de actuele stand van de speler.
local function questStatus(cfg)
    if cfg.hasFinishedQuest then return "COMPLETED" end
    if cfg.hasStartedQuest then return "STARTED" end
    return "NOT_STARTED"
end

-- Variabele(n) waarmee de voortgang van een quest wordt bijgehouden. Bij een VarBit kijken we ook naar de
-- basisvariabele, omdat VarTransmit mogelijk alleen die meldt.
-- aanname: masterQuestVars is een gewone Lua-lijst die bij 1 begint (de docs zeggen "array").
local function questVarIds(cfg)
    local ids = {}
    local vars = cfg.masterQuestVars
    local first = vars and (vars[1] or vars[0])
    local v = first and first.varPlayer
    if v then
        if type(v.id) == "number" then ids[#ids + 1] = v.id end
        if v.isVarBit and v.baseVar and type(v.baseVar.id) == "number" then ids[#ids + 1] = v.baseVar.id end
    end
    return ids
end

local function readQuest(id)
    local ok, cfg = pcall(config.Quest.FromID, id)
    if not ok or cfg == nil then return nil end
    -- Alleen gewone quests: geen verouderde configs en geen seizoens- of tutorialquests.
    if cfg.deprecated then return nil end
    -- aanname: cfg.type is een getal uit de enum QuestType (NORMAL = 0). Is het iets anders, dan filteren we niet.
    if type(cfg.type) == "number" and cfg.type ~= QUEST_TYPE_NORMAL then return nil end
    if type(cfg.name) ~= "string" or cfg.name == "" then return nil end
    return {
        cfg = cfg,
        id = num(cfg.id, id),
        name = cfg.name,
        questPoints = num(cfg.questPoints, 0),
        members = cfg.isMembers and true or false,
        difficulty = num(cfg.difficulty, JSON_NULL),
        status = questStatus(cfg),
        eligible = cfg.canStartQuest and true or false,
    }
end

local function startQuestScan()
    local q = state.quests
    q.scanning = true
    q.nextId = 0
    q.list = {}
    q.byVar = {}
    q.available = false
end

-- Eén portie van de scan; geeft true terug als de scan klaar is.
local function questScanStep()
    local q = state.quests
    if not q.scanning then return true end
    if not (config and config.Quest and config.Quest.FromID) then
        q.scanning = false
        say("Ons Pap sync: config.Quest is niet beschikbaar; snapshots gaan zonder quests.")
        return true
    end
    local last = math.min(q.nextId + CONFIG.questScanPerTick - 1, CONFIG.questScanMaxId)
    for id = q.nextId, last do
        local ok, quest = pcall(readQuest, id)
        if ok and quest then
            q.list[#q.list + 1] = quest
            for _, varId in ipairs(safeCall(questVarIds, quest.cfg) or {}) do
                q.byVar[varId] = q.byVar[varId] or {}
                table.insert(q.byVar[varId], quest)
            end
        end
    end
    q.nextId = last + 1
    if q.nextId > CONFIG.questScanMaxId then
        q.scanning = false
        q.available = #q.list > 0
        debugLog("Ons Pap sync: " .. #q.list .. " quests gevonden")
        return true
    end
    return false
end

local function questsPayload()
    if not state.quests.available then return JSON_NULL end
    local out = jsonArray()
    for _, quest in ipairs(state.quests.list) do
        out[#out + 1] = {
            id = quest.id,
            name = quest.name,
            status = quest.status,
            questPoints = quest.questPoints,
            members = quest.members,
            difficulty = quest.difficulty,
            eligible = quest.eligible,
        }
    end
    return out
end

---------------------------------------------------------------------------------------------------------
-- Versturen
---------------------------------------------------------------------------------------------------------

local function canSend()
    return Plugin.HasPermission(PluginPermissions.httpAccess) and Plugin.urls and Plugin.urls.tracker ~= nil
end

-- Zet de XP-winst van het bundelvenster om in "xp"-events.
local function drainGains()
    for _, s in ipairs(SKILLS) do
        local gain = state.gains[s.type]
        if gain and gain > 0 then
            pushEvent("xp", s.name .. " +" .. string.format("%d", gain) .. " XP")
        end
    end
    state.gains = {}
end

local send -- vooruit gedeclareerd

local function scheduleRetry()
    state.retryStep = math.min(state.retryStep + 1, 5)
    state.retryTicks = math.min(CONFIG.retryTicksMin * 2 ^ (state.retryStep - 1), CONFIG.retryTicksMax)
    openWindow()
end

local function onSendDone(lastSeq, sentQuests)
    return guarded("verzending afronden", function(request)
        if state.inFlight ~= request then return end -- al afgebroken door de time-out in onServerLogic
        state.inFlight = nil
        local code = request.responseCode or 0
        if request.successful and code >= 200 and code < 300 then
            -- Verzonden events uit de wachtrij halen (nieuwere events hebben een hoger volgnummer).
            while state.events[1] and state.events[1].seq <= lastSeq do table.remove(state.events, 1) end
            if sentQuests then state.quests.dirty = false end
            state.retryStep = 0
            debugLog("Ons Pap sync: verzonden (" .. code .. ")")
            return
        end
        -- Mislukt: tracker draait niet, timeout of foutcode. Later opnieuw, steeds iets langer wachten.
        if sentQuests then state.quests.dirty = true end
        scheduleRetry()
        if request.timedOut then
            debugLog("Ons Pap sync: tracker reageert niet (timeout)")
        else
            debugLog("Ons Pap sync: verzenden mislukt, code " .. tostring(code) .. " " .. tostring(request.errorInfo or ""))
        end
    end)
end

send = function(includeQuests)
    if state.inFlight or not state.account then return false end
    if not canSend() then
        debugLog("Ons Pap sync: geen httpAccess; niets verstuurd")
        return false
    end
    drainGains()
    local events = jsonArray()
    local lastSeq = 0
    for i, e in ipairs(state.events) do
        events[i] = { at = e.at or JSON_NULL, kind = e.kind, text = e.text }
        lastSeq = e.seq
    end
    local withQuests = (includeQuests or state.quests.dirty) and state.quests.available
    local body = toJson({
        v = 1,
        account = state.account,
        sentAt = nowUnix() or JSON_NULL,
        skills = skillsPayload(),
        quests = withQuests and questsPayload() or JSON_NULL,
        events = events,
    })
    -- docs: core/http.html. Basis-URL uit het manifest, pad erachter geplakt.
    local request = HTTPRequest.new(Plugin.urls.tracker, CONFIG.syncPath)
    -- aanname: zonder Content-Type stuurt de client mogelijk text/plain; de tracker leest de body hoe dan ook
    -- als JSON, maar zo is het netjes.
    request:AddHeader("Content-Type", "application/json")
    state.inFlight = request
    state.inFlightTicks = 0
    local ok, err = pcall(function() request:Post(body, onSendDone(lastSeq, withQuests)) end)
    if not ok then
        state.inFlight = nil
        say("Ons Pap sync: verzenden kon niet starten: " .. tostring(err))
        if withQuests then state.quests.dirty = true end
        scheduleRetry()
        return false
    end
    return true
end

---------------------------------------------------------------------------------------------------------
-- Sessie: inloggen, uitloggen, inschakelen
---------------------------------------------------------------------------------------------------------

local function beginSession()
    state.account = nil
    state.skills = {}
    state.gains = {}
    state.loginCountdown = CONFIG.loginDelayTicks
    state.snapshotPending = false
    startQuestScan()
end

local function endSession()
    -- Wat nog in het bundelvenster zit, gaat met de laatst bekende stand mee.
    if state.account and (state.windowTicks ~= nil or #state.events > 0) then send(false) end
    state.account = nil
    state.loginCountdown = nil
    state.windowTicks = nil
    state.quests.scanning = false
end

-- Na inloggen: skills lezen en de volledige snapshot klaarzetten (die gaat weg zodra de questscan klaar is).
local function takeSnapshot()
    local name = readAccountName()
    if not name then return false end
    local skills = readAllSkills()
    if next(skills) == nil then return false end
    -- Ander personage dan in de vorige sessie: niet-verstuurde events horen daar niet bij.
    if state.lastAccount and state.lastAccount ~= name then state.events = {} end
    state.lastAccount = name
    state.account = name
    state.skills = skills
    state.snapshotPending = true
    return true
end

---------------------------------------------------------------------------------------------------------
-- Event-handlers (docs: core/events.html)
---------------------------------------------------------------------------------------------------------

-- SkillTransmit: een skill veranderde van waarde.
local function onSkillTransmit(ev)
    local s = SKILL_BY_TYPE[ev.skill]
    if not s then return end
    local cur = state.skills[s.type]
    if not cur or not state.account then
        -- Nog geen snapshot (bijvoorbeeld vlak na inloggen, als de server alle stats doorstuurt): niet als
        -- winst tellen, de snapshot leest straks de echte stand.
        return
    end
    local newXp = ev.newXP
    if type(newXp) ~= "number" or newXp <= cur.xp then return end
    state.gains[s.type] = (state.gains[s.type] or 0) + (newXp - cur.xp)
    cur.xp = newXp
    -- newGameplayLevel bevat boosts en drains; voor een levelup kijken we naar het level op basis van XP.
    local level = safeCall(Player.GetLevelUncapped, s.type)
    if type(level) == "number" then
        if level > cur.level then
            pushEvent("levelup", s.name .. " level " .. string.format("%d", level) .. " gehaald")
        end
        cur.level = level
    end
    openWindow()
end

-- VarTransmit: komt heel vaak langs, dus alleen een opzoeking in byVar.
local function onVarTransmit(ev)
    local v = ev.var
    local id = v and v.id
    local watchers = id and state.quests.byVar[id]
    if not watchers or not state.account then return end
    for _, quest in ipairs(watchers) do
        local status = safeCall(questStatus, quest.cfg)
        if status and status ~= quest.status then
            if status == "COMPLETED" then pushEvent("quest", "Quest voltooid: " .. quest.name) end
            quest.status = status
            quest.eligible = safeCall(function() return quest.cfg.canStartQuest end) and true or false
            state.quests.dirty = true
            openWindow()
        end
    end
end

-- GameStateChanged: inloggen en uitloggen herkennen.
-- aanname: tussen GAME en LOADING wisselt de staat ook bij laden en teleporteren; daarom start een nieuwe
-- sessie alleen als er nog geen loopt, en eindigt een sessie pas in het inlogscherm of de lobby.
local function onGameStateChanged(ev)
    local newState = ev.newState
    if newState == STATE_GAME and state.account == nil and state.loginCountdown == nil then
        beginSession()
    elseif newState == STATE_LOGINSCREEN or newState == STATE_LOBBY then
        endSession()
    end
end

-- ServerLogic: de klok van de plugin (ongeveer elke 0,6 s).
local function onServerLogic()
    -- 1. Na inloggen even wachten, dan de skills lezen.
    if state.loginCountdown ~= nil then
        state.loginCountdown = state.loginCountdown - 1
        if state.loginCountdown <= 0 then
            if takeSnapshot() then
                state.loginCountdown = nil
            else
                state.loginCountdown = CONFIG.loginDelayTicks -- speler nog niet beschikbaar: later opnieuw
            end
        end
    end

    -- 2. Questscan in porties.
    if state.quests.scanning then questScanStep() end

    -- 3. Een verzending die blijft hangen afbreken.
    if state.inFlight then
        state.inFlightTicks = state.inFlightTicks + 1
        if state.inFlightTicks > CONFIG.inFlightMaxTicks then
            local stuck = state.inFlight
            state.inFlight = nil
            pcall(function() stuck:Cancel() end)
            state.quests.dirty = state.quests.available
            scheduleRetry()
        end
        return
    end

    -- 4. Wachten na een mislukte verzending.
    if state.retryTicks > 0 then
        state.retryTicks = state.retryTicks - 1
        return
    end

    -- 5. Volledige snapshot zodra de questscan klaar is.
    if state.snapshotPending and not state.quests.scanning then
        if send(true) then
            state.snapshotPending = false
            state.windowTicks = nil
        end
        return
    end

    -- 6. Bundelvenster: hooguit eens per CONFIG.bundleTicks versturen.
    if state.windowTicks ~= nil then
        state.windowTicks = state.windowTicks + 1
        if state.windowTicks >= CONFIG.bundleTicks and send(false) then
            state.windowTicks = nil
        end
    end
end

---------------------------------------------------------------------------------------------------------
-- Start
---------------------------------------------------------------------------------------------------------

Event.SkillTransmit.Subscribe("onsPapSyncSkill", guarded("SkillTransmit", onSkillTransmit))
Event.VarTransmit.Subscribe("onsPapSyncVar", guarded("VarTransmit", onVarTransmit))
Event.GameStateChanged.Subscribe("onsPapSyncState", guarded("GameStateChanged", onGameStateChanged))
Event.ServerLogic.Subscribe("onsPapSyncTick", guarded("ServerLogic", onServerLogic))

-- Events vuren niet bij het inschakelen zelf (tutorial "Events"). Is de speler al ingelogd, dan meteen een
-- sessie starten; anders wacht de plugin op GameStateChanged.
guarded("inschakelen", function()
    if not Plugin.HasPermission(PluginPermissions.httpAccess) then
        say("Ons Pap sync: de permissie httpAccess ontbreekt; er wordt niets verstuurd.")
    end
    if safeCall(Player.IsAvailable) then beginSession() end
end)()
