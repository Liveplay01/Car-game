import type { Career } from '../core/career';
import type { Config } from '../core/config';
import { Goals } from '../core/goals';
import { type ConditionEntry, museumId, conditionsOf } from '../core/museum';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, R, Ease, text, circle, Metrics } from './render';
import { MenuKit } from './menukit';
import { MuseumPage } from './museum';
import { textWidth } from './icons';

/** A condition of the waiting shift, as a button over the island; `isNew`: this player has never played in it. */
export interface ConditionChip {
  id: string;
  entry: ConditionEntry;
  isNew: boolean;
}

/** The sky and the city of the waiting shift (the two-lane road is the ring itself, not news). */
export function conditionChips(config: Config, career: Career): ConditionChip[] {
  return conditionsOf(config)
    .filter((e) => e.k !== 'road')
    .map((e) => ({ id: museumId(e), entry: e, isNew: !career.museumSeen.includes(museumId(e)) }));
}

/**
 * The waiting shift's conditions as icons above the prompt (Leo, 08.10.2026: icons, not words):
 * round glass buttons, each opening its Museum sheet. A tap meant for one never starts the shift:
 * the target is larger than the button, and the row keeps clear of the prompt.
 */
export const ConditionChips = {
  size: 48,
  hit: 64,
  /** Where the row sits: above the prompt, and above the line a challenge shows there. */
  center: (island: Vec2, hasLine: boolean): Vec2 => v(island.x, island.y - (hasLine ? 46 : 18) - ConditionChips.hit / 2),

  /** One tap target per chip, side by side, the row centred on `center`. */
  targets(count: number, center: Vec2): Rect[] {
    const half = ConditionChips.hit / 2;
    return Array.from({ length: count }, (_, i) => {
      const x = center.x + (i - (count - 1) / 2) * ConditionChips.hit;
      return R.make(x - half, center.y - half, x + half, center.y + half);
    });
  },

  add(list: RenderList, chips: ConditionChip[], center: Vec2, o: { time: number; reduceMotion: boolean; opacity: number; selected: string | null }): void {
    const radius = ConditionChips.size / 2;
    ConditionChips.targets(chips.length, center).forEach((target, i) => {
      const chip = chips[i];
      const enter = o.reduceMotion ? Ease.clamp01(o.time / 0.2) : MenuKit.staggerSpring(o.time, i);
      const alpha = Ease.clamp01(enter) * o.opacity;
      if (alpha <= 0.001) return;
      const at = add(R.center(target), v(0, o.reduceMotion ? 0 : MenuKit.cardEnter(enter).rise * 0.5));
      const color = MuseumPage.color(chip.entry);
      // The one whose sheet is open wears a ring in its own colour.
      if (o.selected === chip.id) list.s(circle(at, radius + 2.5), color, 0.9 * alpha);
      MenuKit.chromePill(list, at, v(ConditionChips.size, ConditionChips.size), alpha);
      for (const it of MuseumPage.icon(list, chip.entry, at, 1, ConditionChips.size - 8)) list.items.push({ ...it, opacity: it.opacity * alpha });
      if (chip.isNew) {
        const dot = add(at, v(radius * 0.72, -radius * 0.72));
        list.s(circle(dot, 6.5), 'chrome', alpha);
        list.s(circle(dot, 4.5), 'accent', alpha);
      }
    });
  },
};

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
