import type { Peer, DataConnection, PeerOptions } from 'peerjs';
import { VERSUS_MAX_PLAYERS, randomJoinCode, type BestOf, type Series } from '../core/versus';

/**
 * A multiplayer room: a host and up to three friends (or bots), peer to peer (WebRTC).
 * PeerJS's public broker only introduces the players to each other by the four-digit code;
 * the game itself runs on every device and only taps travel (see `present/versus.ts`). There
 * is no server of our own. A practice room (`Room.local`) has no network at all: you and bots.
 */

/** What a lane does at a step: tap, leave the match (crash, stall, left), or a revenge lorry. */
export type InputKind = 't' | 'c' | 's' | 'l' | 'h';
export type Input = [step: number, seat: number, kind: InputKind];

/** A reaction an out player sends to the ring. */
export type Reaction = 'fire' | 'skull' | 'clap' | 'wow';
export const REACTIONS: Reaction[] = ['fire', 'skull', 'clap', 'wow'];

export interface Member {
  /** Lobby slot 0…3; the host is 0. The slot also gives the player colour. */
  slot: number;
  name: string;
  /** A bot the host plays. */
  bot?: boolean;
  /** Ready for the next match (after one has finished). */
  ready?: boolean;
  /** Lost the connection during a match; the seat waits for a reconnect. */
  away?: boolean;
  /** Round trip to the host in ms, as last measured. */
  ping?: number;
}

/** What a match needs to begin (or, with the inputs so far, to be replayed on a reconnect). */
export interface MatchStart {
  seed: number;
  names: string[];
  /** Lobby slot of every seat. */
  slots: number[];
  you: number;
  series: Series;
}

export type HostMessage =
  | { t: 'lobby'; members: Member[]; you: number; bestOf: BestOf }
  | ({ t: 'start' } & MatchStart)
  /** A guest that reconnected: the match so far, to replay. */
  | ({ t: 'resume'; inputs: Input[]; h: number } & MatchStart)
  /** Inputs scheduled since the last frame; the world may run up to step `h`. */
  | { t: 'f'; h: number; i: Input[] }
  | { t: 'pong'; at: number }
  /** Everyone's ping by lobby slot. */
  | { t: 'pings'; ms: Record<number, number> }
  | { t: 'react'; seat: number; r: Reaction }
  | { t: 'full' };

export type GuestMessage =
  | { t: 'hello'; name: string; token: string }
  | { t: 'name'; name: string }
  | { t: 'tap'; step: number }
  | { t: 'ping'; at: number; rtt: number }
  | { t: 'ready'; on: boolean }
  | { t: 'react'; r: Reaction }
  | { t: 'revenge' }
  | { t: 'bye' };

/** v2: names, bots, series and reconnects; a v1 game is not found under the same code. */
const PREFIX = 'car-game-roundabout-v2-';
const peerId = (code: string): string => PREFIX + code;
const BOT_NAMES = ['Blinker', 'Turbo', 'Rusty', 'Nova'];
export const NAME_MAX = 12;

/** A name as others see it: trimmed, no control characters, at most `NAME_MAX` letters. */
export const cleanName = (name: string): string =>
  Array.from(name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/g, ' '))
    .slice(0, NAME_MAX)
    .join('');

/**
 * Where WebRTC looks for a way through: public STUN servers, plus a TURN relay when the build
 * names one (`VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`). Phones on mobile
 * data sit behind carrier NAT; without a relay some of them cannot reach each other.
 */
/** PeerJS loads only when a real room opens: the career and practice rooms never need it. */
let peerClass: Promise<typeof Peer> | null = null;
function loadPeer(): Promise<typeof Peer> {
  peerClass ??= import('peerjs').then((m) => m.Peer);
  // A failed load (offline before it was cached) may be tried again later.
  peerClass.catch(() => (peerClass = null));
  return peerClass;
}

function peerOptions(): PeerOptions {
  const iceServers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const env = import.meta.env;
  const turn = typeof env.VITE_TURN_URL === 'string' ? env.VITE_TURN_URL.trim() : '';
  if (turn) {
    iceServers.push({
      urls: turn.split(',').map((u: string) => u.trim()).filter(Boolean),
      username: env.VITE_TURN_USERNAME || undefined,
      credential: env.VITE_TURN_CREDENTIAL || undefined,
    });
  }
  return { config: { iceServers } };
}

export type RoomError = 'noGame' | 'full' | 'network' | 'hostLeft' | 'codeBusy';

export interface RoomEvents {
  /** The lobby changed (someone joined, left, renamed or got ready; the code is ready). */
  changed(): void;
  /** Host only: a guest's message the match handles (tap, reaction, revenge). */
  guest(slot: number, message: GuestMessage): void;
  /** Guest only: the host's message. */
  host(message: HostMessage): void;
  /** Host only: a guest left for good while a match runs. */
  left(slot: number): void;
  /** Host only: a guest that lost the connection during the match is back. */
  rejoined(slot: number): void;
  failed(error: RoomError): void;
}

const PING_EVERY = 1000;
const PINGS_EVERY = 2000;
const RECONNECT_TRIES = 4;

export class Room {
  code: string | null = null;
  members: Member[] = [];
  /** This device's lobby slot. */
  you = 0;
  /** A match is running: nobody new may join. */
  locked = false;
  bestOf: BestOf = 1;
  /** Guest: round trip to the host in ms (smoothed); 0 until measured. */
  rtt = 0;
  /** Guest: the connection dropped, a reconnect is under way. */
  reconnecting = false;
  private peer: Peer | null = null;
  private guests = new Map<number, DataConnection>();
  private tokens = new Map<number, string>();
  private hostConn: DataConnection | null = null;
  private closed = false;
  private timers: number[] = [];
  private tries = 0;

  private constructor(
    readonly isHost: boolean,
    /** A practice room on this device only: no code, no network. */
    readonly offline: boolean,
    private readonly name: string,
    private readonly token: string,
    private readonly on: RoomEvents,
  ) {}

  /** Opens a room under a fresh code; tries another code if one is taken. */
  static host(name: string, on: RoomEvents): Room {
    const room = new Room(true, false, name, '', on);
    room.members = [{ slot: 0, name: name || 'Player 1' }];
    room.openAsHost(0);
    room.every(PINGS_EVERY, () => room.sharePings());
    return room;
  }

  /** Practice on this device: you and bots, no network. */
  static local(name: string, on: RoomEvents): Room {
    const room = new Room(true, true, name, '', on);
    room.members = [{ slot: 0, name: name || 'You' }];
    return room;
  }

  static join(code: string, name: string, token: string, on: RoomEvents): Room {
    const room = new Room(false, false, name, token, on);
    room.code = code;
    room.connect();
    room.every(PING_EVERY, () => {
      if (room.hostConn?.open) room.send({ t: 'ping', at: performance.now(), rtt: Math.round(room.rtt) });
    });
    return room;
  }

  private every(ms: number, run: () => void): void {
    this.timers.push(window.setInterval(run, ms));
  }

  // MARK: Guest

  private connect(): void {
    const code = this.code!;
    const start = (peer: Peer): void => {
      const conn = peer.connect(peerId(code), { reliable: true, serialization: 'json' });
      this.hostConn = conn;
      conn.on('open', () => {
        this.tries = 0;
        this.reconnecting = false;
        conn.send({ t: 'hello', name: this.name, token: this.token } satisfies GuestMessage);
        this.on.changed();
      });
      conn.on('data', (data) => this.fromHost(data as HostMessage));
      conn.on('close', () => this.lostHost(conn));
      conn.on('error', () => this.lostHost(conn));
    };
    if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
      start(this.peer);
      return;
    }
    this.peer?.destroy();
    this.peer = null;
    loadPeer().then(
      (Peer) => {
        if (this.closed) return;
        const peer = new Peer(peerOptions());
        this.peer = peer;
        peer.on('open', () => start(peer));
        peer.on('error', (e) => {
          if (e.type === 'peer-unavailable') this.fail(this.members.length > 0 ? 'hostLeft' : 'noGame');
          else this.lostHost(this.hostConn);
        });
      },
      () => this.fail('network'),
    );
  }

  /** The line to the host broke: try again a few times before giving up. */
  private lostHost(conn: DataConnection | null): void {
    if (this.closed || conn !== this.hostConn) return;
    this.hostConn = null;
    // Never admitted: there is nothing to come back to.
    if (this.members.length === 0 || this.tries >= RECONNECT_TRIES) {
      this.fail(this.members.length === 0 ? 'network' : 'hostLeft');
      return;
    }
    this.tries++;
    this.reconnecting = true;
    this.on.changed();
    window.setTimeout(() => {
      if (!this.closed) this.connect();
    }, 700 * this.tries);
  }

  private fromHost(message: HostMessage): void {
    switch (message.t) {
      case 'full':
        this.fail('full');
        return;
      case 'lobby':
        this.members = message.members;
        this.you = message.you;
        this.bestOf = message.bestOf;
        this.on.changed();
        break;
      case 'pong': {
        const rtt = performance.now() - message.at;
        this.rtt = this.rtt === 0 ? rtt : this.rtt * 0.7 + rtt * 0.3;
        break;
      }
      case 'pings':
        for (const m of this.members) {
          const ms = message.ms[m.slot];
          m.ping = m.slot === this.you ? Math.round(this.rtt) : ms;
        }
        this.on.changed();
        break;
      default:
        break;
    }
    this.on.host(message);
  }

  // MARK: Host

  private openAsHost(attempt: number): void {
    loadPeer().then(
      (Peer) => {
        if (this.closed) return;
        const code = randomJoinCode();
        this.listen(new Peer(peerId(code), peerOptions()), code, attempt);
      },
      () => this.fail('network'),
    );
  }

  private listen(peer: Peer, code: string, attempt: number): void {
    this.peer = peer;
    peer.on('open', () => {
      this.code = code;
      this.on.changed();
    });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id' && attempt < 6 && !this.closed) {
        peer.destroy();
        this.openAsHost(attempt + 1);
      } else if (this.code === null) this.fail(e.type === 'unavailable-id' ? 'codeBusy' : 'network');
    });
    // The broker went away (a phone that slept): our code stays ours if we come back quickly.
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) window.setTimeout(() => !this.closed && !peer.destroyed && peer.reconnect(), 1000);
    });
    peer.on('connection', (conn) => this.admit(conn));
  }

  /** A new connection says hello first: a returning player gets their seat back. */
  private admit(conn: DataConnection): void {
    let slot: number | null = null;
    const refuse = (): void => {
      conn.send({ t: 'full' } satisfies HostMessage);
      window.setTimeout(() => conn.close(), 300);
    };
    conn.on('data', (data) => {
      const message = data as GuestMessage;
      if (slot !== null) {
        this.fromGuest(slot, message);
        return;
      }
      if (message.t !== 'hello') return;
      const back = message.token ? this.members.find((m) => m.away && this.tokens.get(m.slot) === message.token) : undefined;
      if (back) {
        slot = back.slot;
        back.away = false;
        this.guests.set(slot, conn);
        this.shareLobby();
        this.on.rejoined(slot);
        return;
      }
      const free = this.locked ? undefined : this.freeSlot();
      if (free === undefined) {
        refuse();
        return;
      }
      slot = free;
      this.members = this.members.filter((m) => m.slot !== free);
      this.guests.set(free, conn);
      this.tokens.set(free, message.token);
      this.members.push({ slot: free, name: cleanName(message.name) || `Player ${free + 1}` });
      this.members.sort((a, b) => a.slot - b.slot);
      this.shareLobby();
    });
    conn.on('close', () => {
      if (slot !== null && this.guests.get(slot) === conn) this.drop(slot, false);
    });
  }

  /** A free slot, or the last bot's: a friend always beats a bot. */
  private freeSlot(): number | undefined {
    const open = [0, 1, 2, 3].find((s) => !this.members.some((m) => m.slot === s));
    if (open !== undefined) return open;
    return [...this.members].reverse().find((m) => m.bot)?.slot;
  }

  private fromGuest(slot: number, message: GuestMessage): void {
    const member = this.members.find((m) => m.slot === slot);
    switch (message.t) {
      case 'ping':
        this.sendTo(slot, { t: 'pong', at: message.at });
        if (member && message.rtt > 0) member.ping = message.rtt;
        return;
      case 'name':
        if (member) member.name = cleanName(message.name) || `Player ${slot + 1}`;
        this.shareLobby();
        return;
      case 'ready':
        if (member) member.ready = message.on;
        this.shareLobby();
        return;
      case 'bye':
        this.drop(slot, true);
        return;
      default:
        this.on.guest(slot, message);
    }
  }

  /** A guest's line closed. During a match the seat waits for a reconnect, unless they said bye. */
  private drop(slot: number, bye: boolean): void {
    const conn = this.guests.get(slot);
    if (!conn) return;
    this.guests.delete(slot);
    if (bye) conn.close();
    const member = this.members.find((m) => m.slot === slot);
    if (this.locked && !bye && member) {
      member.away = true;
    } else {
      this.members = this.members.filter((m) => m.slot !== slot);
      this.tokens.delete(slot);
      if (this.locked) this.on.left(slot);
    }
    this.shareLobby();
  }

  /** Host: fills an open slot with a bot. */
  addBot(): void {
    const slot = [0, 1, 2, 3].find((s) => !this.members.some((m) => m.slot === s));
    if (!this.isHost || this.locked || slot === undefined || this.members.length >= VERSUS_MAX_PLAYERS) return;
    const used = new Set(this.members.map((m) => m.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${slot + 1}`;
    this.members.push({ slot, name, bot: true, ready: true });
    this.members.sort((a, b) => a.slot - b.slot);
    this.shareLobby();
  }

  removeBot(slot: number): void {
    if (!this.isHost || this.locked) return;
    this.members = this.members.filter((m) => !(m.slot === slot && m.bot));
    this.shareLobby();
  }

  setBestOf(bestOf: BestOf): void {
    if (!this.isHost || this.bestOf === bestOf) return;
    this.bestOf = bestOf;
    this.shareLobby();
  }

  /** Players still away when a match ends are gone for good. */
  forgetAway(): void {
    const away = this.members.filter((m) => m.away).map((m) => m.slot);
    if (away.length === 0) return;
    this.members = this.members.filter((m) => !m.away);
    for (const slot of away) this.tokens.delete(slot);
    this.shareLobby();
  }

  shareLobby(): void {
    for (const [slot, conn] of this.guests) if (conn.open) conn.send({ t: 'lobby', members: this.members, you: slot, bestOf: this.bestOf } satisfies HostMessage);
    this.on.changed();
  }

  private sharePings(): void {
    if (this.guests.size === 0) return;
    const ms: Record<number, number> = {};
    for (const m of this.members) if (m.ping !== undefined && !m.bot) ms[m.slot] = m.ping;
    this.broadcast({ t: 'pings', ms });
    this.on.changed();
  }

  // MARK: Both

  /** Your name, as the others see it. */
  rename(name: string): void {
    const clean = cleanName(name);
    const me = this.members.find((m) => m.slot === this.you);
    if (this.isHost) {
      if (me) me.name = clean || (this.offline ? 'You' : 'Player 1');
      this.shareLobby();
    } else this.send({ t: 'name', name: clean });
  }

  /** Ready (or not) for the next match. */
  setReady(on: boolean): void {
    const me = this.members.find((m) => m.slot === this.you);
    if (me) me.ready = on;
    if (this.isHost) this.shareLobby();
    else {
      this.send({ t: 'ready', on });
      this.on.changed();
    }
  }

  /** Everyone who is here (bots always are) is ready. */
  get allReady(): boolean {
    return this.members.every((m) => m.bot || m.away || m.ready);
  }

  clearReady(): void {
    for (const m of this.members) if (!m.bot) m.ready = false;
  }

  /** Host: to one guest, by lobby slot. */
  sendTo(slot: number, message: HostMessage): void {
    const conn = this.guests.get(slot);
    if (conn?.open) conn.send(message);
  }

  /** Host: to every guest. */
  broadcast(message: HostMessage): void {
    for (const conn of this.guests.values()) if (conn.open) conn.send(message);
  }

  /** Guest: to the host. */
  send(message: GuestMessage): void {
    if (this.hostConn?.open) this.hostConn.send(message);
  }

  private fail(error: RoomError): void {
    if (this.closed) return;
    this.close();
    this.on.failed(error);
  }

  close(): void {
    if (this.closed) return;
    // Say goodbye, so the host takes the lane out at once instead of waiting for a reconnect.
    if (this.hostConn?.open) this.hostConn.send({ t: 'bye' } satisfies GuestMessage);
    this.closed = true;
    for (const id of this.timers) window.clearInterval(id);
    this.timers = [];
    const conns = [...this.guests.values(), this.hostConn];
    // Give the bye a moment on the wire.
    window.setTimeout(() => {
      for (const conn of conns) conn?.close();
      this.peer?.destroy();
    }, 60);
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
