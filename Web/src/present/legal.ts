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
  email: 'leonard@suhrreal.de',
};

/** Who runs the server the game is delivered from (Coolify's machine), and where. */
export const HOSTING = {
  provider: 'us (self-hosted)',
  location: 'Germany',
};

export const LEGAL_UPDATED = '1 October 2026';

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
          `${GAME_NAME} has no sign-up, no cookies, no analytics and no tracking. Your progress stays on your device. This page explains the few things that do leave it.`,
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
        heading: 'Stored on your device',
        paragraphs: [
          "The game keeps your progress, your settings and, if you play multiplayer, the name you chose in your browser's local storage. It also stores its own files so it runs offline. None of this is sent to us. Storing it is what makes the game work as you asked (§ 25(2) no. 2 TDDDG).",
          'To delete it: Settings → Reset progress, or clear the site data in your browser.',
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
          'Only if you enter a name for the leaderboard (Progress → Ranks), the game sends it to our leaderboard server, which runs on the same machine as the game. From then on it sends your level (with your Prestige rank) and your Unlimited record whenever they improve.',
          'The server stores the name, a random ID, a secret key that proves the name is yours (only its hash is kept), your best scores and when you reached them. The name and the scores are public: everyone can see them on the leaderboard. Your IP address reaches the server with every request, as with any website; it is used only in memory to stop abuse and is not stored. Offensive names are removed.',
          'Legal basis: Art. 6(1)(b) GDPR (the leaderboard you chose to join). To remove your name and all your scores at once: Progress → Ranks → Remove me from the leaderboard.',
        ],
      },
      {
        heading: 'Friends',
        paragraphs: [
          'If you open Friends on the leaderboard, the server makes a friend code for you (like K7M2-9QXA). Whoever types your code adds you to their friends list and then sees your name and your best scores on their friends board, which they could already see on the public leaderboard. You can see and remove the people on your own list; the list is stored with your leaderboard entry.',
          'Legal basis: Art. 6(1)(b) GDPR (the friends board you chose to use). Removing your name from the leaderboard deletes your friend code and your list as well.',
        ],
      },
      {
        heading: 'Cloud sync',
        paragraphs: [
          'Only if you turn on Cloud sync (Settings → Cloud sync), the game sends a copy of your progress (the same data as the progress file you can export: level, money, upgrades, collection, records, settings) to our server. No name, e-mail address or password is needed: the server makes a random sync code, and the code is the only key to the copy. Only its hash is stored, together with the copy and the times it was made and last changed. The copy is not public. Your IP address reaches the server with every request, as with any website; it is used only in memory to stop abuse and is not stored.',
          'Anyone who knows your sync code can load or replace your copy, so keep it private. A picture you chose for Big Screen is not part of it. If you have a name on the leaderboard, the copy also holds that name and the secret key that proves it is yours, so that on a new device you are the same player again, with the same name, scores and friends. Anyone with the sync code could therefore also act as that player.',
          'Legal basis: Art. 6(1)(b) GDPR (the backup you chose to make). To delete the copy for good: Settings → Cloud sync → Delete the cloud copy. Stopping on one device leaves the copy for your other devices.',
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
          "Sharing a result, a photo, a challenge or a room link uses your device's own share sheet or download. The game sends nothing to us when you share.",
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
