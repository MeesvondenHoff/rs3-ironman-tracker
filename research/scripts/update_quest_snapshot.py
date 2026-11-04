"""Ververst app/src/data/quests-snapshot.json: de meegeleverde questlijst waar de app op terugvalt als
RuneMetrics (gestopt op 10 november 2026) of de opvolger geen quests geeft.

Gebruik (vanuit de projectmap):
    python -I research/scripts/update_quest_snapshot.py               # nieuwste "<datum> runemetrics quests.json"
    python -I research/scripts/update_quest_snapshot.py "<pad naar quests.json>" [--account "Ons Pap"]

Het bronbestand moet de vorm van het RuneMetrics-antwoord hebben: {"quests": [{title, status, difficulty,
members, questPoints, userEligible}, ...]}. Een export uit de nieuwe API zet je eerst in die vorm.
`fetchedAt` wordt de datum uit de bestandsnaam (JJJJ-MM-DD aan het begin), anders de wijzigingsdatum van het bestand.
"""
import datetime, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SNAPSHOTS = ROOT / "research" / "snapshots"
DEST = ROOT / "app" / "src" / "data" / "quests-snapshot.json"
STATUSES = {"COMPLETED", "STARTED", "NOT_STARTED"}


def newest() -> pathlib.Path:
    found = sorted(SNAPSHOTS.glob("* runemetrics quests.json"))
    if not found:
        sys.exit(f"Geen '<datum> runemetrics quests.json' gevonden in {SNAPSHOTS}")
    return found[-1]


def main(argv: list[str]) -> None:
    account = "Ons Pap"
    if "--account" in argv:
        i = argv.index("--account")
        account = argv[i + 1]
        argv = argv[:i] + argv[i + 2 :]
    src = pathlib.Path(argv[0]) if argv else newest()
    data = json.loads(src.read_text(encoding="utf-8"))
    quests = data.get("quests") if isinstance(data, dict) else None
    if not isinstance(quests, list) or not quests:
        sys.exit(f"{src.name}: geen (of een lege) questlijst")
    for q in quests:
        if not isinstance(q.get("title"), str) or q.get("status") not in STATUSES or not isinstance(q.get("questPoints"), int):
            sys.exit(f"{src.name}: onverwachte quest {q!r}")

    m = re.match(r"(\d{4}-\d{2}-\d{2})", src.name)
    fetched = m.group(1) if m else datetime.date.fromtimestamp(src.stat().st_mtime).isoformat()
    head = {"account": account, "fetchedAt": fetched, "source": src.name}
    # Eén quest per regel, zodat een git-diff per quest leesbaar blijft.
    lines = [f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}," for k, v in head.items()]
    rows = ",\n".join("    " + json.dumps(q, ensure_ascii=False) for q in quests)
    text = "{\n" + "\n".join(lines) + '\n  "quests": [\n' + rows + "\n  ]\n}\n"
    DEST.write_bytes(text.encode("utf-8"))
    done = sum(1 for q in quests if q["status"] == "COMPLETED")
    qp = sum(q["questPoints"] for q in quests if q["status"] == "COMPLETED")
    print(f"{DEST.relative_to(ROOT)}: {len(quests)} quests, {done} voltooid, {qp} QP, stand {fetched} (uit {src.name})")


if __name__ == "__main__":
    main(sys.argv[1:])
