import { h } from './dom';

/**
 * What the canvas shows as text, read out by screen readers (PRODUCT.md: "a live region for
 * results"). Two quiet regions, so a notice arriving with the result does not cut it off:
 * one for how a shift ended, one for the notice pill.
 */
export class LiveRegion {
  private readonly result: HTMLElement;
  private readonly notice: HTMLElement;
  private lastSummary: object | null = null;
  private lastNotice: string | null = null;

  constructor(parent: HTMLElement) {
    const region = (): HTMLElement => h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.result = region();
    this.notice = region();
    parent.append(this.result, this.notice);
  }

  /**
   * Once a frame. `summary` is the finished shift (its identity marks a new one) and `spoken`
   * its sentence, built only when it is new; `notice` is the pill's text right now.
   */
  update(summary: object | null, spoken: () => string, notice: string | null): void {
    if (summary !== this.lastSummary) {
      this.lastSummary = summary;
      if (summary) say(this.result, spoken());
    }
    if (notice !== this.lastNotice) {
      this.lastNotice = notice;
      if (notice) say(this.notice, notice);
    }
  }
}

/** A screen reader only speaks a change: the same words again get an invisible difference. */
function say(el: HTMLElement, text: string): void {
  el.textContent = el.textContent === text ? `${text} ` : text;
}
