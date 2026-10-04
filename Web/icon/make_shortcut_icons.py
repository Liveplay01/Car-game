"""The icons of the app shortcuts (long press on the app icon): Daily Shift, Unlimited, Multiplayer.

    python Web/icon/make_shortcut_icons.py

A mint symbol on the game's dark ground, full bleed (Android crops shortcut icons to a circle or a
squircle, so the symbol stays inside the middle 60 %). Drawn at 8x and scaled down, so every edge is
smooth. Writes `Web/public/icons/shortcut-<name>-<size>.png` in 96 and 192 px, the sizes
`manifest.webmanifest` lists. Colours are the game's (`Web/src/present/theme.ts`).
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "icons")

S = 1536  # 8 × 192
BACKGROUND = (20, 24, 29)
ACCENT = (255, 183, 3)
LINE = int(S * 0.055)


def canvas():
    img = Image.new("RGB", (S, S), BACKGROUND)
    return img, ImageDraw.Draw(img)


def daily():
    """A calendar page with today's square filled in."""
    img, d = canvas()
    l, t, r, b = S * 0.27, S * 0.30, S * 0.73, S * 0.72
    d.rounded_rectangle((l, t, r, b), radius=S * 0.06, outline=ACCENT, width=LINE)
    d.line((l, t + S * 0.12, r, t + S * 0.12), fill=ACCENT, width=LINE)
    for x in (S * 0.38, S * 0.62):
        d.line((x, S * 0.24, x, S * 0.34), fill=ACCENT, width=LINE)
    cell = S * 0.085
    d.rounded_rectangle((S * 0.5 + S * 0.02, S * 0.52, S * 0.5 + S * 0.02 + cell, S * 0.52 + cell), radius=S * 0.02, fill=ACCENT)
    return img


def unlimited():
    """An infinity sign: one stroke through both loops, crossing in the middle."""
    import math

    img, d = canvas()
    a = S * 0.27  # half the width of the sign
    r = LINE / 2
    for i in range(2400):
        t = 2 * math.pi * i / 2400
        # Bernoulli's lemniscate, drawn as a dense row of round dots: one smooth stroke.
        k = 1 + math.sin(t) ** 2
        x, y = S * 0.5 + a * math.cos(t) / k, S * 0.5 + a * math.sin(t) * math.cos(t) / k
        d.ellipse((x - r, y - r, x + r, y + r), fill=ACCENT)
    return img


def multiplayer():
    """Two players side by side, the one in front a little larger."""
    img, d = canvas()

    def person(cx, top, scale, width):
        head = S * 0.075 * scale
        body_top = top + 2 * head + S * 0.03 * scale
        body_w = S * 0.15 * scale
        # Filled with the ground first, so the one in front hides the one behind.
        d.chord((cx - body_w - width, body_top - width, cx + body_w + width, body_top + body_w * 1.6 + width), 180, 360, fill=BACKGROUND)
        d.ellipse((cx - head - width, top - width, cx + head + width, top + 2 * head + width), fill=BACKGROUND)
        d.ellipse((cx - head, top, cx + head, top + 2 * head), outline=ACCENT, width=width)
        d.arc((cx - body_w, body_top, cx + body_w, body_top + body_w * 1.6), 180, 360, fill=ACCENT, width=width)

    person(S * 0.60, S * 0.30, 0.82, int(LINE * 0.85))
    person(S * 0.44, S * 0.31, 1.0, LINE)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, draw in (("daily", daily), ("unlimited", unlimited), ("multiplayer", multiplayer)):
        big = draw()
        for size in (96, 192):
            big.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"shortcut-{name}-{size}.png"), optimize=True)
            print(f"shortcut-{name}-{size}.png")


if __name__ == "__main__":
    main()
