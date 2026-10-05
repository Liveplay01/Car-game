import { INVITE_LEVEL, INVITE_REMINDER_LEVEL, type Config, type Weather, type CityEvent, type BossKind, type LegendaryRule, weatherSeverity } from '../core/config';
import type { Upgrade } from '../core/levels';
import type { MasteryGoal, MasteryCompletion } from '../core/career';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../core/career';
import type { SwipeMode } from './flow';
import type { Rarity, ChestKind, Cosmetic, ChestOpening, Album } from '../core/loot';
import type { Challenge } from '../core/daily';
import type { NextGoal, NearMiss } from '../core/goals';
import type { CasinoGame, SlotSymbol } from '../core/casino';
import type { VehicleType, VehicleRole } from '../core/vehicle';
import { type Trial, type TrialId, type RunId, type EliteKind, rematchKind, ascensionRank, LANDMARK_PRESTIGE } from '../core/trials';
import type { SpecialKind, WeatherKind, DarkKind, MuseumEntry, ConditionEntry } from '../core/museum';
import type { EliteStep, TitleId, TitleRule } from '../core/elite';
import type { PassReward, PassStep, HallEntry } from '../core/seasonPass';
import type { FeatGoal } from '../core/feats';
import type { Season } from '../core/loot';
import { MONEY_MARK } from './icons';
import type { RewardedOutcome } from './session';

/** Every text the game shows. English only. */

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

/** A Museum entry's words: one short line for its card, the explanation for its sheet. */
interface MuseumText {
  line: string;
  /**
   * What to do, in one breath: the top card shows it the first time this meets you in a shift
   * (`Briefings`). Short enough for two lines on a phone.
   */
  brief: string;
  explain: (c: Config) => string[];
}

/**
 * The Museum's texts, one record per kind of content: a new boss, vehicle type, weather,
 * darkness or city event does not build until it has its words here.
 */
const BOSS_TEXT: Record<BossKind, MuseumText> = {
  convoy: {
    line: 'Escorts right behind it',
    brief: 'Ram the boss with a police car, in the gap before its escorts.',
    explain: () => [
      'The head of the syndicate, in gold-striped black. Its armoured escorts join the ring right behind it.',
      'Time a police car into the gap between the boss and its escorts. Hitting an escort is a plain crash.',
      'You get more time than with an ordinary criminal: use it to wait for the gap.',
    ],
  },
  getaway: {
    line: 'Gone in seconds',
    brief: 'It is gone in seconds: have a police car ready and ram it at once.',
    explain: () => [
      'No escorts at all, just speed: the getaway driver is gone in a few seconds.',
      'Have a police car at the front of your queue before its warning ends, and send it in the moment the boss is on the ring.',
    ],
  },
  armoured: {
    line: 'Takes two police cars',
    brief: 'Ram it twice: the first police car only cracks the armour.',
    explain: () => ['Its armour shrugs off the first ram, and an escort sticks to it.', 'One police car cracks the armour, a second one finishes it. Keep two in your queue.'],
  },
  phantom: {
    line: 'Drives without lights',
    brief: 'No lights: follow its warning and ram it with a police car.',
    explain: () => [
      'It comes in a blackout, and it drives without lights: you only see it where the street lights reach.',
      'Follow the ring and trust its warning. An escort rides behind it, so pick the gap carefully.',
    ],
  },
  twins: {
    line: 'Catch one, the other comes',
    brief: 'Two bosses: the second comes as soon as the first is caught.',
    explain: (c) => [
      'The Twins run the syndicate together. There are two of them, and they come one after the other: the moment you catch the first, the second is already at another arm.',
      `No escorts, about ${Math.round(c.criminalTime * c.twinsTimeFactor)} seconds each. Only when both are caught is the heist back. Keep a second police car in your queue.`,
    ],
  },
  decoy: {
    line: 'Its escorts wear its paint',
    brief: 'Escorts in its paint: ram the pickup with the open bed and the ring.',
    explain: () => [
      "The Decoy's escorts are painted like the boss himself, black with a gold line, to draw your police cars in.",
      'The real boss is the pickup: an open bed, and the countdown ring around it. The others are armoured vans, and ramming one is a plain crash.',
    ],
  },
  smuggler: {
    line: 'Takes three police cars',
    brief: 'Armoured twice: it takes three police cars. Line them up.',
    explain: (c) => [
      'The Smuggler drives alone, but under heavy armour: the first two police cars only crack it, the third one stops it.',
      `It stays about ${Math.round(c.criminalTime * c.smugglerTimeFactor)} seconds, enough for three runs at it if your queue holds the police cars.`,
    ],
  },
  kingpin: {
    line: 'The head of it all',
    brief: 'Escorts in its paint, in the dark: ram the pickup with the ring twice.',
    explain: () => [
      'The Kingpin comes last, in a blackout, with three escorts painted like it and armour that takes a ram.',
      'Read the shapes in the dark: the boss is the pickup with the ring. Two police cars in the gap behind it bring it down.',
    ],
  },
};

const SPECIAL_TEXT: Record<SpecialKind, MuseumText & { name: string }> = {
  police: {
    name: 'Police Car',
    line: 'The only car that stops a criminal',
    brief: 'Only police cars stop a criminal. Keep one ready for the next warning.',
    explain: (c) => [
      'Police cars come from your own queue, like any of your cars. They are the only cars that can stop a criminal.',
      `Send one into the ring while a criminal is on it and drive into it: that is a takedown, worth ${Fmt.number(c.takedownPoints)} points and a link in your chain. Hold a police car back when a warning lights up an arm.`,
      `A police car is tougher than your other cars: your shift survives ${c.maxPoliceCrashes === 1 ? 'one police crash' : `${c.maxPoliceCrashes} police crashes`}. Keep it away from the money transporter, though.`,
    ],
  },
  pickup: {
    name: 'Criminal',
    line: 'Ram it with a police car',
    brief: 'Crash a police car into the purple-ringed pickup before it gets away.',
    explain: (c) => [
      'A warning lights up the arm it comes from. Then it barges into the ring and races round it, heavy and fearless.',
      `You have about ${Math.round(c.criminalTime)} seconds to ram it with one of your police cars. A takedown pays ${Fmt.number(c.takedownPoints)} points and extends your chain.`,
      'If it gets away, it takes money with it and the shift is over. Your ordinary cars cannot stop it: a crash with them is just a crash.',
    ],
  },
  transporter: {
    name: 'Money Transporter',
    line: 'Let it through, then cash in',
    brief: 'Let the money truck through untouched: it pays when it leaves.',
    explain: (c) => [
      'An armoured truck full of cash. A warning shows its arm, then it drives once round the ring with a secure zone around it.',
      `If it leaves safely you earn ${money(Fmt.number(c.transporterPay))} and a link in your chain. Every car of yours that joins inside its secure zone adds ${money(Fmt.number(c.shieldBonus))}.`,
      'Do not hit it: a police car that rams it seizes the cash and nobody gets paid, and a wrecked transporter is lost.',
    ],
  },
  ambulance: {
    name: 'Ambulance',
    line: 'Keep the road ahead clear',
    brief: 'Keep the road ahead of the ambulance clear until it leaves the ring.',
    explain: (c) => [
      'On an emergency run: it comes in with a warning and takes the long way round the ring.',
      'The stretch of ring right ahead of it has to stay clear. If you send a car in there, the run is spoiled and your combo and chain are gone.',
      `Keep the road clear until it leaves and it pays ${money(Fmt.number(c.ambulancePay))} and extends your chain. It never causes a crash itself.`,
    ],
  },
  truck: {
    name: 'Lorry',
    line: 'Long and heavy: leave a bigger gap',
    brief: 'Lorries are long and heavy: leave a bigger gap in front of your car.',
    explain: (c) => [
      'Part of the ordinary traffic, but longer and much heavier than a car.',
      'It needs a bigger gap in front of your car, and in a crash it shoves lighter cars around instead of stopping.',
      `Every lorry that passes a Toll Booth early in a shift pays ${money(Fmt.number(c.tollPerTruck))}.`,
    ],
  },
  tanker: {
    name: 'Gas Tanker',
    line: 'Wreck it and it explodes',
    brief: 'A wrecked gas tanker explodes and throws every car nearby. Give it room.',
    explain: () => [
      'A lorry full of gas. It drives like any other lorry, and it comes without a warning.',
      'Wrecked, it explodes: the blast throws every car nearby off the road, yours too. Give it room.',
      'In Mayhem that is exactly the point: aim for the tankers, the bigger the chain reaction the more flames.',
    ],
  },
  military: {
    name: 'Military Truck',
    line: 'Stay out of its zone',
    brief: "Keep every car out of the military truck's zone until it leaves.",
    explain: (c) => [
      'A military truck with a bomb on board. A warning shows its arm, then it drives round the ring with a no-go zone around it.',
      'Any car that enters the zone sets the bomb off, and the blast reaches across the whole roundabout.',
      `Hold your cars back while it passes. After about ${Math.round(c.militaryTime)} seconds it leaves as soon as the way out is clear.`,
    ],
  },
  fireTruck: {
    name: 'Fire Engine',
    line: 'A long road to keep clear',
    brief: 'Keep the long stretch ahead of the fire engine clear until it leaves.',
    explain: (c) => [
      'An emergency run like the ambulance, but a fire engine: long, heavy, and it needs more of the road.',
      'The stretch of ring ahead of it is longer. Send a car in there and the run is spoiled, your combo and chain with it.',
      `Keep the road clear until it leaves and it pays ${money(Fmt.number(c.fireTruckPay))} and extends your chain.`,
    ],
  },
  motorbike: {
    name: 'Motorbike',
    line: 'Slips into tiny gaps',
    brief: 'Bikes slip into tiny gaps. Shave past one for bonus points.',
    explain: (c) => [
      'Quick and slim: a motorbike joins in gaps a car would never take, so a gap you counted on can be gone.',
      `Slip one of your cars right past it, a Tight Fit or a Near Miss, and the close shave pays ${Fmt.number(c.motorbikeBonus)} points on top, times your combo.`,
    ],
  },
  learner: {
    name: 'Learner Driver',
    line: 'Give it room, it hesitates',
    brief: 'Keep your cars out of the green band around the learner.',
    explain: (c) => [
      'A driving-school car goes once round the ring, and now and then it brakes for no reason. The traffic behind it bunches up.',
      'A green band shows the space around it, ahead and behind. Keep your cars out of it while it drives.',
      `If it leaves with room all the way, it pays ${money(Fmt.number(c.learnerPay))} and extends your chain. Joining close to it only costs that bonus.`,
    ],
  },
  oversize: {
    name: 'Oversize Load',
    line: 'Slow, long, give it room',
    brief: 'A slow, long load: keep your cars out of the amber band around it.',
    explain: (c) => [
      'A heavy transport, far longer than a lorry, crawls once round the ring. The traffic behind it slows down with it, so the gaps you know are gone.',
      `An amber band shows the space it needs, ahead and behind. Keep your cars out of it and it pays ${money(Fmt.number(c.oversizePay))} and extends your chain when it leaves.`,
    ],
  },
  racer: {
    name: 'Street Racers',
    line: 'Two of them: ram them',
    brief: 'Two street racers barge in: ram each one with a police car for a bonus.',
    explain: (c) => [
      'Two racers rev at one of the other arms and barge into the ring one right after the other, in hot pink with white stripes.',
      `Ram one with a police car to stop it: ${money(Fmt.number(c.racerPay))} and a link in your chain, each. If they get away nothing is lost; your ordinary cars cannot stop them, a crash is just a crash.`,
    ],
  },
  bus: {
    name: 'School Bus',
    line: 'Stops at the bus stop',
    brief: 'School buses stop at the bus stop. Merge behind one as it pulls away.',
    explain: (c) => [
      'Only on a School Run: long yellow buses that stop at the bus stop on the ring, for about ' + `${Math.round(c.busDwell * 10) / 10} seconds.`,
      'The traffic behind a bus waits, and your cars wait with it instead of ploughing in. Merge behind a bus when it pulls away.',
    ],
  },
};

/** The grip the tyres keep in a weather, as `forWeather` sets it. */
const gripIn = (w: Weather, c: Config): string =>
  percent(
    w === 'snow' ? c.snowGrip : w === 'hail' ? c.hailGrip : w === 'sandstorm' ? c.sandstormGrip : w === 'fog' ? 1 : Math.max(0.35, 1 - weatherSeverity(w) * c.weatherGripLoss),
  );

const WEATHER_TEXT: Record<WeatherKind, MuseumText> = {
  lightRain: {
    line: 'Slick roads',
    brief: 'Wet road: crashes slide further. Leave a little more room.',
    explain: (c) => [
      `A wet road: tyres keep only ${gripIn('lightRain', c)} of their grip, and drivers react a little later and brake more softly.`,
      'Crashes slide further and cars need longer to stop. Leave a little more room when you merge.',
    ],
  },
  heavyRain: {
    line: 'Less grip, more traffic',
    brief: 'Less grip and more cars. Wait for gaps that are clearly big enough.',
    explain: (c) => [
      `Pouring rain: tyres keep ${gripIn('heavyRain', c)} of their grip, drivers react later still, and more cars are on the road.`,
      'Tight fits turn into crashes quickly. Wait for the gaps that are clearly big enough.',
    ],
  },
  storm: {
    line: 'Drivers squeeze into gaps',
    brief: 'Drivers squeeze into small gaps. Merge with care.',
    explain: (c) => [
      `A storm: tyres keep ${gripIn('storm', c)} of their grip, the traffic is heavier, and the other drivers squeeze into smaller gaps.`,
      'The ring fills up faster than you are used to. Time your cars carefully and keep an eye on who pushes in.',
    ],
  },
  extreme: {
    line: 'The worst the sky can do',
    brief: 'Hardly any grip and the heaviest traffic. Patience pays.',
    explain: (c) => [
      `Extreme weather: tyres keep only ${gripIn('extreme', c)} of their grip, the traffic is at its heaviest, and every driver is on edge.`,
      'Every crash slides a long way and takes others with it. Patience pays more than speed here.',
    ],
  },
  fog: {
    line: 'The far side fades out',
    brief: 'The far side fades out. Watch the cars coming out of the fog.',
    explain: (c) => [
      'Thick fog: the far side of the ring fades out, and drivers see a crash a moment later.',
      `Watch the traffic that comes out of the fog towards your arm; the warnings still shine through. A foggy shift pays ${percent(c.fogPayFactor - 1)} more.`,
    ],
  },
  snow: {
    line: 'Ice on the road',
    brief: 'Ice on the road: nobody stops quickly. Leave clearly more room.',
    explain: (c) => [
      `Snow and ice: tyres keep only ${gripIn('snow', c)} of their grip, and nobody stops quickly. A crash slides a long way.`,
      `Your tyre tracks stay in the snow. Leave clearly more room than usual. A snowy shift pays ${percent(c.snowPayFactor - 1)} more.`,
    ],
  },
  hail: {
    line: 'Nobody brakes well',
    brief: 'Hail: drivers brake badly and late. Leave room behind every car.',
    explain: (c) => [
      `Hail drums on the roofs: drivers react later, brake only ${percent(c.hailBrake)} as hard, and the tyres keep ${gripIn('hail', c)} of their grip. A little more traffic, too.`,
      `A car behind you needs longer to stop. Leave room behind your merge, not only in front of it. A hail shift pays ${percent(c.hailPayFactor - 1)} more.`,
    ],
  },
  sandstorm: {
    line: 'Dust across the ring',
    brief: 'Sandstorm: the far side is gone in the dust. Watch what comes out of it.',
    explain: (c) => [
      `A sandstorm: dust hides the far side of the ring, drivers see a crash late, and sand on the road leaves ${gripIn('sandstorm', c)} of the grip.`,
      `Watch the traffic coming out of the dust towards your arm; the warnings still shine through. A sandstorm pays ${percent(c.sandstormPayFactor - 1)} more.`,
    ],
  },
};

const DARK_TEXT: Record<DarkKind, MuseumText> = {
  night: {
    line: 'Only headlights and lamps',
    brief: 'Watch the headlights, not the cars.',
    explain: (c) => [
      'A night shift: the city is dark, and you see the cars by their headlights and under the street lamps.',
      `Watch the lights on the ring rather than the cars. A night shift pays ${percent(c.nightPayFactor - 1)} more.`,
    ],
  },
  blackout: {
    line: 'Even the lamps are out',
    brief: 'The street lamps are out: only headlights show the cars.',
    explain: (c) => [
      'A night with the street lamps out: only the headlights show where the cars are.',
      `A blackout shift pays ${percent(c.blackoutPayFactor - 1)} more. The Phantom, the fourth boss of the syndicate, only comes in a blackout.`,
    ],
  },
};

const EVENT_TEXT: Record<CityEvent, MuseumText> = {
  roadworks: {
    line: 'A slow stretch on the ring',
    brief: 'Cars drive slower through the roadworks, so the gaps change there.',
    explain: (c) => [
      `Roadworks on part of the ring: traffic there slows to ${percent(c.roadworksSpeedFactor)} of its speed.`,
      'Cars bunch up behind the works, so the gaps change as they pass through. Look where the queue on the ring forms.',
    ],
  },
  roadClosure: {
    line: 'One arm is closed',
    brief: 'One arm is closed: fewer cars come in, and none leave there.',
    explain: () => [
      'One of the other arms is closed for the shift: no traffic comes in from it and no car can leave there.',
      'The traffic comes from fewer directions and leaves by fewer exits. It only happens on a roundabout with four arms or more.',
    ],
  },
  concert: {
    line: 'The whole city is out',
    brief: 'Many more cars on the ring. Take a good gap when it comes.',
    explain: (c) => [
      `A concert lets out: ${c.concertDensityBonus} more cars on the ring, and new cars arrive twice as often.`,
      'Gaps are rare and short. Take a good one when it comes instead of waiting for a perfect one.',
    ],
  },
  vipConvoy: {
    line: 'Wide gaps, more cars',
    brief: 'Every driver keeps more distance: wider gaps, a new rhythm.',
    explain: (c) => [
      `A VIP is in town: one more car on the ring, and every driver keeps about ${percent(c.vipGapFactor - 1)} more distance.`,
      'The gaps between the cars are wider but move differently. Time your merge to the new rhythm.',
    ],
  },
  policeOperation: {
    line: 'More police in your queue',
    brief: 'More of your cars are police: more chances for a takedown.',
    explain: (c) => [
      `A police operation: ${percent(c.policeOperationShare)} more of your cars are police cars.`,
      'Criminals are easier to catch, and every police car is one more chance for a takedown. Use them.',
    ],
  },
  marathon: {
    line: 'Runners cross an arm',
    brief: 'Runners cross one arm again and again: its cars wait, then flood in.',
    explain: (c) => [
      `A marathon runs through the city. Every ${c.marathonPeriod} seconds the runners cross one of the other arms, and for about ${c.marathonCrossing} seconds its traffic waits at the line.`,
      'When they have passed, the cars that waited all want in at once. Expect a wave from that arm, and use the calm while the runners are on the road.',
    ],
  },
  schoolRun: {
    line: 'Buses stop on the ring',
    brief: 'School buses stop on the ring. Merge behind one as it pulls away.',
    explain: (c) => [
      `School's out: yellow school buses join the traffic, and each one stops for ${Math.round(c.busDwell * 10) / 10} seconds at the bus stop on the ring.`,
      'The cars behind a bus wait for it. Your cars brake behind a queue too, but the best gap opens right after a bus pulls away.',
    ],
  },
};

/**
 * What the ready screen says the first time a shift brings a condition: what changes and what
 * to do about it, in one breath. A new weather, darkness or city event needs its line here.
 */
const INTRO_TEXT: {
  weather: Record<WeatherKind, (c: Config) => string>;
  dark: Record<DarkKind, (c: Config) => string>;
  event: Record<CityEvent, (c: Config) => string>;
} = {
  weather: {
    lightRain: (c) => `Wet road: tyres keep ${gripIn('lightRain', c)} of their grip, so crashes slide further. Leave a little more room.`,
    heavyRain: (c) => `Pouring rain: ${gripIn('heavyRain', c)} grip and more cars on the ring. Wait for gaps that are clearly big enough.`,
    storm: (c) => `Storm: ${gripIn('storm', c)} grip, and drivers squeeze into small gaps. Merge with care.`,
    extreme: (c) => `Only ${gripIn('extreme', c)} grip and the heaviest traffic. Patience pays more than speed.`,
    fog: (c) => `Fog: the far side of the ring fades out, the warnings still shine through. Pays ${percent(c.fogPayFactor - 1)} more.`,
    snow: (c) => `Ice: ${gripIn('snow', c)} grip, nobody stops quickly. Leave more room. Pays ${percent(c.snowPayFactor - 1)} more.`,
    hail: (c) => `Hail: drivers brake badly and late. Leave room behind your car too. Pays ${percent(c.hailPayFactor - 1)} more.`,
    sandstorm: (c) => `Sandstorm: the far side fades in the dust, the warnings shine through. Pays ${percent(c.sandstormPayFactor - 1)} more.`,
  },
  dark: {
    night: (c) => `The city is dark: watch the headlights, not the cars. A night shift pays ${percent(c.nightPayFactor - 1)} more.`,
    blackout: (c) => `The street lamps are out: only headlights show the cars. A blackout pays ${percent(c.blackoutPayFactor - 1)} more.`,
  },
  event: {
    roadworks: (c) => `Traffic slows to ${percent(c.roadworksSpeedFactor)} on the striped part of the ring. Cars queue behind it, so the gaps change.`,
    roadClosure: () => 'One arm is closed: no cars come in from it and none can leave there.',
    concert: (c) => `${c.concertDensityBonus} more cars and new ones twice as often. Take a good gap when it comes.`,
    vipConvoy: (c) => `Every driver keeps ${percent(c.vipGapFactor - 1)} more distance: wider gaps, a new rhythm.`,
    policeOperation: (c) => `${percent(c.policeOperationShare)} more of your cars are police: more chances for a takedown.`,
    schoolRun: () => 'School buses stop at the bus stop on the ring. Merge behind a bus as it pulls away.',
    marathon: () => 'Runners cross one arm again and again. Its cars wait, then come in a wave.',
  },
};

function museumText(e: MuseumEntry): MuseumText {
  switch (e.k) {
    case 'boss':
      return BOSS_TEXT[e.kind];
    case 'special':
      return SPECIAL_TEXT[e.kind];
    case 'weather':
      return WEATHER_TEXT[e.kind];
    case 'dark':
      return DARK_TEXT[e.kind];
    case 'event':
      return EVENT_TEXT[e.kind];
    case 'road':
      return ROAD_TEXT;
  }
}

/** The two-lane ring (its own kind of condition: the road itself). */
const ROAD_TEXT: MuseumText = {
  line: 'Read the gaps in both lanes',
  brief: 'The arrow at your stop line shows which lane your car will take.',
  explain: (c) => [
    `From Level ${c.twoLaneLevel} the ring has an inner lane. Both lanes turn together, and traffic uses both.`,
    'An arrow in front of your stop line shows where your front car is headed: straight into the outer lane, or bending left across it into the inner one.',
    'A car bound for the inner lane needs a gap in the outer lane to cross and a gap in the inner lane to join. Cars leaving the inner lane cross the outer one too.',
  ],
};

export const S = {
  gameTitle: 'Roundabout Timing',

  tutorial: {
    sendCar: 'Tap to send your first car',
    findGap: 'Wait for a gap, then tap',
    combo: 'Clean merges build your combo',
    strikes: (police: number): string => `Cars crash instantly. Police get ${police} chances.`,
  },

  settings: {
    imported: (level: number): string => `Progress imported · Level ${level}`,
    synced: (level: number): string => `Synced from the cloud · Level ${level}`,
  },

  /** Systems that open with the level (`core/unlocks.ts`). */
  unlocks: {
    daily: 'New · the Daily Shift: one try a day, the same shift for everyone',
    trials: 'New · Trials in Progress → Goals: special shifts with a reward',
    opensAt: (name: string, level: number): string => `${name} ${name.endsWith('s') ? 'open' : 'opens'} at Level ${level}`,
    lockedTag: (level: number): string => `LEVEL ${level}`,
  },

  /** One-time tips that keep the progress safe (`Hint`). */
  hints: {
    install: 'Tip · Install the game in Settings: its own window, one click away',
    homeScreen: 'Tip · Add the game to your home screen in Settings: one tap, full screen',
    backup: 'Tip · Turn on Cloud sync in Settings to keep a copy of your progress',
    reduceMotion: 'Tip · Running slow? Reduce motion in Settings can help',
    offline: 'Ready to play offline',
    notSaved: 'This browser is not saving your progress · Cloud sync in Settings can keep a copy',
    /** The same where there is no Cloud sync (CrazyGames, no service). */
    notSavedHere: 'This browser is not saving your progress · It lasts until you close the game',
    /** The save was changed outside the game (Leo, 04.10.2026): the last one the game wrote is back. */
    saveRestored: 'Your save was changed outside the game · The last saved progress is back',
    /** ...and there was nothing to go back to: what was played stays, money and chests do not. */
    saveDistrusted: 'Your save was changed outside the game · Money and chests were reset',
    updated: 'Updated · See what’s new in Settings',
    /** Once for every player (Leo, 03.10.2026): the website and its forms. */
    /** Two short pills, one after the other: a notice is one line, about 55 characters on a phone. */
    /** A friend's invite was kept (`?ref=`): with a name already, or still needing one. */
    invited: [`Invited by a friend · Reach level ${INVITE_LEVEL} and you both get a chest`],
    invitedNeedsName: [`Invited by a friend · Reach level ${INVITE_LEVEL} and you both get a chest`, 'Enter a name in Settings → Friends so your chest finds you'],
    /** Once for everyone (`announceInvite`), and again at level 10 (`inviteReminder`): the friend code is the invite, and Settings → Friends is where it is. */
    invite: [`New · Invite a friend and you both get a chest at level ${INVITE_LEVEL}`, 'Settings → Friends has your code and link'],
    inviteReminder: [`Level ${INVITE_REMINDER_LEVEL} · Invite a friend and you both get a chest`, 'Settings → Friends has your code and link'],
    buildWithUs: ['New website: timing.love · Report bugs and ideas there', 'Bug hunters may get a gift · Settings → Build with us'],
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
    linkReady: 'Link ready. Tap Challenge a friend again to share it.',
    pictureText: 'My shift in Roundabout Timing',
    pictureSaved: 'Picture saved',
    pictureCopied: 'Picture copied',
    shareText: (target: string): string => `Can you beat ${target} on my roundabout?`,
  },

  /** Boss Rush: every syndicate boss in a row (core/trials.ts). */
  rush: {
    name: 'Boss Rush',
    caption: 'BOSS RUSH',
    clock: 'CLOCK',
    best: 'BEST',
    step: (n: number, total: number): string => `Boss ${n} of ${total}`,
    time(seconds: number): string {
      const whole = Math.max(0, Math.round(seconds));
      return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    },
    /** The waiting screen: which boss, and what a lost round does. */
    shiftLine: (kind: BossKind, first: boolean): string => `${S.boss.name(kind)} · ${first ? 'lose a round and it starts over' : 'the clock keeps running'}`,
    caught: (n: number, total: number): string => `BOSS ${n} OF ${total} CAUGHT`,
    nextLine: (kind: BossKind): string => `Next: ${S.boss.name(kind)} · tap to go on`,
    over: 'RUSH OVER',
    overLine: (caught: number, total: number): string => `${caught} of ${total} bosses caught · tap to start over`,
    cleared: 'RUSH CLEARED',
    firstLine: (money: string): string => `All eight bosses down · ${money} paid`,
    recordLine: 'New best time',
    bestLine: (time: string): string => `Best ${time} · tap to run it again`,
    /** Progress → Goals. */
    rowTitle: 'All eight bosses',
    line: 'Back to back, one clock',
    furthest: (n: number, total: number): string => `furthest ${n}/${total}`,
    locked: (beaten: number, total: number): string => `Take down all eight bosses to open it · ${beaten}/${total}`,
  },

  trials: {
    name(id: RunId): string {
      const boss = rematchKind(id);
      if (boss) return S.boss.rematch(boss);
      if (id === 'landmark.etoile') return 'The Étoile';
      if (id === 'weekly') return S.weekly.title;
      const rank = ascensionRank(id);
      if (rank !== null) return `Ascension ★${rank}`;
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
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} cars`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'no crash, no cut-off' : null,
          t.goal.k === 'boss' ? 'take down the boss' : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      const boss = rematchKind(t.id);
      if (boss) return `${S.boss.name(boss)} again: more escorts, less time`;
      if (t.arms) return `${t.arms} roads into one ring · ${t.cars} cars`;
      switch (t.id) {
        case 'tightSqueeze':
          return `${t.goal.k === 'skilled' ? t.goal.n : 0} Tight Fits or better in ${t.cars} cars`;
        case 'deadCentre':
          return `${t.goal.k === 'perfects' ? t.goal.n : 0} Perfect Inputs in ${t.cars} cars`;
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
    opensAt: (l: number): string => `Opens at level ${l}`,
    /** When a trial opens: its level, or an Ascension trial's Prestige rank. */
    opens: (t: Trial): string => {
      const rank = ascensionRank(t.id);
      if (rank !== null) return `Opens at Prestige ★${rank}`;
      return t.arms ? `Opens at Prestige ★${LANDMARK_PRESTIGE}` : S.trials.opensAt(t.level);
    },
    /**
     * What a counting goal asks for, on the trial's ready screen (Leo, 01.10.2026: nobody knew
     * a Perfect Input wants a medium gap, not the biggest one). Same shape as `ConditionIntro`.
     */
    howTo(t: Trial): { title: string; text: string; short: string } | null {
      if (t.goal.k === 'perfects') {
        return {
          title: 'How to · Perfect Input',
          text: 'Land your car right in the middle of a gap, with about as much room ahead as behind. A huge empty stretch does not count: pick a medium gap.',
          short: 'The middle of a medium gap, not a huge one',
        };
      }
      if (t.goal.k === 'skilled') {
        return {
          title: 'How to · Tight Fit',
          text: 'Join close to the car ahead or behind without touching it: Tight Fits, Near Misses and Perfect Inputs count, a merge with lots of room does not.',
          short: 'Close to another car, without a crash',
        };
      }
      return null;
    },
    /** The live counter of a counting trial goal. */
    progress: (t: Trial, have: number, need: number): string => `${t.goal.k === 'perfects' ? 'Perfect Inputs' : 'Tight Fits or better'} ${Math.min(have, need)}/${need}${have >= need ? ' ✓' : ''}`,
  },

  boss: {
    incoming: 'SYNDICATE CONVOY',
    /** The warning over the arm: which boss is coming. */
    arriving: (k: BossKind): string =>
      ({
        convoy: 'SYNDICATE CONVOY',
        getaway: 'GETAWAY DRIVER',
        armoured: 'ARMOURED BOSS',
        phantom: 'THE PHANTOM',
        twins: 'THE TWINS',
        decoy: 'THE DECOY',
        smuggler: 'THE SMUGGLER',
        kingpin: 'THE KINGPIN',
      })[k],
    name: (k: BossKind): string =>
      ({
        convoy: 'The Convoy',
        getaway: 'The Getaway Driver',
        armoured: 'The Armoured Boss',
        phantom: 'The Phantom',
        twins: 'The Twins',
        decoy: 'The Decoy',
        smuggler: 'The Smuggler',
        kingpin: 'The Kingpin',
      })[k],
    rematch: (k: BossKind): string => `Rematch · ${S.boss.name(k)}`,
    beaten: 'Busted',
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
    title: 'Weekly Shift',
    caption: 'WEEKLY SHIFT',
    elite: (e: EliteKind): string =>
      ({ flawless: 'Flawless', precision: 'Precision', storm: 'Storm Front', gridlock: 'Gridlock', dragnet: 'Dragnet', boss: 'Boss Hunt' })[e],
    goal(t: Trial): string {
      switch (t.elite) {
        case 'flawless':
          return `Level ${t.level} · ${t.cars} cars, no crash and no cut-off`;
        case 'precision':
          return `Level ${t.level} · ${t.goal.k === 'perfects' ? t.goal.n : 0} Perfect Inputs in ${t.cars} cars`;
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
    done: (m: string): string => `WEEKLY SHIFT DONE · +${money(m)} · PREMIUM CHEST`,
    passedThisWeek: 'Passed this week · new one on Monday',
  },

  /** Invite a friend (Ranks → Friends). */
  invite: {
    shareText: (level: number): string => `Join me in Roundabout Timing! Reach level ${level} and we both get a free chest.`,
  },

  rewards: {
    ladybug: 'LADYBUG UNLOCKED · thanks for hunting bugs',
    chest: (kind: ChestKind): string => `A GIFT FROM THE TEAM · ${S.shop.chest(kind)} · thank you`,
    item: (id: string): string => `A GIFT FROM THE TEAM · ${S.shop.item(id)} unlocked`,
    /** A chest from an invite (`reason` as the service writes it: `invite:welcome:Name`, `invite:friend:Name`, `invite:milestone:3`); null for any other reason. */
    invite: (reason: string, kind: ChestKind): string | null => {
      const [, what, ...rest] = reason.startsWith('invite:') ? reason.split(':') : [];
      const who = rest.join(':');
      switch (what) {
        case 'welcome':
          return `INVITE REWARD · ${S.shop.chest(kind)} · you joined through ${who}`;
        case 'friend':
          return `INVITE REWARD · ${S.shop.chest(kind)} · ${who} reached level ${INVITE_LEVEL}`;
        case 'milestone':
          return `INVITE BONUS · ${S.shop.chest(kind)} · ${who} friends joined`;
        default:
          return null;
      }
    },
  },

  prestige: {
    title: 'Prestige',
    caption: (rank: number): string => `★${rank}`,
    ready: (level: number): string => `Level ${level} reached: start over at Level 1 on a harder road`,
    locked: (level: number): string => `Reach Level ${level} to start over on a harder road`,
    keeps: 'Money, upgrades, roads and collection stay. Looks only, never a bonus.',
    confirm: 'Tap again to prestige · back to Level 1',
    available: (rank: number): string => `PRESTIGE ★${rank} READY · start over in Progress → Elite for a harder road and new rewards`,
    done: (rank: number, item: string | null): string => `PRESTIGE ★${rank}${item ? ` · ${S.shop.item(item)} unlocked` : ''}`,
    headStart: (levels: number): string => `Traffic runs ${levels} levels harder`,
  },

  elite: {
    title: 'Elite',
    caption: (level: number): string => `Elite ${level}`,
    locked: (level: number): string => `Reach Level ${level}: the Elite track and Prestige open`,
    prestigeHeader: 'Prestige',
    rank: 'Rank',
    traffic: 'Traffic',
    harder: (levels: number): string => `+${levels} levels`,
    prestigeAction: (rank: number): string => `Prestige to ★${rank}`,
    prestigeConfirm: 'Tap again · back to Level 1',
    xp: (into: number, need: number): string => `${into} / ${need} XP`,
    next: (step: EliteStep): string => `Next at Elite ${step.level}: ${S.elite.reward(step)}`,
    reward: (step: EliteStep): string => (step.item ? S.shop.item(step.item.id) : step.title ? `title “${S.titles.name(step.title)}”` : S.shop.chest(step.chest)),
    gained: (xp: number): string => `+${xp} ELITE XP`,
    opened: 'ELITE DRIVER · the Elite track is open',
    reached: (step: EliteStep): string =>
      `ELITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} unlocked` : ''} · ${S.shop.chest(step.chest)}`,
    body: [
      'From Level 50 on, every shift earns Elite XP: 10 for a completed shift, 1 for each Perfect Input and Tight Fit, 10 more for a boss taken down or a Legendary Shift.',
      'Each Elite level asks a little more XP than the last. Each one pays a Standard Chest, every tenth a Premium Chest. Titles and skins wait along the way. Prestige keeps the track.',
      'Looks only, never a bonus on the road.',
    ],
    trackHeader: 'Along the track',
    titlesHeader: 'Titles · tap one to wear it',
    wearing: 'Worn',
    notYet: 'Not yet',
  },

  titles: {
    name: (id: TitleId): string =>
      ({
        eliteDriver: 'Elite Driver',
        roadVeteran: 'Road Veteran',
        ringMaster: 'Ring Master',
        ironNerves: 'Iron Nerves',
        roadRoyalty: 'Road Royalty',
        livingLegend: 'Living Legend',
        precisionDriver: 'Precision Driver',
        comboMaster: 'Combo Master',
        closeCallArtist: 'Close Call Artist',
        syndicateBreaker: 'Syndicate Breaker',
        nightOwl: 'Night Owl',
        stormChaser: 'Storm Chaser',
        legendHunter: 'Legend Hunter',
        starDriver: 'Star Driver',
        ascended: 'Ascended',
        eternal: 'Eternal',
        grandmaster: 'Grandmaster',
        centurion: 'Centurion',
        immortal: 'Immortal',
        roadWarden: 'Road Warden',
        gridlord: 'Gridlord',
        ringbearer: 'Ringbearer',
        unstoppable: 'Unstoppable',
        timekeeper: 'Timekeeper',
        paragon: 'Paragon',
        mythic: 'Mythic',
        ringEternal: 'Ring Eternal',
        mastermind: 'Mastermind',
        summit: 'Summit',
        syndicateEnd: "Syndicate's End",
      })[id],
    rule(r: TitleRule): string {
      switch (r.k) {
        case 'elite':
          return `Reach Elite ${r.level}`;
        case 'mastery':
          return `Complete the ${S.mastery.name(r.goal)} mastery`;
        case 'bosses':
          return r.all ? 'Take down all eight syndicate bosses' : 'Take down the first four syndicate bosses';
        case 'trial':
          return `Pass the ${S.trials.name(r.id as RunId)} trial`;
        case 'legendary':
          return `Complete ${r.shifts} Legendary Shifts`;
        case 'prestige':
          return `Reach Prestige ★${r.rank}`;
        case 'masteries':
          return 'Reach tier V in every mastery';
      }
    },
    earned: (ids: TitleId[]): string => (ids.length === 1 ? `TITLE · ${S.titles.name(ids[0])}` : `${ids.length} NEW TITLES · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'No title',
  },

  ambulance: {
    incoming: 'AMBULANCE',
    fire: 'FIRE ENGINE',
    blocked: 'BLOCKED',
    clear: (amount: string): string => `CLEAR ROAD ${amount}`,
    lost: 'AMBULANCE LOST',
  },

  pass: {
    title: 'Season Pass',
    seasonName: (s: Season): string => ({ winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' })[s],
    caption: (s: Season): string => `${S.pass.seasonName(s)} Season Pass`,
    tier: (n: number, total: number): string => `Tier ${n} of ${total}`,
    xp: (into: number, need: number): string => `${into} / ${need} XP`,
    locked: (level: number): string => `Opens at Level ${level}`,
    buyHint: 'Twelve tiers of chests, money and three animated skins',
    daysLeft: (n: number): string => (n === 1 ? 'last day' : `${n} days left`),
    complete: 'Track complete · see you next season',
    reward(r: PassReward): string {
      if (r.k === 'chest') return S.shop.chest(r.chest);
      if (r.k === 'money') return money(Fmt.number(r.amount));
      return S.shop.item(r.item.id);
    },
    reached: (step: PassStep): string =>
      `SEASON PASS · TIER ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} again · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
    bought: (s: Season): string => `${S.pass.caption(s).toUpperCase()} · every shift now climbs the track`,
    buy: (price: string): string => `Buy · ${price}`,
    body: (xpPerTier: number): string[] => [
      `A track of twelve tiers for this season, bought with play money. Every shift earns XP towards it: 10 for a completed shift, 1 for every Perfect Input and Tight Fit, 10 more for a boss or a Legendary Shift. The first tier needs ${xpPerTier} XP, every tier after it a little more.`,
      'Three of the tiers hold this season’s own skins, with effects no chest has. The four seasons come back every year, and so do their skins.',
      'Only looks, never a bonus on the road. Nothing here costs real money.',
    ],
    trackHeader: 'The track',
  },

  hall: {
    title: 'Hall of Fame',
    header: 'Hall of Fame',
    build: (price: string): string => `Build the Hall of Fame · ${price}`,
    built: 'HALL OF FAME BUILT · a wall of honour on the island · Hall of Famer unlocked',
    notBuilt: 'A gold wall on the island with a star for every Prestige rank, and a skin of its own.',
    open: (level: number): string => `Opens once you reach Level ${level}`,
    plaque: (e: HallEntry): string => `★${e.rank}`,
    plaqueLine: (e: HallEntry, date: string | null): string =>
      [date, e.elite > 0 ? `Elite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'boss' : 'bosses'}`, e.legendary > 0 ? `${e.legendary} legendary` : null].filter((x) => x).join(' · '),
    empty: 'Your first Prestige gets the first plaque.',
    standing: 'Standing on the island',
  },

  oversize: {
    incoming: 'WIDE LOAD',
    passed: (amount: string): string => `WIDE LOAD ${amount}`,
  },

  racers: {
    incoming: 'STREET RACE',
    stopped: (amount: string): string => `RACE STOPPED ${amount}`,
  },

  learner: {
    incoming: 'LEARNER DRIVER',
    crowded: 'TOO CLOSE',
    patient: (amount: string): string => `PATIENCE ${amount}`,
  },

  modes: {
    name: (m: SwipeMode): string => (m === 'shift' ? 'SHIFT' : m === 'unlimited' ? 'UNLIMITED' : m === 'mayhem' ? 'MAYHEM' : 'MULTIPLAYER'),
    line: (m: SwipeMode): string =>
      m === 'shift' ? 'Clear the level, move up' : m === 'unlimited' ? 'Endless · until you crash' : m === 'mayhem' ? '12 cars · aim for the tankers' : 'Up to 4 friends · last one standing',
    unlimitedCaption: 'UNLIMITED',
    endless: '∞',
    versusPlayers: '2–4',
    youLabel: 'YOU',
    defaultName: 'Player',
    runOver: 'RUN OVER',
    again: 'Tap for another run',
    carsSent: (n: number): string => (n === 1 ? '1 car' : `${n} cars`),
    unlocked: 'New modes · swipe sideways for Unlimited, Mayhem and Multiplayer',
    swipeHint: 'Swipe for more modes',
    /** Unlimited's late stages (`endlessStages`), as they come. */
    stage: (stage: number, overtime: number): string =>
      overtime > 0
        ? `OVERTIME ${overtime} · more traffic, a little faster`
        : (['', 'GAS TANKERS JOIN THE TRAFFIC', 'NIGHT FALLS', 'A STORM ROLLS IN', 'MILITARY TRUCKS ON THE ROAD'][stage] ?? ''),
    /** An Unlimited milestone reached: its skin. */
    milestone: (id: string): string => `UNLIMITED MILESTONE · ${S.shop.item(id)} unlocked`,
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

  /** A condition met for the first time, on the ready screen (`ConditionIntro`). */
  intro: {
    title: (e: ConditionEntry): string => `New · ${S.museum.name(e)}`,
    text: (e: ConditionEntry, c: Config): string =>
      e.k === 'road'
        ? 'The ring has two lanes now. The arrow at your stop line shows where your car is headed; the inner lane crosses the outer one.'
        : e.k === 'dark'
          ? INTRO_TEXT.dark[e.kind](c)
          : e.k === 'weather'
            ? INTRO_TEXT.weather[e.kind](c)
            : INTRO_TEXT.event[e.kind](c),

    /** The Museum's few words, where the sentence has no room. */
    short: (e: ConditionEntry): string => museumText(e).line,
  },

  /** The top card's briefing (`Briefings`): what meets you and what to do about it. */
  brief: {
    /** `again`: shown once more after this one cost the last shift. */
    caption: (e: MuseumEntry, again: boolean): string => `${again ? 'Remember' : 'New'} · ${S.museum.name(e)}`.toUpperCase(),
    text: (e: MuseumEntry): string => museumText(e).brief,
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
    section: (i: number): string => ['Today', 'Goals', 'Records', 'Museum'][i],
    /** The headings inside the sections: Records' long list, Today's quests, the three kinds of goal. */
    allStats: 'All stats',
    statsMore: (n: number): string => `${n} more ›`,
    statsHide: 'Hide',
    quests: 'Quests',
    trials: 'Trials',
    mastery: 'Mastery',
    feats: 'Feats',
    trialsLocked: (level: number): string => `Opens at Level ${level} · special shifts with a reward`,
    landmarks: 'Landmarks',
    landmarksHint: 'Famous roundabouts, one hard shift each.',
    ascension: 'Ascension',
    ascensionHint: 'One trial for every Prestige rank: the hardest shifts in the game.',
    bosses: 'Syndicate bosses',
    prestige: 'Prestige',
    legendary: 'Legendary shifts',
    weeklies: 'Weekly Shifts',
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
    timingLabel: (n: number): string => `Your timing · last ${n} merges`,
    /** How far from the middle of the gap the taps land on average; null: not enough merges yet. */
    timing: (ms: number | null, onBeat: number): string =>
      ms === null ? '–' : Math.abs(ms) <= onBeat ? 'On the beat' : ms < 0 ? `${-ms} ms early` : `${ms} ms late`,
  },

  leaderboard: {
    /** The header chip before a rank is known (not joined yet, or offline). */
    chip: 'Ranks',
    rank: (n: number): string => `Rank #${Fmt.number(n)}`,
    chipLabel: 'Leaderboard',
  },

  museum: {
    shelf: (i: number): string => ['Bosses', 'Specials', 'Conditions'][i],
    unknown: '???',
    notSeen: 'Not seen yet',
    newBadge: 'NEW',
    firstAt: (level: number): string => `From Level ${level}`,
    undiscovered: 'Not discovered yet',
    lockedHint: (level: number): string =>
      level > 1
        ? `Shows up from Level ${level}. Once you have met it on the road, it goes on show here with everything you need to know.`
        : 'Keep playing shifts. Once you have met it on the road, it goes on show here with everything you need to know.',
    lockedBossHint: (level: number): string => `The syndicate sends it on Level ${level}. Once you have faced it, it goes on show here with how to take it down.`,
    discovered: (names: string[]): string => `New in the Museum: ${names.join(', ')}`,
    kind: (e: MuseumEntry): string => ({ boss: 'Syndicate boss', special: 'Special vehicle', weather: 'Weather', dark: 'Darkness', event: 'City event', road: 'Road' })[e.k],
    met: 'Met, still at large',
    heist: 'Heist recovered',
    firstMet: 'Boss level',
    rematch: 'Rematch',
    name(e: MuseumEntry): string {
      switch (e.k) {
        case 'boss':
          return S.boss.name(e.kind);
        case 'special':
          return SPECIAL_TEXT[e.kind].name;
        case 'weather':
          return S.weather(e.kind);
        case 'dark':
          return e.kind === 'blackout' ? S.blackout : S.night;
        case 'event':
          return S.cityEvent(e.kind);
        case 'road':
          return 'Two Lanes';
      }
    },
    /** One short line on the card: what it asks of you. */
    line: (e: MuseumEntry): string => museumText(e).line,
    /** The explanation in the sheet: what it is, what to do, what it pays or costs. */
    explanation: (e: MuseumEntry, c: Config): string[] => museumText(e).explain(c),
  },

  casino: {
    game: (g: CasinoGame): string => ({ crash: 'Crash', slots: 'Slots', upgrade: 'Upgrade' })[g],
    symbol: (s: SlotSymbol): string =>
      ({ car: 'Car', compact: 'Compact', van: 'Van', sportsCar: 'Sports car', ambulance: 'Ambulance', transporter: 'Transporter', boss: 'Boss' })[s],
    today: (net: number): string => (net === 0 ? 'Today ±0' : `Today ${net > 0 ? '+' : '−'}${money(Fmt.number(Math.abs(net)))}`),
    odds: 'Odds',
    noHistory: 'No rounds yet',
    times: (m: number): string => `${m.toFixed(2)}×`,
    allIn: 'All in',
    stakeShort: (n: number): string => (n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : Fmt.number(n)),
    auto: 'Auto',
    autoOff: 'Off',
    drive: (m: string): string => `Drive · ${m}`,
    spin: (m: string): string => `Spin · ${m}`,
    upgrade: (chance: number): string => `Upgrade · ${(chance * 100).toFixed(1)} %`,
    cashOut: (m: string): string => `Cash out · ${m}`,
    notEnough: 'Not enough money',
    tapToSkip: 'Tap to skip',
    collect: (m: string): string => `Collect ${m}`,
    keep: 'Keep it',
    double: 'Double or nothing',
    done: 'Done',
    crashHint: 'The car speeds up. Cash out before it crashes.',
    riding: (m: string): string => `${m} if you cash out now`,
    cashedOut: (m: string): string => `Cashed out · +${m}`,
    crashed: 'Crashed · the stake is gone',
    dangerZone: 'Danger zone',
    clutch: 'CLUTCH CASH-OUT!',
    clutchSaved: (s: string): string => `Out ${s} s before the crash`,
    slotsHint: 'Three alike on the line pay · odds in the sheet',
    noWin: 'No win this time',
    slotRule(rule: 'triple' | 'bossPair' | 'pair' | null, pay: number, line: readonly SlotSymbol[]): string {
      if (rule === 'triple') return `Three × ${S.casino.symbol(line[0])} · ${pay}×`;
      if (rule === 'bossPair') return `Two bosses · ${pay}×`;
      if (rule === 'pair') return `First two alike · ${pay}×`;
      return '';
    },
    chance: 'chance',
    chanceBoosted: 'chance · boosted',
    upgraded: 'Upgraded',
    lostSkins: (n: number): string => (n === 1 ? 'The skin is gone' : `${n} skins are gone`),
    stakeValue: (m: string): string => `Stake worth ${m}`,
    pickStakes: 'Pick skins to stake',
    pickTarget: 'Pick the skin to win',
    pickStakesTitle: (n: number, max: number): string => `Skins to stake · ${n} of ${max}`,
    pickTargetTitle: 'The skin to win · rarer than your stake',
    noSkins: 'No skins to stake yet · chests have them',
    noTargets: 'Nothing rarer left to win',
    flipping: 'The car doubles it, the crash takes it',
    doubled: (m: string): string => `Doubled · ${m}`,
    doubledSkin: (name: string): string => `Doubled · + ${name}`,
    flipLost: 'Lost on the coin',
    flipLostSkin: 'Lost on the coin · the skins are gone',
    flipsLeft: (n: number): string => (n <= 0 ? 'That was the last double' : `${n} more double${n === 1 ? '' : 's'} possible · or keep it`),
    /** Over the stack beside the coin: how many times the first win it has become. */
    chainTimes: (n: number): string => `×${n}`,
    refunded: (m: string): string => `A drive was cut short · ${m} back`,
    cashedOnLeave: (m: string): string => `Cashed out as you left · +${m}`,
    skinsLost: (n: number): string => (n === 1 ? 'Staked skin lost' : `${n} staked skins lost`),
    detail: {
      crash: [
        'A car speeds up and the multiplier climbs. Cash out any time: you get the stake times the multiplier. If it crashes first, the stake is gone.',
        'Where it crashes is drawn before it starts. Whatever you aim for, you get back 96 % of your stakes on average.',
      ],
      slots: [
        'Three reels, 20 stops each, every stop as likely. Three alike on the line pay, so do two bosses anywhere, and so do the first two reels alike.',
        'The symbols above and below the line are the real neighbours on the reel: a near miss is only ever what the reels gave.',
      ],
      upgrade: [
        'Stake up to five of your skins on one you do not have yet, rarer than all of them. The chance is what the stake is worth against the target, less 5 %.',
        'Win: the skin is yours. Lose: the staked skins leave your collection and the road. Completed albums stay completed.',
      ],
      double: 'After a win: double or nothing on a fair coin, exactly 50 %, up to 5 times in a row. Keep it whenever you like.',
      fair: 'Play money only. Nothing here can be bought with real money.',
      leave: 'Leaving the page during a drive cashes out. A round cut short pays its stake back.',
      reaches: (m: string): string => `Reaches ${m}`,
      instant: 'Crashes at 1.00×',
      triple: (s: string): string => `Three × ${s}`,
      bossPair: 'Two bosses',
      pair: 'First two alike',
      returns: (p: string): string => `Returns ${p} of stakes on average`,
      hitRate: (n: string): string => `A win every ${n} spins on average`,
      oneIn: (n: string): string => `1 in ${n}`,
      value: (r: string): string => `${r} skin`,
      maxChance: (p: string): string => `The chance is at most ${p}`,
      best: 'Best',
      bestWin: 'Biggest win',
    },
  },

  builder: {
    title: 'Street Builder',
    ringFull: 'Ring full',
    drag: 'Drag onto the ring',
    pickOne: 'Tap a part to see what it does · tap a built one to move or remove it.',
    dragHint: 'Drag it onto a free slot on the ring.',
    buildHint: 'Double-tap the part to build it · one tap takes it away.',
    keepsArms: (n: number): string => `A roundabout keeps at least ${n} arms`,
    name: (part: string): string =>
      part === 'arm' ? 'New arm' : part === 'tollBooth' ? 'Toll Booth' : part === 'speedCamera' ? 'Speed Camera' : 'Tow Depot',
    /** A part that is already on the ring (its sheet). */
    builtName: (part: string): string => (part === 'arm' ? 'Arm' : S.builder.name(part)),
    onTheRing: 'On your roundabout',
    arms: 'Arms on the ring',
    move: 'Move',
    delete: 'Delete',
    deleteConfirm: 'Tap again to delete',
    noRefund: 'Moving is free. Deleting pays nothing back.',
    moveHint: 'Drag it to a free slot, or tap one · tap anywhere else to keep it where it is.',
    moved: (name: string): string => `${name} moved`,
    moveCancelled: 'Stays where it is',
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

  /** Rewarded ads (Leo, 05.10.2026): always the player's choice, paid only when watched to the end. */
  ads: {
    watch: 'Watch ad',
    /** A rewarded ad that did not play to the end: no reward, and why. */
    failed: (outcome: Exclude<RewardedOutcome, 'watched' | 'disabled'>): string =>
      outcome === 'cooldown'
        ? 'An ad just played. Try again in a few minutes.'
        : outcome === 'blocked'
          ? 'No ad could play: an ad blocker is on.'
          : outcome === 'dismissed'
            ? 'The ad was closed early, so there is no reward.'
            : 'No ad available right now. Try again in a moment.',
    notHere: 'This is not offered here.',
    unavailable: 'No ad available right now. Try again in a moment.',
    /** The upgrade sheet of today's pick. */
    freeStep: 'Free step',
    freeStepAction: 'Watch ad · free step',
    freeStepHint: "Today's pick: watch an ad and get one step of it for free. Once a day, your choice.",
    upgradeReward: (name: string, steps: number, max: number): string => `Free upgrade · ${name} ${steps}/${max}`,
    noUpgrade: 'No free upgrade left today. A new one tomorrow.',
    /** The Skin Upgrade's boost. */
    boost: (p: string): string => `+${p} chance`,
    boostWatch: (p: string): string => `Watch ad · +${p} chance`,
    boostOn: (p: string): string => `Boost on · +${p} for this round`,
    boostLeft: (n: number): string => `${n} left today`,
    boostReward: (p: string): string => `Boost on · +${p} on your next Upgrade`,
    boostWaiting: 'A boost is already waiting for your next Upgrade.',
    noBoosts: 'No more boosts today. Back tomorrow.',
    boostNote: (p: string, perDay: number): string =>
      `Your choice: watch an ad before a round and its chance gets ${p} on top, even above the cap. One round uses it up, won or lost. Up to ${perDay} a day. The dial shows the chance it really rolls.`,
  },
  shop: {
    open: 'Open',
    wear: 'Wear',
    takeOff: 'Take off',
    worn: 'On',
    inTraffic: 'In traffic',
    vehicleAuto: 'Nothing to wear: a vehicle joins the traffic by itself, already now.',
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
      if (item.source.kind === 'elite') return `Reach Elite ${item.source.level}.`;
      if (item.source.kind === 'pass') return `Tier ${item.source.tier} of the ${S.pass.seasonName(item.source.season)} Season Pass. It comes back every year.`;
      if (item.source.kind === 'hall') return 'Build the Hall of Fame (Records → Elite).';
      if (item.source.kind === 'unlimited') return `Send ${Fmt.number(item.source.cars)} cars in one Unlimited run.`;
      if (item.source.kind === 'bugReport') return 'Report a bug on timing.love with your friend code. Only bug hunters get it.';
      if (item.source.kind === 'find')
        return `A rare find: ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. The only honour that is luck.`;
      return 'Not found yet: it comes out of chests.';
    },
    tapToClose: 'Tap to close',
    watchAdShort: 'Watch ad',
    adReward: 'Ad watched · Standard chest added',
    noAdsLeft: 'No more ad chests today. Back tomorrow.',
    adPlaceholder: 'Ad',
    adCountdown: (reward: 'chest' | 'upgrade' | 'boost', s: number): string => `${{ chest: 'Your chest', upgrade: 'Your free step', boost: 'Your boost' }[reward]} in ${s} s`,
    watchAd: (left: number): string => `Watch ad · ${left} left`,
    skinsOn: (n: number, max: number): string => `${n} of ${max} car skins on · they mix on the road`,
    skinsFull: (max: number): string => `${max} car skins are on. Take one off first.`,
    section: (i: number): string => ['Chests', 'Collection', 'Casino'][i],
    newBadge: 'NEW',
    shelf: (i: number): string => ['Cars', 'Maps', 'Honours', 'Pass'][i],
    /** The headings on the Cars shelf: the chest skins by rarity, then the vehicles and the season skins. */
    group: (g: Rarity | 'vehicles' | 'seasons'): string =>
      ({ common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', vehicles: 'Vehicles', seasons: 'Seasons' })[g],
    waiting: (n: number): string => (n === 1 ? '1 waiting' : `${n} waiting`),
    buy: (price: string): string => `Buy · ${price}`,
    pity: (n: number): string => `Epic or better within ${n} chests. Duplicates pay out ${MONEY_MARK}.`,
    duplicate: (m: string): string => `Duplicate · +${money(m)}`,
    ownedHint(item: Cosmetic): string {
      if (item.kind === 'carSkin') return 'Paints the cars on the road. Mix up to five. Only looks, never a bonus.';
      if (item.id === 'bigScreen') return 'Your own picture or video behind the roundabout: upload a picture, or paste a link to a YouTube video, an image or a video file. Only looks, never a bonus.';
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
        harbour: 'Harbour',
        vineyard: 'Vineyard',
        grove: 'Mushroom Grove',
        abyss: 'Abyss',
        canyon: 'Red Canyon',
        highland: 'Highlands',
        lanterns: 'Lantern Festival',
        crystal: 'Crystal Cavern',
        beach: 'Beach',
        compact: 'Compact',
        van: 'Van',
        classic: 'Classic',
        laurel: 'Laurel',
        crown: 'Crown',
        phoenix: 'Phoenix',
        starSilver: 'Silver Star',
        starGold: 'Gold Star',
        starIris: 'Iris Star',
        bigScreen: 'Big Screen',
        nova: 'Nova',
        gilded: 'Gilded City',
        singularity: 'Singularity',
        zenith: 'Zenith Crown',
        eventHorizon: 'Event Horizon',
        undying: 'Undying Flame',
        eliteSteel: 'Steel Chevron',
        eliteBlaze: 'Blaze Chevron',
        eliteJade: 'Jade Chevron',
        eliteAurum: 'Black Aurum',
        eliteHalo: 'Halo',
        blizzard: 'Blizzard',
        northernLights: 'Northern Lights',
        glacier: 'Glacier',
        petalStorm: 'Petal Storm',
        rainbow: 'Rainbow Road',
        bloomGlow: 'Bloom Glow',
        solarFlare: 'Solar Flare',
        neonWave: 'Neon Wave',
        lava: 'Lava Core',
        ghost: 'Ghost Rider',
        harvestMoon: 'Harvest Moon',
        thunder: 'Thunderbolt',
        hallOfFame: 'Hall of Famer',
        quasar: 'Quasar',
        prism: 'Prism',
        meteor: 'Meteor',
        eclipse: 'Eclipse',
        nebula: 'Nebula',
        comet: 'Comet',
        starforge: 'Starforge',
        endurance: 'Endurance',
        overdrive: 'Overdrive',
        infinity: 'Infinity',
        ladybug: 'Ladybug',
      };
      return names[id] ?? id;
    },
    trait: (id: string): string =>
      id === 'compact'
        ? 'tiny, light, slower to merge'
        : id === 'van'
          ? 'long, heavy, merges quicker'
          : id === 'classic'
            ? 'drives like a car, long bonnet, chrome bumpers'
            : 'shorter, lighter, merges quicker',
    /** "1 in 500 from a" for a find's chance. */
    findOdds: (chance: number): string => `1 in ${Fmt.number(Math.round(1 / chance))} from a`,
    oneIn: (chance: number): string => `1 in ${Fmt.number(Math.round(1 / chance))}`,
    findRow: (id: string): string => `${S.shop.item(id)} · honour`,
    found: 'Found',
    findHint: (id: string): string => `The ${S.shop.item(id)} is the one honour that is luck. It takes the place of what you would have drawn, until you have it.`,
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

  /** Big Screen's sheet (`ui/backdrop.ts`): the player's own picture or video behind the roundabout. */
  backdrop: {
    choose: 'Choose picture or video',
    title: 'Big Screen',
    intro: 'Put your own picture or video behind the roundabout. It plays on the Game tab while Big Screen is on.',
    linkLabel: 'Link',
    linkPlaceholder: 'YouTube, image or video link',
    show: 'Show',
    or: 'or',
    upload: 'Upload a picture',
    uploadSub: 'From your device, pictures only. It stays on this device.',
    pick: 'Choose',
    now: (what: 'youtube' | 'video' | 'image' | 'upload'): string =>
      ({ youtube: 'A YouTube video', video: 'A video from a link', image: 'A picture from a link', upload: 'Your own picture' })[what],
    nowSub: 'Behind the roundabout now.',
    remove: 'Remove',
    loading: 'Loading…',
    notALink: 'That is not a web link. Copy the whole address, starting with https://',
    cannotLoad: 'That link did not load. Use the address of the picture or video itself (it often ends in .jpg, .png or .mp4); some sites do not let their pictures show elsewhere.',
    notAPicture: 'Only pictures can be uploaded. For a video, paste a YouTube link.',
    unreadable: 'That picture could not be read. Try another one.',
    notKept: 'Too big to keep on this device: it shows until you close the game.',
    note: 'A link loads straight from its own site (YouTube, or wherever the picture lives), on this device only. Nothing is sent to us.',
    on: 'Big Screen is on',
    lost: 'Big Screen: your link did not load. The city is back for now.',
  },

  daily: {
    title: 'DAILY SHIFT',
    /** Its row under Progress → Today. */
    name: 'Daily Shift',
    ready: 'Ready',
    perfectRun: 'PERFECT RUN',
    welcomeBack: (m: string): string => `Welcome back · your toll booths earned +${money(m)}`,
    done: 'Done',
    readyHint: 'Your first shift of the day. One try, the same shift for everyone.',
    doneHint: (streak: number): string => (streak > 1 ? `Done · ${streak} days in a row · back tomorrow` : 'Done · back tomorrow'),
    dailyDone: (m: string, streak: number): string => `DAILY SHIFT DONE · +${money(m)}${streak > 1 ? ` · ${streak} days in a row` : ''} · EVENT CHEST`,
    splashLine: (e: CityEvent): string => `Today's city: ${S.cityEvent(e)} · one try`,
    streakLine: (streak: number): string => (streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} in a row · keep it going` : 'Play it every day for a streak'),
    nextMilestone: (left: number, item: string): string => `${left} more ${left === 1 ? 'day' : 'days'} for ${S.shop.item(item)}`,
    /** The second line of its row under Progress → Today: what it is, or the streak and what it brings next. */
    rowLine(streak: number, open: boolean, next: { left: number; item: string } | null): string {
      if (streak <= 0) return open ? S.daily.readyHint : 'Back tomorrow · play it every day for a streak';
      const days = `${streak} ${streak === 1 ? 'day' : 'days'} in a row`;
      const parts = [days, next ? S.daily.nextMilestone(next.left, next.item) : null, open ? null : 'back tomorrow'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    milestone: (days: number, item: string): string => `${days} DAYS IN A ROW · ${S.shop.item(item)} unlocked`,
    eventChestFound: 'EVENT CHEST FOUND',
    luckyDrop: 'LUCKY DROP · STANDARD CHEST',
    welcomeChest: 'YOUR FIRST CHEST · open it in the Shop',
    perfectRunFirst: (pay: number): string => `PERFECT RUN · no crash or cut-off · +${pay} % pay`,
    /** The pill over the Daily Shift: the streak, its bonus, and when it breaks. */
    streakPill(streak: number, bonus: number | null, endsIn: number | null): string {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'day' : 'days'} in a row`;
      if (endsIn !== null) return `${days} · ends in ${endsIn < 1 ? 'under 1 h' : `${Math.floor(endsIn)} h`}`;
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % pay on every shift` : `${days} · keep it going`;
    },
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
      ({ maps: 'Maps', commons: 'Commons', rares: 'Rares', epics: 'Epics', legends: 'Legends', seasons: 'Seasons', loyalty: 'Loyalty', honours: 'Honours', pass: 'Season Pass' })[a],
    complete: (a: Album, reward: string): string => `ALBUM COMPLETE · ${S.albums.name(a)} · +${money(reward)} · new frame`,
    progress: (entries: { album: Album; owned: number; total: number }[]): string =>
      'Albums · ' + entries.map((e) => `${S.albums.name(e.album)} ${e.owned}/${e.total}`).join(' · '),
  },

  race: {
    best: 'BEST',
    delta: (seconds: number): string => (seconds <= 0 ? '−' : '+') + `${Math.abs(seconds).toFixed(1)} s`,
    newBest: 'NEW BEST TIME',
  },

  /** Progress → Mastery → Feats (core/feats.ts): the hardest deeds and what they pay. */
  feats: {
    goal(g: FeatGoal): string {
      switch (g.k) {
        case 'prestige':
          return `Reach Prestige ★${g.rank}`;
        case 'elite':
          return `Reach Elite ${g.level}`;
        case 'legendary':
          return `Complete ${g.shifts} Legendary Shifts`;
      }
    },
    have: (have: number, need: number): string => `${Math.min(have, need)} / ${need}`,
    done: 'Done',
    withTitle: (title: string): string => `+ title “${title}”`,
    eyebrow: 'Feat',
    body: 'One of the hardest deeds in the game. No chest, no casino and no money can get you this: only the road.',
    rowGoal: 'Goal',
    rowNow: 'You',
    rowTitle: 'Title',
    reward: 'Reward',
    earned: 'Earned · in your collection',
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
        case 'lifesaver':
          return `${n} emergency runs let through`;
        case 'closeShaves':
          return `${n} close shaves past a bike`;
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
        lifesaver: 'Lifesaver',
        closeShaves: 'Close Shaves',
      })[g],
    toast(done: MasteryCompletion[]): string {
      const names = done.map((c) => `${S.mastery.name(c.goal)} ${masteryNumeral(c.tier)}`);
      const chests = done.length === 1 ? 'CHEST EARNED' : `${done.length} CHESTS EARNED`;
      return `MASTERY COMPLETE · ${names.join(', ')} · ${chests}`;
    },
  },

  night: 'Night',
  blackout: 'Blackout',
  weather: (w: Weather): string =>
    ({ clear: 'Clear', lightRain: 'Light Rain', heavyRain: 'Heavy Rain', storm: 'Storm', extreme: 'Extreme Weather', fog: 'Fog', snow: 'Snow & Ice', hail: 'Hail', sandstorm: 'Sandstorm' })[w],
  cityEvent: (e: CityEvent): string =>
    ({
      roadworks: 'Roadworks',
      roadClosure: 'Road Closure',
      concert: 'Concert Traffic',
      vipConvoy: 'VIP Convoy',
      policeOperation: 'Police Operation',
      schoolRun: 'School Run',
      marathon: 'Marathon',
    })[e],

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

  goals: {
    next(g: NextGoal): string {
      if (g.k === 'challenge') return `Today · ${S.daily.challenge(g.challenge)} · +${money(String(g.reward))}`;
      return `${S.mastery.name(g.goal)} · ${g.have}/${g.need}`;
    },
    money: (short: string, upgrade: Upgrade): string => `${money(short)} to ${S.upgrades.name(upgrade)}`,
    nearMiss(n: NearMiss): string {
      switch (n.k) {
        case 'cars':
          return n.left === 1 ? `Just 1 car short of level ${n.level + 1}` : `${n.left} cars short of level ${n.level + 1}`;
        case 'best':
          return `${n.short.toLocaleString('en-US')} points short of your best`;
        case 'combo':
          return `${n.short === 1 ? 'One merge' : `${n.short} merges`} short of ${comboMultiplier(n.multiplier)}`;
      }
    },
  },

  /** The photo of a finished shift: what the print says, and the buttons under it. */
  photo: {
    button: 'Picture',
    buttonLabel: 'Take a picture of this result',
    dialog: 'Picture of your shift',
    share: 'Share',
    copy: 'Copy',
    download: 'Download',
    saved: 'Saved',
    close: 'Close',
    score: 'SCORE',
    flames: 'FLAMES',
    newBest: 'NEW BEST',
    hook: (score: string): string => `Can you beat ${score}?`,
    hookFlames: (flames: string): string => `Can you top ${flames} flames?`,
    combo: (n: number): string => `×${n} combo`,
    tightFits: (n: number): string => (n === 1 ? '1 tight fit' : `${n} tight fits`),
    busted: (n: number): string => `${n} busted`,
    wrecks: (n: number): string => (n === 1 ? '1 wreck' : `${n} wrecks`),
    chain: (n: number): string => `chain of ${n}`,
    city: 'The City',
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
    /** Only what happened: no "0 busted" in the levels before the first criminal. */
    stats(combo: number, tightFits: number, busted: number, transporters: number, time: string): string {
      return [
        time,
        combo > 1 ? `best combo ${Fmt.number(combo)}` : null,
        tightFits > 0 ? `${Fmt.number(tightFits)} tight ${tightFits === 1 ? 'fit' : 'fits'}` : null,
        busted > 0 ? `${busted} busted` : null,
        transporters > 0 ? `${transporters} paid` : null,
      ]
        .filter((x): x is string => x !== null)
        .join(' · ');
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
    critical: (points: string): string => `CRITICAL ${points}`,
    jackpotIncoming: 'JACKPOT!',
    transporterTimer: (seconds: number): string => `${Math.ceil(Math.max(0, seconds))} s`,
    jackpotPaid: (amount: string): string => `JACKPOT ${amount}`,
    shave: (points: string): string => `CLOSE SHAVE ${points}`,
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
        case 'fireTruck':
          return 'FIRE';
        case 'learner':
          return 'LEARNER';
        case 'bus':
          return 'BUS';
        case 'motorbike':
          return 'BIKE';
        case 'oversize':
          return 'WIDE LOAD';
        case 'racer':
          return 'RACER';
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
