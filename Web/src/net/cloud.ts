import type { SaveGame } from '../core/career';
import { inPortal } from '../storage/device';
import { parseImport } from '../storage/save';
import { savePlayerName } from '../storage/profile';
import { storage } from '../storage/store';
import { type Account, apiRequest, leaderboardEnabled, LeaderboardError, loadAccount, onAccountChange, saveAccount } from './leaderboard';

/**
 * Cloud save by sync code (`Server/`, `/v1/sync`). It is an extra, like the leaderboard: the save
 * stays on this device, and a copy follows to the cloud when the player turns it on. There is no
 * name and no password. The first upload makes a code like `K7M2-9QXA-4TFB`; typing it on
 * another device brings the progress there, and the leaderboard account with it (the name,
 * the scores, the friends and the multiplayer name stay the player's). The code is the key, so
 * it is kept here (`carGame.sync.v1`) and shown in Settings → Cloud sync, nowhere else.
 *
 * It is live (Leo, 01.10.2026): a change goes up two seconds later, and while the game is on
 * screen it looks every few seconds whether another device moved on. Newer progress from the
 * cloud is taken over by itself when this device has nothing unsent: nothing is lost then.
 *
 * Two devices can diverge (both played since they last synced). The service refuses a write that
 * builds on an old version, and the game then never overwrites quietly: it shows both sides and
 * asks (`status` 'choose'). While it waits nothing is sent. Not on a portal: CrazyGames keeps the
 * save in its own cloud.
 */

export const cloudEnabled = leaderboardEnabled && !inPortal;

const KEY = 'carGame.sync.v1';
/** A change goes up this long after the last one, so a burst of changes is one request. */
const PUSH_AFTER_MS = 2_000;
/** How often a game on screen asks whether another device moved on. */
const POLL_MS = 10_000;
const RETRY_MS = 15_000;
/** Browsers refuse a `keepalive` request (sent while the page goes away) above 64 KB. */
const KEEPALIVE_MAX = 60_000;

/** The link to the cloud copy: its code, the version this device last saw, and what it held. */
interface Link {
  code: string;
  /** The service's version number (`updatedAt`) of the copy this device last sent or took. */
  version: number;
  /** Fingerprint of the save at that moment: a different one now means unsent changes. */
  hash: string;
}

/** The cloud holds other progress than this device (or a code was just typed): the player picks. */
interface Incoming {
  code: string;
  save: SaveGame;
  updatedAt: number;
  /** The leaderboard account the copy carries, if its device had one. */
  account: Account | null;
}

export type CloudStatus = 'off' | 'synced' | 'saving' | 'offline' | 'choose';

export interface CloudView {
  status: CloudStatus;
  code: string | null;
  /** When this device last sent or checked, for "Saved just now". */
  savedAt: number | null;
  incoming: SaveGame | null;
}

export interface CloudDeps {
  /** The save as the game has it right now. */
  save(): SaveGame;
  /** A sentence for the player, shown like the game's other hints. */
  notify(text: string): void;
  /** Whether newer cloud progress may replace the save now (not in the middle of a shift). */
  canTake(): boolean;
  /** Puts newer cloud progress on this device. */
  take(save: SaveGame): void;
  /** The first look at the cloud is done (or there is no cloud copy): the day may begin. */
  ready(): void;
}

let deps: CloudDeps | null = null;
let link: Link | null = null;
let incoming: Incoming | null = null;
/** Newer cloud progress, taken over as soon as the game allows (`canTake`). */
let waiting: Incoming | null = null;
let status: CloudStatus = 'off';
let savedAt: number | null = null;
let timer = 0;
let busy = false;
let checking = false;
/** The cloud version the player put off deciding about: it is not announced again. */
let declined: number | null = null;
const listeners = new Set<() => void>();

const INTRO_KEY = 'carGame.cloudIntro.v1';

/**
 * The one-time pop-up that tells every player about Cloud sync is due: the service exists, this
 * device has no cloud copy yet, and the pop-up was not shown before.
 */
export function cloudIntroDue(): boolean {
  if (!cloudEnabled) return false;
  try {
    return storage().getItem(INTRO_KEY) === null && readLink() === null;
  } catch {
    return false;
  }
}

export function markCloudIntroSeen(): void {
  try {
    storage().setItem(INTRO_KEY, '1');
  } catch {
    /* private mode: it may show again next visit */
  }
}

/** A short fingerprint of the save's text: enough to tell "changed" from "same". */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}:${text.length}`;
}

/**
 * What goes to the cloud: the save, plus the leaderboard account (`cloudAccount`: id, name and
 * the secret that proves the name). The game's own save reader ignores the extra field.
 */
function payload(save: SaveGame): Record<string, unknown> {
  const account = loadAccount();
  return account ? { ...save, cloudAccount: account } : { ...save };
}

/** Fingerprint of everything that goes up: a changed save or a changed account both count. */
const stamp = (save: SaveGame): string => fingerprint(JSON.stringify(payload(save)));

function accountOf(raw: unknown): Account | null {
  const found = (raw as { cloudAccount?: Partial<Account> } | null)?.cloudAccount;
  return found && typeof found.id === 'string' && typeof found.name === 'string' && typeof found.token === 'string' ? { id: found.id, name: found.name, token: found.token } : null;
}

function readLink(): Link | null {
  try {
    const raw = storage().getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Link>;
    return typeof parsed.code === 'string' && typeof parsed.version === 'number' && typeof parsed.hash === 'string' ? { code: parsed.code, version: parsed.version, hash: parsed.hash } : null;
  } catch {
    return null;
  }
}

function writeLink(next: Link | null): void {
  link = next;
  try {
    if (next) storage().setItem(KEY, JSON.stringify(next));
    else storage().removeItem(KEY);
  } catch {
    /* private mode: the link lasts this visit only */
  }
}

/** The status now (read after an `await`: the player may have chosen in the meantime). */
const choosing = (): boolean => status === 'choose';

function set(next: CloudStatus): void {
  status = next;
  for (const listener of listeners) listener();
}

/** The sheet redraws on every change; returns the way to stop listening. */
export function onCloudChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cloudView(): CloudView {
  return { status, code: link?.code ?? null, savedAt, incoming: incoming?.save ?? null };
}

const forgetIfGone = (error: unknown): void => {
  // The copy was deleted (from another device): this device is on its own again.
  if (error instanceof LeaderboardError && error.status === 404) {
    window.clearTimeout(timer);
    writeLink(null);
    incoming = null;
    waiting = null;
    set('off');
  }
};

/** This device changed something since it last sent or took the cloud copy. */
const unsent = (): boolean => !!link && !!deps && stamp(deps.save()) !== link.hash;

/** Makes the cloud's progress this device's, and links to that version. */
function adopt(found: Incoming): SaveGame {
  const { code, save, updatedAt, account } = found;
  // The name comes with the progress: this device is that player now (scores, friends, multiplayer name).
  // A copy from a device that never had a name leaves this device's own account alone.
  if (account) {
    saveAccount(account);
    savePlayerName(account.name);
  }
  writeLink({ code, version: updatedAt, hash: stamp(save) });
  incoming = null;
  waiting = null;
  savedAt = Date.now();
  set('synced');
  return save;
}

/** Both devices moved on: the player picks (Settings → Cloud sync). */
function conflict(found: Incoming): void {
  const first = incoming === null;
  incoming = found;
  waiting = null;
  set('choose');
  if (first && found.updatedAt !== declined) deps?.notify('Your cloud save has other progress. Open Settings → Cloud sync to choose.');
}

/**
 * Newer cloud progress: taken over right away when this device has nothing unsent, and the game
 * is not in the middle of a shift (then right after it). Both moved on: the player picks.
 */
function arrive(found: Incoming): void {
  if (!deps) return;
  if (unsent()) return conflict(found);
  if (!deps.canTake()) {
    waiting = found;
    return;
  }
  deps.take(adopt(found));
}

/**
 * Compares the cloud with this device's link: the same version means nothing to do. It sends the
 * version it has, and the service then answers without the save when nothing changed.
 */
async function check(): Promise<void> {
  if (!link || !deps || busy || checking || status === 'choose') return;
  const { code, version } = link;
  checking = true;
  try {
    const got = await apiRequest<{ save?: unknown; updatedAt: number }>('GET', `/v1/sync?have=${version}`, { token: code });
    // A save went up while the answer was on its way: the answer is older than this device now.
    if (!link || link.code !== code || link.version !== version || choosing()) return;
    if (got.updatedAt === link.version) {
      savedAt = Date.now();
      waiting = null;
      if (status !== 'synced') set('synced');
      return;
    }
    const save = got.save === undefined ? null : parseImport(JSON.stringify(got.save));
    if (!save) return;
    arrive({ code, save, updatedAt: got.updatedAt, account: accountOf(got.save) });
  } catch (error) {
    forgetIfGone(error);
    if (link && !choosing()) set('offline');
  } finally {
    checking = false;
  }
}

/** Every few seconds while the game is on screen: take what waits, or look again. */
function tick(): void {
  if (!link || !deps || document.hidden || status === 'choose') return;
  if (waiting) arrive(waiting);
  else void check();
}

async function push(keepalive = false): Promise<void> {
  if (!link || !deps || status === 'choose' || busy) return;
  // Something newer is waiting to be taken, and this device changed too: the player picks.
  if (waiting) return arrive(waiting);
  const save = deps.save();
  const hash = stamp(save);
  if (hash === link.hash) {
    if (status !== 'synced') set('synced');
    return;
  }
  busy = true;
  set('saving');
  const sent = link;
  const body = { save: payload(save), baseUpdatedAt: sent.version };
  try {
    const small = !keepalive || JSON.stringify(body).length < KEEPALIVE_MAX;
    const done = await apiRequest<{ updatedAt: number }>('PUT', '/v1/sync', { token: sent.code, body, keepalive: keepalive && small });
    writeLink({ code: sent.code, version: done.updatedAt, hash });
    savedAt = Date.now();
    busy = false;
    set('synced');
    // More happened while it was on its way.
    if (deps && stamp(deps.save()) !== hash) cloudChanged();
  } catch (error) {
    busy = false;
    if (error instanceof LeaderboardError && error.status === 409) {
      await check();
      return;
    }
    forgetIfGone(error);
    if (link) {
      set('offline');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void push(), RETRY_MS);
    }
  }
}

/** The game saved: if it differs from the cloud copy, send it soon. Free when nothing is linked. */
export function cloudChanged(): void {
  if (!link || status === 'choose') return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void push(), PUSH_AFTER_MS);
}

// A name entered, renamed or removed on this device goes up with the next save.
onAccountChange(() => cloudChanged());

/**
 * This device has a cloud copy. The game then books the day's login income only after the first
 * look at the cloud (`CloudDeps.ready`), so opening the game does not count as playing on it.
 */
export const cloudLinked = (): boolean => cloudEnabled && readLink() !== null;

/** Starts watching: loads the link, looks whether another device moved on, and keeps looking. */
export function startCloud(next: CloudDeps): void {
  if (!cloudEnabled) return;
  deps = next;
  link = readLink();
  if (link) {
    set('synced');
    void check().finally(() => next.ready());
  } else next.ready();
  window.setInterval(tick, POLL_MS);
  // Leaving the page: send what is waiting now. Coming back (or back online): look right away.
  document.addEventListener('visibilitychange', () => {
    if (!link) return;
    if (document.hidden) {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
        void push(true);
      }
    } else tick();
  });
  window.addEventListener('focus', tick);
  window.addEventListener('online', () => {
    tick();
    cloudChanged();
  });
}

/** Sends the save now and returns the new code. Throws a LeaderboardError with a sentence to show. */
export async function createCloud(): Promise<string> {
  if (!deps) throw new LeaderboardError('disabled', 'Cloud sync is not available.');
  const save = deps.save();
  const made = await apiRequest<{ code: string; updatedAt: number }>('POST', '/v1/sync', { body: { save: payload(save) } });
  writeLink({ code: made.code, version: made.updatedAt, hash: stamp(save) });
  incoming = null;
  waiting = null;
  savedAt = Date.now();
  set('synced');
  return made.code;
}

/**
 * Looks up a typed code. The cloud copy is shown next to this device and the player picks
 * (`useCloudSave` or `keepThisDevice`); nothing changes before that. Throws with a sentence to show.
 */
export async function connectCloud(typed: string): Promise<void> {
  const code = typed.trim().toUpperCase();
  const got = await apiRequest<{ save: unknown; updatedAt: number }>('GET', '/v1/sync', { token: code });
  const save = parseImport(JSON.stringify(got.save));
  if (!save) throw new LeaderboardError('invalid_save', 'That cloud save could not be read. Update the game and try again.');
  incoming = { code, save, updatedAt: got.updatedAt, account: accountOf(got.save) };
  set('choose');
}

/** The player chose the cloud's progress: this is the save to put on this device. */
export function useCloudSave(): SaveGame | null {
  return incoming ? adopt(incoming) : null;
}

/** The player chose this device's progress: it replaces the cloud copy, knowingly. */
export async function keepThisDevice(): Promise<void> {
  if (!incoming || !deps) return;
  const { code, updatedAt } = incoming;
  const save = deps.save();
  const done = await apiRequest<{ updatedAt: number }>('PUT', '/v1/sync', { token: code, body: { save: payload(save), baseUpdatedAt: updatedAt } });
  writeLink({ code, version: done.updatedAt, hash: stamp(save) });
  incoming = null;
  waiting = null;
  savedAt = Date.now();
  set('synced');
}

/** "Sync now": look at the cloud, send what is waiting. Throws when the service cannot be reached. */
export async function syncNow(): Promise<void> {
  window.clearTimeout(timer);
  await check();
  await push();
  if (status === 'offline') throw new LeaderboardError('network', 'The cloud cannot be reached right now.');
}

/** The player looked at both sides and chose neither (for now). */
export function dismissIncoming(): void {
  declined = incoming?.updatedAt ?? null;
  incoming = null;
  set(link ? 'synced' : 'off');
}

/** Stops syncing on this device; the cloud copy stays for the other devices. */
export function stopCloud(): void {
  window.clearTimeout(timer);
  writeLink(null);
  incoming = null;
  waiting = null;
  set('off');
}

/** Removes the cloud copy for every device, and stops syncing here. */
export async function deleteCloud(): Promise<void> {
  const code = link?.code ?? incoming?.code;
  if (code) {
    try {
      await apiRequest<void>('DELETE', '/v1/sync', { token: code });
    } catch (error) {
      // Already gone: the same result.
      if (!(error instanceof LeaderboardError && error.status === 404)) throw error;
    }
  }
  stopCloud();
}
