"""
The drift car's sounds, rendered once to samples (public/audio/drift/*.m4a); the game loops and mixes them
(`AudioPlayer.updateDrift`).

    python Web/audio-src/make_drift_sounds.py

No CC0 recordings of a turbo or a blow-off valve could be found (research of 22.10.2026), so they are
modelled from what makes the real thing, like the other street sounds:

- The engine is a straight six (RB26, 2JZ): every firing is a short pressure pulse, each cylinder a little
  different, each cycle a little late or early; the pulses ring through the exhaust pipe (a comb) and the
  silencer (a few resonances) and clip a little on the throttle. Off the throttle it burbles and crackles.
  On the throttle it hangs at the limiter: the ignition cuts out in short bursts (brap-brap).
- The turbo whistles: a narrow band of air at the compressor's pitch with a thin tone in it.
- The lift: a short hiss of the valve, then the compressor surges (stu-tu-tu-tu): a dozen pressure pulses,
  each a hard edge (the t) and a hollow body (the u), slowing and fading while the whistle winds down
  through them.
- The flutter on top: seven quick, airy chirps of the compressor wheel, each fainter than the last (the
  game plays the first three to seven, `FLUTTER_PERIOD` apart).
- The tyres: a squeal is rubber sticking and slipping, a tone that wanders with harmonics and grit; a
  wheelspin at the line is rougher and lower, with the roar of the tread.

Loops are rendered long and cross-faded into themselves, so they never click. Seeded: the same files every
time. Needs numpy, scipy and ffmpeg.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio', 'drift')
rng = np.random.default_rng(22_10_2026)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lowpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, 'lowpass', fs=SR, output='sos'), x)


def highpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, 'highpass', fs=SR, output='sos'), x)


def peak(x, hz, q, gain):
    """A resonance of the silencer: a narrow band of the signal added back, `gain` times."""
    b, a = signal.iirpeak(hz, q, fs=SR)
    return x + gain * signal.lfilter(b, a, x)


def wander(n, smooth_hz):
    """Slow, smooth randomness with unit spread: the wandering of a pitch or a level."""
    w = lowpass(rng.normal(0, 1, n), smooth_hz, 1)
    return w / (np.std(w) + 1e-9)


def loop(x, fade=0.3):
    """Cross-fades the tail into the head: the buffer loops seamlessly."""
    f = int(SR * fade)
    body = x[:-f].copy()
    ramp = np.linspace(0, 1, f)
    body[:f] = body[:f] * np.sqrt(ramp) + x[-f:] * np.sqrt(1 - ramp)
    return body


SIX = ((90, 2.5, 1.8), (180, 3, 1.3), (380, 4, 0.8), (800, 5, 0.3), (1600, 5, 0.1))


def engine(rpm, seconds, load, cut=False, crackle=0.0, cylinders=6, uneven=(1.0,), spread=0.05, pipe=115, resonances=SIX, diesel=0.0, top=1.0):
    """
    An engine at `rpm` (a straight six unless told otherwise: `cylinders` fire once each in two revolutions).
    `load` 0…1: off the throttle to flat out. `cut`: bouncing off the limiter. `crackle`: afterfire pops a second.
    `uneven`: the gaps between firings in turn (a V-twin's long-short, a V8's burble), `spread` how unlike the
    cylinders are; `pipe` the exhaust's comb (Hz), `resonances` the silencer's; `diesel` 0…1 the hard knock and
    clatter of compression ignition; `top` scales the highest frequency left in.
    """
    n = int(SR * (seconds + 0.3))
    pulses = np.zeros(n)
    trims = 1 + rng.normal(0, spread, cylinders)
    drift = 1 + 0.015 * wander(n, 0.8)
    t = 0.0
    k = 0
    cut_until = -1.0
    while True:
        i = int(t * SR)
        if i >= n:
            break
        # The limiter bites now and then, one to two times a second: a short cut, never a constant stutter.
        if cut and t > cut_until + 0.25 and rng.random() < 1.6 / (rpm / 20):
            cut_until = t + rng.uniform(0.025, 0.05)
        if t >= cut_until:
            pulses[i] += trims[k % cylinders] * (1 + rng.normal(0, 0.12 if load > 0.5 else 0.2))
        else:
            # A cut cylinder still breathes: a fraction of a pulse, unburnt fuel.
            pulses[i] += 0.12 * rng.random()
        f = rpm / 60 * cylinders / 2 * drift[i]
        t += (uneven[k % len(uneven)] / f) * (1 + rng.normal(0, 0.006))
        k += 1
    for _ in range(int(crackle * seconds)):
        i = rng.integers(0, n - 2000)
        pulses[i] += rng.uniform(2.5, 5) * (1 if rng.random() < 0.5 else -1)
    # The pressure pulse of one combustion: a sharp rise, a ringing fall.
    tau = (0.0008 if load > 0.5 else 0.0011) * (1 - 0.6 * diesel)
    kt = np.arange(int(SR * 0.012)) / SR
    kernel = (kt / tau) * np.exp(1 - kt / tau) - 0.35 * np.sin(2 * np.pi * 160 * kt) * np.exp(-kt / 0.004)
    x = signal.fftconvolve(pulses, kernel)[:n]
    # Combustion is not clean: a breath of noise rides on every pulse.
    env = lowpass(np.abs(x), 400, 1)
    x += (0.08 + 0.5 * diesel) * highpass(rng.normal(0, 1, n), 900 + 1200 * diesel) * env
    # The exhaust pipe: a comb at its length, then the silencer's few resonances.
    delay = int(SR / pipe)
    x = signal.lfilter([1], np.r_[1, np.zeros(delay - 1), -0.45], x)
    for hz, q, gain in resonances:
        x = peak(x, hz, q, gain)
    x = lowpass(x, (1500 + 1500 * load) * top, 2)
    # Flat out it clips a little: the rasp of a straight pipe.
    x = x / (np.std(x) + 1e-9)
    x = np.tanh(x * (0.4 + 0.6 * load)) * (0.6 + 0.4 * load)
    # The clipping's fizz is tamed again, as the body and the distance round the ring do.
    return lowpass(highpass(x, 40, 2), (2400 + 800 * load) * top, 2)


def turbo(seconds):
    """The compressor's whistle at full boost: thin, high, a little unsteady."""
    n = int(SR * (seconds + 0.3))
    t = np.arange(n) / SR
    f = 3400 * (1 + 0.012 * wander(n, 3))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.25 * np.sin(2 * phase + 0.7) + 0.08 * np.sin(3 * phase)
    air = bandpass(rng.normal(0, 1, n), 2900, 4300, 3)
    air /= np.std(air) + 1e-9
    hiss = highpass(rng.normal(0, 1, n), 5000, 2) * 0.15
    swell = 1 + 0.08 * np.sin(2 * np.pi * 0.7 * t)
    return (0.55 * tone + 0.6 * air + hiss) * swell


def blow_off():
    """The lift: s, then tu-tu-tu-tu: the valve hisses, the compressor surges in slowing, fading pulses."""
    n = int(SR * 1.0)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # The s: a short, bright hiss as the valve cracks open.
    s_len = int(SR * 0.07)
    st = np.arange(s_len) / SR
    hiss = highpass(bandpass(rng.normal(0, 1, s_len), 2500, 9000, 2), 1800)
    out[:s_len] += 0.55 * hiss / (np.std(hiss) + 1e-9) * np.minimum(1, st / 0.006) * np.exp(-st / 0.035)
    # The whistle winding down underneath, chopped by every pulse.
    whistle_f = 3300 * np.exp(-t / 0.9)
    whistle = np.sin(2 * np.pi * np.cumsum(whistle_f) / SR)
    chop = np.zeros(n)
    at = 0.055
    rate = 22.0
    level = 1.0
    m = int(SR * 0.05)
    mt = np.arange(m) / SR
    while at < 0.85 and level > 0.04:
        i = int(at * SR)
        k = min(m, n - i)
        # t: a hard edge of air; u: a hollow, falling body; together one surge of the compressor.
        edge = highpass(rng.normal(0, 1, m), 2200, 2) * np.exp(-mt / 0.0025)
        body_f = 520 * (1 + 0.6 * level) * np.exp(-mt / 0.05)
        body = np.sin(2 * np.pi * np.cumsum(body_f) / SR) * (mt / 0.004) * np.exp(1 - mt / 0.004) ** 0.5 * np.exp(-mt / 0.016)
        puff = bandpass(rng.normal(0, 1, m), 500, 1800, 2) * (mt / 0.003) * np.exp(1 - mt / 0.003) * np.exp(-mt / 0.012)
        pulse = 0.25 * edge + 1.0 * body + 0.55 * puff / (np.std(puff) + 1e-9) * 0.3
        out[i : i + k] += level * pulse[:k]
        chop[i : i + k] += level * np.exp(-mt[:k] / 0.012)
        at += (1 / rate) * (1 + rng.normal(0, 0.05))
        rate *= 0.95
        level *= 0.8
    out += 0.12 * whistle * chop
    return lowpass(out, 7000, 2)


FLUTTER_PERIOD = 0.034
FLUTTER_PULSES = 7


def flutter():
    """Chirps of air through the stalling compressor: high, quick, each fainter, the whistle falling in every one."""
    n = int(SR * (FLUTTER_PERIOD * FLUTTER_PULSES + 0.08))
    out = np.zeros(n)
    m = int(SR * 0.03)
    mt = np.arange(m) / SR
    level = 1.0
    for k in range(FLUTTER_PULSES):
        i = int(k * FLUTTER_PERIOD * SR)
        shape = (mt / 0.0015) * np.exp(1 - mt / 0.0015) ** 0.4 * np.exp(-mt / 0.008)
        air = bandpass(rng.normal(0, 1, m), 1800, 6500, 2)
        air /= np.std(air) + 1e-9
        f = 4300 * (1 - 0.06 * k) * np.exp(-mt / 0.03)
        chirp = np.sin(2 * np.pi * np.cumsum(f) / SR)
        puh = np.sin(2 * np.pi * 320 * mt) * np.exp(-mt / 0.006)
        k_end = min(m, n - i)
        out[i : i + k_end] += (level * (0.7 * air + 0.45 * chirp + 0.3 * puh) * shape)[:k_end]
        level *= 0.74
    return lowpass(out, 9000, 2)


def squeal(seconds, base=980, grit=0.5):
    """Rubber sticking and slipping: a wandering tone with harmonics, its level flickering, grit under it."""
    n = int(SR * (seconds + 0.3))
    f = base * (1 + 0.07 * wander(n, 2.5))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.45 * np.sin(2 * phase + 1.3) + 0.2 * np.sin(3 * phase + 0.4) + 0.08 * np.sin(5 * phase)
    # Stick-slip: the level shudders a few dozen times a second, and swells slowly.
    shudder = np.clip(1 + 0.35 * wander(n, 45), 0.2, 2)
    swell = np.clip(0.8 + 0.2 * wander(n, 1.5), 0.4, 1.2)
    rasp = bandpass(rng.normal(0, 1, n), base * 0.8, base * 3.2, 2)
    rasp /= np.std(rasp) + 1e-9
    roar = lowpass(rng.normal(0, 1, n), 350, 2)
    roar /= np.std(roar) + 1e-9
    return (0.5 * tone * shudder + grit * 0.35 * rasp * shudder + grit * 0.4 * roar) * swell


def wheelspin(seconds):
    """Spinning on the spot: a lower, rougher squeal, the tread roaring and chattering."""
    n = int(SR * (seconds + 0.3))
    chatter = np.clip(1 + 0.5 * wander(n, 70), 0.1, 2.2)
    scrub = bandpass(rng.normal(0, 1, n), 380, 2400, 2)
    scrub /= np.std(scrub) + 1e-9
    return squeal(seconds, base=760, grit=0.9) + 0.45 * scrub * chatter


def stereo(x):
    """Mono into two channels, a touch wider through a tiny delay on one side."""
    d = int(SR * 0.0006)
    return np.stack([x, np.r_[np.zeros(d), x[: len(x) - d]]], axis=1)


SOUNDS = {
    'engineOn': lambda: loop(engine(7100, 3.2, 1.0, cut=True)),
    'engineOff': lambda: loop(engine(4300, 3.2, 0.25, crackle=4)),
    'turbo': lambda: loop(turbo(2.6)),
    'squeal': lambda: loop(squeal(2.8)),
    'spin': lambda: loop(wheelspin(2.8)),
    'blowOff': blow_off,
    'flutter': flutter,
}


def main():
    # Names on the command line make only those (`... make_drift_sounds.py turbo`).
    only = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            if only and name not in only:
                continue
            x = make()
            x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20)
            if name in ('blowOff', 'flutter'):
                f = int(SR * 0.02)
                x[-f:] *= np.linspace(1, 0, f)
            wav = os.path.join(tmp, f'{name}.wav')
            wavfile.write(wav, SR, stereo(x).astype(np.float32))
            target = os.path.join(OUT, f'{name}.m4a')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', '-ar', str(SR), '-ac', '2', target], check=True)
            print(f'{name}.m4a')


if __name__ == '__main__':
    main()
