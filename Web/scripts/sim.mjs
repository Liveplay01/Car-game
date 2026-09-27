// Headless balancing check, like `swift run Sim`: plays whole shifts with bots.
//   node scripts/sim.mjs [shifts] [level]
// A careful bot (taps only when the predicted merge gap is safe) must never crash;
// a random tapper must crash often.
import { createServer } from 'vite';

const shifts = Number(process.argv[2] ?? 60);
const level = Number(process.argv[3] ?? 5);

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World, STEP } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { forLevel } = await server.ssrLoadModule('/src/core/levels.ts');

  const play = (seed, strategy) => {
    const config = forLevel(baseConfig, level, seed);
    const world = new World(config, seed, { startsOnFirstTap: false });
    let result = null;
    for (let i = 0; i < 120 * 180 && !result; i++) {
      if (strategy(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) if (e.type === 'shiftEnded') result = e.result;
    }
    return result;
  };

  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40) > 0.04;
  const random = (world) => world.queue.isReady && Math.random() < 0.02;

  for (const [name, strategy] of [['careful', careful], ['random', random]]) {
    let crashes = 0, completed = 0, score = 0, time = 0, tight = 0, stuck = 0;
    for (let s = 1; s <= shifts; s++) {
      const r = play(s * 7919, strategy);
      if (!r) { stuck++; continue; }
      crashes += r.crashes;
      if (r.outcome === 'completed') completed++;
      score += r.score;
      time += r.time;
      tight += r.tightFits;
    }
    const n = shifts - stuck;
    console.log(`${name.padEnd(8)} level ${level}: completed ${completed}/${shifts}, crashes ${crashes}, ` +
      `Ø score ${Math.round(score / n)}, Ø time ${(time / n).toFixed(1)} s, Ø tight fits ${(tight / n).toFixed(1)}, unfinished ${stuck}`);
  }
  void STEP;
} finally {
  await server.close();
}
