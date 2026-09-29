/**
 * What's new, newest first: Settings → What's new. Every bigger addition gets an entry here
 * (CLAUDE.md), in the game's language, for players: what they can do or will notice, not how
 * it was built. A new first entry lights a dot on the settings button until it is read.
 * The list shows the newest open, the rest folded, each with a badge for how much it changes.
 */
export interface PatchNote {
  /** Unique and stable: the save remembers the newest one read. */
  id: string;
  date: string;
  title: string;
  /**
   * How much it changes how the game plays (Leo, 29.09.2026): `major` (red) changes rules,
   * levels or rewards players feel; `minor` (yellow) adds or polishes without changing how it
   * plays; `fix` (green) only fixes.
   */
  impact: PatchImpact;
  items: string[];
}

export type PatchImpact = 'major' | 'minor' | 'fix';

export const PATCH_NOTES: PatchNote[] = [
  {
    id: '2026-09-29-traffic-flicker',
    date: '29 September 2026',
    title: 'Cars back in sight',
    impact: 'fix',
    items: ['Fixed: on some devices the cars flickered or vanished on busy maps like Mushroom Grove.'],
  },
  {
    id: '2026-09-29-smoother',
    date: '29 September 2026',
    title: 'Smoother, fairer, clearer',
    impact: 'major',
    items: [
      'The city now takes up to half the time to draw on every map, so the game runs smoother and saves battery. It looks exactly the same.',
      'Every map in the Collection shows its own little diorama: its ground, its plants and its landmarks, so you can tell them apart at a glance.',
      'Trials that count Perfects or Tight Fits show how far you are while you play.',
      'Petals, snow and gulls fade over the island, so its text stays clear.',
      'Reduce motion is now off unless you switch it on. If your device runs slow, the game lowers its detail to stay above 30 fps and may suggest Reduce motion once.',
      'The Jackpot transporter shows its countdown in seconds, no more money sign that looked like a loss.',
      'What\'s new folds open and shut, with a badge for how much each update changes.',
      'Easier to read: quiet texts and the tab bar have more contrast, also over the bright maps.',
      'Easier to hit: small buttons and switches react to a bigger area, and a whole settings row flips its switch.',
      'New players get a chest for their first level cleared, and the first Perfect Run says what it pays.',
      'Tight Squeeze is fair now: 5 Tight Fits or better in 8 cars, and a clean merge no longer ends the try.',
      'Trials open one by one at their own level, the easiest first. The Daily Shift, the other modes, the Trials and the Casino now arrive a little later, one at a time. Anything you have already used stays open.',
      'The result line only lists what happened in the shift, no more "0 busted".',
    ],
  },
  {
    id: '2026-09-29-photo',
    date: '29 September 2026',
    title: 'Say cheese',
    impact: 'minor',
    items: [
      'Picture now takes a real photo: a flash, a click, and an instant print of your roundabout drops in and develops.',
      'The print shows your score, your best moments, the map, a NEW BEST stamp when it is one and the date, and dares your friends to beat it.',
      'Share it straight away or download it.',
    ],
  },
  {
    id: '2026-09-29-sunny-maps',
    date: '29 September 2026',
    title: 'Maps in the sun',
    impact: 'minor',
    items: [
      'The daytime maps are bright now: fresh green lawns under the cherry trees in Sakura, blazing sand, new snow, sunny meadows, vineyards, jungle, highlands and red rock.',
      'Houses on sunny maps have roofs in daylight colours, and butterflies flutter over the Meadow.',
      'A new map in the chests: Beach, with a turquoise cove, surf, a lifeguard tower, parasols, sandcastles and gulls.',
      'Fixed: vineyard fields overlapped each other and ran under houses and roads.',
      'Night maps like Neon, Cosmos and Lantern Festival stay dark, and the road stays dark everywhere, so cars read just as before.',
    ],
  },
  {
    id: '2026-09-29-more-maps',
    date: '29 September 2026',
    title: 'Four more maps',
    impact: 'minor',
    items: [
      'Four new maps in the chests: Red Canyon, Highlands, Lantern Festival and Crystal Cavern.',
      'Red Canyon: a rock arch with a campfire under it, yucca palms and grit blowing over the rim.',
      'Highlands: a ring of standing stones round a lochan, heather in mats and mist in the hollows.',
      'Lantern Festival: paper lanterns line the streets, stalls around a stage with a great paper drum, and sky lanterns go up.',
      'Crystal Cavern: a geode of violet prisms round a lit pool, with rays turning and dust that catches the light.',
    ],
  },
  {
    id: '2026-09-29-maps',
    date: '29 September 2026',
    title: 'New maps and a livelier casino',
    impact: 'major',
    items: [
      'Fixed: in long Unlimited and multiplayer games the traffic stopped joining the roundabout, and sending cars nonstop became safe. The traffic now keeps coming.',
      'Four new maps in the chests: Harbour, Vineyard, Mushroom Grove and Abyss.',
      'The trees around the city finally look like trees.',
      'A richer city: asphalt with grain and worn markings, houses with real roofs, street lamps pooling light on the road, headlights, and cars with a soft shadow and a sheen.',
      'Records: see how early or late you tap on average.',
      'Share a picture of your result.',
      'Settings: a left-handed mode and larger text for notices and cards.',
      'Casino: coins fly to your balance, bigger wins get louder, new sounds of coins, reels and chips, and no result shows before its reveal.',
      'On a slow device the game lowers its resolution by itself to stay smooth.',
    ],
  },
  {
    id: '2026-09-29-meet',
    date: '29 September 2026',
    title: 'Know what you are facing',
    impact: 'minor',
    items: [
      'The first time a shift brings new weather, night or a city event, a card explains what changes.',
      'Special vehicles and bosses say what to do the first time they show up.',
      'Smoother on older phones, and quicker to load.',
    ],
  },
  {
    id: '2026-09-28-casino',
    date: '28 September 2026',
    title: 'Casino and Museum',
    impact: 'major',
    items: [
      'The Casino in the Shop: Crash, Slots, Skin Upgrade and double or nothing. Play money only, with the odds one tap away.',
      'The Museum in Progress: every boss, special vehicle and condition you have met, and how to deal with it.',
    ],
  },
];

export const latestNote = (): string => PATCH_NOTES[0].id;
