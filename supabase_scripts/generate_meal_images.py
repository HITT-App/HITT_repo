#!/usr/bin/env python3
"""
generate_meal_images.py — generate AI food photography for meals that
don't yet have images, via Gemini 3 Pro Image.

Pipeline per meal:
  1. Fetch all meals with image_url IS NULL from Supabase
  2. For each, build a shared-style-anchor prompt + dish-specific subject
  3. Generate N variants per meal at native 1024x1024 square (best for
     BrowseMeals / MealDetail square slots, crops cleanly to landscape)
  4. Save as _generated/meals/meal-<slug>-vNN.jpg
  5. Write _generated/meals/manifest.json mapping meal_id → file(s)

Reads (env vars only):
  SUPABASE_URL                 e.g. https://abcdef.supabase.co
  SUPABASE_SERVICE_ROLE_KEY    server-only key (bypasses RLS)
  GEMINI_API_KEY               for image generation

Usage:
  python supabase_scripts/generate_meal_images.py             # 2 variants/meal
  python supabase_scripts/generate_meal_images.py --variants 4
  python supabase_scripts/generate_meal_images.py --only "Avocado"  # filter by name substring
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from PIL import Image

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai not installed. Run: pip install google-genai pillow", file=sys.stderr)
    sys.exit(1)


MODEL = "gemini-3-pro-image-preview"
OUT_DIR = Path(__file__).resolve().parent.parent / "_generated" / "meals"
MANIFEST_PATH = OUT_DIR / "manifest.json"
TARGET_SIZE = 1024


STYLE_ANCHOR = (
    "Natural home-style food photography. SQUARE 1:1 composition. The dish "
    "is photographed from a slight three-quarter overhead angle on a "
    "PURE WHITE clean surface — true plain white, NO marble veining, "
    "NO wood grain, NO texture, NO patterned tablecloth. Just clean "
    "white. Bright natural daylight, soft shadows, no harsh contrast, "
    "no flash. Crisp focus on the food. "
    "REALISTIC HOME-COOKABLE PLATING — the dish should look like "
    "something a competent home cook actually plated up at home, NOT a "
    "magazine cover, NOT a chef's tasting menu, NOT a food stylist's "
    "showpiece. Approachable, real, appetising. The viewer should look "
    "at it and think 'I could make that'. "
    "Minimal styling: a simple plain white or pale ceramic plate or "
    "bowl, a normal kitchen utensil if any. NO linen napkins, NO gold "
    "cutlery, NO scattered ingredients arranged as decoration around "
    "the dish, NO over-perfect drizzles, NO precision-placed garnish "
    "patterns. Garnish that is naturally part of the recipe is fine. "
    "NO text, NO labels, NO watermarks, NO hands or people in frame, "
    "NO branded packaging, NO menu-card composition. "
    "Colour palette: natural and true to the food. No oversaturation, "
    "no neon, no green-screen tint. The food should look genuinely "
    "cooked and edible — slightly imperfect, like real cooking."
)


SMOOTHIE_VESSEL = (
    "VESSEL — this is a SMOOTHIE. It must be served in a CLEAR GLASS "
    "DRINKING TUMBLER (a regular straight or slightly tapered drinking "
    "glass). NOT a bowl. NOT a ceramic cup or mug. NOT a smoothie bowl. "
    "The liquid is visible through the glass. A normal stainless or "
    "wooden straw is OK but optional. Any garnish sits on the rim or "
    "floats minimally on top — no excessive layering."
)

# Brief dietary hints — added when meal's cuisine_type matches
CUISINE_HINTS = {
    "vegan": "NO animal products visible — no eggs, no dairy, no meat, no honey.",
    "vegetarian": "NO meat or fish visible (dairy and eggs are fine).",
    "keto": "Low-carb composition — no rice, no bread, no pasta, no potatoes; emphasise protein and healthy fats.",
    "paleo": "Whole-food composition — no grains, no legumes, no processed sugar.",
}


def env_or_exit(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        print(f"ERROR: env var {name} is not set.", file=sys.stderr)
        sys.exit(1)
    return v


def fetch_missing_meals(base_url: str, service_key: str, name_filter: str | None) -> list[dict]:
    select = ",".join(["id", "name", "description", "category", "cuisine_type", "image_url"])
    # PostgREST: image_url=is.null
    params = {"select": select, "image_url": "is.null", "order": "category.asc,name.asc"}
    url = base_url.rstrip("/") + "/rest/v1/meals?" + urlencode(params)
    req = Request(url)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Accept", "application/json")
    try:
        with urlopen(req, timeout=30) as r:
            meals = json.loads(r.read())
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        print(f"ERROR: HTTP {e.code} from Supabase — {detail}", file=sys.stderr)
        sys.exit(1)
    if name_filter:
        nf = name_filter.lower()
        meals = [m for m in meals if nf in (m.get("name") or "").lower()]
    return meals


def slugify(name: str) -> str:
    """Lowercase, strip non-alphanumerics, dash-separated."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def build_prompt(meal: dict) -> str:
    name = meal.get("name", "").strip()
    description = (meal.get("description") or "").strip()
    cuisine = (meal.get("cuisine_type") or "").strip().lower()
    category = (meal.get("category") or "").strip().lower()
    is_smoothie = "smoothie" in name.lower()

    parts = [STYLE_ANCHOR, ""]
    if is_smoothie:
        parts.append(SMOOTHIE_VESSEL)
        parts.append("")
    parts.append(f"THE DISH: {name}.")
    if description:
        parts.append(f"DESCRIPTION: {description}")
    if category:
        parts.append(f"This is a {category} dish.")
    hint = CUISINE_HINTS.get(cuisine)
    if hint:
        parts.append(f"DIETARY CONTEXT: {cuisine} — {hint}")
    return "\n".join(parts)


def call_gemini(client, prompt: str) -> bytes:
    response = client.models.generate_content(
        model=MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for cand in response.candidates or []:
        for part in (cand.content.parts if cand.content else []) or []:
            if getattr(part, "inline_data", None) and part.inline_data.data:
                return part.inline_data.data
    raise RuntimeError("Gemini returned no image data — check safety filters or quota")


def fit_to_square(png_bytes: bytes, side: int = TARGET_SIZE) -> Image.Image:
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    src_ratio = img.width / img.height
    if src_ratio > 1.0:
        new_h = side
        new_w = int(side * src_ratio)
    else:
        new_w = side
        new_h = int(side / src_ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - side) // 2
    top = (new_h - side) // 2
    return img.crop((left, top, left + side, top + side))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", type=int, default=2, help="Variants per meal (default 2)")
    ap.add_argument("--start-variant", type=int, default=1,
                    help="First variant number (default 1). Use higher number to preserve earlier variants on re-runs.")
    ap.add_argument("--only", help="Filter meals by name substring (case-insensitive)")
    args = ap.parse_args()

    base_url = env_or_exit("SUPABASE_URL")
    service_key = env_or_exit("SUPABASE_SERVICE_ROLE_KEY")
    gemini_key = env_or_exit("GEMINI_API_KEY")

    meals = fetch_missing_meals(base_url, service_key, args.only)
    if not meals:
        print("No meals matching filter (or all have images already).")
        return

    print(f"Found {len(meals)} meal(s) without images.", file=sys.stderr)
    for m in meals:
        print(f"  - [{m.get('category', '?')}] {m.get('name', '?')}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=gemini_key)

    # Load existing manifest if present (so re-runs add, don't replace)
    manifest: dict = {"meals": {}}
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    if "meals" not in manifest:
        manifest["meals"] = {}

    total = len(meals) * args.variants
    counter = 0
    for meal in meals:
        meal_id = meal["id"]
        name = meal["name"]
        slug = slugify(name)
        prompt = build_prompt(meal)

        entry = manifest["meals"].setdefault(meal_id, {
            "name": name,
            "slug": slug,
            "category": meal.get("category"),
            "cuisine_type": meal.get("cuisine_type"),
            "variants": [],
        })

        for v in range(args.start_variant, args.start_variant + args.variants):
            counter += 1
            filename = f"meal-{slug}-v{v:02d}.jpg"
            out_path = OUT_DIR / filename
            print(f"[{counter}/{total}] {filename}...", file=sys.stderr)
            try:
                png = call_gemini(client, prompt)
            except Exception as e:
                print(f"    FAILED: {e}", file=sys.stderr)
                continue

            img = fit_to_square(png)
            img.save(out_path, format="JPEG", quality=90, optimize=True)
            size_kb = out_path.stat().st_size // 1024
            print(f"    wrote {filename} ({size_kb} KB)", file=sys.stderr)

            # Update manifest entry (de-duplicated)
            if filename not in entry["variants"]:
                entry["variants"].append(filename)

    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nWrote {sum(len(e['variants']) for e in manifest['meals'].values())} image(s)", file=sys.stderr)
    print(f"  Files:    {OUT_DIR}", file=sys.stderr)
    print(f"  Manifest: {MANIFEST_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
