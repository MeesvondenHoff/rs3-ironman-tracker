"""Valideert route.json tegen ROUTE-SCHEMA.md en de quest-snapshot. Gebruik: python -I validate_route.py <RS3 Ironman-map>"""
import json, sys, pathlib

root = pathlib.Path(sys.argv[1])
route = json.loads((root / "app/src/data/route.json").read_text(encoding="utf-8"))
quests = json.loads((root / "research/snapshots/2026-11-03 runemetrics quests.json").read_text(encoding="utf-8"))["quests"]
qtitles = {q["title"] for q in quests}
SKILLS = {"Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic", "Cooking", "Woodcutting",
          "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining", "Herblore", "Agility", "Thieving",
          "Slayer", "Farming", "Runecrafting", "Hunter", "Construction", "Summoning", "Dungeoneering", "Divination",
          "Invention", "Archaeology", "Necromancy"}
errors, warnings = [], []
meta = route["meta"]
for k in ("account", "goal", "playstyle", "updated", "sources"):
    if k not in meta:
        errors.append(f"meta.{k} ontbreekt")
src_ids = [s["id"] for s in meta["sources"]]
for s in meta["sources"]:
    for k in ("id", "title", "url", "weight", "note"):
        if not s.get(k):
            errors.append(f"bron {s.get('id')} mist {k}")
    if s.get("weight") not in ("hoog", "midden", "laag"):
        errors.append(f"bron {s['id']} heeft ongeldig gewicht")
ids = list(src_ids)
phases = route["phases"]
if len(phases) < 5:
    errors.append("minder dan 5 fasen")
used_src = set()
nsteps = nauto = nloc = 0


def check_cond(where, cond):
    for sk, lv in cond.get("skills", {}).items():
        if sk not in SKILLS:
            errors.append(f"{where}: onbekende skill {sk}")
        if not (isinstance(lv, int) and 1 <= lv <= 120):
            errors.append(f"{where}: ongeldig level {sk}={lv}")
    for q in cond.get("quests", []):
        if q not in qtitles:
            errors.append(f"{where}: quest niet in snapshot: {q}")


for p in phases:
    ids.append(p["id"])
    for k in ("id", "title", "summary", "estHours", "targets", "steps"):
        if k not in p:
            errors.append(f"{p.get('id')}: {k} ontbreekt")
    for t in p["targets"]:
        if t["skill"] not in SKILLS:
            errors.append(f"{p['id']}: onbekende target-skill {t['skill']}")
    stepsum = sum(s["estHours"] for s in p["steps"])
    if abs(stepsum - p["estHours"]) > 1:
        warnings.append(f"{p['id']}: fase-uren {p['estHours']} wijken af van som stappen {stepsum}")
    for s in p["steps"]:
        nsteps += 1
        ids.append(s["id"])
        for k in ("id", "title", "type", "style", "estHours", "detail", "why", "sources"):
            if k not in s or s[k] in ("", None, []):
                errors.append(f"{s.get('id')}: {k} ontbreekt of leeg")
        if s.get("type") not in ("quest", "skill", "unlock", "gear", "misc"):
            errors.append(f"{s['id']}: ongeldig type {s.get('type')}")
        if s.get("style") not in ("active", "afk", "mixed"):
            errors.append(f"{s['id']}: ongeldige style {s.get('style')}")
        for sid in s["sources"]:
            used_src.add(sid)
            if sid not in src_ids:
                errors.append(f"{s['id']}: bron {sid} niet in meta.sources")
        if "location" in s:
            nloc += 1
            loc = s["location"]
            if not isinstance(loc, str) or not loc.strip() or "\n" in loc:
                errors.append(f"{s['id']}: location moet een niet-lege string op één regel zijn")
        if "requires" in s:
            check_cond(s["id"] + ".requires", s["requires"])
        if "completeWhen" in s:
            nauto += 1
            check_cond(s["id"] + ".completeWhen", s["completeWhen"])
            if s["type"] == "quest" and not s["completeWhen"].get("quests"):
                warnings.append(f"{s['id']}: queststap zonder quest in completeWhen")
dups = {i for i in ids if ids.count(i) > 1}
if dups:
    errors.append(f"dubbele id's: {sorted(dups)}")
unused = set(src_ids) - used_src
if unused:
    warnings.append(f"ongebruikte bronnen: {sorted(unused)}")
print(f"fasen={len(phases)} stappen={nsteps} met completeWhen={nauto} met location={nloc} bronnen={len(src_ids)} id's={len(ids)} totaal uren={sum(p['estHours'] for p in phases)}")
for w in warnings:
    print("WAARSCHUWING:", w)
for e in errors:
    print("FOUT:", e)
print("RESULTAAT:", "OK" if not errors else f"{len(errors)} fouten")
sys.exit(1 if errors else 0)
