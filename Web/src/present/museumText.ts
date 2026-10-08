import { type Config, type Weather, type CityEvent, type BossKind, weatherSeverity } from '../core/config';
import type { SpecialKind, WeatherKind, DarkKind, MuseumEntry } from '../core/museum';
import { Fmt, money, percent } from './format';

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

export const SPECIAL_TEXT: Record<SpecialKind, MuseumText & { name: string }> = {
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
    brief: 'Keep your cars out of the teal band around the learner.',
    explain: (c) => [
      'A driving-school car goes once round the ring, and now and then it brakes for no reason. The traffic behind it bunches up.',
      'A teal band shows the space around it, ahead and behind. Keep your cars out of it while it drives.',
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
  wedding: {
    name: 'Wedding Convoy',
    line: 'Three cars: keep them whole',
    brief: 'A wedding convoy: keep your cars out of the rose band around all three.',
    explain: (c) => [
      'Three decorated cars, blush white with a gold ribbon, join from one of the other arms and go once round the ring together. They drive at the speed of the traffic, so nothing slows down.',
      `A rose band shows their stretch of the ring, the gaps between them and a little room at both ends. Keep your cars out of it and the convoy pays ${money(Fmt.number(c.weddingPay))} and extends your chain when it leaves. Joining inside it only costs that bonus.`,
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

export function museumText(e: MuseumEntry): MuseumText {
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
