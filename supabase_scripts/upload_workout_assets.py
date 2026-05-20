#!/usr/bin/env python3
"""
Upload workout video and still files to Supabase Storage.

Usage:
  SUPABASE_URL=https://iglwpwdnwztutbaybhfq.supabase.co \\
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \\
  WORKOUT_ASSETS_ROOT="C:/Users/VanessaLatchem-Smith/OneDrive - Fields Group Ltd/Vanessa/HITT/hitt-app" \\
  python3 supabase_scripts/upload_workout_assets.py

Walks the WeTransfer workout folders under WORKOUT_ASSETS_ROOT, uploads each .mp4 and
.png into the `app-assets` bucket under `workouts/<folder-slug>/<filename>`, and writes
a manifest to supabase_scripts/_upload_manifest.json.

Idempotent: re-running skips files already in the manifest with matching local size.
The Supabase API is called with x-upsert: true so partial runs are safe to resume.
"""

import json
import mimetypes
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ASSETS_ROOT = os.environ.get("WORKOUT_ASSETS_ROOT", "")
BUCKET = os.environ.get("WORKOUT_BUCKET", "app-assets")
PATH_PREFIX = os.environ.get("WORKOUT_PATH_PREFIX", "workouts")

if not (SUPABASE_URL and SERVICE_KEY and ASSETS_ROOT):
    sys.exit(
        "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and WORKOUT_ASSETS_ROOT env vars."
    )

# Only these top-level transfer folders contain workouts (skip recipes)
WORKOUT_TRANSFER_FOLDERS = {
    "wetransfer_core-hiit-blast_2026-05-19_1253",
    "wetransfer_full-body-flow_2026-05-19_1254",
    "wetransfer_rowing-workout_2026-05-19_1254",
    "wetransfer_untitled-transfer_2026-05-19_1253",
}

MANIFEST_PATH = Path(__file__).parent / "_upload_manifest.json"


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[()\[\]]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"[^a-z0-9.-]", "", s)
    return s.strip("-")


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {
        "bucket": BUCKET,
        "public_url_base": f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/",
        "assets": {},
    }


def save_manifest(m: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(m, indent=2), encoding="utf-8")


def upload(local_path: Path, storage_path: str) -> None:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(storage_path)}"
    mime = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    with open(local_path, "rb") as f:
        body = f.read()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": mime,
            "x-upsert": "true",
            "Cache-Control": "public, max-age=31536000",
        },
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        if resp.status not in (200, 201):
            raise RuntimeError(f"Upload failed {resp.status} for {storage_path}")


def collect_assets(root: Path):
    """Yield (local_path, folder_name, kind) tuples. kind is 'video' or 'still'."""
    for transfer in sorted(root.iterdir()):
        if transfer.name not in WORKOUT_TRANSFER_FOLDERS:
            continue
        if not transfer.is_dir():
            continue
        for workout_dir in sorted(transfer.iterdir()):
            if not workout_dir.is_dir():
                continue
            folder = workout_dir.name
            # Videos: usually in videos/, but Steady Run uses video/
            for sub in ("videos", "video"):
                vdir = workout_dir / sub
                if vdir.is_dir():
                    for f in sorted(vdir.glob("*.mp4")):
                        yield f, folder, "video"
            # Stills: usually in stills/, but Rowing Workout / Steady Run have them in folder root
            sdir = workout_dir / "stills"
            if sdir.is_dir():
                for f in sorted(sdir.glob("*.png")):
                    yield f, folder, "still"
            else:
                for f in sorted(workout_dir.glob("*.png")):
                    yield f, folder, "still"


def main() -> int:
    root = Path(ASSETS_ROOT)
    if not root.is_dir():
        sys.exit(f"WORKOUT_ASSETS_ROOT not a directory: {root}")

    manifest = load_manifest()
    assets = manifest["assets"]

    uploaded = skipped = failed = 0
    for local, folder, kind in collect_assets(root):
        key = f"{folder}/{local.name}"
        slug = slugify(folder)
        storage_path = f"{PATH_PREFIX}/{slug}/{local.name}"
        existing = assets.get(key)
        size = local.stat().st_size
        if existing and existing.get("size") == size:
            skipped += 1
            continue
        try:
            print(f"-> {key} ({size:,} bytes)", file=sys.stderr, flush=True)
            upload(local, storage_path)
            assets[key] = {
                "size": size,
                "kind": kind,
                "storage_path": storage_path,
                "public_url": manifest["public_url_base"] + urllib.parse.quote(storage_path),
            }
            uploaded += 1
            # Save after each upload so a crash doesn't lose progress
            save_manifest(manifest)
        except Exception as e:
            print(f"   FAILED: {e}", file=sys.stderr, flush=True)
            failed += 1

    save_manifest(manifest)
    print(
        f"\nUploaded: {uploaded} | Skipped (unchanged): {skipped} | Failed: {failed}",
        file=sys.stderr,
    )
    print(f"Manifest: {MANIFEST_PATH}", file=sys.stderr)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
