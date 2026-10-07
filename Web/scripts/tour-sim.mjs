// The Tour stops (core/tours.ts) played by the careful bot from sim.mjs at several career levels, several seeds each
// (the stop's own seed first): the careful bot must never crash, whatever the level.
//   node scripts/tour-sim.mjs [tries]
// The bot does not hunt criminals and does not aim for Perfect Inputs, so a stop it loses only to an
// escaped criminal or a missing Perfect count is still fair.
import { createServer } from 'vite';

const tries = Number(process.argv[2] ?? 4);
const levels = [10, 25, 50, 90];
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { newCareer } = await server.ssrLoadModule('/src/core/career.ts');
  const { trialConfig, trialPassed } = await server.ssrLoadModule('/src/core/trials.ts');
  const { TOURS, tourTrial } = await server.ssrLoadModule('/src/core/tours.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');

  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) =>
    world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04 && !joinsClearRoad(world, { type: 'car' }, world.layout.player);

  for (const tour of TOURS) {
    const run = { tour, key: `${tour.id}-2026`, daysLeft: 5 };
    for (let stop = 1; stop <= tour.stops.length; stop++) {
      const line = [];
      for (const level of levels) {
        const career = { ...newCareer(), level };
        const t = tourTrial(run, stop, career);
        let passed = 0, crashes = 0, escaped = 0, rule = 0, unfinished = 0;
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
        }
        line.push(`L${t.level}: ${passed}/${tries}${crashes ? ` CRASH ${crashes}` : ''}${escaped ? ` esc ${escaped}` : ''}${rule ? ` rule ${rule}` : ''}${unfinished ? ` UNFINISHED ${unfinished}` : ''}`);
      }
      console.log(`${tour.id.padEnd(10)} stop ${stop}: ${line.join(' · ')}`);
    }
  }
} finally {
  await server.close();
}
