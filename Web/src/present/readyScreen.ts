import type { Career } from '../core/career';
import type { Config } from '../core/config';
import { Goals } from '../core/goals';
import { museumId, conditionsOf } from '../core/museum';
import { v } from '../core/vec2';
import { type RenderList, Ease, text, Metrics } from './render';
import type { ConditionIntro } from './hud';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S } from './strings';

/**
 * The waiting shift's conditions this player has never played in. They go into the Museum
 * when the shift starts (`sightings`), so each is explained once.
 */
export function conditionIntro(config: Config, career: Career): ConditionIntro[] {
  const seen = career.museumSeen;
  return conditionsOf(config)
    .filter((e) => !seen.includes(museumId(e)))
    .map((e) => ({ title: S.intro.title(e), text: S.intro.text(e, config), short: S.intro.short(e) }));
}

/** Hours until midnight while yesterday's streak still waits for today's Daily Shift; else null. */
export function streakEndsIn(career: Career, today: number, config: Config): number | null {
  if (!Goals.streakAtRisk(career, today)) return null;
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hours = (midnight.getTime() - now.getTime()) / 3600000;
  return hours <= config.streakWarningHours ? hours : null;
}

/** Where a notice sits: hanging under `top` (the Game tab), or standing on `bottom` (the pages). */
export type NoticePlace = { top: number } | { bottom: number };

/** How tall a notice is, Larger text included. */
export const noticeHeight = (textScale: number): number => 30 * textScale;

/** How much a notice shows at `age` (0–1): it fades in quickly and out a little slower. */
export const noticePresence = (age: number, duration: number): number => Ease.outCubic(age / 0.2) * (1 - Ease.clamp01((age - (duration - 0.5)) / 0.5));

/**
 * The notice pill. On the Game tab it hangs under the top card, out of the thumb's way (Leo:
 * a tap covered it at the bottom), and drops in from under the card; on the pages it stands
 * above the tab bar. Larger text makes it a step bigger.
 */
export function addNotice(list: RenderList, notice: { text: string; age: number; duration: number }, o: { at: NoticePlace; textScale: number; reduceMotion: boolean }): void {
  const { text: textValue, age, duration } = notice;
  const vp = list.camera.viewport;
  const opacity = noticePresence(age, duration);
  const travel = o.reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 10;
  const scale = o.textScale;
  const height = noticeHeight(scale);
  const center = 'top' in o.at ? v(vp.x / 2, o.at.top + height / 2 - travel) : v(vp.x / 2, o.at.bottom - height / 2 + travel);
  const size = Metrics.noticeSize * scale;
  const maxWidth = vp.x - 24;
  let fontSize = size;
  const natural = textWidth(textValue, size);
  if (natural + 32 > maxWidth) fontSize = Math.max(10 * scale, (size * (maxWidth - 32)) / natural);
  const width = Math.min(maxWidth, textWidth(textValue, fontSize) + 32);
  MenuKit.chromePill(list, center, v(width, height), opacity);
  list.s(text(textValue, center, fontSize, 'center'), 'primary', opacity);
}
