#!/usr/bin/env python3
"""
generate_recipe_images.py — companion to generate_meal_images.py, but for
the `recipes` table. Matches the existing storage convention used by the
23 recipes that already have images:

  - Bucket:      meal-images
  - Subpath:     recipes/
  - Filename:    <slug>.png        (no "meal-" prefix, .png extension)
  - Slug:        lowercase, & -> and, spaces -> -, non-alnum stripped

Generates N variants per missing recipe as <slug>-vNN.png in
_generated/recipes/. Adds smoothie-bowl detection so 'Green Smoothie BOWL'
correctly stays as a bowl rather than being rendered in a glass.

Reads env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY.

Usage:
  python supabase_scripts/generate_recipe_images.py             # 2 variants/recipe
  python supabase_scripts/generate_recipe_images.py --variants 4
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
    print("ERROR: google-genai not installed.", file=sys.stderr)
    sys.exit(1)


MODEL = "gemini-3-pro-image-preview"
OUT_DIR = Path(__file__).resolve().parent.parent / "_generated" / "recipes"
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


JAR_GLASS_VESSEL = (
    "VESSEL — this dish is served in a CLEAR GLASS or MASON JAR, NOT in "
    "a bowl, NOT in a ceramic cup. The contents must be clearly visible "
    "THROUGH the glass — layers, textures, ingredients showing through. "
    "Toppings (granola, seeds, fruit slices, nut butter swirl, etc.) sit "
    "at the rim of the jar on top of the visible contents. "
    "For OVERNIGHT OATS: a wide-mouth mason jar is iconic — the layered "
    "oats, milk, and toppings should be visible through the glass. "
    "For SMOOTHIES (including thick smoothie-bowl style served as a "
    "drink): a tall clear drinking glass or tall jar; a stainless or "
    "wooden straw is optional. The dish should still look appetising and "
    "home-cookable."
)


def env_or_exit(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        sys.exit(f"ERROR: env var {name} is not set.")
    return v


def fetch_missing_recipes(base_url: str, service_key: str) -> list[dict]:
    select = ",".join(["id", "name", "description", "meal_type", "category", "image_url"])
    params = {"select": select, "image_url": "is.null", "order": "meal_type.asc,name.asc"}
    url = base_url.rstrip("/") + "/rest/v1/recipes?" + urlencode(params)
    req = Request(url)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    req.add_header("Accept", "application/json")
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except HTTPError as e:
        sys.exit(f"ERROR: HTTP {e.code} from Supabase — {e.read().decode('utf-8', 'replace')}")


def slugify(name: str) -> str:
    """Match the existing recipes convention: & -> and, lowercase-kebab-case."""
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def is_glass_or_jar(name: str) -> bool:
    """True if the dish should be served in a clear glass/jar rather than a bowl.

    Covers all smoothies (drink or 'smoothie bowl' — both go in a glass) and
    overnight oats (classic mason-jar dish)."""
    n = name.lower()
    return "smoothie" in n or "overnight" in n


def build_prompt(recipe: dict) -> str:
    name = recipe.get("name", "").strip()
    description = (recipe.get("description") or "").strip()
    meal_type = (recipe.get("meal_type") or "").strip().lower()

    parts = [STYLE_ANCHOR, ""]
    if is_glass_or_jar(name):
        parts.append(JAR_GLASS_VESSEL)
        parts.append("")
    parts.append(f"THE DISH: {name}.")
    if description:
        parts.append(f"DESCRIPTION: {description}")
    if meal_type:
        parts.append(f"This is a {meal_type} dish.")
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
    ap.add_argument("--variants", type=int, default=2)
    ap.add_argument("--start-variant", type=int, default=1)
    ap.add_argument("--only", help="Filter recipes by name substring (case-insensitive)")
    args = ap.parse_args()

    base_url = env_or_exit("SUPABASE_URL")
    service_key = env_or_exit("SUPABASE_SERVICE_ROLE_KEY")
    gemini_key = env_or_exit("GEMINI_API_KEY")

    recipes = fetch_missing_recipes(base_url, service_key)
    if args.only:
        nf = args.only.lower()
        recipes = [r for r in recipes if nf in (r.get("name") or "").lower()]
    if not recipes:
        print("No recipes matching filter (or all have images already).")
        return

    print(f"Found {len(recipes)} recipe(s) without images.", file=sys.stderr)
    for r in recipes:
        print(f"  - [{r.get('meal_type','?')}/{r.get('category','?')}] {r.get('name','?')}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=gemini_key)

    manifest: dict = {"recipes": {}}
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    if "recipes" not in manifest:
        manifest["recipes"] = {}

    total = len(recipes) * args.variants
    counter = 0
    for recipe in recipes:
        rid = recipe["id"]
        name = recipe["name"]
        slug = slugify(name)
        prompt = build_prompt(recipe)

        entry = manifest["recipes"].setdefault(rid, {
            "name": name,
            "slug": slug,
            "meal_type": recipe.get("meal_type"),
            "category": recipe.get("category"),
            "variants": [],
        })

        for v in range(args.start_variant, args.start_variant + args.variants):
            counter += 1
            filename = f"{slug}-v{v:02d}.png"
            out_path = OUT_DIR / filename
            print(f"[{counter}/{total}] {filename}...", file=sys.stderr)
            try:
                png = call_gemini(client, prompt)
            except Exception as e:
                print(f"    FAILED: {e}", file=sys.stderr)
                continue

            img = fit_to_square(png)
            img.save(out_path, format="PNG", optimize=True)
            size_kb = out_path.stat().st_size // 1024
            print(f"    wrote {filename} ({size_kb} KB)", file=sys.stderr)

            if filename not in entry["variants"]:
                entry["variants"].append(filename)

    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nWrote {sum(len(e['variants']) for e in manifest['recipes'].values())} image(s)", file=sys.stderr)
    print(f"  Files:    {OUT_DIR}", file=sys.stderr)
    print(f"  Manifest: {MANIFEST_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
