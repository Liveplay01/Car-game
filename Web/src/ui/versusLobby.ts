import { h, icon } from './dom';
import { ICONS } from './icons';
import { openSheet } from './sheets';
import { Room, type RoomError, type HostMessage } from '../net/room';
import { VersusMatch } from '../present/versus';
import type { SessionOutput } from '../present/session';
import { VERSUS_MAX_PLAYERS, VERSUS_MIN_PLAYERS, isJoinCode } from '../core/versus';

const ERROR_TEXT: Record<RoomError, string> = {
  noGame: 'No game with this code. Check the digits with your friend.',
  full: 'This game is full or already running.',
  network: 'Could not connect. Check your internet and try again.',
  hostLeft: 'The host closed the game.',
  codeBusy: 'Could not get a free code. Try again.',
};

export interface LobbyEvents {
  /** A match began: the shell hands the canvas to it. */
  started(): void;
  /** Left the room (or it closed): back to the normal game, with a reason if it broke. */
  ended(message: string | null): void;
}

/**
 * The multiplayer sheet: host a game (a four-digit code appears) or join one with a code,
 * see who is in, and start. The match itself draws on the canvas (`present/versus.ts`).
 */
export class VersusLobby {
  room: Room | null = null;
  match: VersusMatch | null = null;
  private round = 0;
  private body: HTMLElement | null = null;
  private closeSheet: (() => void) | null = null;
  private error: string | null = null;
  private draft = '';

  constructor(
    private readonly layer: HTMLElement,
    private readonly output: SessionOutput | null,
    private readonly on: LobbyEvents,
  ) {}

  get isHost(): boolean {
    return this.room?.isHost ?? false;
  }

  open(): void {
    this.error = null;
    this.body = h('div', { class: 'versus-sheet' });
    this.closeSheet = openSheet(this.layer, 'Multiplayer', this.body, () => {
      this.closeSheet = null;
      this.body = null;
      // Closing the sheet before the match began leaves the room.
      if (!this.match) this.leave(null);
    });
    this.render();
  }

  // MARK: Room

  private events = {
    changed: () => this.render(),
    guest: (slot: number, message: Parameters<VersusMatch['fromGuest']>[1]) => this.match?.fromGuest(slot, message),
    host: (message: HostMessage) => this.fromHost(message),
    left: (slot: number) => this.match?.guestLeft(slot),
    failed: (error: RoomError) => {
      const running = this.match !== null;
      this.room = null;
      this.match = null;
      if (running) this.on.ended(ERROR_TEXT[error]);
      else {
        this.error = ERROR_TEXT[error];
        this.render();
      }
    },
  };

  private host(): void {
    this.error = null;
    this.room = Room.host(this.events);
    this.render();
  }

  private join(): void {
    if (!isJoinCode(this.draft)) {
      this.error = 'A code has four digits.';
      this.render();
      return;
    }
    this.error = null;
    this.room = Room.join(this.draft, this.events);
    this.render();
  }

  private fromHost(message: HostMessage): void {
    if (message.t === 'start') {
      this.match = new VersusMatch(this.room!, message.seed, message.names, message.you, this.output);
      this.round = message.round;
      this.closeSheet?.();
      this.on.started();
    } else this.match?.fromHost(message);
  }

  /** Host: starts a match (or the next one) with everyone in the room. */
  start(): void {
    const room = this.room;
    if (!room || !room.isHost || room.members.length < VERSUS_MIN_PLAYERS) return;
    room.locked = true;
    this.round++;
    const seed = (Math.random() * 0x100000000) >>> 0;
    const names = room.members.map((m) => m.name);
    const match = new VersusMatch(room, seed, names, 0, this.output);
    room.members.forEach((m, seat) => {
      match.seatOfSlot.set(m.slot, seat);
      if (m.slot !== 0) room.sendTo(m.slot, { t: 'start', seed, names, you: seat, round: this.round });
    });
    this.match = match;
    this.closeSheet?.();
    this.on.started();
  }

  /** Host, after a match: the same friends again. */
  get canRematch(): boolean {
    return this.isHost && (this.match?.isOver ?? false) && (this.room?.members.length ?? 0) >= VERSUS_MIN_PLAYERS;
  }

  leave(message: string | null = null): void {
    this.room?.close();
    this.room = null;
    const wasPlaying = this.match !== null;
    this.match = null;
    this.closeSheet?.();
    if (wasPlaying) this.on.ended(message);
  }

  // MARK: Sheet

  private render(): void {
    const body = this.body;
    if (!body) return;
    body.replaceChildren(...(this.room ? this.lobbyView(this.room) : this.chooseView()));
  }

  private chooseView(): HTMLElement[] {
    const input = h('input', {
      class: 'code-input',
      type: 'text',
      inputmode: 'numeric',
      pattern: '[0-9]*',
      maxlength: '4',
      size: '4',
      autocomplete: 'off',
      enterkeyhint: 'go',
      placeholder: '0000',
      'aria-label': 'Four-digit code',
      value: this.draft,
    });
    const joinBtn = h('button', { class: 'btn', type: 'button', disabled: !isJoinCode(this.draft), onclick: () => this.join() }, 'Join');
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      this.draft = input.value;
      joinBtn.disabled = !isJoinCode(this.draft);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.join();
      }
    });
    const items: (HTMLElement | null)[] = [
      h('p', { class: 'section-note versus-intro' }, `Up to ${VERSUS_MAX_PLAYERS} friends, one roundabout, one lane each. Cause a crash while merging and you are out. Last one standing wins.`),
      h('div', { class: 'sheet-actions' }, h('button', { class: 'btn primary block', type: 'button', onclick: () => this.host() }, icon(ICONS.people), 'Host a game')),
      h('div', { class: 'versus-divider', 'aria-hidden': 'true' }, 'or join a friend'),
      h('div', { class: 'join-row' }, input, joinBtn),
      this.error ? h('p', { class: 'versus-error', role: 'alert' }, this.error) : null,
    ];
    return items.filter((x): x is HTMLElement => x !== null);
  }

  private lobbyView(room: Room): HTMLElement[] {
    const code = room.code;
    const connecting = room.isHost ? code === null : room.members.length === 0;
    if (connecting) {
      return [
        h('p', { class: 'versus-status', role: 'status' }, room.isHost ? 'Opening a game…' : `Joining ${code}…`),
        h('div', { class: 'sheet-actions' }, h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, 'Cancel')),
      ];
    }
    const rows = Array.from({ length: VERSUS_MAX_PLAYERS }, (_, slot) => {
      const m = room.members.find((x) => x.slot === slot);
      const you = m !== undefined && slot === room.you;
      return h(
        'div',
        { class: `row lane-row${m ? '' : ' empty'}` },
        h('span', { class: 'lane-dot', 'aria-hidden': 'true' }, String(slot + 1)),
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, m ? m.name : 'Open lane'), h('div', { class: 'row-sub' }, m ? (slot === 0 ? 'Host' : 'Ready') : 'Waiting for a friend')),
        you ? h('span', { class: 'you-tag' }, 'You') : null,
      );
    });
    const enough = room.members.length >= VERSUS_MIN_PLAYERS;
    const actions = room.isHost
      ? [
          h('button', { class: 'btn primary block', type: 'button', disabled: !enough, onclick: () => this.start() }, enough ? `Start with ${room.members.length}` : 'Waiting for players'),
          h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, 'Close game'),
        ]
      : [h('p', { class: 'versus-status', role: 'status' }, 'Waiting for the host to start'), h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, 'Leave')];
    return [
      h(
        'div',
        { class: 'join-code-card' },
        h('div', { class: 'join-code-label' }, room.isHost ? 'Your code: tell your friends' : 'Game'),
        h('div', { class: 'join-code', 'aria-label': `Code ${code?.split('').join(' ')}` }, ...(code ?? '····').split('').map((d) => h('span', {}, d))),
      ),
      h('div', { class: 'list' }, ...rows),
      h('div', { class: 'sheet-actions' }, ...actions),
    ];
  }
}
