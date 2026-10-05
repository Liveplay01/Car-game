"""Mixes a cut's soundtrack from the game's own audio.

python compose/audio.py out/<name>.audio.json out/<name>.wav

The JSON comes from the cut: music = [{stem, from, to, gain, fade}], sfx = [{name, t, gain, rate}],
booms = [{t, gain}], risers = [{from, to, gain}]. Everything sits on the music's 120 BPM grid.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import scipy.io.wavfile as wav

SR = 44100
AUDIO = Path(__file__).resolve().parents[3] / "Web" / "public" / "audio"
_cache: dict[str, np.ndarray] = {}


def load(path: Path) -> np.ndarray:
    key = str(path)
    if key not in _cache:
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
            capture_output=True,
            check=True,
        ).stdout
        _cache[key] = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    return _cache[key]


def place(mix: np.ndarray, clip: np.ndarray, t: float, gain: float) -> None:
    i = int(t * SR)
    if i >= len(mix):
        return
    j = min(len(mix), i + len(clip))
    mix[max(i, 0) : j] += clip[max(-i, 0) : j - i] * gain


def resample(clip: np.ndarray, rate: float) -> np.ndarray:
    if rate == 1.0:
        return clip
    n = int(len(clip) / rate)
    x = np.linspace(0, len(clip) - 1, n)
    return np.stack([np.interp(x, np.arange(len(clip)), clip[:, c]) for c in range(2)], axis=1)


def envelope(n: int, a: int, b: int, fade: float) -> np.ndarray:
    env = np.zeros(n, dtype=np.float32)
    f = max(1, int(fade * SR))
    env[a:b] = 1.0
    if b - a > 2 * f:
        env[a : a + f] = np.linspace(0, 1, f)
        env[b - f : b] = np.linspace(1, 0, f)
    return env


def boom(gain: float) -> np.ndarray:
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    freq = 38 + 90 * np.exp(-t * 16)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 4.2)
    rng = np.random.default_rng(7)
    air = rng.standard_normal(n) * np.exp(-t * 22) * 0.35
    mono = (body + air).astype(np.float32) * gain
    return np.stack([mono, mono], axis=1)


def riser(length: float, gain: float) -> np.ndarray:
    n = int(length * SR)
    rng = np.random.default_rng(11)
    noise = rng.standard_normal(n).astype(np.float32)
    # a moving one-pole high-pass: the noise brightens as it climbs
    out = np.zeros(n, dtype=np.float32)
    prev_x = prev_y = 0.0
    for i in range(n):
        p = i / n
        a = 0.995 - 0.5 * p**1.5
        y = a * (prev_y + noise[i] - prev_x)
        prev_x, prev_y = noise[i], y
        out[i] = y
    out *= (np.linspace(0, 1, n) ** 2.2).astype(np.float32) * gain * 0.55
    out[-int(0.02 * SR) :] *= np.linspace(1, 0, int(0.02 * SR))
    return np.stack([out, out], axis=1)


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    n = int(spec["dur"] * SR)
    mix = np.zeros((n, 2), dtype=np.float32)

    for m in spec.get("music", []):
        loop = load(AUDIO / "music" / f"{m['stem']}.m4a")
        reps = int(np.ceil(spec["dur"] * SR / len(loop))) + 1
        track = np.tile(loop, (reps, 1))[:n]
        env = envelope(n, int(m["from"] * SR), int(min(m["to"], spec["dur"]) * SR), m.get("fade", 0.06))
        mix += track * env[:, None] * m.get("gain", 1.0)

    for s in spec.get("sfx", []):
        clip = resample(load(AUDIO / "sounds" / f"{s['name']}.m4a"), s.get("rate", 1.0))
        place(mix, clip, s["t"], s.get("gain", 1.0))
    for b in spec.get("booms", []):
        place(mix, boom(b.get("gain", 1.0)), b["t"], 1.0)
    for r in spec.get("risers", []):
        place(mix, riser(r["to"] - r["from"], r.get("gain", 1.0)), r["from"], 1.0)

    # final fade and a soft limiter that keeps the peaks under -1 dBFS
    tail = int(spec.get("fadeOut", 0.35) * SR)
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    mix = np.tanh(mix * spec.get("drive", 1.15)) / np.tanh(spec.get("drive", 1.15))
    peak = np.abs(mix).max()
    mix *= 0.89 / max(peak, 1e-6)
    wav.write(out, SR, (mix * 32767).astype(np.int16))
    print(f"audio {out.name}: {spec['dur']:.1f}s peak {peak:.2f}")


main()
