/**
 * Back, as the phone means it (Leo, 10.10.2026): Android's back gesture and button, and a browser's
 * Back, close what is on top of the game instead of leaving it. One entry sits above the page in the
 * history; each Back takes it, `stepBack` says whether the game used it, and if so the entry is
 * put back. Only at the start of the game (nothing left to close) does Back go on and leave.
 */
export function installBackGesture(stepBack: () => boolean): void {
  let armed = false;
  const arm = (): void => {
    if (armed) return;
    armed = true;
    history.pushState(null, '', location.href);
  };
  // Chrome skips entries a page adds before the person has touched it, so the entry waits for the first touch.
  for (const type of ['pointerdown', 'keydown'] as const) document.addEventListener(type, arm, { once: true, capture: true });
  window.addEventListener('popstate', () => {
    if (!armed) return;
    if (stepBack()) {
      history.pushState(null, '', location.href);
      return;
    }
    armed = false;
    history.back();
  });
}

/** A touch this close to the screen's edge belongs to the system (home, back, notifications): the game must not take it as a tap. */
const EDGE = 24;
const BOTTOM_EDGE = 40;

export function inSystemGestureZone(e: PointerEvent): boolean {
  if (e.pointerType !== 'touch') return false;
  return e.clientX < EDGE || e.clientX > window.innerWidth - EDGE || e.clientY < EDGE || e.clientY > window.innerHeight - BOTTOM_EDGE;
}
