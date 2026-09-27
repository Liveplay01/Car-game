import { type Career, MASTERY_GOALS, MAX_CAR_SKINS, nextUpgradePrice, upgradeSteps } from '../core/career';
import { baseConfig } from '../core/config';
import { UPGRADES, type Upgrade, upgradeMaxSteps, upgradeUnlockLevel } from '../core/levels';
import { CATALOG, CHEST_NAMES, CHEST_ODDS, RARITIES, type ChestKind, type Cosmetic, type Rarity, VEHICLE_TYPE_NOTES } from '../core/loot';
import { h, icon, fmt } from './dom';
import { ICONS } from './icons';
import { carThumb, chestArt } from './art';

const coin = (): SVGSVGElement => {
  const svg = icon(ICONS.coin, { fill: true });
  svg.classList.add('coin');
  return svg;
};

const moneyChip = (career: Career): HTMLElement =>
  h('div', { class: 'money-chip', style: 'background:var(--surface-1)', 'aria-label': `Money ${fmt(career.money)}` }, coin(), h('span', { class: 'num' }, fmt(career.money)));

// MARK: Progress

export function renderProgress(el: HTMLElement, career: Career): void {
  const r = career.records;
  const records = h(
    'div',
    { class: 'records' },
    h('div', { class: 'record wide' }, h('div', {}, h('div', { class: 'record-label' }, 'Highscore'), h('div', { class: 'record-value' }, fmt(r.bestScore))), h('div', { class: 'record-label num' }, `Level ${career.level}`)),
    record('Unlimited best', fmt(r.unlimitedBest)),
    record('Most cars in Unlimited', fmt(r.unlimitedCars)),
    record('Shifts played', fmt(r.shiftsPlayed)),
    record('Shifts completed', fmt(career.mastery.shiftsCompleted)),
    record('Cars merged', fmt(r.totalMerges)),
    record('Perfect runs', fmt(r.perfectRuns)),
  );
  const goals = h(
    'div',
    { class: 'list' },
    ...MASTERY_GOALS.map((goal) => {
      const tier = career.masteryTiers[goal.id] ?? 0;
      const value = career.mastery[goal.stat];
      const next = goal.thresholds[Math.min(tier, goal.thresholds.length - 1)];
      const prev = tier === 0 ? 0 : goal.thresholds[tier - 1];
      const done = tier >= goal.thresholds.length;
      const share = done ? 1 : Math.max(0, Math.min(1, (value - prev) / (next - prev)));
      const bar = h('i');
      bar.style.transform = `scaleX(${share})`;
      return h(
        'div',
        { class: 'row' },
        h(
          'div',
          { class: 'row-main' },
          h('div', { class: 'row-title' }, goal.name),
          h('div', { class: 'row-sub num' }, done ? `${goal.unit}: ${fmt(value)} · all tiers done` : `${goal.unit}: ${fmt(value)} of ${fmt(next)}`),
          h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(share * 100) }, bar),
        ),
        h('div', { class: 'tiers', 'aria-label': `Tier ${tier} of 3` }, ...['I', 'II', 'III'].map((t, i) => h('span', { class: i < tier ? 'tier done' : 'tier' }, t))),
      );
    }),
  );
  el.replaceChildren(
    h(
      'div',
      { class: 'page-inner' },
      h('header', { class: 'page-head' }, h('h1', { class: 'page-title' }, 'Progress')),
      h('section', { class: 'section' }, h('h2', { class: 'section-title' }, 'Records'), records),
      h(
        'section',
        { class: 'section' },
        h('h2', { class: 'section-title' }, 'Achievements'),
        h('p', { class: 'section-note' }, 'Every tier brings a chest: Standard for tier I, Premium after that.'),
        goals,
      ),
    ),
  );
}

function record(label: string, value: string): HTMLElement {
  return h('div', { class: 'record' }, h('div', { class: 'record-value' }, value), h('div', { class: 'record-label' }, label));
}

// MARK: Build · Upgrades

const UPGRADE_TEXT: Record<Upgrade, [string, string, (steps: number) => string]> = {
  morePatrols: ['More Patrols', 'More police cars wait in your queue, so one is ready when a criminal shows up.', (n) => `+${pct(n * baseConfig.patrolsPerStep)} police cars`],
  longerPursuit: ['Longer Pursuit', 'Criminals take longer to get away, which leaves you more time to catch them.', (n) => `+${n * baseConfig.pursuitPerStep} s pursuit`],
  quietStreets: ['Quiet Streets', 'Some shifts come with no criminal at all.', (n) => `${pct(n * baseConfig.quietStreetsPerStep)} fewer criminal shifts`],
  interceptor: ['Interceptor', 'A police car right behind a criminal runs it down faster.', (n) => `+${pct(n * baseConfig.interceptorPerStep)} chase speed`],
  dispatchRadio: ['Dispatch Radio', 'Calling a police car to the front of the queue costs less of your combo.', (n) => `+${pct(n * baseConfig.dispatchRadioPerStep)} combo kept`],
  backup: ['Backup', 'Your shift survives one police car crash more.', (n) => `+${n} police crashes`],
  cashRoute: ['Cash Route', 'Money transporters show up sooner and more often.', (n) => `${(n * baseConfig.cashRoutePerStep).toFixed(1)} s sooner`],
  overtime: ['Overtime', 'Every shift you finish pays more.', (n) => `+${pct(n * baseConfig.overtimePerStep)} pay`],
  freight: ['Freight', 'More lorries on the road: denser traffic, heavier crashes.', (n) => `+${pct(n * baseConfig.freightPerStep)} lorries`],
  quickRecovery: ['Quick Recovery', 'Drivers pull away harder, so after a crash the traffic is back up to speed sooner.', (n) => `+${pct(n * baseConfig.recoveryPerStep)} acceleration`],
  doubleRun: ['Double Run', 'Sometimes a second money transporter follows right after the first.', (n) => `${pct(n * baseConfig.doubleRunPerStep)} chance`],
  insurance: ['Insurance', 'Pays part of what a crash costs from level 20 on.', (n) => `${pct(n * baseConfig.insurancePerStep)} covered`],
  robberyInsurance: ['Robbery Insurance', 'Pays part of what an escaped criminal costs from level 20 on.', (n) => `${pct(n * baseConfig.insurancePerStep)} covered`],
};

function pct(x: number): string {
  return `${Math.round(x * 100)} %`;
}

export function renderBuild(el: HTMLElement, career: Career, buy: (u: Upgrade) => void): void {
  const rows = UPGRADES.map((u) => {
    const [name, description, effect] = UPGRADE_TEXT[u];
    const steps = upgradeSteps(career, u);
    const max = upgradeMaxSteps[u];
    const unlock = upgradeUnlockLevel(u, baseConfig);
    const locked = career.level < unlock;
    const price = nextUpgradePrice(career, u);
    let action: HTMLElement;
    if (locked) {
      action = h('span', { class: 'lock' }, icon(ICONS.lock), `Level ${unlock}`);
    } else if (price === null) {
      action = h('span', { class: 'lock' }, icon(ICONS.check), 'Maxed');
    } else {
      action = h(
        'button',
        {
          class: 'btn buy',
          disabled: career.money < price,
          'aria-label': `Buy ${name} step ${steps + 1} for ${fmt(price)}`,
          onclick: () => buy(u),
        },
        coin(),
        h('span', { class: 'num' }, fmt(price)),
      );
    }
    return h(
      'div',
      { class: 'row' },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-title' }, name),
        h('div', { class: 'row-sub' }, description),
        h('div', { class: 'row-sub num', style: 'color:var(--primary);opacity:.8' }, steps > 0 ? `Now: ${effect(steps)}` : `Step 1: ${effect(1)}`),
        h('div', { class: 'steps', 'aria-label': `${steps} of ${max} steps` }, ...Array.from({ length: max }, (_, i) => h('i', { class: i < steps ? 'on' : '' }))),
      ),
      action,
    );
  });
  el.replaceChildren(
    h(
      'div',
      { class: 'page-inner' },
      h('header', { class: 'page-head' }, h('h1', { class: 'page-title' }, 'Upgrades'), moneyChip(career)),
      h(
        'section',
        { class: 'section' },
        h('p', { class: 'section-note', style: 'margin-top:0' }, 'Every step changes all shifts to come. Earn money by finishing shifts and escorting money transporters.'),
        h('div', { class: 'list' }, ...rows),
      ),
    ),
  );
}

// MARK: Shop

export type Shelf = Rarity | 'special';
const SHELF_NAMES: Record<Shelf, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legend', special: 'Special' };
const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

export interface ShopActions {
  buyChest(kind: 'standard' | 'premium'): void;
  openOwned(index: number): void;
  toggleSkin(item: Cosmetic): void;
  seen(id: string): void;
  shelf: Shelf;
  setShelf(shelf: Shelf): void;
}

const shelfItems = (shelf: Shelf): Cosmetic[] =>
  shelf === 'special' ? CATALOG.filter((c) => c.kind === 'vehicleType') : CATALOG.filter((c) => c.kind === 'carSkin' && c.rarity === shelf);

export function renderShop(el: HTMLElement, career: Career, actions: ShopActions): void {
  const offers = (['standard', 'premium'] as const).map((kind) => {
    const price = kind === 'standard' ? baseConfig.standardChestPrice : baseConfig.premiumChestPrice;
    const odds = CHEST_ODDS[kind];
    return h(
      'div',
      { class: 'chest-offer' },
      chestArt(kind),
      h(
        'div',
        {},
        h('div', { class: 'row-title' }, CHEST_NAMES[kind]),
        h(
          'div',
          { class: 'odds', 'aria-label': 'Odds' },
          ...RARITIES.map((r, i) => h('span', {}, h('b', { style: `color:${RARITY_COLOR[r]}` }, SHELF_NAMES[r]), ` ${Math.round(odds[i] * 100)} %`)),
        ),
        h(
          'button',
          { class: 'btn buy', disabled: career.money < price, onclick: () => actions.buyChest(kind), 'aria-label': `Buy ${CHEST_NAMES[kind]} for ${fmt(price)}` },
          coin(),
          h('span', { class: 'num' }, fmt(price)),
        ),
      ),
    );
  });

  const owned = career.chests.length
    ? h(
        'section',
        { class: 'section' },
        h('h2', { class: 'section-title' }, 'Your chests'),
        h(
          'div',
          { class: 'inventory' },
          ...career.chests.map((kind: ChestKind, i) =>
            h('button', { class: 'inv-chest', onclick: () => actions.openOwned(i), 'aria-label': `Open ${CHEST_NAMES[kind]}` }, chestArt(kind), h('span', {}, CHEST_NAMES[kind]), h('em', {}, 'Open')),
          ),
        ),
      )
    : null;

  const shelves: Shelf[] = ['common', 'rare', 'epic', 'legendary', 'special'];
  const chips = h(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'Shelves' },
    ...shelves.map((s) => {
      const items = shelfItems(s);
      const have = items.filter((i) => career.collection.includes(i.id)).length;
      return h(
        'button',
        { class: 'chip', 'aria-pressed': String(actions.shelf === s), onclick: () => actions.setShelf(s) },
        SHELF_NAMES[s],
        h('small', {}, `${have}/${items.length}`),
      );
    }),
  );
  const items = shelfItems(actions.shelf).map((item) => {
    const have = career.collection.includes(item.id);
    const worn = career.carSkins.includes(item.id);
    const isNew = career.unseen.includes(item.id);
    const rarity = h('span', { class: 'rarity-bar', 'aria-hidden': 'true' });
    rarity.style.background = RARITY_COLOR[item.rarity];
    const img = h('img', { src: carThumb(item), alt: '', width: 96, height: 64, loading: 'lazy', decoding: 'async' });
    let label: string;
    if (!have) label = `${item.name}, not collected yet`;
    else if (item.kind === 'vehicleType') label = `${item.name}, in your queue. ${VEHICLE_TYPE_NOTES[item.id] ?? ''}`;
    else label = `${item.name}, ${worn ? 'worn, tap to take off' : 'tap to wear'}`;
    return h(
      'button',
      {
        class: `item${have ? '' : ' locked'}${worn ? ' worn' : ''}`,
        disabled: !have,
        'aria-label': label,
        'aria-pressed': item.kind === 'carSkin' && have ? String(worn) : undefined,
        title: item.kind === 'vehicleType' ? VEHICLE_TYPE_NOTES[item.id] : undefined,
        onclick: () => {
          if (isNew) actions.seen(item.id);
          if (item.kind === 'carSkin') actions.toggleSkin(item);
        },
      },
      rarity,
      isNew ? h('span', { class: 'new' }, 'NEW') : null,
      worn ? h('span', { class: 'worn-mark' }, icon(ICONS.check)) : null,
      img,
      h('span', { class: 'name' }, have ? item.name : '???'),
    );
  });
  const wornCount = career.carSkins.length;
  el.replaceChildren(
    h(
      'div',
      { class: 'page-inner' },
      h('header', { class: 'page-head' }, h('h1', { class: 'page-title' }, 'Shop'), moneyChip(career)),
      owned,
      h(
        'section',
        { class: 'section' },
        h('h2', { class: 'section-title' }, 'Chests'),
        h('p', { class: 'section-note' }, 'Looks only, no advantage. At the latest every 10th chest is Epic or better; a duplicate turns into money.'),
        ...offers,
      ),
      h(
        'section',
        { class: 'section' },
        h('h2', { class: 'section-title' }, 'Collection'),
        h(
          'p',
          { class: 'section-note' },
          actions.shelf === 'special'
            ? 'Car types join your queue once collected: different, not better.'
            : `Wear up to ${MAX_CAR_SKINS} skins at once; every car on the road wears one of them. ${wornCount}/${MAX_CAR_SKINS} worn.`,
        ),
        chips,
        h('div', { class: 'shelf' }, ...items),
      ),
    ),
  );
}
