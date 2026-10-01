import type { SaveGame } from '../core/career';
import type { Config } from '../core/config';
import { Casino } from '../core/casino';
import { CasinoPage, type Books, type CasinoState, type CasinoTarget, type CasinoCue, winTier } from './casino';
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
        this.clearFinishedUpgrade();
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

  /**
   * A finished upgrade stays on the table so its result can be read (the lost stake, the dial).
   * Once the player starts setting up the next one it must go: the table draws the old round's
   * skins while a round is kept, so new picks would not show up.
   */
  private clearFinishedUpgrade(): void {
    const s = this.host.casino;
    if (s.run?.k === 'upgrade' && !s.busy) s.run = null;
  }

  /** The books as they stand before a round changes them: what the page shows until the reveal. */
  private books(): Books {
    const career = this.host.save.career;
    return { money: career.money, net: Casino.today(career, this.host.today), log: career.casinoLog.map((r) => ({ ...r })), unseen: [...career.unseen] };
  }

  /** A new round with the stake chosen: the save is written before anything shows. */
  private start(): void {
    const s = this.host.casino;
    const career = this.host.save.career;
    if (s.busy || s.picker) return;
    this.collect();
    const before = this.books();
    if (s.game === 'upgrade') {
      if (s.staked.length === 0 || !s.target) {
        this.host.tick();
        this.clearFinishedUpgrade();
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
      s.wallet.stake(before, 0, this.host.reduceMotion);
      s.staked = [];
      s.target = null;
      s.run = { k: 'upgrade', roll, age: 0 };
      if (this.host.reduceMotion) s.skip();
      this.host.play(['chipsIn', 'swoosh'], ['tap']);
      return;
    }
    const stake = CasinoPage.stakeOf(career, s);
    if (s.game === 'crash') {
      const point = Casino.startCrash(career, stake, this.host.today, this.host.config);
      if (point === null) return this.denied(stake);
      this.host.persist();
      s.wallet.stake(before, stake, this.host.reduceMotion);
      s.run = { k: 'crash', stake, point, end: Casino.endOf(point, this.host.config.crashAutoTargets[s.auto] ?? 0), age: 0, out: null, crash: null };
      this.host.play(['chipsIn', 'go'], ['tap']);
      return;
    }
    const from: [number, number, number] = [...s.reels];
    const spin = Casino.spin(career, stake, this.host.today, this.host.config);
    if (!spin) return this.denied(stake);
    this.host.persist();
    s.wallet.stake(before, stake, this.host.reduceMotion);
    s.reels = spin.stops;
    s.run = { k: 'slots', spin, from, anticipate: spin.line[0] === spin.line[1], age: 0 };
    if (this.host.reduceMotion) s.skip();
    this.host.play(['chipsIn', 'reelSpin'], ['tap']);
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
    const tier = win > 0 && m !== null ? winTier(m) : 0;
    this.host.casino.wallet.reveal(this.host.save.career.money, win, tier, this.host.reduceMotion);
    if (win > 0 && m !== null) {
      const clutch = CasinoPage.clutchOf(run.point, m);
      run.out = { m, win, age: 0, clutch };
      this.host.play(['paid', ...CasinoFlow.fanfare(tier)], ['paid']);
      if (clutch !== null) this.host.play(['perfect'], ['perfect']);
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
    const chain = pending.flips + 1;
    const before = this.books();
    const flip = Casino.flip(this.host.save.career, this.host.today, this.host.config);
    if (!flip) {
      this.host.play(['denied'], []);
      return;
    }
    this.host.persist();
    s.wallet.stake(before, 0, this.host.reduceMotion);
    s.run = { k: 'flip', flip, items, age: 0, chain };
    if (this.host.reduceMotion) s.skip();
    this.host.play(['coinToss'], ['tap']);
  }

  /** The fanfare a win of `tier` gets on top of its own sound. */
  static fanfare(tier: number): SoundID[] {
    return tier >= 3 ? ['chestBurstRare'] : tier >= 2 ? ['chestBurst'] : [];
  }

  cue(cue: CasinoCue): void {
    const run = this.host.casino.run;
    if (!run) return;
    switch (cue.k) {
      case 'tick':
        // The drive's meter blips at every tenth more, a semitone higher each time: the tension is heard.
        if (run.k === 'crash') this.host.playPitched('meterTick', Math.pow(2, Math.min(cue.step, 24) / 12));
        else this.host.playPitched('needleTick', 1.4 + 0.08 * (cue.step % 3));
        break;
      case 'reel':
        // Klack-wumm: the stop, a little higher reel by reel.
        this.host.playPitched('casinoStop', [1, 1.12, 1.26][cue.reel]);
        this.host.play([], ['merge']);
        break;
      case 'creep':
        this.host.playPitched('needleTick', 0.8 + 0.08 * cue.step);
        this.host.play([], ['tap']);
        break;
      case 'peg':
        this.host.playPitched('needleTick', cue.slow ? 0.85 : 1.2);
        if (cue.slow) this.host.play([], ['tap']);
        break;
      case 'ding':
        this.host.playPitched('coinClink', Math.min(2, 1 + 0.04 * cue.step));
        break;
      case 'coins':
        this.host.playPitched('coinClink', 1 + 0.1 * cue.tier);
        this.host.play([], ['paid']);
        break;
      case 'clutchBoom':
        this.host.play(['explosion'], ['explosion']);
        break;
      case 'crashDue':
        if (run.k === 'crash') this.settleDrive(run.end.cashOut ? run.end.at : null);
        break;
      case 'result': {
        const bank = this.host.save.career.money;
        const rm = this.host.reduceMotion;
        if (run.k === 'slots') {
          const tier = winTier(run.spin.pay);
          this.host.casino.wallet.reveal(bank, run.spin.win, tier, rm);
          if (run.spin.win > 0) this.host.play([tier >= 3 ? 'chestBurstRare' : 'chestBurst'], ['chest']);
        } else if (run.k === 'upgrade') {
          this.host.casino.wallet.reveal(bank, 0, 0, rm);
          if (run.roll.won) {
            this.host.play(['chestBurstRare'], ['chest']);
            this.host.announceAlbums();
          } else {
            this.host.play(['shatter', 'shiftFailed'], ['crash']);
            this.host.showNotice(S.casino.skinsLost(run.roll.staked.length));
          }
        } else if (run.k === 'flip') {
          // A doubled win flies in: what the coin added, as loud as the chain has grown.
          const gained = run.flip.won && !run.items ? run.flip.money / 2 : 0;
          this.host.casino.wallet.reveal(bank, gained, winTier(2 ** run.chain), rm);
          this.host.play(['coinLand'], []);
          if (run.flip.won) {
            this.host.play(['chestBurst'], ['chest']);
            if (run.items) this.host.announceAlbums();
          } else this.host.play(['shiftFailed'], ['crash']);
        }
        break;
      }
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
      // The page is being left: the books show as they are, without a show.
      s.wallet.reveal(this.host.save.career.money, 0, 0, true);
      s.run = null;
      this.host.persist();
    }
    this.collect();
  }

  /** A round open when the page closed: a drive pays its stake back, a win is kept. */
}
