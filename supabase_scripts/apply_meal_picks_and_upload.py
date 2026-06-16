#!/usr/bin/env python3
"""
End-to-end: pick the winning meal image variants, rename them to drop the
-vNN suffix, upload to Supabase Storage, and write image_url back onto
the meals table.

Pipeline:
  1. Read PICKS table (slug -> variant suffix)
  2. For each pick: copy _generated/meals/meal-<slug>-v<N>.jpg
                       to _generated/meals/final/meal-<slug>.jpg
  3. Delete every other meal-<slug>-*.jpg variant (winners-only stays)
  4. Upload each final/meal-<slug>.jpg to Supabase Storage at
     app-assets/meals/meal-<slug>.jpg  (x-upsert: true, idempotent)
  5. PATCH the meals table: image_url = public storage URL, where id = meal_id

Reads (env vars only):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  python supabase_scripts/apply_meal_picks_and_upload.py            # do it
  python supabase_scripts/apply_meal_picks_and_upload.py --dry-run  # plan only
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
GEN_DIR = SCRIPT_DIR.parent / "_generated" / "meals"
FINAL_DIR = GEN_DIR / "final"
MANIFEST_PATH = GEN_DIR / "manifest.json"

BUCKET = "meal-images"   # dedicated public bucket on this project
STORAGE_PATH_PREFIX = ""  # file sits at bucket root


# slug -> variant suffix to keep ("v03", "v04", ...)
PICKS = {
    "banana-peanut-butter-protein-smoothie":   "v03",
    "greek-yogurt-parfait-with-nuts-berries":  "v03",
    "turmeric-ginger-anti-inflammatory-smoothie": "v04",
    "grilled-steak-with-avocado-salsa":        "v03",
    "mushroom-rice-bowl-deluxe":               "v03",
    "avocado-chickpea-salad":                  "v03",
    "quinoa-roasted-veggie-power-bowl":        "v03",
    "hummus-fresh-veggie-platter-with-pita":   "v04",
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
    """Move the winning file for each meal into final/ as meal-<slug>.jpg.
    Returns [(slug, final_path)] for the upload phase.

    Also deletes every non-chosen variant for each slug from GEN_DIR.
    """
    if not GEN_DIR.exists():
        sys.exit(f"ERROR: {GEN_DIR} does not exist — run generator first.")

    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    for slug, variant in PICKS.items():
        winner_src = GEN_DIR / f"meal-{slug}-{variant}.jpg"
        winner_dst = FINAL_DIR / f"meal-{slug}.jpg"

        if not winner_src.exists():
            # Maybe already moved on a previous run.
            if winner_dst.exists():
                print(f"  [skip-keep] {winner_dst.name} already finalised")
                results.append((slug, winner_dst))
                continue
            print(f"  [MISSING]  {winner_src.name}")
            continue

        if dry_run:
            print(f"  [plan] copy  {winner_src.name}  ->  final/{winner_dst.name}")
        else:
            shutil.copy2(winner_src, winner_dst)
            print(f"  [copy] {winner_src.name}  ->  final/{winner_dst.name}")
        results.append((slug, winner_dst))

        # Delete other variants for this slug (v01..v0N) once winner is in final/
        for other in sorted(GEN_DIR.glob(f"meal-{slug}-v*.jpg")):
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
    """Upload one file to Supabase Storage. Returns the public URL."""
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
# Phase 3 — patch meals.image_url
# ---------------------------------------------------------------------

def fetch_meal_id_by_slug(base_url: str, service_key: str, slug_to_name: dict[str, str]) -> dict[str, str]:
    """Build slug -> meal_id mapping by fetching all meals + matching by name."""
    select = "id,name"
    url = f"{base_url}/rest/v1/meals?" + urlencode({"select": select, "image_url": "is.null"})
    req = Request(url)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Accept", "application/json")
    try:
        with urlopen(req, timeout=30) as r:
            meals = json.loads(r.read())
    except HTTPError as e:
        sys.exit(f"ERROR: meals lookup failed — HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}")

    # Build name->id, then match each known slug
    name_to_id = {m["name"]: m["id"] for m in meals}
    slug_to_id: dict[str, str] = {}
    for slug, name in slug_to_name.items():
        mid = name_to_id.get(name)
        if mid:
            slug_to_id[slug] = mid
        else:
            print(f"  [WARN] slug '{slug}' name '{name}' not found in meals (image_url IS NULL)")
    return slug_to_id


def patch_meal_image_url(base_url: str, service_key: str, meal_id: str, image_url: str, dry_run: bool) -> None:
    url = f"{base_url}/rest/v1/meals?id=eq.{meal_id}"
    if dry_run:
        print(f"  [plan] PATCH meals id={meal_id[:8]}... image_url={image_url[:60]}...")
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
        detail = e.read().decode("utf-8", errors="replace")
        sys.exit(f"ERROR: meals PATCH failed for {meal_id} — HTTP {e.code}: {detail}")
    print(f"  [db]   meals.image_url set for {meal_id[:8]}...")


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Print what would happen, do nothing")
    args = ap.parse_args()

    base_url = env_or_exit("SUPABASE_URL").rstrip("/")
    service_key = env_or_exit("SUPABASE_SERVICE_ROLE_KEY")

    # Load slug -> meal name from the existing manifest (built during generation).
    if not MANIFEST_PATH.exists():
        sys.exit(f"ERROR: {MANIFEST_PATH} not found — run generator first.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    slug_to_name = {entry["slug"]: entry["name"] for entry in manifest["meals"].values()}

    # --- Phase 1: local rename/cleanup
    print("\n=== Phase 1: pick winners ===")
    pairs = apply_picks(dry_run=args.dry_run)

    # --- Phase 2: storage upload
    print("\n=== Phase 2: upload to Supabase Storage ===")
    slug_to_public_url: dict[str, str] = {}
    for slug, path in pairs:
        storage_path = f"{STORAGE_PATH_PREFIX}/{path.name}" if STORAGE_PATH_PREFIX else path.name
        public_url = upload_to_storage(base_url, service_key, path, storage_path, dry_run=args.dry_run)
        slug_to_public_url[slug] = public_url

    # --- Phase 3: patch meals.image_url
    print("\n=== Phase 3: update meals.image_url ===")
    slug_to_id = fetch_meal_id_by_slug(base_url, service_key, slug_to_name)
    for slug, public_url in slug_to_public_url.items():
        meal_id = slug_to_id.get(slug)
        if not meal_id:
            print(f"  [skip] no meal_id for slug {slug} (already linked or not found)")
            continue
        patch_meal_image_url(base_url, service_key, meal_id, public_url, dry_run=args.dry_run)

    print()
    if args.dry_run:
        print("Dry run complete — nothing changed.")
    else:
        print(f"Done. {len(slug_to_public_url)} meal image(s) deployed.")
        print(f"  Local finals:  {FINAL_DIR}")
        print(f"  Storage path:  {BUCKET}/{STORAGE_PATH_PREFIX}/")


if __name__ == "__main__":
    main()
