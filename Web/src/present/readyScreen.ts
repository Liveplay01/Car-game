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

/**
 * The notice pill above the floating buttons. `lift` keeps it above the button on screen
 * (settings on the Game tab, dispatch during a shift); Larger text makes it a step bigger and
 * lifts it by what it grew.
 */
export function addNotice(
  list: RenderList,
  notice: { text: string; age: number; duration: number },
  o: { bottomInset: number; lift: number; textScale: number; reduceMotion: boolean },
): void {
  const { text: textValue, age, duration } = notice;
  const vp = list.camera.viewport;
  const opacity = Ease.outCubic(age / 0.2) * (1 - Ease.clamp01((age - (duration - 0.5)) / 0.5));
  const rise = o.reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 18;
  const scale = o.textScale;
  const height = 30 * scale;
  const center = v(vp.x / 2, vp.y - o.bottomInset - 36 - o.lift - (height - 30) / 2 + rise);
  const size = Metrics.noticeSize * scale;
  const maxWidth = vp.x - 24;
  let fontSize = size;
  const natural = textWidth(textValue, size);
  if (natural + 32 > maxWidth) fontSize = Math.max(10 * scale, (size * (maxWidth - 32)) / natural);
  const width = Math.min(maxWidth, textWidth(textValue, fontSize) + 32);
  MenuKit.chromePill(list, center, v(width, height), opacity);
  list.s(text(textValue, center, fontSize, 'center'), 'primary', opacity);
}
