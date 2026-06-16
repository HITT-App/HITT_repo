#!/usr/bin/env python3
"""
End-to-end recipe-image deployment — sibling to
apply_meal_picks_and_upload.py but targeting the `recipes` table.

Pipeline:
  1. Read PICKS table (slug -> variant suffix)
  2. For each pick: copy _generated/recipes/<slug>-v<NN>.png
                       to _generated/recipes/final/<slug>.png
  3. Delete every other <slug>-*.png variant locally
  4. Upload each final/<slug>.png to Supabase Storage at
     meal-images/recipes/<slug>.png  (x-upsert: true, idempotent;
     matches the existing convention used by the 23 recipes that
     already have images).
  5. PATCH the recipes table: image_url = public storage URL, where id = recipe_id

Reads env vars (no credentials in code):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  python supabase_scripts/apply_recipe_picks_and_upload.py            # do it
  python supabase_scripts/apply_recipe_picks_and_upload.py --dry-run  # plan only
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


SCRIPT_DIR = Path(__file__).resolve().parent
GEN_DIR = SCRIPT_DIR.parent / "_generated" / "recipes"
FINAL_DIR = GEN_DIR / "final"
MANIFEST_PATH = GEN_DIR / "manifest.json"

BUCKET = "meal-images"
STORAGE_PATH_PREFIX = "recipes"   # matches existing 23-recipe convention


# slug -> variant suffix to keep
PICKS = {
    "chlorophyll-green-smoothie-bowl":  "v03",
    "mass-gain-overnight-oats":         "v03",
    "lean-chicken-soup":                "v02",
    "lean-turkey-stuffed-peppers":      "v01",
    "teriyaki-salmon-rice-bowl":        "v02",
    "cauliflower-fried-rice":           "v01",
    "edamame-and-quinoa-power-salad":   "v01",
}


def env_or_exit(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        sys.exit(f"ERROR: env var {name} is not set.")
    return v


# ---------------------------------------------------------------------
# Phase 1 — local file picks
# ---------------------------------------------------------------------

def apply_picks(dry_run: bool) -> list[tuple[str, Path]]:
    """Copy winner to final/<slug>.png and delete all other variants for that slug."""
    if not GEN_DIR.exists():
        sys.exit(f"ERROR: {GEN_DIR} does not exist — run generator first.")
    FINAL_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    for slug, variant in PICKS.items():
        winner_src = GEN_DIR / f"{slug}-{variant}.png"
        winner_dst = FINAL_DIR / f"{slug}.png"

        if not winner_src.exists():
            if winner_dst.exists():
                print(f"  [skip-keep] {winner_dst.name} already finalised")
                results.append((slug, winner_dst))
                continue
            print(f"  [MISSING]   {winner_src.name}")
            continue

        if dry_run:
            print(f"  [plan] copy  {winner_src.name}  ->  final/{winner_dst.name}")
        else:
            shutil.copy2(winner_src, winner_dst)
            print(f"  [copy] {winner_src.name}  ->  final/{winner_dst.name}")
        results.append((slug, winner_dst))

        for other in sorted(GEN_DIR.glob(f"{slug}-v*.png")):
            if dry_run:
                print(f"  [plan] delete {other.name}")
            else:
                other.unlink()
                print(f"  [del]  {other.name}")

    return results


# ---------------------------------------------------------------------
# Phase 2 — Supabase Storage upload
# ---------------------------------------------------------------------

def upload_to_storage(base_url: str, service_key: str, local_path: Path, storage_path: str, dry_run: bool) -> str:
    public_url = f"{base_url}/storage/v1/object/public/{BUCKET}/{quote(storage_path)}"
    if dry_run:
        print(f"  [plan] upload {local_path.name}  ->  {BUCKET}/{storage_path}")
        return public_url

    upload_url = f"{base_url}/storage/v1/object/{BUCKET}/{quote(storage_path)}"
    mime = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    body = local_path.read_bytes()
    req = Request(upload_url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("apikey", service_key)
    req.add_header("Content-Type", mime)
    req.add_header("x-upsert", "true")
    try:
        with urlopen(req, timeout=60) as r:
            r.read()
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        sys.exit(f"ERROR: storage upload failed for {local_path.name} — HTTP {e.code}: {detail}")
    except URLError as e:
        sys.exit(f"ERROR: storage upload network error — {e}")

    size_kb = local_path.stat().st_size // 1024
    print(f"  [up]   {local_path.name}  ({size_kb} KB)  ->  {storage_path}")
    return public_url


# ---------------------------------------------------------------------
# Phase 3 — patch recipes.image_url
# ---------------------------------------------------------------------

def fetch_recipe_id_by_slug(base_url: str, service_key: str, slug_to_name: dict[str, str]) -> dict[str, str]:
    select = "id,name"
    url = f"{base_url}/rest/v1/recipes?" + urlencode({"select": select, "image_url": "is.null"})
    req = Request(url)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Accept", "application/json")
    try:
        with urlopen(req, timeout=30) as r:
            recipes = json.loads(r.read())
    except HTTPError as e:
        sys.exit(f"ERROR: recipes lookup failed — HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")

    name_to_id = {r["name"]: r["id"] for r in recipes}
    slug_to_id: dict[str, str] = {}
    for slug, name in slug_to_name.items():
        rid = name_to_id.get(name)
        if rid:
            slug_to_id[slug] = rid
        else:
            print(f"  [WARN] slug '{slug}' name '{name}' not found in recipes (image_url IS NULL)")
    return slug_to_id


def patch_recipe_image_url(base_url: str, service_key: str, recipe_id: str, image_url: str, dry_run: bool) -> None:
    url = f"{base_url}/rest/v1/recipes?id=eq.{recipe_id}"
    if dry_run:
        print(f"  [plan] PATCH recipes id={recipe_id[:8]}... image_url={image_url[:60]}...")
        return
    req = Request(url, data=json.dumps({"image_url": image_url}).encode("utf-8"), method="PATCH")
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urlopen(req, timeout=30) as r:
            r.read()
    except HTTPError as e:
        sys.exit(f"ERROR: recipes PATCH failed for {recipe_id} — HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")
    print(f"  [db]   recipes.image_url set for {recipe_id[:8]}...")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    base_url = env_or_exit("SUPABASE_URL").rstrip("/")
    service_key = env_or_exit("SUPABASE_SERVICE_ROLE_KEY")

    if not MANIFEST_PATH.exists():
        sys.exit(f"ERROR: {MANIFEST_PATH} not found — run generator first.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    slug_to_name = {entry["slug"]: entry["name"] for entry in manifest["recipes"].values()}

    print("\n=== Phase 1: pick winners ===")
    pairs = apply_picks(dry_run=args.dry_run)

    print("\n=== Phase 2: upload to Supabase Storage ===")
    slug_to_public_url: dict[str, str] = {}
    for slug, path in pairs:
        storage_path = f"{STORAGE_PATH_PREFIX}/{path.name}"
        public_url = upload_to_storage(base_url, service_key, path, storage_path, dry_run=args.dry_run)
        slug_to_public_url[slug] = public_url

    print("\n=== Phase 3: update recipes.image_url ===")
    slug_to_id = fetch_recipe_id_by_slug(base_url, service_key, slug_to_name)
    for slug, public_url in slug_to_public_url.items():
        recipe_id = slug_to_id.get(slug)
        if not recipe_id:
            print(f"  [skip] no recipe_id for slug {slug} (already linked or not found)")
            continue
        patch_recipe_image_url(base_url, service_key, recipe_id, public_url, dry_run=args.dry_run)

    print()
    if args.dry_run:
        print("Dry run complete — nothing changed.")
    else:
        print(f"Done. {len(slug_to_public_url)} recipe image(s) deployed.")
        print(f"  Local finals:  {FINAL_DIR}")
        print(f"  Storage path:  {BUCKET}/{STORAGE_PATH_PREFIX}/")


if __name__ == "__main__":
    main()
