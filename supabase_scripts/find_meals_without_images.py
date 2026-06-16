#!/usr/bin/env python3
"""
find_meals_without_images.py — list meals with no image_url in Supabase.

Reads (env vars only — never written to disk):
  SUPABASE_URL                  e.g. https://abcdef.supabase.co
  SUPABASE_SERVICE_ROLE_KEY     server-only key (NOT the anon/publishable key)

Outputs to stdout:
  - Headline counts (with / without image / total)
  - Per-category breakdown
  - Full list of meals missing an image
  - Optionally writes a CSV of the missing list with --csv path

Usage:
  python supabase_scripts/find_meals_without_images.py
  python supabase_scripts/find_meals_without_images.py --csv meals_missing_images.csv

Setup (one-off, in your shell session):
  PowerShell:  $env:SUPABASE_URL='https://...supabase.co'
               $env:SUPABASE_SERVICE_ROLE_KEY='eyJ...'
  bash:        export SUPABASE_URL=https://...supabase.co
               export SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PAGE_SIZE = 1000   # PostgREST default cap; we paginate above this


def env_or_exit(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"ERROR: env var {name} is not set.", file=sys.stderr)
        print(
            f"  Set it before running: export {name}=... (bash) "
            f"or $env:{name}='...' (PowerShell)",
            file=sys.stderr,
        )
        sys.exit(1)
    return value


def fetch_all_meals(base_url: str, service_key: str) -> list[dict]:
    """Fetch every meal via PostgREST, paginating if necessary."""
    endpoint = base_url.rstrip("/") + "/rest/v1/meals"
    select = ",".join([
        "id", "name", "category", "cuisine_type", "description",
        "image_url", "is_featured", "created_at",
    ])
    query = urlencode({"select": select, "order": "category.asc,name.asc"})
    url = f"{endpoint}?{query}"

    out: list[dict] = []
    offset = 0
    while True:
        req = Request(url)
        req.add_header("apikey", service_key)
        req.add_header("Authorization", f"Bearer {service_key}")
        req.add_header("Accept", "application/json")
        # PostgREST range pagination: 0-999, 1000-1999, ...
        req.add_header("Range-Unit", "items")
        req.add_header("Range", f"{offset}-{offset + PAGE_SIZE - 1}")

        try:
            with urlopen(req, timeout=30) as r:
                body = r.read()
                content_range = r.headers.get("Content-Range", "")
        except HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            print(f"ERROR: HTTP {e.code} from Supabase — {detail}", file=sys.stderr)
            sys.exit(1)
        except URLError as e:
            print(f"ERROR: could not reach {base_url} — {e}", file=sys.stderr)
            sys.exit(1)

        page = json.loads(body)
        out.extend(page)

        # content-range looks like "0-49/200" → stop when we've seen everything
        if "/" in content_range:
            total_str = content_range.split("/", 1)[1]
            if total_str.isdigit() and len(out) >= int(total_str):
                break
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return out


def is_missing_image(meal: dict) -> bool:
    url = meal.get("image_url")
    return url is None or (isinstance(url, str) and url.strip() == "")


def print_summary(meals: list[dict]) -> None:
    total = len(meals)
    missing = [m for m in meals if is_missing_image(m)]
    n_missing = len(missing)
    n_with = total - n_missing

    print()
    print("=" * 64)
    print("MEALS - IMAGE COVERAGE")
    print("=" * 64)
    print(f"  with image:    {n_with:>5}")
    print(f"  without image: {n_missing:>5}")
    print(f"  total:         {total:>5}")
    if total:
        print(f"  missing pct:   {100 * n_missing / total:>5.1f}%")

    # Per-category breakdown
    cat_total = Counter(m.get("category") or "(uncategorised)" for m in meals)
    cat_missing = Counter(
        (m.get("category") or "(uncategorised)") for m in missing
    )
    print()
    print("-" * 64)
    print(f"  {'category':<22} {'missing':>8} {'total':>7} {'pct':>7}")
    print("-" * 64)
    for cat in sorted(cat_total, key=lambda c: (-cat_missing[c], c)):
        tot = cat_total[cat]
        miss = cat_missing[cat]
        pct = 100 * miss / tot if tot else 0
        print(f"  {cat:<22} {miss:>8} {tot:>7} {pct:>6.1f}%")
    print()


def print_missing_list(meals: list[dict]) -> None:
    missing = [m for m in meals if is_missing_image(m)]
    if not missing:
        print("All meals have images.  ✓")
        return
    print("-" * 64)
    print("MEALS MISSING AN IMAGE")
    print("-" * 64)
    print(f"  {'category':<12} {'name':<42} {'cuisine':<14}")
    print("-" * 64)
    for m in missing:
        cat = (m.get("category") or "?")[:12]
        name = (m.get("name") or "?")[:42]
        cuisine = (m.get("cuisine_type") or "")[:14]
        feat = " [featured]" if m.get("is_featured") else ""
        print(f"  {cat:<12} {name:<42} {cuisine:<14}{feat}")
    print()


def write_csv(meals: list[dict], path: str) -> None:
    missing = [m for m in meals if is_missing_image(m)]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "id", "name", "category", "cuisine_type",
            "is_featured", "description", "created_at",
        ])
        for m in missing:
            w.writerow([
                m.get("id", ""),
                m.get("name", ""),
                m.get("category", ""),
                m.get("cuisine_type", ""),
                "yes" if m.get("is_featured") else "no",
                (m.get("description") or "").replace("\n", " "),
                m.get("created_at", ""),
            ])
    print(f"Wrote {len(missing)} rows to {path}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--csv",
        metavar="PATH",
        help="Also write the missing-image list to a CSV file",
    )
    ap.add_argument(
        "--quiet-list",
        action="store_true",
        help="Skip printing the per-meal list (just show counts)",
    )
    args = ap.parse_args()

    base_url = env_or_exit("SUPABASE_URL")
    service_key = env_or_exit("SUPABASE_SERVICE_ROLE_KEY")

    print(f"Fetching meals from {base_url} ...", file=sys.stderr)
    meals = fetch_all_meals(base_url, service_key)
    print(f"Fetched {len(meals)} meal(s).", file=sys.stderr)

    print_summary(meals)
    if not args.quiet_list:
        print_missing_list(meals)
    if args.csv:
        write_csv(meals, args.csv)


if __name__ == "__main__":
    main()
