// Headless multiplayer check: four lanes played by bots.
//   node scripts/versus-sim.mjs [matches]
// Bot lanes (the lobby's bots, `VersusBot`) must never be out for a crash; a random lane must
// go out; the same seed and the same taps must give the same match (everyone runs their own
// copy of the world). Taps land `INPUT_DELAY` steps late, as over the network.
import { createServer } from 'vite';

const matches = Number(process.argv[2] ?? 20);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { World } = await server.ssrLoadModule('/src/core/world.ts');
  const { versusConfig, VersusBot, INPUT_DELAY, standings } = await server.ssrLoadModule('/src/core/versus.ts');
  const { substream } = await server.ssrLoadModule('/src/core/rng.ts');

  /** Plays a match; `random` seats tap at random. Returns who went out, why, and a fingerprint. */
  const play = (seed, players, random, rolls) => {
    const world = new World(versusConfig(players, seed), seed);
    const bots = world.seats.map((q) => new VersusBot(q.seat, substream(seed, 0xb0770 + q.seat)));
    const pending = [];
    const out = [];
    const events = { phases: 0, shields: 0, shielded: 0, rivals: 0 };
    let winner;
    let roll = 0;
    const take = () => {
      for (const e of world.takeEvents()) {
        if (e.type === 'faulted') world.eliminate(e.seat, 'crash', world.time);
        if (e.type === 'eliminated') out.push(`${e.seat}:${e.reason}@${e.time.toFixed(0)}`);
        if (e.type === 'matchOver') winner = e.winner;
        if (e.type === 'versusPhase') events.phases++;
        if (e.type === 'shieldGained') events.shields++;
        if (e.type === 'shielded') events.shielded++;
        if (e.type === 'rivalSent') events.rivals++;
      }
    };
    for (let i = 0; i < 180 * 120 && winner === undefined; i++) {
      for (const q of world.seats) {
        if (q.out) continue;
        const r = rolls[roll++ % rolls.length];
        const taps = random.includes(q.seat) ? q.isReady && r < 0.02 : bots[q.seat].decide(world);
        if (taps) pending.push([world.stepCount + INPUT_DELAY, q.seat]);
      }
      while (pending.length > 0 && pending[0][0] <= world.stepCount) world.tap(world.time, pending.shift()[1]);
      world.step();
      take();
      for (const seat of world.stalledSeats) world.eliminate(seat, 'stalled', world.time);
      take();
    }
    const print = world.vehicles.map((v) => `${v.id}:${v.position.x.toFixed(6)},${v.position.y.toFixed(6)}`).join('|');
    const table = standings(world).map((s) => `${s.seat}:${s.place}/${s.points}`).join(' ');
    return { out, winner, time: world.time, print, sent: world.shift.carsSent, events, table };
  };

  const rolls = Array.from({ length: 997 }, () => Math.random());
  let botCrashes = 0;
  let botStalls = 0;
  let randomOut = 0;
  let deterministic = 0;
  let suddenDeath = 0;
  let rivals = 0;
  let shields = 0;
  for (let m = 0; m < matches; m++) {
    const seed = (Math.random() * 2 ** 32) >>> 0;
    const a = play(seed, 4, [3], rolls);
    const b = play(seed, 4, [3], rolls);
    if (a.print === b.print && a.out.join() === b.out.join()) deterministic++;
    botCrashes += a.out.filter((x) => !x.startsWith('3:') && x.includes(':crash')).length;
    botStalls += a.out.filter((x) => !x.startsWith('3:') && x.includes(':stalled')).length;
    if (a.out.some((x) => x.startsWith('3:'))) randomOut++;
    if (a.events.phases >= 2) suddenDeath++;
    rivals += a.events.rivals;
    shields += a.events.shields;
    console.log(
      `match ${m + 1}: ${a.out.join(' ') || '-'} winner=${a.winner ?? 'none'} t=${a.time.toFixed(1)}s cars=${a.sent} lorries=${a.events.rivals} shields=${a.events.shields}/${a.events.shielded} [${a.table}]`,
    );
  }
  console.log(`\nbot lanes out by crash: ${botCrashes} (lanes 0-2 may be hit by lane 3's wrecks)`);
  console.log(`bot lanes out by stall: ${botStalls}`);
  console.log(`random lane out: ${randomOut}/${matches}`);
  console.log(`reached sudden death: ${suddenDeath}/${matches}, lorries sent: ${rivals}, shields earned: ${shields}`);
  console.log(`deterministic: ${deterministic}/${matches}`);
} finally {
  await server.close();
}
