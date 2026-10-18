import { h } from './dom';
import type { HapticID } from '../present/feedback';

/** How far the page must be pulled for green, in px. Red comes as soon as the light is in view, so every phase gets its moment. */
const FULL = 88;
const RED = 24;
const AMBER = 54;
const STAGES = ['', 'stop', 'ready', 'go'];

/**
 * Pull to refresh as a traffic light (Leo, 16.10.2026): pulled down from the top, the light shows red, red and amber, then
 * green; let go on green and the page loads again. Touch only: with a mouse the page has its own buttons. Each new light
 * ticks in the hand, green a little firmer: the light can be felt without looking.
 */
export function pullToRefresh(scroller: HTMLElement, allowed: () => boolean, reload: () => void, feel: (id: HapticID) => void): void {
  const light = h('div', { class: 'pull-light', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
  scroller.prepend(light);
  let from: number | null = null;
  let pull = 0;
  scroller.addEventListener(
    'touchstart',
    (e) => {
      from = e.touches.length === 1 && scroller.scrollTop <= 0 && allowed() ? e.touches[0].clientY : null;
      light.dataset.stage = '';
    },
    { passive: true },
  );
  scroller.addEventListener(
    'touchmove',
    (e) => {
      if (from === null) return;
      pull = scroller.scrollTop > 0 ? 0 : Math.min(FULL * 1.25, Math.max(0, e.touches[0].clientY - from) * 0.6);
      scroller.classList.add('pulling');
      scroller.style.setProperty('--pull', String(pull));
      const stage = pull >= FULL ? 'go' : pull >= AMBER ? 'ready' : pull >= RED ? 'stop' : '';
      if (STAGES.indexOf(stage) > STAGES.indexOf(light.dataset.stage ?? '')) feel(stage === 'go' ? 'confirm' : 'snap');
      light.dataset.stage = stage;
    },
    { passive: true },
  );
  // The light keeps what it showed while it slides away: green goes out with the page already loading.
  const release = (): void => {
    if (from === null) return;
    from = null;
    scroller.classList.remove('pulling');
    scroller.style.setProperty('--pull', '0');
    if (pull >= FULL) reload();
    pull = 0;
  };
  scroller.addEventListener('touchend', release);
  scroller.addEventListener('touchcancel', release);
}
