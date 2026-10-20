import { ANIMATED_ICONS, type AnimatedIconId } from './animatedIcons';

/** Tiny DOM helpers: no framework, the UI is a few screens. */
type Attrs = Record<string, string | number | boolean | undefined | null | EventListener>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (key === 'html') {
      el.innerHTML = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

/** Something is on its way: a car goes round a tiny roundabout before the text (Leo, 16.10.2026). */
export const loadingNote = (text: string, cls = 'section-note'): HTMLElement =>
  h('p', { class: `${cls} loading-note`, role: 'status' }, h('span', { class: 'loader', 'aria-hidden': 'true' }), text);

const CONFIRM_MS = 3000;

/**
 * A button that asks for a second tap before it acts (giving money away, leaving, deleting). The second label is read out;
 * while the work runs the button is busy, and it is back to its first label when the work ends or the tap does not come.
 */
export function confirmButton(text: string, again: string, cls: string, act: () => Promise<unknown> | void): HTMLButtonElement {
  const button = h('button', { class: cls, type: 'button', 'aria-live': 'polite' }, text);
  let armed = 0;
  const disarm = (): void => {
    window.clearTimeout(armed);
    armed = 0;
    button.textContent = text;
  };
  button.addEventListener('click', () => {
    if (!armed) {
      button.textContent = again;
      armed = window.setTimeout(disarm, CONFIRM_MS);
      return;
    }
    disarm();
    button.disabled = true;
    void Promise.resolve(act()).finally(() => (button.disabled = false));
  });
  return button;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const templates = new Map<AnimatedIconId, SVGSVGElement>();
const reducedMotion = (): boolean => document.querySelector('.app.reduce-motion') !== null;
let iconStyles: HTMLStyleElement | null = null;
let clips = 0;

/**
 * An animated icon (`animatedIcons.ts`): still until `playIcon`, or looping for a state that lives. The icon's CSS goes into
 * the page once, not into every copy; clip ids are renamed per copy so one hidden icon cannot take the clip from another.
 */
export function animatedIcon(id: AnimatedIconId, mode: 'play' | 'loop' = 'play'): SVGSVGElement {
  let template = templates.get(id);
  if (!template) {
    const holder = document.createElement('template');
    holder.innerHTML = ANIMATED_ICONS[id].replace(/<style>([^]*?)<\/style>/, (_, css: string) => {
      iconStyles ??= document.head.appendChild(document.createElement('style'));
      iconStyles.append(css);
      return '';
    });
    template = holder.content.firstElementChild as SVGSVGElement;
    templates.set(id, template);
  }
  const svg = template.cloneNode(true) as SVGSVGElement;
  for (const el of svg.querySelectorAll('[id]')) {
    const renamed = `${el.id}-${++clips}`;
    svg.querySelector(`[clip-path="url(#${el.id})"]`)?.setAttribute('clip-path', `url(#${renamed})`);
    el.id = renamed;
  }
  if (mode === 'loop') svg.classList.add('loop');
  if (reducedMotion()) svg.pauseAnimations();
  return svg;
}

/** The gold coin inside a line of text, sized by the text (`.coin`). */
export function coinMark(label: string): SVGSVGElement {
  const svg = animatedIcon('coin');
  svg.classList.add('coin');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.removeAttribute('aria-hidden');
  return svg;
}

/** Runs an icon's move once from the start (a tab is chosen, a control is pressed). */
export function playIcon(svg: SVGSVGElement | null): void {
  if (!svg) return;
  svg.classList.remove('play');
  void svg.getBoundingClientRect();
  svg.classList.add('play');
}

/** The icons of a control move under the cursor or the finger, unless the move is still running. Tabs play when chosen instead. */
export function watchIconMoves(root: HTMLElement): void {
  const move = (e: PointerEvent): void => {
    const control = (e.target as Element).closest('button, a, summary, [role="button"]');
    if (!control || control.closest('.tab')) return;
    for (const svg of control.querySelectorAll<SVGSVGElement>('svg.ai:not(.loop)')) {
      if (!svg.getAnimations({ subtree: true }).some((a) => a.playState === 'running')) playIcon(svg);
    }
  };
  // Captured: the floating buttons stop their pointerdown from reaching the page.
  root.addEventListener('pointerover', (e) => e.pointerType === 'mouse' && move(e), true);
  root.addEventListener('pointerdown', move, true);
}

/** Flames flicker through SMIL, which the CSS switch for Reduce Motion cannot reach. */
export function stillIcons(still: boolean): void {
  for (const svg of document.querySelectorAll<SVGSVGElement>('svg.ai')) {
    if (still) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }
}

/** An SVG icon from a path string (24×24 viewBox, stroke-based, SF Symbols-like). Only for the logos that bring their own colours. */
export function icon(paths: string, options: { fill?: boolean; label?: string } = {}): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', options.fill ? 'currentColor' : 'none');
  svg.setAttribute('stroke', options.fill ? 'none' : 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (options.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.innerHTML = paths;
  return svg;
}
