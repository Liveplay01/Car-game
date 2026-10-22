import type { Career } from '../core/career';
import type { Config } from '../core/config';
import { Goals } from '../core/goals';
import { type ConditionEntry, type MuseumEntry, museumId, conditionsOf } from '../core/museum';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, R, Ease, text, drawText, circle, Metrics } from './render';
import { MenuKit } from './menukit';
import { FAIL_CHIP_SIZE, TopBar } from './hud';
import { MuseumPage } from './museum';
import { iconClock } from './conditionIcons';
import { textWidth, drawFitted } from './icons';
import { S } from './strings';
import type { AchievementCard, ShownNotice } from './notices';

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

/** The mouse is over the icon's button (`hit` points square). */
const overIcon = (list: RenderList, at: Vec2, hit: number): boolean => list.pointer !== null && Math.abs(list.pointer.x - at.x) <= hit / 2 && Math.abs(list.pointer.y - at.y) <= hit / 2;

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
      for (const it of MuseumPage.icon(list, chip.entry, at, 1, ConditionChips.size - 8, o.reduceMotion ? Infinity : iconClock(`chip:${chip.id}`, o.time, 'loop', overIcon(list, at, ConditionChips.hit), 0.15 + i * 0.12))) list.items.push({ ...it, opacity: it.opacity * alpha });
      if (chip.isNew) {
        const dot = add(at, v(radius * 0.72, -radius * 0.72));
        list.s(circle(dot, 6.5), 'chrome', alpha);
        list.s(circle(dot, 4.5), 'accent', alpha);
      }
    });
  },
};

/**
 * How a lost shift was lost, as an icon on the result (Leo, 15.10.2026: icons, not a sentence). It sits in the island's
 * top row (`ResultBanner.add` places it) and opens the Museum's sheet for that failure.
 */
export const FailChip = {
  size: FAIL_CHIP_SIZE,
  hit: 64,
  target: (center: Vec2): Rect => R.make(center.x - FailChip.hit / 2, center.y - FailChip.hit / 2, center.x + FailChip.hit / 2, center.y + FailChip.hit / 2),

  /** The icon opens the complete failure entry in the Museum; keeping the prose there leaves the island readable. */
  add(list: RenderList, entry: Extract<MuseumEntry, { k: 'fail' }>, center: Vec2, o: { age: number; reduceMotion: boolean; opacity: number; selected: boolean; isNew: boolean }): void {
    const enter = o.reduceMotion ? Ease.clamp01(o.age / 0.2) : MenuKit.staggerSpring(o.age - 0.1, 0);
    const alpha = Ease.clamp01(enter) * o.opacity;
    if (alpha <= 0.001) return;
    const radius = FailChip.size / 2;
    const at = add(center, v(0, o.reduceMotion ? 0 : MenuKit.cardEnter(enter).rise * 0.5));
    list.s(circle(at, radius + (o.selected ? 3 : 1.5)), 'destructive', (o.selected ? 0.9 : 0.55) * alpha);
    MenuKit.chromePill(list, at, v(FailChip.size, FailChip.size), alpha);
    for (const it of MuseumPage.icon(list, entry, at, 1, FailChip.size - 8, o.reduceMotion ? Infinity : iconClock('chip:fail', o.age, 'loop', overIcon(list, at, FailChip.hit), 0.3))) list.items.push({ ...it, opacity: it.opacity * alpha });
    if (o.isNew) {
      const dot = add(at, v(radius * 0.72, -radius * 0.72));
      list.s(circle(dot, 6.5), 'chrome', alpha);
      list.s(circle(dot, 4.5), 'accent', alpha);
    }
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

/** Where a notice sits: under the numbers in the grown top card (the Game tab), or standing on `bottom` (the pages). */
export type NoticePlace = 'card' | { bottom: number };

/**
 * On the Game tab the top card grows to carry the notice (Leo, 20.10.2026), like the Dynamic Island: the numbers stay where
 * they are, the glass reaches down on a spring (`RenderList.topGrow`, `TopBar.addCard`), the words stand under the numbers,
 * then it folds back. Only down, never sideways: the card keeps its margin to the screen's edge. What hangs under the card
 * glides down with it (`TopBar.foot`).
 */
export const NoticeIsland = {
  grow: 0.56,
  shrink: 0.34,
  wordsAt: 0.12,
  wordsIn: 0.22,
  wordsOut: 0.12,
  pad: 24,
  top: 4,
  bottom: 14,

  room: (bar: Rect): number => R.width(bar) - 2 * NoticeIsland.pad,

  /** How far below its usual foot the card reaches when it is fully open. */
  depth(notice: ShownNotice, bar: Rect, textScale: number): number {
    if (notice.achievement) return NoticeIsland.top + noticeHeight(textScale, true) + NoticeIsland.bottom / 2;
    const fit = TopBar.fitBrief(notice.text, NoticeIsland.room(bar), textScale);
    return NoticeIsland.top + fit.lines.length * fit.size * 1.25 + NoticeIsland.bottom;
  },

  /** How far it is open: a spring out (a little past, once), the drawer's ease back. */
  open(age: number, duration: number, reduceMotion: boolean): number {
    if (reduceMotion) return 1;
    const fold = Ease.clamp01((duration - age) / NoticeIsland.shrink);
    return Ease.spring(age / NoticeIsland.grow) * (1 - Ease.outCubic(1 - fold));
  },

  reach: (notice: ShownNotice, bar: Rect, textScale: number, reduceMotion: boolean): number =>
    NoticeIsland.depth(notice, bar, textScale) * NoticeIsland.open(notice.age, notice.duration, reduceMotion),
};

/** The words in the grown card: they rise in once it has room, and leave before it folds. */
function addCardNotice(list: RenderList, notice: ShownNotice, o: { textScale: number; reduceMotion: boolean }): void {
  const { age, duration, achievement } = notice;
  const rm = o.reduceMotion;
  const bar = TopBar.frame(list.camera.viewport.x);
  const words =
    (rm ? noticePresence(age, duration) : Ease.clamp01((age - NoticeIsland.wordsAt) / NoticeIsland.wordsIn)) *
    Ease.clamp01((duration - age - NoticeIsland.shrink) / NoticeIsland.wordsOut);
  if (words <= 0.001) return;
  const rise = rm ? 0 : (1 - Ease.outCubic((age - NoticeIsland.wordsAt) / NoticeIsland.wordsIn)) * 4;
  const top = bar.maxY + NoticeIsland.top + rise;
  if (achievement) {
    const area = R.make(bar.minX + 6, top, bar.maxX - 6, top + noticeHeight(o.textScale, true));
    achievementContent(list, achievement, area, { age: age - NoticeIsland.wordsAt, opacity: words, scale: o.textScale, reduceMotion: rm });
    return;
  }
  const fit = TopBar.fitBrief(notice.text, NoticeIsland.room(bar), o.textScale);
  const lineHeight = fit.size * 1.25;
  const x = R.center(bar).x;
  fit.lines.forEach((ln, i) => list.s(text(ln, v(x, top + lineHeight * (i + 0.5)), fit.size, 'center', 'bold'), 'primary', words));
}

/** How tall a notice is, Larger text included; an achievement's card is nearly twice a line. */
export const noticeHeight = (textScale: number, achievement = false): number => (achievement ? 54 : 30) * textScale;

/** How much a notice shows at `age` (0–1): it fades in quickly and out a little slower. */
export const noticePresence = (age: number, duration: number): number => Ease.outCubic(age / 0.2) * (1 - Ease.clamp01((age - (duration - 0.5)) / 0.5));

/**
 * A notice. On the Game tab it stands in the grown top card (`NoticeIsland`), out of the thumb's way;
 * on the pages it is a pill above the tab bar. Larger text makes it a step bigger.
 */
export function addNotice(list: RenderList, notice: ShownNotice, o: { at: NoticePlace; textScale: number; reduceMotion: boolean }): void {
  if (o.at === 'card') {
    addCardNotice(list, notice, o);
    return;
  }
  const { text: textValue, age, duration, achievement } = notice;
  const vp = list.camera.viewport;
  const opacity = noticePresence(age, duration);
  const scale = o.textScale;
  const height = noticeHeight(scale, achievement !== null);
  const travel = o.reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * (achievement ? 18 : 10);
  const center = v(vp.x / 2, o.at.bottom - height / 2 + travel);
  if (achievement) {
    addAchievementCard(list, achievement, center, height, { age, opacity, scale, reduceMotion: o.reduceMotion });
    return;
  }
  const size = Metrics.noticeSize * scale;
  const maxWidth = vp.x - 24;
  let fontSize = size;
  const natural = textWidth(textValue, size);
  if (natural + 32 > maxWidth) fontSize = Math.max(10 * scale, (size * (maxWidth - 32)) / natural);
  const width = Math.min(maxWidth, textWidth(textValue, fontSize) + 32);
  MenuKit.chromePill(list, center, v(width, height), opacity);
  list.s(text(textValue, center, fontSize, 'center'), 'primary', opacity);
}

/**
 * An achievement is not a line of news: a gold-rimmed card with a medal (the tier in it, a ring
 * of light spreading from it once), the family's name and what it paid.
 */
function addAchievementCard(list: RenderList, card: AchievementCard, center: Vec2, height: number, o: { age: number; opacity: number; scale: number; reduceMotion: boolean }): void {
  const { opacity, scale } = o;
  const pad = 14 * scale;
  const medal = 18 * scale;
  const gap = 12 * scale;
  const reward = textWidth(card.reward, 14 * scale);
  const maxWidth = list.camera.viewport.x - 24;
  const chrome = pad * 2 + medal * 2 + gap * 2 + reward;
  const textRoom = Math.min(maxWidth - chrome, Math.max(textWidth(card.title, 16 * scale), textWidth(S.ach.caption, 10 * scale)));
  const width = chrome + textRoom;
  const left = center.x - width / 2;
  const frame = R.make(left, center.y - height / 2, left + width, center.y + height / 2);
  MenuKit.chromePanel(list, frame, height / 2, opacity, 'coin');
  achievementContent(list, card, frame, o);
}

/** The medal, the family's name and what it paid, laid out across `frame`. */
function achievementContent(list: RenderList, card: AchievementCard, frame: Rect, o: { age: number; opacity: number; scale: number; reduceMotion: boolean }): void {
  const { age, opacity, scale } = o;
  const pad = 14 * scale;
  const medal = 18 * scale;
  const gap = 12 * scale;
  const captionSize = 10 * scale;
  const titleSize = 16 * scale;
  const rewardSize = 14 * scale;
  const center = R.center(frame);
  const height = R.height(frame);
  const medalAt = v(frame.minX + pad + medal, center.y);
  const pulse = o.reduceMotion ? 1 : Ease.clamp01((age - 0.15) / 0.9);
  if (pulse < 1) list.s(circle(medalAt, medal * (1 + 0.9 * Ease.outCubic(pulse))), 'coin', 0.4 * (1 - pulse) * opacity);
  list.s(circle(medalAt, medal), 'coin', opacity);
  list.s(circle(medalAt, medal - 3 * scale), 'coin', opacity * 0.35);
  drawText(list, card.tier, medalAt, 15 * scale, 'background', { opacity, weight: 'bold', align: 'center' });
  const textLeft = frame.minX + pad + medal * 2 + gap;
  const textRoom = frame.maxX - pad - textWidth(card.reward, rewardSize) - gap - textLeft;
  drawText(list, S.ach.caption, v(textLeft, center.y - height * 0.2), captionSize, 'coin', { opacity, weight: 'bold' });
  drawFitted(list, card.title, v(textLeft, center.y + height * 0.14), titleSize, textRoom, 'primary', { opacity, weight: 'bold' });
  drawText(list, card.reward, v(frame.maxX - pad, center.y), rewardSize, 'coin', { opacity, weight: 'bold', align: 'trailing' });
}
