// What the Auction House costs (core/auction.ts, LOOT.md): a bidder with a limit, in multiples of the
// estimate, bids the least until the price would pass it, then walks away. The sink is meant to be
// big: the sharks push the price far over the estimate. This prints how often each limit wins and
// what a win costs, and fails when the room stops being a sink or stops ever being a bargain.
//   node scripts/auction-sim.mjs [auctions]
import { createServer } from 'vite';

const auctions = Number(process.argv[2] ?? 20000);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let failed = false;
const check = (label, value, lo, hi) => {
  const ok = value >= lo && value <= hi;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(44)} ${value.toFixed(3)}   (${lo} … ${hi})`);
};

try {
  const { Auction } = await server.ssrLoadModule('/src/core/auction.ts');
  const { newCareer } = await server.ssrLoadModule('/src/core/career.ts');

  const play = (limit, seed) => {
    const c = newCareer();
    c.casinoSeed = seed;
    c.level = 60;
    c.money = 1e12;
    const day = 20000 + (seed % 400);
    Auction.today(c, day);
    const run = Auction.begin(c, seed % 3, day);
    if (!run) return null;
    for (;;) {
      const bid = Auction.minBid(run);
      if (bid > limit * run.estimate) {
        Auction.walk(run);
        return { won: false, ratio: 0 };
      }
      Auction.bid(c, run, bid);
      if (run.phase === 'won') return { won: true, ratio: run.price / run.estimate, paid: run.paid, price: run.price };
    }
  };

  const rates = {};
  for (const limit of [1, 1.5, 2, 3, 4]) {
    let won = 0;
    let ratio = 0;
    for (let i = 0; i < auctions; i++) {
      const r = play(limit, (i * 2654435761 + 1) >>> 0);
      if (r?.won) {
        won++;
        ratio += r.ratio;
      }
    }
    rates[limit] = won / auctions;
    console.log(`     limit ${limit}× the estimate: wins ${(rates[limit] * 100).toFixed(1)} %, a win costs ${won ? (ratio / won).toFixed(2) : '–'}× (premium on top)`);
  }
  // A bidder who stops at the estimate sometimes gets a bargain, and one who pays up to 4× nearly always wins.
  check('a bidder who stops at 1× wins now and then', rates[1], 0.005, 0.25);
  check('a bidder who goes to 2× wins less than half', rates[2], 0.02, 0.5);
  check('a bidder who goes to 4× nearly always wins', rates[4], 0.95, 1);

  // The same seed plays out the same.
  check('same seed, same auction', Number(JSON.stringify(play(2, 12345)) === JSON.stringify(play(2, 12345))), 1, 1);
  console.log(failed ? '\nFAILED' : '\nall fine');
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
