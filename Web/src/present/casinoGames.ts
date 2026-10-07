import { type Career, Careers } from '../core/career';
import { baseConfig } from '../core/config';
import { type SlotSpin, type SlotSymbol, Casino } from '../core/casino';
import { cosmetic } from '../core/loot';
import type { VehicleType } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle, TAU, lerpV } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, arc, line, polygon, Ease, pinned, zoomed, drawText } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { S, Fmt, money } from './strings';
import { drawFitted } from './icons';
import { CarArt } from './carArt';
import { SYNDICATE_BOSS } from './scene';
import { land } from './hud';
import { ShopPage } from './shop';
import { CasinoPage, type CasinoRun, CasinoState } from './casino';
import { TIMES, HEAT, SYMBOL, slotEnd, reelStop, reelAt, needleTime, needleTurn, heatOf, unit, winTier, rouletteEnd, rouletteTurn, scratchAt, scratchEnd, type RouletteRun } from './casinoKit';

/**
 * The four tables of the casino, drawn as pure functions of their age: Crash, Slots, the Skin
 * Upgrade and Double or nothing. `CasinoPage` takes them in, so they are called as its own.
 */
export const CasinoGames = {
  // MARK: Crash

  /**
   * The drive: a curve that climbs as the car speeds up, the multiplier over it. It heats up
   * in stages: calm, then speed lines, then nitro with a glowing edge, then the danger zone
   * with warning lights. The crash is a bang: a freeze, a fireball, debris and a red flash.
   */
  addCrash(list: RenderList, stage: Rect, run: Extract<CasinoRun, { k: 'crash' }> | null, reduceMotion: boolean, enter: number): void {
    const cfg = baseConfig;
    const vp = list.camera.viewport;
    const crashed = run?.crash ?? null;
    const out = run?.out ?? null;
    // After a Clutch Cash-out the empty car drives on and crashes where it would have.
    const ghost = out && out.clutch !== null ? Math.min(out.age, out.clutch) : 0;
    const boom = crashed !== null ? crashed : out && out.clutch !== null && out.age >= out.clutch ? out.age - out.clutch : null;
    const blast = boom === null ? null : Math.max(0, boom - TIMES.hitstop);
    const now = run ? Math.min(run.age, Casino.timeOf(out?.m ?? run.end.at, cfg)) : 0;
    const m = run ? (out ? out.m : crashed !== null ? run.point : Casino.multiplierAt(now, cfg)) : 1;
    const driving = run !== null && out === null && crashed === null;
    const heat = driving ? heatOf(m) : 0;

    const tier = out ? winTier(out.m) : 0;
    // The whole stage shakes: a little with nitro, more in the danger zone, hard in the crash.
    let shake = out ? CasinoPage.jolt(out.age, tier, reduceMotion) : v(0, 0);
    if (!reduceMotion && run) {
      const age = run.age;
      if (driving && heat >= 2) shake = mul(v(Math.sin(age * 61), Math.cos(age * 53)), heat === 3 ? 3.5 : 1.5);
      if (blast !== null && blast < 0.4) shake = mul(v(Math.sin(blast * 70), Math.cos(blast * 55) * 0.5), 8 * (1 - blast / 0.4));
    }
    const s = R.offset(stage, shake);
    ShopPage.panel(list, s, 'card', enter);
    if (driving && heat >= 2 && !reduceMotion) CasinoPage.edgeGlow(list, HEAT[heat], (heat === 3 ? 0.9 : 0.55) * (0.75 + 0.25 * Math.sin(run!.age * (heat === 3 ? 14 : 7))));

    // Clear of the line under the multiplier, and room left of it for the scale beside the car.
    const plot = R.make(s.minX + 60, s.minY + 98, s.maxX - 22, s.maxY - 22);
    const reach = now + ghost;
    const xMax = Math.max(6, reach * 1.15);
    const top = out && out.clutch !== null ? run!.point : m;
    const yMax = Math.max(2, 1 + (top - 1) * 1.2);
    const at = (time: number): Vec2 => {
      const mm = Math.exp(cfg.crashRate * time);
      return v(plot.minX + (time / xMax) * R.width(plot), plot.maxY - ((mm - 1) / (yMax - 1)) * R.height(plot));
    };
    // The car rides the head of the curve.
    const carTime = now + ghost;
    const head = at(carTime);
    // The camera leans in towards the car as the drive heats up (up to 8 % at 10×) and lets go
    // once the drive is over. The lines, the curve and the car lean; the scale's labels keep
    // their column and only follow the lines up and down.
    let lean = 1;
    if (run && !reduceMotion) {
      const heatUp = Ease.clamp01(Math.log(Math.max(1, m)) / Math.log(10));
      const over = out ? out.age : crashed;
      lean = 1 + 0.08 * heatUp * (over === null ? 1 : 1 - Ease.outCubic(Ease.clamp01(over / 0.3)));
    }
    const saved = list.clip;
    list.clip = s;
    const leanFrom = list.items.length;
    // The scale: faint lines at round multipliers, from the top down, never crowded.
    const labels: [string, number][] = [];
    let lastY = -Infinity;
    for (const g of [100, 50, 20, 10, 5, 3, 2, 1.5, 1]) {
      if (g > yMax) continue;
      const y = plot.maxY - ((g - 1) / (yMax - 1)) * R.height(plot);
      if (y - lastY < 18 && g !== 1) continue;
      if (g === 1 && y - lastY < 18) continue;
      lastY = y;
      list.s(line(v(plot.minX, y), v(plot.maxX, y), 1), 'marking', 0.35 * enter);
      labels.push([S.casino.times(g), head.y + (y - head.y) * lean]);
    }
    const color: ColorToken = crashed !== null ? 'destructive' : out ? 'accent' : HEAT[heat];
    if (run && now > 0) {
      const steps = 48;
      const points: Vec2[] = [];
      for (let i = 0; i <= steps; i++) points.push(at((now * i) / steps));
      list.s(polygon([...points, v(points[points.length - 1].x, plot.maxY), v(plot.minX, plot.maxY)]), color, 0.1 * enter);
      for (let i = 1; i < points.length; i++) list.s(line(points[i - 1], points[i], 3), color, enter);
      // The drive the player got out of, on to where it crashed.
      if (ghost > 0) {
        for (let i = 1; i <= 8; i++) list.s(line(at(now + (ghost * (i - 1)) / 8), at(now + (ghost * i) / 8), 2), 'destructive', 0.55 * enter);
      }
    }

    const back = run && carTime > 0.05 ? at(Math.max(0, carTime - 0.15)) : v(head.x - 10, head.y);
    let heading = Math.atan2(-(head.y - back.y), head.x - back.x);
    const dir = v(Math.cos(heading), -Math.sin(heading));
    let opacity = enter;
    let carAt = head;
    if (driving && !reduceMotion) {
      // Speed lines stream past from 2×, more and longer with the heat.
      if (heat >= 1) {
        const count = 4 + 4 * heat;
        for (let i = 0; i < count; i++) {
          const run0 = (run!.age * (320 + 120 * heat) + unit(i, 31) * 240) % 240;
          const offset = (unit(i, 32) - 0.5) * 46;
          const from = add(head, add(mul(dir, -24 - run0), v(-dir.y * offset, dir.x * offset)));
          list.s(line(from, add(from, mul(dir, -(12 + 10 * heat))), 1.5), heat >= 3 ? 'destructive' : 'primary', 0.35 * (1 - run0 / 240) * enter);
        }
      }
      // Nitro from 5×: flames out of the exhaust, flickering.
      if (heat >= 2) {
        const flicker = 0.7 + 0.3 * Math.sin(run!.age * 47) * Math.cos(run!.age * 31);
        const base = add(head, mul(dir, -16));
        const side = v(-dir.y, dir.x);
        const long = (14 + 8 * (heat - 1)) * flicker;
        list.s(polygon([add(base, mul(side, 5)), add(base, mul(dir, -long)), add(base, mul(side, -5))]), 'fireOuter', 0.9 * enter);
        list.s(polygon([add(base, mul(side, 2.5)), add(base, mul(dir, -long * 0.6)), add(base, mul(side, -2.5))]), 'fireCore', enter);
      }
    }
    if (blast !== null) {
      const x = Ease.clamp01(blast / TIMES.crashSpin);
      if (!reduceMotion) {
        heading += 7 * Ease.outCubic(x);
        carAt = add(head, v(18 * Ease.outCubic(x), 10 * Ease.outCubic(x)));
      }
      CasinoPage.explosion(list, head, blast, reduceMotion, enter);
    } else if (out && out.clutch === null && !reduceMotion) {
      carAt = add(head, v(Math.min(60, out.age * 140), 0));
      heading = 0;
      opacity *= 1 - Ease.clamp01((out.age - 0.2) / 0.4);
    }
    MenuKit.glow(list, carAt, 26, blast !== null ? 'destructive' : color, (run ? 0.35 : 0.15) * opacity);
    CasinoPage.vehicle(list, 'sportsCar', null, carAt, 30, heading, opacity * (blast !== null ? 0.85 : 1));
    if (lean > 1.001) for (let i = leanFrom; i < list.items.length; i++) list.items[i] = zoomed(list.items[i], head, lean);
    list.clip = saved;
    for (const [label, y] of labels) {
      if (y > s.minY + 8 && y < s.maxY - 8) drawText(list, label, v(plot.minX - 18, y), 10, 'muted', { align: 'trailing', opacity: 0.8 * enter });
    }

    // Warning lights in the danger zone.
    if (driving && heat === 3 && !reduceMotion) {
      const blink = Math.sin(run!.age * 18) > 0 ? 1 : 0.15;
      for (const x of [s.minX + 18, s.maxX - 18]) {
        MenuKit.glow(list, v(x, s.minY + 18), 22, 'destructive', 0.5 * blink * enter);
        list.s(circle(v(x, s.minY + 18), 5), 'destructive', blink * enter);
      }
    }

    // The multiplier: it pulses with every tenth from 2×, lands at 2×, 5×, 10×…, and jumps big in the danger zone.
    const big = v(R.center(s).x, s.minY + 40);
    let pop = 1;
    if (run && !reduceMotion) {
      const passed = [2, 5, 10, 25, 50].filter((g) => g <= m);
      const last = passed[passed.length - 1];
      if (last && driving) pop = land((run.age - Casino.timeOf(last, cfg)) / 0.35, heat === 3 ? 0.4 : 0.22);
      if (driving && heat >= 1) pop *= 1 + (0.03 + 0.02 * heat) * (1 - ((m * 10) % 1)) ** 3;
      if (out) pop = land(out.age / 0.4, 0.25);
      if (crashed !== null) pop = land((blast ?? 0) / 0.4, 0.35);
    }
    const size = driving && heat === 3 ? 54 : 40;
    drawText(list, S.casino.times(m), big, size * pop, run ? color : 'muted', { weight: 'bold', align: 'center', opacity: enter });
    const line2 = v(big.x, s.minY + 72);
    if (!run) drawText(list, S.casino.crashHint, line2, 12, 'muted', { align: 'center', opacity: enter });
    else if (out) {
      // The win counts up from the stake, as the coins leave for the money chip.
      const counted = reduceMotion ? out.win : Math.floor(run.stake + (out.win - run.stake) * Ease.outCubic(Ease.clamp01(out.age / 0.6)));
      drawText(list, S.casino.cashedOut(money(Fmt.number(counted))), line2, 13, 'accent', { weight: 'bold', align: 'center', opacity: enter * Ease.outCubic(out.age / 0.2) });
    }
    else if (crashed !== null) drawText(list, S.casino.crashed, line2, 13, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
    else drawText(list, heat === 3 ? S.casino.dangerZone : S.casino.riding(money(Fmt.number(Math.floor(run.stake * m)))), line2, 12, heat === 3 ? 'destructive' : 'muted', { weight: heat === 3 ? 'bold' : 'regular', align: 'center', opacity: enter });

    // Got out just in time: a stamp slams onto the stage.
    if (out && out.clutch !== null) CasinoPage.clutchStamp(list, v(R.center(s).x, s.maxY - 64), out.age, out.clutch, reduceMotion, enter);
    if (out) CasinoPage.celebrate(list, big, out.age, tier, 'accent', reduceMotion);
    // The crash flashes the whole display red (after the freeze), briefly.
    if (crashed !== null && !reduceMotion) {
      const f = blast ?? 0;
      if (f < 0.28) list.s(rect(mul(vp, 0.5), vp), 'destructive', (boom! < TIMES.hitstop ? 0.55 : 0.4) * (1 - f / 0.28));
    }
  },

  /** A small explosion: a fireball in three layers, a shockwave, smoke and flying debris. */
  explosion(list: RenderList, at: Vec2, age: number, reduceMotion: boolean, opacity: number): void {
    if (reduceMotion) {
      if (age < 0.5) list.s(circle(at, 22), 'fireOuter', 0.6 * (1 - age / 0.5) * opacity);
      return;
    }
    const x = Ease.clamp01(age / 0.55);
    if (x < 1) {
      const grow = Ease.outCubic(x);
      list.s(circle(at, 12 + 46 * grow), 'fireDeep', 0.85 * (1 - x) * opacity);
      list.s(circle(at, 9 + 34 * grow), 'fireOuter', 0.95 * (1 - x) * opacity);
      list.s(circle(at, 6 + 18 * grow), 'fireCore', (1 - x) * opacity);
      list.s(arc(at, 16 + 58 * grow, 4 * (1 - x) + 1, 0, TAU), 'primary', 0.6 * (1 - x) * opacity);
    }
    for (let i = 0; i < 8; i++) {
      const puff = Ease.clamp01((age - 0.15 - i * 0.05) / 1.1);
      if (puff <= 0 || puff >= 1) continue;
      list.s(circle(add(at, v((unit(i, 41) - 0.5) * 40 * puff, -34 * puff)), 8 + 16 * puff), 'smoke', 0.4 * (1 - puff) * opacity);
    }
    for (let i = 0; i < 16; i++) {
      const life = 1.1;
      if (age >= life) break;
      const a = -Math.PI / 2 + (unit(i, 42) - 0.5) * 3.6;
      const speed = 120 + 180 * unit(i, 43);
      const p = v(at.x + Math.cos(a) * speed * age, at.y + Math.sin(a) * speed * age + 420 * age * age);
      const piece: ColorToken = i % 3 === 0 ? 'vehicleSports' : i % 3 === 1 ? 'wreck' : 'spark';
      list.s(rect(p, v(4 + 5 * unit(i, 44), 2 + 3 * unit(i, 45)), 0.5, (unit(i, 46) - 0.5) * 20 * age), piece, (1 - age / life) * opacity);
    }
  },

  /** "Clutch cash-out": a rotated stamp that slams down, then how close it was. */
  clutchStamp(list: RenderList, center: Vec2, age: number, margin: number, reduceMotion: boolean, opacity: number): void {
    const slam = reduceMotion ? 1 : Ease.clamp01(age / 0.18);
    const scale = reduceMotion ? 1 : 1 + 0.6 * (1 - slam) + (slam >= 1 ? 0.08 * (1 - Ease.spring((age - 0.18) / 0.35)) : 0);
    const fade = reduceMotion ? 1 : Ease.clamp01(age / 0.1);
    const size = v(236 * scale, 46 * scale);
    list.s(rect(center, add(size, v(6, 6)), 10, -0.08), 'hazard', 0.95 * fade * opacity);
    list.s(rect(center, size, 8, -0.08), 'card', fade * opacity);
    drawText(list, S.casino.clutch, add(center, v(0, -6 * scale)), 18 * scale, 'hazard', { weight: 'bold', align: 'center', opacity: fade * opacity });
    drawText(list, S.casino.clutchSaved(margin.toFixed(2)), add(center, v(0, 13 * scale)), 11 * scale, 'primary', { weight: 'bold', align: 'center', opacity: fade * opacity });
  },

  /** The display's edge glows in `color`, for the hottest moments of a drive. */
  edgeGlow(list: RenderList, color: ColorToken, intensity: number): void {
    const vp = list.camera.viewport;
    for (let k = 0; k < 8; k++) {
      const inset = k * 3 + 1;
      const o = 0.22 * intensity * (1 - k / 8);
      list.s(line(v(0, inset), v(vp.x, inset), 3), color, o);
      list.s(line(v(0, vp.y - inset), v(vp.x, vp.y - inset), 3), color, o);
      list.s(line(v(inset, 0), v(inset, vp.y), 3), color, o);
      list.s(line(v(vp.x - inset, 0), v(vp.x - inset, vp.y), 3), color, o);
    }
  },

  // MARK: Slots

  addSlots(list: RenderList, stage: Rect, state: CasinoState, run: Extract<CasinoRun, { k: 'slots' }> | null, reduceMotion: boolean, enter: number): void {
    const cfg = baseConfig;
    const n = cfg.slotStrip.length;
    const done = !run || run.age >= slotEnd(run);
    const win = run && done && run.spin.win > 0 ? run.spin : null;
    const since = run ? run.age - slotEnd(run) : 0;
    const tier = win ? winTier(win.pay) : 0;
    stage = R.offset(stage, CasinoPage.jolt(since, tier, reduceMotion));
    ShopPage.panel(list, stage, 'card', enter);
    const g = 10;
    const pad = 16;
    const reelW = (R.width(stage) - 2 * pad - 2 * g) / 3;
    // Rows as tall as a reel is wide at most; the reels and the win line under them sit centred.
    const reelH = Math.min(R.height(stage) - 86, reelW * 3 * 0.92);
    const top = stage.minY + Math.max(16, (R.height(stage) - reelH - 70) / 2);
    const rh = reelH / 3;
    const midY = top + reelH / 2;
    const glowOn = win && !reduceMotion ? 0.5 + 0.5 * Math.sin(run!.age * 7) : 1;
    // Reels 1 and 2 alike: the rest of the screen dims and they glow gold while reel 3 creeps in.
    const holding = run !== null && run.anticipate && run.age >= TIMES.reelStops[1];
    const focus = holding && !reduceMotion ? Ease.clamp01((run!.age - TIMES.reelStops[1]) / 0.25) * (1 - Ease.clamp01((run!.age - slotEnd(run!)) / 0.35)) : 0;
    if (focus > 0) {
      const vp = list.camera.viewport;
      const dim = 0.55 * focus;
      list.s(rect(v(vp.x / 2, stage.minY / 2), v(vp.x, stage.minY)), 'background', dim);
      list.s(rect(v(vp.x / 2, (stage.maxY + vp.y) / 2), v(vp.x, vp.y - stage.maxY)), 'background', dim);
      list.s(rect(v(stage.minX / 2, R.center(stage).y), v(stage.minX, R.height(stage))), 'background', dim);
      list.s(rect(v((stage.maxX + vp.x) / 2, R.center(stage).y), v(vp.x - stage.maxX, R.height(stage))), 'background', dim);
    }
    for (let i = 0; i < 3; i++) {
      const x = stage.minX + pad + i * (reelW + g);
      const reel = R.make(x, top, x + reelW, top + reelH);
      if (focus > 0 && i < 2) MenuKit.glow(list, R.center(reel), reelW * 0.9, 'coin', 0.35 * focus * (0.8 + 0.2 * Math.sin(run!.age * 9)));
      list.s(rect(R.center(reel), v(reelW, reelH), 12), 'background', 0.55 * enter);
      // Where the strip stands: the stop at the line, spun there from the last rest.
      let p: number = state.reels[i];
      if (run) {
        const stop = reelStop(run, i);
        p = reduceMotion ? run.spin.stops[i] : reelAt(run, i, n);
        // Klack: the reel runs a little past its stop and snaps back.
        if (!reduceMotion && run.age >= stop && run.age < stop + TIMES.bounce) p = run.spin.stops[i] + TIMES.overshoot * Math.sin(((run.age - stop) / TIMES.bounce) * Math.PI);
      }
      // How fast the strip runs (rows a second): a fast reel smears its symbols along the strip.
      let blur = 0;
      if (run && !reduceMotion && run.age < reelStop(run, i)) {
        const speed = Math.abs(p - reelAt({ ...run, age: Math.max(0, run.age - 1 / 60) }, i, n)) * 60;
        blur = Ease.clamp01((speed - 4) / 14);
      }
      const order = win ? CasinoPage.winningReels(win).indexOf(i) : -1;
      const winning = order >= 0;
      const saved = list.clip;
      list.clip = reel;
      const base = Math.floor(p);
      for (let k = -2; k <= 2; k++) {
        const j = base + k;
        const y = midY + (p - j) * rh;
        const sym = cfg.slotStrip[((j % n) + n) % n];
        const onLine = Math.abs(y - midY) < rh / 2;
        const lit = (onLine && winning) || (onLine && focus > 0 && i < 2);
        const dim = done && !onLine ? 0.4 : 1;
        // A winning symbol hops once, left to right: flat on take-off, long in the air, flat on landing.
        let at = v(R.center(reel).x, y);
        let squash = 0;
        if (onLine && winning && !reduceMotion) {
          const x = (since - 0.07 * order) / 0.32;
          if (x > 0 && x < 1) {
            at = add(at, v(0, -10 * Math.sin(Math.PI * x)));
            squash = 0.7 * Math.cos(2 * Math.PI * x) * Math.sin(Math.PI * x);
          }
        }
        CasinoPage.symbol(list, sym, at, Math.min(reelW, rh) * 0.86, enter * dim, lit ? (winning ? glowOn : focus) : 0, winning ? null : 'coin', blur, squash);
      }
      list.clip = saved;
    }
    // No win: the reels go dark for a blink, nothing more.
    if (run && done && !win && !reduceMotion && since < 0.35) {
      const dark = 0.35 * Ease.clamp01(since / 0.06) * (1 - Ease.clamp01((since - 0.15) / 0.2));
      list.s(rect(v(R.center(stage).x, midY), v(R.width(stage) - 2 * pad + 4, reelH + 4), 13), 'background', dark * enter);
    }
    // The line: it draws itself in the win colour, left to right, when it pays.
    const lineY = midY;
    const left = stage.minX + pad - 6;
    const right = stage.maxX - pad + 6;
    const drawn = win ? (reduceMotion ? 1 : Ease.outCubic(Ease.clamp01(since / 0.3))) : 0;
    for (const y of [lineY - rh / 2, lineY + rh / 2]) {
      list.s(line(v(left, y), v(right, y), 1.5), 'marking', 0.5 * enter);
      if (drawn > 0) list.s(line(v(left, y), v(left + (right - left) * drawn, y), 1.5), 'accent', 0.9 * enter);
    }
    const under = v(R.center(stage).x, top + reelH + 30);
    if (win && run) {
      const triple = win.rule === 'triple';
      const center = v(R.center(stage).x, midY);
      CasinoPage.celebrate(list, center, since, tier, 'coin', reduceMotion);
      // Three alike: a fountain of coins out of the reels, and the win counts up ding by ding.
      if (triple && !reduceMotion) CasinoPage.coinFountain(list, center, since, win.pay >= 40 ? 1.6 : 1);
      const counted = triple && !reduceMotion ? Math.floor(win.win * Ease.outCubic(since / TIMES.countUp)) : win.win;
      const pop = reduceMotion ? 1 : triple && since < TIMES.countUp ? 1 + 0.06 * (1 - ((since / TIMES.ding) % 1)) : land((since - (triple ? TIMES.countUp : 0)) / 0.4, 0.3);
      drawText(list, `+${money(Fmt.number(counted))}`, under, (triple ? 30 : 24) * pop, triple ? 'coin' : 'accent', { weight: 'bold', align: 'center', opacity: enter });
      drawText(list, S.casino.slotRule(win.rule, win.pay, win.line), v(under.x, under.y + (triple ? 26 : 22)), 12, 'muted', { align: 'center', opacity: enter });
    } else if (run && done) drawText(list, S.casino.noWin, under, 13, 'muted', { align: 'center', opacity: enter * (reduceMotion ? 1 : Ease.outCubic(since / 0.2)) });
    else if (!run) drawText(list, S.casino.slotsHint, under, 12, 'muted', { align: 'center', opacity: enter });
  },

  winningReels(spin: SlotSpin): number[] {
    if (spin.rule === 'triple') return [0, 1, 2];
    if (spin.rule === 'pair') return [0, 1];
    if (spin.rule === 'bossPair') return [0, 1, 2].filter((i) => spin.line[i] === 'boss');
    return [];
  },

  /** Coins spray out of the reels for a while, spinning and falling back. */
  coinFountain(list: RenderList, center: Vec2, since: number, power: number): void {
    const count = Math.floor(36 * power);
    for (let i = 0; i < count; i++) {
      const tt = since - unit(i, 51) * 1.1;
      if (tt <= 0 || tt >= 1.5) continue;
      const vx = (unit(i, 52) - 0.5) * 300;
      const vy = -(300 + 260 * unit(i, 53));
      const p = v(center.x + vx * tt, center.y + vy * tt + 720 * tt * tt);
      const spin = Math.abs(Math.cos(tt * (8 + 6 * unit(i, 54)) + i));
      const fade = 1 - Ease.clamp01((tt - 1.1) / 0.4);
      const r = 6 + 2 * unit(i, 55);
      list.s(rect(p, v(2 * r * Math.max(0.15, spin), 2 * r), r * Math.max(0.15, spin)), 'coin', fade);
      if (spin > 0.5) list.s(rect(p, v(r * spin, r), r * 0.5 * spin), 'rarityLegendary', 0.8 * fade);
    }
  },

  /**
   * A slot symbol: a tile in the vehicle's tint with the vehicle on it. The boss wears its gold.
   * `blur` 0…1 smears it along a spinning reel (the vehicle fades out of the streak); `squash`
   * −1…1 makes the tile wide and flat (> 0) or long (< 0), for a hop.
   */
  symbol(list: RenderList, sym: SlotSymbol, center: Vec2, size: number, opacity: number, lit: number, glow: ColorToken | null = null, blur = 0, squash = 0): void {
    const s = SYMBOL[sym];
    const tile = v(size * (1 + 0.12 * squash), size * (1 - 0.12 * squash));
    if (blur > 0) list.s(rect(center, v(size * 0.9, size * (1 + 1.6 * blur)), 12), s.tint, 0.3 * blur * opacity);
    const solid = opacity * (1 - 0.55 * blur);
    if (lit > 0) list.s(rect(center, add(tile, v(6, 6)), 14), glow ?? s.tint, (glow ? 0.85 : 0.55) * lit * solid);
    list.s(rect(center, tile, 12), 'cardRaised', solid);
    list.s(rect(center, tile, 12), s.tint, 0.16 * solid);
    if (blur > 0.8) return;
    const art = solid * (1 - Ease.clamp01((blur - 0.4) / 0.4));
    if (sym === 'boss') list.s(arc(center, size * 0.4, 2, 0, TAU), 'coin', 0.8 * art);
    CasinoPage.vehicle(list, s.type, sym === 'boss' ? SYNDICATE_BOSS : null, center, size * 0.72, Math.PI / 2 - 0.5, art);
  },

  /** A vehicle drawn with the game's own art, `length` points long, turned to `heading` (world, y up). */
  vehicle(list: RenderList, type: VehicleType, look: typeof SYNDICATE_BOSS | null, center: Vec2, length: number, heading: number, opacity: number): void {
    const c = baseConfig;
    const long = type === 'ambulance' ? c.ambulanceLength : type === 'transporter' ? c.carLength * 1.3 : c.carLength;
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: length / long }, list.background);
    CarArt.add(preview, { id: 5, type, pose: { position: v(0, 0), heading }, dents: [], skin: look?.paint ?? null, stripe: look?.stripe ?? null, roof: look?.roof ?? null, finish: null, finishTime: null }, c);
    for (const it of preview.items) list.items.push({ ...pinned(it, preview.camera, opacity), clip: list.clip });
  },

  // MARK: Roundabout Roulette

  /**
   * A roundabout seen from above with one tile per exit, tinted by the vehicle type it leads to.
   * The bet's exits stay lit. The car circles fast, clicks past every exit (its tile pops) and
   * eases onto the drawn one, turns in and arrives; a win lights that exit and showers coins.
   */
  addRoulette(list: RenderList, stage: Rect, state: CasinoState, run: RouletteRun | null, reduceMotion: boolean, enter: number): void {
    const cfg = baseConfig;
    const n = cfg.slotStrip.length;
    const done = run !== null && run.age >= rouletteEnd;
    const since = run ? run.age - rouletteEnd : 0;
    const spin = run?.spin ?? null;
    const won = done && spin !== null && spin.won;
    const tier = won ? winTier(spin.pay) : 0;
    stage = R.offset(stage, CasinoPage.jolt(since, tier, reduceMotion));
    ShopPage.panel(list, stage, 'card', enter);
    // The wheel (its tiles stand 14 outside the radius) fits above the line under it, on a short stage too.
    const room = 46;
    const center = v(R.center(stage).x, stage.minY + (R.height(stage) - room) / 2 + 2);
    const base = Math.min(R.width(stage) * 0.3, 70);
    // The tiles reach 47 beyond the radius; on a short stage everything of the wheel shrinks together.
    const shrink = Math.min(1, (R.height(stage) - room - 8) / 2 / (base + 47));
    const radius = base * shrink;
    const u = shrink;
    const top = -Math.PI / 2;
    // After a round the old result stays up; a new pick takes over the lit exits and the island.
    const repicked = done && spin !== null && state.bet !== spin.bet;
    const bet = spin && !repicked ? spin.bet : state.bet;
    const at =(a: number, d: number): Vec2 => add(center, mul(fromAngle(a), d));
    const age = run ? (reduceMotion ? rouletteEnd : run.age) : 0;
    const driveAge = Math.min(age, TIMES.rouletteDrive);
    const turn = run ? rouletteTurn(run, driveAge) : 0;
    const angle = top + turn * TAU;
    const passed = turn * n;
    const lastExit = Math.floor(passed) % n;
    const frac = passed - Math.floor(passed);

    list.s(arc(center, radius, 28 * u, 0, TAU), 'background', 0.55 * enter);
    for (let k = 0; k < 40; k++) list.s(circle(at(top + (k / 40) * TAU, radius), 1.3), 'marking', 0.6 * enter);

    for (let i = 0; i < n; i++) {
      const sym = cfg.slotStrip[i];
      const tint = SYMBOL[sym].tint;
      const a = top + (i / n) * TAU;
      const mine = sym === bet;
      const hit = done && spin !== null && i === spin.exit;
      let pop = 1;
      if (run && !done && !reduceMotion && passed > 0 && i === lastExit) pop += 0.35 * (1 - frac) ** 2;
      if (hit) pop += 0.35 * (reduceMotion ? 1 : Ease.spring(Ease.clamp01(since / 0.45)));
      const o = enter * (done ? (hit || (repicked && mine) ? 1 : 0.28) : mine ? 1 : 0.5);
      list.s(line(at(a, radius + 14 * u), at(a, radius + 22 * u), 7 * u), 'marking', 0.5 * o);
      const tile = at(a, radius + 32 * u);
      if (hit && !reduceMotion) MenuKit.glow(list, tile, 30 * u, won ? 'accent' : tint, (won ? 0.7 : 0.45) * enter * (0.8 + 0.2 * Math.sin(since * 9)));
      if (mine && (!done || repicked)) list.s(rect(tile, v(25 * u * pop, 25 * u * pop), 8 * u), 'primary', 0.9 * o);
      if (hit && won) list.s(rect(tile, v(26 * u * pop, 26 * u * pop), 8 * u), 'accent', enter);
      list.s(rect(tile, v(20 * u * pop, 20 * u * pop), 6 * u), tint, o);
    }

    // The car: round the ring, then in to its exit, turning from the road into the arm.
    const tangent = (a: number): number => Math.atan2(-Math.cos(a), -Math.sin(a));
    const radial = (a: number): number => Math.atan2(-Math.sin(a), Math.cos(a));
    const leave = run && !reduceMotion ? Ease.clamp01((age - TIMES.rouletteDrive) / TIMES.rouletteLeave) : done ? 1 : 0;
    let heading = tangent(angle);
    if (leave > 0) {
      const d = ((radial(angle) - heading + 3 * Math.PI) % TAU) - Math.PI;
      heading += d * Ease.clamp01(leave * 3);
    }
    const carAt = at(angle, radius + 32 * u * Ease.inOutSine(leave));
    const carOpacity = enter * (1 - Ease.clamp01((leave - 0.6) / 0.4));
    if (run && !done && !reduceMotion) {
      const speed = (rouletteTurn(run, driveAge) - rouletteTurn(run, Math.max(0, driveAge - 1 / 60))) * 60;
      const trail = Ease.clamp01(speed / 1.1);
      if (trail > 0) list.s(arc(center, radius, 6, angle - 0.55 * trail, angle), 'primary', 0.22 * trail * enter);
      for (let k = 1; k <= 6; k++) {
        const back = top + rouletteTurn(run, Math.max(0, driveAge - k * 0.028)) * TAU;
        list.s(circle(at(back, radius), 5 * (1 - k / 7)), 'primary', 0.3 * trail * (1 - k / 7) * enter);
      }
    }
    if (carOpacity > 0) {
      MenuKit.glow(list, carAt, 22 * u, 'primary', 0.28 * carOpacity);
      CasinoPage.vehicle(list, SYMBOL[bet].type, bet === 'boss' ? SYNDICATE_BOSS : null, carAt, 30 * u, heading, carOpacity);
    }

    // The island: the bet and what it pays; a win counts up here.
    list.s(circle(center, radius - 20 * u), 'cardRaised', enter);
    const pay = Casino.roulettePay(bet, cfg);
    CasinoPage.symbol(list, bet, v(center.x, center.y - 7), Math.min(radius * 0.7, 46), enter * (done && !won && !repicked ? 0.5 : 1), 0);
    drawText(list, `${pay.toFixed(2)}×`, v(center.x, center.y + Math.min(radius * 0.42, 32)), 13, 'primary', { weight: 'bold', align: 'center', opacity: enter });

    const under = v(R.center(stage).x, stage.maxY - 40);
    if (spin && done) {
      if (won) {
        CasinoPage.celebrate(list, center, since, tier, 'accent', reduceMotion);
        if (tier >= 2 && !reduceMotion) CasinoPage.coinFountain(list, center, since, tier >= 3 ? 1.4 : 0.8);
        const counted = reduceMotion ? spin.win : Math.floor(spin.win * Ease.outCubic(Ease.clamp01(since / 0.6)));
        const pop = reduceMotion ? 1 : land(since / 0.4, 0.3);
        drawText(list, `+${money(Fmt.number(counted))}`, under, 26 * pop, 'accent', { weight: 'bold', align: 'center', opacity: enter });
        drawText(list, S.casino.rouletteWin(S.casino.symbol(spin.symbol), spin.pay), v(under.x, under.y + 24), 12, 'muted', { align: 'center', opacity: enter });
      } else drawText(list, S.casino.rouletteLose(S.casino.symbol(spin.symbol)), under, 13, 'muted', { align: 'center', opacity: enter * (reduceMotion ? 1 : Ease.outCubic(since / 0.25)) });
    } else if (!run) drawFitted(list, S.casino.rouletteHint, under, 12, R.width(stage) - 24, 'muted', { align: 'center', opacity: enter });
  },

  // MARK: Scratch Card

  /**
   * The card: nine foil cells. Each is scratched clear in turn (the foil wipes away with a few
   * scratch marks and flakes, the number lands with a pop); three alike hop, glow and pay.
   */
  addScratch(list: RenderList, stage: Rect, career: Career, run: Extract<CasinoRun, { k: 'scratch' }> | null, reduceMotion: boolean, enter: number): void {
    const card = run?.card ?? null;
    const done = run !== null && run.age >= scratchEnd;
    const since = run ? run.age - scratchEnd : 0;
    const won = done && card !== null && card.win > 0;
    const tier = won ? winTier(card.x) : 0;
    stage = R.offset(stage, CasinoPage.jolt(since, tier, reduceMotion));
    ShopPage.panel(list, stage, 'card', enter);
    const room = 64;
    const side = Math.max(120, Math.min(R.width(stage) - 36, R.height(stage) - room - 16, 290));
    const c = v(R.center(stage).x, stage.minY + 10 + (R.height(stage) - room - 10) / 2);
    const w = side;
    const h = side * 1.04;
    const body = R.make(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2);
    list.s(rect(c, v(w + 5, h + 5), 15), won ? 'accent' : 'coin', enter * (won ? 0.5 + 0.5 * (reduceMotion ? 1 : 0.5 + 0.5 * Math.sin(since * 8)) : 0.9));
    list.s(rect(c, v(w, h), 13), 'cardRaised', enter);
    list.s(rect(v(c.x, body.minY + 17), v(w - 10, 26), 9), 'coin', 0.16 * enter);
    drawText(list, S.casino.scratchTitle, v(c.x, body.minY + 17), 13, 'coin', { weight: 'bold', align: 'center', opacity: enter });

    const pad = 12;
    const gap = 6;
    const cell = Math.min((w - 2 * pad - 2 * gap) / 3, (h - 40 - pad - 2 * gap) / 3);
    const gx = c.x - (3 * cell + 2 * gap) / 2;
    const gy = body.minY + 36 + (h - 36 - pad - (3 * cell + 2 * gap)) / 2;
    const order = card ? [...card.cells.keys()].filter((i) => card.cells[i] === card.x && card.x > 0) : [];
    for (let i = 0; i < 9; i++) {
      const x0 = gx + (i % 3) * (cell + gap);
      const y0 = gy + Math.floor(i / 3) * (cell + gap);
      const r = R.make(x0, y0, x0 + cell, y0 + cell);
      const cc = R.center(r);
      const wipe = run ? (reduceMotion ? 1 : Ease.clamp01((run.age - scratchAt(i)) / TIMES.scratchWipe)) : 0;
      list.s(rect(cc, v(cell, cell), 9), 'background', 0.6 * enter);
      if (run && card && wipe > 0) {
        const value = card.cells[i];
        const winning = won && value === card.x;
        const rank = order.indexOf(i);
        const dim = done ? (winning ? 1 : won ? 0.3 : 0.7) : 1;
        let at = cc;
        let squash = 0;
        if (winning && !reduceMotion) {
          const x = (since - 0.08 * rank) / 0.34;
          if (x > 0 && x < 1) {
            at = add(at, v(0, -11 * Math.sin(Math.PI * x)));
            squash = 0.5 * Math.cos(2 * Math.PI * x) * Math.sin(Math.PI * x);
          }
        }
        if (winning) MenuKit.glow(list, at, cell * 0.8, 'accent', 0.6 * enter * (reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(since * 9 + rank)));
        const pop = reduceMotion ? 1 : land((run.age - scratchAt(i) - TIMES.scratchWipe * 0.45) / 0.3, 0.28);
        const color: ColorToken = value >= 100 ? 'coin' : value >= 10 ? 'accent' : 'primary';
        list.s(rect(at, v(cell * (1 + 0.1 * squash), cell * (1 - 0.1 * squash)), 9), 'cardRaised', enter * dim);
        drawText(list, `${value}×`, at, ShopPage.fitted(`${value}×`, cell * 0.36, cell - 8) * pop, color, { weight: 'bold', align: 'center', opacity: enter * dim });
      }
      if (wipe < 1) {
        // The foil: what is left of it, with its shine; scratch marks and flakes at the wiped edge.
        const edge = x0 + wipe * cell;
        const left = R.make(edge, y0, x0 + cell, y0 + cell);
        const saved = list.clip;
        list.clip = left;
        list.s(rect(cc, v(cell, cell), 9), 'muted', 0.95 * enter);
        list.s(line(v(x0 - 4, y0 + cell * 0.8), v(x0 + cell * 0.8, y0 - 4), 5), 'primary', 0.16 * enter);
        list.s(line(v(x0 + cell * 0.3, y0 + cell + 4), v(x0 + cell + 4, y0 + cell * 0.3), 3), 'primary', 0.12 * enter);
        list.clip = saved;
        if (wipe > 0 && !reduceMotion) {
          for (let k = 0; k < 3; k++) {
            const y = y0 + cell * (0.2 + 0.3 * k);
            list.s(line(v(edge - 4, y + 5), v(edge + 6, y - 5), 2), 'primary', 0.55 * (1 - wipe) * enter);
          }
          for (let k = 0; k < 6; k++) {
            const t = wipe * (0.6 + 0.8 * unit(i * 7 + k, 81));
            const p = v(edge + (unit(i * 7 + k, 82) - 0.2) * 16, y0 + cell * unit(i * 7 + k, 83) + 70 * t * t);
            list.s(rect(p, v(4 + 3 * unit(k, 84), 3), 1, unit(k, 85) * 3 + t * 6), 'muted', (1 - wipe) * 0.9 * enter);
          }
        }
      }
    }

    const under = v(c.x, stage.maxY - 40);
    if (card && done) {
      if (won) {
        CasinoPage.celebrate(list, c, since, tier, 'coin', reduceMotion);
        if (tier >= 2 && !reduceMotion) CasinoPage.coinFountain(list, c, since, tier >= 3 ? 1.5 : 0.8);
        const counted = reduceMotion ? card.win : Math.floor(card.win * Ease.outCubic(Ease.clamp01(since / 0.6)));
        const pop = reduceMotion ? 1 : land(since / 0.4, 0.3);
        drawText(list, `+${money(Fmt.number(counted))}`, under, 26 * pop, 'coin', { weight: 'bold', align: 'center', opacity: enter });
        drawText(list, S.casino.cardWon(card.x), v(under.x, under.y + 24), 12, 'muted', { align: 'center', opacity: enter });
      } else drawText(list, S.casino.cardLost, under, 13, 'muted', { align: 'center', opacity: enter * (reduceMotion ? 1 : Ease.outCubic(since / 0.25)) });
    } else if (!run) {
      drawText(list, S.casino.scratchHand(career.scratchCards), under, 14, career.scratchCards > 0 ? 'coin' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      drawText(list, S.casino.scratchHint, v(under.x, under.y + 22), 11, 'muted', { align: 'center', opacity: enter });
    }
  },

  // MARK: Skin Upgrade

  addUpgrade(list: RenderList, stage: Rect, state: CasinoState, run: Extract<CasinoRun, { k: 'upgrade' }> | null, waitingBoost: boolean, reduceMotion: boolean, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const slots = CasinoPage.slots(stage);
    const dialBottom = slots[0].minY - 26;
    // Centred in the room above the slots, with space outside for the pegs and the pointer's tip.
    const radius = Math.max(30, Math.min(R.width(stage) * 0.3, (dialBottom - stage.minY) / 2 - 30));
    const center = v(R.center(stage).x, (stage.minY + dialBottom) / 2);
    const staked = run ? run.roll.staked : state.staked;
    const stakeValue = staked.reduce((sum, id) => sum + Casino.value(cosmetic(id)?.rarity ?? 'common', baseConfig), 0);
    const target = run ? run.roll.target : state.target;
    const boosted = run ? run.roll.boosted : waitingBoost;
    const chance = run ? run.roll.chance : target ? Casino.upgradeChance(staked, target, baseConfig, boosted) : 0;
    const end = run ? needleTime(run.roll) : 0;
    const done = run !== null && run.age >= end;
    const since = run ? run.age - end : 0;
    const top = -Math.PI / 2;
    list.s(arc(center, radius, 14, 0, TAU), 'controlFill', enter);
    if (chance > 0) list.s(arc(center, radius, 14, top, top + chance * TAU), 'accent', (done && !run!.roll.won ? 0.4 : 0.9) * enter);
    // The pegs the needle clicks over, and the two edges of the green drawn sharp.
    for (let i = 0; i < TIMES.pegs; i++) list.s(circle(add(center, mul(fromAngle(top + (i / TIMES.pegs) * TAU), radius + 13)), 2), 'marking', enter);
    if (chance > 0 && chance < 1) {
      for (const edge of [0, chance]) list.s(line(add(center, mul(fromAngle(top + edge * TAU), radius - 9)), add(center, mul(fromAngle(top + edge * TAU), radius + 9)), 2.5), 'primary', 0.85 * enter);
    }
    // The needle: it turns a few times and creeps to where the draw says; a win lies on the green.
    let turn = run ? (reduceMotion ? TIMES.needleTurns + run.roll.roll : needleTurn(run.roll, run.age)) : 0;
    // Each peg holds the needle back for a moment: rat-tat-tat… tack… tack.
    if (run && !done && !reduceMotion) turn -= 0.004 * (1 - ((turn * TIMES.pegs) % 1)) ** 6;
    const needle = (at: number): Vec2[] => [
      add(center, mul(fromAngle(at), radius + 12)),
      add(center, mul(fromAngle(at - 0.12), radius - 16)),
      add(center, mul(fromAngle(at + 0.12), radius - 16)),
    ];
    if (run && !done && !reduceMotion) {
      // The green lights up while the needle runs over it.
      if (chance > 0 && turn % 1 < chance) list.s(arc(center, radius, 20, top, top + chance * TAU), 'accent', 0.22 * enter);
      // A fast needle leaves a short, fading trail.
      const speed = (needleTurn(run.roll, run.age) - needleTurn(run.roll, Math.max(0, run.age - 1 / 60))) * 60;
      const trail = Ease.clamp01((speed - 0.4) / 1.6);
      for (let k = 1; k <= 5 && trail > 0; k++) {
        const back = needleTurn(run.roll, Math.max(0, run.age - k * 0.022));
        list.s(polygon(needle(top + back * TAU)), 'primary', 0.16 * trail * (1 - k / 6) * enter);
      }
    }
    const a = top + turn * TAU;
    list.s(polygon(needle(a)), done ? (run!.roll.won ? 'accent' : 'destructive') : 'primary', enter);
    // The middle: the chance, then what came of it.
    const targetItem = target ? cosmetic(target) : null;
    if (done && run!.roll.won && targetItem) {
      const pop = reduceMotion ? 1 : Ease.spring(since / 0.45);
      MenuKit.glow(list, center, radius * 0.9, ShopPage.rarityColor(targetItem.rarity), 0.45 * enter);
      ShopPage.addPreview(list, targetItem, v(center.x, center.y - 10), (radius / 75) * (0.6 + 0.4 * pop), enter);
      drawText(list, S.casino.upgraded, v(center.x, center.y + radius * 0.55), 13, 'accent', { weight: 'bold', align: 'center', opacity: enter });
      // A skin won is a reveal like a chest's: confetti at least, louder the more it outgrew the stake.
      const grew = Casino.value(targetItem.rarity, baseConfig) / Math.max(1, stakeValue);
      CasinoPage.celebrate(list, center, since, Math.max(2, winTier(grew)), ShopPage.rarityColor(targetItem.rarity), reduceMotion);
    } else if (done) {
      drawText(list, S.casino.lostSkins(run!.roll.staked.length), center, 15, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
      // The stake breaks apart in the pot: shards in the colours of what was lost.
      if (!reduceMotion && since < 1) {
        const colors = run!.roll.staked.map((id) => ShopPage.rarityColor(cosmetic(id)?.rarity ?? 'common'));
        for (let k = 0; k < 16; k++) {
          const dir = unit(k, 71) * TAU;
          const speed = 60 + 110 * unit(k, 72);
          const p = v(center.x + Math.cos(dir) * speed * since, center.y + Math.sin(dir) * speed * since + 260 * since * since);
          list.s(rect(p, v(5 + 4 * unit(k, 73), 3 + 3 * unit(k, 74)), 0.5, dir + since * 8 * (unit(k, 75) - 0.5)), colors[k % colors.length], (1 - since) * enter);
        }
      }
    } else {
      drawText(list, chance > 0 ? `${(chance * 100).toFixed(1)} %` : '–', v(center.x, center.y - 6), Math.min(34, radius * 0.5), chance > 0 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      drawText(list, boosted && chance > 0 ? S.casino.chanceBoosted : S.casino.chance, v(center.x, center.y + radius * 0.3), 12, boosted && chance > 0 ? 'accent' : 'muted', { align: 'center', opacity: enter });
    }
    // The table: five skins staked, the arrow, the one to win.
    slots.forEach((cell, i) => {
      const r = CasinoPage.pressedRect(cell, { k: 'slot', slot: i }, state);
      const id = i < 5 ? staked[i] : target;
      const item = id ? cosmetic(id) : null;
      // The stake leaves the table either way: it flies into the pot as the dial starts
      // (with Reduce Motion it simply fades once the dial has spoken).
      const staking = run !== null && i < 5 && item !== null;
      const flown = staking && !reduceMotion ? Ease.clamp01((run!.age - 0.05 * i) / 0.4) : 0;
      const fade = staking && reduceMotion ? (done ? 0.3 : 1) : 1 - 0.7 * flown;
      const edge: ColorToken = item ? ShopPage.rarityColor(item.rarity) : 'controlFill';
      list.s(rect(R.center(r), v(R.width(r) + 3, R.height(r) + 3), 11.5), edge, (item ? 0.6 : 1) * enter * fade);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'cardRaised', enter * fade);
      if (item && flown < 1) {
        const at = lerpV(R.center(r), center, Ease.inOutSine(flown));
        ShopPage.addPreview(list, item, at, (R.width(r) / 70) * (1 - 0.55 * flown), enter * (staking && reduceMotion ? fade : 1 - 0.5 * flown));
      } else if (!item) drawText(list, i < 5 ? '+' : '?', R.center(r), 18, 'muted', { weight: 'bold', align: 'center', opacity: enter });
    });
    const arrowAt = v(slots[4].maxX + 14, R.center(slots[5]).y);
    list.s(polygon([add(arrowAt, v(-5, -6)), add(arrowAt, v(5, 0)), add(arrowAt, v(-5, 6))]), 'muted', enter);
    drawText(list, S.casino.stakeValue(money(Fmt.number(stakeValue))), v(slots[0].minX, slots[0].minY - 12), 11, 'muted', { opacity: enter });
    if (target && targetItem) drawText(list, S.shop.item(target), v(slots[5].maxX, slots[5].minY - 12), 11, ShopPage.rarityColor(targetItem.rarity), { weight: 'bold', align: 'trailing', opacity: enter });
  },

  addPicker(list: RenderList, stage: Rect, career: Career, state: CasinoState, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const items = CasinoPage.pickerItems(career, state);
    const title = state.picker === 'stake' ? S.casino.pickStakesTitle(state.staked.length, baseConfig.upgradeMaxStake) : S.casino.pickTargetTitle;
    drawText(list, title, v(stage.minX + 14, stage.minY + 16), 13, 'primary', { weight: 'bold', opacity: enter });
    if (items.length === 0) {
      drawText(list, state.picker === 'stake' ? S.casino.noSkins : S.casino.noTargets, R.center(stage), 13, 'muted', { align: 'center', opacity: enter });
      return;
    }
    const inner = R.inset(stage, 10, 0);
    const { cells, pages } = CasinoPage.pickerCells(inner, items, state.page);
    for (const [item, cell] of cells) {
      const r = CasinoPage.pressedRect(cell, { k: 'pick', id: item.id }, state);
      const chosen = state.picker === 'stake' ? state.staked.includes(item.id) : state.target === item.id;
      list.s(rect(R.center(r), v(R.width(r) + 3, R.height(r) + 3), 11.5), chosen ? 'accent' : ShopPage.rarityColor(item.rarity), (chosen ? 1 : 0.45) * enter);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'cardRaised', enter);
      ShopPage.addPreview(list, item, v(R.center(r).x, R.center(r).y - 4), R.width(r) / 80, enter);
      if (Careers.isWorn(career, item.id)) drawText(list, S.shop.worn, v(r.maxX - 6, r.minY + 9), 9, 'accent', { weight: 'bold', align: 'trailing', opacity: enter });
      drawText(list, S.shop.item(item.id), v(R.center(r).x, r.maxY - 8), ShopPage.fitted(S.shop.item(item.id), 9, R.width(r) - 6), 'muted', { align: 'center', opacity: enter });
      if (chosen) {
        const at = v(r.minX + 9, r.minY + 9);
        list.s(circle(at, 7), 'accent', enter);
        drawText(list, '✓', at, 9, 'accentInk', { weight: 'bold', align: 'center', opacity: enter });
      }
    }
    if (pages > 1) {
      const y = stage.maxY - 14;
      const page = Math.min(state.page, pages - 1);
      drawText(list, `${page + 1} / ${pages}`, v(R.center(stage).x, y), 12, 'muted', { align: 'center', opacity: enter });
      drawText(list, '‹', v(stage.minX + 24, y), 20, page > 0 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter * (page > 0 ? 1 : 0.4) });
      drawText(list, '›', v(stage.maxX - 24, y), 20, page < pages - 1 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter * (page < pages - 1 ? 1 : 0.4) });
    }
  },

  // MARK: Double or nothing

  /**
   * What rides on the coin, beside it: one coin on the stack for every doubling so far. A win
   * drops the next one on; a loss knocks the stack over.
   */
  addStack(list: RenderList, run: Extract<CasinoRun, { k: 'flip' }>, foot: Vec2, done: boolean, since: number, reduceMotion: boolean, enter: number): void {
    const won = done && run.flip.won;
    const count = run.chain - 1 + (won ? 1 : 0);
    if (count <= 0) return;
    const tint: ColorToken = run.items ? 'accent' : 'coin';
    const fall = done && !won ? (reduceMotion ? 1 : Ease.outCubic(Ease.clamp01(since / 0.5))) : 0;
    for (let j = 0; j < count; j++) {
      let at = v(foot.x, foot.y - 4 - j * 7);
      let turn = 0;
      if (won && j === count - 1 && !reduceMotion) at = add(at, v(0, -40 * (1 - Ease.outCubic(Ease.clamp01(since / 0.25)))));
      if (fall > 0) {
        at = add(at, v((j + 1) * 16 * fall, (j * 7 + 6) * fall));
        turn = 0.9 * fall * (1 + 0.2 * j);
      }
      const o = enter * (1 - (reduceMotion ? 0.7 : 1) * fall);
      list.s(rect(at, v(34, 8), 4, turn), tint, o);
      list.s(rect(add(at, v(0, -1.5)), v(26, 3), 1.5, turn), 'primary', 0.35 * o);
    }
    if (fall === 0) drawText(list, S.casino.chainTimes(2 ** count), v(foot.x, foot.y - 4 - count * 7 - 12), 11, tint, { weight: 'bold', align: 'center', opacity: enter });
  },

  /** A coin with a car on one face and a crash on the other; it jumps, turns and lands. */
  addFlip(list: RenderList, stage: Rect, run: Extract<CasinoRun, { k: 'flip' }>, career: Career, reduceMotion: boolean, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const done = run.age >= TIMES.flip;
    const x = reduceMotion ? 1 : Ease.clamp01(run.age / TIMES.flip);
    const radius = Math.min(64, R.height(stage) * 0.24);
    const rest = v(R.center(stage).x, R.center(stage).y - 10);
    const jump = reduceMotion ? 0 : Math.sin(Math.PI * x) * Math.min(90, R.height(stage) * 0.3);
    const center = add(rest, v(0, -jump));
    // Half-turns: an even count shows the car (a win), an odd one the crash; it ends on the draw.
    const total = TIMES.flipHalfTurns + (run.flip.won ? 0 : 1);
    const turn = reduceMotion ? total : Ease.outCubic(x) * total;
    const face = Math.floor(turn) % 2 === 0 ? 'win' : 'lose';
    const squeeze = reduceMotion ? 1 : Math.max(0.06, Math.abs(Math.cos(turn * Math.PI)));
    const tint: ColorToken = face === 'win' ? 'accent' : 'destructive';
    list.s(rect(v(rest.x, rest.y + radius + 14), v(radius * 1.6 * (1 - 0.4 * (jump / 90)), 8), 4), 'shadow', 0.6 * enter);
    list.s(rect(center, v(2 * radius * squeeze + 4, 2 * radius + 4), Math.min(radius * squeeze + 2, radius + 2)), 'coin', enter);
    list.s(rect(center, v(2 * radius * squeeze, 2 * radius), Math.min(radius * squeeze, radius)), tint, enter);
    if (squeeze > 0.55) {
      const o = enter * Ease.clamp01((squeeze - 0.55) / 0.3);
      if (face === 'win') CasinoPage.vehicle(list, 'car', null, center, radius * 1.1 * squeeze, 0, o);
      else for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        list.s(line(add(center, v(Math.cos(a) * radius * 0.2 * squeeze, Math.sin(a) * radius * 0.2)), add(center, v(Math.cos(a) * radius * 0.6 * squeeze, Math.sin(a) * radius * 0.6)), 4), 'accentInk', o);
      }
    }
    const since = run.age - TIMES.flip;
    CasinoPage.addStack(list, run, v(rest.x - radius - Math.min(64, R.width(stage) * 0.18), rest.y + radius + 14), done, since, reduceMotion, enter);
    // It lands flat: a little dust puffs out to both sides.
    if (done && !reduceMotion && since < 0.4) {
      const e = Ease.outCubic(since / 0.4);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const p = v(rest.x + side * (radius * 0.5 + (30 + 14 * k) * e), rest.y + radius + 12 - (4 + 3 * k) * e);
          list.s(circle(p, 3 + (4 + k) * e), 'smoke', 0.35 * (1 - e) * enter);
        }
      }
    }
    const below = v(rest.x, stage.maxY - 40);
    if (!done) {
      drawText(list, S.casino.flipping, below, 13, 'muted', { align: 'center', opacity: enter });
      return;
    }
    const pop = reduceMotion ? 1 : land(since / 0.4, 0.3);
    if (run.flip.won) {
      const text = run.items ? S.casino.doubledSkin(S.shop.item(run.flip.item ?? '')) : S.casino.doubled(money(Fmt.number(run.flip.money)));
      drawText(list, text, below, 18 * pop, 'accent', { weight: 'bold', align: 'center', opacity: enter });
      CasinoPage.celebrate(list, rest, since, winTier(2 ** run.chain), 'accent', reduceMotion);
    } else drawText(list, run.items ? S.casino.flipLostSkin : S.casino.flipLost, below, 16, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
    const p = career.casinoPending;
    if (p?.k === 'win') drawText(list, S.casino.flipsLeft(baseConfig.doubleMaxChain - p.flips), v(below.x, below.y + 22), 11, 'muted', { align: 'center', opacity: enter });
  },

  /** The picture of a game for the sheet. */
};
