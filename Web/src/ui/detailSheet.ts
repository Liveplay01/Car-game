import { v } from '../core/vec2';
import { baseConfig } from '../core/config';
import type { Detail, DetailAction, DetailRow } from '../present/detail';
import { Details } from '../present/detail';
import { RenderList } from '../present/render';
import { CanvasDrawer } from '../present/draw';
import { css } from '../present/theme';
import { MONEY_MARK } from '../present/icons';
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
  private key: string | null = null;
  private json = '';
  private open = false;
  private expanded = false;
  private drag: { startY: number; dy: number; id: number; t: number } | null = null;
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
    this.bindDrag(handle);
    this.bindDrag(head, true);
  }

  /** Height the sheet covers above the tab bar, for the page behind (0 when closed). */
  get inset(): number {
    return this.open ? this.root.getBoundingClientRect().height : 0;
  }

  /** Once per frame: shows, swaps, refreshes or hides the sheet. */
  update(detail: Detail | null): void {
    if (!detail) {
      if (this.open) this.hide();
      return;
    }
    const json = JSON.stringify(detail);
    if (!this.open) this.show();
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

  private show(): void {
    window.clearTimeout(this.hideTimer);
    this.open = true;
    this.expanded = false;
    this.root.hidden = false;
    this.root.classList.remove('closing', 'expanded');
    this.root.style.transform = '';
    this.root.classList.remove('entering');
    void this.root.offsetWidth;
    this.root.classList.add('entering');
  }

  private hide(): void {
    this.open = false;
    this.key = null;
    this.json = '';
    this.root.classList.add('closing');
    const reduce = document.querySelector('.app.reduce-motion') !== null || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hideTimer = window.setTimeout(() => {
      if (!this.open) this.root.hidden = true;
    }, reduce ? 0 : 220);
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
    this.actions.classList.toggle('many', d.actions.length > 2);
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

  /** The grabber (and the head) pull the sheet up to full height or down to close. */
  private bindDrag(el: HTMLElement, onlyWhenTop = false): void {
    el.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (onlyWhenTop && this.scroller.scrollTop > 0) return;
      this.drag = { startY: e.clientY, dy: 0, id: e.pointerId, t: performance.now() };
      el.setPointerCapture(e.pointerId);
      this.root.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      d.dy = e.clientY - d.startY;
      // Up gives way with resistance, down follows the finger.
      const y = d.dy < 0 ? -Math.sqrt(-d.dy) * 4 : d.dy;
      this.root.style.transform = `translateY(${y}px)`;
    });
    const end = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      this.root.classList.remove('dragging');
      this.root.style.transform = '';
      const speed = d.dy / Math.max(1, performance.now() - d.t);
      if (d.dy > 90 || speed > 0.6) {
        if (this.expanded && d.dy < 260) this.setExpanded(false);
        else this.onClose();
      } else if (d.dy < -40 || speed < -0.5) this.setExpanded(true);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private setExpanded(on: boolean): void {
    this.expanded = on;
    this.root.classList.toggle('expanded', on);
  }
}
