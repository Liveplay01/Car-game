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
    id: '2026-10-01-tidy-up',
    date: '1 October 2026',
    title: 'A tidier Progress and Collection',
    impact: 'minor',
    items: [
      'Progress has four sections now: Records, Today, Goals and Museum. No more tabs inside tabs, and every list scrolls.',
      'Today holds the Daily Shift (with your streak), the Weekly Shift, the Season Pass and the quests, all in one style.',
      'Goals gathers the Trials, Mastery and Feats in one list.',
      'Records shows your six big numbers; tap All stats for the rest. Modes you have never played no longer show a row of dashes.',
      'The Collection has four shelves: Cars (by rarity, with the vehicles and season skins), Maps, Honours and Pass.',
      'The Weekly Elite is now called the Weekly Shift, so it is not mixed up with the Elite track.',
    ],
  },
  {
    id: '2026-10-01-feats',
    date: '1 October 2026',
    title: 'Feats: the rarest rewards in the game',
    impact: 'major',
    items: [
      'New under Progress → Mastery → Feats: the hardest deeds in the game, each with a reward no chest, casino or money can get you.',
      'Four animated car skins: Nova (Prestige ★10), Singularity (★20), Zenith Crown (Elite 75) and Undying Flame (50 Legendary Shifts).',
      'Two new maps: Gilded City, a night city in gold leaf around a gold obelisk (Prestige ★15), and Event Horizon, a black hole with its disc of fire (Elite 100).',
      'Five new titles to wear: Ascended, Eternal, Grandmaster, Centurion and Immortal.',
      'Every feat shows its reward, its goal and how far you are. Already there? Your reward is waiting in your collection.',
    ],
  },
  {
    id: '2026-10-01-cloud-and-friends',
    date: '1 October 2026',
    title: 'Cloud sync, friends and better multiplayer',
    impact: 'minor',
    items: [
      'Cloud sync: Settings → Cloud sync backs your progress up and gives you a code like K7M2-9QXA-4TFB. Type it on another device to carry on there. No account and no password.',
      'Let your browser remember the sync code: after you back up, it offers to save it in your password manager, and fills it in on a new device.',
      'Your name comes along: load your progress on a new device and you are the same player again, with your name, leaderboard scores, friends and multiplayer name.',
      'Changed progress on two devices? The game shows both and asks which to keep. It never replaces anything quietly.',
      'Friends board: on the leaderboard, switch to Friends. Share your friend code, type a friend’s code, and see how you rank against just them.',
      'Multiplayer reaches more players: phones on mobile data and school Wi-Fi that could not find each other before now connect through a relay.',
    ],
  },
  {
    id: '2026-10-01-big-screen',
    date: '1 October 2026',
    title: 'Big Screen: your own backdrop',
    impact: 'major',
    items: [
      'New Prestige reward at ★5: Big Screen, a map that puts your own picture or video behind the roundabout.',
      'Wear it in Shop → Collection → Maps, then paste a link (a YouTube video, an image or a video file) or upload a picture from your device. Videos play muted and on a loop.',
      'Already past ★5? Big Screen is waiting in your collection.',
      'An uploaded picture stays on your device. Change or remove it any time with “Choose picture or video”.',
    ],
  },
  {
    id: '2026-10-01-prestige-star',
    date: '1 October 2026',
    title: 'A star for Prestige',
    impact: 'minor',
    items: [
      'On the leaderboard, a player’s Prestige rank is now a star of its own with the rank inside: silver at ★1, gold at ★2, iris from ★3, with a slow glint across it.',
      'Tap a star to see how Prestige works: what you keep, what starts over, how much harder the traffic gets and what you earn. Nothing on the road changes.',
    ],
  },
  {
    id: '2026-09-30-leaderboard',
    date: '30 September 2026',
    title: 'Leaderboards',
    impact: 'minor',
    items: [
      'See how you rank: tap Ranks at the top of Progress. One list for the level you have reached, one for your Unlimited record.',
      'No sign-up: just enter a name. Your level and your Unlimited record come from the progress on this device and go on the leaderboard by themselves whenever they improve.',
      'It is the same name you use in multiplayer: change it in one place and it changes in the other.',
      'Changed your mind? Remove your name and scores from the leaderboard at any time, in the same place.',
    ],
  },
  {
    id: '2026-09-30-two-lanes',
    date: '30 September 2026',
    title: 'Two lanes, new traffic and a Season Pass',
    impact: 'major',
    items: [
      'Your cars now brake for a jam where they join, instead of ploughing into the queue at full speed.',
      'From Level 80 the ring has two lanes. An arrow at your stop line shows where your front car is headed; the inner lane crosses the outer one.',
      'New on the road: motorbikes (from Level 22) that slip into tiny gaps, a close shave past one pays extra; learner drivers (from Level 28) that hesitate, give them room for a bonus; fire engines (from Level 35) with a longer road to keep clear.',
      'New city event from Level 30: the School Run. School buses stop at a bus stop on the ring.',
      'New weather: fog from Level 35, snow and ice from Level 45. Both pay a little more.',
      'The Season Pass (Progress → Quests, from Level 15): a track of twelve tiers each season, bought with play money, with three animated skins per season that come back every year.',
      'The Hall of Fame (Records → Elite): a plaque for every Prestige rank, a gold wall on the island and a skin of its own.',
      'On iPhone and iPad the game now shows, once at Level 5, how to put it on your Home Screen, so Safari can never clear your progress.',
    ],
  },
  {
    id: '2026-09-30-roundabout-timing',
    date: '30 September 2026',
    title: 'Say hello to Roundabout Timing',
    impact: 'minor',
    items: [
      'The game has a proper name now: Roundabout Timing.',
      'Settings → Legal has the Privacy Policy, the Imprint and the open-source licenses. Short version: no accounts, no tracking, your progress stays on your device.',
      'Playing on CrazyGames? Log in there and your progress follows you to every device.',
    ],
  },
  {
    id: '2026-09-30-safer',
    date: '30 September 2026',
    title: 'Safer progress, your own soundtrack',
    impact: 'minor',
    items: [
      'Music and sound effects have their own switches in Settings: keep the crashes, lose the music, or the other way round.',
      'If your browser stops saving your progress (a private window, a full phone), the game now tells you once, with the way to keep it: Export in Settings.',
      'Updates arrive quietly: the game reloads in the background when nothing would be lost, and points you here afterwards.',
      'Multiplayer shrugs off broken or flooded messages instead of stalling the match, and says so plainly when the game was updated mid-lobby.',
      'Screen readers now hear how a shift ended and every notice.',
    ],
  },
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
