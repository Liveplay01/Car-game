"""
The syndicate's sounds (Leo, 25.10.2026), rendered once to samples.

    python Web/audio-src/make_boss_sounds.py

Each boss announces itself with a two-note sting of its own (public/audio/sounds/sting*.m4a), a
brass stab over a low drum, in A minor like the music. A boss that gets away leaves an ugly tone
behind (bossEscaped.m4a): two buzzing voices a semitone apart, sliding down. While a boss is on
the ring the music's siren stem gives way to the boss stem (public/audio/music/boss.m4a): four
bars at 120 bpm, a low pulse and a heavy drum, looping without a seam. Seeded: the same files
every time. Needs numpy, scipy and ffmpeg.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

from make_casino_sounds import OUT, SR, band, burst, finish, lowpass, modes, place, room, silence, t_axis
from make_street_sounds import gate, reed

rng = np.random.default_rng(25_10_2026)
MUSIC = os.path.join(os.path.dirname(OUT), 'music')


def hz(semitones):
    """Semitones above A2 (110 Hz)."""
    return 110 * 2 ** (semitones / 12)


def stab(f, length, bright=2400, tilt=1.0, wobble=0.0, sag=0.0):
    """A brass stab: the note and its octave below, the bell's edge on top, rounded at both ends."""
    voice = reed(f, length, harmonics=16, tilt=tilt, sag=sag, wobble=wobble) + 0.6 * reed(f / 2, length, harmonics=12, tilt=1.2)
    voice = lowpass(voice, bright, 2)
    return (voice + 0.35 * band(voice, 900, 1600)) * gate(length, 0.012, length * 0.6)


def drum(f=55, decay=0.25, level=1.0):
    """A low tom: a falling sine and a soft skin noise."""
    t = t_axis(decay * 3)
    body = np.sin(2 * np.pi * (f * t + f * 0.6 * 0.05 * (1 - np.exp(-t / 0.05)))) * np.exp(-t / decay)
    return level * (body * np.minimum(1, t / 0.002) + 0.25 * np.pad(lowpass(burst(0.05, 80, 900, 0.015), 900), (0, len(t) - int(SR * 0.05))))


def sting(notes, gap=0.2, length=0.32, tail=0.5, voice=None, hit=True):
    """Two notes, a drum under each: `notes` are semitones above A2."""
    voice = voice or {}
    out = silence(gap + length + tail)
    for i, n in enumerate(notes):
        place(out, stab(hz(n), length, **voice), i * gap, 0.7)
        if hit:
            place(out, drum(55 if i == 0 else 49, 0.22), i * gap, 0.8)
    return out


def convoy():
    # A march: a fifth up, square and steady.
    return room(sting([0, 7]), 0.4, 0.14)


def getaway():
    # In a hurry: a quick rise, bright, with a rush of air under it.
    out = sting([7, 12], gap=0.12, length=0.2, voice={'bright': 3600, 'tilt': 0.8})
    place(out, band(rng.normal(0, 1, int(SR * 0.3)), 1500, 6000) * np.linspace(0, 1, int(SR * 0.3)) ** 2 * 0.15, 0)
    return room(out, 0.3, 0.1)


def armoured():
    # Two heavy blows on the same low note, steel ringing over them.
    out = sting([-5, -5], gap=0.26, length=0.28, voice={'bright': 1600, 'tilt': 1.3})
    for at in (0, 0.26):
        place(out, modes([520, 1206, 2028], [1, 0.5, 0.3], [0.3, 0.18, 0.1], 0.5, 0.006), at, 0.25)
    return room(out, 0.45, 0.16, 6000)


def phantom():
    # Hardly there: soft, dark, a tritone down, most of it the room.
    out = sting([7, 1], gap=0.28, length=0.45, voice={'bright': 1000, 'tilt': 1.4, 'wobble': 0.006}, hit=False)
    place(out, drum(45, 0.35, 0.5), 0, 1)
    return room(out, 0.9, 0.45, 2500)


def twins():
    # The same note twice, the second an octave up and a hair out of tune: two of a kind.
    out = sting([0, 12], gap=0.16, length=0.26)
    place(out, stab(hz(12.15), 0.26), 0.16, 0.35)
    return room(out, 0.4, 0.14)


def decoy():
    # Not what it seems: up a minor third, then a half step down that slips, wobbling.
    return room(sting([3, 2], gap=0.18, length=0.3, voice={'wobble': 0.012, 'sag': 0.02}), 0.4, 0.16)


def smuggler():
    # Under a tarpaulin: low and muffled, a fourth down.
    out = sting([-7, -12], gap=0.24, length=0.36, voice={'bright': 900, 'tilt': 1.3})
    return room(out, 0.35, 0.12, 2500)


def kingpin():
    # The finale: a minor third down, both notes stacked with their fifth, long, a sub under the second.
    out = silence(1.6)
    for at, n, length in [(0, 0, 0.3), (0.26, -4, 0.85)]:
        for k, g in [(0, 0.7), (7, 0.35), (12, 0.25)]:
            place(out, stab(hz(n + k), length, bright=2600), at, g)
        place(out, drum(50, 0.3), at, 0.9)
    t = t_axis(0.9)
    place(out, np.sin(2 * np.pi * 41.2 * t) * gate(0.9, 0.04, 0.5), 0.26, 0.5)
    return room(out, 0.7, 0.2)


def boss_escaped():
    # It got away: two buzzing voices a semitone apart, sliding down a fifth, ending in a sour wheeze.
    length = 1.0
    t = t_axis(length)
    out = silence(length + 0.2)
    for f in (hz(3), hz(4)):
        slide = f * 2 ** (-7 / 12 * (t / length) ** 1.5)
        phase = 2 * np.pi * np.cumsum(slide) / SR
        saw = sum(np.sin(n * phase) / n for n in range(1, 18))
        place(out, lowpass(saw, 1800, 2) * gate(length, 0.02, 0.35), 0, 0.5)
    place(out, band(rng.normal(0, 1, int(SR * length)), 400, 1500) * gate(length, 0.3, 0.4) * 0.08, 0)
    return room(out, 0.4, 0.14, 3000)


SOUNDS = {
    'stingConvoy': convoy,
    'stingGetaway': getaway,
    'stingArmoured': armoured,
    'stingPhantom': phantom,
    'stingTwins': twins,
    'stingDecoy': decoy,
    'stingSmuggler': smuggler,
    'stingKingpin': kingpin,
    'bossEscaped': boss_escaped,
}

LEVEL_DB = {name: -3 for name in SOUNDS} | {'stingPhantom': -5, 'bossEscaped': -5}


def boss_stem():
    """Four bars at 120 bpm (8 s, like the other stems): a low eighth-note pulse on A, F, D, E, a drum on 1 and 3 and a ghost on the 4-and."""
    beat = 0.5
    bars = 4
    length = bars * 4 * beat
    out = silence(length + 2)
    roots = [-12, -16, -19, -17]
    for bar, root in enumerate(roots):
        for eighth in range(8):
            at = bar * 4 * beat + eighth * beat / 2
            accent = 1.0 if eighth % 2 == 0 else 0.6
            note = lowpass(reed(hz(root), 0.22, harmonics=10, tilt=1.1), 600, 2) * gate(0.22, 0.006, 0.12)
            place(out, note, at, 0.45 * accent)
        for b, g in [(0, 1.0), (2, 0.8), (3.5, 0.35)]:
            place(out, drum(52, 0.2, g), bar * 4 * beat + b * beat, 0.7)
        # A dark brass swell at the end of every second bar, a half step over the root: the tension of the chase.
        if bar % 2 == 1:
            place(out, stab(hz(root + 13), 1.0, bright=1200, tilt=1.3) * np.linspace(0, 1, int(SR * 1.0)), bar * 4 * beat + 2 * beat, 0.25)
    # Whatever rings past the end comes back at the start, so the loop has no seam.
    n = int(SR * length)
    loop = out[:n].copy()
    loop[: len(out) - n] += out[n:]
    return np.stack([loop, loop], axis=1)


def encode(stereo, target, tmp):
    wav = os.path.join(tmp, os.path.basename(target).replace('.m4a', '.wav'))
    wavfile.write(wav, SR, stereo)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', '-ar', str(SR), '-ac', '2', target], check=True)
    print(os.path.basename(target))


def main():
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if not only or name in only:
                encode(finish(make()) * 10 ** (LEVEL_DB[name] / 20), os.path.join(OUT, f'{name}.m4a'), tmp)
        if not only or 'boss' in only:
            stem = boss_stem()
            # No fade at the end: the stem loops. The same -3 dBFS peak as the samples, a little under for the mix.
            encode((stem / np.max(np.abs(stem)) * 10 ** (-6 / 20)).astype(np.float32), os.path.join(MUSIC, 'boss.m4a'), tmp)


if __name__ == '__main__':
    main()
