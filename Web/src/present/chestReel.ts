import type { Cosmetic, ChestKind } from '../core/loot';
import { chestReel, rarityRank } from '../core/loot';
import { type Vec2, v, add, mul, TAU } from '../core/vec2';
import { type RenderList, rect, polygon, line, arc, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';

/** One chest opening's reel: its cards, where inside the prize's card it comes to rest, and whether the prize is Legendary. */
export interface Reel {
  cards: Cosmetic[];
  /** −0.3…0.3 of a card: the marker lands somewhere on the prize, not always dead centre. */
  nudge: number;
  legendary: boolean;
}

/**
 * The chest roulette (Leo, 28.09.2026): after the chest bursts open, a reel of cards runs
 * under a marker. It spins fast, then crawls over the last cards until it all but stops on the
 * line before the prize, and drops onto it with a last small jolt. A Legendary freezes the
 * picture in a flash of gold before its shockwave. The prize is drawn before the reel starts
 * (`chestReel`); a pure function of time, like the rest of the opening.
 */
export const ChestReel = {
  length: 44,
  stop: 38,
  /** Cards already under the marker when the reel appears, so it never starts half empty. */
  start: 3,
  enter: 0.25,
  /** The long glide: fast at first, the last few cards take most of it. */
  crawl: 3.1,
  /** Where the glide ends: just before the line into the prize's card. */
  edge: 0.56,
  /** The last jolt over the line onto the prize. */
  jolt: 0.4,
  /** A Legendary holds the picture still this long when the reel lands. */
  freeze: 0.15,
  /** The prize rests under the marker this long before its card comes. */
  hold: 0.45,
  card: v(84, 108),
  gap: 8,

  /** Seconds from the burst until the reel rests on the prize. */
  get spin(): number {
    return ChestReel.crawl + ChestReel.jolt;
  },

  /** Seconds from the burst until the prize card comes. */
  duration: (reel: Reel): number => ChestReel.spin + (reel.legendary ? ChestReel.freeze : 0) + ChestReel.hold,

  make(kind: ChestKind, prize: Cosmetic, seed: number, teaserChance: number): Reel {
    const cards = chestReel(kind, prize, seed, ChestReel.length, ChestReel.stop, teaserChance);
    const nudge = (((Math.imul(seed ^ 0x5eed7ee1, 2654435761) >>> 0) / 4294967296) - 0.5) * 0.6;
    return { cards, nudge, legendary: prize.rarity === 'legendary' };
  },

  /** Which card is under the marker `t` seconds into the spin (fractional). */
  position(reel: Reel, t: number): number {
    const R = ChestReel;
    const edge = R.stop - R.edge;
    if (t < R.crawl) {
      const x = Math.max(0, t) / R.crawl;
      // Power 5: the last three cards take about 2 of the 3.1 s, the last tenth of a card almost 1 s.
      return R.start + (edge - R.start) * (1 - Math.pow(1 - x, 5));
    }
    const to = R.stop + reel.nudge;
    if (t >= R.spin) return to;
    // Over the line with a small overshoot, like a pointer falling into its notch.
    const x = (t - R.crawl) / R.jolt;
    const back = 1.4;
    const eased = 1 + (back + 1) * Math.pow(x - 1, 3) + back * Math.pow(x - 1, 2);
    return edge + (to - edge) * eased;
  },

  /** Cards per second under the marker right now. */
  speed: (reel: Reel, t: number): number => Math.abs(ChestReel.position(reel, t + 0.01) - ChestReel.position(reel, t)) / 0.01,

  /** The card index under the marker, for the tick as each card passes. */
  passing: (reel: Reel, t: number): number => Math.round(ChestReel.position(reel, t)),

  /** Seconds since the landing's own animation began (after a Legendary's freeze); negative before. */
  sinceLanding: (reel: Reel, t: number): number => t - ChestReel.spin - (reel.legendary ? ChestReel.freeze : 0),

  add(
    list: RenderList,
    reel: Reel,
    center: Vec2,
    t: number,
    colorOf: (item: Cosmetic) => ColorToken,
    preview: (item: Cosmetic, at: Vec2, scale: number, opacity: number) => void,
  ): void {
    const R = ChestReel;
    const vp = list.camera.viewport;
    const enter = Ease.outCubic(t / R.enter);
    const since = R.sinceLanding(reel, t);
    const landed = Ease.clamp01(since / 0.3);
    const pitch = R.card.x + R.gap;
    const p = R.position(reel, t);
    const bandHeight = R.card.y + 28;
    const prizeColor = colorOf(reel.cards[R.stop]);

    list.s(rect(center, v(vp.x + 40, bandHeight * (0.9 + 0.1 * enter)), 0), 'surface', 0.9 * enter);
    for (const y of [-1, 1]) list.s(line(v(0, center.y + (y * bandHeight) / 2), v(vp.x, center.y + (y * bandHeight) / 2), 1), 'chromeEdge', enter);

    const first = Math.max(0, Math.floor(p - vp.x / 2 / pitch) - 1);
    const last = Math.min(reel.cards.length - 1, Math.ceil(p + vp.x / 2 / pitch) + 1);
    for (let i = first; i <= last; i++) {
      const item = reel.cards[i];
      const dx = (i - p) * pitch;
      // The edges of the band fade out; once the reel rests, only the prize stays bright.
      const edge = 1 - Ease.smoothstep((Math.abs(dx) - vp.x * 0.28) / (vp.x * 0.24));
      const isPrize = i === R.stop;
      const dim = isPrize ? 1 : 1 - 0.65 * landed;
      const opacity = enter * edge * dim;
      if (opacity <= 0.01) continue;
      const pop = isPrize && since > 0 ? 1 + 0.08 * Math.sin(Math.PI * Ease.clamp01(since / 0.35)) : 1;
      const at = add(center, v(dx, 0));
      const size = mul(R.card, pop);
      const color = colorOf(item);
      // Epic and Legendary cards shine a little while they run past: you see what could have been.
      if (rarityRank(item.rarity) >= 2 && !isPrize) MenuKit.glow(list, at, 58, color, 0.18 * opacity * (1 - landed));
      if (isPrize && landed > 0) MenuKit.glow(list, at, 80 * landed, color, 0.35 * landed);
      list.s(rect(at, add(size, v(3, 3)), 13), color, (isPrize ? 0.55 + 0.45 * landed : 0.55) * opacity);
      list.s(rect(at, size, 12), 'card', opacity);
      list.s(rect(at, size, 12), color, 0.1 * opacity);
      list.s(rect(add(at, v(0, size.y / 2 - 5)), v(size.x - 16, 4), 2), color, opacity);
      preview(item, add(at, v(0, -6 * pop)), 0.85 * pop, opacity);
    }

    // The marker: where the reel will stop.
    const top = center.y - bandHeight / 2;
    const bottom = center.y + bandHeight / 2;
    list.s(line(v(center.x, top + 4), v(center.x, bottom - 4), 2), 'primary', 0.35 * enter * (1 - landed));
    list.s(polygon([v(center.x - 9, top - 2), v(center.x + 9, top - 2), v(center.x, top + 10)]), 'primary', enter);
    list.s(polygon([v(center.x - 9, bottom + 2), v(center.x + 9, bottom + 2), v(center.x, bottom - 10)]), 'primary', enter);

    // Landing on a Legendary: the picture holds in a white flash turning gold, then a shockwave.
    if (reel.legendary && t >= R.spin) {
      const held = t - R.spin;
      const flash = held < R.freeze ? 1 : 1 - Ease.clamp01((held - R.freeze) / 0.25);
      if (flash > 0) {
        list.s(rect(mul(vp, 0.5), vp), 'primary', 0.55 * flash * (held < R.freeze ? 1 - held / R.freeze : 0));
        list.s(rect(mul(vp, 0.5), vp), prizeColor, 0.35 * flash);
      }
      for (const [delay, reach] of [[0, 1], [0.1, 0.7]] as const) {
        const x = (since - delay) / 0.6;
        if (x <= 0 || x >= 1) continue;
        list.s(arc(center, 40 + vp.x * 0.8 * reach * Ease.outCubic(x), 8 * (1 - x) + 1, 0, TAU), prizeColor, 0.8 * (1 - x));
      }
    }
  },
};
