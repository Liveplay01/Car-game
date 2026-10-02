/**
 * What's new, newest first: Settings → What's new. One entry per day (Leo, 01.10.2026): once a
 * day has its entry, everything new that day goes into it (an item at the top, the title and the
 * impact grown with it); the next day starts a new entry. In the game's language, for players:
 * what they can do or will notice, not how it was built (CLAUDE.md). New items light a dot on the
 * settings button until they are read, also when they join today's entry. The list shows the
 * newest day open, the rest folded, each with a badge for how much that day changed.
 */
export interface PatchNote {
  /** The day, `YYYY-MM-DD`: unique and stable. */
  id: string;
  date: string;
  title: string;
  /**
   * How much the day changed how the game plays (Leo, 29.09.2026), its strongest change:
   * `major` (red) changes rules, levels or rewards players feel; `minor` (yellow) adds or
   * polishes without changing how it plays; `fix` (green) only fixes.
   */
  impact: PatchImpact;
  /** Newest first. */
  items: string[];
}

export type PatchImpact = 'major' | 'minor' | 'fix';

export const PATCH_NOTES: PatchNote[] = [
  {
    id: '2026-10-02',
    date: '2 October 2026',
    title: 'New bosses, Ascension trials, Unlimited stages, Mastery IV and V, and more for the late game',
    impact: 'major',
    items: [
      'Fixed: the money from a taken-down boss is only yours when you finish the level. Lose the round after the arrest and the recovered heist is gone, so a boss level can no longer be replayed for cash.',
      'The leaderboards show the title each player wears under their name. Wear one under Progress → Records → Elite.',
      'Four new syndicate bosses from Level 75: the Twins, the Decoy, the Smuggler and the Kingpin. Each one has a rematch, and a new title waits for all eight.',
      'Ascension: one very hard trial for every Prestige rank, ★1 to ★10, under Progress → Goals. The last one gives the title Summit.',
      'Unlimited no longer stays the same after a few minutes: gas tankers join, night falls, a storm rolls in, military trucks come, then Overtime. New skins at 250, 500 and 1,000 cars in one run.',
      'Prestige gives something on every rank now: a skin or a title from ★4 to ★20, and two titles beyond. The leaderboard star changes its look at ★4, ★10 and ★20.',
      'Mastery tiers IV and V, and two new masteries: Lifesaver and Close Shaves. Reach tier V in all of them for the title Mastermind.',
      'New on the road from Level 85: the oversize load, slow and long; keep your distance for a bonus. From Level 90: street racers; ram them with a police car.',
      'New weather: hail from Level 55, sandstorms from Level 65. New city event from Level 40: the Marathon.',
      'Street Builder: tap a built arm or module to see what it does, then Move or Delete it. Moving is free: drag it to a free spot, or tap one. Delete asks once more, since nothing is paid back.',
      'Installed the game? Press and hold its icon to jump straight into the Daily Shift, Unlimited or Multiplayer.',
      'On CrazyGames the free chest in the Shop now comes with a real ad. The chest is yours once the ad has played to the end; still three a day.',
      'On CrazyGames, a multiplayer invite now opens the game on CrazyGames for your friend and joins your room.',
      'While the game loads, your car circles the roundabout. If it cannot start, it says so and lets you try again.',
      'A link that leads nowhere now shows a "road closed" page with the way back to the roundabout.',
    ],
  },
  {
    id: '2026-10-01',
    date: '1 October 2026',
    title: 'Briefings, Feats, Big Screen, Cloud sync and the Classic',
    impact: 'major',
    items: [
      'Settings no longer has "Import a save file": Cloud sync is the way to bring your progress to another device.',
      'Settings now links to the Roundabout Timing Wiki on Fandom: guides, vehicles and tips from the community.',
      'Fixed: after a crash you could spam cars into the slowed traffic and fill the roundabout with your own cars for a free combo and Unlimited record. A car that has to brake its way in behind slow traffic now shows "Jammed · no points": it scores nothing and does not count as a car in Unlimited.',
      'Dead Centre and Tight Squeeze now explain on their start screen what a Perfect Input and a Tight Fit need: a Perfect Input is the middle of a medium gap, not a huge one.',
      'Motorbikes are red now, with a light helmet and handlebars: the dark ones were hard to see on the asphalt.',
      'Something new on the road now tells you what to do: the first time you meet a criminal, a money transporter, an ambulance and the rest, the top bar shows what to do until it is done. New weather and city events get a few seconds there as the shift starts.',
      'Let a criminal get away and the next one reminds you how to catch it.',
      'Messages now appear at the top, under the score bar, so your thumb no longer covers them while you play.',
      'Rain and snow are much lighter on your phone: the same showers and flurries, drawn in a fraction of the work.',
      'A crash shakes the camera without redrawing the whole city each frame, so big pile-ups stay smooth on older phones. It looks exactly the same.',
      'Hidden buttons and the tab bar no longer cost your phone any work while you play.',
      'The Classic: a new car with a long bonnet and chrome bumpers. It drives like a car and is the only honour you can find by luck: 1 Standard Chest in 500 holds it, until you have it. The odds are on the chest.',
      'A new shift no longer switches the weather on: rain starts drop by drop, fog and storms drift in over a few seconds.',
      'Challenge a friend now shares a short link, and in a chat it shows a picture of the score to beat. If you have a leaderboard name, the picture says it is from you.',
      'Fixed: on CrazyGames a shift could hang on the count-in after you clicked outside the game. The pause and the count-in are gone there: the game simply carries on.',
      'Roundabout Timing is now officially on CrazyGames. Settings has a link to its page: rate it and share it with friends.',
      'Cloud sync is live: your progress goes to the cloud two seconds after it changes.',
      'Your other devices pick it up by themselves within seconds, between shifts. No more choosing when only one device played.',
      'You are only asked when both devices played since they last synced.',
      'Fixed: Cloud sync works again for long careers. It no longer fails with "too large" after many levels.',
      'Your best times per level take far less space in your save.',
      'The Collection now glides on after a flick and springs back at its ends, like the other lists.',
      'Scrolling with a mouse wheel or trackpad glides smoothly in every list.',
      'Cloud sync replaces the export: Settings no longer writes a save file. A file you exported before can still be imported.',
      'The Home Screen tip at Level 5 is now a simple recommendation, and the later tip points to Cloud sync.',
      'Space always sends a car now, also after you clicked a tab like the Shop.',
      'A card you tap in the Collection glides up above its details instead of hiding behind them.',
      'On a keyboard the arrow keys, Page Up/Down, Home and End scroll the lists.',
      'The Cloud sync pop-up waits until Level 3, when there is progress to keep.',
      'Progress has four sections now: Records, Today, Goals and Museum. No more tabs inside tabs, and every list scrolls.',
      'Today holds the Daily Shift (with your streak), the Weekly Shift, the Season Pass and the quests, all in one style.',
      'Goals gathers the Trials, Mastery and Feats in one list.',
      'Records shows your six big numbers; tap All stats for the rest. Modes you have never played no longer show a row of dashes.',
      'The Collection has four shelves: Cars (by rarity, with the vehicles and season skins), Maps, Honours and Pass.',
      'The Weekly Elite is now called the Weekly Shift, so it is not mixed up with the Elite track.',
      'New under Progress → Mastery → Feats: the hardest deeds in the game, each with a reward no chest, casino or money can get you.',
      'Four animated car skins: Nova (Prestige ★10), Singularity (★20), Zenith Crown (Elite 75) and Undying Flame (50 Legendary Shifts).',
      'Two new maps: Gilded City, a night city in gold leaf around a gold obelisk (Prestige ★15), and Event Horizon, a black hole with its disc of fire (Elite 100).',
      'Five new titles to wear: Ascended, Eternal, Grandmaster, Centurion and Immortal.',
      'Every feat shows its reward, its goal and how far you are. Already there? Your reward is waiting in your collection.',
      'Cloud sync: Settings → Cloud sync backs your progress up and gives you a code like K7M2-9QXA-4TFB. Type it on another device to carry on there. No account and no password.',
      'Let your browser remember the sync code: after you back up, it offers to save it in your password manager, and fills it in on a new device.',
      'Your name comes along: load your progress on a new device and you are the same player again, with your name, leaderboard scores, friends and multiplayer name.',
      'Changed progress on two devices? The game shows both and asks which to keep. It never replaces anything quietly.',
      'Friends board: on the leaderboard, switch to Friends. Share your friend code, type a friend’s code, and see how you rank against just them.',
      'Multiplayer reaches more players: phones on mobile data and school Wi-Fi that could not find each other before now connect through a relay.',
      'New Prestige reward at ★5: Big Screen, a map that puts your own picture or video behind the roundabout.',
      'Wear it in Shop → Collection → Maps, then paste a link (a YouTube video, an image or a video file) or upload a picture from your device. Videos play muted and on a loop.',
      'Already past ★5? Big Screen is waiting in your collection.',
      'An uploaded picture stays on your device. Change or remove it any time with “Choose picture or video”.',
      'On the leaderboard, a player’s Prestige rank is now a star of its own with the rank inside: silver at ★1, gold at ★2, iris from ★3, with a slow glint across it.',
      'Tap a star to see how Prestige works: what you keep, what starts over, how much harder the traffic gets and what you earn. Nothing on the road changes.',
    ],
  },
  {
    id: '2026-09-30',
    date: '30 September 2026',
    title: 'Leaderboards, two lanes, a Season Pass and a name',
    impact: 'major',
    items: [
      'See how you rank: tap Ranks at the top of Progress. One list for the level you have reached, one for your Unlimited record.',
      'No sign-up: just enter a name. Your level and your Unlimited record come from the progress on this device and go on the leaderboard by themselves whenever they improve.',
      'It is the same name you use in multiplayer: change it in one place and it changes in the other.',
      'Changed your mind? Remove your name and scores from the leaderboard at any time, in the same place.',
      'Your cars now brake for a jam where they join, instead of ploughing into the queue at full speed.',
      'From Level 80 the ring has two lanes. An arrow at your stop line shows where your front car is headed; the inner lane crosses the outer one.',
      'New on the road: motorbikes (from Level 22) that slip into tiny gaps, a close shave past one pays extra; learner drivers (from Level 28) that hesitate, give them room for a bonus; fire engines (from Level 35) with a longer road to keep clear.',
      'New city event from Level 30: the School Run. School buses stop at a bus stop on the ring.',
      'New weather: fog from Level 35, snow and ice from Level 45. Both pay a little more.',
      'The Season Pass (Progress → Quests, from Level 15): a track of twelve tiers each season, bought with play money, with three animated skins per season that come back every year.',
      'The Hall of Fame (Records → Elite): a plaque for every Prestige rank, a gold wall on the island and a skin of its own.',
      'On iPhone and iPad the game now shows, once at Level 5, how to put it on your Home Screen, so Safari can never clear your progress.',
      'The game has a proper name now: Roundabout Timing.',
      'Settings → Legal has the Privacy Policy, the Imprint and the open-source licenses. Short version: no accounts, no tracking, your progress stays on your device.',
      'Playing on CrazyGames? Log in there and your progress follows you to every device.',
      'Music and sound effects have their own switches in Settings: keep the crashes, lose the music, or the other way round.',
      'If your browser stops saving your progress (a private window, a full phone), the game now tells you once, with the way to keep it: Export in Settings.',
      'Updates arrive quietly: the game reloads in the background when nothing would be lost, and points you here afterwards.',
      'Multiplayer shrugs off broken or flooded messages instead of stalling the match, and says so plainly when the game was updated mid-lobby.',
      'Screen readers now hear how a shift ended and every notice.',
    ],
  },
  {
    id: '2026-09-29',
    date: '29 September 2026',
    title: 'Sunny maps, eight new maps, photos and a smoother game',
    impact: 'major',
    items: [
      'Fixed: on some devices the cars flickered or vanished on busy maps like Mushroom Grove.',
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
      'Picture now takes a real photo: a flash, a click, and an instant print of your roundabout drops in and develops.',
      'The print shows your score, your best moments, the map, a NEW BEST stamp when it is one and the date, and dares your friends to beat it.',
      'Share it straight away or download it.',
      'The daytime maps are bright now: fresh green lawns under the cherry trees in Sakura, blazing sand, new snow, sunny meadows, vineyards, jungle, highlands and red rock.',
      'Houses on sunny maps have roofs in daylight colours, and butterflies flutter over the Meadow.',
      'A new map in the chests: Beach, with a turquoise cove, surf, a lifeguard tower, parasols, sandcastles and gulls.',
      'Fixed: vineyard fields overlapped each other and ran under houses and roads.',
      'Night maps like Neon, Cosmos and Lantern Festival stay dark, and the road stays dark everywhere, so cars read just as before.',
      'Four new maps in the chests: Red Canyon, Highlands, Lantern Festival and Crystal Cavern.',
      'Red Canyon: a rock arch with a campfire under it, yucca palms and grit blowing over the rim.',
      'Highlands: a ring of standing stones round a lochan, heather in mats and mist in the hollows.',
      'Lantern Festival: paper lanterns line the streets, stalls around a stage with a great paper drum, and sky lanterns go up.',
      'Crystal Cavern: a geode of violet prisms round a lit pool, with rays turning and dust that catches the light.',
      'Fixed: in long Unlimited and multiplayer games the traffic stopped joining the roundabout, and sending cars nonstop became safe. The traffic now keeps coming.',
      'Four new maps in the chests: Harbour, Vineyard, Mushroom Grove and Abyss.',
      'The trees around the city finally look like trees.',
      'A richer city: asphalt with grain and worn markings, houses with real roofs, street lamps pooling light on the road, headlights, and cars with a soft shadow and a sheen.',
      'Records: see how early or late you tap on average.',
      'Share a picture of your result.',
      'Settings: a left-handed mode and larger text for notices and cards.',
      'Casino: coins fly to your balance, bigger wins get louder, new sounds of coins, reels and chips, and no result shows before its reveal.',
      'On a slow device the game lowers its resolution by itself to stay smooth.',
      'The first time a shift brings new weather, night or a city event, a card explains what changes.',
      'Special vehicles and bosses say what to do the first time they show up.',
      'Smoother on older phones, and quicker to load.',
    ],
  },
  {
    id: '2026-09-28',
    date: '28 September 2026',
    title: 'Casino and Museum',
    impact: 'major',
    items: [
      'The Casino in the Shop: Crash, Slots, Skin Upgrade and double or nothing. Play money only, with the odds one tap away.',
      'The Museum in Progress: every boss, special vehicle and condition you have met, and how to deal with it.',
    ],
  },
];

/**
 * What the save remembers as read: the newest day and how many items it had. A new item on the
 * same day changes it too, so the dot comes back for it.
 */
export const latestNote = (): string => `${PATCH_NOTES[0].id}#${PATCH_NOTES[0].items.length}`;
