#!/usr/bin/env python3
"""
Regenerate the native launch splash images from the HITT app icon.

WHY: iOS and Android both shipped with the stock Capacitor splash — a blue "X" on
white — so the app opened on someone else's logo before reaching its own dark
branded splash. The iOS LaunchScreen.storyboard also used systemBackgroundColor,
which is white in light mode, so the very first frame flashed white in a dark app.

This composites the orange HITT mark (lifted off the app icon, whose background is
solid black) onto the app's #0a0a0a background at each required size.

Run:  python3 scripts/gen-splash.py
Idempotent — safe to re-run after the icon changes.
"""
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

# Matches capacitor.config.ts SplashScreen.backgroundColor and the app's own splash.
BG = (10, 10, 10, 255)  # #0a0a0a

# Fraction of the SHORTER canvas edge the mark should occupy. Keeps the logo a
# sensible size on both a 320px-wide mdpi phone and a 2732px iPad canvas.
MARK_FRACTION = 0.34

TARGETS = [
    # iOS — all three scale slots use the same 2732x2732 art (universal splash).
    ("ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png", 2732, 2732),
    ("ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png", 2732, 2732),
    ("ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png", 2732, 2732),
    # Android — sizes preserved exactly from the files being replaced.
    ("android/app/src/main/res/drawable/splash.png", 480, 320),
    ("android/app/src/main/res/drawable-land-mdpi/splash.png", 480, 320),
    ("android/app/src/main/res/drawable-land-hdpi/splash.png", 800, 480),
    ("android/app/src/main/res/drawable-land-xhdpi/splash.png", 1280, 720),
    ("android/app/src/main/res/drawable-land-xxhdpi/splash.png", 1600, 960),
    ("android/app/src/main/res/drawable-land-xxxhdpi/splash.png", 1920, 1280),
    ("android/app/src/main/res/drawable-port-mdpi/splash.png", 320, 480),
    ("android/app/src/main/res/drawable-port-hdpi/splash.png", 480, 800),
    ("android/app/src/main/res/drawable-port-xhdpi/splash.png", 720, 1280),
    ("android/app/src/main/res/drawable-port-xxhdpi/splash.png", 960, 1600),
    ("android/app/src/main/res/drawable-port-xxxhdpi/splash.png", 1280, 1920),
]


def extract_mark(icon_path: Path) -> Image.Image:
    """
    Lift the orange mark off the icon's solid-black background.

    Pasting the icon as an opaque square would leave a visible seam, because the
    icon background is #000000 and the splash canvas is #0a0a0a. Keying out the
    near-black pixels gives a transparent mark that composites cleanly instead.
    """
    icon = Image.open(icon_path).convert("RGBA")
    px = icon.load()
    w, h = icon.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Near-black -> transparent. The mark is saturated orange, so a low
            # luminance cutoff separates them without eating the mark's edges.
            if r < 34 and g < 34 and b < 34:
                px[x, y] = (r, g, b, 0)
    return icon.crop(icon.getbbox())


def main() -> None:
    if not ICON.exists():
        raise SystemExit(f"App icon not found: {ICON}")

    mark = extract_mark(ICON)
    written = 0

    for rel, w, h in TARGETS:
        out = ROOT / rel
        if not out.parent.exists():
            print(f"  skip (no dir): {rel}")
            continue

        canvas = Image.new("RGBA", (w, h), BG)
        target = int(min(w, h) * MARK_FRACTION)
        scale = target / max(mark.width, mark.height)
        m = mark.resize(
            (max(1, int(mark.width * scale)), max(1, int(mark.height * scale))),
            Image.LANCZOS,
        )
        canvas.alpha_composite(m, ((w - m.width) // 2, (h - m.height) // 2))
        canvas.convert("RGB").save(out, "PNG", optimize=True)
        print(f"  {w:>5}x{h:<5}  {rel}")
        written += 1

    print(f"\n{written} splash images written.")


if __name__ == "__main__":
    main()
