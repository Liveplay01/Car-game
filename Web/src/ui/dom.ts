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

/** An SVG icon from a path string (24×24 viewBox, stroke-based, SF Symbols-like). */
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
