import { v } from '../core/vec2';
import { baseConfig } from '../core/config';
import type { Detail, DetailAction, DetailRow } from '../present/detail';
import { Details } from '../present/detail';
import { RenderList } from '../present/render';
import { CanvasDrawer } from '../present/draw';
import { css } from '../present/theme';
import { type SignalDetail, SignalLoop } from '../present/museumSignal';
import { MONEY_MARK } from '../present/icons';
import { S } from '../present/strings';
import type { ScreenAction } from '../present/flow';
import { h, icon } from './dom';
import { ICONS } from './icons';

const ART = 88;

/** Text with the money mark turned into a gold coin, built from DOM nodes (never HTML). */
function rich(text: string): DocumentFragment {
  const out = document.createDocumentFragment();
  let run = '';
  for (const ch of text) {
    if (ch === MONEY_MARK) {
      if (run) out.append(run);
      run = '';
      out.append(h('span', { class: 'coin', 'aria-label': 'money' }));
    } else run += ch;
  }
  if (run) out.append(run);
  return out;
}

/**
 * The details of a tapped card as a bottom sheet (Leo, 27.09.2026: "als Drawer, halber
 * Bildschirm, scrollbar"). Non-modal like a sheet in Apple Maps: the cards above stay
 * tappable and change what it shows, a double tap still buys. It opens at half height,
 * the grabber pulls it up to nearly full height, a swipe down closes it; the text scrolls.
 */
export class DetailSheet {
  private readonly root: HTMLElement;
  private readonly art: HTMLCanvasElement;
  private readonly drawer: CanvasDrawer;
  private readonly eyebrow: HTMLElement;
  private readonly title: HTMLElement;
  private readonly price: HTMLElement;
  private readonly steps: HTMLElement;
  private readonly scroller: HTMLElement;
  private readonly body: HTMLElement;
  private readonly actions: HTMLElement;
  private readonly signalRow: HTMLElement;
  private readonly signalCanvas: HTMLCanvasElement;
  private readonly signalDrawer: CanvasDrawer;
  private readonly signalLabel: HTMLElement;
  private readonly signalText: HTMLElement;
  private readonly signalList: HTMLElement;
  private outcome: string | null = null;
  private signal: SignalDetail | null = null;
  private loop = new SignalLoop();
  private signalClock = 0;
  private key: string | null = null;
  private json = '';
  private open = false;
  /** Which of the two heights it rests at: half the screen, or as tall as its text needs (up to nearly the whole screen). */
  private mode: 'half' | 'full' = 'half';
  /** The sheet's height, kept by the observer: reading it from the layout every frame would force one. */
  private height = 0;
  /** Where the sheet is while the spring or a finger moves it: its height and how far it is pushed down. */
  private h = 0;
  private y = 0;
  private vh = 0;
  private vy = 0;
  private raf = 0;
  /** `pos` is the height the finger stands for: below `half` it is pulled down to close, above `full` it stretches. */
  private drag: { id: number; y0: number; pos0: number; half: number; full: number; last: { pos: number; t: number }[] } | null = null;
  private hideTimer = 0;

  constructor(
    parent: HTMLElement,
    private readonly onAction: (a: ScreenAction) => void,
    private readonly onClose: () => void,
  ) {
    this.art = h('canvas', { class: 'detail-art', width: ART * 2, height: ART * 2, 'aria-hidden': 'true' });
    this.art.style.width = `${ART}px`;
    this.art.style.height = `${ART}px`;
    this.drawer = new CanvasDrawer(this.art);
    this.drawer.resize(ART, ART, 2);
    this.signalCanvas = h('canvas', { class: 'detail-signal-art', width: SignalLoop.size * 2, height: SignalLoop.size * 2, 'aria-hidden': 'true' });
    this.signalCanvas.style.width = `${SignalLoop.size}px`;
    this.signalCanvas.style.height = `${SignalLoop.size}px`;
    this.signalDrawer = new CanvasDrawer(this.signalCanvas);
    this.signalDrawer.resize(SignalLoop.size, SignalLoop.size, 2);
    this.signalLabel = h('div', { class: 'detail-signal-label' }, S.museum.onRing);
    this.signalText = h('p', { class: 'detail-signal-text' });
    this.signalList = h('ul', { class: 'detail-signal-lines' });
    this.signalRow = h('div', { class: 'detail-signal' }, h('div', { class: 'detail-signal-head' }, this.signalCanvas, h('div', {}, this.signalLabel, this.signalText)), this.signalList);
    this.eyebrow = h('div', { class: 'detail-eyebrow' });
    this.title = h('h2', { class: 'detail-title', id: 'detail-title' });
    this.price = h('div', { class: 'detail-price' });
    this.steps = h('div', { class: 'detail-steps', 'aria-hidden': 'true' });
    const close = h('button', { class: 'icon-btn detail-close', 'aria-label': 'Close', onclick: () => this.onClose() }, icon(ICONS.close));
    const handle = h('div', { class: 'detail-handle' }, h('div', { class: 'grabber', 'aria-hidden': 'true' }));
    const head = h('div', { class: 'detail-head' }, this.art, h('div', { class: 'detail-headings' }, this.eyebrow, this.title, this.price, this.steps), close);
    this.body = h('div', { class: 'detail-body' });
    this.scroller = h('div', { class: 'detail-scroll' }, head, this.body);
    this.actions = h('div', { class: 'detail-actions' });
    this.root = h('section', { class: 'detail-sheet', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'detail-title', hidden: true }, handle, this.scroller, this.actions);
    parent.append(this.root);
    new ResizeObserver(([entry]) => (this.height = entry.borderBoxSize[0].blockSize)).observe(this.root);
    window.addEventListener('resize', () => {
      if (this.open && !this.drag) this.fit(true);
    });
    this.bindDrag(handle);
    this.bindDrag(head, true);
    this.bindTouchPull();
  }

  /** Height the sheet covers above the tab bar, for the page behind (0 when closed). */
  get inset(): number {
    return this.open ? this.height : 0;
  }

  /** Once per frame: shows, swaps, refreshes or hides the sheet. */
  update(detail: Detail | null): void {
    if (!detail) {
      if (this.open) this.hide();
      return;
    }
    this.sync(detail);
    this.paintSignal();
  }

  private sync(detail: Detail): void {
    const json = JSON.stringify(detail);
    if (!this.open) this.show(detail.art.k === 'museum');
    if (detail.key !== this.key) {
      const swap = this.key !== null;
      this.key = detail.key;
      this.json = json;
      this.render(detail, true);
      if (swap) {
        this.scroller.classList.remove('swap');
        void this.scroller.offsetWidth;
        this.scroller.classList.add('swap');
      }
      return;
    }
    if (json !== this.json) {
      this.json = json;
      this.render(detail, false);
    }
  }

  /** A Museum entry opens all the way up, so its whole text can be read without pulling. */
  private show(full: boolean): void {
    window.clearTimeout(this.hideTimer);
    window.cancelAnimationFrame(this.raf);
    this.open = true;
    this.mode = full ? 'full' : 'half';
    this.root.hidden = false;
    this.root.classList.remove('closing', 'expanded', 'controlled');
    this.root.style.transform = '';
    this.root.style.height = '';
    this.root.style.removeProperty('--out-ms');
    this.y = 0;
    this.root.classList.remove('entering');
    void this.root.offsetWidth;
    this.root.classList.add('entering');
  }

  private hide(): void {
    window.cancelAnimationFrame(this.raf);
    this.vh = this.vy = 0;
    this.drag = null;
    this.open = false;
    this.key = null;
    this.json = '';
    this.root.classList.add('closing');
    this.hideTimer = window.setTimeout(() => {
      if (!this.open) this.root.hidden = true;
    }, this.reducedMotion() ? 0 : 220);
  }

  private reducedMotion(): boolean {
    return document.querySelector('.app.reduce-motion') !== null || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** The small roundabout of a Museum entry plays its signal as long as the sheet is open. */
  private paintSignal(): void {
    const signal = this.signal;
    if (!signal) return;
    const now = performance.now();
    this.loop.update((now - this.signalClock) / 1000, signal);
    this.signalClock = now;
    const outcome = signal.paid && signal.missed ? this.loop.outcome(signal) : null;
    if (outcome !== this.outcome) {
      this.outcome = outcome;
      for (const li of this.signalList.children) (li as HTMLElement).classList.toggle('dim', outcome !== null && (li as HTMLElement).dataset.kind !== outcome && (li as HTMLElement).dataset.kind !== 'note');
    }
    const size = SignalLoop.size;
    const list = new RenderList({ viewport: v(size, size), center: v(0, 0), focus: v(size / 2, size / 2), scale: 1 }, 'card');
    this.loop.draw(list, signal, this.reducedMotion());
    this.signalDrawer.draw(list);
  }

  private render(d: Detail, fresh: boolean): void {
    // The picture, drawn with the game's own shapes.
    const list = new RenderList({ viewport: v(ART, ART), center: v(0, 0), focus: v(ART / 2, ART / 2), scale: 1 }, 'card');
    Details.drawArt(list, d.art, v(ART / 2, ART / 2), ART, baseConfig);
    this.drawer.draw(list);

    this.eyebrow.textContent = d.eyebrow?.text ?? '';
    this.eyebrow.style.color = d.eyebrow ? css(d.eyebrow.color) : '';
    this.eyebrow.hidden = !d.eyebrow;
    this.title.textContent = d.title;
    this.price.replaceChildren(d.price ? rich(d.price.text) : '');
    this.price.style.color = d.price ? css(d.price.color) : '';
    this.price.hidden = !d.price;
    this.steps.replaceChildren();
    this.steps.hidden = !d.steps;
    if (d.steps) {
      for (let i = 0; i < d.steps.total; i++) this.steps.append(h('span', { class: i < d.steps.done ? 'on' : '' }));
    }

    const keep = this.scroller.scrollTop;
    const body: Node[] = d.body.map((p) => h('p', { class: 'detail-text' }, rich(p)));
    this.signal = d.signal ?? null;
    if (this.signal) {
      if (fresh) this.loop = new SignalLoop();
      const [arrive, ...rest] = this.signal.lines;
      this.signalText.textContent = arrive.text;
      this.outcome = null;
      this.signalList.replaceChildren(
        ...rest.map((line) => {
          const dot = h('span', { class: 'dot', 'aria-hidden': 'true' });
          if (line.color) dot.style.background = css(line.color);
          return h('li', { 'data-kind': line.kind }, dot, line.text);
        }),
      );
      body.push(this.signalRow);
    }
    if (d.rows.length > 0) body.push(this.list(d.rows));
    for (const section of d.sections ?? []) {
      body.push(h('h3', { class: 'detail-section' }, section.header));
      body.push(this.list(section.rows));
    }
    for (const n of d.notes) {
      const note = h('p', { class: 'detail-note' }, rich(n.text));
      note.style.color = css(n.color);
      body.push(note);
    }
    this.body.replaceChildren(...body);
    this.scroller.scrollTop = fresh ? 0 : keep;

    this.actions.replaceChildren(...d.actions.map((a) => this.button(a)));
    this.actions.hidden = d.actions.length === 0;
    this.actions.classList.toggle('many', d.actions.length > 2 && !d.stacked);
    this.actions.classList.toggle('stacked', !!d.stacked);
    if (!this.drag) this.fit(!this.root.classList.contains('controlled'));
  }

  /** A grouped list; a row with an action is a button. */
  private list(rows: DetailRow[]): HTMLElement {
    const out = h('div', { class: 'list detail-rows' });
    for (const r of rows) {
      const label = h('div', { class: 'row-title' }, rich(r.label));
      if (r.labelColor) label.style.color = css(r.labelColor);
      const main = r.sub ? h('div', { class: 'row-main' }, label, h('div', { class: 'row-sub' }, r.sub)) : label;
      const value = h('div', { class: 'row-value' }, rich(r.value));
      if (r.valueColor) value.style.color = css(r.valueColor);
      if (r.action) {
        const action = r.action;
        const b = h('button', { class: 'row tappable', type: 'button' }, main, value);
        b.addEventListener('click', () => this.onAction(action));
        out.append(b);
      } else out.append(h('div', { class: 'row' }, main, value));
    }
    return out;
  }

  private button(a: DetailAction): HTMLButtonElement {
    const kind = a.destructive ? `destructive${a.prominent ? ' filled' : ''}` : a.prominent ? 'primary' : 'buy';
    const b = h('button', { class: `btn ${kind}`, type: 'button' }, h('span', {}, rich(a.label)));
    b.disabled = !a.enabled;
    b.addEventListener('click', () => this.onAction(a.action));
    return b;
  }

  /** The two heights it rests at, measured from its text: half the screen, and the most it may take. */
  private fits(): { half: number; full: number } {
    const root = this.root;
    root.classList.remove('controlled');
    root.style.height = '';
    const half = root.offsetHeight;
    root.classList.add('expanded');
    const full = root.offsetHeight;
    root.classList.remove('expanded');
    root.classList.add('controlled');
    root.style.height = `${this.h}px`;
    return { half, full };
  }

  /** Goes to the height of the current mode, gliding unless `instant` (opening, a resized window). */
  private fit(instant: boolean): void {
    const target = this.fits()[this.mode];
    if (instant) {
      window.cancelAnimationFrame(this.raf);
      this.vh = this.vy = 0;
      this.apply(target, 0);
    } else if (Math.abs(target - this.h) > 0.5 || this.y !== 0) this.glide(target, 0);
  }

  private apply(h: number, y: number): void {
    this.h = h;
    this.y = y;
    this.root.style.height = `${h}px`;
    this.root.style.transform = y > 0.01 ? `translateY(${y}px)` : '';
  }

  /** A spring (about 0.4 s, hardly any overshoot) carries the sheet to where it rests and keeps the speed it already has. */
  private glide(h: number, y: number): void {
    window.cancelAnimationFrame(this.raf);
    if (this.reducedMotion()) {
      this.vh = this.vy = 0;
      this.apply(h, y);
      return;
    }
    let last = performance.now();
    const step = (now: number): void => {
      let left = Math.min(now - last, 50);
      last = now;
      while (left > 0) {
        const dt = Math.min(left, 4);
        left -= dt;
        this.vh += (-SPRING.k * (this.h - h) - SPRING.c * this.vh) * dt;
        this.vy += (-SPRING.k * (this.y - y) - SPRING.c * this.vy) * dt;
        this.h += this.vh * dt;
        this.y += this.vy * dt;
      }
      if (Math.abs(this.h - h) < 0.4 && Math.abs(this.y - y) < 0.4 && Math.abs(this.vh) < 0.01 && Math.abs(this.vy) < 0.01) {
        this.vh = this.vy = 0;
        this.apply(h, y);
        return;
      }
      this.apply(this.h, Math.max(0, this.y));
      this.raf = window.requestAnimationFrame(step);
    };
    this.raf = window.requestAnimationFrame(step);
  }

  /** Where a finger holds the sheet: above the full height it stretches like a rubber band, below half it is pulled down to close. */
  private hold(pos: number, half: number, full: number): void {
    if (pos > full) this.apply(full + rubber(pos - full), 0);
    else if (pos >= half) this.apply(pos, 0);
    else this.apply(half, half - pos);
  }

  /** Closes from where the finger let go; a quick pull leaves quickly (`v` is the speed in px/ms, down is negative). */
  private dismiss(v: number): void {
    const ms = Math.min(260, Math.max(140, (this.h + 60 - this.y) / Math.max(0.4, -v)));
    this.root.style.setProperty('--out-ms', `${Math.round(ms)}ms`);
    this.onClose();
  }

  /**
   * The grabber (and the head) move the sheet like an Apple sheet: it follows the finger, stretches against a rubber band
   * past the full height, and on release a spring takes it to the half or full height the throw points to, or closes it.
   */
  private bindDrag(el: HTMLElement, onlyWhenTop = false): void {
    el.addEventListener('pointerdown', (e) => {
      if (this.drag || (e.target as HTMLElement).closest('button')) return;
      if (onlyWhenTop && this.scroller.scrollTop > 0) return;
      this.beginDrag(e.pointerId, e.clientY);
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.drag?.id === e.pointerId) this.moveDrag(e.clientY, e.timeStamp);
    });
    const end = (e: PointerEvent): void => {
      if (this.drag?.id === e.pointerId) this.endDrag(e.timeStamp);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /**
   * On touch, a swipe down that starts with the text at its top pulls the sheet from anywhere on it, so the thumb stays
   * where it is. Scrolling back up to the start does not pull; only the next swipe down does (Leo, 09.10.2026).
   */
  private bindTouchPull(): void {
    let touch: { y0: number; pulling: boolean } | null = null;
    this.root.addEventListener(
      'touchstart',
      (e) => {
        const target = e.target as HTMLElement;
        touch = e.touches.length === 1 && !this.drag && !target.closest('.detail-handle, .detail-head') && this.scroller.scrollTop === 0 ? { y0: e.touches[0].clientY, pulling: false } : null;
      },
      { passive: true },
    );
    this.root.addEventListener(
      'touchmove',
      (e) => {
        if (!touch) return;
        const y = e.touches[0].clientY;
        if (!touch.pulling) {
          // Already scrolling (the swipe went up first): it stays a scroll.
          if (this.scroller.scrollTop > 0) touch = null;
          else if (y - touch.y0 >= 8) {
            touch.pulling = true;
            this.beginDrag(-1, y);
          }
          if (!touch?.pulling) return;
        }
        e.preventDefault();
        this.moveDrag(y, e.timeStamp);
      },
      { passive: false },
    );
    const end = (e: TouchEvent): void => {
      if (touch?.pulling) this.endDrag(e.timeStamp);
      touch = null;
    };
    this.root.addEventListener('touchend', end);
    this.root.addEventListener('touchcancel', end);
  }

  private beginDrag(id: number, y: number): void {
    window.cancelAnimationFrame(this.raf);
    this.vh = this.vy = 0;
    this.drag = { id, y0: y, pos0: this.h - this.y, ...this.fits(), last: [] };
  }

  private moveDrag(y: number, t: number): void {
    const d = this.drag;
    if (!d) return;
    const pos = d.pos0 - (y - d.y0);
    d.last.push({ pos, t });
    if (d.last.length > 6) d.last.shift();
    this.hold(pos, d.half, d.full);
  }

  private endDrag(t: number): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const tip = d.last[d.last.length - 1];
    const from = d.last.find((s) => tip && tip.t - s.t <= 100);
    // Speed of the last 100 ms (up is positive); a finger that stopped before lifting throws nothing.
    const v = tip && from && from !== tip && t - tip.t < 80 ? (tip.pos - from.pos) / (tip.t - from.t) : 0;
    const pos = tip?.pos ?? d.pos0;
    const projected = pos + v * 200;
    if (projected < d.half - 70) {
      this.dismiss(v);
      return;
    }
    this.mode = Math.abs(projected - d.full) < Math.abs(projected - d.half) ? 'full' : 'half';
    this.vh = pos >= d.half && pos <= d.full ? v : 0;
    this.vy = pos < d.half ? -v : 0;
    this.glide(this.mode === 'full' ? d.full : d.half, 0);
  }
}

/** The spring of the sheet, per millisecond: a response of about 0.4 s at 85 % damping. */
const SPRING = { k: 0.00027, c: 0.028 };

/** Past the full height the sheet gives way less and less, up to 120 px. */
const rubber = (over: number): number => 120 * (1 - 1 / ((over * 0.55) / 120 + 1));
