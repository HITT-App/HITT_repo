#!/usr/bin/env python3
"""
Generate SQL to replace placeholder workouts with the real video library.

Reads:
  - workout-metadata-prefilled.csv          (path via METADATA_CSV env var)
  - stills-metadata-prefilled.csv           (path via STILLS_CSV env var)
  - supabase_scripts/_upload_manifest.json  (produced by upload_workout_assets.py)

Emits a single BEGIN/COMMIT transaction to stdout that:
  1. DELETEs all rows from workout_exercises and workouts (placeholders).
  2. INSERTs one workouts row per workout folder (19 — Rowing Workout is skipped, no video).
  3. INSERTs one workout_exercises row per video clip (58 total), each linked to its
     parent workout, with video_url and (where pairable) thumbnail_url from the manifest.

Pipe into Supabase:
  python3 supabase_scripts/seed_workout_library.py | supabase db query --linked

Workout UUIDs are deterministic (uuid5 from folder name) so re-running yields the same IDs.
"""

import csv
import json
import os
import sys
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_METADATA = "C:/Users/VanessaLatchem-Smith/OneDrive - Fields Group Ltd/Vanessa/HITT/workout-metadata-prefilled.csv"
DEFAULT_STILLS = "C:/Users/VanessaLatchem-Smith/OneDrive - Fields Group Ltd/Vanessa/HITT/stills-metadata-prefilled.csv"
DEFAULT_MANIFEST = REPO_ROOT / "supabase_scripts" / "_upload_manifest.json"

METADATA_CSV = Path(os.environ.get("METADATA_CSV", DEFAULT_METADATA))
STILLS_CSV = Path(os.environ.get("STILLS_CSV", DEFAULT_STILLS))
MANIFEST_PATH = Path(os.environ.get("MANIFEST", DEFAULT_MANIFEST))

# Namespace for deterministic UUIDs — never change once seeded
WORKOUT_NS = uuid.UUID("d3f8c2e0-1234-5678-9abc-def012345678")

# Canonical category slugs — must match CATEGORIES ids in WorkoutLibrary.tsx
CATEGORY_NORMALISE = {
    "Strength": "strength",
    "HIIT": "hiit",
    "Cardio": "cardio",
    "Mobility": "mobility",
    "Recovery": "recovery",
    "Warm-up": "warm-up",
}

# Fallbacks when CSV has blanks (category is NOT NULL in the schema)
CATEGORY_FALLBACK = {
    "Boxing": "cardio",
    "Full Body Flow": "mobility",
    "full body burner": "hiit",
}

# Canonical body_area slugs — must match BODY_AREAS ids in WorkoutLibrary.tsx
BODY_AREA_NORMALISE = {
    "Core": "core",
    "Lower body": "lower-body",
    "Upper body": "upper-body",
    "Full body": "full-body",
    "Mobility": "mobility",
    "Cardio system": "cardio-system",
}

# Map CSV body_areas pre-fills to the singular body_area used on workout_exercises
EXERCISE_BODY_AREA = {
    "Core": "core",
    "Lower body": "lower-body",
    "Upper body": "upper-body",
    "Full body": "full-body",
    "Mobility": "mobility",
    "Cardio system": "cardio-system",
}


def esc(s: str) -> str:
    return s.replace("'", "''")


def sql_text(v) -> str:
    if v is None or v == "":
        return "NULL"
    return f"'{esc(str(v))}'"


def sql_array(values) -> str:
    if not values:
        return "'{}'"
    parts = ",".join(f'"{esc(v)}"' for v in values)
    return f"'{{{parts}}}'"


def parse_body_areas(cell: str):
    if not cell:
        return []
    return [p.strip() for p in cell.split(",") if p.strip()]


def workout_id(folder: str) -> str:
    return str(uuid.uuid5(WORKOUT_NS, folder))


def load_manifest():
    if not MANIFEST_PATH.exists():
        sys.exit(f"Manifest not found at {MANIFEST_PATH}. Run upload_workout_assets.py first.")
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def load_metadata_rows():
    rows = []
    with open(METADATA_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fn = row.get("Filename", "")
            if not fn or fn.startswith("["):
                continue  # skip header/example rows
            rows.append(row)
    return rows


def load_stills_by_folder():
    out = {}
    if not STILLS_CSV.exists():
        return out
    with open(STILLS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fn = row.get("Filename", "")
            if not fn or fn.startswith("["):
                continue
            folder = row.get("Workout", "").strip()
            if folder:
                out.setdefault(folder, []).append(fn)
    return out


def folder_from_filename(fn: str) -> str:
    return fn.split("/", 1)[0]


def main() -> int:
    manifest = load_manifest()
    assets = manifest["assets"]
    rows = load_metadata_rows()
    stills_by_folder = load_stills_by_folder()

    # Group video rows by folder
    by_folder = {}
    for row in rows:
        folder = folder_from_filename(row["Filename"])
        by_folder.setdefault(folder, []).append(row)

    sql = ["BEGIN;", ""]
    sql.append("-- Wipe placeholder workout content.")
    sql.append("DELETE FROM workout_exercises;")
    sql.append("DELETE FROM workouts;")
    sql.append("")

    workouts_inserted = 0
    exercises_inserted = 0
    missing_manifest = 0

    for folder in sorted(by_folder):
        video_rows = by_folder[folder]
        if not video_rows:
            continue

        # Parent workout fields — derive from first row in folder
        first = video_rows[0]
        wid = workout_id(folder)
        title = first.get("Title", "").strip() or folder
        raw_category = first.get("Category", "").strip()
        category = CATEGORY_NORMALISE.get(raw_category) or CATEGORY_FALLBACK.get(folder, "unassigned")
        difficulty = (first.get("Difficulty", "").strip() or "beginner").lower()
        duration_minutes = first.get("Duration (minutes)", "").strip()
        if not duration_minutes:
            duration_minutes = "20"  # schema default
        raw_body_areas = parse_body_areas(first.get("Body areas", ""))
        body_areas = [BODY_AREA_NORMALISE.get(a, a) for a in raw_body_areas]

        description = "Pending owner review."
        if category == "unassigned":
            description = "Category pending owner confirmation."

        # Parent thumbnail: first still in folder if any
        folder_stills = stills_by_folder.get(folder, [])
        parent_thumb_url = None
        if folder_stills:
            entry = assets.get(folder_stills[0])
            if entry:
                parent_thumb_url = entry["public_url"]

        sql.append(
            "INSERT INTO workouts "
            "(id, title, description, category, difficulty, duration_minutes, "
            "body_areas, thumbnail_url, is_featured) VALUES ("
            f"'{wid}', "
            f"{sql_text(title)}, "
            f"{sql_text(description)}, "
            f"{sql_text(category)}, "
            f"{sql_text(difficulty)}, "
            f"{duration_minutes}, "
            f"{sql_array(body_areas)}, "
            f"{sql_text(parent_thumb_url)}, "
            "false);"
        )
        workouts_inserted += 1

        # Exercises — one per video, paired with a still by sort order where possible
        for idx, row in enumerate(video_rows, start=1):
            asset_key = row["Filename"]
            entry = assets.get(asset_key)
            if not entry:
                missing_manifest += 1
                sql.append(f"-- MISSING manifest entry for {asset_key}")
                continue
            video_url = entry["public_url"]

            # Pair with still at the same sort index if available
            still_url = None
            if idx - 1 < len(folder_stills):
                still_entry = assets.get(folder_stills[idx - 1])
                if still_entry:
                    still_url = still_entry["public_url"]

            ex_title = f"Exercise {idx}"
            primary_body = body_areas[0] if body_areas else None
            body_area = EXERCISE_BODY_AREA.get(primary_body, "full-body") if primary_body else "full-body"

            sql.append(
                "INSERT INTO workout_exercises "
                "(workout_id, title, body_area, video_url, thumbnail_url, order_index) VALUES ("
                f"'{wid}', "
                f"{sql_text(ex_title)}, "
                f"{sql_text(body_area)}, "
                f"{sql_text(video_url)}, "
                f"{sql_text(still_url)}, "
                f"{idx});"
            )
            exercises_inserted += 1

        sql.append("")

    sql.append("COMMIT;")

    print("\n".join(sql))
    print(
        f"\n-- Workouts inserted: {workouts_inserted}, "
        f"exercises inserted: {exercises_inserted}, "
        f"missing manifest entries: {missing_manifest}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
