import { type SaveGame, type Career, Careers, MASTERY_GOALS, MASTERY_THRESHOLDS, masteryValue } from '../core/career';
import { Unlocks } from '../core/unlocks';
import { COSMETICS } from '../core/loot';
import { challengesOf, challengeReward } from '../core/daily';
import { TRIALS, type TrialId } from '../core/trials';
import { weekNumber, weekDaysLeft, weeklyTrial } from '../core/weekly';
import { baseConfig } from '../core/config';
import { Elite } from '../core/elite';
import { averageOffset } from '../core/timing';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, line, text, Ease, Metrics, moved, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag, textWidth } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import type { ProgressSection } from './flow';
import { MuseumPage, MuseumState, type MuseumTarget } from './museum';

/** What the Progress tab shows and animates (`ProgressPage.State`). */
export class ProgressState {
  section: ProgressSection = 0;
  age = 0;
  /** Seconds the page has been open: the police lights in the Museum keep flashing. */
  time = 0;
  sectionSlide: { from: ProgressSection; age: number } | null = null;
  museum = new MuseumState();

  select(next: ProgressSection): void {
    if (next === this.section) return;
    this.sectionSlide = { from: this.section, age: 0 };
    this.section = next;
    this.age = 0;
  }

  advance(delta: number): void {
    this.age += delta;
    this.time += delta;
    this.museum.advance(delta);
    if (this.sectionSlide) {
      this.sectionSlide.age += delta;
      if (this.sectionSlide.age >= ShopPage.slideDuration) this.sectionSlide = null;
    }
  }
}

interface Layout {
  segments: [ProgressSection, Rect][];
  content: Rect;
}

const PROGRESS_SECTIONS: ProgressSection[] = [0, 1, 2, 3, 4];

function t(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, opacity: number, o: { weight?: Weight; align?: Align } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, opacity);
}

/** The Progress tab: records, today's quests, the achievements. */
export const ProgressPage = {
  gap: 12,

  records(save: SaveGame): { label: string; value: string }[] {
    const c = save.career;
    const m = c.mastery;
    const P = S.progress;
    const count = (n: number): string => (n > 0 ? Fmt.number(n) : P.none);
    return [
      { label: P.highscore, value: count(save.highscore) },
      { label: P.level, value: Fmt.number(c.level) },
      { label: P.unlimitedBest, value: count(save.unlimitedBest) },
      { label: P.unlimitedCars, value: count(save.unlimitedBestCars) },
      { label: P.mayhemBest, value: count(save.mayhemBest) },
      { label: P.mayhemChain, value: save.mayhemBestChain > 0 ? `×${save.mayhemBestChain}` : P.none },
      { label: P.bestCombo, value: count(m.bestCombo) },
      { label: P.bestChain, value: count(m.bestChain) },
      { label: P.streak, value: c.dailyStreak > 0 ? P.days(c.dailyStreak) : P.none },
      { label: P.shiftsPlayed, value: count(save.shiftsPlayed) },
      { label: P.shiftsCompleted, value: count(m.shiftsCompleted) },
      { label: P.takedowns, value: count(m.takedowns) },
      { label: P.bosses, value: count(c.bossTrophies) },
      { label: P.prestige, value: c.prestige > 0 ? S.prestige.caption(c.prestige) : P.none },
      { label: P.legendary, value: count(c.legendaryDone) },
      { label: P.weeklies, value: count(c.weekliesDone) },
      { label: P.ambulances, value: count(m.ambulances) },
      { label: P.transporters, value: count(m.transporters) },
      { label: P.perfects, value: count(m.perfects) },
      { label: P.chestsOpened, value: count(c.chestsOpened) },
      { label: P.collection, value: P.owned(COSMETICS.filter((x) => Careers.owns(c, x.id)).length, COSMETICS.length) },
      { label: P.timingLabel(baseConfig.timingSamples), value: P.timing(averageOffset(c, baseConfig), baseConfig.timingOnBeat) },
    ];
  },

  layout(viewport: Vec2, bottomInset: number): Layout {
    const width = Math.min(viewport.x - 2 * ProgressPage.gap, 460);
    const left = (viewport.x - width) / 2;
    const top = Metrics.sceneInsets.top + 22;
    const sw = width / PROGRESS_SECTIONS.length;
    return {
      segments: PROGRESS_SECTIONS.map((s, i): [ProgressSection, Rect] => [s, R.make(left + i * sw, top, left + (i + 1) * sw, top + ShopPage.segmentHeight)]),
      content: R.make(left, top + ShopPage.segmentHeight + ProgressPage.gap, left + width, viewport.y - bottomInset - ProgressPage.gap),
    };
  },

  sectionAt(point: Vec2, viewport: Vec2, bottomInset: number): ProgressSection | null {
    return ProgressPage.layout(viewport, bottomInset).segments.find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  add(list: RenderList, save: SaveGame, today: number, state: ProgressState, reduceMotion: boolean, bottomInset: number): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    MenuKit.header(list, S.tabs.progress, Fmt.number(save.career.money), vp);
    const l = ProgressPage.layout(vp, bottomInset);
    const chosen = state.section;
    let thumb: number = chosen;
    const slide = state.sectionSlide;
    if (slide) thumb = slide.from + (chosen - slide.from) * (reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration));
    const last = l.segments[l.segments.length - 1][1];
    const locked = PROGRESS_SECTIONS.map((i) => i === 2 && !Unlocks.isOpen(save.career, 'trials'));
    MenuKit.segmented(list, PROGRESS_SECTIONS.map((i) => S.progress.section(i)), chosen, thumb, R.make(l.segments[0][1].minX, l.segments[0][1].minY, last.maxX, last.maxY), locked);
    if (save.career.museumNew.length > 0) {
      const r = l.segments[3][1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.progress.section(3), 13) / 2 + 7, R.center(r).y - 6), 1);
    }

    const start = list.items.length;
    ProgressPage.addSection(list, state.section, l, save, today, state, state.age, reduceMotion);
    if (!slide) return;
    const side = state.section > slide.from ? 1 : -1;
    const spring = reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration);
    const shift = v(side * R.width(l.content) * 0.45 * (1 - spring), 0);
    const fade = Ease.outCubic(slide.age / 0.18);
    for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
    const gone = Ease.outCubic(slide.age / ShopPage.slideOut);
    if (gone >= 1) return;
    const old = new List(list.camera, list.background);
    ProgressPage.addSection(old, slide.from, l, save, today, state, 10, true);
    const away = v(reduceMotion ? 0 : -side * R.width(l.content) * 0.3 * gone, 0);
    list.items.splice(start, 0, ...old.items.map((i) => moved(i, away, 1 - gone)));
  },

  addSection(list: RenderList, section: ProgressSection, l: Layout, save: SaveGame, today: number, state: ProgressState, age: number, reduceMotion: boolean): void {
    if (section === 0) ProgressPage.addRecords(list, l, save, age, reduceMotion);
    else if (section === 1) ProgressPage.addQuests(list, l, save.career, today, age, reduceMotion);
    else if (section === 2) ProgressPage.addTrials(list, l, save.career, age, reduceMotion);
    else if (section === 3) MuseumPage.add(list, l.content, save.career, state.museum, age, state.time, reduceMotion);
    else ProgressPage.addAchievements(list, l, save.career, age, reduceMotion);
  },

  /**
   * The Elite card sits above the records from Level 40 on, and for good once Level 50 was
   * reached. It is the door to the late game: its sheet holds the track, the titles and Prestige.
   */
  showsElite: (c: Career): boolean => Elite.isOpen(c) || c.level >= baseConfig.prestigeLevel - 10,

  eliteCard(l: Layout): Rect {
    return R.make(l.content.minX, l.content.minY, l.content.maxX, l.content.minY + 76);
  },

  /** A tap on the Elite card: the sheet with the track and the titles. */
  eliteAt(point: Vec2, viewport: Vec2, bottomInset: number, c: Career): boolean {
    if (!ProgressPage.showsElite(c)) return false;
    return R.contains(ProgressPage.eliteCard(ProgressPage.layout(viewport, bottomInset)), point);
  },

  /** Elite level, title, the bar to the next level and what the next milestone brings. */
  addEliteCard(list: RenderList, card: Rect, c: Career, o: number): void {
    ProgressPage.panel(list, card, o);
    const open = Elite.isOpen(c);
    const top = card.minY + 22;
    t(list, open ? S.elite.caption(Elite.level(c)) : S.elite.title, v(card.minX + 16, top), 15, open ? 'coin' : 'muted', o, { weight: 'bold' });
    const badges = [c.prestige > 0 ? S.prestige.caption(c.prestige) : null, c.title ? S.titles.name(c.title) : null].filter((x): x is string => !!x);
    t(list, [...badges, '›'].join(' · ').replace(' · ›', ' ›'), v(card.maxX - 16, top), 12, badges.length > 0 ? 'coin' : 'muted', o, { weight: 'bold', align: 'trailing' });
    const barY = card.minY + 42;
    const barWidth = R.width(card) - 32;
    list.s(rect(v(R.center(card).x, barY), v(barWidth, 5), 2.5), 'controlFill', o);
    const { into, need } = Elite.progress(c);
    const fraction = open ? Ease.clamp01(into / need) : 0;
    if (fraction > 0) {
      const filled = Math.max(5, barWidth * fraction);
      list.s(rect(v(card.minX + 16 + filled / 2, barY), v(filled, 5), 2.5), 'coin', o);
    }
    const bottom = card.minY + 60;
    if (!open) {
      const hint = S.elite.locked(baseConfig.prestigeLevel);
      t(list, hint, v(card.minX + 16, bottom), ShopPage.fitted(hint, 11, barWidth), 'muted', o);
      return;
    }
    const xp = S.elite.xp(into, need);
    t(list, xp, v(card.minX + 16, bottom), 11, 'muted', o);
    // Prestige in reach says so; otherwise the card names what comes next.
    const next = Elite.nextMilestone(c);
    const ready = Careers.canPrestige(c);
    const line = ready ? S.elite.prestigeReady : next ? S.elite.next(next) : null;
    if (line) {
      const room = barWidth - textWidth(xp, 11) - 16;
      t(list, line, v(card.maxX - 16, bottom), ShopPage.fitted(line, 11, room), ready ? 'coin' : 'muted', o, { align: 'trailing', weight: ready ? 'bold' : 'regular' });
    }
  },

  entering(r: Rect, age: number, index: number, reduceMotion: boolean): [Rect, number] {
    if (reduceMotion) return [r, 1];
    const rise = MenuKit.cardEnter(MenuKit.staggerSpring(age, index)).rise;
    return [R.offset(r, v(0, rise)), MenuKit.stagger(age, index)];
  },

  panel(list: RenderList, r: Rect, opacity: number): void {
    list.s(rect(R.center(r), v(R.width(r), R.height(r)), ShopPage.corner), 'card', opacity);
  },

  addRecords(list: RenderList, l: Layout, save: SaveGame, age: number, reduceMotion: boolean): void {
    const records = ProgressPage.records(save);
    const c = save.career;
    let area = l.content;
    if (ProgressPage.showsElite(c)) {
      const [card, o] = ProgressPage.entering(ProgressPage.eliteCard(l), age, 0, reduceMotion);
      ProgressPage.addEliteCard(list, card, c, o);
      area = R.make(l.content.minX, ProgressPage.eliteCard(l).maxY + ProgressPage.gap, l.content.maxX, l.content.maxY);
    }
    const cells = ShopPage.grid(records.length, 2, area, 74);
    records.forEach((record, i) => {
      const [r, o] = ProgressPage.entering(cells[i], age, i + 1, reduceMotion);
      ProgressPage.panel(list, r, o);
      const c = R.center(r);
      const empty = record.value === S.progress.none;
      t(list, record.value, v(r.minX + 16, c.y - 8), ShopPage.fitted(record.value, 22, R.width(r) - 32), empty ? 'muted' : 'primary', o, { weight: 'bold' });
      t(list, record.label, v(r.minX + 16, c.y + 16), 11, 'muted', o);
    });
  },

  questRows: (l: Layout): Rect[] => ShopPage.grid(6, 1, l.content, 64),

  /** A tap on the Weekly Elite row (Quests): its shift waits on the Game tab. */
  weeklyAt(point: Vec2, viewport: Vec2, bottomInset: number): boolean {
    return R.contains(ProgressPage.questRows(ProgressPage.layout(viewport, bottomInset))[1], point);
  },

  addQuests(list: RenderList, l: Layout, career: Career, today: number, age: number, reduceMotion: boolean): void {
    const rows = ProgressPage.questRows(l);
    let index = 0;
    const row = (): [Rect, number] => ProgressPage.entering(rows[index], age, index++, reduceMotion);

    const [daily, dO] = row();
    ProgressPage.panel(list, daily, dO);
    const open = Careers.isDailyOpen(career, today);
    const dc = R.center(daily);
    t(list, S.daily.title, v(daily.minX + 16, dc.y - 9), 14, 'primary', dO, { weight: 'bold' });
    if (!Unlocks.isOpen(career, 'daily')) {
      // Not yet: the row says when, nothing more.
      const at = Unlocks.level('daily');
      t(list, S.unlocks.opensAt(S.daily.title, at), v(daily.minX + 16, dc.y + 11), 11, 'muted', dO);
      t(list, S.unlocks.lockedTag(at), v(daily.maxX - 16, dc.y - 9), 13, 'muted', dO, { weight: 'bold', align: 'trailing' });
    } else {
      t(list, open ? S.daily.readyHint : S.daily.doneHint(career.dailyStreak), v(daily.minX + 16, dc.y + 11), ShopPage.fitted(S.daily.readyHint, 11, R.width(daily) - 32), 'muted', dO);
      t(list, open ? S.daily.ready : S.daily.done, v(daily.maxX - 16, dc.y - 9), 13, open ? 'hazard' : 'accent', dO, { weight: 'bold', align: 'trailing' });
    }

    // The Weekly Elite: one shift for the whole week, tap to play it.
    const [weekly, wO] = row();
    ProgressPage.panel(list, weekly, wO);
    const week = weekNumber(today);
    const elite = weeklyTrial(week);
    const passed = Careers.isWeeklyDone(career, week);
    const wc = R.center(weekly);
    t(list, `${S.weekly.caption} · ${S.weekly.elite(elite.elite ?? 'flawless')}`, v(weekly.minX + 16, wc.y - 9), 14, 'coin', wO, { weight: 'bold' });
    const goal = passed ? S.weekly.passedThisWeek : S.weekly.goal(elite);
    t(list, goal, v(weekly.minX + 16, wc.y + 11), ShopPage.fitted(goal, 11, R.width(weekly) - 120), 'muted', wO);
    if (passed) t(list, S.daily.done, v(weekly.maxX - 16, wc.y - 9), 13, 'accent', wO, { weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(elite.reward), v(weekly.maxX - 16, wc.y - 9), 13, 'trailing', 'primary', 'accent', wO);
    t(list, `${S.weekly.daysLeft(weekDaysLeft(today))} · ${S.trials.play} ›`, v(weekly.maxX - 16, wc.y + 11), 11, 'coin', wO, { weight: 'bold', align: 'trailing' });

    for (const challenge of challengesOf(today)) {
      const [r, o] = row();
      const c = R.center(r);
      const done = Careers.isChallengeDone(career, challenge, today);
      ProgressPage.panel(list, r, o);
      const box = v(r.minX + 24, c.y);
      list.s(circle(box, 9), done ? 'accent' : 'controlFill', o);
      if (done) {
        list.s(line(add(box, v(-4, 0)), add(box, v(-1, 3.5)), 2), 'accentInk', o);
        list.s(line(add(box, v(-1, 3.5)), add(box, v(4.5, -3.5)), 2), 'accentInk', o);
      }
      t(list, S.daily.challenge(challenge), v(r.minX + 44, c.y), 13, done ? 'muted' : 'primary', o, { weight: 'bold' });
      if (done) t(list, S.daily.done, v(r.maxX - 16, c.y), 13, 'accent', o, { weight: 'bold', align: 'trailing' });
      else moneyTag(list, Fmt.number(challengeReward(challenge)), v(r.maxX - 16, c.y), 13, 'trailing', 'primary', 'accent', o);
    }

    const [streak, sO] = row();
    ProgressPage.panel(list, streak, sO);
    const sc = R.center(streak);
    t(list, S.daily.streakLine(career.dailyStreak), v(streak.minX + 16, sc.y - 9), 13, 'primary', sO, { weight: 'bold' });
    const next = Careers.nextStreakMilestone(career);
    t(list, next ? S.daily.nextMilestone(next.left, next.item) : S.progress.questsHint, v(streak.minX + 16, sc.y + 11), 11, 'muted', sO);
  },

  trialRows: (l: Layout): Rect[] => ShopPage.grid(TRIALS.length, 1, l.content, 64),

  /** The trial under a tap on the Trials section: it starts on the Game tab. */
  trialAt(point: Vec2, viewport: Vec2, bottomInset: number): TrialId | null {
    const rows = ProgressPage.trialRows(ProgressPage.layout(viewport, bottomInset));
    const index = rows.findIndex((r) => R.contains(r, point));
    return index < 0 ? null : (TRIALS[index].id as TrialId);
  },

  /** Mastery trials: fixed shifts with a goal. Tap one to play it; each pays once. */
  addTrials(list: RenderList, l: Layout, career: Career, age: number, reduceMotion: boolean): void {
    const rows = ProgressPage.trialRows(l);
    TRIALS.forEach((trial, i) => {
      const [r, o] = ProgressPage.entering(rows[i], age, i, reduceMotion);
      ProgressPage.panel(list, r, o);
      const c = R.center(r);
      const done = career.trialsDone.includes(trial.id);
      const box = v(r.minX + 24, c.y);
      list.s(circle(box, 9), done ? 'accent' : 'controlFill', o);
      if (done) {
        list.s(line(add(box, v(-4, 0)), add(box, v(-1, 3.5)), 2), 'accentInk', o);
        list.s(line(add(box, v(-1, 3.5)), add(box, v(4.5, -3.5)), 2), 'accentInk', o);
      }
      t(list, S.trials.name(trial.id), v(r.minX + 44, c.y - 9), 14, 'primary', o, { weight: 'bold' });
      // The goal shrinks before it runs into "Play ›" on a narrow phone.
      const goal = `${S.trials.level(trial.level)} · ${S.trials.goal(trial)}`;
      t(list, goal, v(r.minX + 44, c.y + 11), ShopPage.fitted(goal, 11, R.width(r) - 44 - 16 - textWidth(`${S.trials.play} ›`, 11) - 12), 'muted', o);
      if (done) t(list, S.trials.passed, v(r.maxX - 16, c.y - 9), 12, 'accent', o, { weight: 'bold', align: 'trailing' });
      else moneyTag(list, Fmt.number(trial.reward), v(r.maxX - 16, c.y - 9), 13, 'trailing', 'primary', 'accent', o);
      t(list, `${S.trials.play} ›`, v(r.maxX - 16, c.y + 11), 11, done ? 'muted' : 'accent', o, { weight: 'bold', align: 'trailing' });
    });
  },

  /** A tap on the Museum section: a shelf chip or an entry. */
  museumAt(point: Vec2, viewport: Vec2, bottomInset: number, state: ProgressState): MuseumTarget | null {
    return MuseumPage.targetAt(point, ProgressPage.layout(viewport, bottomInset).content, state.museum.shelf);
  },

  addAchievements(list: RenderList, l: Layout, career: Career, age: number, reduceMotion: boolean): void {
    const rows = ShopPage.grid(MASTERY_GOALS.length, 1, l.content, 58);
    MASTERY_GOALS.forEach((goal, i) => {
      const [r, o] = ProgressPage.entering(rows[i], age, i, reduceMotion);
      ProgressPage.panel(list, r, o);
      const c = R.center(r);
      const thresholds = MASTERY_THRESHOLDS[goal];
      const tiers = thresholds.length;
      const reached = Math.min(career.masteryTiers[goal] ?? 0, tiers);
      const complete = reached >= tiers;
      const top = c.y - R.height(r) * 0.2;
      const pipsWidth = tiers * 14;
      t(list, S.mastery.name(goal), v(r.minX + 16, top), 13, 'primary', o, { weight: 'bold' });
      t(list, S.mastery.detail(goal, reached), v(r.maxX - 16 - pipsWidth - 6, top), 11, complete ? 'accent' : 'muted', o, { align: 'trailing' });
      for (let tier = 0; tier < tiers; tier++) list.s(circle(v(r.maxX - 16 - pipsWidth + tier * 14 + 7, top), 5), tier < reached ? 'accent' : 'controlFill', o);
      const from = reached === 0 ? 0 : thresholds[reached - 1];
      const fraction = complete ? 1 : Ease.clamp01((masteryValue(goal, career.mastery) - from) / Math.max(1, thresholds[reached] - from));
      const barY = c.y + R.height(r) * 0.22;
      const barWidth = R.width(r) - 32;
      list.s(rect(v(c.x, barY), v(barWidth, 5), 2.5), 'controlFill', o);
      if (fraction > 0) {
        const filled = Math.max(5, barWidth * fraction);
        list.s(rect(v(r.minX + 16 + filled / 2, barY), v(filled, 5), 2.5), 'accent', o);
      }
    });
  },
};
