// Career balancing: plays a whole career, not single shifts (Spiel.md, "Keine Karriere-Messung").
//   node scripts/career-sim.mjs [targetLevel=50] [--profile=casual|skilled|both]
// A human-like bot (reaction time, misjudged gaps) plays shift after shift from a new save,
// books every shift like the game does (`bookShift`) and spends like a player: the cheapest
// upgrade it can afford, then a new arm once the upgrades on offer are bought. It prints how
// long each stretch of levels takes, how often shifts are lost, and what the money buys.
import { createServer } from 'vite';

const target = Number(process.argv[2] ?? 50);
const which = process.argv.find((a) => a.startsWith('--profile='))?.split('=')[1] ?? 'both';
/** `--story=15`: the first 15 shifts one by one, with what the game tells the player after each. */
const story = Number(process.argv.find((a) => a.startsWith('--story='))?.split('=')[1] ?? 0);

/**
 * How a player misjudges (gaps in seconds of ring travel, like `predictedMergeGap`): for each
 * car they read the ring with a lean of their own (`bias`, drawn once per car: bold or
 * careful), wait for a gap of `margin` as they see it, and their thumb lands `reaction`
 * seconds later, give or take `jitter` they do not know about.
 */
const PROFILES = {
  skilled: { bias: 0.02, jitter: 0.02, reaction: [0.12, 0.2], margin: 0.05 },
  casual: { bias: 0.045, jitter: 0.04, reaction: [0.16, 0.3], margin: 0.07 },
};
/** Minutes between two shifts: the result, a look at the shop, the next tap. */
const BETWEEN = 0.25;
const CHECKPOINTS = [2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100].filter((l) => l <= target);

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig, ROAD_MODULES, modulePrice } = await server.ssrLoadModule('/src/core/config.ts');
  const { newSave, Careers } = await server.ssrLoadModule('/src/core/career.ts');
  const { UPGRADES, canBuildArm, upgradeMaxSteps, upgradePrice } = await server.ssrLoadModule('/src/core/levels.ts');
  const { Unlocks, FEATURES } = await server.ssrLoadModule('/src/core/unlocks.ts');
  const { bookShift } = await server.ssrLoadModule('/src/present/booking.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');
  const { Elite } = await server.ssrLoadModule('/src/core/elite.ts');

  // A seeded source of chance, so a run is the same every time.
  const random = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

  /** The merge gap to some of the traffic only: the criminal to hit, or everyone else to miss. */
  const gapTo = (world, arm, delay, keep) => {
    const all = world.vehicles;
    world.vehicles = all.filter(keep);
    try {
      return world.predictedMergeGap(arm, delay, 30);
    } finally {
      world.vehicles = all;
    }
  };

  /** What the cash transporters paid in the shifts played so far: all of them, and the Jackpot ones. */
  const paid = { transporters: 0, jackpots: 0, jackpotCount: 0 };

  const playShift = (config, seed, p, r) => {
    const world = new World(config, seed, { startsOnFirstTap: false });
    const arm = world.layout.player;
    let tapAt = null;
    let lean = null;
    let result = null;
    for (let i = 0; i < 120 * 240 && !result; i++) {
      // A criminal on the ring: the next car goes out as police (the Dispatch button) to ram it.
      const cr = world.criminal;
      const target = cr.kind === 'active' ? cr.vehicle : null;
      const front = world.vehicle(world.queue.vehicles[0]);
      if (target !== null && front && front.type !== 'police' && tapAt === null) world.dispatchPolice();
      if (tapAt !== null && world.time >= tapAt) {
        world.tap(world.time);
        tapAt = null;
        lean = null;
      } else if (tapAt === null && world.queue.isReady && i % 6 === 0) {
        lean ??= p.bias * gauss(r);
        const reaction = p.reaction[0] + (p.reaction[1] - p.reaction[0]) * r();
        const clear = !joinsClearRoad(world, { type: 'car' }, arm);
        let go;
        if (target !== null && front?.type === 'police') {
          // Aim: the police car's path meets the criminal, and nobody else.
          const hit = gapTo(world, arm, reaction, (x) => x.id === target) + lean < -0.02;
          const safe = gapTo(world, arm, reaction, (x) => x.id !== target) + lean > p.margin;
          go = hit && safe;
        } else go = world.predictedMergeGap(arm, reaction, 30) + lean > p.margin;
        if (go && clear) tapAt = world.time + Math.max(0.05, reaction + p.jitter * gauss(r));
      }
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'shiftEnded') result = e.result;
        if (e.type === 'transporterPaid' && e.amount > 0) {
          paid.transporters += e.amount;
          if (e.jackpot) {
            paid.jackpots += e.amount;
            paid.jackpotCount++;
          }
        }
      }
    }
    return result;
  };

  /** Spends like a player: cheapest upgrade first; an arm once nothing on offer is affordable and it is. */
  const spend = (c, log) => {
    for (;;) {
      const offers = UPGRADES.map((u) => [u, Careers.priceOf(c, u, baseConfig)]).filter(([, price]) => price !== null);
      offers.sort((a, b) => a[1] - b[1]);
      const cheapest = offers[0];
      if (cheapest && cheapest[1] <= c.money) {
        Careers.buy(c, cheapest[0], baseConfig);
        log.upgrades += cheapest[1];
        continue;
      }
      const armPrice = Careers.armPrice(c, baseConfig);
      if (armPrice !== null && armPrice <= c.money && (!cheapest || c.money - armPrice >= cheapest[1] * 0.5)) {
        const slot = [...Array(baseConfig.armSlotCount).keys()].find((s) => canBuildArm(baseConfig, s, c.armSlots));
        if (slot !== undefined && Careers.buildArm(c, slot, baseConfig)) {
          log.arms += armPrice;
          continue;
        }
      }
      return;
    }
  };

  const run = (name, p) => {
    const r = random(0xc0ffee);
    const save = newSave();
    save.tutorialDone = true;
    const c = save.career;
    const log = { upgrades: 0, arms: 0 };
    let shifts = 0;
    let minutes = 0;
    let lost = 0;
    let earned = 0;
    let crashes = 0;
    let takedowns = 0;
    const outcomes = {};
    const opened = {};
    const rows = [];
    let band = { shifts: 0, lost: 0, earned: 0, minutes: 0 };
    /** Money the shifts paid on the road (before booking), to compare the Jackpot against. */
    let shiftMoney = 0;
    /** The Elite track from the moment it opens (Level 50): shifts, minutes and XP since then. */
    const elite = { openedAt: null, shifts: 0, minutes: 0, xp: 0 };
    paid.transporters = 0;
    paid.jackpots = 0;
    paid.jackpotCount = 0;
    while (c.level < target && shifts < 4000) {
      const seed = shifts * 7919 + 17;
      const shiftConfig = Careers.config(c, baseConfig, seed);
      const level = c.level;
      const res = playShift(shiftConfig, seed, p, r);
      shifts++;
      band.shifts++;
      if (!res) continue;
      const before = c.money;
      const xpBefore = c.eliteXp;
      const eliteOpen = Elite.isOpen(c, baseConfig);
      const booking = bookShift(save, res, { mode: 'shift', level, daily: false, today: 20725, config: baseConfig, shiftConfig, splits: [] });
      if (story && shifts <= story) {
        const clock = `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, '0')}`;
        console.log(
          `  ${String(shifts).padStart(2)}  ${clock.padStart(5)}  L${String(level).padEnd(3)} ${res.outcome.padEnd(9)} ${String(res.time.toFixed(0)).padStart(3)} s  cars ${String(res.carsSent).padStart(2)}  +${String(c.money - before).padStart(5)}  chests ${c.chests.length}` +
            (booking.news.length ? `  · ${booking.news.join(' | ')}` : ''),
        );
      }
      const gained = c.money - before;
      earned += gained;
      band.earned += gained;
      const spent = res.time / 60 + BETWEEN;
      minutes += spent;
      band.minutes += spent;
      shiftMoney += Math.max(0, res.money);
      if (eliteOpen) {
        elite.shifts++;
        elite.minutes += spent;
        elite.xp += c.eliteXp - xpBefore;
      } else if (Elite.isOpen(c, baseConfig)) elite.openedAt = { level: c.level, minutes };
      crashes += res.crashes;
      outcomes[res.outcome] = (outcomes[res.outcome] ?? 0) + 1;
      takedowns += res.takedowns;
      if (res.outcome !== 'completed') {
        lost++;
        band.lost++;
      }
      for (const f of FEATURES) if (!(f in opened) && Unlocks.isOpen(c, f, baseConfig)) opened[f] = { level: c.level, minutes };
      spend(c, log);
      if (c.level > level && CHECKPOINTS.includes(c.level)) {
        const upgrades = UPGRADES.reduce((n, u) => n + Careers.steps(c, u), 0);
        const next = UPGRADES.map((u) => Careers.priceOf(c, u, baseConfig)).filter((x) => x !== null).sort((a, b) => a - b)[0] ?? null;
        rows.push({
          level: c.level,
          shifts,
          hours: minutes / 60,
          lostPct: (100 * band.lost) / band.shifts,
          perShift: band.earned / Math.max(1, band.shifts),
          bank: c.money,
          upgrades,
          arms: c.armSlots.length,
          next,
          shiftsForNext: next === null ? null : next / Math.max(1, band.earned / band.shifts),
        });
        band = { shifts: 0, lost: 0, earned: 0, minutes: 0 };
      }
    }
    console.log(`\n${name}: level ${c.level} after ${shifts} shifts, ${(minutes / 60).toFixed(1)} h, lost ${lost} (${((100 * lost) / shifts).toFixed(0)} %), ${crashes} crashes`);
    console.log(`  outcomes ${Object.entries(outcomes).map(([k, n]) => `${k} ${n}`).join(', ')}; takedowns ${takedowns}`);
    console.log(`  earned ${Math.round(earned).toLocaleString('en')}, spent on upgrades ${log.upgrades.toLocaleString('en')}, on arms ${log.arms.toLocaleString('en')}, bank ${c.money.toLocaleString('en')}`);
    const allSteps = UPGRADES.reduce((sum, u) => sum + [...Array(upgradeMaxSteps[u]).keys()].reduce((s, k) => s + upgradePrice(u, k + 1, baseConfig), 0), 0);
    const owned = UPGRADES.reduce((n, u) => n + Careers.steps(c, u), 0);
    const maxSteps = UPGRADES.reduce((n, u) => n + upgradeMaxSteps[u], 0);
    console.log(`  upgrades ${owned}/${maxSteps} steps (all of them cost ${allSteps.toLocaleString('en')}); next arm ${Careers.armPrice(c, baseConfig)?.toLocaleString('en')}; modules ${ROAD_MODULES.map((m) => `${m} ${modulePrice(baseConfig, m).toLocaleString('en')}`).join(', ')}; chests waiting ${c.chests.length}`);
    // The Jackpot transporter (`jackpotChance`, `jackpotFactor`): how much of the road's money it is.
    const share = (x) => `${((100 * x) / Math.max(1, shiftMoney)).toFixed(1)} %`;
    const plain = paid.jackpots / Math.max(1, baseConfig.jackpotFactor);
    console.log(
      `  money on the road ${Math.round(shiftMoney).toLocaleString('en')}: transporters ${share(paid.transporters)}, Jackpots ${share(paid.jackpots)} (${paid.jackpotCount} in ${shifts} shifts; ${share(paid.jackpots - plain)} is the Jackpot's extra over a plain run)`,
    );
    // The Elite track (Level 50 is Elite 1, then `eliteXpPerLevel` XP a level): its pace, and where it leads.
    if (elite.openedAt && elite.shifts > 0) {
      const perHour = elite.xp / (elite.minutes / 60);
      const hoursTo = (level) => Elite.xpTo(level, baseConfig) / perHour;
      console.log(
        `  elite: open at level ${elite.openedAt.level} (${(elite.openedAt.minutes / 60).toFixed(1)} h); since then ${elite.shifts} shifts, ${(elite.minutes / 60).toFixed(1)} h, ${(elite.xp / elite.shifts).toFixed(1)} XP a shift, ${Math.round(perHour)} XP an hour → Elite ${Elite.level(c, baseConfig)}; at this pace Elite 10 in ${hoursTo(10).toFixed(0)} h, 50 in ${hoursTo(50).toFixed(0)} h, 100 in ${hoursTo(100).toFixed(0)} h of play`,
      );
    } else if (target > baseConfig.prestigeLevel) console.log('  elite: not open yet');
    console.log(`  opened:${FEATURES.map((f) => (opened[f] ? `${f} at level ${opened[f].level} (${opened[f].minutes.toFixed(0)} min)` : `${f} never`)).join(', ')}`);
    console.log('  level  shifts   hours  lost %  money/shift       bank  upgrades  arms  next upgrade  shifts for it');
    for (const x of rows) {
      console.log(
        `  ${String(x.level).padStart(5)}  ${String(x.shifts).padStart(6)}  ${x.hours.toFixed(1).padStart(6)}  ${x.lostPct.toFixed(0).padStart(6)}  ${Math.round(x.perShift).toLocaleString('en').padStart(11)}  ${Math.round(x.bank).toLocaleString('en').padStart(9)}  ${String(x.upgrades).padStart(8)}  ${String(x.arms).padStart(4)}  ${x.next === null ? '         –' : x.next.toLocaleString('en').padStart(12)}  ${x.shiftsForNext === null ? '' : x.shiftsForNext.toFixed(1).padStart(13)}`,
      );
    }
  };

  /**
   * `--curve=5-14`: the difficulty curve. Each level gets `--per` fresh shifts (a career at that
   * level, nothing bought), with how often they are lost and what is on at that level.
   */
  const curve = (name, p, from, to, per) => {
    console.log(`\n${name}: lost shifts per level (${per} each)`);
    console.log('  level  lost %  crashes  escaped  cars  ring bots  night %  event %  rain %');
    const r = random(0xbeef);
    for (let level = from; level <= to; level++) {
      let lost = 0;
      let crashes = 0;
      let escaped = 0;
      let night = 0;
      let event = 0;
      let rain = 0;
      let cars = 0;
      let bots = 0;
      for (let k = 0; k < per; k++) {
        const c = newSave().career;
        c.level = level;
        const seed = level * 100003 + k * 7919;
        const cfg = Careers.config(c, baseConfig, seed);
        const res = playShift(cfg, seed, p, r);
        if (!res) continue;
        if (res.outcome !== 'completed') lost++;
        if (res.outcome === 'escaped') escaped++;
        crashes += res.crashes;
        if (cfg.night) night++;
        if (cfg.cityEvent) event++;
        if (cfg.weather !== 'clear') rain++;
        cars += cfg.shiftCars ?? 0;
        bots += cfg.minRingBots;
      }
      const pct = (x) => `${Math.round((100 * x) / per)}`.padStart(6);
      console.log(`  ${String(level).padStart(5)}  ${pct(lost)}  ${(crashes / per).toFixed(2).padStart(7)}  ${pct(escaped)}  ${(cars / per).toFixed(1).padStart(4)}  ${(bots / per).toFixed(1).padStart(9)}  ${pct(night)}  ${pct(event)}  ${pct(rain)}`);
    }
  };
  const curveArg = process.argv.find((a) => a.startsWith('--curve='))?.split('=')[1];
  const per = Number(process.argv.find((a) => a.startsWith('--per='))?.split('=')[1] ?? 40);
  for (const [name, p] of Object.entries(PROFILES)) {
    if (which !== 'both' && which !== name) continue;
    if (curveArg) {
      const [from, to] = curveArg.split('-').map(Number);
      curve(name, p, from, to ?? from, per);
    } else run(name, p);
  }
} finally {
  await server.close();
}
