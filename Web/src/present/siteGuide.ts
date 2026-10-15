import { baseConfig, INVITE_LEVEL } from '../core/config';
import { museumId, shelfEntries, type MuseumEntry } from '../core/museum';
import { CASINO_GAMES } from '../core/casino';
import { S } from './strings';
import { COLORS, type ColorToken } from './theme';
import type { SignalKind } from './hud';
import type { SwipeMode } from './flow';
import { signalDetail } from './museumSignal';
import { INTROS } from './intros';
import { IntroArt } from './introArt';
import { MuseumPage } from './museum';
import { artSvg } from './svg';

/**
 * Two guides for the website (`siteData.ts`, Leo, 15.10.2026): what every ring signal means, and what every feature is.
 * English, written for readers of timing.love, not shown in the game. Both are catalogs the compiler or `npm test` holds
 * to the game: a new signal kind or game mode does not compile until it is described here, and the test reads
 * `session.ts` and `versus.ts` and fails when the game plays a signal this guide does not know.
 */

const slug = (id: string): string => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const rgb = (token: ColorToken): string => `rgb(${COLORS[token].slice(0, 3).join(' ')})`;
const capital = (text: string): string => text.charAt(0) + text.slice(1).toLowerCase();

// MARK: Ring signals

/** What the ring does, as the game's `RingSignals` draws it. The site plays the same motion in SVG (`src/ring.ts`). */
const KINDS: Record<SignalKind, { name: string; look: string; means: string }> = {
  sweep: { name: 'Sweep', look: 'A light runs once round the rim, starting at your road.', means: 'Something is announced: look out.' },
  wave: { name: 'Wave', look: 'A ring widens out from the island.', means: 'Done right: a bonus, a takedown, a payout.' },
  miss: { name: 'Pull-back', look: 'A ring pulls back into the island.', means: 'A bonus slipped away.' },
  flush: { name: 'Flush', look: 'The whole rim lights up and fades.', means: 'An ending, or a loud warning.' },
  heal: { name: 'Heal', look: 'Plus signs light up round the rim.', means: 'A crash was forgiven.' },
  splash: { name: 'Splash', look: 'The rim flares and juice sprays out of it.', means: 'Your combo climbed a tier.' },
  victory: { name: 'Lap of honour', look: 'A light runs round the rim, then the rim bursts.', means: 'A shift is cleared.' },
};

/** The words for the colours a signal comes in. Colour alone is never the message: the site names every one. */
const COLOR_NAMES: Partial<Record<ColorToken, { name: string; means: string }>> = {
  coin: { name: 'Gold', means: 'Money and the best result.' },
  juiceGreen: { name: 'Green', means: 'Yours: combo, chain and forgiven crashes.' },
  skinMint: { name: 'Mint', means: 'The softer green of a plain win.' },
  destructive: { name: 'Red', means: 'Something went wrong.' },
  lightBlue: { name: 'Blue', means: 'Police and rescue.' },
  lightRed: { name: 'Bright red', means: 'A danger on the road, or a police light.' },
  vehicleCriminal: { name: 'Purple', means: 'A criminal.' },
  vehicleCargo: { name: 'Cash gold', means: 'The money transporter.' },
  vehicleOversize: { name: 'Orange', means: 'The oversize load.' },
  vehicleWedding: { name: 'Rose', means: 'The wedding convoy.' },
  vehicleRacer: { name: 'Pink', means: 'The street racers.' },
  learnerSign: { name: 'Teal', means: 'The learner driver.' },
  rushHour: { name: 'Lime', means: 'Rush Hour.' },
  primary: { name: 'White', means: 'A new stage of the run.' },
  player1: { name: 'Player colour', means: 'In multiplayer, the colour of the player it is about.' },
};

export interface GuideEvent {
  id: string;
  group: 'shift' | 'score' | 'run';
  kind: SignalKind;
  color: ColorToken;
  second?: ColorToken;
  title: string;
  when: string;
}

/** Every signal that is not about one vehicle. Keep in step with `session.react` (the test holds it to that). */
export const GUIDE: GuideEvent[] = [
  { id: 'perfect-run', group: 'shift', kind: 'victory', color: 'coin', second: 'juiceGreen', title: 'Perfect Run', when: 'You clear a shift with no crash and no cut-off.' },
  { id: 'shift-cleared', group: 'shift', kind: 'victory', color: 'juiceGreen', second: 'skinMint', title: 'Shift cleared', when: 'You clear a shift, but not perfectly.' },
  { id: 'struck-out', group: 'shift', kind: 'flush', color: 'destructive', title: 'Struck out', when: 'The crash that ends the shift: your last strike.' },
  { id: 'shift-lost', group: 'shift', kind: 'flush', color: 'vehicleCriminal', title: 'Shift lost', when: 'The shift ends without a final crash, for example when a criminal gets away.' },
  { id: 'police-crash-limit', group: 'shift', kind: 'flush', color: 'lightBlue', title: 'Too many police crashes', when: 'Your police cars have crashed more often than the shift allows.' },
  { id: 'crash-forgiven', group: 'shift', kind: 'heal', color: 'juiceGreen', second: 'juiceGreen', title: 'Crash forgiven', when: 'A crash the shift survives: a shield, or a strike to spare.' },
  { id: 'police-crash-forgiven', group: 'shift', kind: 'heal', color: 'lightBlue', second: 'lightRed', title: 'Police crash forgiven', when: 'A police car crashes within the limit of the shift.' },
  { id: 'combo-tier', group: 'score', kind: 'splash', color: 'juiceGreen', second: 'skinMint', title: 'Combo tier up', when: 'Your combo reaches the next multiplier. The higher the tier, the more drops.' },
  { id: 'combo-top', group: 'score', kind: 'splash', color: 'juiceGreen', second: 'coin', title: 'Top multiplier', when: 'Your combo reaches its highest multiplier: gold joins the green.' },
  { id: 'critical', group: 'score', kind: 'wave', color: 'coin', title: 'Critical Merge', when: 'A tight merge turns critical and pays extra.' },
  { id: 'chain-held', group: 'score', kind: 'wave', color: 'juiceGreen', title: 'Chain held', when: 'The Chain Saver keeps your chain alive through a plain merge.' },
  { id: 'armour-cracked', group: 'score', kind: 'wave', color: 'coin', title: 'Armour cracked', when: 'A police car cracks the armour of the Armoured Boss.' },
  { id: 'jackpot', group: 'score', kind: 'sweep', color: 'coin', title: 'Jackpot transporter', when: 'A golden Jackpot transporter is announced, and again when it pays.' },
  { id: 'rush-hour', group: 'run', kind: 'sweep', color: 'rushHour', title: 'Rush Hour', when: 'The last cars of a shift come faster and score double.' },
  { id: 'unlimited-mark', group: 'run', kind: 'sweep', color: 'coin', title: 'Unlimited milestone', when: 'In Unlimited you reach a milestone of cars sent.' },
  { id: 'unlimited-stage', group: 'run', kind: 'sweep', color: 'primary', title: 'New stage', when: 'Unlimited moves on: tankers, night, a storm, military trucks, then overtime.' },
  { id: 'shield-gained', group: 'run', kind: 'wave', color: 'player1', title: 'Shield gained', when: 'In multiplayer, a player earns a shield. The ring takes that player\'s colour.' },
  { id: 'shield-used', group: 'run', kind: 'heal', color: 'player1', title: 'Shield used', when: 'In multiplayer, a shield takes a crash for a player.' },
];

const GROUPS = [
  { id: 'shift', title: 'How a shift goes', text: 'The ring tells you the end before the words do.' },
  { id: 'score', title: 'Score and bonuses', text: 'Little rewards for merging well.' },
  { id: 'run', title: 'The run itself', text: 'Moments of a run, in Shift, Unlimited and multiplayer.' },
] as const;

const STEP: Record<string, { kind: SignalKind; label: string }> = {
  arrive: { kind: 'sweep', label: 'Coming' },
  paid: { kind: 'wave', label: 'Done right' },
  missed: { kind: 'miss', label: 'Missed' },
  note: { kind: 'flush', label: 'Careful' },
};

/** The vehicles that signal: the game's own Museum data says how, so the two can never disagree. */
function vehicles() {
  const entries: MuseumEntry[] = [...shelfEntries(0), ...shelfEntries(1)];
  return entries.flatMap((e) => {
    const detail = signalDetail(e);
    if (!detail) return [];
    const note = detail.note === 'escaped' ? 'vehicleCriminal' : 'destructive';
    // The game's loop (`SignalLoop`): the arm glows in `arm`, a light runs round in `sweep`, the vehicle is drawn in the first of them.
    const car = detail.arm ?? detail.sweep;
    return [
      {
        id: slug(museumId(e)),
        name: S.museum.name(e),
        art: artSvg(96, (list, c) => MuseumPage.art(list, e, c, 1, true, 0, 1, 96)),
        steps: detail.lines.map((l) => ({
          step: l.kind,
          label: STEP[l.kind].label,
          kind: STEP[l.kind].kind,
          color: l.color ?? note,
          arm: detail.arm ? rgb(detail.arm.color) : null,
          sweep: detail.sweep ? rgb(detail.sweep.color) : null,
          car: car ? rgb(car.color) : null,
          // The label above says "Done right" or "Missed" already: the game's line starts the same way.
          text: l.text.replace(/^(Done right|Missed): (.)/, (_, _label: string, first: string) => first.toUpperCase()),
        })),
      },
    ];
  });
}

export function signalsFile() {
  const colors = new Set<ColorToken>();
  const vehicleList = vehicles();
  for (const g of GUIDE) [g.color, g.second].forEach((c) => c && colors.add(c));
  const known = (c: ColorToken) => COLOR_NAMES[c] ?? { name: c, means: '' };
  vehicleList.forEach((v) => v.steps.forEach((s) => colors.add(s.color as ColorToken)));
  return {
    version: 1,
    kinds: (Object.keys(KINDS) as SignalKind[]).map((id) => ({ id, ...KINDS[id] })),
    colors: [...colors].map((id) => ({ id, css: rgb(id), ...known(id) })),
    groups: GROUPS.map((g) => ({
      ...g,
      signals: GUIDE.filter((x) => x.group === g.id).map((x) => ({
        id: x.id,
        kind: x.kind,
        color: rgb(x.color),
        second: x.second ? rgb(x.second) : null,
        colorName: known(x.color).name,
        title: x.title,
        when: x.when,
        shows: KINDS[x.kind].look,
      })),
    })),
    vehicles: vehicleList.map((v) => ({ ...v, steps: v.steps.map((s) => ({ ...s, color: rgb(s.color as ColorToken), colorName: known(s.color as ColorToken).name })) })),
  };
}

// MARK: Features

interface Feature {
  id: string;
  title: string;
  line: string;
  body: string[];
  /** A short list under the text: the casino's five games, the boards. */
  parts?: { title: string; body: string }[];
  /** The game's own picture of a place; null where the game has none (modes, friends): the site draws a monogram. */
  art: string | null;
}

const art = (draw: (list: Parameters<Parameters<typeof artSvg>[1]>[0], c: Parameters<Parameters<typeof artSvg>[1]>[1]) => void): string => artSvg(96, draw);

/** Every mode of the swipe bar. A new one does not compile until it is told here. */
const MODE_BODY: Record<SwipeMode, string[]> = {
  shift: [
    'The career. Each shift has a fixed number of cars, about ten at Level 1 and up to thirty later. Clear it to level up and earn coins. A lost shift is played again on the same level.',
    'The first levels bring one thing at a time: gaps and merges, then the police, then criminals, then the money transporter, then the tanker.',
  ],
  unlimited: [
    'There is no car limit here. The traffic gets denser and faster every minute, and new trouble rolls in the longer you last: gas tankers, night, a storm, military trucks, then overtime.',
    'Your longest run goes on the leaderboard, and milestones of cars sent unlock skins.',
  ],
  mayhem: [
    'In Mayhem you want the crashes. Twelve cars, no police and no criminals: set off chain reactions with gas tankers and military trucks, and chase the longest chain.',
    'Every new wreck adds flames, and a crash within a moment of the last one extends the chain.',
  ],
  chill: [
    'Unlimited without the pressure. A calm pace, a mild sky, and no police, criminals or special vehicles. A crash dents the cars and the traffic reacts, but nothing ends.',
    'Finish with Done. A chill ride does not count for the career, the ranks or the records.',
  ],
  multiplayer: [
    'Everyone gets their own road into the same roundabout. Share a four-digit code or an invite link, no account needed. Up to four players, and bots fill the empty roads.',
    'Merge tight to send a truck onto a friend\'s road. The last one without a crash wins. Practise against bots, even offline.',
  ],
};
const modes = (): Feature[] =>
  (Object.keys(MODE_BODY) as SwipeMode[]).map((m) => ({ id: `mode-${m}`, title: capital(S.modes.name(m)), line: S.modes.line(m), body: MODE_BODY[m], art: null }));

/** The game's own drawer for each place, word for word: the first time a player reaches it, the game says this. */
const place = (id: (typeof INTROS)[number]): Feature => {
  const text = S.intro[id];
  const feature: Feature = { id: `place-${id}`, title: text.title, line: text.line, body: [...text.body], art: art((l, c) => IntroArt.add(l, id, c, 96)) };
  if (id === 'casino') feature.parts = CASINO_GAMES.map((g) => ({ title: S.casino.game(g), body: S.casino.detail[g].join(' ') }));
  if (id === 'mafia') feature.parts = [{ title: 'The deal', body: S.mafia.pitch }, { title: 'The rules', body: S.mafia.rules(baseConfig.mafiaLateRate, baseConfig.mafiaLateCap, baseConfig.mafiaGarnish) }];
  return feature;
};

const together = (): Feature[] => [
  {
    id: 'friends',
    title: 'Friends',
    line: 'A friend code, a board, an invite',
    body: [
      S.friends.intro,
      `A friend code has eight letters and numbers, like K7M2-9QXA. Add a friend's code and they join your board; it works one way, so nobody has to accept. Invite a friend with your code or link: when they reach Level ${INVITE_LEVEL}, you both get a Standard Chest.`,
    ],
    art: null,
  },
  {
    id: 'ranks',
    title: 'Ranks',
    line: 'The leaderboards, live',
    body: ['Pick a name and your best scores go on the boards. Shift level ranks the Prestige rank first, then the level; Unlimited ranks your longest run.'],
    parts: (Object.keys(S.ranks.boards) as (keyof typeof S.ranks.boards)[]).map((id) => ({ title: S.ranks.boards[id].label, body: S.ranks.boards[id].empty.replace(/ to be the first one here\.?/, '.') })),
    art: null,
  },
  {
    id: 'challenges',
    title: 'Challenges',
    line: 'Send a shift to a friend',
    body: ['Share any shift as a link with a picture of your score. A friend opens it and plays the same shift: the same cars, the same traffic, to beat your result.'],
    art: null,
  },
  {
    id: 'cloud-sync',
    title: 'Cloud sync',
    line: 'Take your progress anywhere',
    body: ['Optional. A sync code keeps a copy of your progress that you can bring to any device. No email and no password, and if two devices disagree the game asks you, it never overwrites quietly.', 'Your game is saved in your browser either way, and it plays offline after the first visit.'],
    art: null,
  },
  {
    id: 'prestige',
    title: 'Prestige',
    line: S.ranks.backTo1,
    body: [S.ranks.backTo1Sub, S.ranks.showSub],
    art: null,
  },
];

export function featuresFile() {
  const intro = (ids: (typeof INTROS)[number][]) => ids.map(place);
  return {
    version: 1,
    groups: [
      { id: 'modes', title: 'Ways to play', text: 'Swipe sideways on the Game tab to change the mode.', items: modes() },
      { id: 'road', title: 'Your road', text: 'Everything that grows while you play.', items: intro(['daily', 'trials', 'builder', 'pass', 'museum']) },
      { id: 'money', title: 'Money, luck and the Family', text: 'Optional, and always with play money.', items: intro(['casino', 'club', 'gamefund', 'mafia']) },
      { id: 'together', title: 'Friends and rivals', text: 'No account needed to play. A name is enough to join in.', items: together() },
    ],
  };
}
