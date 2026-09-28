// Headless balancing check, like `swift run Sim`: plays whole shifts with bots.
//   node scripts/sim.mjs [shifts] [level] [--mayhem] [--legendary=gridlock|dragnet|heavyLoad|darkStorm|zeroTolerance]
// A careful bot (taps only when the predicted merge gap is safe) must never crash;
// a random tapper must crash often. Boss levels are every 15th (15 convoy, 30 getaway,
// 45 armoured, 60 phantom); ambulances come from level 8.
import { createServer } from 'vite';

const shifts = Number(process.argv[2] ?? 60);
const level = Number(process.argv[3] ?? 5);
const legendary = process.argv.find((a) => a.startsWith('--legendary='))?.split('=')[1] ?? null;

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World, STEP } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { forLevel, forMayhem, forLegendary } = await server.ssrLoadModule('/src/core/levels.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');
  const mayhem = process.argv.includes('--mayhem');

  const play = (seed, strategy) => {
    const shift = forLegendary(forLevel(baseConfig, level, seed), legendary);
    const config = mayhem ? forMayhem(shift) : shift;
    const world = new World(config, seed, { startsOnFirstTap: false });
    let result = null;
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
  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40) > 0.04 && clearRoad(world);
  const random = (world) => world.queue.isReady && Math.random() < 0.02;

  for (const [name, strategy] of [['careful', careful], ['random', random]]) {
    let crashes = 0, completed = 0, score = 0, time = 0, tight = 0, stuck = 0, flames = 0, boom = 0, bosses = 0, busted = 0, ambulances = 0, failed = 0;
    tally.came = 0;
    tally.blocked = 0;
    for (let s = 1; s <= shifts; s++) {
      const r = play(s * 7919, strategy);
      if (!r) { stuck++; continue; }
      crashes += r.crashes;
      if (r.outcome === 'completed') completed++;
      score += r.score;
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
      `Ø score ${Math.round(score / n)}, Ø time ${(time / n).toFixed(1)} s, Ø tight fits ${(tight / n).toFixed(1)}, unfinished ${stuck}` +
      (mayhem ? `, Ø flames ${(flames / n).toFixed(1)}, bombs ${boom}` : `, bombs ${boom}`) +
      (bosses > 0 ? `, bosses busted ${busted}/${bosses}` : '') +
      `, ambulances cleared ${ambulances}/${tally.came} (blocked ${tally.blocked})` +
      (legendary ? `, legendary ${legendary}, failed by rule ${failed}` : ''));
  }
  void STEP;
} finally {
  await server.close();
}
