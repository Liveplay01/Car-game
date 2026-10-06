// Fairness check of the casino (core/casino.ts, LOOT.md): every game returns what the odds in
// the sheets promise, the coin is a fair coin, and the same round draws the same outcome.
//   node scripts/casino-sim.mjs [rounds]
// Fails (exit 1) when a return leaves its band.
import { createServer } from 'vite';

const rounds = Number(process.argv[2] ?? 1_000_000);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let failed = false;
const check = (label, value, lo, hi) => {
  const ok = value >= lo && value <= hi;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(34)} ${value.toFixed(4)}   (${lo.toFixed(3)} … ${hi.toFixed(3)})`);
};

try {
  const { Casino } = await server.ssrLoadModule('/src/core/casino.ts');
  const { newCareer } = await server.ssrLoadModule('/src/core/career.ts');
  const { baseConfig: config } = await server.ssrLoadModule('/src/core/config.ts');
  const { COSMETICS } = await server.ssrLoadModule('/src/core/loot.ts');
  const edge = 1 - config.crashEdge;

  // Slots: exact, by every stop of every reel.
  const slots = Casino.slotRtp(config);
  check('Slots return (exact)', slots.rtp, 0.94, 0.96);
  console.log(`     Slots hit rate                     ${slots.hit.toFixed(4)}   (one win in ${(1 / slots.hit).toFixed(1)} spins)`);

  // Slots: played through the career, to check the booking matches the table.
  {
    const c = newCareer();
    c.casinoSeed = 12345;
    c.money = rounds * 100;
    let paid = 0;
    for (let i = 0; i < rounds / 4; i++) {
      c.casinoPending = null;
      paid += Casino.spin(c, 100, 0, config).win;
    }
    check('Slots return (played)', paid / (100 * (rounds / 4)), slots.rtp - 0.02, slots.rtp + 0.02);
  }

  // Crash: whatever the target, a cash-out returns 1 − edge.
  for (const target of [1.5, 2, 3, 10, 50]) {
    let paid = 0;
    for (let i = 0; i < rounds; i++) if (Casino.crashPoint((i * 2654435761) >>> 0, config) >= target) paid += target;
    const band = target >= 10 ? 0.03 : 0.01;
    check(`Crash return, cash out at ${target}×`, paid / rounds, edge - band, edge + band);
  }
  {
    let instant = 0;
    for (let i = 0; i < rounds; i++) if (Casino.crashPoint((i * 2654435761) >>> 0, config) === 1) instant++;
    console.log(`     Crash at 1.00×                     ${(instant / rounds).toFixed(4)}`);
  }
  // Crash through the career: the cash-out rule agrees with the crash point.
  {
    const c = newCareer();
    c.casinoSeed = 777;
    c.money = rounds * 100;
    let paid = 0;
    const n = rounds / 4;
    for (let i = 0; i < n; i++) {
      Casino.startCrash(c, 100, 0, config);
      paid += Casino.cashOut(c, 2, 0, config);
      Casino.collect(c);
    }
    check('Crash return (played, 2×)', paid / (100 * n), edge - 0.02, edge + 0.02);
  }

  // Skin upgrade: won value over staked value, away from the chance cap.
  {
    const common = COSMETICS.filter((x) => x.source.kind === 'chest' && x.kind === 'carSkin' && x.rarity === 'common').map((x) => x.id);
    const epic = COSMETICS.find((x) => x.source.kind === 'chest' && x.kind === 'carSkin' && x.rarity === 'epic').id;
    let staked = 0;
    let won = 0;
    const n = rounds / 10;
    for (let i = 0; i < n; i++) {
      const c = newCareer();
      c.casinoSeed = i * 7919;
      c.collection = common.slice(0, 3);
      const r = Casino.upgrade(c, common.slice(0, 3), epic, 0, config);
      staked += 3 * config.skinValue.common;
      if (r.won) won += config.skinValue.epic;
    }
    check('Upgrade return (3 common → epic)', won / staked, 1 - config.upgradeEdge - 0.02, 1 - config.upgradeEdge + 0.02);
  }

  // Skin upgrade with an ad's boost (+upgradeAdBoost): the dial shows chance + boost, it is spent by one round, and the draw follows it.
  {
    const common = COSMETICS.filter((x) => x.source.kind === 'chest' && x.kind === 'carSkin' && x.rarity === 'common').map((x) => x.id);
    const epic = COSMETICS.find((x) => x.source.kind === 'chest' && x.kind === 'carSkin' && x.rarity === 'epic').id;
    const chance = (3 * config.skinValue.common) / config.skinValue.epic * (1 - config.upgradeEdge) + config.upgradeAdBoost;
    let staked = 0;
    let won = 0;
    const n = rounds / 10;
    for (let i = 0; i < n; i++) {
      const c = newCareer();
      c.casinoSeed = i * 7919;
      c.collection = common.slice(0, 3);
      c.upgradeBoost = true;
      const r = Casino.upgrade(c, common.slice(0, 3), epic, 0, config);
      if (c.upgradeBoost || !r.boosted || Math.abs(r.chance - chance) > 1e-9) check('Upgrade boost is spent and shown in the chance', 0, 1, 1);
      staked += 3 * config.skinValue.common;
      if (r.won) won += config.skinValue.epic;
    }
    check('Upgrade return with the ad boost (3 common → epic)', won / staked, (chance * config.skinValue.epic) / (3 * config.skinValue.common) - 0.03, (chance * config.skinValue.epic) / (3 * config.skinValue.common) + 0.03);
  }

  // Roundabout Roulette: whatever the bet, 1 − edge back (exact by the exits, then played).
  for (const bet of ['car', 'compact', 'van', 'sportsCar', 'boss']) {
    const exact = Casino.rouletteChance(bet, config) * Casino.roulettePay(bet, config);
    check(`Roulette return (exact, ${bet})`, exact, 1 - config.rouletteEdge - 1e-9, 1 - config.rouletteEdge + 1e-9);
    const c = newCareer();
    c.casinoSeed = 31337;
    c.money = rounds * 100;
    const n = rounds / 4;
    let paid = 0;
    for (let i = 0; i < n; i++) {
      c.casinoPending = null;
      const spin = Casino.roulette(c, 100, bet, 0, config);
      if (spin.won && spin.pay < 2) check('Roulette win pays at least twice the stake', spin.pay, 2, Infinity);
      paid += spin.win;
    }
    const band = bet === 'boss' ? 0.12 : 0.04;
    check(`Roulette return (played, ${bet})`, paid / (100 * n), 1 - config.rouletteEdge - band, 1 - config.rouletteEdge + band);
  }

  // Scratch Card: the exact return, then played; a win shows its multiple three times, nothing else more than twice.
  {
    check('Scratch return (exact)', Casino.scratchRtp(config), 0.849, 0.851);
    const c = newCareer();
    c.casinoSeed = 2468;
    c.money = 0;
    const n = rounds / 4;
    let paid = 0;
    let broken = 0;
    for (let i = 0; i < n; i++) {
      c.casinoPending = null;
      c.scratchCards = 1;
      const card = Casino.scratch(c, 0, config);
      paid += card.win;
      const counts = new Map();
      for (const x of card.cells) counts.set(x, (counts.get(x) ?? 0) + 1);
      const triples = [...counts].filter(([, k]) => k >= 3);
      if (card.x > 0 ? triples.length !== 1 || triples[0][0] !== card.x || triples[0][1] !== 3 : triples.length > 0) broken++;
    }
    check('Scratch return (played)', paid / (config.scratchPrice * n), 0.85 - 0.06, 0.85 + 0.06);
    check('Scratch cards that break the three-alike rule', broken, 0, 0);
  }

  // Double or nothing: a fair coin.
  {
    const c = newCareer();
    c.casinoSeed = 4242;
    let heads = 0;
    const n = rounds / 2;
    for (let i = 0; i < n; i++) {
      c.money = 1000;
      c.casinoPending = { k: 'win', game: 'slots', money: 100, items: [], flips: 0 };
      if (Casino.flip(c, 0, config).won) heads++;
    }
    check('Coin: share of wins', heads / n, 0.498, 0.502);
  }

  // The same round draws the same outcome.
  {
    const a = newCareer();
    const b = newCareer();
    a.casinoSeed = b.casinoSeed = 99;
    a.money = b.money = 10_000;
    const same = JSON.stringify(Casino.spin(a, 100, 0, config)) === JSON.stringify(Casino.spin(b, 100, 0, config));
    if (!same) failed = true;
    console.log(`${same ? 'ok  ' : 'FAIL'} Same seed, same spin`);
  }
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
