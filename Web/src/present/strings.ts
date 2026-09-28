import type { Config, Weather, CityEvent, BossKind, LegendaryRule } from '../core/config';
import type { Upgrade } from '../core/levels';
import type { MasteryGoal, MasteryCompletion } from '../core/career';
import { MASTERY_THRESHOLDS } from '../core/career';
import type { SwipeMode } from './flow';
import type { Rarity, ChestKind, Cosmetic, ChestOpening, Album } from '../core/loot';
import type { Challenge } from '../core/daily';
import type { StoreProduct } from '../core/store';
import { productGrant } from '../core/store';
import type { VehicleType, VehicleRole } from '../core/vehicle';
import { type Trial, type TrialId, type RunId, type EliteKind, rematchKind } from '../core/trials';
import { MONEY_MARK } from './icons';

/** Every text the game shows (`Strings.swift`). English only. */

/** Numbers in the device's format: 1,000 or 1.000. */
const grouping = (() => {
  try {
    const parts = new Intl.NumberFormat(undefined).formatToParts(12345);
    return parts.find((p) => p.type === 'group')?.value ?? ',';
  } catch {
    return ',';
  }
})();

export const Fmt = {
  number(value: number): string {
    const n = Math.round(value);
    const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, grouping);
    return n < 0 ? '−' + digits : digits;
  },
  signed: (value: number): string => (value > 0 ? '+' + Fmt.number(value) : Fmt.number(value)),
  seconds(seconds: number): string {
    const tenths = Math.round(Math.max(0, seconds) * 10);
    return `${Fmt.number(Math.floor(tenths / 10))}.${tenths % 10} s`;
  },
};

export const money = (formatted: string): string => `${MONEY_MARK}${formatted}`;
export const percent = (share: number): string => `${Math.round(share * 100)} %`;
const secondsText = (value: number): string => (value === Math.round(value) ? `${value} s` : `${value} s`);
export const multiplier = (value: number): string => `${value === Math.round(value) ? String(value) : String(+value.toFixed(2))}×`;
export const comboMultiplier = (value: number): string => `×${value === Math.round(value) ? String(value) : String(+value.toFixed(2))}`;

export const S = {
  gameTitle: 'Car Game',

  tutorial: {
    sendCar: 'Tap to send your first car',
    findGap: 'Wait for a gap, then tap',
    combo: 'Clean merges build your combo',
    strikes: (police: number): string => `Cars crash instantly. Police get ${police} chances.`,
  },

  settings: {
    imported: (level: number): string => `Progress imported · Level ${level}`,
  },

  /** Challenge links and mastery trials: shifts that are played for themselves. */
  run: {
    challenge: 'CHALLENGE',
    trial: 'TRIAL',
    fromFriend: 'A friend’s shift · same traffic for everyone',
    beat: (target: string, mayhem: boolean): string => (mayhem ? `Beat ${target} flames` : `Beat ${target}`),
    toBeat: 'TO BEAT',
    beaten: 'CHALLENGE BEATEN',
    missed: 'NOT QUITE',
    ahead: (n: string): string => `${n} ahead · send it back`,
    short: (n: string): string => `${n} short`,
    again: 'Tap to try again',
    passed: 'TRIAL PASSED',
    failed: 'TRIAL FAILED',
    passedBefore: 'Passed before · no second reward',
    rewardCaption: 'REWARD',
    brokenLink: 'That challenge link is broken or cut short.',
    copied: 'Challenge link copied',
    shareText: (target: string): string => `Can you beat ${target} on my roundabout?`,
  },

  trials: {
    name(id: RunId): string {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'weekly') return S.weekly.title;
      return {
        tightSqueeze: 'Tight Squeeze',
        deadCentre: 'Dead Centre',
        cleanSheet: 'Clean Sheet',
        blackout: 'Blackout',
        stormWatch: 'Storm Watch',
        marathon: 'Marathon',
        mostWanted: 'Most Wanted',
      }[id as TrialId];
    },
    goal(t: Trial): string {
      if (t.elite) return S.weekly.goal(t);
      const boss = rematchKind(t.id);
      if (boss) return `${S.boss.name(boss)} again: more escorts, less time`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.cars} cars, every merge a Tight Fit or better`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Perfect merges in ${t.cars} cars`;
        case 'cleanSheet':
          return `${t.cars} cars, no crash and no cut-off`;
        case 'blackout':
          return `${t.cars} cars at night, the street lamps out`;
        case 'stormWatch':
          return `${t.cars} cars through a storm at night`;
        case 'marathon':
          return `${t.cars} cars in one shift`;
        case 'mostWanted':
          return 'Take down the syndicate boss';
        default:
          return '';
      }
    },
    level: (l: number): string => `Level ${l}`,
    passed: 'PASSED',
    play: 'Play',
  },

  boss: {
    incoming: 'SYNDICATE CONVOY',
    /** The warning over the arm: which boss is coming. */
    arriving: (k: BossKind): string =>
      ({ convoy: 'SYNDICATE CONVOY', getaway: 'GETAWAY DRIVER', armoured: 'ARMOURED BOSS', phantom: 'THE PHANTOM' })[k],
    name: (k: BossKind): string => ({ convoy: 'The Convoy', getaway: 'The Getaway Driver', armoured: 'The Armoured Boss', phantom: 'The Phantom' })[k],
    /** What each boss asks of you, in the Bosses list. */
    tactic: (k: BossKind): string =>
      ({
        convoy: 'Escorts right behind it: time a police car into the gap.',
        getaway: 'No escorts, but gone in seconds: have a police car ready.',
        armoured: 'Shrugs off the first ram: a second police car finishes it.',
        phantom: 'A blackout, and it drives without lights: follow the ring.',
      })[k],
    rematch: (k: BossKind): string => `Rematch · ${S.boss.name(k)}`,
    firstAt: (level: number): string => `First at Level ${level}`,
    beaten: 'Busted',
    notMet: 'Not met yet',
    armour: 'ARMOUR CRACKED',
    heist: (amount: string): string => `HEIST RECOVERED ${amount}`,
    escaped: 'BOSS ESCAPED',
    wanted: (seconds: number): string => `BOSS ${Math.ceil(Math.max(0, seconds))}`,
    busted: (amount: string): string => `Boss busted · ${amount} recovered`,
    label: (role: VehicleRole): string | null => (role === 'boss' ? 'BOSS' : role === 'escort' ? 'ESCORT' : null),
  },

  legendary: {
    caption: 'LEGENDARY SHIFT',
    name: (r: LegendaryRule): string =>
      ({ gridlock: 'Gridlock', dragnet: 'Dragnet', heavyLoad: 'Heavy Load', darkStorm: 'Dark Storm', zeroTolerance: 'Zero Tolerance' })[r],
    line: (r: LegendaryRule): string =>
      ({
        gridlock: 'Rush hour from the first car',
        dragnet: 'Criminals twice as often',
        heavyLoad: 'Lorries everywhere, half of them gas',
        darkStorm: 'A storm in a blackout',
        zeroTolerance: 'One crash or cut-off ends it',
      })[r],
    reward: 'REWARD',
    chest: 'Premium',
    done: (item: string | null): string => `LEGENDARY SHIFT DONE · PREMIUM CHEST${item ? ` · ${S.shop.item(item)} unlocked` : ''}`,
    broken: 'RULE BROKEN',
  },

  weekly: {
    title: 'Weekly Elite',
    caption: 'WEEKLY ELITE',
    elite: (e: EliteKind): string =>
      ({ flawless: 'Flawless', precision: 'Precision', storm: 'Storm Front', gridlock: 'Gridlock', dragnet: 'Dragnet', boss: 'Boss Hunt' })[e],
    goal(t: Trial): string {
      switch (t.elite) {
        case 'flawless':
          return `Level ${t.level} · ${t.cars} cars, no crash and no cut-off`;
        case 'precision':
          return `Level ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Perfect merges in ${t.cars} cars`;
        case 'storm':
          return `Level ${t.level} · ${t.cars} cars through a storm at night`;
        case 'gridlock':
          return `Level ${t.level} · ${t.cars} cars in rush hour from the start`;
        case 'dragnet':
          return `Level ${t.level} · ${t.cars} cars, criminals twice as often`;
        case 'boss':
          return `Level ${t.level} · take down the syndicate boss`;
        default:
          return '';
      }
    },
    daysLeft: (n: number): string => (n === 1 ? 'last day' : `${n} days left`),
    hint: 'The same shift for everyone this week. Play it as often as you like; it pays once.',
    done: (m: string): string => `WEEKLY ELITE DONE · +${money(m)} · PREMIUM CHEST`,
    passedThisWeek: 'Passed this week · new one on Monday',
  },

  prestige: {
    title: 'Prestige',
    caption: (rank: number): string => `★${rank}`,
    ready: (level: number): string => `Level ${level} reached: start over at Level 1 on a harder road`,
    locked: (level: number): string => `Reach Level ${level} to start over on a harder road`,
    keeps: 'Money, upgrades, roads and collection stay. Looks only, never a bonus.',
    confirm: 'Tap again to prestige · back to Level 1',
    done: (rank: number, item: string | null): string => `PRESTIGE ★${rank}${item ? ` · ${S.shop.item(item)} unlocked` : ''}`,
    headStart: (levels: number): string => `Traffic runs ${levels} levels harder`,
  },

  ambulance: {
    incoming: 'AMBULANCE',
    blocked: 'BLOCKED',
    clear: (amount: string): string => `CLEAR ROAD ${amount}`,
    lost: 'AMBULANCE LOST',
  },

  modes: {
    name: (m: SwipeMode): string => (m === 'shift' ? 'SHIFT' : m === 'unlimited' ? 'UNLIMITED' : m === 'mayhem' ? 'MAYHEM' : 'MULTIPLAYER'),
    line: (m: SwipeMode): string =>
      m === 'shift' ? 'Clear the level, move up' : m === 'unlimited' ? 'Endless · until you crash' : m === 'mayhem' ? '12 cars · aim for the tankers' : 'Up to 4 friends · last one standing',
    unlimitedCaption: 'UNLIMITED',
    endless: '∞',
    versusPlayers: '2–4',
    runOver: 'RUN OVER',
    again: 'Tap for another run',
    carsSent: (n: number): string => (n === 1 ? '1 car' : `${n} cars`),
  },

  mayhem: {
    caption: 'MAYHEM',
    flames: 'FLAMES',
    cars: 'CARS',
    chain: (n: number): string => `CHAIN ×${n}`,
    over: 'MAYHEM OVER',
    again: 'Tap for more mayhem',
    summary: (wrecks: number, chain: number): string => `${wrecks} ${wrecks === 1 ? 'wreck' : 'wrecks'} · biggest chain ×${chain}`,
    popup: (flames: number): string => `+${flames}`,
  },

  ready: {
    tapToStart: 'Tap to start',
    tapForFriends: 'Tap to play with friends',
    levelCaption: (level: number, prestige = 0): string => (prestige > 0 ? `★${prestige} · LEVEL ${level}` : `LEVEL ${level}`),
    conditions(weather: Weather, event: CityEvent | null, night = false, blackout = false): string | null {
      const parts = [blackout ? S.blackout : night ? S.night : null, weather === 'clear' ? null : S.weather(weather), event ? S.cityEvent(event) : null].filter((x): x is string => !!x);
      return parts.length ? parts.join(' · ') : null;
    },
  },

  tabs: {
    progress: 'Progress',
    game: 'Game',
    shop: 'Shop',
    build: 'Build',
  },

  progress: {
    section: (i: number): string => ['Records', 'Quests', 'Trials', 'Bosses', 'Mastery'][i],
    bosses: 'Syndicate bosses',
    prestige: 'Prestige',
    legendary: 'Legendary shifts',
    weeklies: 'Weekly Elites',
    ambulances: 'Ambulances cleared',
    highscore: 'Highscore',
    level: 'Level reached',
    bestCombo: 'Best combo',
    bestChain: 'Longest Perfect Chain',
    streak: 'Daily streak',
    shiftsPlayed: 'Shifts played',
    shiftsCompleted: 'Shifts completed',
    takedowns: 'Takedowns',
    transporters: 'Transporters paid',
    unlimitedBest: 'Unlimited best',
    unlimitedCars: 'Unlimited cars',
    mayhemBest: 'Mayhem flames',
    mayhemChain: 'Mayhem chain',
    perfects: 'Perfect Inputs',
    chestsOpened: 'Chests opened',
    collection: 'Collection',
    none: '–',
    days: (d: number): string => (d === 1 ? '1 day' : `${d} days`),
    owned: (o: number, t: number): string => `${o} / ${t}`,
    questsHint: 'Quests pay once each and change at midnight.',
  },

  store: {
    name(p: StoreProduct): string {
      switch (p) {
        case 'starterPack':
          return 'Starter Pack';
        case 'cashSmall':
          return 'Pile of Cash';
        case 'cashMedium':
          return 'Bag of Cash';
        case 'cashLarge':
          return 'Vault of Cash';
        case 'premiumChests':
          return '3 Premium Chests';
        case 'noAds':
          return 'No Ads';
        case 'cashBoost':
          return 'Cash Boost';
      }
    },
    detail(p: StoreProduct, c: Config): string {
      const grant = productGrant(p, c);
      switch (p) {
        case 'starterPack':
          return `+${money(Fmt.number(grant.money))} · Premium + 2 Standard chests · once only`;
        case 'cashSmall':
        case 'cashMedium':
        case 'cashLarge':
          return `+${money(Fmt.number(grant.money))}`;
        case 'premiumChests':
          return 'Epic or better far more often · odds in Chests';
        case 'noAds':
          return 'Ad rewards without the ad, for good';
        case 'cashBoost':
          return `+${Math.round((c.cashBoostPay - 1) * 100)} % money from every shift, for good`;
      }
    },
    freeCash: 'Free Cash',
    freeCashDetail: (m: string): string => `Watch a short ad for +${money(m)}`,
    restore: 'Restore Purchases',
    restoreShort: 'Restore',
    owned: 'Owned',
    placeholderNote: 'Placeholder prices · no real money is charged yet',
    purchasing: 'Purchase',
    purchasingNote: 'Placeholder · no money is charged',
    bought: (p: StoreProduct): string => `Thank you · ${S.store.name(p)} added`,
    restored: (n: number): string => (n === 0 ? 'Nothing to restore.' : `Restored ${n} purchase${n === 1 ? '' : 's'}.`),
    cashAdReward: (m: string): string => `Ad watched · +${money(m)}`,
    cashNoAd: (m: string): string => `No Ads · +${money(m)}`,
    chestNoAd: 'No Ads · Standard chest added',
    noCashAdsLeft: 'No more cash ads today. Back tomorrow.',
    watch: 'Watch ad',
    collect: 'Collect',
    adCountdownCash: (s: number): string => `Your cash in ${s} s`,
  },

  builder: {
    title: 'Street Builder',
    ringFull: 'Ring full',
    drag: 'Drag onto the ring',
    pickOne: 'Tap a part to see what it does · tap a built one to tear it down.',
    dragHint: 'Drag it onto a free slot on the ring.',
    buildHint: 'Double-tap the part to build it · one tap takes it away.',
    tapAgainToRemove: 'Tap again to tear it down · nothing is paid back',
    keepsArms: (n: number): string => `A roundabout keeps at least ${n} arms`,
    name: (part: string): string =>
      part === 'arm' ? 'New arm' : part === 'tollBooth' ? 'Toll Booth' : part === 'speedCamera' ? 'Speed Camera' : 'Tow Depot',
    explanation(part: string, c: Config): string {
      switch (part) {
        case 'arm':
          return `A wider ring with one more way in and out: ${percent(c.trafficPerArm)} more traffic, transporters more often, and ${percent(c.payPerArm)} more pay per shift.`;
        case 'tollBooth':
          return `Every lorry pays ${money(String(c.tollPerTruck))} here, in the first ${Math.round(c.moduleEarningSeconds)} s of a shift. Traffic slows down around it, and so do your police cars.`;
        case 'speedCamera':
          return `Fines every car over the limit ${money(String(c.cameraFine))} in the first ${Math.round(c.moduleEarningSeconds)} s of a shift: nothing in a calm shift, a lot in rush hour. Everyone brakes hard at it.`;
        default:
          return `Wrecks near it are towed away ${percent(c.towSpeedup)} faster, so the ring flows again sooner.`;
      }
    },
  },

  shop: {
    open: 'Open',
    wear: 'Wear',
    takeOff: 'Take off',
    worn: 'On',
    locked: '?',
    lockedTitle: (kind: string): string => (kind === 'mapSkin' ? 'Mystery map' : kind === 'vehicleType' ? 'Mystery vehicle' : 'Mystery skin'),
    source(k: ChestKind): string {
      switch (k) {
        case 'standard':
          return 'For sale · or watch an ad';
        case 'premium':
          return 'For sale · or by hard masteries';
        case 'event':
          return 'City events · Daily Shift';
        case 'criminalHunt':
          return 'Earned by catching criminals';
      }
    },
    seasonHint: "Holds this season's item half the time, until you have it.",
    pickItem: 'Tap an item to see it.',
    lockedHint(item: Cosmetic): string {
      if (item.source.kind === 'streak') return `Play the Daily Shift ${item.source.days} days in a row.`;
      if (item.source.kind === 'season') return `Only in Event Chests during ${item.source.season}.`;
      if (item.source.kind === 'legendary')
        return item.source.shifts === 1 ? 'Complete a Legendary Shift.' : `Complete ${item.source.shifts} Legendary Shifts.`;
      if (item.source.kind === 'prestige') return `Reach Prestige ★${item.source.rank}.`;
      return 'Not found yet: it comes out of chests.';
    },
    tapToClose: 'Tap to close',
    watchAdShort: 'Watch ad',
    adReward: 'Ad watched · Standard chest added',
    noAdsLeft: 'No more ad chests today. Back tomorrow.',
    adPlaceholder: 'Ad',
    adCountdown: (s: number): string => `Your chest in ${s} s`,
    watchAd: (left: number): string => `Watch ad · ${left} left`,
    skinsOn: (n: number, max: number): string => `${n} of ${max} car skins on · they mix on the road`,
    skinsFull: (max: number): string => `${max} car skins are on. Take one off first.`,
    section: (i: number): string => ['Chests', 'Collection', 'Store'][i],
    newBadge: 'NEW',
    shelf: (i: number): string => ['Common', 'Rare', 'Epic', 'Legend', 'Maps', 'Special', 'Honours'][i],
    waiting: (n: number): string => (n === 1 ? '1 waiting' : `${n} waiting`),
    buy: (price: string): string => `Buy · ${price}`,
    pity: (n: number): string => `Epic or better within ${n} chests. Duplicates pay out ${MONEY_MARK}.`,
    duplicate: (m: string): string => `Duplicate · +${money(m)}`,
    ownedHint(item: Cosmetic): string {
      if (item.kind === 'carSkin') return 'Paints the cars on the road. Mix up to five. Only looks, never a bonus.';
      if (item.kind === 'mapSkin') return 'Turns the city into its own place. Only looks, never a bonus.';
      return `Shows up in your queue now and then: ${S.shop.trait(item.id)}.`;
    },
    chest(k: ChestKind): string {
      switch (k) {
        case 'standard':
          return 'Standard Chest';
        case 'premium':
          return 'Premium Chest';
        case 'event':
          return 'Event Chest';
        case 'criminalHunt':
          return 'Criminal Hunt Chest';
      }
    },
    odds: (odds: number[]): string =>
      (['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((r, i) => `${S.shop.rarity(r)} ${percent(odds[i])}`).join(' · '),
    rarity: (r: Rarity): string => ({ common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' })[r],
    item(id: string): string {
      const names: Record<string, string> = {
        racingRed: 'Racing Red',
        midnight: 'Midnight',
        mint: 'Mint',
        pearl: 'Pearl',
        olive: 'Olive',
        coral: 'Coral',
        sunset: 'Sunset',
        ice: 'Ice',
        rose: 'Rose',
        lime: 'Lime',
        copper: 'Copper',
        redStripe: 'Red Stripe',
        carbon: 'Carbon',
        blackGold: 'Black & Gold',
        nightMint: 'Night Mint',
        tiger: 'Tiger',
        gold: 'Gold',
        royal: 'Royal',
        lagoon: 'Lagoon',
        dusk: 'Dusk',
        sand: 'Sand',
        neon: 'Neon',
        forest: 'Forest',
        autumn: 'Autumn',
        sakura: 'Sakura',
        aurora: 'Aurora',
        ember: 'Ember',
        pearlShine: 'Pearl Shine',
        chrome: 'Chrome',
        starlight: 'Starlight',
        diamond: 'Diamond',
        holo: 'Holo',
        sportsCar: 'Sports Car',
        streakBronze: 'Bronze Badge',
        streakSilver: 'Silver Badge',
        streakGold: 'Gold Laurel',
        frost: 'Frost',
        blossom: 'Blossom',
        sunburst: 'Sunburst',
        pumpkin: 'Pumpkin',
        lemon: 'Lemon',
        plum: 'Plum',
        fern: 'Fern',
        latte: 'Latte',
        teal: 'Teal',
        sky: 'Sky Top',
        cherry: 'Cherry Top',
        mocha: 'Mocha Cream',
        panda: 'Panda',
        hanami: 'Hanami',
        volcano: 'Volcano',
        ocean: 'Ocean',
        koi: 'Koi',
        obsidian: 'Obsidian',
        ruby: 'Ruby',
        meadow: 'Meadow',
        tropic: 'Tropic',
        snowfall: 'Snowfall',
        cosmos: 'Cosmos',
        compact: 'Compact',
        van: 'Van',
        laurel: 'Laurel',
        crown: 'Crown',
        phoenix: 'Phoenix',
        starSilver: 'Silver Star',
        starGold: 'Gold Star',
        starIris: 'Iris Star',
      };
      return names[id] ?? id;
    },
    trait: (id: string): string => (id === 'compact' ? 'tiny, light, slower to merge' : id === 'van' ? 'long, heavy, merges quicker' : 'shorter, lighter, merges quicker'),
    kind(item: Cosmetic): string {
      const kind = item.kind === 'carSkin' ? 'car skin' : item.kind === 'mapSkin' ? 'map skin' : 'vehicle type · ' + S.shop.trait(item.id);
      return `${S.shop.rarity(item.rarity)} ${kind}`;
    },
    opened(o: ChestOpening): string {
      const name = S.shop.item(o.item.id);
      if (o.isDuplicate) return `Duplicate: ${name} · +${money(String(o.money))}`;
      return `${S.shop.rarity(o.item.rarity).toUpperCase()} · ${name}`;
    },
  },

  daily: {
    title: 'DAILY SHIFT',
    ready: 'Daily Shift ready',
    perfectRun: 'PERFECT RUN',
    welcomeBack: (m: string): string => `Welcome back · your toll booths earned +${money(m)}`,
    done: 'Done',
    readyHint: 'Your first shift of the day. One try, the same shift for everyone.',
    doneHint: (streak: number): string => (streak > 1 ? `Done · ${streak} days in a row · back tomorrow` : 'Done · back tomorrow'),
    dailyDone: (m: string, streak: number): string => `DAILY SHIFT DONE · +${money(m)}${streak > 1 ? ` · ${streak} days in a row` : ''} · EVENT CHEST`,
    splashLine: (e: CityEvent): string => `Today's city: ${S.cityEvent(e)} · one try`,
    streakLine: (streak: number): string => (streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} in a row · keep it going` : 'Play it every day for a streak'),
    nextMilestone: (left: number, item: string): string => `${left} more ${left === 1 ? 'day' : 'days'} for ${S.shop.item(item)}`,
    milestone: (days: number, item: string): string => `${days} DAYS IN A ROW · ${S.shop.item(item)} unlocked`,
    eventChestFound: 'EVENT CHEST FOUND',
    challenge(c: Challenge): string {
      switch (c) {
        case 'perfectInputs':
          return '3 Perfect Inputs in one shift';
        case 'tightFits':
          return '3 Tight Fits in one shift';
        case 'twoTakedowns':
          return '2 takedowns in one shift';
        case 'twoTransporters':
          return '2 transporters paid in one shift';
        case 'longChain':
          return 'A Perfect Chain of 8';
        case 'bigCombo':
          return 'A combo of 15';
        case 'perfectRun':
          return 'A Perfect Run: no crash, no cut-off';
      }
    },
    challengeDone: (c: Challenge, reward: string): string => `CHALLENGE · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a: Album): string =>
      ({ maps: 'Maps', commons: 'Commons', rares: 'Rares', epics: 'Epics', legends: 'Legends', seasons: 'Seasons', loyalty: 'Loyalty', honours: 'Honours' })[a],
    complete: (a: Album, reward: string): string => `ALBUM COMPLETE · ${S.albums.name(a)} · +${money(reward)} · new frame`,
    progress: (entries: { album: Album; owned: number; total: number }[]): string =>
      'Albums · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    best: 'BEST',
    delta: (seconds: number): string => (seconds <= 0 ? '−' : '+') + `${Math.abs(seconds).toFixed(1)} s`,
    newBest: 'NEW BEST TIME',
  },

  mastery: {
    detail(goal: MasteryGoal, tier: number): string {
      const t = MASTERY_THRESHOLDS[goal];
      if (tier >= t.length) return 'All tiers reached';
      const n = t[tier];
      switch (goal) {
        case 'perfectTiming':
          return `${n} Perfect Inputs`;
        case 'tightSpots':
          return `${n} Tight Fits`;
        case 'closeCalls':
          return `${n} Near Misses`;
        case 'longChain':
          return `A Perfect Chain of ${n}`;
        case 'crimeFighter':
          return `${n} takedowns`;
        case 'secureRoute':
          return `${n} transporters paid`;
        case 'comboMaster':
          return `A combo of ${n}`;
        case 'veteran':
          return `${n} shifts completed`;
      }
    },
    name: (g: MasteryGoal): string =>
      ({
        perfectTiming: 'Perfect Timing',
        tightSpots: 'Tight Spots',
        closeCalls: 'Close Calls',
        longChain: 'Long Chain',
        crimeFighter: 'Crime Fighter',
        secureRoute: 'Secure Route',
        comboMaster: 'Combo Master',
        veteran: 'Veteran',
      })[g],
    toast(done: MasteryCompletion[]): string {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${'I'.repeat(c.tier + 1)}`);
      const chests = done.length === 1 ? 'CHEST EARNED' : `${done.length} CHESTS EARNED`;
      return `MASTERY COMPLETE · ${names.join(', ')} · ${chests}`;
    },
  },

  night: 'Night',
  blackout: 'Blackout',
  weather: (w: Weather): string => ({ clear: 'Clear', lightRain: 'Light Rain', heavyRain: 'Heavy Rain', storm: 'Storm', extreme: 'Extreme Weather' })[w],
  cityEvent: (e: CityEvent): string =>
    ({ roadworks: 'Roadworks', roadClosure: 'Road Closure', concert: 'Concert Traffic', vipConvoy: 'VIP Convoy', policeOperation: 'Police Operation' })[e],

  upgrades: {
    title: 'Upgrades',
    maxed: 'Max',
    steps: (s: number, max: number): string => `${s}/${max}`,
    pickOne: 'Tap an upgrade to see what it does.',
    buyHint: 'Double-tap to buy.',
    everyStepBought: 'Every step bought.',
    missing: (m: string): string => `${m} short`,
    name(u: Upgrade): string {
      return {
        morePatrols: 'More Patrols',
        longerPursuit: 'Longer Pursuit',
        quietStreets: 'Quiet Streets',
        interceptor: 'Interceptor',
        dispatchRadio: 'Dispatch Radio',
        backup: 'Backup',
        cashRoute: 'Cash Route',
        overtime: 'Overtime',
        freight: 'Freight',
        quickRecovery: 'Quick Recovery',
        doubleRun: 'Double Run',
        insurance: 'Insurance',
        robberyInsurance: 'Robbery Insurance',
      }[u];
    },
    explanation(u: Upgrade): string {
      return {
        morePatrols: 'More police cars wait in your queue, so one is ready when a criminal shows up.',
        longerPursuit: 'Criminals take longer to get away, which leaves you more time to catch them.',
        quietStreets: 'Some shifts come with no criminal at all.',
        interceptor: 'A police car right behind a criminal runs it down faster.',
        dispatchRadio: 'Calling a police car to the front of the queue costs less of your combo.',
        backup: 'Your shift survives one police car crash more.',
        cashRoute: 'Money transporters show up sooner and more often.',
        overtime: 'Every shift you finish pays more.',
        freight: 'More lorries on the road: more tolls, but denser traffic.',
        quickRecovery: 'Drivers pull away harder, so after a crash the traffic is back up to speed sooner.',
        doubleRun: 'Sometimes a second money transporter follows right after the first.',
        insurance: 'Pays part of what a crash costs you.',
        robberyInsurance: 'Pays part of what an escaped criminal costs you.',
      }[u];
    },
    total(u: Upgrade, steps: number, c: Config): string {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} police cars`;
        case 'longerPursuit':
          return `+${secondsText(t * c.pursuitPerStep)} pursuit`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} fewer criminal shifts`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} chase speed`;
        case 'dispatchRadio':
          return `+${percent(t * c.dispatchRadioPerStep)} combo kept`;
        case 'backup':
          return `+${steps * c.backupPerStep} police crashes`;
        case 'cashRoute':
          return `${secondsText(+(t * c.cashRoutePerStep).toFixed(1))} sooner`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} pay`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} lorries`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} acceleration`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} double runs`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'FULL COVERAGE' : `${percent(t * c.insurancePerStep)} covered`;
      }
    },
    stepEffect(u: Upgrade, steps: number, max: number, c: Config): string {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Now ${now}`;
      return `Now ${now} · next step ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  result: {
    gameOver: 'GAME OVER',
    detonated: 'KABOOM',
    escaped: 'ESCAPED',
    levelComplete: (l: number): string => `LEVEL ${l} COMPLETE`,
    newBest: 'NEW BEST',
    fullCoverage: 'FULL COVERAGE',
    loss: (amount: string, escaped: boolean): string => (escaped ? 'LOSS ' : 'CRASH COST ') + '−' + money(amount),
    covered: (amount: string): string => `FULL COVERAGE · ${money(amount)} paid by insurance`,
    nextLevel: (l: number): string => `Tap for level ${l}`,
    retryLevel: (l: number): string => `Tap to try level ${l} again`,
    stats(combo: string, tightFits: string, busted: number, transporters: number, time: string): string {
      return `${time} · best combo ${combo} · ${tightFits} tight fits · ${busted} busted` + (transporters > 0 ? ` · ${transporters} paid` : '');
    },
  },

  hud: {
    moneyLabel: 'MONEY',
    bestLabel: 'BEST',
    rushHour: 'RUSH HOUR',
    tight: 'TIGHT!',
    cutOff: 'CUT OFF',
    busted: 'BUSTED!',
    dispatch: 'DISPATCH',
    seized: 'SEIZED',
    lost: 'LOST',
    danger: 'DANGER',
    boom: 'BOOM!',
    covered: 'COVERED',
    paid: (amount: string): string => `PAID ${amount}`,
    combo: (n: number): string => `COMBO ${n}`,
    cars: (n: number): string => (n === 1 ? '1 car' : `${n} cars`),
    wanted: (seconds: number): string => `WANTED ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value: number): string => `RUSH HOUR ${multiplier(value)}`,
    label(t: VehicleType): string | null {
      switch (t) {
        case 'police':
          return 'POLICE';
        case 'pickup':
          return 'CRIMINAL';
        case 'transporter':
          return 'SECURED';
        case 'tanker':
          return 'GAS';
        case 'military':
          return 'BOMB';
        case 'ambulance':
          return 'AMBULANCE';
        default:
          return null;
      }
    },
  },

  detail: {
    now: 'Now',
    nextStep: 'Next step',
    step: (s: number, max: number): string => `Step ${s} of ${max}`,
    buy: (price: string): string => `Buy · ${price}`,
    build: (price: string): string => `Build · ${price}`,
    remove: 'Remove',
    close: 'Close',
  },

  notice: {
    notEnoughMoney: (price: string): string => `Not enough ${MONEY_MARK} · ${money(price)} needed`,
    built: (name: string, arms: number): string => `${name} built · ${arms} arms`,
    placed: (name: string): string => `${name} built on the ring`,
    removed: (name: string): string => `${name} torn down`,
    bought: (name: string, steps: number, max: number): string => `${name} ${steps}/${max}`,
  },
};
