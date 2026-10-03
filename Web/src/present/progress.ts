import { type SaveGame, type Career, type MasteryGoal, Careers, MASTERY_GOALS, MASTERY_THRESHOLDS, masteryValue } from '../core/career';
import { Unlocks } from '../core/unlocks';
import { COSMETICS, cosmetic } from '../core/loot';
import { FEATS, Feats, type Feat } from '../core/feats';
import { type Challenge, challengesOf, challengeReward } from '../core/daily';
import { type Trial, type TrialId, TRIALS, ASCENSIONS, LANDMARKS, LANDMARK_PRESTIGE, RUSH_ID, RUSH_REWARD, rushOpen, trialOpen } from '../core/trials';
import { weekNumber, weekDaysLeft, weeklyTrial } from '../core/weekly';
import { baseConfig, BOSS_KINDS } from '../core/config';
import { Elite } from '../core/elite';
import { SeasonPass, PASS_TIERS } from '../core/seasonPass';
import { type MuseumEntry, MUSEUM_SHELVES, shelfEntries, museumId } from '../core/museum';
import { averageOffset } from '../core/timing';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, line, text, Ease, Metrics, moved, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag, textWidth } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import type { ProgressSection } from './flow';
import { MuseumPage, MuseumState } from './museum';
import { Scroller, clipTo } from './scroll';
import { knownRank, leaderboardEnabled } from '../net/leaderboard';

/** What the Progress tab shows and animates (`ProgressPage.State`); each section is a list that scrolls. */
export class ProgressState extends Scroller {
  section: ProgressSection = 0;
  age = 0;
  /** Seconds the page has been open: the police lights in the Museum keep flashing. */
  time = 0;
  /** The section going out, and where it stood. */
  sectionSlide: { from: ProgressSection; age: number; scroll: number } | null = null;
  museum = new MuseumState();
  /** The Feat in the detail sheet (Goals). */
  feat: string | null = null;
  /** Records: the long list of every stat, folded away until asked for. */
  statsOpen = false;

  select(next: ProgressSection): void {
    if (next === this.section) return;
    this.sectionSlide = { from: this.section, age: 0, scroll: this.scroll };
    this.section = next;
    this.age = 0;
    this.reset();
  }

  advance(delta: number): void {
    this.age += delta;
    this.time += delta;
    if (this.sectionSlide) {
      this.sectionSlide.age += delta;
      if (this.sectionSlide.age >= ShopPage.slideDuration) this.sectionSlide = null;
    }
  }
}

/** A tap in a section's list. */
export type ProgressTarget =
  | { k: 'elite' }
  | { k: 'stats' }
  | { k: 'weekly' }
  | { k: 'pass' }
  | { k: 'trial'; id: TrialId }
  | { k: 'rush' }
  | { k: 'feat'; id: string }
  | { k: 'museum'; id: string };

type Stat = { label: string; value: string };

/** What a section's list is made of, top to bottom. */
type Block =
  | { k: 'elite' }
  | { k: 'stat'; stat: Stat }
  | { k: 'more'; count: number; open: boolean }
  | { k: 'stats'; stats: Stat[] }
  | { k: 'heading'; label: string; count: string | null; full: boolean; dot: boolean }
  | { k: 'note'; text: string }
  | { k: 'daily' }
  | { k: 'weekly' }
  | { k: 'pass' }
  | { k: 'quest'; challenge: Challenge }
  | { k: 'trialsLocked'; level: number }
  | { k: 'trial'; trial: Trial }
  | { k: 'rush' }
  | { k: 'rushLocked' }
  | { k: 'mastery'; goal: MasteryGoal }
  | { k: 'feat'; feat: Feat }
  | { k: 'museum'; entry: MuseumEntry };

interface Placed {
  b: Block;
  r: Rect;
}

interface Layout {
  segments: [ProgressSection, Rect][];
  /** The window the list scrolls in. */
  content: Rect;
}

const PROGRESS_SECTIONS: ProgressSection[] = [0, 1, 2, 3];

/** The podium glyph: three steps of 4 points with 1 point between. */
const PODIUM_WIDTH = 14;

const STAT_ROW = 40;
const HEADING = 26;

function t(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, opacity: number, o: { weight?: Weight; align?: Align } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, opacity);
}

/** Lays blocks out one under the other (or side by side in a grid), `gap` apart, from y = 0. */
class Stack {
  readonly out: Placed[] = [];
  private y = 0;
  constructor(private readonly width: number) {}

  row(b: Block, height: number): void {
    this.out.push({ b, r: R.make(0, this.y, this.width, this.y + height) });
    this.y += height + ProgressPage.gap;
  }

  grid(blocks: Block[], columns: number, height: number): void {
    const gap = ProgressPage.gap;
    const w = (this.width - gap * (columns - 1)) / columns;
    blocks.forEach((b, i) => {
      const x = (i % columns) * (w + gap);
      const y = this.y + Math.floor(i / columns) * (height + gap);
      this.out.push({ b, r: R.make(x, y, x + w, y + height) });
    });
    this.y += Math.ceil(blocks.length / columns) * (height + gap);
  }

  /** A quiet heading over a group, with a little more air above it than between cards. */
  heading(label: string, count: string | null = null, full = false, dot = false): void {
    if (this.y > 0) this.y += 8;
    this.out.push({ b: { k: 'heading', label, count, full, dot }, r: R.make(0, this.y, this.width, this.y + HEADING) });
    this.y += HEADING + 4;
  }

  /** The list's height: the last block's bottom. */
  get height(): number {
    return Math.max(0, this.y - ProgressPage.gap);
  }
}

/** The Progress tab: records, today's shifts and quests, the long goals, the Museum. */
export const ProgressPage = {
  gap: 12,
  /** Records: this many stats as big tiles, the rest in a list that folds away. */
  highlights: 6,

  /** Every stat the save keeps, the big ones first. */
  stats(save: SaveGame): Stat[] {
    const c = save.career;
    const m = c.mastery;
    const P = S.progress;
    const count = (n: number): string => (n > 0 ? Fmt.number(n) : P.none);
    return [
      { label: P.level, value: Fmt.number(c.level) },
      { label: P.highscore, value: count(save.highscore) },
      { label: P.bestCombo, value: count(m.bestCombo) },
      { label: P.streak, value: c.dailyStreak > 0 ? P.days(c.dailyStreak) : P.none },
      { label: P.collection, value: P.owned(COSMETICS.filter((x) => Careers.owns(c, x.id)).length, COSMETICS.length) },
      { label: P.timingLabel(baseConfig.timingSamples), value: P.timing(averageOffset(c, baseConfig), baseConfig.timingOnBeat) },
      { label: P.bestChain, value: count(m.bestChain) },
      { label: P.shiftsPlayed, value: count(save.shiftsPlayed) },
      { label: P.shiftsCompleted, value: count(m.shiftsCompleted) },
      { label: P.perfects, value: count(m.perfects) },
      { label: P.takedowns, value: count(m.takedowns) },
      { label: P.transporters, value: count(m.transporters) },
      { label: P.ambulances, value: count(m.ambulances) },
      { label: P.bosses, value: count(c.bossTrophies) },
      { label: P.unlimitedBest, value: count(save.unlimitedBest) },
      { label: P.unlimitedCars, value: count(save.unlimitedBestCars) },
      { label: P.mayhemBest, value: count(save.mayhemBest) },
      { label: P.mayhemChain, value: save.mayhemBestChain > 0 ? `×${save.mayhemBestChain}` : P.none },
      { label: P.weeklies, value: count(c.weekliesDone) },
      { label: P.legendary, value: count(c.legendaryDone) },
      { label: P.prestige, value: c.prestige > 0 ? S.prestige.caption(c.prestige) : P.none },
      { label: P.chestsOpened, value: count(c.chestsOpened) },
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

  /** A section's list, laid out from its top. */
  blocks(section: ProgressSection, save: SaveGame, today: number, state: ProgressState, width: number): Stack {
    const s = new Stack(width);
    const career = save.career;
    if (section === 0) {
      if (ProgressPage.showsElite(career)) s.row({ k: 'elite' }, 76);
      const stats = ProgressPage.stats(save);
      s.grid(
        stats.slice(0, ProgressPage.highlights).map((stat): Block => ({ k: 'stat', stat })),
        2,
        74,
      );
      // The rest only once it has something to say: a mode never played is not a row of dashes.
      const rest = stats.slice(ProgressPage.highlights).filter((x) => x.value !== S.progress.none);
      if (rest.length > 0) {
        s.row({ k: 'more', count: rest.length, open: state.statsOpen }, 48);
        if (state.statsOpen) s.row({ k: 'stats', stats: rest }, rest.length * STAT_ROW);
      }
    } else if (section === 1) {
      s.row({ k: 'daily' }, 64);
      s.row({ k: 'weekly' }, 64);
      s.row({ k: 'pass' }, 64);
      const quests = challengesOf(today);
      const done = quests.filter((q) => Careers.isChallengeDone(career, q, today)).length;
      s.heading(S.progress.quests, `${done}/${quests.length}`, done === quests.length);
      for (const challenge of quests) s.row({ k: 'quest', challenge }, 56);
      s.row({ k: 'note', text: S.progress.questsHint }, 16);
    } else if (section === 2) {
      const trialsDone = TRIALS.filter((x) => career.trialsDone.includes(x.id)).length;
      s.heading(S.progress.trials, `${trialsDone}/${TRIALS.length}`, trialsDone === TRIALS.length);
      if (!Unlocks.isOpen(career, 'trials')) s.row({ k: 'trialsLocked', level: Unlocks.level('trials') }, 56);
      else for (const trial of TRIALS) s.row({ k: 'trial', trial }, 64);
      // Ascension: once the career has been through Prestige, one trial per rank.
      if (career.prestige > 0) {
        const ascended = ASCENSIONS.filter((x) => career.trialsDone.includes(x.id)).length;
        s.heading(S.progress.ascension, `${ascended}/${ASCENSIONS.length}`, ascended === ASCENSIONS.length);
        for (const trial of ASCENSIONS) s.row({ k: 'trial', trial }, 64);
        s.row({ k: 'note', text: S.progress.ascensionHint }, 16);
      }
      // Landmarks: famous roundabouts, for those who have been through Prestige five times.
      if (ProgressPage.showsLandmarks(career)) {
        const seen = LANDMARKS.filter((x) => career.trialsDone.includes(x.id)).length;
        s.heading(S.progress.landmarks, `${seen}/${LANDMARKS.length}`, seen === LANDMARKS.length);
        for (const trial of LANDMARKS) s.row({ k: 'trial', trial }, 64);
        s.row({ k: 'note', text: S.progress.landmarksHint }, 16);
      }
      // Boss Rush: once a boss has been caught, it is there to look forward to.
      if (career.bossesBeaten.length > 0) {
        s.heading(S.rush.name, career.trialsDone.includes(RUSH_ID) ? '1/1' : '0/1', career.trialsDone.includes(RUSH_ID));
        s.row({ k: rushOpen(career) ? 'rush' : 'rushLocked' }, 64);
      }
      const mastered = MASTERY_GOALS.filter((g) => (career.masteryTiers[g] ?? 0) >= MASTERY_THRESHOLDS[g].length).length;
      s.heading(S.progress.mastery, `${mastered}/${MASTERY_GOALS.length}`, mastered === MASTERY_GOALS.length);
      for (const goal of MASTERY_GOALS) s.row({ k: 'mastery', goal }, 58);
      const feats = Feats.count(career);
      s.heading(S.progress.feats, `${feats}/${FEATS.length}`, feats === FEATS.length);
      for (const feat of FEATS) s.row({ k: 'feat', feat }, 66);
    } else {
      for (const shelf of MUSEUM_SHELVES) {
        const { shown, all } = MuseumPage.count(career, shelf);
        const entries = shelfEntries(shelf);
        const fresh = entries.some((e) => career.museumNew.includes(museumId(e)));
        s.heading(S.museum.shelf(shelf), `${shown}/${all}`, shown === all, fresh);
        s.grid(
          entries.map((entry): Block => ({ k: 'museum', entry })),
          MuseumPage.columns(shelf),
          shelf === 0 ? MuseumPage.bossHeight : MuseumPage.cardHeight,
        );
      }
    }
    return s;
  },

  /** How far the section's list can scroll in its window. */
  scrollRange(viewport: Vec2, bottomInset: number, save: SaveGame, today: number, state: ProgressState): number {
    const l = ProgressPage.layout(viewport, bottomInset);
    const height = ProgressPage.blocks(state.section, save, today, state, R.width(l.content)).height;
    return Math.max(0, height - R.height(l.content) + 8);
  },

  /** The blocks of a section where they are on screen at `scroll`. */
  placed(viewport: Vec2, bottomInset: number, save: SaveGame, today: number, state: ProgressState, section = state.section, scroll = state.scroll): Placed[] {
    const l = ProgressPage.layout(viewport, bottomInset);
    const offset = v(l.content.minX, l.content.minY - scroll);
    return ProgressPage.blocks(section, save, today, state, R.width(l.content)).out.map((p) => ({ b: p.b, r: R.offset(p.r, offset) }));
  },

  /** What a tap in the list landed on, if it answers to a tap. */
  targetAt(point: Vec2, viewport: Vec2, bottomInset: number, save: SaveGame, today: number, state: ProgressState): ProgressTarget | null {
    if (!ProgressPage.inList(point, viewport, bottomInset)) return null;
    const hit = ProgressPage.placed(viewport, bottomInset, save, today, state).find((p) => R.contains(p.r, point));
    return hit ? ProgressPage.targetOf(hit.b, save.career) : null;
  },

  targetOf(b: Block, career: Career): ProgressTarget | null {
    switch (b.k) {
      case 'elite':
        return { k: 'elite' };
      case 'more':
        return { k: 'stats' };
      case 'weekly':
        return { k: 'weekly' };
      case 'pass':
        return { k: 'pass' };
      case 'trial':
        return trialOpen(b.trial, career) ? { k: 'trial', id: b.trial.id as TrialId } : null;
      case 'rush':
        return { k: 'rush' };
      case 'feat':
        return { k: 'feat', id: b.feat.id };
      case 'museum':
        return { k: 'museum', id: museumId(b.entry) };
      default:
        return null;
    }
  },

  /** Where a target's block is on screen now (to bring it out from under the sheet). */
  rectOf(target: ProgressTarget, viewport: Vec2, bottomInset: number, save: SaveGame, today: number, state: ProgressState): Rect | null {
    const key = JSON.stringify(target);
    return ProgressPage.placed(viewport, bottomInset, save, today, state).find((p) => JSON.stringify(ProgressPage.targetOf(p.b, save.career)) === key)?.r ?? null;
  },

  /** A press in the list's window: a tap or the start of a scroll. */
  inList(point: Vec2, viewport: Vec2, bottomInset: number): boolean {
    return R.contains(ProgressPage.layout(viewport, bottomInset).content, point);
  },

  /**
   * The way to the leaderboards: a chip beside the balance with the player's Shift level rank
   * (or "Ranks" until one is known). Where the title leaves too little room it is the podium alone.
   */
  rankChip(viewport: Vec2, money: number): { frame: Rect; label: string | null } | null {
    if (!leaderboardEnabled) return null;
    const rank = knownRank('shift-level');
    const label = rank === null ? S.leaderboard.chip : S.leaderboard.rank(rank);
    const cash = Fmt.number(money);
    const right = MenuKit.headerChip(viewport, cash).x - MenuKit.chipWidth(cash) / 2 - 8;
    const titleEnd = MenuKit.headerInset(viewport) + textWidth(S.tabs.progress, MenuKit.titleSize) + 12;
    const y = MenuKit.headerY;
    const full = 12 + PODIUM_WIDTH + 6 + textWidth(label, 15) + 14;
    if (right - full >= titleEnd) return { frame: R.make(right - full, y - 16, right, y + 16), label };
    return { frame: R.make(right - 32, y - 16, right, y + 16), label: null };
  },

  addRankChip(list: RenderList, viewport: Vec2, money: number): void {
    const chip = ProgressPage.rankChip(viewport, money);
    if (!chip) return;
    const { frame, label } = chip;
    const tag = list.tag;
    list.tag = 'headerChip';
    list.s(rect(R.center(frame), v(R.width(frame), R.height(frame)), 16), 'controlFill');
    const podiumX = label === null ? R.center(frame).x - PODIUM_WIDTH / 2 : frame.minX + 12;
    ProgressPage.podium(list, v(podiumX, R.center(frame).y + 6));
    if (label !== null) t(list, label, v(podiumX + PODIUM_WIDTH + 6, R.center(frame).y), 15, 'primary', 1, { weight: 'bold' });
    list.tag = tag;
  },

  /** Three steps, the middle one highest: the leaderboard's mark. `base` is its bottom left. */
  podium(list: RenderList, base: Vec2): void {
    const step = 4;
    const gap = 1;
    [8, 12, 5].forEach((height, i) => {
      const x = base.x + i * (step + gap) + step / 2;
      list.s(rect(v(x, base.y - height / 2), v(step, height), 1), 'accent');
    });
  },

  rankChipAt(point: Vec2, viewport: Vec2, money: number): boolean {
    const chip = ProgressPage.rankChip(viewport, money);
    return chip !== null && R.contains(R.inset(chip.frame, -6), point);
  },

  sectionAt(point: Vec2, viewport: Vec2, bottomInset: number): ProgressSection | null {
    return ProgressPage.layout(viewport, bottomInset).segments.find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  add(list: RenderList, save: SaveGame, today: number, state: ProgressState, reduceMotion: boolean, bottomInset: number, maxScroll: number): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    MenuKit.header(list, S.tabs.progress, Fmt.number(save.career.money), vp);
    ProgressPage.addRankChip(list, vp, save.career.money);
    const l = ProgressPage.layout(vp, bottomInset);
    const chosen = state.section;
    let thumb: number = chosen;
    const slide = state.sectionSlide;
    if (slide) thumb = slide.from + (chosen - slide.from) * (reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration));
    const last = l.segments[l.segments.length - 1][1];
    MenuKit.segmented(list, PROGRESS_SECTIONS.map((i) => S.progress.section(i)), chosen, thumb, R.make(l.segments[0][1].minX, l.segments[0][1].minY, last.maxX, last.maxY));
    if (save.career.museumNew.length > 0) {
      const r = l.segments[3][1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.progress.section(3), 13) / 2 + 7, R.center(r).y - 6), 1);
    }

    const start = list.items.length;
    ProgressPage.addSection(list, state.section, save, today, state, state.age, state.scroll, reduceMotion, bottomInset);
    if (slide) {
      const side = state.section > slide.from ? 1 : -1;
      const spring = reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration);
      const shift = v(side * R.width(l.content) * 0.45 * (1 - spring), 0);
      const fade = Ease.outCubic(slide.age / 0.18);
      for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
      const gone = Ease.outCubic(slide.age / ShopPage.slideOut);
      if (gone < 1) {
        const old = new List(list.camera, list.background);
        ProgressPage.addSection(old, slide.from, save, today, state, 10, slide.scroll, true, bottomInset);
        const away = v(reduceMotion ? 0 : -side * R.width(l.content) * 0.3 * gone, 0);
        list.items.splice(start, 0, ...old.items.map((i) => moved(i, away, 1 - gone)));
      }
    }
    // The list scrolls under the segments and stops above the tab bar; sideways it may slide out freely.
    clipTo(list, start, R.make(0, l.content.minY - 6, vp.x, l.content.maxY));
    state.addIndicator(list, l.content, maxScroll, Math.min(vp.x - 4, l.content.maxX + 5));
  },

  /** A section's blocks that are on screen, each coming in a little after the one above it. */
  addSection(list: RenderList, section: ProgressSection, save: SaveGame, today: number, state: ProgressState, age: number, scroll: number, reduceMotion: boolean, bottomInset: number): void {
    const vp = list.camera.viewport;
    const window = ProgressPage.layout(vp, bottomInset).content;
    let index = 0;
    for (const p of ProgressPage.placed(vp, bottomInset, save, today, state, section, scroll)) {
      if (p.r.maxY < window.minY - 30 || p.r.minY > window.maxY + 30) continue;
      const [r, o] = ProgressPage.entering(p.r, age, Math.min(index++, 12), reduceMotion);
      ProgressPage.addBlock(list, p.b, r, save, today, state, o);
    }
  },

  addBlock(list: RenderList, b: Block, r: Rect, save: SaveGame, today: number, state: ProgressState, o: number): void {
    const career = save.career;
    switch (b.k) {
      case 'elite':
        return ProgressPage.addEliteCard(list, r, career, o);
      case 'stat':
        return ProgressPage.addStat(list, r, b.stat, o);
      case 'more':
        return ProgressPage.addMore(list, r, b.count, b.open, o);
      case 'stats':
        return ProgressPage.addStatList(list, r, b.stats, o);
      case 'heading':
        return ProgressPage.addHeading(list, r, b, o);
      case 'note':
        return t(list, b.text, v(r.minX + 4, R.center(r).y), ShopPage.fitted(b.text, 11, R.width(r) - 8), 'muted', o);
      case 'daily':
        return ProgressPage.addDaily(list, r, career, today, o);
      case 'weekly':
        return ProgressPage.addWeekly(list, r, career, today, o);
      case 'pass':
        return ProgressPage.addPass(list, r, career, today, o);
      case 'quest':
        return ProgressPage.addQuest(list, r, career, b.challenge, today, o);
      case 'trialsLocked':
        return ProgressPage.addTrialsLocked(list, r, b.level, o);
      case 'trial':
        return ProgressPage.addTrial(list, r, career, b.trial, o);
      case 'rush':
        return ProgressPage.addRush(list, r, career, o);
      case 'rushLocked':
        return ProgressPage.addRushLocked(list, r, career, o);
      case 'mastery':
        return ProgressPage.addMastery(list, r, career, b.goal, o);
      case 'feat':
        return ProgressPage.addFeat(list, r, career, b.feat, state, o);
      case 'museum':
        // What was on screen counts as seen once the Museum is left.
        state.museum.viewed.add(museumId(b.entry));
        return MuseumPage.addEntry(list, b.entry, r, career, state.museum, state.time, o);
    }
  },

  /**
   * The Elite card sits above the records from Level 40 on, and for good once Level 50 was
   * reached. It is the door to the late game: its sheet holds the track, the titles and Prestige.
   */
  showsElite: (c: Career): boolean => Elite.isOpen(c) || c.level >= baseConfig.prestigeLevel - 10,

  entering(r: Rect, age: number, index: number, reduceMotion: boolean): [Rect, number] {
    if (reduceMotion) return [r, 1];
    const rise = MenuKit.cardEnter(MenuKit.staggerSpring(age, index)).rise;
    return [R.offset(r, v(0, rise)), MenuKit.stagger(age, index)];
  },

  panel(list: RenderList, r: Rect, opacity: number): void {
    list.s(rect(R.center(r), v(R.width(r), R.height(r)), ShopPage.corner), 'card', opacity);
  },

  /** A ticked circle (done) or an empty one, at the left of a row. */
  check(list: RenderList, at: Vec2, done: boolean, o: number): void {
    list.s(circle(at, 9), done ? 'accent' : 'controlFill', o);
    if (!done) return;
    list.s(line(add(at, v(-4, 0)), add(at, v(-1, 3.5)), 2), 'accentInk', o);
    list.s(line(add(at, v(-1, 3.5)), add(at, v(4.5, -3.5)), 2), 'accentInk', o);
  },

  /**
   * One row of Today or a trial, all alike: a bold title and a muted line on the left; on the
   * right the reward (or a status) above and the way in below, in the accent colour.
   */
  addCardRow(list: RenderList, r: Rect, x: number, o: number, row: { title: string; line: string; reward?: number; status?: string; link?: string; dim?: boolean }): void {
    const c = R.center(r);
    const right = r.maxX - 16;
    const linkWidth = row.link ? textWidth(row.link, 11) + 12 : 0;
    const topWidth = row.reward !== undefined ? textWidth(Fmt.number(row.reward), 13) + 30 : row.status ? textWidth(row.status, 13) + 12 : 0;
    t(list, row.title, v(x, c.y - 9), ShopPage.fitted(row.title, 14, right - x - topWidth), row.dim ? 'muted' : 'primary', o, { weight: 'bold' });
    t(list, row.line, v(x, c.y + 11), ShopPage.fitted(row.line, 11, right - x - linkWidth), 'muted', o);
    if (row.reward !== undefined) moneyTag(list, Fmt.number(row.reward), v(right, c.y - 9), 13, 'trailing', 'primary', 'accent', o);
    else if (row.status) t(list, row.status, v(right, c.y - 9), 13, row.dim ? 'muted' : 'accent', o, { weight: 'bold', align: 'trailing' });
    if (row.link) t(list, row.link, v(right, c.y + 11), 11, row.dim ? 'muted' : 'accent', o, { weight: 'bold', align: 'trailing' });
  },

  addHeading(list: RenderList, r: Rect, b: Extract<Block, { k: 'heading' }>, o: number): void {
    const y = R.center(r).y + 2;
    t(list, b.label, v(r.minX + 4, y), 13, 'muted', o, { weight: 'bold' });
    if (b.dot) ShopPage.badgeDot(list, v(r.minX + 4 + textWidth(b.label, 13) + 8, y - 4), o);
    if (b.count) t(list, b.count, v(r.maxX - 4, y), 12, b.full ? 'coin' : 'muted', o, { align: 'trailing' });
  },

  addStat(list: RenderList, r: Rect, stat: Stat, o: number): void {
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    const empty = stat.value === S.progress.none;
    t(list, stat.value, v(r.minX + 16, c.y - 8), ShopPage.fitted(stat.value, 22, R.width(r) - 32), empty ? 'muted' : 'primary', o, { weight: 'bold' });
    t(list, stat.label, v(r.minX + 16, c.y + 16), ShopPage.fitted(stat.label, 11, R.width(r) - 32), 'muted', o);
  },

  addMore(list: RenderList, r: Rect, count: number, open: boolean, o: number): void {
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    t(list, S.progress.allStats, v(r.minX + 16, c.y), 14, 'primary', o, { weight: 'bold' });
    t(list, open ? S.progress.statsHide : S.progress.statsMore(count), v(r.maxX - 16, c.y), 12, 'accent', o, { weight: 'bold', align: 'trailing' });
  },

  /** The rest of the stats as one grouped list: label left, value right, hairlines between. */
  addStatList(list: RenderList, r: Rect, stats: Stat[], o: number): void {
    ProgressPage.panel(list, r, o);
    stats.forEach((stat, i) => {
      const y = r.minY + i * STAT_ROW + STAT_ROW / 2;
      if (i > 0) list.s(line(v(r.minX + 16, y - STAT_ROW / 2), v(r.maxX, y - STAT_ROW / 2), 0.5), 'separator', o);
      const valueWidth = textWidth(stat.value, 13) + 8;
      t(list, stat.label, v(r.minX + 16, y), ShopPage.fitted(stat.label, 13, R.width(r) - 32 - valueWidth), 'muted', o);
      t(list, stat.value, v(r.maxX - 16, y), 13, 'primary', o, { weight: 'bold', align: 'trailing' });
    });
  },

  addDaily(list: RenderList, r: Rect, career: Career, today: number, o: number): void {
    ProgressPage.panel(list, r, o);
    if (!Unlocks.isOpen(career, 'daily')) {
      // Not yet: the row says when, nothing more.
      const at = Unlocks.level('daily');
      ProgressPage.addCardRow(list, r, r.minX + 16, o, { title: S.daily.name, line: S.unlocks.opensAt(S.daily.name, at), status: S.unlocks.lockedTag(at), dim: true });
      return;
    }
    const open = Careers.isDailyOpen(career, today);
    const next = Careers.nextStreakMilestone(career);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, { title: S.daily.name, line: S.daily.rowLine(career.dailyStreak, open, next), status: open ? S.daily.ready : `${S.daily.done} ✓` });
  },

  /** The Weekly Shift: one shift for the whole week, tap to play it. */
  addWeekly(list: RenderList, r: Rect, career: Career, today: number, o: number): void {
    ProgressPage.panel(list, r, o);
    const week = weekNumber(today);
    const shift = weeklyTrial(week);
    const passed = Careers.isWeeklyDone(career, week);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, {
      title: `${S.weekly.title} · ${S.weekly.elite(shift.elite ?? 'flawless')}`,
      line: passed ? S.weekly.passedThisWeek : S.weekly.goal(shift),
      ...(passed ? { status: `${S.daily.done} ✓` } : { reward: shift.reward }),
      link: `${S.weekly.daysLeft(weekDaysLeft(today))} · ${S.trials.play} ›`,
    });
  },

  /** The Season Pass: this season's track, tap for the sheet. */
  addPass(list: RenderList, r: Rect, career: Career, today: number, o: number): void {
    ProgressPage.panel(list, r, o);
    const season = SeasonPass.season(today);
    const title = S.pass.caption(season);
    const days = `${S.pass.daysLeft(SeasonPass.daysLeft(today))} ›`;
    if (!SeasonPass.isOpen(career)) {
      ProgressPage.addCardRow(list, r, r.minX + 16, o, { title, line: S.pass.locked(baseConfig.seasonPassLevel), status: S.unlocks.lockedTag(baseConfig.seasonPassLevel), dim: true });
      return;
    }
    if (!SeasonPass.owns(career, today)) {
      ProgressPage.addCardRow(list, r, r.minX + 16, o, { title, line: S.pass.buyHint, reward: baseConfig.seasonPassPrice, link: days });
      return;
    }
    const tier = SeasonPass.tier(career);
    const { into, need } = SeasonPass.progress(career);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, { title, line: `${S.pass.tier(tier, PASS_TIERS)} · ${S.pass.xp(into, need)}`, link: days });
    // The track's bar where a price would stand.
    const pc = R.center(r);
    const bar = R.make(r.maxX - 112, pc.y - 12, r.maxX - 16, pc.y - 6);
    list.s(rect(R.center(bar), v(R.width(bar), R.height(bar)), 3), 'controlFill', o);
    const share = tier >= PASS_TIERS ? 1 : into / need;
    if (share > 0) list.s(rect(v(bar.minX + (R.width(bar) * share) / 2, R.center(bar).y), v(R.width(bar) * share, R.height(bar)), 3), 'accent', o);
  },

  addQuest(list: RenderList, r: Rect, career: Career, challenge: Challenge, today: number, o: number): void {
    const c = R.center(r);
    const done = Careers.isChallengeDone(career, challenge, today);
    ProgressPage.panel(list, r, o);
    ProgressPage.check(list, v(r.minX + 24, c.y), done, o);
    const label = S.daily.challenge(challenge);
    t(list, label, v(r.minX + 44, c.y), ShopPage.fitted(label, 13, R.width(r) - 44 - 80), done ? 'muted' : 'primary', o, { weight: 'bold' });
    if (done) t(list, `${S.daily.done} ✓`, v(r.maxX - 16, c.y), 13, 'accent', o, { weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(challengeReward(challenge)), v(r.maxX - 16, c.y), 13, 'trailing', 'primary', 'accent', o);
  },

  addTrialsLocked(list: RenderList, r: Rect, level: number, o: number): void {
    const dim = o * 0.55;
    ProgressPage.panel(list, r, dim);
    const c = R.center(r);
    ProgressPage.check(list, v(r.minX + 24, c.y), false, dim);
    const label = S.progress.trialsLocked(level);
    t(list, label, v(r.minX + 44, c.y), ShopPage.fitted(label, 13, R.width(r) - 60), 'muted', dim, { weight: 'bold' });
  },

  /** Landmarks show from the Prestige rank that opens them, or once one was passed. */
  showsLandmarks: (career: Career): boolean => career.prestige >= LANDMARK_PRESTIGE || LANDMARKS.some((x) => career.trialsDone.includes(x.id)),

  /** Boss Rush: tap to run all eight bosses in a row; a clear pays once, the best time stays. */
  addRush(list: RenderList, r: Rect, career: Career, full: number): void {
    const c = R.center(r);
    ProgressPage.panel(list, r, full);
    const done = career.trialsDone.includes(RUSH_ID);
    ProgressPage.check(list, v(r.minX + 24, c.y), done, full);
    const extra = career.rushBest > 0 ? `best ${S.rush.time(career.rushBest)}` : career.rushFurthest > 0 ? S.rush.furthest(career.rushFurthest, BOSS_KINDS.length) : null;
    ProgressPage.addCardRow(list, r, r.minX + 44, full, {
      title: S.rush.rowTitle,
      line: extra ? `${S.rush.line} · ${extra}` : S.rush.line,
      ...(done ? { status: `${S.daily.done} ✓` } : { reward: RUSH_REWARD }),
      link: `${S.trials.play} ›`,
    });
  },

  /** Boss Rush before all eight bosses are down: quiet, and says what opens it. */
  addRushLocked(list: RenderList, r: Rect, career: Career, full: number): void {
    const o = full * 0.55;
    const c = R.center(r);
    ProgressPage.panel(list, r, o);
    ProgressPage.check(list, v(r.minX + 24, c.y), false, o);
    ProgressPage.addCardRow(list, r, r.minX + 44, o, { title: S.rush.rowTitle, line: S.rush.locked(career.bossesBeaten.length, BOSS_KINDS.length), dim: true });
  },

  /** A trial: tap to play it; each pays once. One above the career's level waits, quieter, and says when it opens. */
  addTrial(list: RenderList, r: Rect, career: Career, trial: Trial, full: number): void {
    const c = R.center(r);
    if (!trialOpen(trial, career)) {
      const o = full * 0.55;
      ProgressPage.panel(list, r, o);
      ProgressPage.check(list, v(r.minX + 24, c.y), false, o);
      ProgressPage.addCardRow(list, r, r.minX + 44, o, { title: S.trials.name(trial.id), line: S.trials.opens(trial), dim: true });
      return;
    }
    ProgressPage.panel(list, r, full);
    const done = career.trialsDone.includes(trial.id);
    ProgressPage.check(list, v(r.minX + 24, c.y), done, full);
    ProgressPage.addCardRow(list, r, r.minX + 44, full, {
      title: S.trials.name(trial.id),
      line: `${S.trials.level(trial.level)} · ${S.trials.goal(trial)}`,
      ...(done ? { status: `${S.daily.done} ✓` } : { reward: trial.reward }),
      link: `${S.trials.play} ›`,
    });
  },

  /** Elite level, title, the bar to the next level and what the next milestone brings. */
  addEliteCard(list: RenderList, card: Rect, c: Career, o: number): void {
    const open = Elite.isOpen(c);
    // Prestige in reach: a gold ring round the card and a gold pill say so, where the badges usually sit.
    const ready = open && Careers.canPrestige(c);
    if (ready) list.s(rect(R.center(card), v(R.width(card) + 4, R.height(card) + 4), ShopPage.corner + 2), 'coin', 0.9 * o);
    ProgressPage.panel(list, card, o);
    const top = card.minY + 22;
    t(list, open ? S.elite.caption(Elite.level(c)) : S.elite.title, v(card.minX + 16, top), 15, open ? 'coin' : 'muted', o, { weight: 'bold' });
    if (ready) {
      const label = `${S.elite.prestigeAction(c.prestige + 1)} ›`;
      const width = textWidth(label, 12) + 20;
      list.s(rect(v(card.maxX - 16 - width / 2, top), v(width, 22), 11), 'coin', o);
      t(list, label, v(card.maxX - 16 - width / 2, top), 12, 'background', o, { weight: 'bold', align: 'center' });
    } else {
      const badges = [c.prestige > 0 ? S.prestige.caption(c.prestige) : null, c.title ? S.titles.name(c.title) : null].filter((x): x is string => !!x);
      t(list, [...badges, '›'].join(' · ').replace(' · ›', ' ›'), v(card.maxX - 16, top), 12, badges.length > 0 ? 'coin' : 'muted', o, { weight: 'bold', align: 'trailing' });
    }
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
    const next = Elite.nextMilestone(c);
    const lineText = next ? S.elite.next(next) : null;
    if (lineText) {
      const room = barWidth - textWidth(xp, 11) - 16;
      t(list, lineText, v(card.maxX - 16, bottom), ShopPage.fitted(lineText, 11, room), 'muted', o, { align: 'trailing' });
    }
  },

  /**
   * A Feat: one of the hardest deeds, with its reward shown (what you play for is no secret),
   * the goal, how far you are, and the title it adds. A tap opens its sheet.
   */
  addFeat(list: RenderList, r: Rect, career: Career, feat: Feat, state: ProgressState, o: number): void {
    const c = R.center(r);
    const item = cosmetic(feat.id);
    if (!item) return;
    const { have, need } = Feats.progress(feat, career);
    const complete = have >= need;
    if (state.feat === feat.id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
    ProgressPage.panel(list, r, o);
    // The reward itself, dimmed until it is earned; its glow and sparks stay inside the card.
    const from = list.items.length;
    ShopPage.addPreview(list, item, v(r.minX + 34, c.y), 0.6, o * (complete ? 1 : 0.55));
    for (let k = from; k < list.items.length; k++) list.items[k] = { ...list.items[k], clip: r };
    const x = r.minX + 64;
    const top = c.y - R.height(r) * 0.22;
    const right = complete ? S.feats.done : S.feats.have(have, need);
    const rightWidth = textWidth(right, 12) + 4;
    const name = S.shop.item(feat.id);
    t(list, name, v(x, top), ShopPage.fitted(name, 14, r.maxX - 16 - rightWidth - x - 8), complete ? 'coin' : 'primary', o, { weight: 'bold' });
    t(list, right, v(r.maxX - 16, top), 12, complete ? 'accent' : 'muted', o, { weight: 'bold', align: 'trailing' });
    const goal = feat.title ? `${S.feats.goal(feat.goal)} · ${S.feats.withTitle(S.titles.name(feat.title))}` : S.feats.goal(feat.goal);
    t(list, goal, v(x, c.y + R.height(r) * 0.02), ShopPage.fitted(goal, 11, r.maxX - 16 - x), 'muted', o);
    const barY = c.y + R.height(r) * 0.27;
    const barWidth = r.maxX - 16 - x;
    list.s(rect(v(x + barWidth / 2, barY), v(barWidth, 4), 2), 'controlFill', o);
    const fraction = Ease.clamp01(have / need);
    if (fraction > 0) {
      const filled = Math.max(4, barWidth * fraction);
      list.s(rect(v(x + filled / 2, barY), v(filled, 4), 2), complete ? 'coin' : 'accent', o);
    }
  },

  addMastery(list: RenderList, r: Rect, career: Career, goal: MasteryGoal, o: number): void {
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
  },
};
