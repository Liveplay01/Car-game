import type { Career } from '../core/career';
import { Careers } from '../core/career';
import type { Config } from '../core/config';
import { dayNumber } from '../core/daily';
import { SeasonPass } from '../core/seasonPass';
import { S } from '../present/strings';
import { inItch, inPlayStore, inPortal, isInstalled, isIos } from '../storage/device';
import { apiRequest, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Notifications (Leo, 08.10.2026): only what matters, through the service (`Server/`, push module).
 * The game works out its own reminders from the save (`pushTimers`) and hands them over whenever
 * it opens or closes; the service adds a rank lost in the top 20, an invite's chest and a nudge
 * after days away, keeps to one a day and to daytime on this device's clock.
 *
 * Web Push: Chrome, Edge, Firefox and the Play Store app (a Trusted Web Activity) everywhere; on an
 * iPhone or iPad only from the Home Screen (iOS 16.4+). It needs the service worker of a build,
 * so `npm run dev` has none.
 */

/** This device asked for notifications ('1'); the browser's permission says whether they still may come. */
const KEY = 'carGame.push.v1';
/** The choices this device turned off. */
const MUTED_KEY = 'carGame.push.muted.v1';
const HOUR = 3_600_000;

/** What the settings row shows; 'none': this place cannot show notifications at all. */
export type PushState = 'on' | 'off' | 'blocked' | 'install' | 'none';

export type PushTopic = 'streak' | 'rank' | 'reward' | 'gift' | 'pass' | 'comeback';

/** What the settings let a player turn off; a choice covers one or two of the service's topics. */
export const PUSH_CHOICES = [
  { id: 'streak', topics: ['streak'] },
  { id: 'chests', topics: ['gift', 'reward'] },
  { id: 'pass', topics: ['pass'] },
  { id: 'rank', topics: ['rank'] },
  { id: 'comeback', topics: ['comeback'] },
] as const satisfies readonly { id: string; topics: readonly PushTopic[] }[];

export type PushChoice = (typeof PUSH_CHOICES)[number]['id'];

export interface PushTimer {
  topic: 'streak' | 'gift' | 'pass';
  at: number;
  until: number;
  title: string;
  body: string;
}

/** A moment on this device's clock: `days` from today at `hour`. */
const local = (now: Date, days: number, hour: number): number => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).getTime();

/**
 * What the game wants to be reminded of, from the save as it is now. The streak: this evening
 * while today's Daily is still open, else tomorrow evening (a streak of two days or more). The free
 * chest promised for tomorrow: that morning. The next season's pass: its first morning, once the
 * pass is open to this career.
 */
export function pushTimers(career: Career, config: Config, now = new Date()): PushTimer[] {
  const today = dayNumber(now);
  const out: PushTimer[] = [];
  const streak = career.dailyStreak;
  if (streak >= 2 && (career.dailyPlayed === today || career.dailyPlayed === today - 1)) {
    const playedToday = career.dailyPlayed === today;
    const at = local(now, playedToday ? 1 : 0, 18);
    if (at > now.getTime()) out.push({ topic: 'streak', at, until: local(now, playedToday ? 2 : 1, 0) - 60_000, title: S.push.streakTitle(streak), body: S.push.streakBody });
  }
  if (Careers.giftAhead(career, today)) {
    const at = local(now, career.giftDay - today, 10);
    out.push({ topic: 'gift', at, until: at + 48 * HOUR, title: S.push.giftTitle, body: S.push.giftBody });
  }
  if (SeasonPass.isOpen(career, config)) {
    const days = SeasonPass.daysLeft(today);
    const at = local(now, days, 10);
    // The service takes timers up to 60 days ahead; a later season is sent once it is closer.
    if (at - now.getTime() < 59 * 24 * HOUR) out.push({ topic: 'pass', at, until: at + 72 * HOUR, title: S.push.passTitle(SeasonPass.season(today + days)), body: S.push.passBody });
  }
  return out;
}

const supported = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function asked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function remember(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* the browser's permission still holds; only the switch forgets */
  }
}

function mutedChoices(): PushChoice[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MUTED_KEY) ?? '[]');
    return PUSH_CHOICES.map((c) => c.id).filter((id) => Array.isArray(raw) && raw.includes(id));
  } catch {
    return [];
  }
}

export const pushChoiceOn = (id: PushChoice): boolean => !mutedChoices().includes(id);

/** Remembers a choice; `syncPush` then tells the service. */
export function setPushChoice(id: PushChoice, on: boolean): void {
  const muted = mutedChoices().filter((m) => m !== id);
  if (!on) muted.push(id);
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
  } catch {
    /* the choice holds until the page closes */
  }
}

const mutedTopics = (): PushTopic[] => PUSH_CHOICES.filter((c) => mutedChoices().includes(c.id)).flatMap((c) => c.topics);

export function pushState(): PushState {
  if (inPortal || inItch || !('Notification' in window)) return 'none';
  if (isIos() && !isInstalled()) return 'install';
  if (Notification.permission === 'denied') return 'blocked';
  return asked() && Notification.permission === 'granted' ? 'on' : 'off';
}

/**
 * Whether reminders can reach this device while the game is closed: it needs the service and a build with
 * a service worker (not `npm run dev`). Without it a notification only shows while the game is open.
 */
export const pushDelivers = (): boolean => leaderboardEnabled && import.meta.env.PROD && supported();

/** Shows one notification right now: the answer to turning them on. */
async function confirm(): Promise<void> {
  const options = { body: S.push.on, tag: 'rat-on', icon: '/icons/icon-192.png' };
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) await registration.showNotification(S.push.confirmTitle, options);
  else new Notification(S.push.confirmTitle, options);
}

/** The subscription this device has with the browser's push service, made if missing. */
async function subscription(create: boolean): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  const known = await registration.pushManager.getSubscription();
  if (known || !create) return known;
  const { key } = await apiRequest<{ key: string }>('GET', '/v1/push/key');
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  const applicationServerKey = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}

/** The last subscription seen, so closing the game can send without waiting for the browser. */
let current: PushSubscription | null = null;

function send(sub: PushSubscription, timers: PushTimer[], keepalive: boolean): Promise<unknown> {
  const json = sub.toJSON();
  const muted = mutedTopics();
  return apiRequest('PUT', '/v1/push', {
    token: loadAccount()?.token,
    keepalive,
    body: { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, tz: -new Date().getTimezoneOffset(), home: inPlayStore ? '/?googleplaystore' : '/', muted, timers: timers.filter((t) => !muted.includes(t.topic)) },
  });
}

/**
 * Turns notifications on: asks the browser (call it from a tap), subscribes and hands over the
 * timers. Resolves with the state it ended in ('blocked' when the player said no).
 */
export async function enablePush(timers: PushTimer[]): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  remember(true);
  if (pushDelivers()) {
    const sub = await subscription(true);
    if (sub) {
      await send(sub, timers, false);
      current = sub;
    }
  }
  await confirm().catch(() => undefined);
  return 'on';
}

/** Turns them off here and on the service; the switch is off even when the service cannot be reached. */
export async function disablePush(): Promise<void> {
  remember(false);
  const sub = current ?? (pushDelivers() ? await subscription(false).catch(() => null) : null);
  current = null;
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => false);
  await apiRequest('DELETE', '/v1/push', { body: { endpoint } }).catch(() => undefined);
}

/**
 * Hands the service this device's timers (and that it was seen today). `closing`: the game is
 * going to the background, so the request must outlive the page.
 */
export function syncPush(timers: PushTimer[], closing = false): void {
  if (pushState() !== 'on' || !pushDelivers()) return;
  if (closing && current) {
    void send(current, timers, true).catch(() => undefined);
    return;
  }
  void subscription(true)
    .then((sub) => {
      if (!sub) return;
      current = sub;
      return send(sub, timers, closing);
    })
    .catch(() => undefined);
}
