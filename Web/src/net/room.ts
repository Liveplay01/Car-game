import { Peer, type DataConnection } from 'peerjs';
import { VERSUS_MAX_PLAYERS, randomJoinCode } from '../core/versus';

/**
 * A multiplayer room: a host and up to three friends, peer to peer (WebRTC). PeerJS's public
 * broker only introduces the players to each other by the four-digit code; the game itself
 * runs on every device and only taps travel (see `present/versus.ts`). There is no server of
 * our own.
 */

/** What a lane does at a step: tap, or leave the match (crash, stall, left). */
export type InputKind = 't' | 'c' | 's' | 'l';
export type Input = [step: number, seat: number, kind: InputKind];

export interface Member {
  /** Lobby slot 0…3; the host is 0. */
  slot: number;
  name: string;
}

export type HostMessage =
  | { t: 'lobby'; members: Member[]; you: number }
  | { t: 'start'; seed: number; names: string[]; you: number; round: number }
  /** Inputs scheduled since the last frame; the world may run up to step `h`. */
  | { t: 'f'; h: number; i: Input[] }
  | { t: 'pong'; at: number }
  | { t: 'full' };

export type GuestMessage = { t: 'tap'; step: number } | { t: 'ping'; at: number };

const PREFIX = 'car-game-roundabout-v1-';
const peerId = (code: string): string => PREFIX + code;

export type RoomError = 'noGame' | 'full' | 'network' | 'hostLeft' | 'codeBusy';

export interface RoomEvents {
  /** The lobby changed (someone joined or left, the code is ready). */
  changed(): void;
  /** Host only: a guest's message. */
  guest(slot: number, message: GuestMessage): void;
  /** Guest only: the host's message. */
  host(message: HostMessage): void;
  /** Host only: a guest left while a match runs. */
  left(slot: number): void;
  failed(error: RoomError): void;
}

export class Room {
  code: string | null = null;
  members: Member[] = [];
  /** This device's lobby slot. */
  you = 0;
  /** A match is running: nobody new may join. */
  locked = false;
  private peer: Peer | null = null;
  private guests = new Map<number, DataConnection>();
  private hostConn: DataConnection | null = null;
  private closed = false;

  private constructor(
    readonly isHost: boolean,
    private readonly on: RoomEvents,
  ) {}

  /** Opens a room under a fresh code; tries another code if one is taken. */
  static host(on: RoomEvents): Room {
    const room = new Room(true, on);
    room.members = [{ slot: 0, name: 'Player 1' }];
    room.openAsHost(0);
    return room;
  }

  static join(code: string, on: RoomEvents): Room {
    const room = new Room(false, on);
    room.code = code;
    const peer = new Peer();
    room.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(peerId(code), { reliable: true, serialization: 'json' });
      room.hostConn = conn;
      conn.on('data', (data) => room.fromHost(data as HostMessage));
      conn.on('close', () => room.fail('hostLeft'));
      conn.on('error', () => room.fail('network'));
    });
    peer.on('error', (e) => room.fail(e.type === 'peer-unavailable' ? 'noGame' : 'network'));
    return room;
  }

  private openAsHost(attempt: number): void {
    const code = randomJoinCode();
    const peer = new Peer(peerId(code));
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
    peer.on('connection', (conn) => this.admit(conn));
  }

  private admit(conn: DataConnection): void {
    conn.on('open', () => {
      const slot = [0, 1, 2, 3].find((s) => !this.members.some((m) => m.slot === s));
      if (this.locked || slot === undefined || this.members.length >= VERSUS_MAX_PLAYERS) {
        conn.send({ t: 'full' } satisfies HostMessage);
        setTimeout(() => conn.close(), 300);
        return;
      }
      this.guests.set(slot, conn);
      this.members.push({ slot, name: `Player ${slot + 1}` });
      this.members.sort((a, b) => a.slot - b.slot);
      conn.on('data', (data) => this.on.guest(slot, data as GuestMessage));
      conn.on('close', () => this.drop(slot));
      this.shareLobby();
    });
  }

  private drop(slot: number): void {
    if (!this.guests.delete(slot)) return;
    this.members = this.members.filter((m) => m.slot !== slot);
    if (this.locked) this.on.left(slot);
    this.shareLobby();
  }

  private fromHost(message: HostMessage): void {
    if (message.t === 'full') {
      this.fail('full');
      return;
    }
    if (message.t === 'lobby') {
      this.members = message.members;
      this.you = message.you;
      this.on.changed();
    }
    this.on.host(message);
  }

  shareLobby(): void {
    for (const [slot, conn] of this.guests) conn.send({ t: 'lobby', members: this.members, you: slot } satisfies HostMessage);
    this.on.changed();
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
    this.closed = true;
    for (const conn of this.guests.values()) conn.close();
    this.hostConn?.close();
    this.peer?.destroy();
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
