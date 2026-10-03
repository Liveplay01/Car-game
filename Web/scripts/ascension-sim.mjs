// The Ascension trials and the Landmarks (core/trials.ts) played by the careful bot from sim.mjs, several seeds each
// (the trial's own seed first): every trial must be passable, the careful bot must never crash.
//   node scripts/ascension-sim.mjs [tries]
// The bot does not hunt criminals, so a trial it loses only to an escaped criminal is still fair.
import { createServer } from 'vite';

const tries = Number(process.argv[2] ?? 6);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { ASCENSIONS, LANDMARKS, trialConfig, trialPassed } = await server.ssrLoadModule('/src/core/trials.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');

  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) =>
    world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04 && !joinsClearRoad(world, { type: 'car' }, world.layout.player);

  for (const t of [...ASCENSIONS, ...LANDMARKS]) {
    let passed = 0, crashes = 0, escaped = 0, rule = 0, unfinished = 0, time = 0;
    for (let i = 0; i < tries; i++) {
      const seed = i === 0 ? t.seed : (t.seed + i * 7919) >>> 0;
      const world = new World(trialConfig({ ...t, seed }, baseConfig), seed, { startsOnFirstTap: false });
      let result = null;
      for (let s = 0; s < 120 * 240 && !result; s++) {
        if (careful(world)) world.tap(world.time);
        world.step();
        for (const e of world.takeEvents()) if (e.type === 'shiftEnded') result = e.result;
      }
      if (!result) {
        unfinished++;
        continue;
      }
      if (trialPassed(t, result)) passed++;
      crashes += result.crashes;
      if (result.outcome === 'escaped') escaped++;
      if (result.outcome === 'failed') rule++;
      time += result.time;
    }
    console.log(`${t.id.padEnd(13)} level ${t.level}, ${t.cars} cars: passed ${passed}/${tries}, crashes ${crashes}, escaped ${escaped}, rule ${rule}, unfinished ${unfinished}, Ø ${(time / Math.max(1, tries - unfinished)).toFixed(0)} s`);
  }
} finally {
  await server.close();
}
