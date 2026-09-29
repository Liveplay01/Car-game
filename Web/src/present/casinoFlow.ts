import type { SaveGame } from '../core/career';
import type { Config } from '../core/config';
import { Casino } from '../core/casino';
import { CasinoPage, type CasinoState, type CasinoTarget, type CasinoCue } from './casino';
import type { SoundID, HapticID } from './feedback';
import { S, Fmt, money as moneyText } from './strings';

/** What the casino needs from the session: the save, the sheet, sound and the notices. */
export interface CasinoHost {
  /** The Shop tab's casino state; the session makes a new one when the tab is left. */
  readonly casino: CasinoState;
  readonly save: SaveGame;
  readonly config: Config;
  readonly today: number;
  readonly reduceMotion: boolean;
  detailOpen: boolean;
  closeDetail(): void;
  tick(): void;
  play(sounds: SoundID[], haptics: HapticID[]): void;
  playPitched(sound: SoundID, pitch: number): void;
  persist(): void;
  showNotice(text: string): void;
  announceAlbums(): void;
}

/**
 * The casino's rounds on the Shop tab: taps, the cash-out, the cues of a running round, and
 * what happens to an open round when the page closes. The rules are `core/casino.ts`, the
 * looks `present/casino.ts`; the save is always written before anything shows.
 */
export class CasinoFlow {
  constructor(private readonly host: CasinoHost) {}

  tap(t: CasinoTarget): void {
    const s = this.host.casino;
    const career = this.host.save.career;
    if (t.k !== 'skip' && t.k !== 'cashOut' && !this.host.reduceMotion) s.pressed = { t, age: 0 };
    switch (t.k) {
      case 'game':
        if (s.game === t.game || s.busy) return;
        this.host.tick();
        this.collect();
        s.selectGame(t.game);
        break;
      case 'odds':
        this.host.tick();
        if (this.host.detailOpen) this.host.closeDetail();
        else this.host.detailOpen = true;
        break;
      case 'stake':
        if (s.busy) return;
        this.host.tick();
        s.stake = t.index;
        break;
      case 'auto':
        if (s.busy) return;
        this.host.tick();
        s.auto = t.index;
        break;
      case 'play':
        this.start();
        break;
      case 'cashOut':
        this.cashOut(0);
        break;
      case 'double':
        this.flip();
        break;
      case 'collect':
        this.host.tick();
        this.collect();
        break;
      case 'skip':
        s.skip();
        break;
      case 'slot':
        this.host.tick();
        this.collect();
        s.picker = t.slot < 5 ? 'stake' : 'target';
        s.page = 0;
        break;
      case 'pick':
        if (s.picker === 'stake') {
          if (s.staked.includes(t.id)) s.staked = s.staked.filter((x) => x !== t.id);
          else if (s.staked.length >= this.host.config.upgradeMaxStake) {
            this.host.play(['denied'], []);
            return;
          } else s.staked = [...s.staked, t.id];
          s.tidy(career);
          this.host.tick();
        } else {
          s.target = t.id;
          s.picker = null;
          this.host.tick();
        }
        break;
      case 'page':
        this.host.tick();
        s.page = Math.max(0, s.page + t.step);
        break;
      case 'done':
        this.host.tick();
        s.picker = null;
        break;
    }
  }

  /** Space: cash out on a drive, skip a reveal, otherwise play again with the same stake. */
  key(ago: number): void {
    const s = this.host.casino;
    if (s.driving) this.cashOut(ago);
    else if (s.busy) s.skip();
    // A key pressed a moment too late for the cash-out must not start the next round.
    else if (!s.picker && s.sinceEnd >= 0.7) this.start();
  }

  /** A new round with the stake chosen: the save is written before anything shows. */
  private start(): void {
    const s = this.host.casino;
    const career = this.host.save.career;
    if (s.busy || s.picker) return;
    this.collect();
    if (s.game === 'upgrade') {
      if (s.staked.length === 0 || !s.target) {
        this.host.tick();
        s.picker = s.staked.length === 0 ? 'stake' : 'target';
        s.page = 0;
        return;
      }
      const roll = Casino.upgrade(career, s.staked, s.target, this.host.today, this.host.config);
      if (!roll) {
        this.host.play(['denied'], []);
        return;
      }
      this.host.persist();
      s.staked = [];
      s.target = null;
      s.run = { k: 'upgrade', roll, age: 0 };
      if (this.host.reduceMotion) s.skip();
      this.host.play(['swoosh'], ['tap']);
      return;
    }
    const stake = CasinoPage.stakeOf(career, s);
    if (s.game === 'crash') {
      const point = Casino.startCrash(career, stake, this.host.today, this.host.config);
      if (point === null) return this.denied(stake);
      this.host.persist();
      s.run = { k: 'crash', stake, point, end: Casino.endOf(point, this.host.config.crashAutoTargets[s.auto] ?? 0), age: 0, out: null, crash: null };
      this.host.play(['go'], ['tap']);
      return;
    }
    const from: [number, number, number] = [...s.reels];
    const spin = Casino.spin(career, stake, this.host.today, this.host.config);
    if (!spin) return this.denied(stake);
    this.host.persist();
    s.reels = spin.stops;
    s.run = { k: 'slots', spin, from, anticipate: spin.line[0] === spin.line[1], age: 0 };
    if (this.host.reduceMotion) s.skip();
    this.host.play(['swoosh'], ['tap']);
  }

  private denied(stake: number): void {
    this.host.play(['denied'], []);
    this.host.showNotice(S.notice.notEnoughMoney(Fmt.number(stake)));
  }

  /** Cashes out at the multiplier of the moment the tap came (`ago` seconds back). */
  private cashOut(ago: number): void {
    const run = this.host.casino.run;
    if (!run || run.k !== 'crash' || !this.host.casino.driving) return;
    const at = Math.max(0, run.age - ago);
    if (at >= Casino.timeOf(run.end.at, this.host.config)) return;
    const m = Casino.multiplierAt(at, this.host.config);
    if (m <= 1) return;
    this.settleDrive(m);
  }

  /** The drive ends at `m`: paid if it had not crashed yet there; null is the crash. */
  private settleDrive(m: number | null): void {
    const run = this.host.casino.run;
    if (!run || run.k !== 'crash') return;
    const win = m === null ? Casino.crashed(this.host.save.career, this.host.today, this.host.config) : Casino.cashOut(this.host.save.career, m, this.host.today, this.host.config);
    this.host.persist();
    if (win > 0 && m !== null) {
      const clutch = CasinoPage.clutchOf(run.point, m);
      run.out = { m, win, age: 0, clutch };
      this.host.play(['paid'], ['paid']);
      if (clutch !== null) this.host.play(['perfect'], ['perfect']);
      if (m >= 5) this.host.play([m >= 10 ? 'chestBurstRare' : 'chestBurst'], []);
    } else {
      run.crash = 0;
      this.host.play(['explosion', 'crashHeavy'], ['explosion']);
    }
  }

  private flip(): void {
    const s = this.host.casino;
    const pending = this.host.save.career.casinoPending;
    if (s.busy || !pending || pending.k !== 'win') return;
    const items = pending.items.length > 0;
    const flip = Casino.flip(this.host.save.career, this.host.today, this.host.config);
    if (!flip) {
      this.host.play(['denied'], []);
      return;
    }
    this.host.persist();
    s.run = { k: 'flip', flip, items, age: 0 };
    if (this.host.reduceMotion) s.skip();
    this.host.play(['chestCharge'], ['tap']);
  }

  cue(cue: CasinoCue): void {
    const run = this.host.casino.run;
    if (!run) return;
    switch (cue.k) {
      case 'tick':
        // The drive ticks at every tenth more, a semitone higher each time: the tension is heard.
        if (run.k === 'crash') this.host.playPitched('uiTick', Math.pow(2, Math.min(cue.step, 24) / 12));
        else this.host.playPitched('uiTick', 1 + 0.05 * (cue.step % 3));
        break;
      case 'reel':
        // Klack-wumm: the stop, and a low thud under it.
        this.host.playPitched('toll', [1, 1.12, 1.26][cue.reel]);
        this.host.playPitched('build', 0.7);
        this.host.play([], ['merge']);
        break;
      case 'creep':
        this.host.playPitched('uiTick', 0.85 + 0.08 * cue.step);
        this.host.play([], ['tap']);
        break;
      case 'peg':
        this.host.playPitched('uiTick', cue.slow ? 1.35 : 1.15);
        if (cue.slow) this.host.play([], ['tap']);
        break;
      case 'ding':
        this.host.playPitched('toll', Math.min(2.2, 1.3 + 0.045 * cue.step));
        break;
      case 'clutchBoom':
        this.host.play(['explosion'], ['explosion']);
        break;
      case 'crashDue':
        if (run.k === 'crash') this.settleDrive(run.end.cashOut ? run.end.at : null);
        break;
      case 'result':
        if (run.k === 'slots') {
          if (run.spin.win > 0) this.host.play([run.spin.pay >= 40 ? 'chestBurstRare' : 'chestBurst'], ['chest']);
        } else if (run.k === 'upgrade') {
          if (run.roll.won) {
            this.host.play(['chestBurstRare'], ['chest']);
            this.host.announceAlbums();
          } else {
            this.host.play(['shiftFailed'], ['crash']);
            this.host.showNotice(S.casino.skinsLost(run.roll.staked.length));
          }
        } else if (run.k === 'flip') {
          if (run.flip.won) {
            this.host.play(['chestBurst'], ['chest']);
            if (run.items) this.host.announceAlbums();
          } else this.host.play(['shiftFailed'], ['crash']);
        }
        break;
    }
  }

  /** The win is kept; the offer to double goes. */
  private collect(): void {
    if (this.host.save.career.casinoPending?.k !== 'win') return;
    Casino.collect(this.host.save.career);
    this.host.persist();
  }

  /** Leaving the casino: a drive cashes out where it stands, an open win is kept. */
  leave(): void {
    const s = this.host.casino;
    const run = s.run;
    if (run?.k === 'crash' && s.driving) {
      const due = run.age >= Casino.timeOf(run.end.at, this.host.config);
      const m = due ? (run.end.cashOut ? run.end.at : null) : Casino.multiplierAt(run.age, this.host.config);
      if (m !== null && m <= 1) Casino.resume(this.host.save.career, this.host.today);
      else {
        const win = m === null ? Casino.crashed(this.host.save.career, this.host.today, this.host.config) : Casino.cashOut(this.host.save.career, m, this.host.today, this.host.config);
        if (win > 0) this.host.showNotice(S.casino.cashedOnLeave(moneyText(Fmt.number(win))));
      }
      s.run = null;
      this.host.persist();
    }
    this.collect();
  }

  /** A round open when the page closed: a drive pays its stake back, a win is kept. */
  resume(): void {
    if (!this.host.save.career.casinoPending) return;
    const back = Casino.resume(this.host.save.career, this.host.today);
    this.host.persist();
    if (back) this.host.showNotice(S.casino.refunded(moneyText(Fmt.number(back.refunded))));
  }
}
