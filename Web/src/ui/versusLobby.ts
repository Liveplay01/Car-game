import { h, icon } from './dom';
import { ICONS } from './icons';
import { openSheet, swapView } from './sheets';
import { inviteLink } from './crazygames';
import { Room, NAME_MAX, cleanName, type RoomError, type HostMessage, type Member, type Reaction } from '../net/room';
import { VersusMatch, type MatchFeel } from '../present/versus';
import type { SessionOutput } from '../present/session';
import { VERSUS_MAX_PLAYERS, VERSUS_MIN_PLAYERS, BEST_OF, isJoinCode, isSeriesOver, newSeries, type Series } from '../core/versus';
import { loadPlayerName, savePlayerName, seatToken } from '../storage/profile';
import { loadAccount } from '../net/leaderboard';
import { S } from '../present/strings';

export interface LobbyEvents {
  /** A match began: the shell hands the canvas to it. */
  started(): void;
  /** Left the room (or it closed): back to the normal game, with a reason if it broke. */
  ended(message: string | null): void;
}

/** The lobby's parts that change while the sheet is open; the name field is never rebuilt. */
interface LobbyParts {
  room: Room;
  code: HTMLElement;
  rows: HTMLElement;
  format: HTMLElement;
  actions: HTMLElement;
  status: HTMLElement;
}

/**
 * The multiplayer sheet: host a game (a four-digit code and an invite link appear), join one
 * with a code or a link, or practise against bots on this device. See who is in, name
 * yourself, fill seats with bots, pick single or best of 3/5, and start. The match itself
 * draws on the canvas (`present/versus.ts`).
 */
export class VersusLobby {
  room: Room | null = null;
  match: VersusMatch | null = null;
  private series: Series = newSeries(1);
  private body: HTMLElement | null = null;
  private parts: LobbyParts | null = null;
  /** What the lobby showed last, pings aside: rows are rebuilt only when it changes. */
  private shown = '';
  private closeSheet: (() => void) | null = null;
  private error: string | null = null;
  private notice: string | null = null;
  private draft = '';
  private name = loadPlayerName();
  private renameTimer = 0;

  constructor(
    private readonly layer: HTMLElement,
    private readonly output: SessionOutput | null,
    private readonly feel: MatchFeel,
    private readonly on: LobbyEvents,
  ) {}

  get isHost(): boolean {
    return this.room?.isHost ?? false;
  }

  get isOpen(): boolean {
    return this.body !== null;
  }

  open(): void {
    if (this.body) return;
    this.error = null;
    // The player's name wins: it is one name for both, changed under Settings → Account.
    this.name = loadAccount()?.name ?? loadPlayerName();
    this.body = h('div', { class: 'versus-sheet' });
    this.parts = null;
    this.closeSheet = openSheet(this.layer, S.lobby.title, this.body, () => {
      this.closeSheet = null;
      this.body = null;
      this.parts = null;
      // Closing the sheet before the match began leaves the room.
      if (!this.match) this.leave(null);
    });
    this.render();
  }

  /** `#join=1234`: opens the sheet and joins at once. */
  joinByLink(code: string): void {
    if (this.room) {
      if (this.room.code === code) {
        this.open();
        return;
      }
      if (this.match && !this.match.isOver) return;
      this.leave(null);
    }
    this.draft = code;
    this.open();
    this.join();
  }

  // MARK: Room

  private events = {
    changed: () => {
      this.render();
      this.startWhenReady();
    },
    guest: (slot: number, message: Parameters<VersusMatch['fromGuest']>[1]) => this.match?.fromGuest(slot, message),
    host: (message: HostMessage) => this.fromHost(message),
    left: (slot: number) => this.match?.guestLeft(slot),
    rejoined: (slot: number) => this.match?.resumeFor(slot),
    failed: (error: RoomError) => {
      const running = this.match !== null;
      this.room = null;
      this.match = null;
      this.parts = null;
      if (running) this.on.ended(S.lobby.errors[error]);
      else {
        this.error = S.lobby.errors[error];
        this.render();
      }
    },
  };

  private host(): void {
    this.error = null;
    this.room = Room.host(this.name, this.events);
    this.render();
  }

  private practice(): void {
    this.error = null;
    const room = Room.local(this.name, this.events);
    this.room = room;
    for (let i = 1; i < VERSUS_MAX_PLAYERS; i++) room.addBot();
    this.render();
  }

  private join(): void {
    if (!isJoinCode(this.draft)) {
      this.error = S.lobby.codeFour;
      this.render();
      return;
    }
    this.error = null;
    this.room = Room.join(this.draft, this.name, seatToken(), this.events);
    this.render();
  }

  private fromHost(message: HostMessage): void {
    if (message.t === 'start' || message.t === 'resume') {
      const resume = message.t === 'resume' ? { inputs: message.inputs, h: message.h } : null;
      this.match = new VersusMatch(this.room!, message, this.output, this.feel, [], resume);
      this.closeSheet?.();
      this.on.started();
    } else this.match?.fromHost(message);
  }

  /** Host: starts a match (or the next round) with everyone in the room. */
  start(): void {
    const room = this.room;
    if (!room || !room.isHost) return;
    room.forgetAway();
    if (room.members.length < VERSUS_MIN_PLAYERS) return;
    if (this.match?.seriesAfter) this.series = this.match.seriesAfter;
    if (this.series.round === 0 || isSeriesOver(this.series) || this.series.bestOf !== room.bestOf) this.series = newSeries(room.bestOf);
    const series: Series = { ...this.series, round: this.series.round + 1 };
    this.series = series;
    room.locked = true;
    room.clearReady();
    const seed = (Math.random() * 0x100000000) >>> 0;
    const names = room.members.map((m) => m.name);
    const slots = room.members.map((m) => m.slot);
    const bots = room.members.flatMap((m, seat) => (m.bot ? [seat] : []));
    const match = new VersusMatch(room, { seed, names, slots, you: 0, series }, this.output, this.feel, bots);
    room.members.forEach((m, seat) => {
      match.seatOfSlot.set(m.slot, seat);
      if (m.slot !== 0 && !m.bot) room.sendTo(m.slot, { t: 'start', seed, names, slots, you: seat, series });
    });
    this.match = match;
    room.shareLobby();
    this.closeSheet?.();
    this.on.started();
  }

  /** After a match: everyone taps Ready, and the host's device starts the next one. */
  get canReady(): boolean {
    return !!this.room && !!this.match?.isOver;
  }

  get isReady(): boolean {
    const room = this.room;
    return !!room?.members.find((m) => m.slot === room.you)?.ready;
  }

  /** Enough players are left for another round. */
  get enoughForNext(): boolean {
    return (this.room?.members.filter((m) => !m.away).length ?? 0) >= VERSUS_MIN_PLAYERS;
  }

  /** The next round of a series, or a new match. */
  get nextLabel(): string {
    const after = this.match?.seriesAfter;
    return after && !isSeriesOver(after) ? S.lobby.nextRound : S.lobby.playAgain;
  }

  toggleReady(): void {
    const room = this.room;
    if (!this.canReady || !room) return;
    room.setReady(!this.isReady);
  }

  private startWhenReady(): void {
    const room = this.room;
    if (!room || !room.isHost || !this.match?.isOver || !room.allReady || !this.enoughForNext) return;
    this.start();
  }

  /** Host, after a match: back to the lobby to change the format or the bots. */
  backToLobby(): void {
    const room = this.room;
    if (!room || !room.isHost || !this.match?.isOver) return;
    if (this.match.seriesAfter) this.series = this.match.seriesAfter;
    this.match = null;
    room.locked = false;
    room.forgetAway();
    room.clearReady();
    room.shareLobby();
    this.on.ended(null);
    this.open();
  }

  /** Out of the match: a reaction for everyone to see. */
  react(r: Reaction): void {
    this.match?.react(r);
  }

  leave(message: string | null = null): void {
    this.room?.close();
    this.room = null;
    this.parts = null;
    const wasPlaying = this.match !== null;
    this.match = null;
    this.series = newSeries(1);
    this.closeSheet?.();
    if (wasPlaying) this.on.ended(message);
  }

  // MARK: Sheet

  private render(): void {
    const body = this.body;
    if (!body) return;
    const room = this.room;
    if (!room) {
      this.parts = null;
      swapView(body, () => body.replaceChildren(...this.chooseView()));
      return;
    }
    if (this.connecting(room)) {
      this.parts = null;
      swapView(body, () => body.replaceChildren(...this.connectingView(room)));
      return;
    }
    if (!this.parts || this.parts.room !== room) {
      swapView(body, () => body.replaceChildren(...this.lobbyView(room)));
    }
    this.fillLobby();
  }

  private connecting(room: Room): boolean {
    return room.isHost ? !room.offline && room.code === null : room.members.length === 0;
  }

  /** With a player the name is theirs and changes only under Settings → Account (Leo, 15.10.2026); without one it is typed here. */
  private nameField(): HTMLElement {
    const account = loadAccount();
    if (account) {
      return h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, account.name), h('div', { class: 'row-sub' }, S.account.nameWhere(`${S.settings.title} → ${S.settings.tabs.account}`))),
      );
    }
    const input = h('input', {
      class: 'name-input',
      type: 'text',
      maxlength: String(NAME_MAX),
      autocomplete: 'nickname',
      autocapitalize: 'words',
      spellcheck: 'false',
      enterkeyhint: 'done',
      placeholder: S.lobby.player,
      'aria-label': S.lobby.yourName,
      value: this.name,
    });
    input.addEventListener('input', () => {
      this.name = cleanName(input.value);
      savePlayerName(this.name);
      window.clearTimeout(this.renameTimer);
      this.renameTimer = window.setTimeout(() => this.room?.rename(this.name), 350);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
    return h('label', { class: 'row name-row' }, h('span', { class: 'row-title' }, S.lobby.yourName), input);
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
      'aria-label': S.lobby.fourDigit,
      value: this.draft,
    });
    const joinBtn = h('button', { class: 'btn', type: 'button', disabled: !isJoinCode(this.draft), onclick: () => this.join() }, S.lobby.join);
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      this.draft = input.value;
      joinBtn.disabled = !isJoinCode(this.draft);
      // The fourth digit completes the code: no need to tap Join (Leo, 05.10.2026).
      if (isJoinCode(this.draft)) this.join();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.join();
      }
    });
    const items: (HTMLElement | null)[] = [
      h('p', { class: 'section-note versus-intro' }, S.lobby.intro(VERSUS_MAX_PLAYERS)),
      h('div', { class: 'list' }, this.nameField()),
      h('div', { class: 'sheet-actions' }, h('button', { class: 'btn primary block', type: 'button', onclick: () => this.host() }, icon(ICONS.people), S.lobby.host)),
      h('div', { class: 'versus-divider', 'aria-hidden': 'true' }, S.lobby.orJoin),
      h('div', { class: 'join-row' }, input, joinBtn),
      this.error ? h('p', { class: 'versus-error', role: 'alert' }, this.error) : null,
      h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => this.practice() }, icon(ICONS.bot), S.lobby.practise),
    ];
    return items.filter((x): x is HTMLElement => x !== null);
  }

  private connectingView(room: Room): HTMLElement[] {
    return [
      h('p', { class: 'versus-status', role: 'status' }, room.isHost ? S.lobby.opening : S.lobby.joining(room.code)),
      h('div', { class: 'sheet-actions' }, h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, S.lobby.cancel)),
    ];
  }

  private lobbyView(room: Room): HTMLElement[] {
    const parts: LobbyParts = {
      room,
      code: h('div', { class: 'join-code-card' }),
      rows: h('div', { class: 'list', role: 'list', 'aria-label': S.lobby.players }),
      format: h('div', { class: 'format-row' }),
      actions: h('div', { class: 'sheet-actions' }),
      status: h('p', { class: 'versus-status small', role: 'status', 'aria-live': 'polite' }),
    };
    this.parts = parts;
    return [parts.code, h('div', { class: 'list' }, this.nameField()), parts.rows, parts.format, parts.status, parts.actions];
  }

  /** Refreshes what changes: the code, the players, the format and the buttons. */
  private fillLobby(): void {
    const p = this.parts;
    if (!p) return;
    const room = p.room;
    p.status.textContent = this.notice ?? '';
    // Pings arrive every two seconds: they update in place, so focus stays where it is.
    for (const m of room.members) {
      const el = p.rows.querySelector<HTMLElement>(`[data-ping="${m.slot}"]`);
      if (el) el.textContent = this.pingText(m);
    }
    const members = room.members.map((m) => [m.slot, m.name, m.bot, m.away]);
    const key = JSON.stringify([members, room.you, room.code, room.bestOf, room.locked]);
    if (p.rows.childElementCount > 0 && key === this.shown) return;
    this.shown = key;
    p.code.replaceChildren(...this.codeCard(room));
    p.rows.replaceChildren(...Array.from({ length: VERSUS_MAX_PLAYERS }, (_, slot) => this.playerRow(room, slot)));
    p.format.replaceChildren(...this.formatControl(room));
    const enough = room.members.length >= VERSUS_MIN_PLAYERS;
    const leaveLabel = room.offline ? S.lobby.close : room.isHost ? S.lobby.closeGame : S.lobby.leave;
    const actions = room.isHost
      ? [
          h('button', { class: 'btn primary block', type: 'button', disabled: !enough, onclick: () => this.start() }, enough ? S.lobby.startWith(room.members.length) : S.lobby.waitingPlayers),
          h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, leaveLabel),
        ]
      : [h('p', { class: 'versus-status', role: 'status' }, S.lobby.waitingHost), h('button', { class: 'btn block', type: 'button', onclick: () => this.leave() }, leaveLabel)];
    p.actions.replaceChildren(...actions);
  }

  private codeCard(room: Room): HTMLElement[] {
    if (room.offline) {
      return [h('div', { class: 'join-code-label' }, S.lobby.practiceLabel), h('div', { class: 'practice-title' }, S.lobby.practiceTitle)];
    }
    const code = room.code ?? '····';
    const items: HTMLElement[] = [
      h('div', { class: 'join-code-label' }, room.isHost ? S.lobby.yourCode : S.lobby.game),
      h('div', { class: 'join-code', 'aria-label': S.lobby.codeLabel(code.split('').join(' ')) }, ...code.split('').map((d) => h('span', {}, d))),
    ];
    if (room.isHost && room.code) {
      items.push(h('button', { class: 'btn invite-btn', type: 'button', onclick: () => void this.invite(room.code!) }, icon(ICONS.share), S.lobby.invite));
      items.push(this.qrCard(room.code));
    }
    return items;
  }

  /**
   * The invite link as a QR code, for a friend in the same room (a classroom, a LAN party): they
   * scan it and the game opens and joins. It loads on demand, so the code appears a moment after the card.
   */
  private qrCard(code: string): HTMLElement {
    const slot = h('div', { class: 'join-qr' });
    slot.hidden = true;
    const url = this.inviteUrl(code);
    void import('./qr')
      .then(({ qrSvg }) => {
        slot.replaceChildren(qrSvg(url, S.lobby.qrLabel(code)), h('span', { class: 'join-qr-label' }, S.lobby.scan));
        slot.hidden = false;
      })
      .catch(() => {
        /* the code and the link still work */
      });
    return slot;
  }

  /** The link that opens the game and joins this room. On CrazyGames the friend must land in their page around the game, not on our address. */
  private inviteUrl(code: string): string {
    return inviteLink(code) ?? `${location.origin}${location.pathname}#join=${code}`;
  }

  /** One row per lane: its colour and number, who drives it, and what the host can do with it. */
  private playerRow(room: Room, slot: number): HTMLElement {
    const m = room.members.find((x) => x.slot === slot);
    const dot = h('span', { class: `lane-dot p${slot + 1}`, 'aria-hidden': 'true' }, String(slot + 1));
    if (!m) {
      const canAdd = room.isHost && !room.locked;
      return h(
        'div',
        { class: 'row lane-row empty', role: 'listitem' },
        dot,
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.lobby.openLane), h('div', { class: 'row-sub' }, room.offline ? S.lobby.addBotHere : S.lobby.waitingFriend)),
        canAdd ? h('button', { class: 'btn small', type: 'button', 'aria-label': S.lobby.addBotLane(slot + 1), onclick: () => room.addBot() }, icon(ICONS.plus), S.lobby.bot) : null,
      );
    }
    const you = slot === room.you;
    const sub = h('span', {}, this.memberSub(room, m), h('span', { 'data-ping': String(slot) }, this.pingText(m)));
    const remove =
      m.bot && room.isHost && !room.locked
        ? h('button', { class: 'icon-btn small', type: 'button', 'aria-label': S.lobby.removeBot(m.name), onclick: () => room.removeBot(slot) }, icon(ICONS.minus))
        : null;
    return h(
      'div',
      { class: 'row lane-row', role: 'listitem' },
      dot,
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, m.bot ? h('span', { class: 'bot-name' }, icon(ICONS.bot), m.name) : m.name), h('div', { class: 'row-sub' }, sub)),
      you ? h('span', { class: 'you-tag' }, S.lobby.you) : null,
      remove,
    );
  }

  private memberSub(room: Room, m: Member): string {
    if (m.bot) return S.lobby.bot;
    return room.offline ? S.lobby.thisDevice : m.slot === 0 ? S.lobby.hostTag : S.lobby.joined;
  }

  private pingText(m: Member): string {
    return m.slot !== 0 && !m.bot && m.ping ? ` · ${Math.round(m.ping)} ms` : '';
  }

  /** Single match, best of 3 or 5: the host picks, the others see it. */
  private formatControl(room: Room): HTMLElement[] {
    const label = h('span', { class: 'row-title' }, S.lobby.format);
    if (!room.isHost) return [label, h('span', { class: 'row-value' }, S.lobby.bestOf[room.bestOf])];
    const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': S.lobby.format });
    const thumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
    thumb.style.width = `calc((100% - 4px) / ${BEST_OF.length})`;
    thumb.style.transform = `translateX(${BEST_OF.indexOf(room.bestOf) * 100}%)`;
    seg.append(thumb);
    for (const value of BEST_OF) {
      const b = h('button', { type: 'button', 'aria-pressed': String(value === room.bestOf), onclick: () => room.setBestOf(value) }, S.lobby.bestOf[value]);
      seg.append(b);
    }
    return [label, seg];
  }

  /** The link that opens the game and joins this room: the share sheet on a phone, else copied. */
  private async invite(code: string): Promise<void> {
    const url = this.inviteUrl(code);
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: S.gameTitle, text: S.lobby.shareText(code), url });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.showNotice(S.lobby.linkCopied);
    } catch {
      window.prompt(S.lobby.copyLink, url);
    }
  }

  private showNotice(message: string): void {
    this.notice = message;
    this.render();
    window.setTimeout(() => {
      if (this.notice !== message) return;
      this.notice = null;
      this.render();
    }, 2400);
  }
}
