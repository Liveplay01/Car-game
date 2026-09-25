"""The app icon (ROADMAP.md M11): a roundabout from above at night, three cars on the ring
and the player's car — in the game's mint accent — merging from the bottom into a gap.

    python Assets/Icon/make_icon.py

Drawn at 4096 px and scaled down, so every edge is smooth. Writes `Assets/Icon/AppIcon.png`
(1024 px, no transparency, iOS rounds the corners) and the same file into the app's asset
catalog. Colours are the game's (`Theme.swift`).
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

S = 4096
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

BACKGROUND_TOP = (24, 29, 37)
BACKGROUND_BOTTOM = (9, 11, 14)
ASPHALT = (43, 49, 58)
KERB = (27, 32, 40)
ISLAND = (18, 21, 25)
MARKING = (69, 76, 86)
ACCENT = (158, 230, 207)
GLASS = (43, 49, 57)
CARS = [(227, 230, 234), (191, 198, 207), (201, 188, 168)]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def car(color, length, width, glass=GLASS):
    """A car from above, pointing right, on its own transparent tile."""
    pad = int(width * 0.8)
    tile = Image.new("RGBA", (length + 2 * pad, width + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    r = int(width * 0.28)
    # Shadow first, soft, then the body, the windscreen and the rear window.
    shadow = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad + 20, pad + 40, pad + length + 20, pad + width + 40), r, fill=(0, 0, 0, 150))
    tile = Image.alpha_composite(tile, shadow.filter(ImageFilter.GaussianBlur(width * 0.18)))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle((pad, pad, pad + length, pad + width), r, fill=color + (255,))
    ws = (pad + int(length * 0.52), pad + int(width * 0.14), pad + int(length * 0.74), pad + int(width * 0.86))
    d.rounded_rectangle(ws, int(width * 0.12), fill=glass + (255,))
    rw = (pad + int(length * 0.12), pad + int(width * 0.18), pad + int(length * 0.25), pad + int(width * 0.82))
    d.rounded_rectangle(rw, int(width * 0.1), fill=glass + (255,))
    return tile


def place(canvas, tile, center, heading_deg):
    rotated = tile.rotate(heading_deg, resample=Image.BICUBIC, expand=True)
    x = int(center[0] - rotated.width / 2)
    y = int(center[1] - rotated.height / 2)
    canvas.alpha_composite(rotated, (x, y))


def main():
    img = Image.new("RGBA", (S, S))
    px = ImageDraw.Draw(img)
    # Night: a vertical gradient, then a faint mint glow where the player merges.
    for y in range(S):
        px.line((0, y, S, y), fill=lerp(BACKGROUND_TOP, BACKGROUND_BOTTOM, y / S) + (255,))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((S * 0.2, S * 0.45, S * 0.8, S * 1.05), fill=ACCENT + (46,))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(S * 0.09)))

    c = (S / 2, S * 0.45)
    ring = S * 0.31
    lane = S * 0.17
    d = ImageDraw.Draw(img)
    # The arm from the bottom, then the ring over it: kerb, asphalt, island.
    arm = lane * 1.02
    d.rectangle((c[0] - arm / 2 - 26, c[1], c[0] + arm / 2 + 26, S), fill=KERB)
    d.rectangle((c[0] - arm / 2, c[1], c[0] + arm / 2, S), fill=ASPHALT)
    outer = ring + lane / 2
    inner = ring - lane / 2
    d.ellipse((c[0] - outer - 26, c[1] - outer - 26, c[0] + outer + 26, c[1] + outer + 26), fill=KERB)
    d.ellipse((c[0] - outer, c[1] - outer, c[0] + outer, c[1] + outer), fill=ASPHALT)
    d.ellipse((c[0] - inner - 30, c[1] - inner - 30, c[0] + inner + 30, c[1] + inner + 30), fill=KERB)
    d.ellipse((c[0] - inner, c[1] - inner, c[0] + inner, c[1] + inner), fill=ISLAND)
    # A thin ring on the island, like in the game.
    m = inner * 0.8
    d.ellipse((c[0] - m, c[1] - m, c[0] + m, c[1] + m), outline=MARKING, width=14)

    length, width = int(S * 0.15), int(S * 0.078)

    def on_ring(angle):
        a = math.radians(angle)
        return (c[0] + ring * math.cos(a), c[1] - ring * math.sin(a))

    # Traffic drives counter-clockwise: along the bottom of the ring, to the right. Three
    # cars leave a clear gap at the bottom right, and the player's car slips into it.
    merge_angle = 298
    head = on_ring(merge_angle)
    heading = merge_angle + 90
    rear = (head[0] - math.cos(math.radians(heading)) * length * 0.55, head[1] + math.sin(math.radians(heading)) * length * 0.55)

    # Its path: straight up the arm, then curving onto the ring, in the accent, dashed and
    # fading in towards the car.
    trail = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    td = ImageDraw.Draw(trail)
    start = (c[0], S * 1.02)
    control = (c[0], c[1] + ring * 1.02)
    points = []
    for i in range(44):
        t = i / 43
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t * t * rear[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t * t * rear[1]
        points.append((x, y))
    for i in range(0, len(points) - 1, 2):
        alpha = int(40 + 170 * i / len(points))
        td.line(points[i:i + 2], fill=ACCENT + (alpha,), width=38)
    img = Image.alpha_composite(img, trail)

    for (angle, color) in zip([28, 148, 222], CARS):
        place(img, car(color, length, width), on_ring(angle), angle + 90)
    place(img, car(ACCENT, length, width, glass=(30, 60, 52)), head, heading)

    out = img.convert("RGB").resize((1024, 1024), Image.LANCZOS)
    out.save(os.path.join(HERE, "AppIcon.png"))
    catalog = os.path.join(ROOT, "App.swiftpm", "Assets.xcassets", "AppIcon.appiconset")
    os.makedirs(catalog, exist_ok=True)
    out.save(os.path.join(catalog, "AppIcon.png"))
    print("AppIcon.png written")


if __name__ == "__main__":
    main()
