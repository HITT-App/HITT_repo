#!/usr/bin/env python3
"""
Regenerate the Android launcher icons from the HITT app icon.

WHY: Google Play rejected the listing because "the capacitor logo was loading first
and did not match the name of the app". The splash was one half of that — the other
half is that all 15 launcher icons were still the stock Capacitor blue "X", and the
adaptive-icon background was white. An app called "HIIT Fitness" was shipping with a
Capacitor logo on the home screen.

Produces three sets, matching the sizes already in the project:
  ic_launcher_foreground.png  adaptive foreground — transparent, mark inside the safe zone
  ic_launcher.png             legacy square — mark on the brand background
  ic_launcher_round.png       legacy round — same, circular for pre-Oreo launchers

ADAPTIVE ICON SAFE ZONE: the foreground is 108x108dp but launchers may mask away
everything outside the centre 72x72dp (66%). Anything larger risks being clipped into
a different shape on different devices, so the mark is kept well inside that.

Run:  python3 scripts/gen-android-icons.py
Idempotent — safe to re-run after the icon changes.
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
RES = ROOT / "android/app/src/main/res"

BG = (10, 10, 10, 255)  # #0a0a0a — matches the splash and the app background

# Fraction of the canvas the mark occupies.
FG_FRACTION = 0.52   # adaptive foreground — well inside the 66% safe zone
LEGACY_FRACTION = 0.64  # legacy icons have no mask, so the mark can sit larger

# density -> (foreground px, legacy px). Taken from the files being replaced.
DENSITIES = {
    "mdpi":    (108, 48),
    "hdpi":    (162, 72),
    "xhdpi":   (216, 96),
    "xxhdpi":  (324, 144),
    "xxxhdpi": (432, 192),
}


def extract_mark(icon_path: Path) -> Image.Image:
    """Lift the orange mark off the icon's solid-black background (see gen-splash.py)."""
    icon = Image.open(icon_path).convert("RGBA")
    px = icon.load()
    w, h = icon.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < 34 and g < 34 and b < 34:
                px[x, y] = (r, g, b, 0)
    return icon.crop(icon.getbbox())


def place(mark: Image.Image, canvas: Image.Image, fraction: float) -> Image.Image:
    w, h = canvas.size
    target = int(min(w, h) * fraction)
    scale = target / max(mark.width, mark.height)
    m = mark.resize(
        (max(1, int(mark.width * scale)), max(1, int(mark.height * scale))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(m, ((w - m.width) // 2, (h - m.height) // 2))
    return canvas


def main() -> None:
    if not ICON.exists():
        raise SystemExit(f"App icon not found: {ICON}")
    mark = extract_mark(ICON)
    written = 0

    for density, (fg_px, legacy_px) in DENSITIES.items():
        d = RES / f"mipmap-{density}"
        if not d.exists():
            print(f"  skip (no dir): {d.name}")
            continue

        # Adaptive foreground — transparent; the background comes from the XML colour.
        fg = place(mark, Image.new("RGBA", (fg_px, fg_px), (0, 0, 0, 0)), FG_FRACTION)
        fg.save(d / "ic_launcher_foreground.png", "PNG", optimize=True)

        # Legacy square.
        sq = place(mark, Image.new("RGBA", (legacy_px, legacy_px), BG), LEGACY_FRACTION)
        sq.convert("RGB").save(d / "ic_launcher.png", "PNG", optimize=True)

        # Legacy round — pre-Oreo launchers use this as-is, so mask it here.
        rnd = Image.new("RGBA", (legacy_px, legacy_px), (0, 0, 0, 0))
        circle = Image.new("RGBA", (legacy_px, legacy_px), BG)
        mask = Image.new("L", (legacy_px, legacy_px), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, legacy_px - 1, legacy_px - 1), fill=255)
        rnd.paste(circle, (0, 0), mask)
        rnd = place(mark, rnd, LEGACY_FRACTION)
        rnd.save(d / "ic_launcher_round.png", "PNG", optimize=True)

        print(f"  {density:<8} foreground {fg_px}px, legacy {legacy_px}px")
        written += 3

    print(f"\n{written} icon files written.")
    print("Remember: ic_launcher_background colour must be the brand dark, not white.")


if __name__ == "__main__":
    main()
