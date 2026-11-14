# Playgama submission: Roundabout Timing

Upload: `Web/playgama/roundabout-timing-playgama.zip` (rebuild with `cd Web; npm run playgama`).
It is a full build of the game (`index.html` at the root, `assets/`, `audio/`, `icons/`, `playgama-bridge-config.json`). Playgama's page forbids framing other addresses, so the game itself is inside the zip; a game update needs a new zip.

The field names below follow what portals usually ask. Playgama's form may name or group them differently; copy the matching text.

## Basics

| Field | Value |
| --- | --- |
| Title | Roundabout Timing |
| Developer / publisher | Your name or studio, as in the imprint: https://game.timing.love/imprint |
| Game page | https://game.timing.love |
| Support | https://timing.love/support |
| Privacy policy | https://game.timing.love/privacy |
| Orientation | Portrait (plays on desktop in a portrait column) |
| Platforms | Mobile browser and desktop browser |
| Languages | English, German, Spanish, French, Italian, Japanese, Korean, Chinese (Simplified) |
| Genre | Arcade, Casual, Hypercasual / Timing |
| Tags | one tap, timing, reaction, cars, driving, roundabout, traffic, police chase, crash, boss fight, merge, arcade, casual, offline |
| Age rating | Answer the form's questionnaire: cartoon car crashes, no blood, no chat, no real-money purchases, no gambling for money (the Arcade uses in-game coins only) |
| Price | Free |

## Short description (max ~80 characters)

One-tap timing at the roundabout. Tap. Merge. Don't crash.

## Full description

```
One tap. Pure timing.
Read the gap, tap once, merge in. Chain perfect inputs for combos and watch your score multiply.

HOW IT PLAYS
Cars flow around the roundabout. Tap once to send the next car in. Hit the gap and you merge. Miss it and you crash. Easy to learn, hard to put down.

WHAT YOU GET
- One-tap timing with combos, perfect inputs and near misses
- Police chases with rising wanted levels
- Boss convoys that need three cars lined up
- Real crash physics: impact, tyre grip and bent metal, nothing scripted
- Seasonal maps: snow, sakura, tropics and more
- Hundreds of skins and ride types, chests with the odds always shown
- Street builder, upgrades, daily shifts, goals and trials
- 8 languages: English, Deutsch, Español, Français, Italiano, 日本語, 한국어, 中文

FAIR BY DESIGN
No forced ads. The only ads are optional rewarded ads, shown only when you tap "Watch ad" for a free chest. No real-money purchases of any kind. The Arcade uses in-game coins only.

Tap. Merge. Don't crash.
```

## Controls (instructions field)

- Mobile: tap anywhere to send the next car in.
- Desktop: click, or press Space or Enter.

## Monetisation and data (what to tick)

- Ads: rewarded ads only (the free chest, three a day). No interstitial, banner or midgame ads. The Bridge placement is `free_chest` (`playgama-bridge-config.json`).
- In-app purchases: none.
- Saves: stored through the Playgama Bridge storage (cloud for a logged-in player), with a local fallback.
- Network: the game works offline after the first load. Multiplayer (peer to peer) and the online leaderboards use our own service (`api-game.gustaff.dev`, PeerJS broker `0.peerjs.com`); the game runs fine if they are unreachable.
- Analytics and error reports: switched off inside Playgama.
- Social features hidden inside Playgama: crews, friend codes, the Mafia loans (to follow portal content rules).

## Assets to upload

Check the sizes against the form; the files below are the closest we have.

- Icon: `Marketing/roundabout-timing-app-icon-512x512.png`
- Cover / feature image: `Marketing/roundabout-timing-feature-graphic-1024x500.png`
- Portrait promo images: `Marketing/roundabout-timing-promo-1-neon-night-1080x1920.png`, `Marketing/roundabout-timing-promo-2-sakura-1080x1920.png`
- Screenshots: `Marketing/roundabout-timing-screenshot-1-game.png` to `-7-maps.png`
- More cover art: `Marketing/covers-v2/`

## Technical notes for the reviewer

- Bridge SDK 2 (`https://bridge.playgama.com/v2/stable/playgama-bridge.js`) is the first script in `index.html` and is initialised before the game reads its save; `game_ready` is sent when the game is on screen and takes taps.
- Rewarded ads pay only on the `rewarded` state, never on `closed`.
- The game pauses on the platform's pause event and follows the platform's audio state.
- The zip is a separate build (`--mode playgama`); the normal website is unaffected.
