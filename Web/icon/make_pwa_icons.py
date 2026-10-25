"""The PWA icons from the master `Web/icon/AppIcon.png`:

    python Web/icon/make_pwa_icons.py

Writes `Web/public/icons/`: icon-192, icon-512 and favicon-32 with rounded corners, apple-touch-icon (180)
and the maskable icon-512 full bleed. The master is full bleed and its roundabout sits inside the middle 80 %, so the maskable
icon is the master itself and a round or squircle mask never cuts the cars.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'icons')

master = Image.open(os.path.join(HERE, 'AppIcon.png')).convert('RGB')


def save(name: str, size: int, rounded: bool = False) -> None:
    icon = master.resize((size, size), Image.LANCZOS)
    if rounded:
        # Corners drawn at 4x and scaled down, so the edge is smooth; the radius is iOS's 22.37 %.
        mask = Image.new('L', (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), size * 4 * 0.2237, fill=255)
        icon = icon.convert('RGBA')
        icon.putalpha(mask.resize((size, size), Image.LANCZOS))
    icon.save(os.path.join(OUT, f'{name}.png'), optimize=True)


# Rounded where the icon is shown as it is (tab, notification, Settings, "any" in the manifest). The
# stores and home screens press the icon into their own shape and need it full bleed, so apple-touch
# and maskable stay square.
save('icon-192-v2', 192, rounded=True)
save('icon-512-v2', 512, rounded=True)
save('favicon-32-v2', 32, rounded=True)
save('apple-touch-icon-v2', 180)
save('icon-maskable-512-v2', 512)
print('PWA icons written')
