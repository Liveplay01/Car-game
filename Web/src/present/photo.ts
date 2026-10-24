import type { ColorToken } from './theme';
import { ResultBanner, type ShiftSummary } from './hud';
import { Skins } from './skins';
import { S, Fmt } from './strings';
import { type SignStyle, signStyle } from './signs';

export type PatternToken = 'perfect' | 'tight' | 'clean' | 'hazard' | 'strike' | 'revive';

export interface PerformancePattern {
  tokens: PatternToken[];
  perfects: number;
  tightFits: number;
  cleanMerges: number;
  isPerfectRun: boolean;
  badge: string | null;
}

/**
 * What the photo of a finished shift says (Leo, 29.09.2026: "like a shot photo, it should
 * invite"): the headline and score the result card shows, a few facts worth bragging about,
 * where it was, and a line that dares the friend who sees it.
 */
export interface PhotoCard {
  headline: string;
  tint: ColorToken;
  score: string;
  scoreLabel: string;
  newBest: boolean;
  /** At most three, the most interesting first. */
  facts: string[];
  place: string;
  /** The map's colour, for the tape on the print; null in the plain city. */
  mapColor: ColorToken | null;
  hook: string;
  pattern: PerformancePattern;
  /** The camera's reading: what it measured against the limit of the country the signs follow. A shift that was lost was speeding. */
  speed: { measured: number; limit: number; unit: 'km/h' | 'mph'; over: boolean };
  /** The number plate of the car in the frame: the crew's letters (or RAT) and the score's last four digits, in the country's pattern. */
  plate: { text: string; style: SignStyle };
}

const LIMITS: Record<SignStyle, [number, 'km/h' | 'mph']> = { eu: [50, 'km/h'], us: [25, 'mph'], uk: [30, 'mph'], jp: [40, 'km/h'], kr: [50, 'km/h'], cn: [40, 'km/h'] };

export const PhotoCard = {
  of(summary: ShiftSummary, mapSkin: string | null, crewTag: string | null = null): PhotoCard {
    const r = summary.result;
    const [headline, tint] = ResultBanner.title(summary);
    const mayhem = summary.mode === 'mayhem';
    const value = Fmt.number(mayhem ? r.flames : r.score);
    const facts = mayhem
      ? [r.wrecks > 0 ? S.photo.wrecks(r.wrecks) : null, r.biggestChain > 1 ? S.photo.chain(r.biggestChain) : null, Fmt.seconds(r.time)]
      : [r.bestCombo > 1 ? S.photo.combo(r.bestCombo) : null, r.tightFits > 0 ? S.photo.tightFits(r.tightFits) : null, r.takedowns > 0 ? S.photo.busted(r.takedowns) : null, Fmt.seconds(r.time)];

    const tokens: PatternToken[] = [];
    for (let i = 0; i < r.perfects; i++) tokens.push('perfect');
    for (let i = 0; i < r.tightFits; i++) tokens.push('tight');
    const clean = Math.max(0, r.carsSent - r.perfects - r.tightFits - r.nearMisses - r.crashes);
    for (let i = 0; i < clean; i++) tokens.push('clean');
    for (let i = 0; i < r.nearMisses; i++) tokens.push('hazard');
    for (let i = 0; i < r.crashes; i++) tokens.push(r.revived && i === r.crashes - 1 ? 'revive' : 'strike');

    if (tokens.length === 0) {
      if (r.outcome === 'completed') tokens.push('clean');
      else tokens.push('strike');
    }

    let badge: string | null = null;
    if (r.isPerfectRun && r.perfects > 0) badge = S.photo.perfectBadge;
    else if (r.perfects >= 5) badge = `${r.perfects}× PERFECT`;
    else if (r.tightFits >= 3) badge = `${r.tightFits}× TIGHT FIT`;

    const pattern: PerformancePattern = {
      tokens: tokens.slice(0, 16),
      perfects: r.perfects,
      tightFits: r.tightFits,
      cleanMerges: clean,
      isPerfectRun: r.isPerfectRun,
      badge,
    };

    const [limit, unit] = LIMITS[signStyle];
    const measured = r.outcome !== 'completed' ? limit + 5 + 4 * r.crashes : limit - (r.crashes === 0 ? 1 : 0);
    const digits = String(Math.abs(Math.round(mayhem ? r.flames : r.score)) % 10000).padStart(4, '0');

    return {
      headline,
      tint,
      score: value,
      scoreLabel: mayhem ? S.photo.flames : S.photo.score,
      newBest: summary.isNewHighscore && !summary.run,
      facts: facts.filter((x): x is string => x !== null).slice(0, 3),
      place: mapSkin ? S.shop.item(mapSkin) : S.photo.city,
      mapColor: Skins.color(mapSkin),
      hook: mayhem ? S.photo.hookFlames(value) : S.photo.hook(value),
      pattern,
      speed: { measured, limit, unit, over: measured > limit },
      plate: { text: `${crewTag ?? 'RAT'} ${digits}`, style: signStyle },
    };
  },
};
