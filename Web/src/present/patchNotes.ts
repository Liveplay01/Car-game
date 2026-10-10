/**
 * What's new, newest first: Settings → What's new. One entry per day (Leo, 01.10.2026): once a
 * day has its entry, everything new that day goes into it (an item at the top, the title and the
 * impact grown with it); the next day starts a new entry. In the game's language, for players:
 * what they can do or will notice, not how it was built (CLAUDE.md). New items light a dot on the
 * settings button until they are read, also when they join today's entry. Every day shows its
 * short `summary` straight away (Leo, 09.10.2026: what matters, at a glance) and folds the long
 * `items` list open under it; a badge says how much that day changed.
 */
export interface PatchNote {
  /** The day, `YYYY-MM-DD`: unique and stable. */
  id: string;
  date: string;
  title: string;
  /** The mini version players see at once: at most four short lines, only what they will notice. Newest first. */
  summary: PatchItem[];
  /**
   * How much the day changed how the game plays (Leo, 29.09.2026), its strongest change:
   * `major` (red) changes rules, levels or rewards players feel; `minor` (yellow) adds or
   * polishes without changing how it plays; `fix` (green) only fixes.
   */
  impact: PatchImpact;
  /** The long list, folded under the summary. Newest first. */
  items: PatchItem[];
}

/** The most lines a day's summary may have, and the longest line: it has to be read at a glance. */
export const SUMMARY_LINES = 4;
export const SUMMARY_LENGTH = 100;

export type PatchImpact = 'major' | 'minor' | 'fix';

/**
 * One line of an entry. A plain string is ours. `from` marks what a player asked for or found
 * (Build with us, Leo, 03.10.2026): `null` says "From a player", a name says "Thanks, Name"
 * (only a name the player agreed to share).
 */
export type PatchItem = string | { text: string; from: string | null };

/** The words of an item, whether or not a player is credited. */
export const itemText = (item: PatchItem): string => (typeof item === 'string' ? item : item.text);

/** Who the item thanks: a name, null for "a player", undefined when it came from us. */
export const itemFrom = (item: PatchItem): string | null | undefined => (typeof item === 'string' ? undefined : item.from);

/** The credit as the sheet prints it, or null for an item of ours. */
export const itemCredit = (item: PatchItem): string | null => {
  const from = itemFrom(item);
  return from === undefined ? null : from === null ? 'From a player' : `Thanks, ${from}`;
};

export const PATCH_NOTES: PatchNote[] = [
  {
    id: '2026-10-10',
    date: '10 October 2026',
    title: 'A Social tab, the Club for big balances, five new upgrades and skins with their own car shapes',
    impact: 'major',
    summary: [
      'Give the City Fund any amount, up to 20,000,000 a day. The Heat button lights up when on.',
      'Tidier menus: a Social tab, five Progress sections, tabbed Settings and a Heat button.',
      'For big balances: the Club (Auction, City Fund, Contracts), Diamond Chests and High Roller stakes.',
      'Five new upgrades: Tight Fit Tip, Dashcam, Chain Saver, Winter Tyres and Fog Lamps.',
    ],
    items: [
      'The City Fund has a daily limit: one player can give 20,000,000 in 24 hours. A gift that crosses it is cut to fit, and after that the Fund asks you to come back tomorrow, so nobody can build a project alone.',
      'Fixed: turning on Cloud sync could show "Your cloud save has other progress" after your first change, although you only have one device.',
      'Fixed: the game open in two tabs or windows at once let the older one overwrite the other one’s progress. A second tab now waits ("The roundabout is open elsewhere") and starts by itself once the other one is closed.',
      'Fixed: a changed sound, icon or the offline start page no longer stays on the old version for one more update.',
      'Fixed: the leaderboards stay quick with very many players, and old Daily lists are cleaned up.',
      'The City Fund takes an amount of your own: type it under the quick gifts, from 10,000 up to what you have (5,000,000 at most).',
      'The Heat button flares and turns orange when a Heat is switched on. While Heat 1 is the only one open it reads "Heat on" and "Heat off" instead of "Heat 1".',
      'Fixed: Perfect Runs, contracts and flawless trials no longer ask for "no cut-off". Cut-offs never happened in the game, so the only rule left is the one that counted: no crash.',
      'Fixed: cars no longer drive into the ring too fast and crash right away. Before it joins, a car now checks that the traffic ahead of the spot, at a toll, in the roadworks or in a jam, is far enough away for it to brake down to its pace. The criminal brakes for slower traffic on the ring too, instead of ploughing into it.',
      "Progress is sorted by what it asks of you: Today (the Daily with its Streak card, the Weekly, the Tour, the Quests), Trials (Heat, Trials, Ascension, Landmarks, Boss Rush), Goals (the Season Pass, Mastery, Feats, Achievements), Records and the Museum.",
      "Settings has three tabs: Play (Game feel, Sound), Account (Cloud sync, Notifications, Install, Delete account) and About (What's new, Build with us, links, Legal).",
      'The Upgrades stand under Police, Money and Driving. In the Shop the chests you can buy come first and the two that are only earned (Event, Criminal Hunt) have a row of their own; the Collection shelf Honours is now called Earned.',
      'A Heat button on the Game tab steps the waiting shift through the Heats you have opened, round to off (not on the Daily Shift).',
      'Fixed: roadworks slow the traffic again. Drivers now ease off before the works so they arrive at the slow speed, instead of only starting to brake inside a stretch too short to matter.',
      'A chest opening now shows the chest open: the lid pops off the seam and tips back, light pours out of the inside, and only then the reel runs.',
      'The Club glides back to the top when its view changes: an auction ends, a new one starts or you switch tabs.',
      'A new Social tab between Progress and Game. Friends (your code, your list, challenges, multiplayer and invites on one page), Ranks (the boards, for everyone or only your friends) and the Club are no longer drawers or a card in the Shop. The Friends button over the game is gone: it lives here now. The Rank chip on Progress leads straight to Ranks, and a new auction day puts a dot on the tab.',
      'Fixed: the traffic no longer rams itself at roadworks and toll booths. Drivers read the slow zone ahead and brake in good time, and cars joining the ring plan for the slowdown instead of cutting in right behind it.',
      'A crash only counts against you until your car has passed its first exit. What happens on the ring after that is not your doing.',
      "The Club, for players with money to spend (Social → Club, once Level 50 is reached). The Auction House: three lots a day, one try each, against computer-controlled collectors. Most of them are sharks who keep bidding to 1.4 to 3.6 times the estimate, the rest stop at 0.5 to 1.2. You pay the price the hammer falls at plus a 10 % buyer's premium; walking away is free. Six skins can only be won there: Sterling, Magnate, Baron, Bullion, Sovereign and Provenance. Expect a win to cost about two and a half times the estimate.",
      'The City Fund: everyone with a name gives to the same projects (Fountain, Lighthouse, Sky Bridge), one after the other. Give 100,000 or more to a project and its skin is yours once it is built. Needs a connection.',
      'Contracts: put money on your next career shift. Clean sheet (a Perfect Run) pays ×1.15, Sharp (a quarter of the cars as Perfect merges) ×3, Flawless (a long chain, too) ×4.5. Miss it and the stake is gone; tear the contract up before the shift and it all comes back.',
      'The Diamond Chest costs 250,000 and never holds a Common: 40 % Rare, 47 % Epic, 13 % Legendary.',
      "High Roller: with 200,000 or more, the casino's stakes move up to 10K, 50K, 250K, 1M and 5M. The games and the odds are the same.",
      'Five new upgrades for drivers who merge close, in Build → Upgrades. Tight Fit Tip (6 steps): every Tight Fit pays a tip on the spot, up to 4.8 % of the shift pay. Dashcam (6 steps): the same for every Near Miss, up to 3.6 %. Chain Saver (3 steps): once you are in the flow, a plain merge leaves your chain alone, as many times a shift as you have steps. Winter Tyres and Fog Lamps (5 steps each, from the first rain at level 6): rain, snow and hail take less grip and braking, drivers lose less time in bad weather, and fog and dust lie thinner on the screen. None of them counts in Unlimited.',
      'Six car shapes: 38 skins now come with a body of their own. The bug hunters are real Beetles; the Pocket (Mint, Lemon, Coral, Rose, Cherry Top, Sky Top, Hanami), the GT Coupé (Carbon, Black & Gold, Chrome, Obsidian, Diamond, Holo, Night Mint), the Roadster (Sunset, Ice, Teal, Pearl Shine, Lagoon, Royal), the Jeep (Olive, Fern, Latte, Lime, Copper, Tiger, Volcano) and the Hot Rod (Red Stripe, Ruby, Gold, Phoenix, Dragonfire) are skins you already know, found the same way as before. Every shape is as big as a plain car and crashes the same: only the looks change.',
      'Bug hunters: every bug report on timing.love with your friend code pays the next skin. The second is the yellow Goldbug, then the Scarab, the Bluebottle, the Orchid Beetle and, with the sixth, the glowing Firefly. The Ladybug stays the first.',
      'You can wear up to eight car skins at once, up from five.',
      'More Elite: the track pays skins at Elite 110, 130, 145, 165, 185 and 195, and titles at Elite 125, 150, 175 and 200. Anyone who is already past a level gets its skin right away.',
      'Dispatching a police car is limited to 3 per shift. Each step of Dispatch Radio adds one more, and the button shows how many are left.',
      'The signals on the ring (the ticks, the glow before a criminal arrives, the lap of light, the Elite bar and the countdown rings) now have round ends.',
      'The game now draws at most 60 frames a second, which spares the battery on phones with a 120 Hz screen (iPhone Pro). New: Settings → Battery saver draws 30 frames a second and a slightly softer picture.',
      'The Android back gesture and the Back button now close sheets and pages inside the game instead of leaving it. A shift in progress ignores them.',
      'Swiping up from the bottom edge (the home gesture) or in from the side edges no longer sends a car.',
      'Fixed: criminals, street racers and weddings could wait outside the ring for good when a toll booth slowed the traffic in front of the entrance.',
      'Fixed: on two-lane rings (Level 80 and up) motorbikes and long vehicles misjudged gaps and crashed into traffic without anyone playing.',
    ],
  },
  {
    id: '2026-10-09',
    date: '9 October 2026',
    title: 'Tap your chests open, casino wins that feel like wins, and drawers you can pull',
    impact: 'major',
    summary: [
      'A Streak Freeze on day 3, a clear note when a streak ends, and a reminder for your free chest.',
      'Street racers and criminals no longer stay out on a busy ring, one lane or two.',
      'After a shift, the ring shows your Elite bar and how much XP is missing; a new level flares gold.',
      'Tap your chests open: fast taps crack them, burst them into the reel and tilt the odds a little.',
    ],
    items: [
      'Your first Streak Freeze now comes on day 3 of a streak (then one every seven days, up to two in stock), so one missed day in your first week does not end it.',
      'When you come back after your streak ran out, the game says so plainly and tells you a new one starts with today’s Daily Shift. After three days or more away it reminds you that the Daily Shift is ready.',
      'After your first shift won, the game offers a reminder for tomorrow’s free chest. “Not now” costs nothing: the browser only asks if you turn it on, and you can turn it on again when your streak reaches two days.',
      'The Progress tab shows a dot while today’s Daily Shift is waiting.',
      'The website tip waits until level 5, so your second visit starts with the shifts, not with a link.',
      'Your very first Daily Shift goes without the twist of the day, so a new player’s second shift is never a blackout or a storm. From the next day on the Daily carries its twist again.',
      'After a shift the waiting prompt keeps saying when your free chest for tomorrow is due, as the start screen already did.',
      { text: 'Fixed: the tabs of the leaderboard (Shift level, Unlimited, Daily, Boss Rush) stretched tall after switching from a long list to a short one. They keep their size now.', from: null },
      { text: 'At night headlights, tail lights and street lamps shine much brighter: the beams are clearly visible on the dark road, longer and softer, and the lamps glow where they used to be a dim dot.', from: null },
      { text: 'Street racers, criminals and the other special vehicles are announced even when every arm has a queue, which is the normal case on a busy ring or with two lanes. They used to wait for an empty arm and could stay out for the whole shift. Now the arm with the shortest queue is kept free for them, and they drive in as soon as it is.', from: null },
      { text: 'At night police cars, ambulances and fire trucks are much easier to tell apart: the light bar shines through the dark, and blue lights flash at the front and the back of the body on their own side.', from: null },
      { text: 'Fixed: a chest being opened kept all its cracks until it burst, and then lost them and vanished at once. It now keeps every crack, bursts open with the light pouring out and shards flying, and fades out under the reel.', from: null },
      'Notifications show for everyone in Settings → Progress, and turning them on sends one right away. Where the game cannot reach you while it is closed, the row says so.',
      'Drawers close with a pull down from anywhere, so your thumb stays where it is. Scrolling back up to the start of a drawer no longer closes it; only the next swipe down does.',
      'The gold Elite bar round the ring has round ends at both its start and its tip, and the knob on its tip is gone.',
      'Notifications have settings of their own: with them on, Settings → Progress lists your streak, free chests, a new season, being overtaken and come-back reminders, each with its own switch.',
      'Tips (install, backup, invite a friend, the website, Tight Fit, the other game modes) now come on the top card of the waiting screen, like the swipe hint, instead of as a pill under it. A tip you could not read in time comes back.',
      'Headlights are no longer stiff: each lamp throws its own soft beam. The beams reach further the faster a car goes, swing into the turn, breathe a little, and fade in and out as a car rolls up or waits in the queue.',
      'A new Elite level lights up the ring in gold: a lap of light, shock rings, juice and sparkles where the bar closes, and the new level lands in the middle.',
      'Fewer chest notices: a first chest, an Elite level, a Season Pass tier, a Mastery goal, a Daily, Weekly or Legendary Shift no longer mention the chest they pay. The chest pill and the Shop badge show it.',
      'After a shift in the Elite track, the ring round the island turns into your Elite bar: the XP you just earned runs round it in gold, a new Elite level flares the rim, and the middle says how much XP is missing to the next level. The “+N ELITE XP” notice is gone.',
      'An achievement shows as a gold card of its own: a medal with the tier, the name and what it paid. It stays a little longer than other notices and is never squeezed into a list.',
      'Fewer notices: finding a chest, a free chest waiting tomorrow or after a day away, and “Ready to play offline” no longer pop up. The chest pill and the Shop badge show your chests already.',
      'A chest is opened by tapping it: eight taps crack it open, light shines through the cracks, and the last one bursts it into the reel. Nothing about the chest shows what is inside any more, not even for an Epic or a Legendary.',
      'Tap fast: every tap within half a second of the one before counts as strong (the dots under the chest show it). At full power every chance above Common grows by a tenth of itself, so a Standard chest’s Legendary goes from 1 % to 1.1 %. The odds with full power are in the chest’s details, and the pity counters stay as they were.',
      'What’s new is easier to read: every day opens with a short summary of what matters, and the full list folds open under it (All changes).',
      'Casino wins are as big as the money: the louder of the multiple and the profit decides. A million no longer feels like a ten. Big wins get a BIG / HUGE / MEGA WIN stamp, a rain of coins, a longer count and more coins flying to your balance.',
      'The win counts up like the combo climbs: every mark it passes (1K, 10K, 100K, 1M) bumps the number and sprays juice, and it lands with a burst. Slots got chasing bulbs round the reels, big scratch numbers sparkle.',
      'The Skin Upgrade is now always the last game, on the right.',
      'Tapping beside a drawer closes it, now also the drawers of cards (chests, Collection, upgrades, Progress, Museum).',
      'Drawers close when you pull them down by the grabber or the title, and they follow your finger and fade the screen behind them.',
      'Scroll bars are thin and soft instead of the browser’s grey bar.',
      'Smoother: the buttons in the corner fade away instead of vanishing and the ones beside them glide together, a tab’s badge pops in, and the views of Friends, the Leaderboard, Cloud sync and Multiplayer fade in when they change.',
      'The drawer of a card moves like an Apple sheet: it stretches against a rubber band when you pull it up, snaps to half or full height by how you throw it, and a quick flick down closes it.',
      'A Museum entry now opens all the way, so you can read the whole text without pulling.',
      'Finishing a shift is celebrated on the ring: a light closes the circle, then the rim flares, shock rings roll out and juice and sparkles burst. A Perfect Run does it in gold.',
      'On a phone the pills in the corner are squeezed a little narrower and sit closer to the edge, so they no longer reach the road.',
    ],
  },
  {
    id: '2026-10-08',
    date: '8 October 2026',
    title: 'Rain and thunder you can hear, tour pictures, a Shield upgrade, notifications, and a wedding convoy',
    impact: 'major',
    summary: [
      'Rain and thunder have sound (Settings → Sound → Map sounds).',
      'New Shield upgrade that forgives crashes, shown as plus signs in the top bar.',
      'Wedding Convoy from level 100, and tours get a picture on Progress → Today.',
      'Notifications if you want them, and the ring tells you what is coming instead of messages.',
    ],
    items: [
      'The swipe hint for the game modes now sits in the top card, like a briefing: after a few seconds without a tap (a little longer once you have swiped before) it shows "Swipe for more modes" with an arrow for each way there is another mode. The name of the mode you swipe to shows there as well, overlapping the last one when you swipe fast, with a ripple round the card and a short kick of the camera. Fixed: swipe away from Shift and back and you get the same sky and city event again, until you play that shift. Briefings in a shift now stay on the card for 10 seconds at most, get a pause of 6 seconds before the next one, and stop for the last 3 cars, so your numbers are back quickly. The Daily Shift opening is calmer too: the date, the name, the city of the day and your streak as a week of dots, no warning box.',
      'Rain, storms and thunder now have sound: a steady rain under the road that grows with the downpour, and a rumble of thunder after every flash of lightning. It has its own switch in Settings → Sound: Map sounds.',
      'Tours get a picture on Progress → Today, like the Season Pass: the sky of the tour with its top skin. The Haunted Ring comes with a moon, bats and drifting lights, Winter Lights with snow and stars. It shows up to 60 days before a tour starts.',
      'School Run: never more than one school bus on the road at a time.',
      'Fixed: roadworks and the bus stop were sometimes painted right where cars drive in or out. They now sit between two arms, and shorter where the ring is crowded.',
      'Fixed: a sheet pulled up by its grabber no longer leaves a gap under it, and a sheet closing now speeds up to the end instead of hanging just behind the tab bar.',
      'Fixed: the name of a game mode that pops up when you swipe between modes no longer shakes.',
      'Night: the ring’s signals no longer sink into the dark. They are drawn above it and glow in their own colour, the way coloured light would at night.',
      'Collection → Honours is sorted: the cars by rarity (Rare cars, Epic cars, Legendary cars), then the vehicles, then the maps.',
      'On a phone the pills in the bottom corner (Settings, chest, Picture, Friends, Leave) are smaller and a little narrower, so they cover less of the road.',
      'Fewer messages over the road: the ring now tells you instead. A light runs round the island when something is coming (a criminal, a transporter, a bomb truck as well), a ring widens out when you pull it off, and a ring pulls back in when its bonus slips away. Only numbers that cost you something, Critical and Jackpot are still written out. The signals now have their own looks: the combo climbing sprays juice out of the ring (more of it the higher the tier, gold at the top), Rush Hour is electric lime, in the ring, the top bar and its label, and the learner driver has its own teal instead of sharing the green of your combo and Shield.',
      'Museum: a special vehicle or boss that announces itself on the ring now shows a small roundabout in its sheet. It plays the signals, one by one, and every line says what they mean.',
      'Picture and Friends are now labelled buttons, the same size as Settings and the chest button. With a mouse, every button of a kind lights up the same way, and the Daily Shift card now covers the condition icons while it shows.',
      'Fixed: since 4 October the game could skip setting up its offline mode on a first visit. It now always does, so it starts without internet once loaded.',
      'Notifications, if you want them (Settings → Notifications): a reminder before your Daily streak ends, when your free chest is ready, when a new Season Pass starts, or when someone passes you in the top 20. At most one a day, never at night. On iPhone, add the game to your Home Screen first.',
      'Rain, roadworks, a closed arm and the rest now show as icons above Tap to start. Tap one to read what it does and how to play it; a dot marks one you have never played in. The big text card about new conditions is gone.',
      'The top bar shows what still forgives a crash as plus signs: green for each Shield, blue for each police car you may still hit. A used one turns grey.',
      'New upgrade: Shield (Build → Upgrades). Four steps, each forgives one more crash of your own car per shift: the first is cheap, the other three are dear. Not in Unlimited.',
      'A crash the shift survives no longer pops up a message: the ring round the middle flashes green with little plus signs rising out of it. The same for your police cars while they are within their limit (blue and red), and in multiplayer when a shield takes a hit.',
      'A camera that feels the pressure: in Rush Hour, with a criminal or a military truck on the ring and on your last cars it leans in a little and the edges darken, while your stop line stays exactly where it is. Clear the shift and it breathes out. A crash that ends a shift and a takedown pull the camera towards the hit, crashes shake the way the wrecks fly, and a last car that only just squeezes in plays out in slow motion. Reduce Motion keeps only the darker edges.',
      'One glass for every floating control: the top bar, hints and banners over the road are now see-through and frosted like the tab bar and the round buttons, so the map shows through, bright maps included.',
      'Lost a level three times in a row? The next try brings the fewest cars that level has, until you clear it.',
      'Level 6 sends a syndicate scout: a criminal with an escort of its own, a first taste of the bosses at level 15. Your first rain now comes by level 7 at the latest, your first night by level 11.',
      'The Daily Shift and its streak start at level 2 instead of 4, and after your first shift a free chest waits for you the next day.',
      'Chests waiting? The pill on the Game tab now shows the chest itself and takes you straight to your chests.',
      'Fewer messages after a shift: at most three lines and a count of the rest. Perfect Run is told once, then the ring flashes gold.',
      'Your picture is now your challenge: tap Picture under a result, then Send as challenge. Your friend gets the photo with a short link to play the very same shift.',
      'A calmer screen: Picture and Friends are now round buttons under the one main action, news waits while you drive and shows after the shift, and the first look at new weather no longer covers the roundabout.',
      'Polish: the upgrade cards lose their inner box, the Season Pass card has one edge instead of two, and an upcoming tour shows its name.',
      'Tight Fits and Critical Merges land with a short hold and a soft lean of the camera towards your car (off with Reduce Motion), the merge sound keeps climbing for longer, and the ring glows brighter the longer your Flow lasts.',
      'Your first shift is just the game: the tab bar and Settings appear once it is over. On a phone held sideways your front car no longer hides under the tab bar.',
      'Taps while the cars roll up to the line are no longer lost: the shift starts, and the next tap sends your first car.',
      'Fixed: one error in a frame could freeze the picture for good. The game now carries on, and if it really cannot, it offers a reload.',
      'Wedding Convoy, from level 100: three decorated cars join together and go once round the ring at the speed of the traffic, so nothing slows down. Keep your cars out of the rose band around them and it pays 350 and extends your chain.',
      'Swiping between game modes: the road now runs on from one roundabout to the next, so the maps stay connected while they slide past.',
      'The ring around the island glows green again for combos, Rush Hour and a finished shift.',
    ],
  },
  {
    id: '2026-10-07',
    date: '7 October 2026',
    title: 'Tours with a Halloween run, a twist on every Daily, seasons that change the sky, Chill mode and 123 achievements',
    impact: 'major',
    summary: [
      'Tours: limited-time events, the first is the Haunted Ring on 24 October.',
      'A twist on every Daily Shift, and seasons that change the sky.',
      'New Chill mode and 123 achievements.',
      'Share your Daily like a puzzle result.',
    ],
    items: [
      'Tours: limited-time events that come back every year. Each is seven stops with a sky and a goal of its own, set at your level, and every stop pays once: coins, chests and three skins you can only win there. The first is the Haunted Ring, from 24 October to 2 November; Winter Lights follows on 18 December. Find it under Progress → Today once Trials are open (level 9).',
      'The Daily Shift has a twist every day: Open Road, Speedway, Fog Bank, Night Shift, Lights Out, Storm Front, Rush All Day, Dragnet, Heavy Load or Cash Convoy. It is the same for everyone, it shows on the waiting card and in the start splash, and a challenge link carries it along.',
      'Seasons now change the sky of your shifts. Winter brings more fog and snow and early nights, spring more rain, summer fewer but fiercer storms, autumn more fog and early evenings. Progress → Today names the season and its rule.',
      'New mode: Chill. Swipe past Mayhem. No strikes, no police, no money, no rush: crashes happen and the traffic reacts, but nothing ends the drive until you tap Done. It has its own records, and your result makes a nice photo.',
      '123 achievements in 31 families, under Progress → Goals: wrecks, explosions, weather, nights, builds, collecting and more. Each tier pays a little coin and you get a toast when one lands.',
      'Fixed: in Roulette, a new bet after a round now lights its exits and shows on the island at once, instead of the old bet staying lit.',
      'Fixed: in Progress → Records the streak text no longer touches the car, the engine label says what it is ("ENGINE IDLING") and the Collection tile reads "9 / 121" with the percentage in its label.',
      'Share your Daily Shift like a puzzle result: Challenge a friend after a cleared Daily now sends one line (score, Perfects, Tight Fits, streak) with the link to the same shift. On a computer it lands in your clipboard, ready to paste in a chat.',
      'Your photo print has a QR code now. A friend who scans it lands in the game, and with a leaderboard name it is your invite: you both get a chest when they reach level 5.',
      'The game now counts visits and a few steps (the tutorial done, shifts played) anonymously, to find where new players give up. No cookie, no ID, no name and no progress, and nothing is sent when your browser says Do Not Track. The Privacy Policy says it all.',
      'Fixed: the leaderboard and friends tabs no longer let their text run out of the pills on a phone. The tabs are the same width now and the highlight sits exactly behind the one you chose.',
      'Smoother: a sheet that slides up over the game no longer makes the page measure itself on every frame.',
    ],
  },
  {
    id: '2026-10-06',
    date: '6 October 2026',
    title: 'Two new maps and three new skins, a Detour Sign that works, more quests, Roulette, Scratch Cards and the Street Builder',
    impact: 'major',
    summary: [
      'Three new nature maps and three new skins: Chrono, Biolume and Dragonfire.',
      'Roundabout Roulette and Scratch Cards in the Casino.',
      'The Detour Sign works, modules upgrade twice, and there are seven new quests.',
      'The Season Pass is the star of Progress → Today.',
    ],
    items: [
      { text: 'Three new nature maps from the chests: Savanna (Rare), with acacias, a waterhole and elephants, Rainforest (Epic), with a waterfall pool, ferns and butterflies, and Alps (Epic), with a summit seen from above, gentians and cloud shadows.', from: null },
      { text: 'The Season Pass is the star of Progress → Today now: a picture of the season with its top skin, a halo in the colour of the season that breathes, a glint that sweeps across, and the whole track as dots.', from: null },
      { text: 'Fixed: on a phone the car of the streak no longer sits in its text. The Leaderboard drawer only grows now and no longer sinks when you change tabs.', from: null },
      { text: 'A drawer that opens over another leaves the one below where it is and rises over it. Closing it lowers only the top one, so Settings no longer close and come back.', from: null },
      { text: 'Chrono, Biolume and Dragonfire leave a real trail now: the echoes, sparks and flames stay where the car drove, so they bend round a turn instead of swinging with the car. Moonmirror got more to look at (pools with their own reflections, a path of moonlight, the phases of the moon round the pool, mist), and the Sakura lawn is calmer.', from: null },
      { text: 'Fixed: labels no longer run out of their pills or over each other on small and short screens. Upgrade cards, Progress rows, buttons, tabs and the Street Builder parts shrink their text to fit, and the Casino table squeezes together instead of overlapping.', from: null },
      { text: 'The Detour Sign works now. It turns a fixed share of the cars that pass it off at its exit (45 %, 60 %, 75 % by level), also on arms you built yourself, and a turned car forgets its laps. Where no exit lies between the sign and your arm it does nothing, and the Street Builder says so.', from: null },
      { text: 'Street Builder: a built module that can still be upgraded wears an arrow badge, bright when you can pay for it. The hint under the parts and the notice after building say how: tap it and choose Upgrade.', from: null },
      { text: 'New skins, earned and never in chests: Chrono (Elite 55, a clock that leaves echoes), Biolume (Elite 65, glowing plankton) and Dragonfire (30 Legendary Shifts, scales, horns and flames).', from: null },
      { text: 'Two new maps for the long road: Glowtide, a shore of glowing plankton with a jellyfish pool (Elite 85), and Moonmirror, a salt flat that holds the stars (Prestige ★25). Both are Feats.', from: null },
      { text: 'Seven new daily quests, from a single takedown to a combo of 25 or five Perfect Inputs in one shift.', from: null },
      { text: 'Scratch Cards pay back more often: a win on about every fourth card instead of one in six, and 92 % back on average (it was 85 %).', from: null },
      { text: 'Tap the Hall of Fame in the Elite sheet and it tells you what it gives: a gold wall on the island with a star for every Prestige, a plaque for each rank, and the Hall of Famer skin.', from: null },
      { text: 'Balance: Freight and Quick Recovery made the road busier and cost more than they gave. Each step now also pays +1 % per shift.', from: null },
      'New casino game: Roundabout Roulette. A ring with 20 exits, one for every stop of the slot reels. Bet on a vehicle type: the car circles, clicks past the exits and leaves by the drawn one. The fewer exits a type has, the more it pays, and every bet returns 95 % on average.',
      'New casino game: Scratch Card. Nine foil cells, three alike win. Buy cards in Shop → Casino → Scratch, and every third day of your Daily streak gives you one for free. The odds are in the sheet.',
      'Your Daily streak has its own big card at the top of Progress → Records: a tailpipe whose flame grows with every day. From a week on it backfires with a bang and a burst of sparks, and at 30 days it is an inferno.',
      'Street Builder parts have new icons: a coloured badge each with a picture of what it does (a barrier, a camera, a tow truck, a board, a turn arrow), and the same colours on the road signs in the city.',
      'Modules can be upgraded twice now: tap a built Toll Booth, Speed Camera, Tow Depot, Billboard or Detour Sign in the Street Builder and choose Upgrade. Every level pays more (or clears wrecks faster, or steers more cars); a built module shows one dot per level above the first.',
      'The Street Builder shows where a module works: the stretch of road it covers is lit on the ring while you drag it, move it or look at it. A Detour Sign shows the exit it points to.',
      'New in the Street Builder: the Detour Sign. It turns cars off the ring early, so fewer of them reach your arm. Put it on the stretch before the last exit ahead of your arm.',
      'New in the Street Builder: the Billboard. Every car that drives past pays a little in the first minute of a shift, and drivers look up and ease off a bit around it.',
    ],
  },
  {
    id: '2026-10-05',
    date: '5 October 2026',
    title: 'Optional ads for a free upgrade step and a better Skin Upgrade chance, and codes that send themselves',
    impact: 'major',
    summary: [
      'Optional ads for a free upgrade step or a better Skin Upgrade chance.',
      'A Friends drawer with four tabs, and Streak Freezes for your Daily.',
      'Heat for veterans, Unlimited tiers and two new leaderboards.',
      'Codes send themselves when the last character is typed.',
    ],
    items: [
      'Friends has its own drawer now, with four tabs like a page: Friends (your code, adding, your list), Ranking (the leaderboards among you and your friends), Play (Challenge a friend, and a button straight to Multiplayer) and Invite (your link and who joined). Open it with the Friends button above Settings; it asks for your name itself, so there is no detour. The Ranks chip on Progress carries an arrow, so it looks like what it is: a way into the leaderboards.',
      'Streak Freeze: every 7 days of your Daily streak earns a Freeze (up to 2). A missed day uses one up instead of breaking the streak, and the Daily row under Progress → Today shows how many you hold. You earn them by playing, never by buying.',
      'Unlimited has tiers now: Bronze at 25 cars, then Silver, Gold, Platinum, Diamond and Master (500). Your tier is under Records, and a run into a new tier says so. While you climb, the car count flashes the tier you pass, with a sweep around the ring.',
      'Tailwind: lose a career shift within 3 cars of its goal (after at least 60 % of it) and your next career shift pays 25 % more, stacking with the streak bonus. Once a day, never over the Daily Shift, and a shift that used it does not earn another.',
      'Unlimited marks pay Elite XP too: each mark (25, 50, 100 … 1000 cars) counts the first time you pass it, on the Elite track and the Season Pass. The Unlimited leaderboard, also among friends, shows each player’s tier.',
      'The streak pill over the Daily shows your Freezes, and the Daily row says how far the next Freeze or skin is, whichever comes first.',
      'Heat: a new way to turn the road up for veterans (Level 50 and beyond). Progress → Today has a Heat row: tap it to step up through the Heats you have opened, and round to off. Each step makes the traffic faster and denser, and pays +10 % and +2 Elite XP a shift. Clear a shift at a Heat to open the next, up to 8; Heat 3, 5 and 8 earn the titles Scorcher, Inferno and Meltdown.',
      'Two new leaderboards: Daily (a fresh list every day, everyone plays the same shift) and Boss Rush (the fastest clear first), both also among friends.',
      'Unlimited titles: the 250, 500 and 1000-car skins now also earn the titles Marathoner, Overdriver and Endless, which show on the leaderboards. A skin mark in the run names the skin, and after a run that just missed a tier the result says how many cars it was short.',
      'The waiting screen shows a Tailwind pill while its bonus is ready, and Records lists your Streak Freezes next to the streak.',
      'Chests: a Legendary is now guaranteed within 40 chests (the chest sheet counts it down next to the Epic guarantee). The odds themselves did not change.',
      'Records shows your whole collection as a percentage next to how many of the 70 items you own.',
      'Fixed: the roads no longer run on through the roundabout. They end at the ring, so no crosshair can show on the island.',
      'Challenge a friend and Picture no longer sit where you tap to start the next shift: they stack above Settings on the left (on the right if you play left-handed), and the other side stays free.',
      'Watch an ad, your choice, for a free step of one upgrade: once a day the game picks one (a "Free step" badge on its card in Build → Upgrades) and you can still buy it as usual. Not on CrazyGames.',
      'Watch an ad to add 10 points to the chance of your next Skin Upgrade round, up to 3 times a day (Shop → Casino → Upgrade). The dial shows the chance it really rolls, and one round uses the boost up, won or lost. Not on CrazyGames.',
      'The free Standard Chest for an ad is a real ad now on the website and in the Google Play app. It, and the two new ones, pay only when the ad was watched to the end, and the offers show only when an ad is ready.',
      'Codes send themselves: a multiplayer game, a friend code and a Cloud sync code start the moment the last character is in, so you no longer tap Join, Add or Load. The buttons are still there.',
    ],
  },
  {
    id: '2026-10-04',
    date: '4 October 2026',
    title: 'Invite friends for chests, a simpler Progress and fairer money',
    impact: 'minor',
    summary: [
      'Invite a friend: you both get a chest when they reach level 5.',
      'A new amber look and a simpler Progress that opens on Today.',
      'Saves and Cloud sync copies are sealed against edits.',
    ],
    items: [
      'Invite a friend: when a friend you invite reaches level 5, you both get a Standard Chest, and your 3rd and 10th friend each bring a Premium Chest on top. A challenge you share carries your invite too.',
      'A new look: the green accent is now street-lamp amber, and titles and big numbers use the heavy italic typeface of the website. The app icon changed colour too.',
      'Progress opens on Today, the page for what to do next; Records moved to the third place. The leaderboard chip now says "Rank #4", and the Settings button has a word next to its gear.',
      'Tips (Cloud sync, installing, the website, inviting) now come one at a time, one per visit, instead of all at once.',
      'New Friends page in Settings, at the very top: your friend code with a Copy button, a link to share, who you invited and how far they are, and adding a friend by their code. The leaderboard now only compares, with one Invite row that leads there.',
      'The "Jammed · no points" label is gone. A car that has to brake its way in behind slow traffic still scores nothing, it just no longer pops up a message.',
      'A Cloud sync copy that has not been opened or changed for 200 days is now deleted from our server. Opening the game with Cloud sync on keeps it.',
      'Fixed: money could be added by editing the save in the browser. A save now carries a seal; if it does not match, the game goes back to the last progress it saved itself.',
      'Fixed: the Casino’s next results could be worked out from the save. Every round now draws on randomness that never touches the save, and a Crash drive no longer stores where it will end.',
      'Fixed: a Cloud sync copy could be edited on its way to another device. Copies are sealed the same way now, and one that does not match is refused.',
    ],
  },
  {
    id: '2026-10-03',
    date: '3 October 2026',
    title: 'Boss Rush, the Étoile, a QR code for multiplayer, Build with us, a smoother Elite climb and fewer school buses',
    impact: 'major',
    summary: [
      'Boss Rush and a new Landmark, the Étoile.',
      'Build with us: report a bug and get the Ladybug skin.',
      'A QR code for multiplayer, and a gentler Elite and Season Pass climb.',
      'Reset progress is now Delete account.',
    ],
    items: [
      'Boss Rush: take down all eight syndicate bosses back to back, on one clock. Lose a round and you start again at the first boss. It opens once you have caught every boss, pays 60,000 for the first clear and keeps your best time (Progress → Goals).',
      'A new Landmark for Prestige ★5 and up: the Étoile, twelve roads running into one ring around the Arc de Triomphe. One hard shift, 40,000 the first time you pass it (Progress → Goals).',
      'The multiplayer lobby shows a QR code beside the invite code: a friend in the same room scans it with their camera and lands in your game.',
      'Fixed: a School Run no longer sends a crowd of school buses at the start of a shift. At most two buses wait for the stop at a time, so the ring no longer jams from the first second.',
      'Prestige is easier to find: when it is ready, the Elite card on Progress glows gold and says "Prestige to ★n", and the Progress tab shows a dot until you have opened it.',
      'Fixed: on a phone, the buttons in the Elite sheet (Prestige and the Hall of Fame) no longer run over each other. They sit one under the other now.',
      'Build with us: report a bug or suggest a feature on timing.love (Settings → Build with us). Add your friend code to a bug report and the Ladybug skin is yours, only for bug hunters.',
      'The Elite track and the Season Pass climb gradually now: the first levels and tiers come quicker, later ones ask a little more each. No level you already reached is lost.',
      'Reach Level 50 and the game tells you that Prestige is ready.',
      'Settings are tidied up: Game feel, Sound and Cloud sync come first, the rest is grouped below.',
      'Reset progress is now Delete account: it also removes your leaderboard name, friend code and cloud copy from our server, after a clear second step.',
    ],
  },
  {
    id: '2026-10-02',
    date: '2 October 2026',
    title: 'New bosses, Ascension trials, Unlimited stages, Mastery IV and V, and more for the late game',
    impact: 'major',
    summary: [
      'Four new bosses from level 75, Ascension trials and Unlimited stages.',
      'Mastery IV and V, hail, sandstorms and the oversize load.',
      'Move or delete what you built in the Street Builder.',
    ],
    items: [
      'Settings links to the new homepage, timing.love, with a trailer and answers to common questions.',
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
    summary: [
      'Cloud sync: carry your progress to any device with a short code.',
      'Progress has four sections, and Feats hold the hardest rewards.',
      'Briefings tell you what to do the first time something new is on the road.',
      'Big Screen map, the Classic car and a Friends board.',
    ],
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
    summary: [
      'Leaderboards: see how you rank, no sign-up.',
      'Two lanes from level 80, plus motorbikes, learner drivers, fire engines, fog and snow.',
      'The Season Pass, and the game is now called Roundabout Timing.',
    ],
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
    summary: [
      'Eight new maps, and every city looks richer and brighter in daylight.',
      'Picture takes a real photo you can share.',
      'The game runs smoother, also on older phones.',
      'An easier start for new players.',
    ],
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
    summary: [
      'The Casino in the Shop, with the odds one tap away.',
      'The Museum in Progress.',
    ],
    items: [
      'The Casino in the Shop: Crash, Slots, Skin Upgrade and double or nothing. Play money only, with the odds one tap away.',
      'The Museum in Progress: every boss, special vehicle and condition you have met, and how to deal with it.',
    ],
  },
];

/**
 * The changelog as a public JSON file (Leo, 04.10.2026): `/changelog.json`, written at every build
 * (`vite.config.ts`), so the website shows the game's own list without it being typed twice. A line
 * a player asked for carries `from` (null: "a player", a name: thanks), like the sheet's credit.
 * Plain data: the shape is part of what the website reads, so extend it, never rename.
 */
export interface ChangelogFile {
  version: 1;
  game: string;
  /** The newest day's `id`, so a reader can tell at a glance whether anything changed. */
  updated: string;
  days: { id: string; date: string; title: string; impact: PatchImpact; summary: ChangelogLine[]; items: ChangelogLine[] }[];
}

/** `summary` is the short version to show at once (added 09.10.2026), `items` the long list to fold open. */
export type ChangelogLine = { text: string; from?: string | null };

const line = (item: PatchItem): ChangelogLine => {
  const from = itemFrom(item);
  return from === undefined ? { text: itemText(item) } : { text: itemText(item), from };
};

export function changelogFile(notes: readonly PatchNote[] = PATCH_NOTES): ChangelogFile {
  return {
    version: 1,
    game: 'Roundabout Timing',
    updated: notes[0]?.id ?? '',
    days: notes.map((n) => ({
      id: n.id,
      date: n.date,
      title: n.title,
      impact: n.impact,
      summary: n.summary.map(line),
      items: n.items.map(line),
    })),
  };
}

/**
 * What the save remembers as read: the newest day and how many items it had. A new item on the
 * same day changes it too, so the dot comes back for it.
 */
export const latestNote = (): string => `${PATCH_NOTES[0].id}#${PATCH_NOTES[0].items.length}`;
