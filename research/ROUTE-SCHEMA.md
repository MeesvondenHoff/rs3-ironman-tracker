# Route-dataschema (gedeeld contract tussen research en app)

Bestand: `app/src/data/route.json`. De app leest dit bestand; de research levert het. Taal van alle teksten: Nederlands, skill- en questnamen in het Engels zoals in-game.

```jsonc
{
  "meta": {
    "account": "Ons Pap",
    "goal": "Combat-klaar mid game: combat 100+, T70-T80 gear, Slayer en eerste bosses",
    "playstyle": "Afwisselend actief/AFK, 7-15 uur per week",
    "updated": "2026-11-03",
    "sources": [ { "id": "src-wiki-ironman", "title": "RS Wiki: Ironman guide", "url": "https://...", "weight": "hoog|midden|laag", "note": "waarom deze bron meeweegt" } ]
  },
  "phases": [
    {
      "id": "p1",
      "title": "Korte titel",
      "summary": "Wat deze fase oplevert en waarom hij hier staat (2-4 zinnen).",
      "estHours": 12,
      "targets": [ { "skill": "Agility", "level": 50 } ],
      "steps": [
        {
          "id": "p1-01",
          "title": "Korte titel",
          "type": "quest | skill | unlock | gear | misc",
          "style": "active | afk | mixed",
          "estHours": 1.5,
          "location": "Varrock Museum, kelder",
          "detail": "Concrete uitleg: wat, waar, welke methode, welke items. Mag markdown bevatten.",
          "why": "Waarom deze stap nu en niet later; welke guide dit aanraadt en wat de afweging was.",
          "requires": { "skills": { "Agility": 30 }, "quests": ["Waterfall Quest"] },
          "completeWhen": { "skills": { "Agility": 50 }, "quests": ["Waterfall Quest"] },
          "sources": ["src-wiki-ironman"]
        }
      ]
    }
  ]
}
```

Regels:

- `completeWhen` is optioneel. Staat het erin, dan vinkt de app de stap automatisch af zodra alle genoemde skills op of boven het level staan en alle quests `COMPLETED` zijn in RuneMetrics. Zonder `completeWhen` vinkt de speler handmatig af.
- `requires` is optioneel en dient voor een waarschuwing "nog niet beschikbaar" in de app.
- `location` is optioneel: waar je de stap doet, kort en op één regel. Bij een quest het startpunt (plaats en/of NPC), bij een skill de trainingsplek, bij een unlock de NPC of plaats; bijvoorbeeld "Varrock Museum, kelder" of "Menaphos, Merchant district". Plaats- en NPC-namen in het Engels zoals in-game (RS3-wiki), verbindende woorden mogen Nederlands. Laat het veld weg als een plaats niets toevoegt (bijvoorbeeld bij een weekritme of bossvoorbereiding). De app toont het als het er is; `validate_route.py` controleert dat het een niet-lege string zonder regeleinde is.
- Skillnamen exact zoals de hiscores: Attack, Defence, Strength, Constitution, Ranged, Prayer, Magic, Cooking, Woodcutting, Fletching, Fishing, Firemaking, Crafting, Smithing, Mining, Herblore, Agility, Thieving, Slayer, Farming, Runecrafting, Hunter, Construction, Summoning, Dungeoneering, Divination, Invention, Archaeology, Necromancy.
- Questtitels exact zoals in `research/snapshots/2026-11-03 runemetrics quests.json` (veld `title`).
- Id's zijn stabiel; de app bewaart handmatige vinkjes per id in localStorage.
