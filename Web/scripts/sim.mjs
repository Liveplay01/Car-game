// Headless balancing check, like `swift run Sim`: plays whole shifts with bots.
//   node scripts/sim.mjs [shifts] [level] [--mayhem] [--modules=slot:module[:level],…] [--legendary=gridlock|dragnet|heavyLoad|darkStorm|zeroTolerance] [--heat=0..8] [--adaptive] [--ease=0..5] [--strikes=N] [--contraflow]
// A careful bot (taps only when the predicted merge gap is safe) must never crash;
// a random tapper must crash often. A novice (the careful read, a human reaction delay, now and then too greedy)
// stands in for a new player: on Levels 1–5 with `--ease=N` steps of quiet help it should win at least half its shifts. Boss levels are every 15th (15 convoy, 30 getaway,
// 45 armoured, 60 phantom); ambulances come from level 8.
import { createServer } from 'vite';

const shifts = Number(process.argv[2] ?? 60);
const level = Number(process.argv[3] ?? 5);
const heat = Number(process.argv.find((a) => a.startsWith('--heat='))?.split('=')[1] ?? 0);
const built = (process.argv.find((a) => a.startsWith('--modules='))?.split('=')[1] ?? '').split(',').filter(Boolean).map((m) => m.split(':'));
const legendary = process.argv.find((a) => a.startsWith('--legendary='))?.split('=')[1] ?? null;
const strikes = Number(process.argv.find((a) => a.startsWith('--strikes='))?.split('=')[1] ?? 0);
const ease = Number(process.argv.find((a) => a.startsWith('--ease='))?.split('=')[1] ?? 0);

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World, STEP } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { forLevel, forMayhem, forLegendary, forIntro, forEase, shiftCarsRange } = await server.ssrLoadModule('/src/core/levels.ts');
  const { forHeat } = await server.ssrLoadModule('/src/core/heat.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');
  const mayhem = process.argv.includes('--mayhem');

  const play = (seed, strategy) => {
    const plain = forIntro(forHeat(forLegendary(forLevel(baseConfig, level, seed), legendary), heat), level);
    // Like `Careers.careerShift`: an eased shift draws the fewest cars the level has before `forEase` takes more out.
    const shift = forEase(ease > 0 ? { ...plain, shiftCars: shiftCarsRange(level, baseConfig)[0] } : plain, ease);
    const config = mayhem ? forMayhem(shift) : shift;
    if (process.argv.includes('--adaptive')) config.adaptive = true;
    if (strikes > 0) config.maxStrikes = strikes;
    if (process.argv.includes('--contraflow')) config.contraflow = config.lanes > 1;
    for (const [slot, module, moduleLevel = '1'] of built) {
      config.modules[slot] = module;
      config.moduleLevels[slot] = Number(moduleLevel);
    }
    const world = new World(config, seed, { startsOnFirstTap: false });
    let result = null;
    novice.rng = seed;
    novice.at = null;
    for (let i = 0; i < 120 * 180 && !result; i++) {
      if (strategy(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'shiftEnded') result = e.result;
        if (e.type === 'ambulanceEntered') tally.came++;
        if (e.type === 'ambulanceBlocked') tally.blocked++;
      }
    }
    return result;
  };
  const tally = { came: 0, blocked: 0 };

  // The careful bot also keeps the ambulance's road clear: it waits while its car would land on it.
  const clearRoad = (world) => !joinsClearRoad(world, { type: 'car' }, world.layout.player);
  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04 && clearRoad(world);
  const random = (world) => world.queue.isReady && Math.random() < 0.02;
  // Seeded per shift, so a run is repeatable: the reaction comes 60–260 ms after a safe gap shows (whether it is still
  // safe then or not), and one decision in ten takes a gap the careful bot would let pass.
  const novice = (world) => {
    if (!world.queue.isReady) { novice.at = null; return false; }
    const roll = () => (novice.rng = (Math.imul(novice.rng, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    if (novice.at === null) {
      const need = roll() < 0.1 ? 0 : 0.04;
      if (world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) <= need || !clearRoad(world)) return false;
      novice.at = world.time + 0.06 + roll() * 0.2;
    }
    if (world.time < novice.at) return false;
    novice.at = null;
    return true;
  };

  for (const [name, strategy] of [['careful', careful], ['novice', novice], ['random', random]]) {
    let crashes = 0, completed = 0, score = 0, money = 0, time = 0, tight = 0, stuck = 0, flames = 0, boom = 0, bosses = 0, busted = 0, ambulances = 0, failed = 0;
    tally.came = 0;
    tally.blocked = 0;
    for (let s = 1; s <= shifts; s++) {
      const r = play(s * 7919, strategy);
      if (!r) { stuck++; continue; }
      crashes += r.crashes;
      if (r.outcome === 'completed') completed++;
      score += r.score;
      money += r.money;
      time += r.time;
      tight += r.tightFits;
      flames += r.flames;
      if (r.detonated) boom++;
      if (r.convoy) bosses++;
      if (r.bossBusted) busted++;
      if (r.outcome === 'failed') failed++;
      ambulances += r.ambulances;
    }
    const n = shifts - stuck;
    console.log(`${name.padEnd(8)} level ${level}: completed ${completed}/${shifts}, crashes ${crashes}, ` +
      `Ø score ${Math.round(score / n)}, Ø money ${Math.round(money / n)}, Ø time ${(time / n).toFixed(1)} s, Ø tight fits ${(tight / n).toFixed(1)}, unfinished ${stuck}` +
      (mayhem ? `, Ø flames ${(flames / n).toFixed(1)}, bombs ${boom}` : `, bombs ${boom}`) +
      (bosses > 0 ? `, bosses busted ${busted}/${bosses}` : '') +
      `, ambulances cleared ${ambulances}/${tally.came} (blocked ${tally.blocked})` +
      (legendary ? `, legendary ${legendary}, failed by rule ${failed}` : ''));
  }
  void STEP;
} finally {
  await server.close();
}
