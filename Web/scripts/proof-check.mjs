// Records a bot run with the proof log and replays it: the replay must score the same. Used by hand and by test.mjs.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { baseConfig } = await server.ssrLoadModule('/src/core/config.ts');
  const { Careers, newCareer } = await server.ssrLoadModule('/src/core/career.ts');
  const { ProofLog, setupOf, proofConfig, replay, TAP, POLICE, REVIVE, PROOF_RULES } = await server.ssrLoadModule('/src/core/proof.ts');
  const { dailySeed } = await server.ssrLoadModule('/src/core/daily.ts');

  const record = (mode, seed, day, rash) => {
    const career = newCareer();
    career.level = 12;
    career.upgrades = { quickRecovery: 2 };
    const proof = { rules: PROOF_RULES, mode, seed, day, setup: setupOf(career), events: [] };
    const log = new ProofLog();
    const world = new World(proofConfig(proof), seed, { startsOnFirstTap: true });
    const lane = (w) => w.vehicle(w.queue.vehicles[0])?.lane ?? 0;
    let revived = false;
    for (let s = 0; s < 120 * 600; s++) {
      if (world.shift.phase === 'ended') {
        if (!revived && world.shift.outcome === 'struckOut' && mode === 'unlimited') {
          revived = true;
          log.add(world.stepCount, REVIVE, world.time);
          world.revive(world.time);
        } else break;
      }
      const reckless = rash && s % 700 === 350;
      if (reckless || (world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04)) {
        log.add(world.stepCount, TAP, world.time);
        world.tap(world.time);
      }
      if (s % 3000 === 1500) {
        log.add(world.stepCount, POLICE);
        world.dispatchPolice();
      }
      world.step();
      world.takeEvents();
    }
    const r = world.result(world.shift.outcome ?? 'struckOut', world.time);
    return { proof: { ...proof, events: JSON.parse(JSON.stringify(log.events)) }, score: r.score, cars: r.carsSent };
  };

  for (const [mode, seed, day, rash] of [['unlimited', 777, 0, false], ['unlimited', 4242, 0, true], ['daily', dailySeed(20400), 20400, false]]) {
    const { proof, score, cars } = record(mode, seed, day, rash);
    const back = replay(proof);
    console.log(`${mode} seed ${seed}: score ${score} cars ${cars}, events ${proof.events.length / 3}, replay ${back.score} ${back.score === score ? 'SAME' : 'DIFFERENT'}`);
    if (back.score !== score) process.exitCode = 1;
    if (process.argv.includes('--golden') && mode === 'unlimited' && seed === 4242) writeFileSync(new URL('./proof-golden.json', import.meta.url), JSON.stringify({ proof, score }));
  }
} finally {
  await server.close();
}
