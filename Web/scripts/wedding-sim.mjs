// Flow check for the wedding convoy: the same shifts with and without it.
//   node scripts/wedding-sim.mjs [shifts] [level]
// The convoy drives at ring speed, so it must not add crashes for the careful bot, must not
// leave fewer than `minRingBots` bots on the ring, and must not put cars out of the flow.
import { createServer } from 'vite';

const shifts = Number(process.argv[2] ?? 40);
const level = Number(process.argv[3] ?? 100);

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { forLevel } = await server.ssrLoadModule('/src/core/levels.ts');
  const { isInFlow } = await server.ssrLoadModule('/src/core/vehicle.ts');

  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04;

  const play = (seed, chance) => {
    const config = forLevel(baseConfig, level, seed);
    config.weddingChance = chance;
    const world = new World(config, seed, { startsOnFirstTap: false });
    const stat = { result: null, warned: 0, convoy: 0, spoilt: 0, passed: 0, steps: 0, outOfFlow: 0, fewBots: 0 };
    for (let i = 0; i < 120 * 180 && !stat.result; i++) {
      if (careful(world)) world.tap(world.time);
      world.step();
      const running = world.shift.phase === 'running' || world.shift.phase === 'rushHour';
      if (running) {
        stat.steps++;
        const ring = world.vehicles.filter((x) => x.phase.kind === 'ring');
        if (ring.some((x) => !isInFlow(x.phase.drive))) stat.outOfFlow++;
        if (ring.filter((x) => world.isRingBot(x)).length < config.minRingBots) stat.fewBots++;
      }
      for (const e of world.takeEvents()) {
        if (e.type === 'shiftEnded') stat.result = e.result;
        if (e.type === 'weddingWarning') stat.warned++;
        if (e.type === 'weddingEntered') stat.convoy++;
        if (e.type === 'weddingSpoilt') stat.spoilt++;
        if (e.type === 'weddingPassed') stat.passed++;
      }
    }
    return stat;
  };

  for (const [name, chance] of [['without', 0], ['with', 1]]) {
    const t = { crashes: 0, completed: 0, time: 0, warned: 0, convoy: 0, spoilt: 0, passed: 0, steps: 0, outOfFlow: 0, fewBots: 0, stuck: 0 };
    for (let s = 1; s <= shifts; s++) {
      const r = play(s * 7919, chance);
      if (!r.result) { t.stuck++; continue; }
      t.crashes += r.result.crashes;
      if (r.result.outcome === 'completed') t.completed++;
      t.time += r.result.time;
      for (const k of ['warned', 'convoy', 'spoilt', 'passed', 'steps', 'outOfFlow', 'fewBots']) t[k] += r[k];
    }
    const n = shifts - t.stuck;
    console.log(
      `${name.padEnd(7)} level ${level}: completed ${t.completed}/${shifts}, crashes ${t.crashes}, Ø time ${(t.time / n).toFixed(1)} s, ` +
        `convoys ${t.convoy} of ${t.warned} announced (passed ${t.passed}, spoilt ${t.spoilt}), steps out of flow ${((100 * t.outOfFlow) / t.steps).toFixed(2)} %, ` +
        `steps with too few bots ${((100 * t.fewBots) / t.steps).toFixed(2)} %, unfinished ${t.stuck}`,
    );
  }
} finally {
  await server.close();
}
