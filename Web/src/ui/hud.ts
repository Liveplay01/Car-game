import type { HudState } from '../game/session';
import { formatMultiplier } from '../game/session';
import type { Career, GameMode, ShiftRecord } from '../core/career';
import { MASTERY_GOALS } from '../core/career';
import type { ShiftResult } from '../core/events';
import { CHEST_NAMES } from '../core/loot';
import { h, icon, setText, fmt, fmtTime } from './dom';
import { ICONS } from './icons';

export interface HudActions {
  pause(): void;
  settings(): void;
  dispatch(): void;
  mode(mode: GameMode): void;
}

/**
 * The HUD over the scene (FOUNDATION.md 3): before the shift the level, cars and money; in
 * the shift the score top left, the cars still missing top centre, pause top right.
 */
export class Hud {
  private readonly readyLeft: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly levelSub: HTMLElement;
  private readonly playLeft: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly scoreLabel: HTMLElement;
  private readonly carsPill: HTMLElement;
  private readonly dots: HTMLElement;
  private readonly wanted: HTMLElement;
  private readonly moneyEl: HTMLElement;
  private readonly moneyChip: HTMLElement;
  private readonly settingsBtn: HTMLElement;
  private readonly pauseBtn: HTMLElement;
  private readonly readyControls: HTMLElement;
  private readonly segButtons: HTMLButtonElement[];
  private readonly segThumb: HTMLElement;
  private readonly dispatchEl: HTMLElement;
  private readonly liveRegion: HTMLElement;
  private banner: HTMLElement | null = null;
  private lastDots = '';
  private lastMode: GameMode | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly app: HTMLElement,
    actions: HudActions,
  ) {
    this.levelEl = h('div', { class: 'hud-level' });
    this.levelSub = h('div', { class: 'hud-sub num' });
    this.readyLeft = h('div', {}, this.levelEl, this.levelSub);
    this.scoreEl = h('div', { class: 'hud-score', 'aria-label': 'Score' }, '0');
    this.scoreLabel = h('div', { class: 'hud-score-label num' });
    this.playLeft = h('div', {}, this.scoreEl, this.scoreLabel);
    this.carsPill = h('div', { class: 'pill glass' });
    this.dots = h('div', { class: 'dots', 'aria-label': 'Police crashes' });
    this.wanted = h('div', { class: 'pill wanted', role: 'status' });
    this.moneyEl = h('span', { class: 'num' }, '0');
    this.moneyChip = h('div', { class: 'money-chip glass', 'aria-label': 'Money' }, icon(ICONS.coin, { fill: true }), this.moneyEl);
    this.moneyChip.querySelector('svg')?.classList.add('coin');
    this.settingsBtn = h('button', { class: 'icon-btn glass', 'aria-label': 'Settings', onclick: () => actions.settings() }, icon(ICONS.gear));
    this.pauseBtn = h('button', { class: 'icon-btn glass', 'aria-label': 'Pause', onclick: () => actions.pause() }, icon(ICONS.pause, { fill: true }));

    const left = h('div', { class: 'hud-left' }, this.readyLeft, this.playLeft);
    const center = h('div', { class: 'hud-center' }, this.carsPill, this.dots, this.wanted);
    const right = h('div', { class: 'hud-right' }, this.moneyChip, this.settingsBtn, this.pauseBtn);
    root.append(h('div', { class: 'hud-row' }, left, center, right));

    // Mode switch: Shift (levels) or Unlimited (FOUNDATION.md 3, Game-Tab Modi).
    this.segThumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
    const modes: [GameMode, string][] = [
      ['shift', 'Shift'],
      ['unlimited', 'Unlimited'],
    ];
    this.segButtons = modes.map(([mode, label]) =>
      h('button', { type: 'button', 'aria-pressed': 'false', 'data-mode': mode, onclick: () => actions.mode(mode) }, label),
    );
    const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Game mode' }, this.segThumb, ...this.segButtons);
    this.readyControls = h('div', { class: 'ready-controls' }, seg);
    root.append(this.readyControls);

    this.dispatchEl = h(
      'div',
      { class: 'dispatch' },
      h('button', { class: 'icon-btn glass', 'aria-label': 'Dispatch police: the next car becomes a police car', onclick: () => actions.dispatch() }, icon(ICONS.siren)),
      h('span', {}, 'Dispatch'),
    );
    root.append(this.dispatchEl);
    this.liveRegion = h('div', { class: 'visually-hidden', 'aria-live': 'polite' });
    root.append(this.liveRegion);
  }

  /** Where the mode switch sits: just under the top row, measured once the layout is known. */
  layout(topRowBottom: number): void {
    this.readyControls.style.top = `${topRowBottom + 12}px`;
  }

  /** Height the HUD takes at the top, for the camera. */
  topInset(): number {
    const row = this.root.querySelector('.hud-row') as HTMLElement;
    const rect = row.getBoundingClientRect();
    const controls = this.readyControls.getBoundingClientRect();
    const phase = this.app.dataset.phase;
    // The result banner sits in the scene: the camera makes room for it.
    if (phase === 'ended' && this.banner) return this.banner.getBoundingClientRect().bottom + 8;
    return (phase === 'ready' ? controls.bottom : rect.bottom) + 10;
  }

  update(s: HudState, career: Career): void {
    const ready = s.phase === 'ready';
    const playing = s.phase === 'playing';
    this.readyLeft.hidden = !ready;
    this.playLeft.hidden = ready;
    this.moneyChip.hidden = !ready;
    this.settingsBtn.hidden = !ready;
    this.pauseBtn.hidden = !playing;
    this.readyControls.style.opacity = ready ? '1' : '0';
    this.readyControls.style.visibility = ready ? 'visible' : 'hidden';
    setText(this.moneyEl, fmt(career.money));

    if (this.lastMode !== s.mode) {
      this.lastMode = s.mode;
      this.segButtons.forEach((b, i) => {
        const on = b.dataset.mode === s.mode;
        b.setAttribute('aria-pressed', String(on));
        if (on) this.segThumb.style.transform = `translateX(${i * 100}%)`;
      });
      this.segThumb.style.width = `calc((100% - 4px) / ${this.segButtons.length})`;
    }

    if (ready) {
      if (s.mode === 'unlimited') {
        setText(this.levelEl, 'Unlimited');
        const best = career.records.unlimitedBest;
        setText(this.levelSub, best > 0 ? `Endless traffic · Best ${fmt(best)}` : 'Endless traffic, ever faster');
      } else {
        setText(this.levelEl, `Level ${s.level}`);
        const best = career.records.bestScore;
        setText(this.levelSub, `${s.shiftCars} cars${best > 0 ? ` · Best ${fmt(best)}` : ''}`);
      }
      this.carsPill.hidden = true;
      this.dots.hidden = true;
      this.wanted.hidden = true;
    } else {
      setText(this.scoreEl, fmt(s.score));
      setText(this.scoreLabel, s.multiplier > 1 ? `×${formatMultiplier(s.multiplier)} combo` : s.mode === 'unlimited' ? 'Unlimited' : `Level ${s.level}`);
      this.carsPill.hidden = false;
      if (s.carsLeft === null) {
        setText(this.carsPill, `${s.carsSent} ${s.carsSent === 1 ? 'car' : 'cars'}`);
        this.carsPill.classList.remove('accent');
      } else if (s.rushHour && s.carsLeft > 0) {
        setText(this.carsPill, `Rush hour · ${s.carsLeft}`);
        this.carsPill.classList.add('accent');
      } else {
        setText(this.carsPill, s.carsLeft === 0 ? 'All in' : `${s.carsLeft} ${s.carsLeft === 1 ? 'car' : 'cars'}`);
        this.carsPill.classList.toggle('accent', s.rushHour);
      }
      const key = `${s.policeCrashes}/${s.maxPoliceCrashes}`;
      if (key !== this.lastDots) {
        this.lastDots = key;
        this.dots.replaceChildren(
          ...Array.from({ length: s.maxPoliceCrashes }, (_, i) => h('i', { class: i < s.policeCrashes ? 'dot used' : 'dot' })),
        );
        this.dots.setAttribute('aria-label', `Police crashes ${s.policeCrashes} of ${s.maxPoliceCrashes}`);
      }
      this.dots.hidden = s.policeCrashes === 0;
      if (s.wantedSeconds !== null) {
        this.wanted.hidden = false;
        setText(this.wanted, `WANTED · ${Math.ceil(s.wantedSeconds)} s`);
      } else if (s.wantedWarning) {
        this.wanted.hidden = false;
        setText(this.wanted, 'WANTED');
      } else {
        this.wanted.hidden = true;
      }
    }
    this.dispatchEl.classList.toggle('show', s.canDispatch && !s.paused);
  }

  announce(text: string): void {
    this.liveRegion.textContent = text;
  }

  // MARK: Result banner

  showBanner(result: ShiftResult, record: ShiftRecord, mode: GameMode, level: number, career: Career): void {
    this.hideBanner();
    const completed = result.outcome === 'completed';
    let title: string;
    let tone = '';
    if (mode === 'unlimited') {
      title = 'Run over';
    } else if (completed) {
      title = result.isPerfectRun ? `Level ${level} · Perfect run` : `Level ${level} complete`;
      tone = 'good';
    } else if (result.outcome === 'escaped') {
      title = 'The criminal escaped';
      tone = 'bad';
    } else {
      title = 'Game over';
      tone = 'bad';
    }
    const best = mode === 'unlimited' ? career.records.unlimitedBest : career.records.bestScore;
    const bestLine = record.newBest
      ? h('span', { class: 'badge' }, 'New highscore')
      : best > 0
        ? `Best ${fmt(best)}`
        : completed || mode === 'unlimited'
          ? ''
          : 'Highscores count for completed shifts';
    const earned = result.money;
    const stats: [string, string][] =
      mode === 'unlimited'
        ? [
            ['Cars', fmt(result.carsSent)],
            ['Time', fmtTime(result.time)],
            ['Best combo', fmt(result.bestCombo)],
            ['Earned', `${earned >= 0 ? '+' : '−'}${fmt(Math.abs(earned))}`],
          ]
        : [
            ['Time', fmtTime(result.time)],
            ['Best combo', fmt(result.bestCombo)],
            ['Tight fits', fmt(result.tightFits)],
            ['Earned', `${earned >= 0 ? '+' : '−'}${fmt(Math.abs(earned))}`],
          ];
    const note = record.masteryChests[0];
    const goal = note ? MASTERY_GOALS.find((g) => g.id === note.goal) : undefined;
    this.banner = h(
      'section',
      { class: 'banner glass', role: 'status', 'aria-live': 'polite' },
      h('div', { class: `banner-title ${tone}` }, title),
      h('div', { class: 'banner-score' }, fmt(result.score)),
      h('div', { class: 'banner-best num' }, bestLine),
      h(
        'div',
        { class: 'banner-stats' },
        ...stats.map(([label, value]) => h('div', {}, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label))),
      ),
      goal && note
        ? h('div', { class: 'banner-note' }, icon(ICONS.chest), `${goal.name} ${'I'.repeat(note.tier + 1)} · ${CHEST_NAMES[note.chest]} in the Shop`)
        : null,
    );
    this.banner.querySelector('.banner-note svg')?.setAttribute('width', '16');
    this.app.append(this.banner);
    this.announce(`${title}. Score ${fmt(result.score)}. Tap to continue.`);
  }

  hideBanner(): void {
    this.banner?.remove();
    this.banner = null;
  }
}
