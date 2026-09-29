import type { ColorToken } from './theme';
import { ResultBanner, type ShiftSummary } from './hud';
import { Skins } from './skins';
import { S, Fmt } from './strings';

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
}

export const PhotoCard = {
  of(summary: ShiftSummary, mapSkin: string | null): PhotoCard {
    const r = summary.result;
    const [headline, tint] = ResultBanner.title(summary);
    const mayhem = summary.mode === 'mayhem';
    const value = Fmt.number(mayhem ? r.flames : r.score);
    const facts = mayhem
      ? [r.wrecks > 0 ? S.photo.wrecks(r.wrecks) : null, r.biggestChain > 1 ? S.photo.chain(r.biggestChain) : null, Fmt.seconds(r.time)]
      : [r.bestCombo > 1 ? S.photo.combo(r.bestCombo) : null, r.tightFits > 0 ? S.photo.tightFits(r.tightFits) : null, r.takedowns > 0 ? S.photo.busted(r.takedowns) : null, Fmt.seconds(r.time)];
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
    };
  },
};
