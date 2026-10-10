import { h } from './dom';

/** A segmented control (the one for Reduce motion in the settings): `set` moves the highlight to an item. */
export function tabsControl<T extends string>(label: string, items: { id: T; label: string }[], pick: (id: T) => void): { el: HTMLElement; set(id: T): void } {
  const el = h('div', { class: 'segmented board-tabs', role: 'group', 'aria-label': label });
  const thumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
  thumb.style.width = `calc((100% - 4px) / ${items.length})`;
  el.append(thumb);
  const buttons = items.map((item) => {
    const button = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => pick(item.id) }, item.label);
    el.append(button);
    return button;
  });
  return {
    el,
    set(id) {
      items.forEach((item, i) => {
        const on = item.id === id;
        buttons[i].setAttribute('aria-pressed', String(on));
        if (on) thumb.style.transform = `translateX(${i * 100}%)`;
      });
    },
  };
}
