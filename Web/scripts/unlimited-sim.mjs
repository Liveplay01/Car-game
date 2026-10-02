// Unlimited's late stages (config `endlessStages`) played by the careful bot from sim.mjs: they must
// come in order, the careful bot must not crash into them, and the same seed must give the same run.
// Criminals are left out here: the bot does not hunt them.
//   node scripts/unlimited-sim.mjs [runs] [minutes]
import { createServer } from 'vite';

const runs = Number(process.argv[2] ?? 4);
const minutes = Number(process.argv[3] ?? 15);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { Careers, newCareer } = await server.ssrLoadModule('/src/core/career.ts');
  const { joinsClearRoad } = await server.ssrLoadModule('/src/core/ambulance.ts');

  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) =>
    world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04 && !joinsClearRoad(world, { type: 'car' }, world.layout.player);

  const play = (seed) => {
    // No criminals: the careful bot does not hunt them, and an escape would end the run before the stages.
    const config = Careers.shiftConfig(newCareer(), 'unlimited', baseConfig, seed);
    config.criminalChance = 0;
    const world = new World(config, seed, { startsOnFirstTap: false });
    const stages = [];
    let result = null;
    for (let s = 0; s < 120 * 60 * minutes && !result; s++) {
      if (careful(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'unlimitedStage') stages.push(`${e.stage}@${Math.round(e.time)}`);
        if (e.type === 'shiftEnded') result = e.result;
      }
    }
    return { result, stages, cars: result?.carsSent ?? world.shift.carsSent, time: world.time };
  };

  for (let i = 1; i <= runs; i++) {
    const seed = i * 104729;
    const a = play(seed);
    const b = i === 1 ? play(seed) : null;
    const how = a.result ? `${a.result.outcome} after ${Math.round(a.result.time)} s, crashes ${a.result.crashes}${a.result.detonated ? ', bomb' : ''}` : `still going after ${minutes} min`;
    console.log(`run ${i}: ${how}, cars ${a.cars}, stages ${a.stages.join(' ')}` + (b ? `, same seed again: ${b.cars === a.cars && b.stages.join() === a.stages.join() ? 'identical' : 'DIFFERENT'}` : ''));
  }
} finally {
  await server.close();
}
