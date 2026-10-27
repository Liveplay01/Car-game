import { type SaveGame, type Career, type MasteryGoal, Careers, MASTERY_GOALS, MASTERY_THRESHOLDS, masteryValue } from '../core/career';
import { Unlocks } from '../core/unlocks';
import { Goals } from '../core/goals';
import { tierOf, nextTier } from '../core/tiers';
import { COSMETICS, cosmetic } from '../core/loot';
import { FEATS, Feats, type Feat } from '../core/feats';
import { type Challenge, challengesOf, challengeReward, dailyEvent } from '../core/daily';
import { type Trial, type TrialId, TRIALS, ASCENSIONS, LANDMARKS, LANDMARK_PRESTIGE, LEVEL_TRIALS, LEVEL_TRIALS_SHOWN, levelTrialsWaiting, RUSH_ID, RUSH_REWARD, rushOpen, trialOpen, ascensionRank, landmarkOf, levelTrialLevel } from '../core/trials';
import { weekNumber, weekDaysLeft, weeklyTrial } from '../core/weekly';
import { baseConfig, BOSS_KINDS } from '../core/config';
import { Elite } from '../core/elite';
import { SeasonPass, PASS_TIERS } from '../core/seasonPass';
import { type MuseumEntry, MUSEUM_SHELVES, shelfEntries, museumId } from '../core/museum';
import { averageOffset } from '../core/timing';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, line, Ease, Metrics, moved, drawText } from './render';
import { MenuKit } from './menukit';
import type { ColorToken } from './theme';
import { StreakFlame, flameTier } from './streakFlame';
import { moneyTag, textWidth, drawFitted } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { PassArt, SEASON_TINT } from './passArt';
import { TourArt, TOUR_TINT } from './tourArt';
import { PROGRESS, type ProgressSection } from './flow';
import { MuseumPage, MuseumState } from './museum';
import { Scroller, clipTo } from './scroll';
import { type TourId, type TourDef, TOURS, tourOn, nextTour, tourOpen, tourStopsDone, stopDoneKey } from '../core/tours';
import { FAMILIES, Achievements, achievementTotal, type Family } from '../core/achievements';
import { seasonOf } from '../core/loot';
import { News } from './news';
import { Meter } from './meter';
import { Signs } from './signs';

/** What the Progress tab shows and animates (`ProgressPage.State`); each section is a list that scrolls. */
export class ProgressState extends Scroller {
  section: ProgressSection = PROGRESS.today;
  age = 0;
  /** Seconds the page has been open: the police lights in the Museum keep flashing. */
  time = 0;
  /** The section going out, and where it stood. */
  sectionSlide: { from: ProgressSection; age: number; scroll: number } | null = null;
  museum = new MuseumState();
  /** The Feat in the detail sheet (Goals). */
  feat: string | null = null;
  /** The streak's sheet is open (Today). */
  streak = false;
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
  | { k: 'streak' }
  | { k: 'pass' }
  | { k: 'trial'; id: TrialId }
  | { k: 'rush' }
  | { k: 'tour'; stop: number }
  | { k: 'feat'; id: string }
  | { k: 'museum'; id: string };

type Stat = { label: string; value: string };

/** What a section's list is made of, top to bottom. */
type Block =
  | { k: 'elite' }
  | { k: 'odometer' }
  | { k: 'streak' }
  | { k: 'stat'; stat: Stat }
  | { k: 'more'; count: number; open: boolean }
  | { k: 'stats'; stats: Stat[] }
  | { k: 'heading'; label: string; count: string | null; full: boolean; dot: boolean; seal: boolean }
  | { k: 'title'; label: string }
  | { k: 'note'; text: string }
  | { k: 'daily' }
  | { k: 'weekly' }
  | { k: 'pass' }
  | { k: 'quest'; challenge: Challenge }
  | { k: 'trial'; trial: Trial }
  | { k: 'rush' }
  | { k: 'rushLocked' }
  | { k: 'tour' }
  | { k: 'tourInfo'; tour: TourId; title: string; line: string }
  | { k: 'season' }
  | { k: 'ach'; family: Family }
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

const PROGRESS_SECTIONS: ProgressSection[] = [0, 1, 2];

const STAT_ROW = 40;
/** Where a goal card's sign sits and where its text starts then. */
const SIGN_AT = 34;
const SIGN_TEXT = 62;
const HEADING = 26;
const TITLE = 30;

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
  heading(label: string, count: string | null = null, full = false, dot = false, seal = false): void {
    if (this.y > 0) this.y += 8;
    this.out.push({ b: { k: 'heading', label, count, full, dot, seal }, r: R.make(0, this.y, this.width, this.y + HEADING) });
    this.y += HEADING + 4;
  }

  /** A part of its own within a section (the Museum under the stats): larger than a group's heading. */
  title(label: string): void {
    if (this.y > 0) this.y += 16;
    this.out.push({ b: { k: 'title', label }, r: R.make(0, this.y, this.width, this.y + TITLE) });
    this.y += TITLE + 4;
  }

  /** The list's height: the last block's bottom. */
  get height(): number {
    return Math.max(0, this.y - ProgressPage.gap);
  }
}

/** The Progress tab: records, today's shifts and quests, the long goals, the Museum. */
export const ProgressPage = {
  gap: 12,
  /** The streak card at the top of Records: the tailpipe scene, the days and the road of milestones. */
  streakHeight: 282,
  /** The Season Pass card once it is open: a picture tile of the season, the track and its bar. */
  passHeight: 128,
  /** The running tour's card: a picture tile of its sky and top skin, the stops and the way in. */
  tourHeight: 120,
  /** A tour that has not started: the same picture, smaller, and one line. */
  tourInfoHeight: 88,
  /** Records: this many stats as big tiles, the rest in a list that folds away. */
  highlights: 6,
  /**
   * The odometer (Leo, 23.10.2026): every car you let in counts with a whole trip, door to door, about the length of
   * an average car journey; at the Moon's distance the card says so, quietly, with no notice.
   */
  odometerHeight: 100,
  tripKm: 16,
  moonKm: 384_400,
  /** Coming in, the drums roll the last stretch up to the total. */
  odometerRoll: 100,

  /** Every stat the save keeps, the big ones first. */
  stats(save: SaveGame): Stat[] {
    const c = save.career;
    const m = c.mastery;
    const P = S.progress;
    const count = (n: number): string => (n > 0 ? Fmt.number(n) : P.none);
    const owned = COSMETICS.filter((x) => Careers.owns(c, x.id)).length;
    return [
      { label: P.level, value: Fmt.number(c.level) },
      { label: P.highscore, value: count(save.highscore) },
      { label: P.bestCombo, value: count(m.bestCombo) },
      { label: P.streak, value: c.dailyStreak > 0 ? P.days(c.dailyStreak) + (c.streakFreezes > 0 ? ` · ${S.daily.freezes(c.streakFreezes)}` : '') : P.none },
      { label: P.collectionShare(owned, COSMETICS.length), value: P.owned(owned, COSMETICS.length) },
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
      { label: P.unlimitedTier, value: S.modes.tierLine(tierOf(save.unlimitedBestCars), nextTier(save.unlimitedBestCars)) },
      { label: P.mayhemBest, value: count(save.mayhemBest) },
      { label: P.mayhemChain, value: save.mayhemBestChain > 0 ? `×${save.mayhemBestChain}` : P.none },
      { label: P.tours, value: count(c.toursDone.length) },
      { label: P.weeklies, value: count(c.weekliesDone) },
      { label: P.legendary, value: count(c.legendaryDone) },
      { label: P.prestige, value: c.prestige > 0 ? S.prestige.caption(c.prestige) : P.none },
      { label: P.chestsOpened, value: count(c.chestsOpened) },
    ];
  },

  layout(viewport: Vec2, bottomInset: number, sections: ProgressSection[] = PROGRESS_SECTIONS): Layout {
    const width = Math.min(viewport.x - 2 * ProgressPage.gap, 460);
    const left = (viewport.x - width) / 2;
    const top = Metrics.sceneInsets.top + 22;
    const sw = width / sections.length;
    return {
      segments: sections.map((s, i): [ProgressSection, Rect] => [s, R.make(left + i * sw, top, left + (i + 1) * sw, top + ShopPage.segmentHeight)]),
      content: R.make(left, top + ShopPage.segmentHeight + ProgressPage.gap, left + width, viewport.y - bottomInset - ProgressPage.gap),
    };
  },

  /** A section's list, laid out from its top. */
  blocks(section: ProgressSection, save: SaveGame, today: number, state: ProgressState, width: number): Stack {
    const s = new Stack(width);
    const career = save.career;
    if (section === PROGRESS.today) {
      if (Unlocks.isOpen(career, 'daily')) {
        s.row({ k: 'daily' }, 64);
        s.row({ k: 'streak' }, ProgressPage.streakHeight);
      }
      // The weekly shift is a level-20 trial and the tours open at their level: a new player does not see them yet.
      if (Unlocks.isKnown(career, 'trials') || career.weeklyDone >= 0) s.row({ k: 'weekly' }, 64);
      if (tourOpen(career)) ProgressPage.tourRows(s, today);
      const quests = challengesOf(today, Careers.reach(career));
      const done = quests.filter((q) => Careers.isChallengeDone(career, q, today)).length;
      s.heading(S.progress.quests, `${done}/${quests.length}`, done === quests.length);
      for (const challenge of quests) s.row({ k: 'quest', challenge }, 56);
      s.row({ k: 'note', text: S.progress.questsHint }, 16);
    } else if (section === PROGRESS.goals) {
      if (SeasonPass.isOpen(career)) s.row({ k: 'pass' }, ProgressPage.passHeight);
      s.row({ k: 'season' }, 64);
      if (Unlocks.isOpen(career, 'trials')) ProgressPage.trialRows(s, career);
      const mastered = MASTERY_GOALS.filter((g) => (career.masteryTiers[g] ?? 0) >= MASTERY_THRESHOLDS[g].length).length;
      s.heading(S.progress.mastery, `${mastered}/${MASTERY_GOALS.length}`, mastered === MASTERY_GOALS.length);
      for (const goal of MASTERY_GOALS) s.row({ k: 'mastery', goal }, 58);
      const feats = Feats.count(career);
      s.heading(S.progress.feats, `${feats}/${FEATS.length}`, feats === FEATS.length);
      for (const feat of FEATS) s.row({ k: 'feat', feat }, 66);
      const achieved = Achievements.done(career);
      s.heading(S.ach.heading, S.ach.count(achieved, achievementTotal()), achieved === achievementTotal());
      for (const family of FAMILIES) s.row({ k: 'ach', family }, 58);
    } else {
      if (ProgressPage.showsElite(career)) s.row({ k: 'elite' }, 76);
      if (ProgressPage.odometerKm(career) > 0) s.row({ k: 'odometer' }, ProgressPage.odometerHeight);
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
      s.title(S.intro.museum.title);
      for (const shelf of MUSEUM_SHELVES) {
        const { shown, all } = MuseumPage.count(career, shelf);
        const entries = shelfEntries(shelf);
        const fresh = entries.some((e) => career.museumNew.includes(museumId(e))) || (shelf === 3 && News.has(save, 'failures'));
        s.heading(S.museum.shelf(shelf), `${shown}/${all}`, shown === all, fresh, shown === all);
        s.grid(
          entries.map((entry): Block => ({ k: 'museum', entry })),
          MuseumPage.columns(shelf),
          shelf === 0 ? MuseumPage.bossHeight : MuseumPage.cardHeight,
        );
      }
    }
    return s;
  },

  /** The Trials: Heat trials, level trials, ascension, landmarks, Boss Rush. Part of Goals once the career has reached them. */
  trialRows(s: Stack, career: Career): void {
    const trialsDone = TRIALS.filter((x) => career.trialsDone.includes(x.id)).length;
    s.heading(S.progress.trials, `${trialsDone}/${TRIALS.length}`, trialsDone === TRIALS.length);
    for (const trial of TRIALS) s.row({ k: 'trial', trial }, 64);
    // Level trials: one more with every level from 30 on; the first few that wait.
    const waiting = levelTrialsWaiting(career);
    const passed = LEVEL_TRIALS.filter((x) => career.trialsDone.includes(x.id)).length;
    if (waiting.length > 0 || passed > 0) {
      s.heading(S.progress.levelTrials, `${passed}/${LEVEL_TRIALS.length}`, passed === LEVEL_TRIALS.length);
      for (const trial of waiting.slice(0, LEVEL_TRIALS_SHOWN)) s.row({ k: 'trial', trial }, 64);
      s.row({ k: 'note', text: S.progress.levelTrialsHint(waiting.length, Math.min(waiting.length, LEVEL_TRIALS_SHOWN)) }, 16);
    }
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
  },

  /** The tour of the day, or when the next one comes (only once the tours are open). */
  tourRows(s: Stack, today: number): void {
    const run = tourOn(today);
    if (run) s.row({ k: 'tour' }, ProgressPage.tourHeight);
    else {
      const next = nextTour(today);
      if (next && next.inDays <= 60) s.row({ k: 'tourInfo', tour: next.tour.id, title: S.tours.name(next.tour.id), line: S.tours.startsIn(next.inDays) }, ProgressPage.tourInfoHeight);
    }
  },

  /** The stop a tap on the tour card plays: the first one not done yet, else the first again. */
  nextStop(career: Career, today: number): number {
    const run = tourOn(today);
    if (!run) return 1;
    const open = run.tour.stops.findIndex((_, i) => !career.toursDone.includes(stopDoneKey(run.key, i + 1)));
    return open < 0 ? 1 : open + 1;
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
    return hit ? ProgressPage.targetOf(hit.b, save.career, today) : null;
  },

  targetOf(b: Block, career: Career, today: number): ProgressTarget | null {
    switch (b.k) {
      case 'elite':
        return { k: 'elite' };
      case 'more':
        return { k: 'stats' };
      case 'weekly':
        return { k: 'weekly' };
      case 'streak':
        return { k: 'streak' };
      case 'pass':
        return { k: 'pass' };
      case 'trial':
        return trialOpen(b.trial, career) ? { k: 'trial', id: b.trial.id as TrialId } : null;
      case 'rush':
        return { k: 'rush' };
      case 'tour':
        return { k: 'tour', stop: ProgressPage.nextStop(career, today) };
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
    return ProgressPage.placed(viewport, bottomInset, save, today, state).find((p) => JSON.stringify(ProgressPage.targetOf(p.b, save.career, today)) === key)?.r ?? null;
  },

  /** A press in the list's window: a tap or the start of a scroll. */
  inList(point: Vec2, viewport: Vec2, bottomInset: number): boolean {
    return R.contains(ProgressPage.layout(viewport, bottomInset).content, point);
  },

  sectionAt(point: Vec2, viewport: Vec2, bottomInset: number): ProgressSection | null {
    return ProgressPage.layout(viewport, bottomInset).segments.find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  add(list: RenderList, save: SaveGame, today: number, state: ProgressState, reduceMotion: boolean, bottomInset: number, maxScroll: number, dots: readonly ProgressSection[]): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    MenuKit.header(list, S.tabs.progress, Fmt.number(save.career.money), vp);
    const shown = PROGRESS_SECTIONS;
    const l = ProgressPage.layout(vp, bottomInset, shown);
    const chosen = Math.max(0, shown.indexOf(state.section));
    let thumb = chosen;
    const slide = state.sectionSlide;
    if (slide) {
      const from = Math.max(0, shown.indexOf(slide.from));
      thumb = from + (chosen - from) * (reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration));
    }
    const last = l.segments[l.segments.length - 1][1];
    MenuKit.segmented(list, shown.map((i) => S.progress.section(i)), chosen, thumb, R.make(l.segments[0][1].minX, l.segments[0][1].minY, last.maxX, last.maxY));
    for (const section of dots) {
      if (!shown.includes(section)) continue;
      const r = l.segments[shown.indexOf(section)][1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.progress.section(section), 13) / 2 + 7, R.center(r).y - 6), 1);
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
      ProgressPage.addBlock(list, p.b, r, save, today, state, o, reduceMotion);
    }
  },

  addBlock(list: RenderList, b: Block, r: Rect, save: SaveGame, today: number, state: ProgressState, o: number, reduceMotion: boolean): void {
    const career = save.career;
    switch (b.k) {
      case 'elite':
        return ProgressPage.addEliteCard(list, r, career, o, reduceMotion);
      case 'odometer':
        return ProgressPage.addOdometer(list, r, career, reduceMotion ? Infinity : state.age, o);
      case 'streak':
        return ProgressPage.addStreak(list, r, career, today, state.time, reduceMotion, o);
      case 'stat':
        return ProgressPage.addStat(list, r, b.stat, o);
      case 'more':
        return ProgressPage.addMore(list, r, b.count, b.open, o);
      case 'stats':
        return ProgressPage.addStatList(list, r, b.stats, o);
      case 'heading':
        return ProgressPage.addHeading(list, r, b, o);
      case 'title':
        return drawText(list, b.label, v(r.minX + 4, R.center(r).y + 2), 20, 'primary', { opacity: o, weight: 'bold' });
      case 'note':
        return drawText(list, b.text, v(r.minX + 4, R.center(r).y), ShopPage.fitted(b.text, 11, R.width(r) - 8), 'muted', { opacity: o });
      case 'daily':
        return ProgressPage.addDaily(list, r, career, today, o);
      case 'weekly':
        return ProgressPage.addWeekly(list, r, career, today, o);
      case 'pass':
        return ProgressPage.addPass(list, r, career, today, state.time, reduceMotion, o);
      case 'quest':
        return ProgressPage.addQuest(list, r, career, b.challenge, today, o);
      case 'trial':
        return ProgressPage.addTrial(list, r, career, b.trial, o);
      case 'rush':
        return ProgressPage.addRush(list, r, career, o);
      case 'rushLocked':
        return ProgressPage.addRushLocked(list, r, career, o);
      case 'tour':
        return ProgressPage.addTour(list, r, career, today, state.time, reduceMotion, o);
      case 'tourInfo':
        return ProgressPage.addTourInfo(list, r, b, state.time, reduceMotion, o);
      case 'season':
        return ProgressPage.addSeason(list, r, today, o);
      case 'ach':
        return ProgressPage.addAchievement(list, r, save, b.family, o, reduceMotion);
      case 'mastery':
        return ProgressPage.addMastery(list, r, career, b.goal, o, reduceMotion);
      case 'feat':
        return ProgressPage.addFeat(list, r, career, b.feat, state, o, reduceMotion);
      case 'museum':
        // What was on screen counts as seen once the Museum is left.
        state.museum.viewed.add(museumId(b.entry));
        return MuseumPage.addEntry(list, b.entry, r, career, state.museum, state.time, o, reduceMotion);
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
    list.s(circle(at, 9), done ? 'coin' : 'controlFill', o);
    if (!done) return;
    list.s(line(add(at, v(-4, 0)), add(at, v(-1, 3.5)), 2), 'accentInk', o);
    list.s(line(add(at, v(-1, 3.5)), add(at, v(4.5, -3.5)), 2), 'accentInk', o);
  },

  /**
   * One row of Today or a trial, all alike: a bold title and a muted line on the left; on the
   * right the reward (or a status) above and the way in below, in the accent colour; a status that
   * says done is gold, like everything earned.
   */
  addCardRow(list: RenderList, r: Rect, x: number, o: number, row: { title: string; line: string; reward?: number; status?: string; done?: boolean; link?: string; dim?: boolean }): void {
    const c = R.center(r);
    const right = r.maxX - 16;
    const linkWidth = row.link ? textWidth(row.link, 11) + 12 : 0;
    const topWidth = row.reward !== undefined ? textWidth(Fmt.number(row.reward), 13) + 30 : row.status ? textWidth(row.status, 13) + 12 : 0;
    drawFitted(list, row.title, v(x, c.y - 9), 14, right - x - topWidth, row.dim ? 'muted' : 'primary', { opacity: o, weight: 'bold' });
    drawFitted(list, row.line, v(x, c.y + 11), 11, right - x - linkWidth, 'muted', { opacity: o });
    if (row.reward !== undefined) moneyTag(list, Fmt.number(row.reward), v(right, c.y - 9), 13, 'trailing', 'primary', 'accent', o);
    else if (row.status) drawText(list, row.status, v(right, c.y - 9), 13, row.dim ? 'muted' : row.done ? 'coin' : 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
    if (row.link) drawText(list, row.link, v(right, c.y + 11), 11, row.dim ? 'muted' : 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  addHeading(list: RenderList, r: Rect, b: Extract<Block, { k: 'heading' }>, o: number): void {
    const y = R.center(r).y + 2;
    drawText(list, b.label, v(r.minX + 4, y), 13, 'muted', { opacity: o, weight: 'bold' });
    if (b.dot) ShopPage.badgeDot(list, v(r.minX + 4 + textWidth(b.label, 13) + 8, y - 4), o);
    if (b.count) drawText(list, b.count, v(r.maxX - 4, y), 12, b.full ? 'coin' : 'muted', { opacity: o, align: 'trailing' });
    if (b.seal) {
      // A full shelf keeps its medal: a small gold tick beside the count.
      const at = v(r.maxX - 4 - (b.count ? textWidth(b.count, 12) + 13 : 0), y - 2);
      list.s(circle(at, 6), 'coin', o);
      list.s(line(add(at, v(-3, 0)), add(at, v(-1, 2.5)), 1.6), 'accentInk', o);
      list.s(line(add(at, v(-1, 2.5)), add(at, v(3.5, -3)), 1.6), 'accentInk', o);
    }
  },

  addStat(list: RenderList, r: Rect, stat: Stat, o: number): void {
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    const empty = stat.value === S.progress.none;
    drawText(list, stat.value, v(r.minX + 16, c.y - 8), ShopPage.fitted(stat.value, 22, R.width(r) - 32), empty ? 'muted' : 'primary', { opacity: o, weight: 'bold' });
    drawText(list, stat.label, v(r.minX + 16, c.y + 16), ShopPage.fitted(stat.label, 11, R.width(r) - 32), 'muted', { opacity: o });
  },

  odometerKm: (c: Career): number => (c.stats.cars ?? 0) * ProgressPage.tripKm,

  /**
   * A car's odometer: a row of drums in a dark window, the leading zeros faint. Coming in, the last stretch rolls up
   * like a real one, each drum turning on only as the one to its right passes nine. Past the Moon, a crescent.
   */
  addOdometer(list: RenderList, r: Rect, career: Career, age: number, o: number): void {
    ProgressPage.panel(list, r, o);
    const km = ProgressPage.odometerKm(career);
    const moon = km >= ProgressPage.moonKm;
    const x0 = r.minX + 16;
    drawText(list, S.progress.odometer, v(x0, r.minY + 20), 13, 'muted', { opacity: o, weight: 'bold' });
    drawFitted(list, moon ? S.progress.odometerMoon : S.progress.odometerLine, v(x0, r.maxY - 16), 11, R.width(r) - 32, moon ? 'primary' : 'muted', { opacity: o * (moon ? 0.85 : 1) });
    const roll = Ease.outCubic(Ease.clamp01((age - 0.15) / 1.2));
    const shown = km - (1 - roll) * Math.min(km, ProgressPage.odometerRoll);
    const digits = Math.max(7, String(km).length);
    const cell = v(18, 28);
    const y = r.minY + 50;
    const meaningful = String(km).length;
    for (let i = 0; i < digits; i++) {
      const place = digits - 1 - i;
      const box = R.make(x0 + i * (cell.x + 3), y - cell.y / 2, x0 + i * (cell.x + 3) + cell.x, y + cell.y / 2);
      const centre = R.center(box);
      list.s(rect(centre, cell, 4), 'background', 0.85 * o);
      const unit = 10 ** place;
      const below = shown % unit;
      const turn = below >= unit - 1 ? below - (unit - 1) : 0;
      const digit = Math.floor(shown / unit) % 10;
      const faint = place >= meaningful;
      const start = list.items.length;
      for (const [d, dy] of [
        [digit, -turn],
        [(digit + 1) % 10, 1 - turn],
      ] as const) {
        if (Math.abs(dy) >= 1) continue;
        drawText(list, String(d), v(centre.x, centre.y + 1 + dy * cell.y), 17, faint ? 'muted' : 'primary', { opacity: o * (faint ? 0.4 : 1), weight: 'bold', align: 'center' });
      }
      clipTo(list, start, box);
      // The drum's curve: the figures dim towards the top and bottom of the window.
      for (const edge of [-1, 1]) list.s(rect(add(centre, v(0, edge * (cell.y / 2 - 3.5))), v(cell.x, 7), 3), 'background', 0.5 * o);
    }
    drawText(list, S.progress.km, v(x0 + digits * (cell.x + 3) + 4, y + 1), 13, 'muted', { opacity: o, weight: 'bold' });
    if (moon) ProgressPage.addMoon(list, v(r.maxX - 30, r.minY + 34), o);
  },

  /** A crescent with a faint halo and one star beside it. */
  addMoon(list: RenderList, at: Vec2, o: number): void {
    list.s(circle(at, 15), 'headlight', 0.07 * o);
    list.s(circle(at, 9), 'headlight', 0.95 * o);
    list.s(circle(add(at, v(4, -3)), 7.6), 'card', o);
    list.s(circle(add(at, v(-15, 10)), 1.1), 'primary', 0.6 * o);
  },

  addMore(list: RenderList, r: Rect, count: number, open: boolean, o: number): void {
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    drawText(list, S.progress.allStats, v(r.minX + 16, c.y), 14, 'primary', { opacity: o, weight: 'bold' });
    drawText(list, open ? S.progress.statsHide : S.progress.statsMore(count), v(r.maxX - 16, c.y), 12, 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  /** The rest of the stats as one grouped list: label left, value right, hairlines between. */
  addStatList(list: RenderList, r: Rect, stats: Stat[], o: number): void {
    ProgressPage.panel(list, r, o);
    stats.forEach((stat, i) => {
      const y = r.minY + i * STAT_ROW + STAT_ROW / 2;
      if (i > 0) list.s(line(v(r.minX + 16, y - STAT_ROW / 2), v(r.maxX, y - STAT_ROW / 2), 0.5), 'separator', o);
      const valueWidth = textWidth(stat.value, 13) + 8;
      drawText(list, stat.label, v(r.minX + 16, y), ShopPage.fitted(stat.label, 13, R.width(r) - 32 - valueWidth), 'muted', { opacity: o });
      drawText(list, stat.value, v(r.maxX - 16, y), 13, 'primary', { opacity: o, weight: 'bold', align: 'trailing' });
    });
  },

  /**
   * The streak, big: a car's tailpipe with a flame that grows with the days (`streakFlame.ts`), the number
   * beside it, and under them the road of milestones (a post per streak day prize, the reached ones gold,
   * the next one breathing) so a streak is more than a number.
   */
  addStreak(list: RenderList, r: Rect, career: Career, today: number, clock: number, reduceMotion: boolean, o: number): void {
    const P = S.progress;
    const days = career.dailyStreak;
    const tier = flameTier(days);
    ProgressPage.panel(list, r, o);
    if (tier >= 3) list.s(rect(R.center(r), v(R.width(r), R.height(r)), ShopPage.corner), 'fireDeep', 0.05 * tier * o);
    const scene = R.make(r.minX, r.minY, r.maxX, r.minY + 196);
    StreakFlame.add(list, scene, days, clock, reduceMotion, o);
    drawText(list, '›', v(r.maxX - 14, r.minY + 14), 18, 'muted', { opacity: o, align: 'center' });
    const x = r.minX + R.width(r) * 0.8;
    const hot: ColorToken = tier >= 4 ? 'fireCore' : tier >= 1 ? 'fireOuter' : 'muted';
    drawText(list, P.flameTier(tier), v(x, r.minY + 24), 11, hot, { opacity: o, weight: 'bold', align: 'center' });
    const pop = reduceMotion ? 1 : 1 + 0.04 * Math.max(0, Math.sin(clock * 3.1)) * Math.min(1, tier / 3);
    drawText(list, String(days), v(x, r.minY + 66), ShopPage.fitted(String(days), 52, R.width(r) * 0.28) * pop, days > 0 ? 'primary' : 'muted', { opacity: o, weight: 'bold', align: 'center' });
    drawText(list, days === 1 ? P.streakDay : P.streakDays, v(x, r.minY + 98), 12, 'muted', { opacity: o, align: 'center' });

    // The milestones as a road: days under each post, chests a little bigger. The stretch already driven is warm.
    const next = Careers.nextStreakMilestone(career);
    const posts = Careers.streakRoad(career);
    const roadY = r.minY + 214;
    const rx0 = r.minX + 24;
    const rx1 = r.maxX - 24;
    list.s(line(v(r.minX + 16, roadY - 36), v(r.maxX - 16, roadY - 36), 0.5), 'separator', 0.6 * o);
    list.s(rect(v((rx0 + rx1) / 2, roadY), v(rx1 - rx0 + 8, 6), 3), 'controlFill', o);
    const segments = Math.max(1, posts.length - 1);
    let along = 0;
    if (days > 0 && posts.length > 0) {
      const last = posts[posts.length - 1].days;
      if (days >= last) along = 1;
      else if (days <= posts[0].days) along = days / posts[0].days / segments;
      else {
        const k = posts.findIndex((post) => days < post.days);
        const before = posts[k - 1];
        along = (k - 1 + (days - before.days) / (posts[k].days - before.days)) / segments;
      }
    }
    if (along > 0) list.s(rect(v(rx0 + (rx1 - rx0) * along * 0.5, roadY), v((rx1 - rx0) * along, 6), 3), 'hazard', 0.4 * o);
    posts.forEach((post, i) => {
      const at = v(rx0 + ((rx1 - rx0) * i) / segments, roadY);
      const isNext = next !== null && next.days === post.days;
      const radius = post.prize.k === 'chest' ? 5.6 : 4.2;
      if (isNext && !post.reached) {
        const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 3);
        list.s(circle(at, radius + 3 + pulse * 1.6), 'accent', (0.25 + 0.25 * pulse) * o);
      }
      list.s(circle(at, radius), post.reached ? 'coin' : isNext ? 'accent' : 'controlFill', o);
      if (post.reached) list.s(circle(at, radius * 0.42), 'background', 0.45 * o);
      drawText(list, String(post.days), v(at.x, roadY + 14), 8, post.reached ? 'coin' : isNext ? 'accent' : 'muted', { opacity: o, weight: isNext ? 'bold' : 'regular', align: 'center' });
    });

    const open = Careers.isDailyOpen(career, today);
    const wide = R.width(r) - 32;
    const status = days === 0 ? P.streakStart : open ? P.streakKeep : P.streakDone;
    drawText(list, status, v(r.minX + 16, r.maxY - 42), ShopPage.fitted(status, 12, wide), open || days === 0 ? 'accent' : 'muted', { opacity: o, weight: 'bold' });
    const perfect = Careers.perfectWeekProgress(career, today, baseConfig);
    const maxHeat = Careers.maxHeat(career, today);
    const perfectText = perfect.paid ? S.daily.perfectWeekDone : S.daily.perfectWeekProgress(perfect.days, baseConfig.perfectWeekDays);
    const nextText = next ? `${S.daily.prize(next.prize)} ${S.daily.stripRewardIn(next.left)}` : null;
    const extra = [perfectText, nextText, career.streakFreezes > 0 ? S.daily.freezes(career.streakFreezes) : null, maxHeat > 0 ? S.heat.button(maxHeat) : null].filter((x): x is string => x !== null).join(' · ');
    drawText(list, extra, v(r.minX + 16, r.maxY - 22), ShopPage.fitted(extra, 11, wide), 'muted', { opacity: o });
  },

  addDaily(list: RenderList, r: Rect, career: Career, today: number, o: number): void {
    ProgressPage.panel(list, r, o);
    const open = Careers.isDailyOpen(career, today);
    const next = Careers.nextStreakMilestone(career);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, { title: S.daily.name, line: S.daily.rowLine(career.dailyStreak, open, next, career.streakFreezes, Goals.daysToFreeze(career, baseConfig), dailyEvent(today + 1)), status: open ? S.daily.ready : `${S.daily.done} ✓`, done: !open });
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
      ...(passed ? { status: `${S.daily.done} ✓`, done: true } : { reward: shift.reward }),
      link: `${S.weekly.daysLeft(weekDaysLeft(today))} · ${S.trials.play} ›`,
    });
  },

  /**
   * The Season Pass: this season's track, tap for the sheet. Open, it is the loudest card of Today
   * (Leo, 06.10.2026): a picture of the season with its top skin, a halo in the season's colour that
   * breathes, a glint that sweeps across, and the whole track as a row of dots.
   */
  addPass(list: RenderList, r: Rect, career: Career, today: number, clock: number, reduceMotion: boolean, o: number): void {
    const season = SeasonPass.season(today);
    const title = S.pass.caption(season);
    const days = `${S.pass.daysLeft(SeasonPass.daysLeft(today))} ›`;
    const tint = SEASON_TINT[season];
    const t = reduceMotion ? 0 : clock;
    const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
    const c = R.center(r);
    const size = v(R.width(r), R.height(r));
    // One edge only: the halo breathes around the card, the card itself keeps the panel's look (no second rim).
    list.s(rect(c, add(size, v(10 + 4 * pulse, 10 + 4 * pulse)), ShopPage.corner + 5), tint, (0.1 + 0.1 * pulse) * o);
    ProgressPage.panel(list, r, o);
    list.s(rect(c, size, ShopPage.corner), tint, 0.06 * o);
    if (!reduceMotion) {
      // A glint sweeping across every few seconds.
      const sweep = (t % 5) / 1.1;
      if (sweep < 1) {
        const saved = list.clip;
        list.clip = r;
        list.s(rect(v(r.minX - 30 + (R.width(r) + 60) * sweep, c.y), v(22, R.height(r) * 1.6), 6, 0.35), 'primary', 0.1 * Math.sin(Math.PI * sweep) * o);
        list.clip = saved;
      }
    }
    const side = Math.min(92, R.width(r) * 0.3);
    const tile = R.make(r.minX + 12, r.minY + 12, r.minX + 12 + side, r.maxY - 12);
    PassArt.add(list, tile, season, SeasonPass.skins(season)[2], clock, reduceMotion, o);
    const x = tile.maxX + 14;
    const top = R.make(r.minX, r.minY, r.maxX, r.minY + 64);
    const owned = SeasonPass.owns(career, today);
    const counts = SeasonPass.counts(career, today);
    const tier = counts ? SeasonPass.tier(career, today) : 0;
    const waiting = SeasonPass.waiting(career, today);
    const open = SeasonPass.openAtEnd(career, today);
    if (owned || (counts && waiting === 0)) {
      const { into, need } = SeasonPass.progress(career, today);
      ProgressPage.addCardRow(list, top, x, o, { title, line: open > 0 ? S.pass.openAtEnd(open) : `${S.pass.tier(tier, PASS_TIERS)} · ${S.pass.xp(into, need)}`, link: days });
    } else ProgressPage.addCardRow(list, top, x, o, { title, line: waiting > 0 ? S.pass.waiting(waiting) : S.pass.buyHint, reward: baseConfig.seasonPassPrice, link: days });
    // The whole track as a road (Leo, 18.10.2026): one post a tier, the three skin tiers bigger and in the season's
    // colour, the stretch behind the player paved gold, and a little car where the player stands, gliding on when it grew.
    const right = r.maxX - 16;
    const step = (right - x) / (PASS_TIERS - 1);
    const roadY = r.minY + 82;
    const { into, need } = SeasonPass.progress(career, today);
    const share = !counts ? 0 : tier >= PASS_TIERS ? 1 : into / need;
    const along = Meter.glided('passRoad', (tier - 1 + share) / (PASS_TIERS - 1), reduceMotion);
    const carX = x + (right - x) * along;
    list.s(rect(v((x + right) / 2, roadY), v(right - x + 12, 10), 5), 'controlFill', o);
    if (carX > x) list.s(rect(v((x - 6 + carX) / 2, roadY), v(carX - x + 6, 10), 5), 'coin', 0.28 * o);
    for (let k = 1; k <= PASS_TIERS; k++) {
      const at = v(x + (k - 1) * step, roadY);
      const skinTier = SeasonPass.reward(k, season).k === 'skin';
      const reached = k <= tier;
      if (skinTier) list.s(circle(at, 5.5), reached ? tint : 'card', o);
      list.s(circle(at, skinTier ? 2.6 : 1.8), reached ? (skinTier ? 'primary' : 'coin') : skinTier ? tint : 'muted', o * (reached || skinTier ? 1 : 0.6));
    }
    ProgressPage.passCar(list, v(carX, roadY), o);
    // And the next tier's progress under it.
    Meter.add(list, 'pass', R.make(x, r.maxY - 26, right, r.maxY - 26 + Meter.height), share, tier, o, reduceMotion);
  },

  /** The player on the Season Pass' road: a soft little car seen from above, nose to the right, its lights on. White like an ordinary car: amber would read as the bus. */
  passCar(list: RenderList, at: Vec2, o: number): void {
    list.s(rect(at, v(30, 20), 10), 'card', o);
    list.s(rect(at, v(22, 13), 6), 'primary', o);
    list.s(rect(add(at, v(2, 0)), v(6, 9), 2.5), 'card', 0.8 * o);
    list.s(rect(add(at, v(-6, 0)), v(3, 8), 1.5), 'card', 0.45 * o);
    list.s(circle(add(at, v(9, -3.6)), 1.5), 'accent', o);
    list.s(circle(add(at, v(9, 3.6)), 1.5), 'accent', o);
  },

  addQuest(list: RenderList, r: Rect, career: Career, challenge: Challenge, today: number, o: number): void {
    const c = R.center(r);
    const done = Careers.isChallengeDone(career, challenge, today);
    ProgressPage.panel(list, r, o);
    ProgressPage.check(list, v(r.minX + 24, c.y), done, o);
    const label = S.daily.challenge(challenge);
    const status = done ? `${S.daily.done} ✓` : Fmt.number(challengeReward(challenge, Careers.reach(career)));
    const tag = textWidth(status, 13) + (done ? 0 : 18);
    drawFitted(list, label, v(r.minX + 44, c.y), 13, R.width(r) - 44 - 16 - tag - 12, done ? 'muted' : 'primary', { opacity: o, weight: 'bold' });
    if (done) drawText(list, status, v(r.maxX - 16, c.y), 13, 'coin', { opacity: o, weight: 'bold', align: 'trailing' });
    else moneyTag(list, status, v(r.maxX - 16, c.y), 13, 'trailing', 'primary', 'accent', o);
  },

  /** Landmarks show from the Prestige rank that opens them, or once one was passed. */
  showsLandmarks: (career: Career): boolean => career.prestige >= LANDMARK_PRESTIGE || LANDMARKS.some((x) => career.trialsDone.includes(x.id)),

  /** Boss Rush: tap to run all eight bosses in a row; a clear pays once, the best time stays. */
  addRush(list: RenderList, r: Rect, career: Career, full: number): void {
    const c = R.center(r);
    ProgressPage.panel(list, r, full);
    const done = career.trialsDone.includes(RUSH_ID);
    Signs.rush(list, v(r.minX + SIGN_AT, c.y), BOSS_KINDS.length, done, full);
    const extra = career.rushBest > 0 ? `best ${S.rush.time(career.rushBest)}` : career.rushFurthest > 0 ? S.rush.furthest(career.rushFurthest, BOSS_KINDS.length) : null;
    ProgressPage.addCardRow(list, r, r.minX + SIGN_TEXT, full, {
      title: S.rush.rowTitle,
      line: extra ? `${S.rush.line} · ${extra}` : S.rush.line,
      ...(done ? { status: `${S.daily.done} ✓`, done: true } : { reward: RUSH_REWARD }),
      link: `${S.trials.play} ›`,
    });
  },

  /** Boss Rush before all eight bosses are down: quiet, and says what opens it. */
  addRushLocked(list: RenderList, r: Rect, career: Career, full: number): void {
    const o = full * 0.55;
    const c = R.center(r);
    ProgressPage.panel(list, r, o);
    Signs.rush(list, v(r.minX + SIGN_AT, c.y), BOSS_KINDS.length, false, o);
    ProgressPage.addCardRow(list, r, r.minX + SIGN_TEXT, o, { title: S.rush.rowTitle, line: S.rush.locked(career.bossesBeaten.length, BOSS_KINDS.length), dim: true });
  },

  /** Each kind of trial has a sign of its own: the Level trials' number, an Ascension's rank, a Landmark's tourist sign, else the chequered flag. */
  trialSign(list: RenderList, at: Vec2, trial: Trial, done: boolean, o: number): void {
    const level = levelTrialLevel(trial.id);
    const rank = ascensionRank(trial.id);
    if (level !== null) Signs.levelTrial(list, at, level, done, o);
    else if (rank !== null) Signs.ascension(list, at, rank, done, o);
    else if (landmarkOf(trial.id)) Signs.landmark(list, at, done, o);
    else Signs.trial(list, at, done, o);
  },

  /** A trial: tap to play it; each pays once. One above the career's level waits, quieter, and says when it opens. */
  addTrial(list: RenderList, r: Rect, career: Career, trial: Trial, full: number): void {
    const c = R.center(r);
    if (!trialOpen(trial, career)) {
      const o = full * 0.55;
      ProgressPage.panel(list, r, o);
      ProgressPage.trialSign(list, v(r.minX + SIGN_AT, c.y), trial, false, o);
      ProgressPage.addCardRow(list, r, r.minX + SIGN_TEXT, o, { title: S.trials.name(trial.id), line: S.trials.opens(trial), dim: true });
      return;
    }
    ProgressPage.panel(list, r, full);
    const done = career.trialsDone.includes(trial.id);
    ProgressPage.trialSign(list, v(r.minX + SIGN_AT, c.y), trial, done, full);
    ProgressPage.addCardRow(list, r, r.minX + SIGN_TEXT, full, {
      title: S.trials.name(trial.id),
      line: `${S.trials.level(trial.level)} · ${S.trials.goal(trial)}`,
      ...(done ? { status: `${S.daily.done} ✓`, done: true } : { reward: trial.reward }),
      link: `${S.trials.play} ›`,
    });
  },

  /** A quiet row with nothing to tap: a title and a line under it. */
  addInfoRow(list: RenderList, r: Rect, title: string, line: string, o: number): void {
    ProgressPage.panel(list, r, o);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, { title, line });
  },

  /** The season and its rule for the sky. */
  addSeason(list: RenderList, r: Rect, today: number, o: number): void {
    const season = seasonOf(today);
    ProgressPage.panel(list, r, o);
    ProgressPage.addCardRow(list, r, r.minX + 16, o, { title: S.seasonRule.name(season), line: S.seasonRule.line(season), status: S.pass.seasonName(season) });
  },

  /** The tour's top skin: what its last stop pays. */
  tourSkin: (tour: TourDef) => cosmetic(tour.stops[tour.stops.length - 1].reward.item ?? ''),

  /** A tour that has not started: its picture with the name and when it comes. */
  addTourInfo(list: RenderList, r: Rect, b: Extract<Block, { k: 'tourInfo' }>, clock: number, reduceMotion: boolean, o: number): void {
    ProgressPage.panel(list, r, o);
    const side = R.height(r) - 24;
    const tile = R.make(r.minX + 12, r.minY + 12, r.minX + 12 + side, r.maxY - 12);
    const def = TOURS.find((x) => x.id === b.tour);
    TourArt.add(list, tile, b.tour, def && ProgressPage.tourSkin(def), clock, reduceMotion, o);
    ProgressPage.addCardRow(list, r, tile.maxX + 14, o, { title: b.title, line: b.line, dim: true });
  },

  /**
   * The tour running today (Leo, 08.10.2026: a picture like the Season Pass's): the tour's sky with its top skin on the
   * left, its name and days left, the stops as dots, and the way in.
   */
  addTour(list: RenderList, r: Rect, career: Career, today: number, clock: number, reduceMotion: boolean, o: number): void {
    const run = tourOn(today);
    if (!run) return;
    const tint = TOUR_TINT[run.tour.id];
    const t = reduceMotion ? 0 : clock;
    const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
    const c = R.center(r);
    const size = v(R.width(r), R.height(r));
    list.s(rect(c, add(size, v(10 + 4 * pulse, 10 + 4 * pulse)), ShopPage.corner + 5), tint, (0.1 + 0.1 * pulse) * o);
    ProgressPage.panel(list, r, o);
    list.s(rect(c, size, ShopPage.corner), tint, 0.06 * o);
    const side = Math.min(92, R.width(r) * 0.3);
    const tile = R.make(r.minX + 12, r.minY + 12, r.minX + 12 + side, r.maxY - 12);
    TourArt.add(list, tile, run.tour.id, ProgressPage.tourSkin(run.tour), clock, reduceMotion, o);
    const done = tourStopsDone(career, run);
    const total = run.tour.stops.length;
    const x = tile.maxX + 14;
    const right = r.maxX - 16;
    const name = S.tours.name(run.tour.id);
    const left = S.tours.left(run.daysLeft);
    drawText(list, left, v(right, r.minY + 24), 12, run.daysLeft <= 2 ? 'hazard' : 'muted', { opacity: o, weight: 'bold', align: 'trailing' });
    drawFitted(list, name, v(x, r.minY + 24), 15, right - x - textWidth(left, 12) - 8, done === total ? 'coin' : 'primary', { opacity: o, weight: 'bold' });
    drawFitted(list, S.tours.tagline(run.tour.id), v(x, r.minY + 44), 11, right - x, 'muted', { opacity: o });
    // The stops as dots; the next one has a ring, and the last one is bigger (it holds the boss).
    const next = ProgressPage.nextStop(career, today);
    const gap = Math.min(30, (right - x - 18) / Math.max(1, total - 1));
    for (let i = 0; i < total; i++) {
      const at = v(x + 9 + i * gap, r.minY + 72);
      const finished = career.toursDone.includes(stopDoneKey(run.key, i + 1));
      const last = i === total - 1;
      if (i + 1 === next && done < total) list.s(circle(at, (last ? 11 : 9.5) + 1.5), 'accent', 0.55 * o);
      list.s(circle(at, last ? 9 : 7.5), finished ? 'coin' : 'controlFill', o);
      if (finished) {
        list.s(line(add(at, v(-3.5, 0)), add(at, v(-1, 2.8)), 1.8), 'accentInk', o);
        list.s(line(add(at, v(-1, 2.8)), add(at, v(4, -3)), 1.8), 'accentInk', o);
      }
    }
    const status = done === total ? `${S.daily.done} ✓` : S.tours.progress(done, total);
    drawText(list, status, v(x, r.maxY - 18), 11, done === total ? 'coin' : 'muted', { opacity: o });
    drawText(list, S.tours.play, v(right, r.maxY - 18), 12, 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  /** One achievement family: its name, the next tier's ask, pips for the tiers and a bar towards the next. */
  addAchievement(list: RenderList, r: Rect, save: SaveGame, f: Family, o: number, reduceMotion: boolean): void {
    Meter.addWave(list, `ach:${f.id}`, r, ShopPage.corner, o, reduceMotion);
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    const reached = Achievements.reached(save.career, f);
    const tiers = f.tiers.length;
    const complete = reached >= tiers;
    const have = f.value(save);
    const need = f.tiers[Math.min(reached, tiers - 1)];
    const top = c.y - R.height(r) * 0.2;
    const pipsWidth = tiers * 14;
    const x = r.minX + SIGN_TEXT;
    Signs.limit(list, v(r.minX + SIGN_AT, c.y), reached, complete, o);
    drawText(list, S.ach.name(f.id), v(x, top), 13, complete ? 'coin' : 'primary', { opacity: o, weight: 'bold' });
    for (let tier = 0; tier < tiers; tier++) list.s(circle(v(r.maxX - 16 - pipsWidth + tier * 14 + 7, top), 5), tier < reached ? 'coin' : 'controlFill', o);
    const goal = S.ach.goal(f.id, need);
    const count = complete ? '' : `${Fmt.number(Math.min(have, need))}/${Fmt.number(need)}`;
    const lineY = c.y + R.height(r) * 0.04;
    drawText(list, count, v(r.maxX - 16, lineY), 11, 'muted', { opacity: o, align: 'trailing' });
    drawFitted(list, goal, v(x, lineY), 11, r.maxX - 16 - x - textWidth(count, 11) - 10, 'muted', { opacity: o });
    const from = reached === 0 ? 0 : f.tiers[reached - 1];
    const fraction = complete ? 1 : Ease.clamp01((have - from) / Math.max(1, need - from));
    const barY = c.y + R.height(r) * 0.3;
    Meter.add(list, `ach:${f.id}`, R.make(x, barY - Meter.height / 2, r.maxX - 16, barY + Meter.height / 2), fraction, reached, o, reduceMotion);
  },

  /** Elite level, title, the bar to the next level and what the next milestone brings. */
  addEliteCard(list: RenderList, card: Rect, c: Career, o: number, reduceMotion: boolean): void {
    const open = Elite.isOpen(c);
    // Prestige in reach: a gold ring round the card and a gold pill say so, where the badges usually sit.
    const ready = open && Careers.canPrestige(c);
    Meter.addWave(list, 'elite', card, ShopPage.corner, o, reduceMotion);
    if (ready) list.s(rect(R.center(card), v(R.width(card) + 4, R.height(card) + 4), ShopPage.corner + 2), 'coin', 0.9 * o);
    ProgressPage.panel(list, card, o);
    const top = card.minY + 22;
    drawText(list, open ? S.elite.caption(Elite.level(c)) : S.elite.title, v(card.minX + 16, top), 15, open ? 'coin' : 'muted', { opacity: o, weight: 'bold' });
    if (ready) {
      const label = `${S.elite.prestigeAction(c.prestige + 1)} ›`;
      const width = textWidth(label, 12) + 20;
      list.s(rect(v(card.maxX - 16 - width / 2, top), v(width, 22), 11), 'coin', o);
      drawText(list, label, v(card.maxX - 16 - width / 2, top), 12, 'background', { opacity: o, weight: 'bold', align: 'center' });
    } else {
      const badges = [c.prestige > 0 ? S.prestige.caption(c.prestige) : null, c.title ? S.titles.name(c.title) : null].filter((x): x is string => !!x);
      drawText(list, [...badges, '›'].join(' · ').replace(' · ›', ' ›'), v(card.maxX - 16, top), 12, badges.length > 0 ? 'coin' : 'muted', { opacity: o, weight: 'bold', align: 'trailing' });
    }
    const barY = card.minY + 42;
    const barWidth = R.width(card) - 32;
    const { into, need } = Elite.progress(c);
    Meter.add(list, 'elite', R.make(card.minX + 16, barY - Meter.height / 2, card.maxX - 16, barY + Meter.height / 2), open ? into / need : 0, open ? Elite.level(c) : 0, o, reduceMotion);
    const bottom = card.minY + 60;
    if (!open) {
      const hint = S.elite.locked(baseConfig.prestigeLevel);
      drawText(list, hint, v(card.minX + 16, bottom), ShopPage.fitted(hint, 11, barWidth), 'muted', { opacity: o });
      return;
    }
    const xp = S.elite.xp(into, need);
    drawText(list, xp, v(card.minX + 16, bottom), 11, 'muted', { opacity: o });
    const next = Elite.nextMilestone(c);
    const lineText = next ? S.elite.next(next) : null;
    if (lineText) {
      const room = barWidth - textWidth(xp, 11) - 16;
      drawText(list, lineText, v(card.maxX - 16, bottom), ShopPage.fitted(lineText, 11, room), 'muted', { opacity: o, align: 'trailing' });
    }
  },

  /**
   * A Feat: one of the hardest deeds, with its reward shown (what you play for is no secret),
   * the goal, how far you are, and the title it adds. A tap opens its sheet.
   */
  addFeat(list: RenderList, r: Rect, career: Career, feat: Feat, state: ProgressState, o: number, reduceMotion: boolean): void {
    const c = R.center(r);
    const item = cosmetic(feat.id);
    if (!item) return;
    const { have, need } = Feats.progress(feat, career);
    const complete = have >= need;
    Meter.addWave(list, `feat:${feat.id}`, r, ShopPage.corner, o, reduceMotion);
    if (state.feat === feat.id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
    ProgressPage.panel(list, r, o);
    // The reward on a quiet tile, rimmed in its rarity (gold once earned), dimmed until it is earned; a small warning
    // badge in the tile's corner says these are the hardest deeds. Its glow and sparks stay inside the card.
    const at = v(r.minX + 34, c.y);
    const rim = complete ? 'coin' : ShopPage.rarityColor(item.rarity);
    list.s(rect(at, v(46, 46), 13), rim, (complete ? 0.9 : 0.5) * o);
    list.s(rect(at, v(43, 43), 11.5), 'card', o);
    list.s(rect(at, v(43, 43), 11.5), 'controlFill', o);
    const from = list.items.length;
    MenuKit.glow(list, at, 20, rim, (complete ? 0.3 : 0.14) * o);
    ShopPage.addPreview(list, item, at, 0.6, o * (complete ? 1 : 0.55));
    for (let k = from; k < list.items.length; k++) list.items[k] = { ...list.items[k], clip: r };
    Signs.triangle(list, v(at.x - 19, at.y - 19), complete, o);
    const x = r.minX + 64;
    const top = c.y - R.height(r) * 0.22;
    const right = complete ? S.feats.done : S.feats.have(have, need);
    const rightWidth = textWidth(right, 12) + 4;
    const name = S.shop.item(feat.id);
    drawText(list, name, v(x, top), ShopPage.fitted(name, 14, r.maxX - 16 - rightWidth - x - 8), complete ? 'coin' : 'primary', { opacity: o, weight: 'bold' });
    drawText(list, right, v(r.maxX - 16, top), 12, complete ? 'coin' : 'muted', { opacity: o, weight: 'bold', align: 'trailing' });
    const goal = feat.title ? `${S.feats.goal(feat.goal)} · ${S.feats.withTitle(S.titles.name(feat.title))}` : S.feats.goal(feat.goal);
    drawText(list, goal, v(x, c.y + R.height(r) * 0.02), ShopPage.fitted(goal, 11, r.maxX - 16 - x), 'muted', { opacity: o });
    const barY = c.y + R.height(r) * 0.27;
    Meter.add(list, `feat:${feat.id}`, R.make(x, barY - Meter.height / 2, r.maxX - 16, barY + Meter.height / 2), have / need, 0, o, reduceMotion);
  },

  addMastery(list: RenderList, r: Rect, career: Career, goal: MasteryGoal, o: number, reduceMotion: boolean): void {
    Meter.addWave(list, `mastery:${goal}`, r, ShopPage.corner, o, reduceMotion);
    ProgressPage.panel(list, r, o);
    const c = R.center(r);
    const thresholds = MASTERY_THRESHOLDS[goal];
    const tiers = thresholds.length;
    const reached = Math.min(career.masteryTiers[goal] ?? 0, tiers);
    const complete = reached >= tiers;
    const top = c.y - R.height(r) * 0.2;
    const pipsWidth = tiers * 14;
    const x = r.minX + SIGN_TEXT;
    Signs.diamond(list, v(r.minX + SIGN_AT, c.y), reached, complete, o);
    // Name and detail share the row beside the sign: the name keeps its length up to a little over half, the detail fits into the rest.
    const name = S.mastery.name(goal);
    const detail = S.mastery.detail(goal, reached);
    const room = r.maxX - 16 - pipsWidth - 6 - x - 8;
    const nameWidth = Math.min(textWidth(name, 13), Math.max(room * 0.55, room - textWidth(detail, 11, false)));
    drawFitted(list, name, v(x, top), 13, nameWidth, 'primary', { opacity: o, weight: 'bold' });
    drawFitted(list, detail, v(r.maxX - 16 - pipsWidth - 6, top), 11, room - nameWidth, complete ? 'coin' : 'muted', { opacity: o, align: 'trailing' });
    for (let tier = 0; tier < tiers; tier++) list.s(circle(v(r.maxX - 16 - pipsWidth + tier * 14 + 7, top), 5), tier < reached ? 'coin' : 'controlFill', o);
    const from = reached === 0 ? 0 : thresholds[reached - 1];
    const fraction = complete ? 1 : Ease.clamp01((masteryValue(goal, career.mastery) - from) / Math.max(1, thresholds[reached] - from));
    const barY = c.y + R.height(r) * 0.22;
    Meter.add(list, `mastery:${goal}`, R.make(x, barY - Meter.height / 2, r.maxX - 16, barY + Meter.height / 2), fraction, reached, o, reduceMotion);
  },
};
