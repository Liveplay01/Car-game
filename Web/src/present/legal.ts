/**
 * The legal pages: Privacy Policy and Imprint (Impressum). One source for both places they
 * appear: in the game (Settings → Legal) and as plain pages beside it (`/privacy.html`,
 * `/imprint.html`, written by vite.config.ts), for forms that ask for a link (CrazyGames,
 * AdSense). No DOM here: the build reads this file too.
 *
 * Whoever runs the game fills in OPERATOR and HOSTING; the build warns while a field is empty.
 * Anything that changes what the game sends where (a new service, ads, analytics) changes
 * the Privacy Policy with it, and `LEGAL_UPDATED`.
 */

/** The person responsible (§ 5 DDG). A postal address where letters reach them, not a P.O. box. */
export const OPERATOR = {
  name: 'Leonard Suhr',
  street: 'Roonstraße 44',
  city: '42115 Wuppertal',
  country: 'Germany',
  email: 'support@timing.love',
};

/** Who runs the server the game is delivered from (Coolify's machine), and where. */
export const HOSTING = {
  provider: 'us (self-hosted)',
  location: 'Germany',
};

export const LEGAL_UPDATED = '10 October 2026';

export const GAME_NAME = 'Roundabout Timing';

export type LegalId = 'privacy' | 'imprint';

export interface LegalSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  /** Paragraphs after the list. */
  after?: string[];
  /** A link at the end of the section, as [label, address]. */
  link?: [string, string];
}

export interface LegalDoc {
  id: LegalId;
  title: string;
  /** The row in Settings. */
  sub: string;
  sections: LegalSection[];
}

/** The fields still empty, for the build's warning. */
export function missingLegal(): string[] {
  const missing: string[] = [];
  for (const [k, v] of Object.entries(OPERATOR)) if (!v.trim()) missing.push(`OPERATOR.${k}`);
  for (const [k, v] of Object.entries(HOSTING)) if (!v.trim()) missing.push(`HOSTING.${k}`);
  return missing;
}

const or = (value: string, what: string): string => value.trim() || `[${what}]`;

const address = (): string[] => [
  or(OPERATOR.name, 'Name'),
  or(OPERATOR.street, 'Street and number'),
  or(OPERATOR.city, 'Postcode and city'),
  OPERATOR.country,
];

const email = (): string => or(OPERATOR.email, 'Email address');

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    sub: 'What the game stores and sends.',
    sections: [
      {
        paragraphs: [
          `${GAME_NAME} has no sign-up. Your progress stays on your device. This page explains the few things that do leave it, the anonymous visit statistics, and the ads Google may show on this site.`,
          `Last updated: ${LEGAL_UPDATED}.`,
        ],
      },
      {
        heading: 'Who is responsible',
        paragraphs: [`${address().join(', ')}. Email: ${email()}.`],
      },
      {
        heading: 'Loading the game',
        paragraphs: [
          `When you open the game, your browser asks our server for its files. Like every web server, it receives your IP address, the time, the file requested and your browser's identification (user agent). We use this only to deliver the game and to keep the server secure; server logs are deleted after a short time. The server is operated by ${or(HOSTING.provider, 'Hosting provider')} in ${or(HOSTING.location, 'Country')}.`,
          'Legal basis: Art. 6(1)(f) GDPR (our legitimate interest in delivering the game safely).',
        ],
      },
      {
        heading: 'Visit statistics (Umami)',
        paragraphs: [
          'On game.gustaff.dev (not on CrazyGames or itch.io) the game counts visits with Umami, which we run ourselves at analytics.kestrel.nrw. It sets no cookie and stores nothing on your device. It records the page, the referring site, your browser, system and screen size and your country, and a few game steps: the tutorial done, each shift played with its mode, level and whether it was won, and, on each start, whether you have played before and roughly how many days it has been since your last visit and since your first one (in steps such as 1, 2-3 or 4-7 days, worked out in your browser from your progress; no date is sent), whether the game was opened in a browser tab, as an installed app or in the Play app, the game version, and whether you answered the notification offer or installed the game. There is no ID, no name and no progress in it, and your IP address is not stored; a visit cannot be tied to you or to another visit.',
          'We use it to see where new players give up and to balance the game. Legal basis: Art. 6(1)(f) GDPR (our legitimate interest in improving the game). Nothing is sent when your browser says Do Not Track.',
        ],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          "The game keeps your progress, your settings and, if you play multiplayer, the name you chose in your browser's local storage. It also stores its own files so it runs offline. None of this is sent to us. Storing it is what makes the game work as you asked (§ 25(2) no. 2 TDDDG).",
          'To delete it: Settings → Account → Delete account, or clear the site data in your browser.',
        ],
      },
      {
        heading: 'Multiplayer',
        paragraphs: [
          'Only when you open a multiplayer room, the game connects to other players directly (WebRTC). To find each other it uses:',
        ],
        list: [
          'PeerJS Server (0.peerjs.com), run by the PeerJS open-source project, which receives your IP address and a random room ID to introduce the players.',
          'STUN servers of Google LLC (stun.l.google.com), which receive your IP address to find a route between the players. Google may process it in the USA; Google is certified under the EU-US Data Privacy Framework.',
          'The other players in the room, whose devices technically see your IP address, and the name you chose.',
          'Only if your connection needs a relay (many phone networks and school Wi-Fi do): a relay of Cloudflare, Inc. (USA, certified under the EU-US Data Privacy Framework) that passes the match data on and sees your IP address while it does. Before a room opens, the game asks our server for a login that stops working after a day; the server receives your IP address with that request, as with any request, and does not store it.',
        ],
        after: ['Legal basis: Art. 6(1)(b) GDPR (connecting you to the players you chose to play with). Without multiplayer, none of this happens.'],
        link: ['PeerJS', 'https://peerjs.com'],
      },
      {
        heading: 'Leaderboard',
        paragraphs: [
          'Only if you enter a name for the leaderboard (Social → Ranks), the game sends it to our leaderboard server, which runs on the same machine as the game. From then on it sends your level (with your Prestige rank) and your Unlimited record whenever they improve.',
          'The server stores the name, a random ID, a secret key that proves the name is yours (only its hash is kept), your best scores and when you reached them. The name and the scores are public: everyone can see them on the leaderboard. Your IP address reaches the server with every request, as with any website; it is used only in memory to stop abuse and is not stored. Offensive names are removed.',
          'Legal basis: Art. 6(1)(b) GDPR (the leaderboard you chose to join). To remove your name and all your scores at once: Social → Ranks → Remove me from the leaderboard.',
        ],
      },
      {
        heading: 'Friends',
        paragraphs: [
          'If you open Friends under Social, the server makes a friend code for you (like K7M2-9QXA). Whoever types your code adds you to their friends list and then sees your name and your best scores on their friends board, which they could already see on the public leaderboard. You can see and remove the people on your own list; the list is stored with your leaderboard entry.',
          'Your friend code is also your invite. A friend who opens your invite link (like …/i/K7M29QXA, or a challenge link you shared while you have a name on the leaderboard) arrives with your code. Once they have a name on the leaderboard, their game tells our server that they came through you, and the server keeps one line: who invited whom, and whether they reached level 5. When they do, you both get a chest in the game, which the game picks up the next time you open it. You see the names of the friends you invited and how far they are; they see who invited them. Opening the link without a name sends nothing to us.',
          'Legal basis: Art. 6(1)(b) GDPR (the friends board and invites you chose to use). Removing your name from the leaderboard deletes your friend code, your list and your invites as well.',
        ],
      },
      {
        heading: 'City Fund',
        paragraphs: [
          'If you have a name on the leaderboard and give money to the City Fund (Social → Club), the server stores the amount, the project it went to and the time next to your player account. The fund shows the totals of every project and a list of the most generous names, which are the names you chose for the leaderboard. The money is play money inside the game; nothing real is paid.',
          'Legal basis: Art. 6(1)(b) GDPR (the fund you chose to give to). Removing your name from the leaderboard or deleting your account takes your name off the list; your gifts then stay in the totals without a name, so a project that was built stays built.',
        ],
      },
      {
        heading: 'Cloud sync',
        paragraphs: [
          'Only if you turn on Cloud sync (Settings → Account → Cloud sync), the game sends a copy of your progress (the same data as the progress file you can export: level, money, upgrades, collection, records, settings) to our server. If you also have a leaderboard name, the copy carries that account (its ID, name and secret key, as they are, not hashed) so the name and your scores come along when you enter the code on another device. No name, e-mail address or password is needed for the copy itself: the server makes a random sync code, and the code is the only key to the copy. Only its hash is stored, together with the copy and the times it was made, last changed and last opened. The copy is not public. A copy that has not been opened or changed for 200 days is deleted automatically. Your IP address reaches the server with every request, as with any website; it is used only in memory to stop abuse and is not stored.',
          'Anyone who knows your sync code can load or replace your copy, so keep it private. A picture you chose for Big Screen is not part of it. If you have a name on the leaderboard, the copy also holds that name and the secret key that proves it is yours, so that on a new device you are the same player again, with the same name, scores and friends. Anyone with the sync code could therefore also act as that player.',
          'Legal basis: Art. 6(1)(b) GDPR (the backup you chose to make). To delete the copy for good: Settings → Account → Cloud sync → Delete the cloud copy. Stopping on one device leaves the copy for your other devices.',
        ],
      },
      {
        heading: 'Notifications',
        paragraphs: [
          "Only if you turn on notifications (Settings → Account → Notifications, or when the game offers them) and your browser allows them, your browser creates a push address for this device at its push service (Google for Chrome and the Google Play app, Apple for Safari, Mozilla for Firefox, Microsoft for Edge) and the game sends it to our server, with two keys that let only your browser read the messages. With it the server keeps your device's time zone (so nothing arrives at night), the page the game opens at, when the game was last opened, when the last notification went out, and the reminders the game asked for: your Daily streak (with its length), tomorrow's free chest and the next Season Pass. If you have a name on the leaderboard, the push address is linked to it, so the server can tell you when another player passes you in the top 20 or a chest from an invite is waiting.",
          "Each notification is encrypted on our server and handed to your browser's push service, which delivers it; the push service sees when a message goes to which address, not what it says. At most one a day besides the streak reminder, only between 9:00 and 21:00 your time. If you stay away, the server sends at most four reminders (after 3, 7, 14 and 30 days) and then stays quiet. Your IP address is handled as described under Cloud sync.",
          'Legal basis: Art. 6(1)(a) GDPR (your consent). Turn the switch off, or take the permission back in your browser, and the server forgets the push address with everything above. A device not opened for 120 days is forgotten automatically, and Settings → Account → Delete account removes it too.',
        ],
      },
      {
        heading: 'Big Screen',
        paragraphs: [
          'Big Screen (a map you earn at Prestige ★5) shows your own picture or video behind the roundabout. A picture you upload is made smaller and kept in your browser only; it is never sent to us or anyone else.',
          "Only if you paste a link, your browser loads it straight from that site, which receives your IP address and your browser's identification like on any visit. A YouTube link plays through YouTube's privacy-enhanced mode (youtube-nocookie.com), run by Google Ireland Limited; Google may process data in the USA and is certified under the EU-US Data Privacy Framework. The link itself stays on your device.",
          'Legal basis: Art. 6(1)(b) GDPR (showing what you chose to show). To stop it: Remove in the Big Screen sheet, or take Big Screen off.',
        ],
        link: ['Google Privacy Policy', 'https://policies.google.com/privacy'],
      },
      {
        heading: 'Sharing',
        paragraphs: [
          "Sharing a result, a photo, a challenge or a room link uses your device's own share sheet or download.",
          'When you tap Challenge a friend, the game asks our server for a short link (like …/c/K7M29QXA) that shows a picture with your score in a chat. For that it sends the challenge: the shift (level, mode, the random seed of the traffic, your upgrades, roads and car types) and the score to beat. If you have a name on the leaderboard, the link is tied to it and the picture shows that name; removing your name from the leaderboard takes it off your links. The server keeps a short link for a year, then deletes it. Anyone with the link can open it. Your IP address reaches the server with the request, as with any website; it is used only in memory to stop abuse and is not stored. Without the server the game shares the long link, which sends nothing to us.',
          'Legal basis: Art. 6(1)(b) GDPR (the link you asked for).',
        ],
      },
      {
        heading: 'Bug reports and ideas',
        paragraphs: [
          'Settings → About → Build with us opens two forms on our website: one for bugs, one for feature ideas. What you type there goes to our server and is read by the developer. A bug report may carry your friend code; then it is tied to your leaderboard name, and you can receive a reward in the game (the Ladybug skin, sometimes a chest), which the game picks up the next time you open it.',
          'To allow one report and one idea a day, the server keeps a hash of your IP address with each one for up to two days, then deletes it. Please do not type personal data into the forms. Deleting your account (or your name on the leaderboard) unlinks your reports from you; the text itself stays with us so the bug can be fixed.',
          'Legal basis: Art. 6(1)(f) GDPR (our legitimate interest in fixing the game and hearing your ideas) and, for the reward, Art. 6(1)(b) GDPR.',
        ],
      },
      {
        heading: 'Ads (Google AdSense)',
        paragraphs: [
          'On game.gustaff.dev (not on CrazyGames) Google AdSense may show ads. For that, your browser loads scripts from Google and sends it your IP address, your browser and device data and the page you are on. Google, and the advertisers it works with, may set or read cookies and similar identifiers on your device to choose and measure ads, to prevent fraud and, with your consent, to personalise ads. Google may process data in the USA; Google is certified under the EU-US Data Privacy Framework.',
          'The ads are voluntary. The game shows an ad only when you tap "Watch ad" for a reward you can see before you tap: a free chest, a free upgrade step or a boost on the Skin Upgrade. Nothing plays by itself, and nothing in the game depends on watching one. You get the reward only when the ad was watched to the end. Not on CrazyGames.',
          'If you are in the European Economic Area or the United Kingdom, a consent message from Google asks you first. Without your consent, only the ads that need no personal data are possible, or none at all. Legal basis: your consent, Art. 6(1)(a) GDPR and § 25(1) TDDDG. You can change your choice at any time with the privacy settings link of the consent message, or by clearing the site data in your browser.',
        ],
        after: ['Google is responsible for its own use of the data. How it uses data from sites that use its services, and how to turn personalised ads off:'],
        link: ['How Google uses data from partner sites', 'https://policies.google.com/technologies/partner-sites'],
      },
      {
        heading: 'The Google Play app',
        paragraphs: [
          'The app from Google Play opens this same game at game.gustaff.dev in Chrome (or another browser on your phone), full screen. Everything in this policy applies to it the same way, including the ads; the app itself collects nothing more. Google (Google Ireland Limited) delivers the app and its updates; its privacy policy applies to Google Play.',
        ],
        link: ['Google Privacy Policy', 'https://policies.google.com/privacy'],
      },
      {
        heading: 'Deleting your data',
        paragraphs: [
          "You have no account with us: your progress lives on your device. Deleting the game's data in your browser, or uninstalling the app and clearing Chrome's data for game.gustaff.dev, removes it from your device.",
          'What our server keeps exists only if you chose it, and you can delete it yourself in the game at any time: everything at once with Settings → Account → Delete account; your notifications with Settings → Notifications; or your name, scores, friend code and friends list with Social → Ranks → Remove me from the leaderboard; your cloud copy with Settings → Account → Cloud sync → Delete the cloud copy. Both are gone for good at once. If you can no longer open the game, write to the email address above with your name on the leaderboard or your sync code, and we delete it within 30 days.',
        ],
      },
      {
        heading: 'Playing on CrazyGames',
        paragraphs: [
          'If you play the game on CrazyGames, CrazyGames (Maxflow BV, Leuven, Belgium) runs the page around it, may show ads, and keeps your progress: in your CrazyGames account if you are logged in, otherwise in your browser. Their privacy policy applies to that.',
        ],
        link: ['CrazyGames Privacy Policy', 'https://www.crazygames.com/privacy-policy'],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You have the right to access, rectification, erasure, restriction of processing, data portability and to object (Art. 15–21 GDPR). Write to the email address above. You may also complain to a data protection supervisory authority, for example the one where you live.',
        ],
      },
    ],
  },
  {
    id: 'imprint',
    title: 'Imprint',
    sub: 'Impressum: who runs the game.',
    sections: [
      {
        heading: 'Angaben gemäß § 5 DDG',
        paragraphs: address(),
      },
      {
        heading: 'Contact · Kontakt',
        paragraphs: [`Email: ${email()}`],
      },
    ],
  },
];

export const legalDoc = (id: LegalId): LegalDoc => LEGAL_DOCS.find((d) => d.id === id)!;
