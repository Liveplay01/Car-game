/**
 * The consent message (Clickio, IAB TCF v2) comes before the first visit's lesson. `consentAnswered`
 * resolves once the player has chosen, or at once when there is nothing to ask: a page without the
 * TCF API (outside the scope Clickio shows it for, or a blocked script) or a choice already stored.
 * Clickio's tag is async, and an async script holds `window.load` back, so the API is looked for there.
 */
interface TcData {
  eventStatus: string;
  gdprApplies?: boolean;
}

declare global {
  interface Window {
    __tcfapi?: (command: 'addEventListener', version: 2, callback: (data: TcData | null, success: boolean) => void) => void;
  }
}

const CMP_WAIT_MS = 10000;
const CHOICE_KEY = '__lxG__consent__v2';

const pageLoaded = (): Promise<void> =>
  document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));

const cmpReady = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, CMP_WAIT_MS));

export const consentAnswered = async (): Promise<void> => {
  if (localStorage.getItem(CHOICE_KEY) !== null) return;
  await Promise.race([pageLoaded(), cmpReady()]);
  const tcf = window.__tcfapi;
  if (!tcf) return;
  await new Promise<void>((resolve) =>
    tcf('addEventListener', 2, (data, ok) => {
      if (ok && data && (data.eventStatus === 'useractioncomplete' || data.gdprApplies === false)) resolve();
    }),
  );
};
