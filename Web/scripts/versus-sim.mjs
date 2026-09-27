// Headless multiplayer check: four lanes played by bots.
//   node scripts/versus-sim.mjs [matches]
// Careful bots must never be out for a crash; a random lane must go out; the same seed and
// the same taps must give the same match (everyone runs their own copy of the world).
import { createServer } from 'vite';

const matches = Number(process.argv[2] ?? 20);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { versusConfig } = await server.ssrLoadModule('/src/core/versus.ts');

  // Like a person: waits while wrecks lie on the ring, then only takes a comfortable gap.
  const careful = (world, q) => q.isReady && !world.isTrafficDisturbed && world.predictedMergeGap(world.armOf(q), 0, 40) > 0.2;

  /** Plays a match; `random` seats tap at random. Returns who went out, why, and a fingerprint. */
  const play = (seed, players, random, rolls) => {
    const world = new World(versusConfig(players, seed), seed);
    const out = [];
    let winner;
    let roll = 0;
    for (let i = 0; i < 120 * 120 && winner === undefined; i++) {
      for (const q of world.seats) {
        if (q.out) continue;
        const r = rolls[roll++ % rolls.length];
        if (random.includes(q.seat) ? q.isReady && r < 0.02 : careful(world, q)) world.tap(world.time, q.seat);
      }
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'faulted') world.eliminate(e.seat, 'crash', world.time);
        if (e.type === 'eliminated') out.push(`${e.seat}:${e.reason}`);
        if (e.type === 'matchOver') winner = e.winner;
      }
      for (const seat of world.stalledSeats) world.eliminate(seat, 'stalled', world.time);
      for (const e of world.takeEvents()) {
        if (e.type === 'eliminated') out.push(`${e.seat}:${e.reason}`);
        if (e.type === 'matchOver') winner = e.winner;
      }
    }
    const print = world.vehicles.map((v) => `${v.id}:${v.position.x.toFixed(6)},${v.position.y.toFixed(6)}`).join('|');
    return { out, winner, time: world.time, print, sent: world.shift.carsSent };
  };

  const rolls = Array.from({ length: 997 }, () => Math.random());
  let carefulCrashes = 0;
  let randomOut = 0;
  let deterministic = 0;
  for (let m = 0; m < matches; m++) {
    const seed = (Math.random() * 2 ** 32) >>> 0;
    const a = play(seed, 4, [3], rolls);
    const b = play(seed, 4, [3], rolls);
    if (a.print === b.print && a.out.join() === b.out.join()) deterministic++;
    carefulCrashes += a.out.filter((x) => x !== '3:crash' && x.endsWith(':crash')).length;
    if (a.out.some((x) => x.startsWith('3:'))) randomOut++;
    console.log(`match ${m + 1}: ${a.out.join(' ') || '-'} winner=${a.winner ?? 'none'} t=${a.time.toFixed(1)}s cars=${a.sent}`);
  }
  console.log(`\ncareful bots out by crash: ${carefulCrashes} (lanes 0-2 may be hit by lane 3's wrecks)`);
  console.log(`random lane out: ${randomOut}/${matches}`);
  console.log(`deterministic: ${deterministic}/${matches}`);
} finally {
  await server.close();
}
