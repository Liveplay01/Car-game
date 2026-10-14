import { baseConfig, INVITE_LEVEL, INVITE_REMINDER_LEVEL, detourShareAt, towSpeedupAt, type Config, type Weather, type CityEvent, type BossKind, type LegendaryRule } from '../core/config';
import type { Upgrade } from '../core/levels';
import type { MasteryGoal, MasteryCompletion } from '../core/career';
import { MASTERY_THRESHOLDS, masteryNumeral } from '../core/career';
import type { SwipeMode } from './flow';
import type { Rarity, ChestKind, Cosmetic, ChestOpening, Album } from '../core/loot';
import type { Challenge } from '../core/daily';
import type { NextGoal, NearMiss } from '../core/goals';
import type { CasinoGame, SlotSymbol } from '../core/casino';
import { Contracts, type ContractGoal, type ContractOutcome } from '../core/contracts';
import type { VehicleType, VehicleRole } from '../core/vehicle';
import { type Trial, type TrialId, type RunId, type EliteKind, type LevelKind, rematchKind, ascensionRank, levelTrialLevel, levelKind, LANDMARK_PRESTIGE } from '../core/trials';
import type { MuseumEntry } from '../core/museum';
import type { EliteStep, EliteBar, TitleId, TitleRule } from '../core/elite';
import type { PassReward, PassStep, HallEntry } from '../core/seasonPass';
import type { FeatGoal } from '../core/feats';
import type { Season } from '../core/loot';
import type { MutatorId } from '../core/mutators';
import type { TourId, TourReward } from '../core/tours';
import type { TierId } from '../core/tiers';
import { MONEY_MARK } from './icons';
import { Fmt, money, percent, multiplier, comboMultiplier } from './format';
import { museumText, SPECIAL_TEXT, MUSEUM_TEXT } from './museumText';
import { currentLanguage, overlay, type LanguageCode, type Words } from './i18n';
import type { RewardedOutcome } from './session';
import type { AchievementCard } from './notices';

export { Fmt, money, percent, multiplier, comboMultiplier };

/** Every text the game shows. These are the English ones; another language lays its own over them at start (`lang/`, the bottom of this file). */

export const S = {
  gameTitle: 'Roundabout Timing',

  tutorial: {
    sendCar: 'Tap to send your first car',
    findGap: 'Wait for a gap, then tap',
    combo: 'Clean merges build your combo',
    /** With the Shield upgrade a car may crash more than once (`cars` > 1). */
    strikes: (cars: number, police: number): string => {
      const lead = cars > 1 ? 'Your car may crash once.' : 'Cars crash instantly.';
      return police > 0 ? `${lead} Police get ${police} chances.` : lead;
    },
  },

  /** The drawer that explains a place or feature the first time it is opened (`present/intros.ts`). */
  intro: {
    gotIt: 'Got it',
    museum: {
      title: 'Museum',
      line: 'Everything you meet on the road',
      body: [
        'Every vehicle, boss, weather and city event goes on show here the first time you meet it.',
        'Tap an entry to see how it behaves and what to do about it. A dot marks what is new.',
        'What you have not met yet stays hidden, with the level it arrives on.',
      ],
    },
    builder: {
      title: 'Street Builder',
      line: 'Build your own roundabout',
      body: [
        'Add arms and modules to the ring. More arms bring more traffic, money trucks sooner and better pay.',
        'Pick a part, drag it onto a free slot on the ring, then double-tap it to build. One tap takes a built part away.',
      ],
    },
    daily: {
      title: 'Daily Shift',
      line: 'One try a day, the same for everyone',
      body: [
        'A new shift every day, the same for every player. You get one try.',
        'Play it every day to keep a streak: streak days pay more and bring rewards along the way.',
      ],
    },
    trials: {
      title: 'Trials',
      line: 'Special shifts with a reward',
      body: [
        'Each trial sets its own goal, like a flawless run or a number of Perfect Inputs.',
        'Pass one to earn its reward. Pick them in Progress, on the Trials page.',
      ],
    },
    pass: {
      title: 'Season Pass',
      line: 'A track of rewards for the season',
      body: [
        'Every season has a track of twelve tiers with chests, money and skins that only exist that season.',
        'Unlock it once with play money, then every shift you play earns XP towards the next tier.',
        'Only looks, never a bonus on the road. The four seasons come back every year.',
      ],
    },
    casino: {
      title: 'Casino',
      line: 'Optional · play money only',
      body: [
        'Crash, Slots, Skin Upgrade and Double or Nothing, played with the money you earn on the road. Nothing here costs real money.',
        'The odds of every game are shown in its sheet. Money you win is the money you buy upgrades with; money you lose is gone.',
        'You can skip it for good: nothing on the road needs it.',
      ],
    },
    club: {
      title: 'The Club',
      line: 'For big balances',
      body: [
        'The Auction House sells three lots a day. Computer collectors bid against you and often drive the price far above the estimate.',
        'The Game fund is for ideas from players: suggest one, and give money to the ones you like. At 30,000,000 an idea is made. Contracts put money on a Perfect Run.',
        'Only looks and money: nothing here makes you faster on the road.',
      ],
    },
    gamefund: {
      title: 'Game fund',
      line: 'You decide what the game gets next',
      body: [
        'Players suggest ideas: a map, a car, a rule. We word the good ones for the game and publish them here.',
        'Everyone gives money to the ideas they want. An idea that reaches 30,000,000 is made and moves to Built.',
        'Money given does not come back, and it buys nothing on the road. Suggest one idea a day with Suggest an idea.',
      ],
    },
    mafia: {
      title: 'The Family',
      line: 'Lends money, wants it back',
      body: [
        'After your first boss the Family lends you money. Strike the deal on the pointer bar: tap to stop it in the green zone, the middle is Perfect.',
        'Pay back in time and the next loan gets kinder. Pay late and the Family takes a share of every shift, and the Casino shuts until it is paid.',
      ],
    },
  },

  settings: {
    /** The word on the Settings pill for a moment after progress came over from the cloud. */
    synced: 'Synced',
    /** The same pill, in blue, when Cloud sync needs the player: no cloud copy yet, or two devices to choose between. */
    syncAsk: 'Sync?',
    title: 'Settings',
    tabs: { play: 'Play', account: 'Account', about: 'About' },
    language: 'Language',
    gameFeel: 'Game feel',
    largerText: 'Larger text',
    largerTextSub: 'Notices and cards over the game a step larger.',
    reduceMotion: 'Reduce motion',
    reduceMotionSub: 'No shake, slow-mo or flying parts.',
    motion: { system: 'System', on: 'On', off: 'Off' },
    leftHanded: 'Left-handed',
    leftHandedSub: 'Puts the buttons over the game on the left.',
    dispatchSize: 'Dispatch button size',
    dispatchSizeSub: 'Makes the police button smaller or larger.',
    vehicleLabels: 'Vehicle labels',
    vehicleLabelsSub: 'Names the special vehicles on the road.',
    haptics: 'Haptics',
    hapticsNone: 'Not available in this browser',
    batterySaver: 'Battery saver',
    batterySaverSub: 'Draws 30 frames a second and a softer picture. Easier on the battery.',
    sound: 'Sound',
    soundEffects: 'Sound effects',
    music: 'Music',
    mapSounds: 'Map sounds',
    mapSoundsSub: 'Rain and thunder on the road.',
    backup: 'Backup & device',
    reminders: 'Reminders',
    cloudSync: 'Cloud sync',
    cloudOn: 'On · your progress is backed up.',
    cloudOff: 'Back up your progress and play on any device.',
    install: 'Install the game',
    installSub: 'Full screen, offline, one tap from your home screen.',
    installButton: 'Install',
    addToHome: 'Add to Home Screen',
    addToHomeSub: 'In Safari, tap Share, then “Add to Home Screen” to play full screen and offline.',
    noteCrazyGames: 'Log in to CrazyGames to keep your progress on every device.',
    noteCloud: 'Your progress is saved on this device. Cloud sync keeps a copy and brings it to your other devices.',
    noteLocal: 'Your progress is saved on this device.',
    deleteAccount: 'Delete account',
    theGame: 'The game',
    followUs: 'Follow us',
    whatsNew: "What's new",
    whatsNewSub: 'Patch notes and updates.',
    newBadge: 'New',
    buildWithUs: 'Build with us',
    reportBug: 'Report a bug',
    reportBugSub: 'Add your friend code and get a bug hunter skin. Up to six.',
    suggest: 'Suggest a feature',
    suggestSub: 'Tell us what you would add. We read every idea.',
    legal: 'Legal',
    licenses: 'Licenses',
    licensesSub: 'Open-source software in the game.',
    licensesIntro: 'Roundabout Timing uses this open-source software. Thank you to its authors.',
    crazyGames: { title: 'Roundabout Timing on CrazyGames', sub: 'Our official page. Rate the game and share it.' },
    website: { title: 'Roundabout Timing Website', sub: 'timing.love: the game, a trailer and the FAQ.' },
    wiki: { title: 'Roundabout Timing Wiki', sub: 'Guides, vehicles and tips from the community.' },
    social: {
      tiktok: { title: 'TikTok', sub: 'Short gameplay clips and updates.' },
      youtube: { title: 'YouTube', sub: 'Trailers, devlogs and long-form videos.' },
      instagram: { title: 'Instagram', sub: 'Screenshots, art and behind the scenes.' },
    },
    close: 'Close',
    impact: { major: 'Big update', minor: 'Update', fix: 'Fixes' },
    allChanges: (n: number): string => `All changes · ${n}`,
    homeScreen: {
      title: 'Add it to your Home Screen',
      why: 'Roundabout Timing plays best like an app: one tap to start, full screen, and Safari keeps your progress.',
      shareTop: 'Tap Share at the top of Safari',
      shareBottom: 'Tap Share at the bottom of Safari',
      scroll: 'Scroll down and tap “Add to Home Screen”',
      add: 'Tap “Add”, then start the game from its icon',
    },
    cloudIntro: {
      open: 'Open Cloud sync',
      later: 'Maybe later',
      why: 'Back up your progress and carry on with any device using a short code. No account and no password.',
      gear: 'Tap the gear for Settings',
      page: 'Open “Cloud sync”',
      code: 'Back up, or type a code from another device',
    },
    del: {
      title: 'Delete account?',
      lede: 'The game starts over from Level 1. This cannot be undone.',
      device: 'On this device',
      deviceSub: 'Level, Prestige, money, chests, collection, upgrades, records and settings.',
      server: 'On our server',
      serverSub: 'Your leaderboard name and scores, friend code and friends list, your cloud copy and any rewards still waiting.',
      sent: 'Bug reports and ideas you sent',
      sentSub: 'They stay with us, but no longer point to you.',
      confirm: 'Delete my account',
      cancel: 'Cancel',
      deleting: 'Deleting…',
      failed: 'Something went wrong. Try again.',
    },
  },

  /** Settings → Cloud sync (`ui/cloudSheet.ts`). */
  cloud: {
    title: 'Cloud sync',
    summary: (level: string, prestige: number, money: string): string => `Level ${level}${prestige > 0 ? ` · ★${prestige}` : ''} · ${money} coins`,
    saved: 'Saved',
    savedNow: 'Saved just now',
    savedMinutes: (n: number): string => `Saved ${n} min ago`,
    savedHours: (n: number): string => `Saved ${n} h ago`,
    codeLabel: 'Sync code',
    codeShort: 'A sync code has 12 letters and numbers, like K7M2-9QXA-4TFB.',
    load: 'Load',
    backUp: 'Back up to the cloud',
    offIntro: 'Keep your progress safe and move it between devices. No account and no password: you get a code, and the code is the key.',
    already: 'Already backed up on another device?',
    hideCode: 'Hide the code',
    showCode: 'Show the code',
    copy: 'Copy',
    copied: 'Copied',
    saving: 'Saving…',
    offline: 'Offline. The newest progress goes up when the connection is back.',
    keep: 'Save',
    asked: 'Asked',
    syncNow: 'Sync now',
    linkedIntro: 'Your progress is copied to the cloud while you play. On another device open Settings → Account → Cloud sync and type this code.',
    yourCode: 'Your sync code',
    yourCodeLabel: (code: string): string => `Your sync code: ${code}`,
    cloudCopy: 'Cloud copy',
    passwordManager: 'Password manager',
    passwordManagerSub: 'Let your browser remember the code, then it fills it in on a new device.',
    secret: 'Anyone with this code can load or replace your progress. Keep it private.',
    stop: 'Stop syncing on this device',
    delete: 'Delete the cloud copy',
    deleteAgain: 'Tap again to delete it for every device',
    differs: 'The cloud holds different progress than this device. Pick the one to keep; the other one is replaced.',
    thisDevice: 'This device',
    cloud: 'Cloud',
    keepDevice: 'Keep this device and replace the cloud',
    useCloud: 'Use the cloud progress',
    later: 'Decide later',
  },

  /** Systems that open with the level (`core/unlocks.ts`). */
  unlocks: {
    opensAt: (name: string, level: number): string => `${name} ${name.endsWith('s') ? 'open' : 'opens'} at Level ${level}`,
    lockedTag: (level: number): string => `LEVEL ${level}`,
  },

  /** One-time tips that keep the progress safe (`Hint`). */
  hints: {
    /** The tips are `Tip`s: they take the top card on the waiting screen (`TipQueue`). */
    install: { caption: 'TIP', text: 'Install the game in Settings: its own window, one click away' },
    homeScreen: { caption: 'TIP', text: 'Add the game to your home screen in Settings: one tap, full screen' },
    reduceMotion: { caption: 'TIP', text: 'Running slow? Reduce motion in Settings can help' },
    notSaved: 'This browser is not saving your progress · Cloud sync in Settings can keep a copy',
    /** The same where there is no Cloud sync (CrazyGames, no service). */
    notSavedHere: 'This browser is not saving your progress · It lasts until you close the game',
    /** The save was changed outside the game (Leo, 04.10.2026): the last one the game wrote is back. */
    saveRestored: 'Your save was changed outside the game · The last saved progress is back',
    /** ...and there was nothing to go back to: what was played stays, money and chests do not. */
    saveDistrusted: 'Your save was changed outside the game · Money and chests were reset',
    /** A friend's invite was kept (`?ref=`): with a name already, or still needing one. */
    invited: `Invited by a friend · Reach level ${INVITE_LEVEL} and you both get a chest`,
    invitedNeedsName: `Invited by a friend · Pick a name under Social, reach level ${INVITE_LEVEL} and you both get a chest`,
    /** Once for everyone (`announceInvite`), and again at level 10 (`inviteReminder`): the friend code is the invite, and the Social tab is where it is. The website (`buildWithUs`) is told once, too. */
    invite: { caption: 'INVITE A FRIEND', text: `You both get a chest at level ${INVITE_LEVEL}. The Social tab has your code and link` },
    inviteReminder: { caption: 'INVITE A FRIEND', text: `Level ${INVITE_REMINDER_LEVEL}! Bring a friend: you both get a chest at level ${INVITE_LEVEL}. Code under Social` },
    buildWithUs: { caption: 'NEW WEBSITE', text: 'timing.love: report bugs and ideas there. Bug hunters may get a gift' },
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
    /** The pill on the Game tab that leads to the Chests page while chests wait. */
    openChest: (n: number): string => (n > 1 ? `${n} chests ready` : 'Chest ready'),
    openChestLabel: (n: number): string => (n > 1 ? `Your chests: ${n} ready to open` : 'Your chest: ready to open'),
    pictureText: 'My shift in Roundabout Timing',
    pictureSaved: 'Picture saved',
    pictureCopied: 'Picture copied',
    shareText: (target: string): string => `Can you beat ${target} on my roundabout?`,
    dailyCopied: 'Daily result copied',
    /** The finished Daily Shift as one line to paste in a chat: the same shift for everyone that day. */
    dailyShare: (score: string, perfects: number, tightFits: number, streak: number): string =>
      [
        `Roundabout Timing Daily · ${score}`,
        perfects > 0 ? `${perfects} Perfect` : '',
        tightFits > 0 ? `${tightFits} Tight Fit${tightFits === 1 ? '' : 's'}` : '',
        streak > 1 ? `${streak} days in a row` : '',
      ]
        .filter(Boolean)
        .join(' · '),
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
      if (id.startsWith('tour.')) return S.tours.stopName(id);
      const rank = ascensionRank(id);
      if (rank !== null) return `Ascension ★${rank}`;
      const level = levelTrialLevel(id);
      if (level !== null) return `${S.trials.kindName[levelKind(level)]} · Lv ${level}`;
      return {
        tightSqueeze: 'Tight Squeeze',
        deadCentre: 'Dead Centre',
        cleanSheet: 'Clean Sheet',
        blackout: 'Blackout',
        stormWatch: 'Storm Watch',
        marathon: 'Marathon',
        mostWanted: 'Most Wanted',
        noPolice: 'Off the Force',
        noDriving: 'Hands Only',
        bareBuild: 'Bare Bones',
      }[id as TrialId];
    },
    kindName: {
      precision: 'Precision',
      sharpEyes: 'Sharp Eyes',
      cleanRun: 'Clean Run',
      weatherRun: 'Rough Weather',
      nightShift: 'Night Shift',
      manhunt: 'Manhunt',
      ruleBreaker: 'Ruthless',
      handicap: 'Handicap',
      longHaul: 'Long Haul',
    } satisfies Record<LevelKind, string>,
    goal(t: Trial): string {
      if (t.tour) return S.tours.goal(t);
      if (t.elite) return S.weekly.goal(t);
      if (levelTrialLevel(t.id) !== null) {
        const strip = t.strip ?? [];
        const parts = [
          t.goal.k === 'perfects' ? `${t.goal.n} Perfect Inputs` : t.goal.k === 'skilled' ? `${t.goal.n} Tight Fits or better` : t.goal.k === 'boss' ? `take down ${S.boss.name(t.boss ?? 'convoy')}` : null,
          `${t.cars} cars`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'no crash' : null,
          strip.length > 0 ? `your build without ${strip.map((g) => ['Police', 'Money', 'Driving'][g]).join(' and ')}` : null,
        ];
        return parts.filter((p): p is string => p !== null).join(' · ');
      }
      if (ascensionRank(t.id) !== null) {
        const parts = [
          `${t.cars} cars`,
          t.weather !== 'clear' ? S.weather(t.weather) : null,
          t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
          t.legendary ? S.legendary.name(t.legendary) : null,
          t.rule === 'flawless' ? 'no crash' : null,
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
          return `${t.cars} cars, no crash`;
        case 'blackout':
          return `${t.cars} cars at night, the street lamps out`;
        case 'stormWatch':
          return `${t.cars} cars through a storm at night`;
        case 'marathon':
          return `${t.cars} cars in one shift`;
        case 'mostWanted':
          return 'Take down the syndicate boss';
        case 'noPolice':
          return `${t.cars} cars with your build, but no Police upgrades`;
        case 'noDriving':
          return `${t.cars} cars with your build, but no Driving upgrades (no Shield)`;
        case 'bareBuild':
          return `${t.cars} cars with your build, but no Police and no Driving upgrades`;
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
    scoutFirst: 'A scout with an escort: ram it with a police car, in the gap before the escort',
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
        zeroTolerance: 'One crash ends it',
      })[r],
    reward: 'REWARD',
    chest: 'Premium',
    done: (item: string | null): string => `LEGENDARY SHIFT DONE${item ? ` · ${S.shop.item(item)} unlocked` : ''}`,
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
          return `Level ${t.level} · ${t.cars} cars, no crash`;
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
    done: (m: string): string => `WEEKLY SHIFT DONE · +${money(m)}`,
    passedThisWeek: 'Passed this week · new one on Monday',
  },

  /** Invite a friend (Ranks → Friends). */
  invite: {
    shareText: (level: number): string => `Join me in Roundabout Timing! Reach level ${level} and we both get a free chest.`,
  },

  rewards: {
    bugHunter: (id: string): string => `${S.shop.item(id).toUpperCase()} UNLOCKED · thanks for hunting bugs`,
    chest: (kind: ChestKind): string => `A GIFT FROM THE TEAM · ${S.shop.chest(kind)} · thank you`,
    money: (amount: number): string => `A GIFT FROM THE TEAM · ${amount.toLocaleString('en-US')} money · thank you`,
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
    /** The line in the ring after a shift: the XP it earned and what is missing to the next level. */
    toGo: (b: EliteBar): string => {
      const next = `${Fmt.number(b.left)} XP to Elite ${b.level + 1}`;
      if (b.climbed > 0) return `ELITE ${b.level} · ${next}`;
      return b.gained > 0 ? `+${Fmt.number(b.gained)} XP · ${next}` : next;
    },
    opened: 'ELITE DRIVER · the Elite track is open',
    reached: (step: EliteStep): string => `ELITE ${step.level}${step.item ? ` · ${S.shop.item(step.item.id)} unlocked` : ''}`,
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
        marathoner: 'Marathoner',
        overdriver: 'Overdriver',
        endless: 'Endless',
        scorcher: 'Scorcher',
        inferno: 'Inferno',
        meltdown: 'Meltdown',
        patron: 'Patron',
        benefactor: 'Benefactor',
        philanthropist: 'Philanthropist',
        visionary: 'Visionary',
        sovereign: 'Sovereign',
        timeless: 'Timeless',
        apex: 'Apex',
        boundless: 'Boundless',
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
        case 'heat':
          return S.heat.rule(r.level);
        case 'fund':
          return `Give ${money(Fmt.number(r.amount))} to the Game fund`;
        case 'item':
          return `Unlock ${S.shop.item(r.id)} in Unlimited`;
        case 'masteries':
          return 'Reach tier V in every mastery';
      }
    },
    earned: (ids: TitleId[]): string => (ids.length === 1 ? `TITLE · ${S.titles.name(ids[0])}` : `${ids.length} NEW TITLES · ${ids.map((t) => S.titles.name(t)).join(', ')}`),
    none: 'No title',
  },

  pass: {
    title: 'Season Pass',
    seasonName: (s: Season): string => ({ winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' })[s],
    caption: (s: Season): string => `${S.pass.seasonName(s)} Season Pass`,
    tier: (n: number, total: number): string => `Tier ${n} of ${total}`,
    xp: (into: number, need: number): string => `${into} / ${need} XP`,
    locked: (level: number): string => `Opens at Level ${level}`,
    buyHint: 'Chests, money and three skins',
    daysLeft: (n: number): string => (n === 1 ? 'last day' : `${n} days left`),
    complete: 'Track complete · see you next season',
    reward(r: PassReward): string {
      if (r.k === 'chest') return S.shop.chest(r.chest);
      if (r.k === 'money') return money(Fmt.number(r.amount));
      return S.shop.item(r.item.id);
    },
    reached: (step: PassStep): string =>
      `SEASON PASS · TIER ${step.tier} · ${step.duplicate > 0 ? `${S.pass.reward(step.reward)} again · +${money(Fmt.number(step.duplicate))}` : S.pass.reward(step.reward)}`,
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
    notBuilt: 'A gold wall on the island with a star for every Prestige rank, and a skin of its own. Tap to see what it gives.',
    tapMore: 'Tap to see what it gives.',
    open: (level: number): string => `Opens once you reach Level ${level}`,
    plaque: (e: HallEntry): string => `★${e.rank}`,
    plaqueLine: (e: HallEntry, date: string | null): string =>
      [date, e.elite > 0 ? `Elite ${e.elite}` : null, `${e.bosses} ${e.bosses === 1 ? 'boss' : 'bosses'}`, e.legendary > 0 ? `${e.legendary} legendary` : null].filter((x) => x).join(' · '),
    empty: 'Your first Prestige gets the first plaque.',
    standing: 'Standing on the island',
    /** The Hall's own sheet: what building it gives you. */
    about: [
      'A monument that stays on your island for good: a gold wall of honour along the top, with a star for every Prestige rank you have earned.',
      'It keeps your story. Every Prestige adds a plaque to the list in the Elite sheet: the day, your Elite level, the bosses you took down and the legendary shifts you cleared by then.',
      'And it unlocks the Hall of Famer skin, gold with a laurel that glows, for your cars.',
    ],
    looks: 'Only looks and honour: no bonus on the road, nothing to lose when you Prestige.',
    gives: 'What you get',
    wall: 'Gold wall on the island',
    wallValue: (ranks: number): string => (ranks > 0 ? `${ranks} ${ranks === 1 ? 'star' : 'stars'} now` : 'No stars yet'),
    plaques: 'A plaque per Prestige',
    plaquesValue: (n: number): string => (n > 0 ? `${n} so far` : 'None yet'),
    skin: 'Hall of Famer skin',
    skinValue: 'Gold, with a laurel',
    back: 'Back to Elite',
  },

  modes: {
    name: (m: SwipeMode): string => (m === 'shift' ? 'SHIFT' : m === 'unlimited' ? 'UNLIMITED' : m === 'mayhem' ? 'MAYHEM' : m === 'chill' ? 'CHILL' : 'MULTIPLAYER'),
    line: (m: SwipeMode): string =>
      m === 'shift' ? 'Clear the level, move up' : m === 'unlimited' ? 'Endless · until you crash' : m === 'mayhem' ? '12 cars · aim for the tankers' : m === 'chill' ? 'No pressure · crashes never end it' : 'Up to 4 friends · last one standing',
    unlimitedCaption: 'UNLIMITED',
    endless: '∞',
    versusPlayers: '2–4',
    youLabel: 'YOU',
    defaultName: 'Player',
    runOver: 'RUN OVER',
    again: 'Tap for another run',
    carsSent: (n: number): string => (n === 1 ? '1 car' : `${n} cars`),
    unlocked: { caption: 'NEW MODES', text: 'Swipe sideways for Unlimited, Mayhem, Chill and Multiplayer' },
    /** After the first lost shift: the mode without levels. */
    tryUnlimited: { caption: 'GAME MODES', text: 'Swipe sideways for Unlimited: no levels, just go until you crash' },
    /** Taught once, on a later visit or after a few shifts: the scoring pays for close merges. */
    tightFit: { caption: 'TIP', text: 'Closer pays more: join right behind a car for a Tight Fit, twice the points' },
    swipeCaption: 'GAME MODES',
    swipeHint: 'Swipe for more modes',
    /** Unlimited's late stages (`endlessStages`), as they come. */
    stage: (stage: number, overtime: number): string =>
      overtime > 0
        ? `OVERTIME ${overtime} · more traffic, a little faster`
        : (['', 'GAS TANKERS JOIN THE TRAFFIC', 'NIGHT FALLS', 'A STORM ROLLS IN', 'MILITARY TRUCKS ON THE ROAD'][stage] ?? ''),
    tier: (id: TierId): string => ({ bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond', master: 'Master' })[id],
    /** A tier reached in a run: its name over the ring, and in the shift's news. */
    mark: (cars: number, reward: { tier: TierId | null; skin: string | null }): string =>
      reward.tier ? `${cars} cars · ${S.modes.tier(reward.tier).toUpperCase()}` : reward.skin ? `${cars} cars · ${S.shop.item(reward.skin).toUpperCase()}` : `${cars} cars`,
    tierUp: (id: TierId): string => `NEW TIER · ${S.modes.tier(id).toUpperCase()} in Unlimited`,
    /** Its line in Records: the tier, and how far the next one is. */
    tierLine: (id: TierId | null, next: { cars: number; id: TierId } | null): string => [id ? S.modes.tier(id) : '–', next ? `${next.cars} cars for ${S.modes.tier(next.id)}` : null].filter(Boolean).join(' · '),
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

  /** Chill (Leo, 07.10.2026): the calm mode. */
  chill: {
    caption: 'CHILL',
    time: 'TIME',
    done: 'Done',
    doneLabel: 'Done: end this drive',
    over: 'GOOD DRIVE',
    again: 'Tap to drive again',
    summary: (cars: number, time: string): string => `${cars === 1 ? '1 car' : `${cars} cars`} · ${time}`,
    best: (cars: number): string => `Your longest drive: ${cars === 1 ? '1 car' : `${cars} cars`}`,
  },

  /** Daily mutators (core/mutators.ts). */
  mutator: {
    caption: 'TODAY',
    name: (id: MutatorId): string =>
      ({
        openRoad: 'Open Road',
        speedway: 'Speedway',
        fogBank: 'Fog Bank',
        nightShift: 'Night Shift',
        lightsOut: 'Lights Out',
        stormFront: 'Storm Front',
        rushAllDay: 'Rush All Day',
        dragnet: 'Dragnet',
        heavyLoad: 'Heavy Load',
        cashConvoy: 'Cash Convoy',
      })[id],
    line: (id: MutatorId): string =>
      ({
        openRoad: 'Fewer cars on the ring',
        speedway: 'Faster, with a little less traffic',
        fogBank: 'Fog all shift',
        nightShift: 'After dark',
        lightsOut: 'Night, and the street lamps are out',
        stormFront: 'A storm all shift',
        rushAllDay: 'Rush hour from the first car',
        dragnet: 'Criminals twice as often',
        heavyLoad: 'Lorries and tankers everywhere',
        cashConvoy: 'Money transporters twice as often',
      })[id],
    /** The pill on the Daily Shift's waiting card. */
    pill: (id: MutatorId): string => `TODAY · ${S.mutator.name(id).toUpperCase()}`,
  },

  /** Season rules (core/seasons.ts). */
  seasonRule: {
    name: (s: Season): string => ({ winter: 'Deep Winter', spring: 'April Showers', summer: 'Summer Storms', autumn: 'Fog & Dusk' })[s],
    line: (s: Season): string =>
      ({
        winter: 'Fog and snow come more often, and night falls early',
        spring: 'More rain, more often',
        summer: 'Mostly clear, but when it turns it is a storm',
        autumn: 'More fog, and the evenings come early',
      })[s],
  },

  /** Tours (core/tours.ts). */
  tours: {
    caption: 'TOUR',
    name: (id: TourId): string => ({ halloween: 'Haunted Ring', winter: 'Winter Lights' })[id],
    tagline: (id: TourId): string =>
      ({
        halloween: 'Seven stops after dark. Three skins, only here.',
        winter: 'Seven snowy stops. Three skins, only here.',
      })[id],
    stop: (n: number, of: number): string => `Stop ${n}/${of}`,
    stopName: (id: string): string => {
      const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
      return m ? `${S.tours.name(m[1] as TourId)} · stop ${m[2]}` : '';
    },
    left: (n: number): string => (n <= 1 ? 'last day' : `${n} days left`),
    opensIn: (n: number): string => (n === 1 ? 'tomorrow' : `in ${n} days`),
    /** Under the tour's name on Progress → Today, before it runs. */
    startsIn: (inDays: number): string => `Starts ${S.tours.opensIn(inDays)}`,
    locked: (level: number): string => `Tours open at level ${level}`,
    progress: (done: number, total: number): string => `${done}/${total} stops`,
    play: 'Play ›',
    /** What a stop asks for, from its trial. */
    goal(t: Trial): string {
      const parts = [
        `${t.cars} cars`,
        t.weather !== 'clear' ? S.weather(t.weather) : null,
        t.darkness === 'blackout' ? S.blackout : t.darkness === 'night' ? S.night : null,
        t.legendary ? S.legendary.name(t.legendary) : null,
        t.rule === 'flawless' ? 'no crash' : null,
        t.goal.k === 'perfects' ? `${t.goal.n} Perfect Inputs` : null,
        t.goal.k === 'boss' ? 'take down the boss' : null,
      ];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    reward(r: TourReward): string {
      const parts = [r.item ? S.shop.item(r.item) : null, r.chest ? S.shop.chest(r.chest) : null, r.money ? `${Fmt.number(r.money)} coins` : null];
      return parts.filter((p): p is string => p !== null).join(' + ');
    },
    /** The reward in a few characters, for a column: the skin first, else the chest, else the money. */
    rewardShort: (r: TourReward): string => (r.item ? S.shop.item(r.item) : r.chest ? S.shop.chest(r.chest) : money(Fmt.number(r.money ?? 0))),
    stopDone: (n: number, of: number, reward: string): string => `TOUR STOP ${n}/${of} · ${reward}`,
    complete: (id: TourId): string => `${S.tours.name(id).toUpperCase()} COMPLETE`,
    passedBefore: 'Done on this tour already',
  },

  /** Achievements (core/achievements.ts). */
  ach: {
    heading: 'Achievements',
    name: (id: string): string =>
      ({
        scrapyard: 'Scrapyard',
        fireworks: 'Fireworks',
        spotless: 'Spotless',
        jackpot: 'Jackpot Hunter',
        critical: 'Critical Hits',
        wizard: 'Traffic Wizard',
        earner: 'Big Earner',
        weatherproof: 'Weatherproof',
        stormRider: 'Storm Rider',
        whiteout: 'Whiteout',
        moonlighter: 'Moonlighter',
        lightsOut: 'Lights Out',
        cityLife: 'City Life',
        longHaul: 'Long Haul',
        clockwork: 'Clockwork',
        onARoll: 'On a Roll',
        regular: 'Regular',
        testDriver: 'Test Driver',
        hunter: 'Syndicate Hunter',
        roadBuilder: 'Road Builder',
        foreman: 'Foreman',
        tuner: 'Tuner',
        chestOpener: 'Chest Opener',
        collector: 'Collector',
        climber: 'Climber',
        elite: 'Elite Driver',
        reborn: 'Reborn',
        heatSeeker: 'Heat Seeker',
        gambler: 'High Roller',
        zen: 'Zen Driver',
        tourist: 'Tourist',
      })[id] ?? id,
    /** What a tier asks for. */
    goal: (id: string, n: number): string => {
      const N = Fmt.number(n);
      return (
        {
          scrapyard: `Cause ${N} wrecks`,
          fireworks: `Set off ${N} explosions`,
          spotless: `${N} Perfect Runs`,
          jackpot: `Deliver ${N} Jackpot ${n === 1 ? 'transporter' : 'transporters'}`,
          critical: `Land ${N} Critical Merges`,
          wizard: `Send ${N} cars`,
          earner: `Earn ${N} coins on the road`,
          weatherproof: `Clear ${N} shifts in bad weather`,
          stormRider: `Clear ${N} shifts in a storm, hail or sandstorm`,
          whiteout: `Clear ${N} shifts in fog or snow`,
          moonlighter: `Clear ${N} shifts at night`,
          lightsOut: `Clear ${N} shifts in a blackout`,
          cityLife: `Clear ${N} shifts with a city event`,
          longHaul: `Last ${Fmt.seconds(n)} in one Unlimited run`,
          clockwork: `Clear ${N} Daily Shifts`,
          onARoll: `A ${N}-day Daily streak`,
          regular: `Pass ${N} Weekly ${n === 1 ? 'Shift' : 'Shifts'}`,
          testDriver: `Pass ${N} ${n === 1 ? 'trial' : 'trials'}`,
          hunter: `Take down ${N} ${n === 1 ? 'syndicate boss' : 'different syndicate bosses'}`,
          roadBuilder: `Build ${N} extra ${n === 1 ? 'road' : 'roads'}`,
          foreman: `Have ${N} ${n === 1 ? 'module' : 'modules'} standing`,
          tuner: `Own ${N} upgrade steps`,
          chestOpener: `Open ${N} chests`,
          collector: `Collect ${N} items`,
          climber: `Reach level ${N}`,
          elite: `Reach Elite ${N}`,
          reborn: `Prestige ${N} ${n === 1 ? 'time' : 'times'}`,
          heatSeeker: `Clear a shift at Heat ${N}`,
          gambler: `Play ${N} casino rounds`,
          zen: `Send ${N} cars in Chill`,
          tourist: `Pass ${N} tour ${n === 1 ? 'stop' : 'stops'}`,
        } as Record<string, string>
      )[id] ?? '';
    },
    tier: (n: number): string => ['I', 'II', 'III', 'IV'][n - 1] ?? String(n),
    /** The small line over the name on the card that announces one (`AchievementCard`). */
    caption: 'ACHIEVEMENT',
    reached: (id: string, tier: number, reward: string): AchievementCard => ({
      title: S.ach.name(id),
      tier: S.ach.tier(tier),
      reward: `+${money(reward)}`,
      text: `Achievement · ${S.ach.name(id)} ${S.ach.tier(tier)} · +${money(reward)}`,
    }),
    count: (done: number, total: number): string => `${done}/${total}`,
    /** Many at once (a save from before the achievements): one card, not a queue. */
    many: (n: number, reward: string): AchievementCard => ({
      title: `${n} achievements`,
      tier: '★',
      reward: `+${money(reward)}`,
      text: `${n} achievements · +${money(reward)} · see Progress → Goals`,
    }),
  },

  /** The top card's briefing (`Briefings`): what meets you and what to do about it. */
  brief: {
    /** `again`: shown once more after this one cost the last shift. */
    caption: (e: MuseumEntry, again: boolean): string => `${again ? 'Remember' : 'New'} · ${S.museum.name(e)}`.toUpperCase(),
    text: (e: MuseumEntry): string => museumText(e).brief,
  },

  /** Notifications (`net/push.ts`): what reaches the phone while the game is closed, and the switch for it. */
  push: {
    streakTitle: (days: number): string => `Your ${days}-day streak`,
    streakBody: "Play today's Daily Shift before midnight to keep it going.",
    giftTitle: 'Your free chest is ready',
    giftBody: 'A Standard Chest is waiting for you. Open the game to collect it.',
    passTitle: (season: Season): string => `${S.pass.seasonName(season)} is here`,
    passBody: 'A new Season Pass is out, with three new skins to earn.',
    row: 'Notifications',
    rowSub: 'Your streak, a free chest, a new season, or a player passing you in the top 20. At most one a day.',
    rowInstall: 'Add the game to your Home Screen first, then turn them on here.',
    choices: {
      streak: { title: 'Daily streak', sub: 'A nudge in the evening before your streak ends.' },
      chests: { title: 'Free chests', sub: 'Your free chest for tomorrow, and gifts from invites.' },
      pass: { title: 'New season', sub: 'When a new Season Pass starts.' },
      rank: { title: 'Overtaken', sub: 'When a player passes you in the top 20.' },
      comeback: { title: 'Come back', sub: 'A reminder after a few days away.' },
    },
    rowNone: 'Not available here. Open the game in your browser to turn on notifications.',
    rowLocal: 'On. Reminders for when the game is closed need the online service, which this version of the game does not have.',
    confirmTitle: 'Notifications are on',
    rowBlocked: 'Blocked for this site. Allow notifications in your browser settings to turn them on.',
    offerFirstTitle: 'Free chest tomorrow',
    offerFirstWhy: "Get a nudge when tomorrow's free chest is ready, and again before a streak ends. At most one a day, never at night. Turn them off anytime in Settings.",
    offerTitle: 'Keep your streak',
    offerWhy: 'Get a nudge before your streak ends, when a free chest is ready or a new season starts. At most one a day, never at night. Turn them off anytime in Settings.',
    offerOn: 'Turn on notifications',
    offerLater: 'Not now',
    on: 'Notifications on. Turn them off anytime in Settings.',
    failed: 'Notifications could not be turned on. Try again later.',
    denied: 'Notifications are blocked for this site in your browser settings.',
  },

  ready: {
    tapToStart: 'Tap to start',
    tapForFriends: 'Tap to play with friends',
    levelCaption: (level: number, prestige = 0): string => (prestige > 0 ? `★${prestige} · LEVEL ${level}` : `LEVEL ${level}`),
  },

  tabs: {
    progress: 'Progress',
    social: 'Social',
    game: 'Game',
    shop: 'Shop',
    build: 'Build',
  },

  progress: {
    section: (i: number): string => ['Today', 'Trials', 'Goals', 'Records', 'Museum'][i],
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
    levelTrials: 'Level trials',
    levelTrialsHint: (waiting: number, shown: number): string =>
      waiting > shown ? `One more with every level. ${waiting - shown} more are waiting: pass one and the next shows up.` : 'One more with every level, from Level 30 to 120.',
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
    flameTier: (tier: number): string => ['ENGINE OFF', 'ENGINE IDLING', 'ENGINE REVVING', 'BACKFIRING', 'AFTERBURNER', 'INFERNO'][tier] ?? '',
    streakDay: 'day streak',
    streakDays: 'day streak',
    streakStart: "Play today's Daily Shift to start the engine",
    streakKeep: "Play today's Daily Shift to keep it burning",
    streakDone: 'Done today · back tomorrow',
    streakCard: (n: number): string => (n === 1 ? 'Free Scratch Card with the next day' : `Free Scratch Card in ${n} days`),
    shiftsPlayed: 'Shifts played',
    shiftsCompleted: 'Shifts completed',
    takedowns: 'Takedowns',
    transporters: 'Transporters paid',
    unlimitedBest: 'Unlimited best',
    unlimitedCars: 'Unlimited cars',
    unlimitedTier: 'Unlimited tier',
    mayhemBest: 'Mayhem flames',
    mayhemChain: 'Mayhem chain',
    chillBest: 'Longest Chill drive',
    chillCars: 'Cars sent in Chill',
    chillTime: 'Time in Chill',
    minutes: (s: number): string => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`),
    tours: 'Tour stops',
    perfects: 'Perfect Inputs',
    chestsOpened: 'Chests opened',
    none: '–',
    days: (d: number): string => (d === 1 ? '1 day' : `${d} days`),
    owned: (o: number, t: number): string => `${o} / ${t}`,
    collectionShare: (o: number, t: number): string => `Collection · ${Math.floor((o / t) * 100)} %`,
    questsHint: 'Quests pay once each and change at midnight.',
    timingLabel: (n: number): string => `Your timing · last ${n} merges`,
    /** How far from the middle of the gap the taps land on average; null: not enough merges yet. */
    timing: (ms: number | null, onBeat: number): string =>
      ms === null ? '–' : Math.abs(ms) <= onBeat ? 'On the beat' : ms < 0 ? `${-ms} ms early` : `${ms} ms late`,
  },

  /** The Social tab (Leo, 10.10.2026): its segments, and what the Club says while it is still shut. */
  social: {
    section: (i: number): string => ['Friends', 'Ranks', 'Club', 'Mafia'][i],
    clubClosed: 'The Club opens at Level 50: an Auction House, the Game fund and Contracts for big balances.',
    mafiaClosed: "The Family has no time for a rookie. Put the Syndicate's first boss away (Level 15) or get past it, and they will call.",
    offline: 'Friends and Ranks need the online service, which this copy of the game is not connected to.',
    noFriends: 'Friends are not available here. Ranks and the Club are.',
  },

  museum: {
    shelf: (i: number): string => ['Bosses', 'Specials', 'Conditions'][i],
    unknown: '???',
    notSeen: 'Not seen yet',
    newBadge: 'NEW',
    /** A condition's sheet from its icon on the Game tab, before the player has met it. */
    firstTime: 'New for you',
    firstAt: (level: number): string => `From Level ${level}`,
    undiscovered: 'Not discovered yet',
    lockedHint: (level: number): string =>
      level > 1
        ? `Shows up from Level ${level}. Once you have met it on the road, it goes on show here with everything you need to know.`
        : 'Keep playing shifts. Once you have met it on the road, it goes on show here with everything you need to know.',
    lockedBossHint: (level: number): string => `The syndicate sends it on Level ${level}. Once you have faced it, it goes on show here with how to take it down.`,
    kind: (e: MuseumEntry): string => ({ boss: 'Syndicate boss', special: 'Special vehicle', weather: 'Weather', dark: 'Darkness', event: 'City event', road: 'Road' })[e.k],
    met: 'Met, still at large',
    onRing: 'On the ring',
    signalArrive: (arm: string | null, sweep: string | null): string =>
      arm && sweep ? `The arm it comes from glows ${arm}, then a ${sweep} light runs round the island.` : arm ? `The arm it comes from glows ${arm} before it joins the ring.` : `A ${sweep} light runs round the island.`,
    signalPaid: (color: string): string => `Done right: a ${color} ring widens out from the island.`,
    signalMissed: (color: string): string => `Missed: a ${color} ring pulls back into the island.`,
    signalNote: (n: 'escaped' | 'blocked'): string =>
      n === 'escaped' ? 'If it gets away, the whole ring flashes purple.' : 'A car that joins right in front of it flashes the whole ring red and breaks your combo.',
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
    game: (g: CasinoGame): string => ({ crash: 'Crash', slots: 'Slots', upgrade: 'Upgrade', roulette: 'Roulette', scratch: 'Scratch' })[g],
    betOn: (name: string, pay: number): string => `${name} · ${pay.toFixed(2)}×`,
    rouletteHint: 'Pick a vehicle. The car leaves by an exit of its type, or it does not.',
    rouletteWin: (name: string, pay: number): string => `${name} exit · ${pay.toFixed(2)}×`,
    rouletteLose: (name: string): string => `Left by a ${name} exit`,
    bet: (m: string): string => `Bet · ${m}`,
    exits: (n: number): string => (n === 1 ? '1 exit' : `${n} exits`),
    scratchHint: 'Three alike win. Streak days earn free cards.',
    scratchTitle: 'SCRATCH & WIN',
    scratchHand: (n: number): string => (n === 0 ? 'No cards in hand' : `${n} ${n === 1 ? 'card' : 'cards'} in hand`),
    scratch: (n: number): string => `Scratch a card · ${n} in hand`,
    buyCard: (m: string): string => `Buy a card · ${m}`,
    cardFull: 'Hand is full',
    cardWon: (x: number): string => `Three × ${x}`,
    cardLost: 'No three alike',
    symbol: (s: SlotSymbol): string =>
      ({ car: 'Car', compact: 'Compact', van: 'Van', sportsCar: 'Sports car', ambulance: 'Ambulance', transporter: 'Transporter', boss: 'Boss' })[s],
    today: (net: number): string => (net === 0 ? 'Today ±0' : `Today ${net > 0 ? '+' : '−'}${money(Fmt.number(Math.abs(net)))}`),
    odds: 'Odds',
    noHistory: 'No rounds yet',
    times: (m: number): string => `${m.toFixed(2)}×`,
    allIn: 'All in',
    stakeShort: (n: number): string => (n >= 1_000_000 && n % 1_000_000 === 0 ? `${n / 1_000_000}M` : n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : Fmt.number(n)),
    highRoller: 'High Roller',
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
    /** The stamp that slams onto the table, by win tier (2…4). */
    winBanner: (tier: number): string => (tier >= 4 ? 'MEGA WIN!' : tier >= 3 ? 'HUGE WIN!' : 'BIG WIN!'),
    upgradedBanner: 'UPGRADED!',
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
      roulette: [
        'The ring has 20 exits, one for every stop of the slot reels, each as likely. Bet on a vehicle type: the car leaves by one of its exits and the bet pays, or it does not.',
        'The fewer exits a type has, the more it pays: 95 % of the stake divided by its share of the ring. Where the car leaves is drawn before it starts to drive.',
      ],
      scratch: [
        'Nine cells, three alike win that prize times the card\'s price. Cards cost money here, and every third day of your Daily streak gives you one for free.',
        'The card is drawn when you scratch it and the prize is paid before the cells show. No cell is ever more than two alike unless it wins.',
      ],
      exitsOf: (s: string, n: number): string => `${s} · ${S.casino.exits(n)}`,
      cardPrize: (x: number): string => `Three × ${x}×`,
      cardHit: (n: string): string => `A win every ${n} cards on average`,
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
    pickOne: 'Tap a part for details · tap a built one to upgrade, move or remove it.',
    dragHint: 'Drag it onto a free slot on the ring.',
    buildHint: 'Double-tap the part to build it · one tap takes it away.',
    keepsArms: (n: number): string => `A roundabout keeps at least ${n} arms`,
    name: (part: string): string =>
      part === 'arm' ? 'New arm' : part === 'tollBooth' ? 'Toll Booth' : part === 'speedCamera' ? 'Speed Camera' : part === 'billboard' ? 'Billboard' : part === 'detour' ? 'Detour Sign' : 'Tow Depot',
    /** A part that is already on the ring (its sheet). */
    builtName: (part: string): string => (part === 'arm' ? 'Arm' : S.builder.name(part)),
    onTheRing: 'On your roundabout',
    arms: 'Arms on the ring',
    move: 'Move',
    delete: 'Delete',
    deleteConfirm: 'Tap again to delete',
    noRefund: 'Moving is free. Deleting pays nothing back.',
    moveHint: 'Drag it to a free slot, or tap one · tap anywhere else to keep it where it is.',
    level: (level: number, max: number): string => `Level ${level} of ${max}`,
    upgrade: (price: string): string => `Upgrade · ${price}`,
    maxLevel: 'Fully upgraded',
    nextLevel: 'Next level',
    upgraded: (name: string, level: number): string => `${name} is level ${level} now`,
    zone: 'Where it works',
    /** A detour sign on a slot where no exit lies between it and the player's arm. */
    detourIdle: 'Nothing to turn off here: no exit between this spot and your arm. Move it to an earlier slot.',
    /** What a module of this level does in a few words (the sheet's Now and Next level). */
    effect(part: string, c: Config, level: number): string {
      switch (part) {
        case 'tollBooth':
          return `${money(String(c.tollPerTruck * level))} per lorry`;
        case 'speedCamera':
          return `${money(String(c.cameraFine * level))} per speeder`;
        case 'billboard':
          return `${money(String(c.billboardPerCar * level))} per car`;
        case 'detour':
          return `${percent(detourShareAt(c, level))} of cars turn off`;
        default:
          return `Wrecks gone ${percent(towSpeedupAt(c, level))} faster`;
      }
    },
    explanation(part: string, c: Config, level = 1): string {
      switch (part) {
        case 'arm':
          return `A wider ring with one more way in and out: ${percent(c.trafficPerArm)} more traffic, transporters more often, and ${percent(c.payPerArm)} more pay per shift.`;
        case 'tollBooth':
          return `Every lorry pays ${money(String(c.tollPerTruck * level))} here, in the first ${Math.round(c.moduleEarningSeconds)} s of a shift. Traffic slows down around it, and so do your police cars.`;
        case 'speedCamera':
          return `Fines every car over the limit ${money(String(c.cameraFine * level))} in the first ${Math.round(c.moduleEarningSeconds)} s of a shift: nothing in a calm shift, a lot in rush hour. Everyone brakes hard at it.`;
        case 'billboard':
          return `Every car that drives past pays ${money(String(c.billboardPerCar * level))} in the first ${Math.round(c.moduleEarningSeconds)} s of a shift. Drivers look up and ease off a little.`;
        case 'detour':
          return `Sends cars off the ring early: ${percent(detourShareAt(c, level))} of the cars that pass it and would drive on leave at the next exit instead, so fewer reach your arm. It only helps with an exit between the sign and your arm, and with cars joining before the sign.`;
        default:
          return `Wrecks near it are towed away ${percent(towSpeedupAt(c, level))} faster, so the ring flows again sooner.`;
      }
    },
  },

  /** Rewarded ads (Leo, 05.10.2026): always the player's choice, paid only when watched to the end. */
  ads: {
    watch: 'Watch ad',
    /** A rewarded ad that did not play to the end: no reward, and why. */
    failed: (outcome: Exclude<RewardedOutcome, 'watched'>): string =>
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
  /** The Club (Leo, 10.10.2026): the Auction House, the Game fund and Contracts, the third segment of the Social tab (`ui/clubPanel.ts`). */
  club: {
    title: 'Club',
    goalName: (goal: ContractGoal): string => ({ clean: 'Clean sheet', sharp: 'Sharp', flawless: 'Flawless' })[goal],
    goalText(goal: ContractGoal, cars: number): string {
      const need = Contracts.need(goal, cars);
      const base = 'Complete the next career shift with a Perfect Run: no crash, no police crash';
      if (goal === 'sharp') return `${base}, and ${need.perfects} Perfect merges.`;
      if (goal === 'flawless') return `${base}, and a chain of ${need.chain} merges.`;
      return `${base}.`;
    },
    /** What a settled contract says on the result. */
    contractSettled(outcome: ContractOutcome): string {
      const name = S.club.goalName(outcome.contract.goal).toUpperCase();
      if (outcome.result === 'won') return `CONTRACT WON · ${name} · +${money(Fmt.number(outcome.pay))}`;
      if (outcome.result === 'void') return `CONTRACT VOID · this shift was eased · ${money(Fmt.number(outcome.pay))} back`;
      return `CONTRACT LOST · ${name} · ${money(Fmt.number(outcome.contract.stake))} gone`;
    },
  },

  /** The Club's page (`ui/clubPanel.ts`): the Auction House, the Game fund and Contracts. */
  clubPanel: {
    tabs: { auction: 'Auction', ideas: 'Game fund', contracts: 'Contracts' },
    money: 'money',
    sealedChest: 'A sealed chest',
    exclusive: 'Auction House exclusive',
    timer: {
      open: 'Bidding open · Make your offer',
      once: 'Going once... 🔨',
      twice: 'Going twice! Final warning! 🔨🔨',
      fall: 'HAMMER FALLS! 🔨🔨🔨',
      seconds: (s: string): string => `${s}s`,
    },
    expiredSold: (name: string, price: string): string => `🔨 Time expired! The hammer falls: Sold to ${name} for ${price}.`,
    expiredNone: '🔨 Time expired! No opening bids were placed. The lot has been withdrawn.',
    bidOn: (lot: string): string => `Bid on ${lot}`,
    enter: 'Enter Auction',
    tried: 'Tried',
    owned: 'Owned',
    lots: "Today's lots",
    estimate: (kind: string, price: string): string => `${kind} · estimate ${price}`,
    rules: (sharks: number, sharkLo: number, sharkHi: number, pennyLo: number, pennyHi: number, start: string, premium: string): string =>
      `The collectors in the room are computer-controlled. ${sharks} in 10 are sharks who keep bidding up to ${sharkLo} to ${sharkHi} times the estimate; the rest stop at ${pennyLo} to ${pennyHi} times. ` +
      `The bidding opens at ${start} of the estimate. Each round has a countdown timer — counter-bid before the hammer falls! When the hammer falls on your bid you pay it plus a ${premium} buyer's premium. ` +
      'Walking away costs nothing, but the lot is gone for today. A new set tomorrow.',
    record: (wins: number, spent: string): string => `Lots won · ${wins}   Spent · ${spent}`,
    seats: (n: number, lot: string): string => `${n} collectors take their seats for ${lot}.`,
    you: 'You',
    wonBadge: '🏆 AUCTION WON',
    wonTitle: (lot: string): string => `Sold to you: ${lot}`,
    wonDesc: (price: string, paid: string): string => `Hammer fell at ${price}. Total paid with premium: ${paid}. Item is in your garage!`,
    closedBadge: 'AUCTION CLOSED',
    soldTo: (name: string): string => `Sold to ${name}`,
    withdrawn: 'Lot Withdrawn',
    closedSold: (price: string): string => `Winning bid: ${price}. You can try again tomorrow with fresh lots.`,
    closedNone: 'No bids placed within the time limit. Lot withdrawn for today.',
    leadBadge: '⭐ YOU HOLD THE LEAD',
    leadTitle: (price: string): string => `Current highest bid: ${price}`,
    leadDesc: 'You hold the floor! If no collector counters before the hammer strikes three times, you win this lot.',
    outbidBadge: '⚠️ YOU ARE OUTBID',
    outbidTitle: (name: string, price: string): string => `${name} leads with ${price}`,
    outbidDesc: 'Place a higher bid before the countdown timer expires to stay in the auction!',
    openBadge: '📢 OPENING BID REQUIRED',
    openTitle: (start: string): string => `Floor opens at ${start}`,
    openDesc: 'Select a bid below before time runs out to open the auction and claim the first lead.',
    openingMinimum: 'Opening minimum',
    highestBid: 'Highest bid so far',
    leads: (name: string): string => `${name} leads`,
    noBid: 'No bid yet',
    collectors: (active: number): string => `Collectors in room (${active} active):`,
    collectorsLabel: 'Collectors',
    botOut: (name: string): string => `${name} · Out`,
    botLeading: (name: string): string => `👑 ${name} · Leading`,
    botIn: (name: string): string => `${name} · In`,
    soldToYou: (lot: string): string => `Sold to you · ${lot}`,
    concluded: 'Auction concluded',
    hammerSum: (price: string, premium: string, paid: string): string => `Hammer ${price} + premium ${premium} = ${paid}`,
    soldLine: (name: string, price: string): string => `Sold to ${name} for ${price}.`,
    withdrawnLine: 'Lot withdrawn without bids.',
    back: 'Back to the lots',
    tiers: { min: 'Min Bid · +1 Step', raise: 'Raise · +3 Steps', power: 'Power Bid · +6 Steps' },
    holdTitle: 'You hold the winning bid',
    holdSub: 'Wait for collectors to counter-bid or the hammer to fall.',
    concede: 'Walk away (Concede lot)',
    walk: 'Walk away',
    bidLabel: (amount: string): string => `Bid ${amount}`,
    bid: (price: string): string => `Bid ${price}`,
    tooCostly: 'Too costly',
    withPremium: (cost: string, canAfford: boolean): string => `${cost} with 10% premium${canAfford ? '' : ' · (Not enough money)'}`,
    notEnough: 'Not enough money',
    minCost: (cost: string): string => `The minimum bid costs ${cost} with the 10% buyer's premium.`,
    guideHead: '💡 How Bidding Works: ',
    guide: 'Place a bid before the 10s timer expires. Collectors will either raise or drop out. Hold the lead through three hammer strikes to win! The 10% buyer fee is only paid if you win.',
    walkedAway: 'You walked away.',
    walkedAwaySold: (name: string, price: string): string => `You walked away. ${name} takes it at ${price}.`,
    youBid: (price: string): string => `You bid ${price}!`,
    dropsOut: (name: string): string => `${name} drops out.`,
    counterBids: (name: string, price: string): string => `${name} counter-bids ${price}!`,
    noCounter: 'No collectors counter your bid...',
    goingOnce: (price: string): string => `Going once at ${price}... 🔨`,
    goingTwice: 'Going twice! Fair warning... 🔨🔨',
    sold: (price: string): string => `SOLD! The hammer falls at ${price} to you! 🔨🔨🔨`,
    state: { built: 'Built', funded: 'Funded', funding: 'Funding' },
    ideasOffline: 'Ideas need the online service, which this copy of the game is not connected to.',
    tryAgain: 'Try again',
    loading: 'Loading the ideas…',
    detailsLabel: (title: string): string => `${title}, details`,
    builtThanks: 'Built · thank you',
    raised: (raised: string, goal: string, mine: string | null): string => `${raised} of ${goal}${mine ? ` · you gave ${mine}` : ''}`,
    suggest: 'Suggest an idea',
    ideasIntro: (goal: string): string => `What should the game get next? Players give money together; an idea that reaches ${goal} is made. Money given does not come back.`,
    ideaSent: 'Thank you! We read every idea. The good ones show up here once we have worded them for the game.',
    groupFunding: 'Funding',
    groupFunded: 'Funded · being made',
    groupBuilt: 'Built',
    noIdeas: 'No idea is open yet. Be the first to suggest one.',
    /** The notice when a new idea was published since the player last looked. */
    newIdea: (title: string): string => `NEW IDEA IN THE GAME FUND · ${title}`,
    status: 'Status',
    raisedLabel: 'Raised',
    goalLabel: 'Goal',
    youGave: 'You gave',
    suggestedBy: (name: string): string => `Suggested by ${name}`,
    give: 'Give',
    giftName: 'Gifts carry your name on the leaderboard. Pick one to give.',
    save: 'Save',
    ideaFunded: 'This idea has its money. It goes into the game next.',
    done: 'Done',
    thanksFor: 'Thank you for giving',
    fundedBang: ' · Funded!',
    thanks: 'Thank you',
    ideaName: 'Ideas carry your name. Pick one to suggest.',
    ideaPlaceholder: 'A new map, a car, a rule, a skin…',
    ideaLabel: 'Your idea',
    send: 'Send idea',
    ideaHow: 'Tell us what you would like in the game. We read it, word it so it fits, and publish it here. One idea a day.',
    ownAmount: 'Your own amount',
    giveAmount: (price: string): string => `Give ${price}`,
    yourContract: 'Your contract',
    tearUp: 'Tear it up',
    contractPays: (goal: string, pay: string): string => `${goal} Pays ${pay} if it is met.`,
    settle: 'It is settled by your next career shift (not the Daily, Unlimited or a trial) and shows on its result. Tearing it up before then gives the whole stake back. A shift eased for your career voids it, stake back.',
    chosen: 'Chosen',
    choose: 'Choose',
    goalPays: (name: string, x: number): string => `${name} · pays ×${x}`,
    sign: (stake: string, goal: string): string => `Sign · ${stake} on ${goal}`,
    contractsIntro: 'Put money on yourself. The stake is paid now; if your next career shift meets the goal it pays back a multiple of it, otherwise it is gone. The goals are the same for everyone: choose what you can do.',
    goal: 'Goal',
    stake: 'Stake',
  },

  /** Social → Ranks (`ui/ranksPanel.ts`). */
  ranks: {
    boards: {
      'shift-level': { label: 'Shift level', empty: 'Clear a shift to be the first one here.' },
      unlimited: { label: 'Unlimited', empty: 'Set an Unlimited record to be the first one here.' },
      daily: { label: 'Daily', empty: 'Clear today’s Daily Shift to be the first one here.' },
      rush: { label: 'Boss Rush', empty: 'Clear a Boss Rush to set the first time.' },
    } as Record<'shift-level' | 'unlimited' | 'daily' | 'rush', { label: string; empty: string }>,
    level: (n: string): string => `Level ${n}`,
    starLabel: (rank: number): string => `Prestige rank ${rank}. How Prestige works`,
    back: '‹ Back to the leaderboard',
    starIntro: (level: number): string => `The star before a level is the Prestige rank: how many times that player started over after Level ${level}.`,
    opensAt: (level: number): string => `Level ${level} opens it`,
    opensSub: 'Progress → Records → Elite. The button asks twice.',
    backTo1: 'Back to Level 1',
    backTo1Sub: 'Money, upgrades, roads, your collection and the Elite track stay. Best times start over.',
    harder: (start: number): string => `Harder traffic: +${start} levels per rank`,
    harderSub: (start: number, max: number, from: number): string => `From ★1 the road plays ${start} levels harder, at most +${max} levels (from ★${from}).`,
    show: 'Only for show',
    showSub: 'Silver, Gold and Iris Star skins at ★1 to ★3, the Star Driver title at ★3 and a plaque in the Hall of Fame. Never a bonus on the road.',
    onBoard: 'On this leaderboard',
    onBoardSub: 'Shift level ranks the Prestige rank first, then the level. Unlimited ignores it.',
    rankLabel: (n: number): string => `Rank ${n}`,
    you: 'You',
    namePlaceholder: 'Your name',
    nameHelp: (max: number): string => `3–${max} letters or numbers. Everyone can see it.`,
    nameShort: 'Use at least 3 characters.',
    cancel: 'Cancel',
    listFriends: 'Ranking among friends',
    list: 'Leaderboard',
    boardsLabel: 'Boards',
    addFriend: 'Add a friend with their code to compare your records.',
    nobody: 'Nobody here yet',
    unavailable: 'Leaderboard unavailable',
    tryAgain: 'Try again',
    scopes: { all: 'Everyone', friends: 'Friends' },
    scopeLabel: 'Show',
    introInvited: (level: number): string => `A friend invited you. Enter a name, reach level ${level} and you both get a chest. Your level and your Unlimited record come from the progress on this device.`,
    intro: 'Enter a name to see where you rank. Your level and your Unlimited record come from the progress on this device and stay up to date by themselves.',
    save: 'Save',
    noSignUp: 'No sign-up: only this name and your records are sent.',
    yourName: 'Your name',
    remove: 'Remove me from the leaderboard',
    removeAgain: 'Tap again to remove your name and scores',
    nameSub: 'Your name on the leaderboard and in multiplayer.',
    change: 'Change',
  },

  /** Social → Friends (`ui/friendsPanel.ts`). */
  friends: {
    ordinal: (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`,
    copied: 'Copied',
    copy: 'Copy',
    copyPrompt: 'Copy this',
    shareLink: 'Share invite link',
    loading: 'Loading your friends…',
    introInvited: (level: number): string => `A friend invited you. Pick a name, reach level ${level} and you both get a chest. You get a friend code of your own too.`,
    intro: 'Friends know you by your name on the leaderboard. Pick one, and you get a friend code to hand out, a ranking among friends and an invite link that earns you chests.',
    save: 'Save',
    tryAgain: 'Try again',
    playTogether: 'Play together',
    inviteFriends: 'Invite friends',
    yourCode: 'Your friend code',
    yourCodeLabel: (code: string): string => `Your friend code: ${code}`,
    codeLabel: "A friend's code",
    typeHere: 'Type the code your friend sees here. They do not have to add you back.',
    add: 'Add',
    codeShort: 'A friend code has 8 letters and numbers, like K7M2-9QXA.',
    adding: 'Adding…',
    onList: (name: string): string => `${name} is on your list.`,
    addFriend: 'Add a friend',
    yourFriends: (n: number): string => `Your friends (${n})`,
    yourFriendsNone: 'Your friends',
    nobody: 'Nobody yet',
    nobodySub: 'Add a friend with their code, or send an invite.',
    removeLabel: (name: string): string => `Remove ${name} from your friends`,
    remove: 'Remove',
    challengeSub: 'Send your last shift and the score to beat.',
    challengeNone: 'Finish a shift, then send it to a friend to beat.',
    send: 'Send',
    challenge: 'Challenge a friend',
    multiplayer: 'Multiplayer',
    multiplayerSub: 'Host a room and send the code, or join your friend’s.',
    openLobby: 'Open lobby',
    noInvites: 'Invites are not available right now. Try again later.',
    reached: (level: number): string => `Reached level ${level} · chest sent`,
    playing: (level: number): string => `Playing · not at level ${level} yet`,
    invitedBy: (name: string): string => `Invited by ${name}`,
    bothGot: 'You both got your chest',
    bothGet: (level: number): string => `Reach level ${level} and you both get a chest`,
    bothNote: (level: number, ordinals: string[]): string =>
      `You both get a chest when a friend reaches level ${level}.${ordinals.length > 0 ? ` Your ${ordinals.join(' and ')} friend each bring a bonus Premium Chest.` : ''}`,
    invites: (done: number, total: number, level: number): string => `Invites (${done} of ${total} at level ${level})`,
    sendLink: 'Send your link to a friend. It shows up here when they join.',
  },

  /** The multiplayer sheet (`ui/versusLobby.ts`). */
  lobby: {
    title: 'Multiplayer',
    errors: {
      noGame: 'No game with this code. Check the digits with your friend.',
      full: 'This game is full or already running.',
      network: 'Could not connect. Check your internet and try again. On mobile data, Wi-Fi often helps.',
      hostLeft: 'The host closed the game.',
      codeBusy: 'Could not get a free code. Try again.',
      outdated: 'The game was just updated. Reload the page to play together.',
    } as Record<'noGame' | 'full' | 'network' | 'hostLeft' | 'codeBusy' | 'outdated', string>,
    bestOf: { 1: 'Single', 3: 'Best of 3', 5: 'Best of 5' } as Record<1 | 3 | 5, string>,
    codeFour: 'A code has four digits.',
    nextRound: 'Next round',
    playAgain: 'Play again',
    player: 'Player',
    yourName: 'Your name',
    nameShort: (current: string): string => `Your leaderboard name needs 3 or more characters, so you stay ${current}.`,
    nameKept: (reason: string, current: string): string => `${reason} You stay ${current}.`,
    fourDigit: 'Four-digit code',
    join: 'Join',
    intro: (max: number): string => `Up to ${max} players, one roundabout, one lane each. Cause a crash while merging, or wait too long, and you are out. Last one standing wins.`,
    host: 'Host a game',
    orJoin: 'or join a friend',
    practise: 'Practise against bots',
    opening: 'Opening a game…',
    joining: (code: string | null): string => `Joining ${code}…`,
    cancel: 'Cancel',
    players: 'Players',
    close: 'Close',
    closeGame: 'Close game',
    leave: 'Leave',
    startWith: (n: number): string => `Start with ${n}`,
    waitingPlayers: 'Waiting for players',
    waitingHost: 'Waiting for the host to start',
    practiceLabel: 'Practice on this device',
    practiceTitle: 'You against bots',
    yourCode: 'Your code: send it or the link',
    game: 'Game',
    codeLabel: (digits: string): string => `Code ${digits}`,
    invite: 'Invite',
    qrLabel: (code: string): string => `QR code to join the game with code ${code}`,
    scan: 'Scan to join',
    openLane: 'Open lane',
    addBotHere: 'Add a bot to play here',
    waitingFriend: 'Waiting for a friend',
    addBotLane: (n: number): string => `Add a bot to lane ${n}`,
    bot: 'Bot',
    removeBot: (name: string): string => `Remove ${name}`,
    you: 'You',
    thisDevice: 'This device',
    hostTag: 'Host',
    joined: 'Joined',
    format: 'Format',
    shareText: (code: string): string => `Join my roundabout: code ${code}`,
    linkCopied: 'Invite link copied',
    copyLink: 'Copy this link',
  },

  /** The multiplayer match on the canvas (`present/versus.ts`). */
  versus: {
    colors: ['mint', 'coral', 'violet', 'gold'],
    reason: { crash: 'Crashed', stalled: 'Stalled', left: 'Left' } as Record<'crash' | 'stalled' | 'left', string>,
    rushHour: 'Rush hour',
    rushHourSub: 'The ring speeds up',
    suddenDeath: 'Sudden death',
    suddenDeathSub: 'Send a car every 4 s',
    youStrike: 'You strike back with a lorry',
    youSend: 'Your lorry is on its way',
    strikes: (name: string): string => `${name} strikes back with a lorry`,
    sends: (name: string): string => `${name} sends a lorry`,
    you: 'You',
    youCaps: 'YOU',
    final: (a: string, b: string): string => `Final: ${a} vs ${b}`,
    round: (n: number, of: number): string => `Round ${n} of ${of}`,
    lastStanding: 'Last one standing',
    reconnecting: 'Reconnecting',
    reconnectingDots: 'Reconnecting…',
    cars: (n: number): string => `${n} ${n === 1 ? 'car' : 'cars'}`,
    lane: (color: string): string => `Your lane: ${color}. Last one standing wins.`,
    watching: (name: string): string => `Watching ${name} · tap to switch`,
    out: 'You are out · tap to follow a lane',
    sendCar: (seconds: string): string => `Send a car · ${seconds} s`,
    draw: 'Draw',
    youWin: 'You win',
    wins: (name: string): string => `${name} wins`,
    seriesTie: 'The series ends in a tie',
    seriesWin: (name: string, you: boolean): string => `${name} ${you ? 'win' : 'wins'} the series`,
    colCars: 'Cars',
    colRisky: 'Risky',
    colTotal: 'Total',
    colPoints: 'Pts',
    mostCars: (name: string): string => `${name}: most cars +1`,
    tightest: (name: string): string => `${name}: tightest merge +1`,
  },

  /** The buttons and labels the DOM shell puts over the game (`ui/shell.ts`). */
  shell: {
    dispatch: 'Emergency dispatch: the next car becomes a police car',
    leave: 'Leave',
    leaveTour: 'Leave tour',
    leaveTrial: 'Leave trial',
    leaveChallenge: 'Leave challenge',
    lobby: 'Lobby',
    revengeLabel: 'Send a lorry into the ring',
    revenge: 'Send a lorry',
    reaction: (r: string): string => `React ${r}`,
    reactions: 'Reactions',
    notEnough: 'Not enough players',
    readyWaiting: 'Ready · waiting',
    stalledTitle: 'The roundabout stopped.',
    stalledBody: 'Something went wrong in the game. Reload to carry on; your progress is safe on this device.',
    reload: 'Reload',
    openElsewhere: 'The roundabout is open elsewhere.',
    openElsewhereBody: 'Roundabout Timing is already running in another tab or window. Two at once would overwrite each other’s progress. Close the other one and this one starts by itself.',
    bigScreenVideo: 'Big Screen video',
  },

  /** Sentences for failed calls to the online service (`net/`); the service's own sentences stay as they are. */
  net: {
    generic: 'Something went wrong. Try again.',
    unreachable: 'The leaderboard cannot be reached right now. Check your connection and try again.',
    signedOut: 'This device is no longer on the leaderboard. Enter a name to be on it again.',
    cloudOff: 'Cloud sync is not available.',
    cloudUnreadable: 'That cloud save could not be read. Update the game and try again.',
    cloudUnreachable: 'The cloud cannot be reached right now.',
    needName: 'Enter a name first.',
  },

  /** The Mafia (Social → Mafia, core/mafia.ts): the Family lends money against a deal struck on a pointer bar. */
  mafia: {
    title: 'The Family',
    speeds: ['Slow', 'Quick', 'Frantic'],
    pointer: (speed: string): string => `Pointer · ${speed}`,
    takeCash: 'Take the cash',
    tagline: 'They respect a driver who put their boss away. They lend, and they collect.',
    /** The badge next to a name on the boards while a loan is late. */
    badge: 'Mafia',
    don: 'The Don',
    pitch: 'Pick a loan, sit down at the table and stop the pointer inside the green zone. The nearer the middle, the kinder the deal. The bigger the loan, the faster the pointer.',
    rules: (rate: number, cap: number, garnish: number): string =>
      `Pay it back by the day on the letter. Late, the debt grows ${Math.round(rate * 100)}% a day (up to +${Math.round(cap * 100)}%), ${Math.round(garnish * 100)}% of every shift's pay goes to the Family, no transporter, criminal or boss pays out, the Casino is shut and your name wears the Mafia badge on the boards. Pay it off and all of that is gone. Each loan repaid in time makes the next one cheaper and the green zone wider.`,
    grade: (g: 'perfect' | 'good' | 'miss'): string => ({ perfect: 'PERFECT', good: 'GOOD', miss: 'MISSED' })[g],
    gradeText: (g: 'perfect' | 'good' | 'miss'): string => ({ perfect: 'Right on the money. The Don smiles.', good: 'A fair handshake.', miss: 'The Don shrugs. The plain offer stands.' })[g],
    set: 'Sit down',
    stop: 'STOP',
    tapToStop: 'Tap to stop the pointer',
    setting: 'The Don is waiting…',
    loanLabel: 'Loan',
    perDay: (days: number): string => `${days} ${days === 1 ? 'day' : 'days'}`,
    offer: (interest: number, days: number): string => `${Math.round(interest * 100)}% interest · ${days} ${days === 1 ? 'day' : 'days'}`,
    zone: (width: number, clean: number): string => `Green zone ${Math.round(width * 100)}% of the bar${clean > 0 ? ` · ${clean} ${clean === 1 ? 'loan' : 'loans'} repaid in time` : ''}`,
    ledger: 'Ledger',
    lent: 'Lent',
    owed: 'You owe',
    due: 'Due',
    late: 'LATE',
    paid: 'Paid so far',
    countdown: (ms: number): string => {
      const mins = Math.max(0, Math.floor(ms / 60_000));
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      if (days > 0) return `${days}d ${hours}h left`;
      return hours > 0 ? `${hours}h ${mins % 60}m left` : `${mins}m left`;
    },
    lateFor: (ms: number): string => {
      const days = Math.floor(ms / 86_400_000);
      return days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} late` : 'Just turned late';
    },
    repayShare: (share: number): string => (share >= 1 ? 'Pay in full' : `Pay ${Math.round(share * 100)}%`),
    noMoney: 'Not enough money to pay that.',
    waiting: 'The Don is watching',
    atStake: 'If you are late',
    inForce: 'In force until you pay',
    consequences: (garnish: number): string[] => ['Casino shut', 'No transporters, criminals or bosses', `${Math.round(garnish * 100)}% of every shift's pay`, 'Mafia badge on the boards'],
    overdue: 'OVERDUE',
    overdueText: 'The Family is collecting. Every shift pays them first.',
    paidStamp: 'PAID',
    assist: 'Steady hand',
    assistText: 'Slower pointer, but no Perfect deal',
    banned: (date: string): string => `The Family is not taking your calls. They will talk again on ${date}.`,
    nextStep: (interest: number, nextInterest: number, zone: number, nextZone: number): string =>
      `Repay the next loan in time: interest ${Math.round(interest * 100)}% → ${Math.round(nextInterest * 100)}%, green zone ${Math.round(zone * 100)}% → ${Math.round(nextZone * 100)}%`,
    shiftsToClear: (n: number): string => `About ${n} ${n === 1 ? 'shift' : 'shifts'} of pay to clear it`,
    onlyOne: 'One loan at a time. Settle this one first.',
    letters: 'Letters',
    letter: (kind: 'taken' | 'half' | 'day' | 'late' | 'later', owed: string, date: string): string =>
      ({
        taken: `Pleasure doing business. ${owed} by ${date}, not a day later. Do not make me come looking for you.`,
        half: 'Half your time is gone. The Family remembers every debt, and every friend who paid early.',
        day: 'One day left. Be a friend and settle up before it gets personal.',
        late: 'Time is up. Your name is on the list. The road pays us first now, and the Casino is closed to you.',
        later: 'Every day the number grows. Pay, and we are friends again.',
      })[kind],
    notices: {
      late: 'THE FAMILY IS WAITING · your loan is late · the Casino is shut',
      grace: 'THE FAMILY GIVES YOU ONE MORE DAY · the loan fell due while you were away',
      writtenOff: 'THE FAMILY WRITES YOU OFF · the debt is gone, their doors stay shut for 14 days',
    },
    garnished: (cut: string, cleared: boolean): string => (cleared ? `THE FAMILY TOOK ${money(cut)} · debt paid, you are free` : `THE FAMILY TOOK ${money(cut)} of the pay`),
    casinoShut: 'The Casino is closed while the Family waits for its money.',
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
        case 'diamond':
          return 'For sale · never a Common';
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
      if (item.source.kind === 'tour') return `A stop of the ${S.tours.name(item.source.tour as TourId)} tour. It comes back every year.`;
      if (item.source.kind === 'auction') return 'Only ever a lot at the Auction House (Social → Club). A new lot every few days.';
      if (item.source.kind === 'fund') return 'A thank-you from the City Fund, which the Game fund has replaced. It is not given out any more.';
      if (item.source.kind === 'bugReport')
        return item.source.reports === 1
          ? 'Report a bug on timing.love with your friend code. Only bug hunters get it.'
          : `Report ${item.source.reports} bugs on timing.love with your friend code, one a day. Only bug hunters get it.`;
      if (item.source.kind === 'find')
        return `A rare find: ${S.shop.findOdds(item.source.chance)} ${S.shop.chest(item.source.chest)}. The only honour that is luck.`;
      return 'Not found yet: it comes out of chests.';
    },
    tapToClose: 'Tap to close',
    tapToBreak: 'Tap fast!',
    tapOdds: (odds: string): string => `Tap fast to break the chest open: every tap within half a second of the last one counts, and at full power the odds are ${odds}. Slower taps land in between.`,
    watchAdShort: 'Watch ad',
    adReward: 'Ad watched · Standard chest added',
    noAdsLeft: 'No more ad chests today. Back tomorrow.',
    adPlaceholder: 'Ad',
    adCountdown: (reward: 'chest' | 'upgrade' | 'boost', s: number): string => `${{ chest: 'Your chest', upgrade: 'Your free step', boost: 'Your boost' }[reward]} in ${s} s`,
    watchAd: (left: number): string => `Watch ad · ${left} left`,
    skinsOn: (n: number, max: number): string => `${n} of ${max} car skins on · they mix on the road`,
    skinsFull: (max: number): string => `${max} car skins are on. Take one off first.`,
    section: (i: number): string => ['Chests', 'Collection', 'Casino'][i],
    earnedHeading: 'Earned, not sold',
    newBadge: 'NEW',
    shelf: (i: number): string => ['Cars', 'Maps', 'Earned', 'Pass'][i],
    /** The headings on the Cars shelf (the chest skins by rarity, the vehicles, the season skins) and on the Honours shelf (the cars by rarity, the vehicles, the maps). */
    group: (g: Rarity | 'vehicles' | 'seasons' | 'maps', honours = false): string => {
      const name = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', vehicles: 'Vehicles', seasons: 'Seasons', maps: 'Maps' }[g];
      return honours && g !== 'vehicles' && g !== 'seasons' && g !== 'maps' ? `${name} cars` : name;
    },
    waiting: (n: number): string => (n === 1 ? '1 waiting' : `${n} waiting`),
    buy: (price: string): string => `Buy · ${price}`,
    pity: (n: number): string => `Epic or better within ${n} chests. Duplicates pay out ${MONEY_MARK}.`,
    pityLegendary: (n: number): string => `A Legendary within ${n} chests.`,
    duplicate: (m: string): string => `Duplicate · +${money(m)}`,
    ownedHint(item: Cosmetic): string {
      if (item.kind === 'carSkin') return 'Paints the cars on the road. Mix up to eight. Only looks, never a bonus.';
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
        case 'diamond':
          return 'Diamond Chest';
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
        pixel: 'Pixel Parade',
        pixelBug: 'Pixel Bug',
        arcadeGhost: 'Arcade Ghost',
        rubberDuck: 'Rubber Duck',
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
        jackOLantern: "Jack-o'-Lantern",
        witchingHour: 'Witching Hour',
        wraith: 'Wraith',
        candyCane: 'Candy Cane',
        snowGlobe: 'Snow Globe',
        sleigh: 'Midnight Sleigh',
        sterling: 'Sterling',
        magnate: 'Magnate',
        baron: 'Baron',
        bullion: 'Bullion',
        sovereign: 'Sovereign',
        provenance: 'Provenance',
        fountain: 'Fountain',
        lighthouse: 'Lighthouse',
        skybridge: 'Sky Bridge',
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
        savanna: 'Savanna',
        rainforest: 'Rainforest',
        alps: 'Alps',
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
        goldbug: 'Goldbug',
        scarab: 'Scarab',
        bluebottle: 'Bluebottle',
        orchid: 'Orchid Beetle',
        firefly: 'Firefly',
        monolith: 'Monolith',
        tempest: 'Tempest',
        solstice: 'Solstice',
        abyssal: 'Abyssal',
        regalia: 'Regalia',
        apotheosis: 'Apotheosis',
        chrono: 'Chrono',
        biolume: 'Biolume',
        dragon: 'Dragonfire',
        glowtide: 'Glowtide',
        moonmirror: 'Moonmirror',
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
    lost: 'Big Screen: your link did not load. The city is back for now.',
  },

  daily: {
    title: 'DAILY SHIFT',
    /** Its row under Progress → Goals. */
    name: 'Daily Shift',
    ready: 'Ready',
    perfectRun: 'PERFECT RUN',
    welcomeBack: (m: string): string => `Welcome back · your toll booths earned +${money(m)}`,
    /** The first visit after a streak ran out (Leo, 09.10.2026): said plainly, with the way to the next one. */
    streakEnded: (days: number): string => `Your ${days}-day streak ended · a new one starts with today's Daily Shift`,
    done: 'Done',
    readyHint: 'Your first shift of the day. One try, the same shift for everyone.',
    doneHint: (streak: number): string => (streak > 1 ? `Done · ${streak} days in a row · back tomorrow` : 'Done · back tomorrow'),
    splashLine: (e: CityEvent): string => `Today's city: ${S.cityEvent(e)} · one try`,
    streakLine: (streak: number): string => (streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} in a row · keep it going` : 'Play it every day for a streak'),
    nextMilestone: (left: number, item: string): string => `${left} more ${left === 1 ? 'day' : 'days'} for ${S.shop.item(item)}`,
    /** The second line of its row under Progress → Today: what it is, or the streak and what it brings next. */
    rowLine(streak: number, open: boolean, next: { left: number; item: string } | null, freezes = 0, toFreeze: number | null = null): string {
      if (streak <= 0) return open ? S.daily.readyHint : 'Back tomorrow · play it every day for a streak';
      const days = `${streak} ${streak === 1 ? 'day' : 'days'} in a row`;
      // Whichever reward is nearer: the next skin or the next Freeze.
      const ahead = next && (toFreeze === null || next.left <= toFreeze) ? S.daily.nextMilestone(next.left, next.item) : toFreeze !== null ? S.daily.freezeLine(toFreeze) : null;
      const parts = [days, freezes > 0 ? S.daily.freezes(freezes) : null, ahead, open ? null : 'back tomorrow'];
      return parts.filter((p): p is string => p !== null).join(' · ');
    },
    freezeLine: (days: number): string => `${days} more ${days === 1 ? 'day' : 'days'} for a Streak Freeze`,
    freezes: (n: number): string => `${n} Streak ${n === 1 ? 'Freeze' : 'Freezes'}`,
    /** The streak's sheet (tap its card under Progress → Today): what the streak brings, and that Heat lives and dies with it. */
    sheet: {
      title: 'Daily streak',
      body: (bonusDays: number, bonusPay: number, heatDays: number): string[] => [
        'Play the Daily Shift every day to keep the streak going. A missed day breaks it, unless a Streak Freeze covers it.',
        `From ${bonusDays} days on, every career shift pays +${Math.round(bonusPay * 100)} % while the streak lives.`,
        `Heat: every ${heatDays} days of streak open one Heat step, harder traffic for more pay and Elite XP. Lose the streak and the Heat is gone with it. Heat titles you earned stay.`,
      ],
      heatOpen: 'Heat open',
      heatValue: (open: number, max: number): string => `${open} of ${max}`,
      nextHeat: 'Next Heat in',
      allHeat: 'All open',
    },
    freezeUsed: (n: number): string => `STREAK FROZEN · ${n === 1 ? 'a missed day was' : `${n} missed days were`} covered`,
    /** What a day of the streak brought, in one line: a skin, a Streak Freeze, a Scratch Card. */
    streakReward: (days: number, got: string[]): string => `${days} DAYS IN A ROW · ${got.join(' · ')}`,
    gotItem: (item: string): string => `${S.shop.item(item)} unlocked`,
    gotFreeze: 'a Streak Freeze',
    gotCard: 'a free Scratch Card',
    /** Tomorrow's gift (`Careers.promiseGift`): counted down on the Game tab. */
    giftIn: (hours: number): string => (hours >= 1 ? `Free chest tomorrow · in ${Math.ceil(hours)} h` : `Free chest tomorrow · in ${Math.max(1, Math.ceil(hours * 60))} min`),
    perfectRunFirst: (pay: number): string => `PERFECT RUN · no crash · +${pay} % pay`,
    /** The pill over the Daily Shift: the streak, its bonus, and when it breaks. */
    streakPill(streak: number, bonus: number | null, endsIn: number | null, freezes = 0): string {
      if (streak <= 0) return S.daily.streakLine(0);
      const days = `${streak} ${streak === 1 ? 'day' : 'days'} in a row`;
      if (endsIn !== null) return `${days} · ends in ${endsIn < 1 ? 'under 1 h' : `${Math.floor(endsIn)} h`}`;
      const freeze = freezes > 0 ? ` · ${S.daily.freezes(freezes)}` : '';
      return bonus !== null ? `${days} · +${Math.round(bonus * 100)} % pay${freeze || ' on every shift'}` : `${days}${freeze || ' · keep it going'}`;
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
          return 'A Perfect Run: no crash';
        case 'oneTakedown':
          return 'Take down a criminal';
        case 'cleanMerges':
          return '8 Clean Merges in one shift';
        case 'sixTightFits':
          return '6 Tight Fits in one shift';
        case 'fivePerfects':
          return '5 Perfect Inputs in one shift';
        case 'chainFive':
          return 'A Perfect Chain of 5';
        case 'hugeCombo':
          return 'A combo of 25';
        case 'twoNearMisses':
          return '2 Near Misses in one shift';
      }
    },
    challengeDone: (c: Challenge, reward: string): string => `CHALLENGE · ${S.daily.challenge(c)} · +${money(reward)}`,
  },

  albums: {
    name: (a: Album): string =>
      ({ maps: 'Maps', commons: 'Commons', rares: 'Rares', epics: 'Epics', legends: 'Legends', seasons: 'Seasons', loyalty: 'Loyalty', honours: 'Honours', pass: 'Season Pass', tours: 'Tours' })[a],
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
      return `MASTERY COMPLETE · ${names.join(', ')}`;
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
    /** The headings of the Upgrades page (Leo, 10.10.2026): what an upgrade is for. */
    group: (g: 0 | 1 | 2): string => ['POLICE', 'MONEY', 'DRIVING'][g],
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
        shield: 'Shield',
        tightFitTip: 'Tight Fit Tip',
        dashcam: 'Dashcam',
        chainSaver: 'Chain Saver',
        winterTyres: 'Winter Tyres',
        fogLamps: 'Fog Lamps',
      }[u];
    },
    explanation(u: Upgrade): string {
      return {
        morePatrols: 'More police cars wait in your queue, so one is ready when a criminal shows up.',
        longerPursuit: 'Criminals take longer to get away, which leaves you more time to catch them.',
        quietStreets: 'Some shifts come with no criminal at all.',
        interceptor: 'A police car right behind a criminal runs it down faster.',
        dispatchRadio: 'Every shift allows 3 dispatches of a police car to the front of the queue; each step adds one more and makes a call cost less of your combo.',
        backup: 'Your shift survives one police car crash more. The ring flashes blue and red with little plus signs, and each blue plus in the top bar is one crash still forgiven.',
        cashRoute: 'Money transporters show up sooner and more often.',
        overtime: 'Every shift you finish pays more.',
        freight: 'More lorries on the road: denser traffic, but every shift pays more and every toll is worth more.',
        quickRecovery: 'Drivers pull away harder, so after a crash the traffic is back up to speed sooner. A busier road pays a little more per shift.',
        doubleRun: 'Sometimes a second money transporter follows right after the first.',
        insurance: 'Pays part of what a crash costs you.',
        robberyInsurance: 'Pays part of what an escaped criminal costs you.',
        shield: 'Your own car may crash once more per shift. The ring flashes green with little plus signs, the combo breaks and the shift goes on; each green plus in the top bar is one crash still forgiven. Not in Unlimited.',
        tightFitTip: 'Every Tight Fit pays a tip on the spot, a share of the shift pay. Not in Unlimited.',
        dashcam: 'The camera sees how close you cut it: every Near Miss pays a tip on the spot, a share of the shift pay. Not in Unlimited.',
        chainSaver: 'While you are in the flow, a plain merge a shift leaves your chain alone instead of ending it. Not in Unlimited.',
        winterTyres: 'Rain, snow and hail take less grip and braking from the road: crashes slide shorter and traffic stops better.',
        fogLamps: 'Drivers lose less time to bad weather and see hazards sooner, and fog and dust lie thinner on the screen.',
      }[u];
    },
    total(u: Upgrade, steps: number, c: Config): string {
      const t = steps;
      switch (u) {
        case 'morePatrols':
          return `+${percent(t * c.patrolsPerStep)} police cars`;
        case 'longerPursuit':
          return `+${t * c.pursuitPerStep} s pursuit`;
        case 'quietStreets':
          return `${percent(t * c.quietStreetsPerStep)} fewer criminal shifts`;
        case 'interceptor':
          return `+${percent(t * c.interceptorPerStep)} chase speed`;
        case 'dispatchRadio':
          return `+${t * c.dispatchLimitPerStep} dispatches · +${percent(t * c.dispatchRadioPerStep)} combo kept`;
        case 'backup':
          return `+${steps * c.backupPerStep} police crashes`;
        case 'cashRoute':
          return `${+(t * c.cashRoutePerStep).toFixed(1)} s sooner`;
        case 'overtime':
          return `+${percent(t * c.overtimePerStep)} pay`;
        case 'freight':
          return `+${percent(t * c.freightPerStep)} lorries · +${percent(t * c.freightPayPerStep)} pay`;
        case 'quickRecovery':
          return `+${percent(t * c.recoveryPerStep)} accel. · +${percent(t * c.recoveryPayPerStep)} pay`;
        case 'doubleRun':
          return `${percent(t * c.doubleRunPerStep)} double runs`;
        case 'insurance':
        case 'robberyInsurance':
          return t * c.insurancePerStep >= 1 ? 'FULL COVERAGE' : `${percent(t * c.insurancePerStep)} covered`;
        case 'shield':
          return t === 1 ? '1 crash forgiven' : `${t} crashes forgiven`;
        case 'tightFitTip':
          return `${percent(t * c.tightFitTipPerStep)} of the shift pay per Tight Fit`;
        case 'dashcam':
          return `${percent(t * c.nearMissTipPerStep)} of the shift pay per Near Miss`;
        case 'chainSaver':
          return t === 1 ? '1 chain saved a shift' : `${t} chains saved a shift`;
        case 'winterTyres':
          return `${percent(t * c.winterTyresPerStep)} of the lost grip back`;
        case 'fogLamps':
          return `${percent(t * c.fogLampsPerStep)} less lost reaction time`;
      }
    },
    stepEffect(u: Upgrade, steps: number, max: number, c: Config): string {
      const now = S.upgrades.total(u, steps, c);
      if (steps >= max) return `Now ${now}`;
      return `Now ${now} · next step ${S.upgrades.total(u, steps + 1, c)}`;
    },
  },

  heat: {
    row: (heat: number): string => (heat > 0 ? `Heat ${heat}` : 'Heat'),
    /** The Game tab's pill: tap for the next step. */
    button: (heat: number, max: number): string => (heat === 0 ? 'Heat off' : max > 1 ? `Heat ${heat}` : 'Heat on'),
    line: (heat: number, max: number): string => (heat > 0 ? `Harder traffic · +${Math.round(heat * baseConfig.heatPay * 100)} % pay · +${heat * baseConfig.eliteXpHeat} Elite XP a shift` : max > 0 ? 'Off · harder traffic for more pay and Elite XP' : `Keep a ${baseConfig.heatStreakDays}-day Daily streak to open Heat`),
    link: (heat: number, max: number): string => `${max > 1 ? `${heat}/${max}` : heat > 0 ? 'On' : 'Off'} · change ›`,
    cleared: (heat: number): string => `HEAT ${heat} CLEARED`,
    /** The waiting screen's pill: Heat and Tailwind together; null when neither is on. */
    pill: (heat: number, tailwind: number | null): string | null =>
      [tailwind ? `TAILWIND +${Math.round(tailwind * 100)} %` : null, heat > 0 ? `HEAT ${heat} · +${Math.round(heat * baseConfig.heatPay * 100)} % pay` : null].filter(Boolean).join(' · ') || null,
    rule: (level: number): string => `Clear a shift on Heat ${level}`,
  },

  goals: {
    /** So close: the next career shift pays more (once a day). */
    tierMiss: (m: { short: number; tier: TierId }): string => `${m.short} ${m.short === 1 ? 'car' : 'cars'} short of ${S.modes.tier(m.tier)}`,
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
    /** A shift that can be sent: the picture carries its challenge link. */
    sendChallenge: 'Send as challenge',
    copyChallenge: 'Copy with link',
    challengeCopied: 'Picture and link copied',
    download: 'Download',
    saved: 'Saved',
    close: 'Close',
    score: 'SCORE',
    flames: 'FLAMES',
    cars: 'CARS',
    newBest: 'NEW BEST',
    hook: (score: string): string => `Can you beat ${score}?`,
    hookFlames: (flames: string): string => `Can you top ${flames} flames?`,
    hookChill: 'Come for a drive.',
    combo: (n: number): string => `×${n} combo`,
    tightFits: (n: number): string => (n === 1 ? '1 tight fit' : `${n} tight fits`),
    busted: (n: number): string => `${n} busted`,
    wrecks: (n: number): string => (n === 1 ? '1 wreck' : `${n} wrecks`),
    chain: (n: number): string => `chain of ${n}`,
    city: 'The City',
  },

  result: {
    gameOver: 'GAME OVER',
    /** The top card's big word while a lost shift takes its breather, and why it was lost (under the skull). */
    fail: 'FAIL',
    why: {
      crash: 'You crashed. Wait for a gap.',
      crashes: 'Too many crashes. Wait for a gap.',
      police: 'Too many police cars crashed.',
      behind: 'A car was right behind you.',
      ahead: 'You hit the car in front.',
      escaped: 'The criminal got away.',
      boss: 'The boss got away.',
      zeroTolerance: 'Zero Tolerance: a crash or cut-off ends it.',
      rule: 'A rule of the shift was broken.',
    },
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
    dispatch: 'DISPATCH',
    danger: 'DANGER',
    boom: 'BOOM!',
    covered: 'COVERED',
    combo: (n: number): string => `COMBO ${n}`,
    cars: (n: number): string => (n === 1 ? '1 car' : `${n} cars`),
    wanted: (seconds: number): string => `WANTED ${Math.ceil(Math.max(0, seconds))}`,
    rushFactor: (value: number): string => `RUSH HOUR ${multiplier(value)}`,
    critical: (points: string): string => `CRITICAL ${points}`,
    transporterTimer: (seconds: number): string => `${Math.ceil(Math.max(0, seconds))} s`,
    jackpotPaid: (amount: string): string => `JACKPOT ${amount}`,
    shave: (points: string): string => `CLOSE SHAVE ${points}`,
    chainHeld: 'CHAIN HELD',
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
        case 'wedding':
          return 'WEDDING';
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
    /** The rest of a result's news, counted (`GameSession.budget`). */
    more: (n: number): string => `+${n} more · see Progress`,
    notEnoughMoney: (price: string): string => `Not enough ${MONEY_MARK} · ${money(price)} needed`,
    detourIdle: 'Built, but it does nothing here: no exit between it and your arm',
  },
};

export type Strings = typeof S;

/** What a language file hands over: its words for `S` and for the Museum's texts. A part it leaves out stays English. */
export interface Translation {
  S: Words<Strings>;
  museum: Words<typeof MUSEUM_TEXT>;
}

const TRANSLATIONS: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: (s: Strings) => Translation }>> = {
  de: () => import('./lang/de'),
  es: () => import('./lang/es'),
  fr: () => import('./lang/fr'),
  it: () => import('./lang/it'),
};

// Top-level await: no module that reads `S` runs before the chosen language is laid over it.
const language = currentLanguage();
if (language !== 'en') {
  const words = (await TRANSLATIONS[language]()).default(S);
  overlay(S, words.S);
  overlay(MUSEUM_TEXT, words.museum);
}
