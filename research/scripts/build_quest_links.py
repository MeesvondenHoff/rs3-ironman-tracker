"""Bouwt app/src/data/quest-links.json: per RuneMetrics-quest de RS3-wikipagina en, als die bestaat, de Quick guide.

Gebruik (vanuit de projectmap):
    python -I research/scripts/build_quest_links.py "research/snapshots/<datum> runemetrics quests.json"

Controleert het bestaan van pagina's in batches van 50 via de MediaWiki-API van runescape.wiki (nooit OSRS).
"""
import datetime, json, pathlib, sys, time, urllib.parse, urllib.request

API = "https://runescape.wiki/api.php"
WIKI = "https://runescape.wiki/w/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RS3IronmanTracker/1.0 (quest-links)"

# RuneMetrics-titel -> wikititel, alleen waar de RuneMetrics-titel geen (redirect naar een) wikipagina is.
# Ook nodig als de RuneMetrics-titel op de wiki een andere pagina is (boss of minigame met dezelfde naam).
# Titels die via een wiki-redirect goed uitkomen (bijv. "Finale" -> "Once Upon a Time in Gielinor: Finale")
# hoeven hier niet in; het script meldt die apart.
MAPPING: dict[str, str] = {
    "Raksha, the Shadow Colossus": "Raksha, the Shadow Colossus (quest)",  # zonder suffix: de bosspagina
    "Tears of Guthix": "Tears of Guthix (quest)",  # zonder suffix: de minigame
}


def wiki_path(title: str) -> str:
    """Wikititel naar URL-pad: spaties als underscores, speciale tekens encoded, apostrofs blijven."""
    return urllib.parse.quote(title.replace(" ", "_"), safe="'()/:,!-_.")


def query(titles: list[str]) -> dict[str, str | None]:
    """Geeft per gevraagde titel de uiteindelijke paginatitel (na normalisatie en redirects) of None als die ontbreekt."""
    params = {"action": "query", "titles": "|".join(titles), "redirects": "1", "format": "json", "formatversion": "2"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)["query"]
    hop: dict[str, str] = {}
    for n in data.get("normalized", []):
        hop[n["from"]] = n["to"]
    for n in data.get("redirects", []):
        hop[n["from"]] = n["to"]
    pages = {p["title"]: not p.get("missing") and not p.get("invalid") for p in data.get("pages", [])}
    out: dict[str, str | None] = {}
    for t in titles:
        cur, seen = t, set()
        while cur in hop and cur not in seen:
            seen.add(cur)
            cur = hop[cur]
        out[t] = cur if pages.get(cur) else None
    return out


def query_all(titles: list[str]) -> dict[str, str | None]:
    res: dict[str, str | None] = {}
    for i in range(0, len(titles), 50):
        res.update(query(titles[i : i + 50]))
        time.sleep(0.5)
    return res


def main() -> None:
    snap = pathlib.Path(sys.argv[1])
    root = pathlib.Path(__file__).resolve().parents[2]
    titles = [q["title"] for q in json.loads(snap.read_text(encoding="utf-8"))["quests"]]
    wiki_titles = {t: MAPPING.get(t, t) for t in titles}
    base = query_all(sorted(set(wiki_titles.values())))
    missing = [t for t in titles if base[wiki_titles[t]] is None]
    resolved = {t: base[wiki_titles[t]] or wiki_titles[t] for t in titles}
    guides = query_all(sorted({r + "/Quick guide" for r in resolved.values()}))
    quests = {}
    for t in titles:
        page = resolved[t]
        entry = {"wiki": WIKI + wiki_path(page)}
        g = guides[page + "/Quick guide"]
        # Alleen een echte subpagina telt; een redirect terug naar de questpagina zelf niet.
        if g and g.endswith("/Quick guide"):
            entry["quickGuide"] = WIKI + wiki_path(g)
        quests[t] = entry
    out = {
        "checked": datetime.date.today().isoformat(),
        "source": snap.name,
        "mapped": {t: MAPPING[t] for t in titles if t in MAPPING},
        "quests": quests,
    }
    dest = root / "app" / "src" / "data" / "quest-links.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    n_qg = sum(1 for e in quests.values() if "quickGuide" in e)
    print(f"{len(quests)} quests, {n_qg} met Quick guide, {len(quests) - n_qg} zonder")
    if missing:
        print("Geen wikipagina gevonden (vul MAPPING aan):", *missing, sep="\n  ")
    redirected = {t: resolved[t] for t in titles if resolved[t] != wiki_titles[t]}
    if redirected:
        print("Via redirect/normalisatie:", *(f"{k} -> {v}" for k, v in redirected.items()), sep="\n  ")


if __name__ == "__main__":
    main()
