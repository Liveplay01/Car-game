"""
The traffic's engines, rendered once to loops (public/audio/traffic/*.m4a); the game gives each of the nearest
vehicles one, pitched by its speed (`AudioPlayer.updateTraffic`). A quiet bed under the game, not a feature.

    python Web/audio-src/make_traffic_sounds.py

Same engine model as the drift car (`make_drift_sounds.engine`), at cruising revs and part throttle:

- car: a small four-cylinder petrol, a smooth hum.
- sport: a cross-plane V8, its firings uneven, so it burbles (sports cars, racers, police, the criminal's pickup).
- diesel: a four-cylinder diesel, the knock and clatter of a van.
- truck: a big six-cylinder diesel, low and heavy (lorries, buses, the oversize load).
- bike: a V-twin, long-short firings, raspy.
- road: the tyres rolling on asphalt, one bed for the whole ring.

Seeded: the same files every time. Needs numpy, scipy and ffmpeg.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

from make_drift_sounds import SR, bandpass, engine, loop, lowpass, rng, stereo, wander

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio', 'traffic')


def road(seconds):
    """Tyres on asphalt: a soft roar with a little texture, swelling slowly."""
    n = int(SR * (seconds + 0.3))
    roar = lowpass(rng.normal(0, 1, n), 700, 2)
    texture = bandpass(rng.normal(0, 1, n), 900, 2600, 2)
    swell = 1 + 0.15 * wander(n, 0.6)
    return (roar / (np.std(roar) + 1e-9) + 0.3 * texture / (np.std(texture) + 1e-9)) * swell


SOUNDS = {
    'car': lambda: loop(engine(2400, 2.6, 0.35, cylinders=4, spread=0.04, pipe=140, resonances=((110, 3, 1.2), (260, 4, 0.9), (600, 5, 0.4), (1300, 5, 0.12)), top=0.8)),
    'sport': lambda: loop(engine(3000, 2.6, 0.5, cylinders=8, uneven=(0.86, 1.14, 1.0, 0.9, 1.1, 1.0, 0.94, 1.06), spread=0.16, pipe=85, resonances=((75, 2.5, 2.0), (150, 3, 1.4), (330, 4, 0.7), (700, 5, 0.25)), top=0.9)),
    'diesel': lambda: loop(engine(1900, 2.6, 0.4, cylinders=4, spread=0.06, pipe=120, resonances=((100, 3, 1.2), (240, 4, 0.8), (550, 5, 0.5), (1800, 4, 0.4)), diesel=0.7, top=0.9)),
    'truck': lambda: loop(engine(1300, 2.6, 0.5, cylinders=6, spread=0.06, pipe=65, resonances=((55, 2.5, 2.0), (130, 3, 1.4), (300, 4, 0.8), (900, 5, 0.3)), diesel=0.5, top=0.65)),
    'bike': lambda: loop(engine(4600, 2.6, 0.5, cylinders=2, uneven=(0.875, 1.125), spread=0.03, pipe=160, resonances=((120, 3, 1.4), (300, 4, 1.0), (700, 5, 0.6), (1500, 5, 0.3)), top=1.1)),
    'road': lambda: loop(road(3.0)),
}


def main():
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if only and name not in only:
                continue
            x = make()
            x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20)
            wav = os.path.join(tmp, f'{name}.wav')
            wavfile.write(wav, SR, stereo(x).astype(np.float32))
            target = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '96k', '-ar', str(SR), '-ac', '2', target], check=True)
            print(f'{name}.m4a')


if __name__ == '__main__':
    main()
