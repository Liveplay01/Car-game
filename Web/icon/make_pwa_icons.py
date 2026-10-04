"""The PWA icons from the master `Web/icon/AppIcon.png`:

    python Web/icon/make_pwa_icons.py

Writes `Web/public/icons/`: icon-192, icon-512, apple-touch-icon (180), favicon-32 and the maskable
icon-512, which is the master at 80 % on the icon's own background gradient, so a round or squircle
mask never cuts the cars. Run `make_icon.py` first when the colours change.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'icons')
BACKGROUND_TOP = (24, 29, 37)
BACKGROUND_BOTTOM = (9, 11, 14)

master = Image.open(os.path.join(HERE, 'AppIcon.png')).convert('RGB')


def save(name: str, size: int) -> None:
    master.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f'{name}.png'), optimize=True)


save('icon-192', 192)
save('icon-512', 512)
save('apple-touch-icon', 180)
save('favicon-32', 32)

size = 512
canvas = Image.new('RGB', (size, size))
for y in range(size):
    t = y / (size - 1)
    row = tuple(round(a + (b - a) * t) for a, b in zip(BACKGROUND_TOP, BACKGROUND_BOTTOM))
    canvas.paste(row, (0, y, size, y + 1))
inner = round(size * 0.8)
canvas.paste(master.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
canvas.save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
print('PWA icons written')
