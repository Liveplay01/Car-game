/**
 * What's new, newest first: Settings → What's new. Every bigger addition gets an entry here
 * (CLAUDE.md), in the game's language, for players: what they can do or will notice, not how
 * it was built. A new first entry lights a dot on the settings button until it is read.
 */
export interface PatchNote {
  /** Unique and stable: the save remembers the newest one read. */
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    id: '2026-09-29-more-maps',
    date: '29 September 2026',
    title: 'Four more maps',
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
    items: [
      'The Casino in the Shop: Crash, Slots, Skin Upgrade and double or nothing. Play money only, with the odds one tap away.',
      'The Museum in Progress: every boss, special vehicle and condition you have met, and how to deal with it.',
    ],
  },
];

export const latestNote = (): string => PATCH_NOTES[0].id;
