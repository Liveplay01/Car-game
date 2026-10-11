// Shared parts of the social cuts (Reels, TikTok, Shorts; Oct 2026): event times from the clip logs,
// shots that slow down into a tap, and the end card. Text stays inside the platforms' safe zone (y 0.13–0.78).
import { readFileSync } from 'node:fs';

// the log counts the page's frames; one video second holds 1.0625 of them (README, "Zeiten")
export const events = (src, ...types) =>
  JSON.parse(readFileSync(new URL(`../../footage/${src}.json`, import.meta.url))).log
    .filter((e) => types.includes(e.type))
    .map((e) => ({ ...e, t: e.f / 60 / 1.0625 }));
export const merges = (src) => events(src, 'merged').filter((e) => e.inv !== false);
export const TAP_LEAD = 0.49; // a launched car joins the ring this long after the tap

const integrate = (speed, local) => {
  if (typeof speed === 'number') return local * speed;
  let sum = 0;
  for (let i = 0; i < speed.length - 1; i++) {
    const [t0, v0] = speed[i], [t1, v1] = speed[i + 1];
    if (local <= t0) break;
    const end = Math.min(local, t1);
    sum += ((v0 + v0 + (v1 - v0) * ((end - t0) / (t1 - t0))) / 2) * (end - t0);
  }
  const [tl, vl] = speed[speed.length - 1];
  if (local > tl) sum += vl * (local - tl);
  return sum;
};
/** The cut time at which shot `s` shows source second `src`. */
export const when = (s, src) => {
  let lo = 0, hi = s.dur + 20;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (s.at + integrate(s.speed ?? 1, mid) < src) lo = mid; else hi = mid;
  }
  return s.t + lo;
};

export const VIEW = { scale: 1.08, anchor: [0.5, 0.56], punch: 0.03, push: 0.02, filter: 'contrast(1.06) saturate(1.12)' };
export const SAFE = { maxWidth: 0.8, x: 0.48 };

/** The last seconds: name, "link in bio", the address. */
export function endCard(t, dur) {
  const hold = { outDur: 0.01, drift: 0.01, ...SAFE };
  return {
    titles: [
      { ...hold, t, dur, anim: 'pop', y: 0.3, lines: [{ text: 'Roundabout', size: 1.5 }, { text: 'Timing', size: 2.3, c: 'accent' }] },
      { ...hold, t: t + 0.35, dur: dur - 0.35, anim: 'rise', y: 0.56, kicker: 'Free · plays in your browser', kickerSize: 0.32, lines: [{ text: 'timing.love', size: 1.7, c: 'mint lower' }] },
      { ...hold, t: t + 0.7, dur: dur - 0.7, anim: 'fade', y: 0.69, kicker: 'Link in bio', kickerClass: 'dark', kickerSize: 0.34, lines: [] },
    ],
    shades: [{ t: t - 0.2, dur: 0.3, from: 0, to: 0.6 }, { t: t + 0.1, dur: dur, from: 0.6, to: 0.6 }],
  };
}
