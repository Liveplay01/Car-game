"""
The casino's own sounds, rendered once to samples (public/audio/sounds/*.m4a).

    python Web/audio-src/make_casino_sounds.py

No recordings: each sound is modelled from what makes the real one, so it reads as that
thing and not as a synthesiser. A coin rings with the inharmonic partials of a metal disc, a
reel catches with a click, a thud and a short ratchet, a peg ticks like hard wood, plastic
chips clack, glass breaks into many small pings. Every sound gets a short room (a decaying
noise impulse, a little different per ear) so it sits in a space. Seeded: the same files
every time. Needs numpy, scipy and ffmpeg.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', 'public', 'audio', 'sounds')
rng = np.random.default_rng(29_09_2026)


def t_axis(duration):
    return np.arange(int(SR * duration)) / SR


def silence(duration):
    return np.zeros(int(SR * duration))


def place(buffer, sound, at, gain=1.0):
    start = int(SR * at)
    end = min(len(buffer), start + len(sound))
    buffer[start:end] += gain * sound[: end - start]


def band(signal, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype='bandpass', fs=SR, output='sos')
    return sosfilt(sos, signal)


def lowpass(signal, hz, order=2):
    return sosfilt(butter(order, hz, btype='lowpass', fs=SR, output='sos'), signal)


def highpass(signal, hz, order=2):
    return sosfilt(butter(order, hz, btype='highpass', fs=SR, output='sos'), signal)


def modes(freqs, amps, decays, duration, detune=0.0):
    """A struck body: each partial a decaying sine, its phase random."""
    t = t_axis(duration)
    out = np.zeros_like(t)
    for f, a, d in zip(freqs, amps, decays):
        f = f * (1 + detune * rng.uniform(-1, 1))
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / d)
    # A 1 ms rise, so no partial starts with a click of its own.
    rise = min(len(out), int(SR * 0.001))
    out[:rise] *= np.linspace(0, 1, rise)
    return out


def burst(duration, lo, hi, decay):
    """The strike itself: a short band of noise."""
    t = t_axis(duration)
    return band(rng.normal(0, 1, len(t)), lo, hi) * np.exp(-t / decay)


def room(mono, length=0.3, mix=0.14, bright=5000):
    """A small room, a little different for each ear, so the sound is not flat in the middle."""
    tail = int(SR * length)
    t = np.arange(tail) / SR
    ears = []
    for _ in range(2):
        ir = lowpass(rng.normal(0, 1, tail), bright) * np.exp(-t / (length / 5))
        ir /= np.sqrt(np.sum(ir**2)) + 1e-9
        dry = np.concatenate([mono, np.zeros(tail)])
        wet = fftconvolve(mono, ir)[: len(dry)]
        wet = np.pad(wet, (0, len(dry) - len(wet)))
        ears.append(dry + mix * wet)
    return np.stack(ears, axis=1)


def coin_partials(f0):
    # A thin metal disc: strongly inharmonic partials, the high ones dying first.
    return [f0, f0 * 2.18, f0 * 3.73, f0 * 5.52], [1.0, 0.55, 0.32, 0.18]


def casino_stop():
    out = silence(0.45)
    place(out, burst(0.02, 2500, 7000, 0.003), 0, 0.7)
    t = t_axis(0.3)
    thump = np.sin(2 * np.pi * (60 * t + (35 / 0.12) * 0.12 * (1 - np.exp(-t / 0.12)))) * np.exp(-t / 0.06)
    place(out, thump, 0, 0.9)
    place(out, modes([310, 780, 1240], [0.25, 0.15, 0.1], [0.08, 0.04, 0.025], 0.3), 0, 1)
    for at, g in [(0.024, 0.3), (0.047, 0.16)]:
        place(out, burst(0.015, 2000, 6000, 0.002), at, g)
    return room(out, 0.25, 0.12)


def coin_clink():
    out = silence(0.7)
    freqs, amps = coin_partials(2350)
    place(out, highpass(burst(0.006, 3000, 12000, 0.0008), 2000), 0, 0.5)
    place(out, modes(freqs, amps, [0.42, 0.24, 0.13, 0.07], 0.6, 0.004), 0, 0.8)
    # It lands on other coins: a second, softer ring just after.
    freqs2, amps2 = coin_partials(2350 * 1.13)
    place(out, modes(freqs2, [a * 0.6 for a in amps2], [0.3, 0.18, 0.1, 0.05], 0.5, 0.004), 0.018, 0.5)
    return room(out, 0.3, 0.15, 7000)


def needle_tick():
    out = silence(0.14)
    place(out, burst(0.005, 1500, 5000, 0.0012), 0, 0.6)
    place(out, modes([1450, 3050, 4200], [1, 0.4, 0.2], [0.025, 0.012, 0.008], 0.12), 0, 0.6)
    place(out, modes([420], [1], [0.03], 0.12), 0, 0.4)
    return room(out, 0.15, 0.08)


def meter_tick():
    # The crash meter is a display: a clean electronic blip is what it should be.
    t = t_axis(0.12)
    env = np.minimum(1, t / 0.002) * np.exp(-t / 0.03)
    tone = np.sin(2 * np.pi * 1320 * t) + 0.25 * np.sin(2 * np.pi * 2640 * t) + 0.08 * np.sign(np.sin(2 * np.pi * 1320 * t))
    return room(tone * env * 0.6, 0.12, 0.06)


def coin_toss():
    duration = 0.5
    t = t_axis(duration)
    noise = rng.normal(0, 1, len(t))
    # The whoosh: the band sweeps up as the coin flies, in short slices.
    whoosh = np.zeros_like(t)
    slices = 20
    for i in range(slices):
        a, b = i * len(t) // slices, (i + 1) * len(t) // slices
        centre = 800 + 3200 * (i / slices)
        whoosh[a:b] = band(noise, centre * 0.7, centre * 1.3)[a:b]
    whoosh *= np.sin(np.pi * np.clip(t / 0.4, 0, 1)) ** 2 * 0.35
    freqs, amps = coin_partials(2600)
    ring = modes(freqs, amps, [0.6, 0.35, 0.2, 0.1], duration)
    # Spinning: the ring flickers as the coin turns edge on, faster as it goes.
    spin = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * (18 * t + 12 * t**2)))
    out = whoosh + 0.35 * ring * spin
    return room(out, 0.3, 0.12, 7000)


def coin_land():
    out = silence(1.2)
    t = t_axis(0.2)
    thud = np.sin(2 * np.pi * (80 * t + 100 * 0.05 * (1 - np.exp(-t / 0.05)))) * np.exp(-t / 0.05)
    place(out, thud, 0, 0.7)
    place(out, lowpass(burst(0.03, 100, 1500, 0.01), 1200), 0, 0.3)
    freqs, amps = coin_partials(2250)
    for at, gain, length in [(0, 0.6, 1.0), (0.09, 0.35, 0.6), (0.15, 0.15, 0.4)]:
        place(out, modes(freqs, amps, [0.8 * length, 0.45 * length, 0.25 * length, 0.12 * length], length, 0.003), at, gain)
        place(out, highpass(burst(0.004, 3000, 12000, 0.0008), 2000), at, gain * 0.5)
    return room(out, 0.4, 0.16, 7000)


def chips_in():
    out = silence(0.4)
    for at, gain in [(0, 1.0), (0.038, 0.8), (0.07, 0.6), (0.095, 0.45)]:
        at = max(0.0, at + rng.uniform(-0.004, 0.004))
        k = rng.uniform(0.92, 1.08)
        place(out, burst(0.004, 2000, 6000, 0.0009), at, 0.5 * gain)
        place(out, modes([2600 * k, 4300 * k], [1, 0.5], [0.018, 0.01], 0.06), at, 0.45 * gain)
        place(out, modes([700 * k], [1], [0.02], 0.06), at, 0.2 * gain)
    return room(out, 0.2, 0.1)


def shatter():
    out = silence(1.0)
    place(out, highpass(burst(0.06, 1500, 12000, 0.012), 1500), 0, 0.7)
    for i in range(44):
        at = 0.45 * (rng.uniform(0, 1) ** 2)
        f = rng.uniform(3000, 9000)
        gain = 0.35 * (1 - at / 0.5) * rng.uniform(0.4, 1)
        place(out, modes([f, f * rng.uniform(1.4, 2.3)], [1, 0.5], [rng.uniform(0.02, 0.08), 0.02], 0.12), at, gain)
    return room(out, 0.5, 0.2, 9000)


def shutter():
    # The photo of a shift: a camera's shutter. Its own seed, so the casino's sounds above stay
    # the same whether or not this one is made with them.
    local = np.random.default_rng(29_09_2026 + 1)

    def click(gain, pitch):
        t = t_axis(0.12)
        noise = band(local.normal(0, 1, len(t)), 2200 * pitch, 8000, 2) * np.exp(-t / 0.0025)
        body = sum(a * np.sin(2 * np.pi * f * pitch * t + local.uniform(0, 6.3)) * np.exp(-t / d) for f, a, d in [(1750, 1, 0.014), (3300, 0.5, 0.008), (5200, 0.25, 0.005)])
        thump = np.sin(2 * np.pi * 115 * t) * np.exp(-t / 0.018)
        return gain * (0.8 * noise + 0.35 * body + 0.5 * thump)

    out = silence(0.35)
    # The first curtain opens, the second closes it; the spring settles after.
    place(out, click(1.0, 1.0), 0)
    place(out, click(0.75, 0.9), 0.058)
    for at, g in [(0.078, 0.14), (0.087, 0.09), (0.094, 0.05)]:
        place(out, band(local.normal(0, 1, int(SR * 0.004)), 3000, 9000) * np.exp(-np.arange(int(SR * 0.004)) / (SR * 0.001)), at, g)
    return room(out, 0.18, 0.1, 8000)


SOUNDS = {
    'casinoStop': casino_stop,
    'coinClink': coin_clink,
    'needleTick': needle_tick,
    'meterTick': meter_tick,
    'coinToss': coin_toss,
    'coinLand': coin_land,
    'chipsIn': chips_in,
    'shatter': shatter,
    'shutter': shutter,
}


def finish(stereo):
    """Peak at -3 dBFS and a short fade at the end, so no file ends in a click."""
    stereo = stereo / (np.max(np.abs(stereo)) + 1e-9) * 10 ** (-3 / 20)
    fade = min(len(stereo), int(SR * 0.02))
    stereo[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return stereo.astype(np.float32)


def main():
    # Names on the command line make only those (`... make_casino_sounds.py shutter`).
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if only and name not in only:
                continue
            wav = os.path.join(tmp, f'{name}.wav')
            wavfile.write(wav, SR, finish(make()))
            target = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', '-ar', str(SR), '-ac', '2', target], check=True)
            print(f'{name}.m4a')


if __name__ == '__main__':
    main()
