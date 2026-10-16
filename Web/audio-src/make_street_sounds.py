"""
The street's warning and hit sounds, rendered once to samples (public/audio/sounds/*.m4a).

    python Web/audio-src/make_street_sounds.py

Same method as the casino script: modelled from what makes the real thing, no recordings.
Horns and sirens are a reed or a diaphragm, so a stack of harmonics with a little pitch sag
and air at the start, not a bare oscillator. Armour rings like a steel plate: inharmonic
partials. Seeded: the same files every time. Needs numpy, scipy and ffmpeg.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

from make_casino_sounds import OUT, SR, band, burst, finish, lowpass, modes, place, room, silence, t_axis

rng = np.random.default_rng(16_10_2026)


def reed(freq, duration, harmonics=14, tilt=1.0, sag=0.0, wobble=0.0):
    """A horn voice: harmonics falling off as 1/n^tilt, the pitch drooping by `sag` over the note, a slow `wobble` in it."""
    t = t_axis(duration)
    f = freq * (1 - sag * (t / duration)) * (1 + wobble * np.sin(2 * np.pi * 5.5 * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    out = np.zeros_like(t)
    for n in range(1, harmonics + 1):
        if n * freq < 5200:
            out += np.sin(n * phase + rng.uniform(0, 2 * np.pi)) / n**tilt
    return out


def gate(duration, attack, release, hold=None):
    """A rounded note envelope: up in `attack`, held, down over `release`."""
    t = t_axis(duration)
    hold = duration - release if hold is None else hold
    env = np.minimum(1, t / attack) * np.where(t < hold, 1, np.exp(-(t - hold) / (release / 4)))
    return env * np.minimum(1, (duration - t) / 0.004)


def horn(freqs, duration, attack=0.012, release=0.04, **voice):
    """Two or more reeds sounding together (a car's twin horn)."""
    out = sum(reed(f, duration, **voice) for f in freqs) / len(freqs)
    return lowpass(out, 3600, 2) * gate(duration, attack, release)


def ambulance():
    # Hi-lo, a fourth apart like a real two-tone horn, with a short slide between the tones; twice.
    note = 0.2
    out = silence(note * 4 + 0.05)
    for i in range(4):
        f = 933 if i % 2 == 0 else 700
        voice = reed(f, note, harmonics=10, tilt=1.2, wobble=0.004)
        voice = lowpass(voice, 3200, 2) * gate(note, 0.008, 0.03)
        place(out, voice, i * note, 0.7)
    # The horn's resonating bell: a band around 1.4 kHz gives it the nasal edge of a real one.
    out = out + 0.5 * band(out, 1100, 1800)
    return room(out, 0.3, 0.1)


def wedding():
    # A corso: honk, honk, hoooonk. Twin car horn a major third apart, the note sagging as the diaphragm tires.
    out = silence(0.75)
    for at, length in [(0, 0.1), (0.16, 0.1), (0.32, 0.36)]:
        voice = horn([440, 554], length, attack=0.01, release=0.05, harmonics=12, tilt=0.9, sag=0.015)
        place(out, voice, at, 0.8)
        place(out, burst(0.012, 1200, 5000, 0.003), at, 0.25)
    return room(out, 0.35, 0.12)


def oversize():
    # A truck's air horn: low and wide, a fourth apart, breathing in with a slow attack and a sub underneath.
    length = 0.95
    t = t_axis(length)
    voice = horn([113, 150, 226], length, attack=0.05, release=0.18, harmonics=16, tilt=0.7, sag=0.01)
    out = 0.9 * voice
    place(out, burst(0.12, 300, 3500, 0.04), 0, 0.3)
    place(out, np.sin(2 * np.pi * 56 * t) * gate(length, 0.06, 0.2), 0, 0.35)
    out = out + 0.3 * band(out, 300, 700)
    return room(out, 0.5, 0.16, 4000)


def learner():
    # Two careful beeps: round, a little unsure, the second one lower.
    out = silence(0.5)
    for at, f in [(0, 660), (0.2, 620)]:
        t = t_axis(0.12)
        wave = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) + 0.05 * np.sin(2 * np.pi * 3 * f * t)
        place(out, wave * gate(0.12, 0.006, 0.05), at, 0.6)
    return room(out, 0.2, 0.08)


def clang():
    # Metal on armour: a steel plate's partials (1 : 2.32 : 3.9 : 5.7 : 7.9), the high ones dying first, and a dull knock under it.
    out = silence(0.9)
    freqs = [520, 1206, 2028, 2964, 4108]
    ring = modes(freqs, [1, 0.6, 0.45, 0.3, 0.2], [0.5, 0.32, 0.2, 0.12, 0.07], 0.85, 0.006)
    ring *= np.minimum(1, (0.85 - t_axis(0.85)) / 0.25)
    place(out, ring, 0, 0.7)
    place(out, burst(0.02, 2200, 9000, 0.003), 0, 0.5)
    place(out, modes([170, 240], [1, 0.5], [0.05, 0.035], 0.2), 0, 0.7)
    return room(out, 0.4, 0.14, 7000)


def blocked():
    # A refusal: two dull, flat buzzes, the second a little lower.
    out = silence(0.35)
    for at, f in [(0, 150), (0.14, 120)]:
        voice = lowpass(reed(f, 0.11, harmonics=12, tilt=0.8), 900, 2) * gate(0.11, 0.004, 0.04)
        place(out, voice, at, 0.6)
    return room(out, 0.15, 0.06)


SOUNDS = {
    'ambulance': ambulance,
    'wedding': wedding,
    'oversize': oversize,
    'learner': learner,
    'clang': clang,
    'blocked': blocked,
}

# Below the -3 dBFS peak `finish` gives every file: a held horn is far louder than a clang at the same peak.
LEVEL_DB = {'ambulance': -6.5, 'wedding': -2.5, 'oversize': -1.5, 'learner': -6, 'clang': -1.5, 'blocked': -5}


def main():
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if only and name not in only:
                continue
            wav = os.path.join(tmp, f'{name}.wav')
            wavfile.write(wav, SR, finish(make()) * 10 ** (LEVEL_DB[name] / 20))
            target = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', '-ar', str(SR), '-ac', '2', target], check=True)
            print(f'{name}.m4a')


if __name__ == '__main__':
    main()
