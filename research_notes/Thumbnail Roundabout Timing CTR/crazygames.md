# CrazyGames thumbnails and CTR for a one-tap roundabout/traffic-timing game

Research date: 2026-10-08. About 17 tool calls. Dates are given per source. Official docs pages show no date. Nothing here is more than a few months old unless marked.

## 1. Official CrazyGames cover requirements

### Takeaway
CrazyGames requires three covers per game (16:9 1920x1080, 2:3 800x1200, 1:1 800x800) plus a 15-20 s preview video (landscape and portrait). It allows no text except the game title, no borders and no icons or store logos. It advises against plain screenshots and over-cluttered art, and it wants the title in a stylized font.

### Cited Findings
- Mandatory covers: Landscape 16:9 = 1920x1080, Portrait 2:3 = 800x1200, Square 1:1 = 800x800. The covers should look consistent so the game is recognizable in any format. (Official docs, undated; two doc URLs show the same rules.) — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- Prohibited: borders, any text other than the game's title (e.g. "New", "Updated", "Play", "Play now"), icons or store logos, copyrighted visuals without rights, blurry or pixelated visuals. — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- Official tips, quoted: "try to be more creative" than a screenshot ("users can preview the gameplay by hovering over your game cover anyway"); "Over-cluttered covers are hard to scan, especially on small screens"; "Adding the name of your game to the cover is a great way to make it more memorable"; choose a distinctive font that matches the game's style rather than a generic default. — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- An earlier fetch of the same page also paraphrased the guidance as: use main characters or artistic graphics as the main visual element, and aim for clean, balanced compositions. This is the fetch tool's summary and not a verified quote. — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- The docs call game covers crucial because they "need to attract the attention of new users and make them want to play your game in a fraction of a second". They advise looking at covers of games in the same genre for inspiration. This text came via a search-result snippet. — [CrazyGames docs: Game covers (general)](https://docs.crazygames.com/general/game-covers/)
- Preview video: 15-20 s ("longer videos will be cut to 20 seconds"), max 50 MB, 1080p landscape (16:9) AND portrait (2:3), both mandatory. Video should start on the static cover image for a seamless transition and have no audio. Avoid: black-screen logo transitions, letterboxing, visible mouse cursor, promotional text overlays, social icons. — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- File format: the docs I could read do not name a file format (PNG/JPG/WebP). In practice, CrazyGames' own CDN serves covers as `...cover_16x9-<timestamp>.png` for older games and extensionless `<slug>_16x9/<date>/<slug>_16x9-cover` for newer ones. — observed in the live HTML of [crazygames.com/c/driving](https://www.crazygames.com/c/driving), 2026-10-08
- Tension with Poki: Poki's guide says "avoid text... skip titles", while CrazyGames recommends the title. For CrazyGames, a title-only cover is therefore allowed and encouraged. — [Poki thumbnail guide](https://developers.poki.com/guide/game-thumbnail) vs. the CrazyGames docs above

### Inferences
- A "Play"/"Tap" button, "NEW" ribbon, rating stars, a store badge or a tap-hand icon baked into the cover would breach the rules. A tap hand drawn as part of the artwork is a gray area, because the docs ban "icons" without defining the term.
- The 1:1 and 2:3 covers are used on mobile and in other placements, so the roundabout composition should be re-composed for each ratio, not cropped.

### Gaps
- No documented max file size or accepted format for covers, and no stated safe-zone or crop rules between 16:9, 1:1 and 2:3. The portal docs gave nothing on this.
- The developer portal (developer.crazygames.com) is a client-rendered page, and fetching it returned only a title. I could not check for extra guidance behind the login.

## 2. Official advice on CTR and what counts as good or poor

### Takeaway
I found no official CrazyGames CTR benchmark. CrazyGames says it collects CTR, conversion to gameplay, playtime and retention in the Basic Launch, but it publishes no threshold. The only numbers come from one developer devlog (a 2-4% target) and a hyper-casual publishing benchmark (3-4%) that is not CrazyGames-specific. Your 1.0% is probably low by these anecdotal measures, but the numbers are not official.

### Cited Findings
- FAQ: during Basic Launch CrazyGames gathers "real player data (retention, playtime, CTR, conversion to gameplay)". Homepage visibility then "depends on ongoing performance, including metrics like playtime, retention, and conversion". The new-games carousel is on the homepage. (Undated FAQ.) — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- Basic Launch is a roughly 2-week window. Full Launch means a SDK-integrated release with monetization. The criteria are described as average playtime, visitor-to-player conversion and retention, benchmarked against other games. Guide published 2026-07-17 by Cinevva, a third party, so secondary. It explicitly gives no CTR or thumbnail benchmark. — [Cinevva guide to publishing on CrazyGames](https://app.cinevva.com/guides/publish-game-crazygames)
- A developer devlog states a 2-4% CTR target. Their own Day-2 numbers were 6,100 impressions, 23 clicks, 0.4% CTR. This is an anecdote, and the target is the developer's own, not CrazyGames'. Devlog undated on the page ("85 days ago"). It cites a CrazyGames approval on July 13 and an expected promotion decision on July 20-23. That points to July 2026, but it is my inference. — [fxf8, Larss IO devlog (itch.io)](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- General hyper-casual benchmark: the marketability "CTR test" threshold is 3-4%. This was from a search-result summary of a mobile hyper-casual CPI test and is not specific to CrazyGames. I did not open the source, so treat it as weak. — search result summarizing [Unity: 5 A/B tests for hyper-casual](https://unity.com/blog/5-a-b-tests-to-increase-revenue-and-users-for-your-hyper-casual-game)
- Poki says thumbnails mainly drive CTR by communicating theme and style, while conversion to play depends more on load time and responsiveness. — [Poki thumbnail guide](https://developers.poki.com/guide/game-thumbnail)
- Note on a mix-up: the search tool surfaced "CrazyLabs CLIK dashboard" CTR tests ($3,000 / $25,000 rewards). That is a different company's mobile hyper-casual program and not CrazyGames. Do not use it.

### Inferences
- Because CTR is only one of several metrics, a better thumbnail lifts impressions-to-clicks, but the Basic Launch also checks playtime, conversion and retention. A thumbnail that draws clicks the game cannot convert may not help.
- The devlog's lesson implies CTR depends heavily on carousel placement and tile size. Compare your 1.0% only against the same placement.

### Gaps
- No official statement of average, good or poor CTR on CrazyGames. I found no data on how CTR varies by placement (homepage carousel vs. category grid vs. "new").
- I could not tell whether the CrazyGames developer dashboard shows impressions and CTR per placement. The Larss IO devlog suggests it shows impressions and clicks.

## 3. What top driving, traffic and timing game covers look like

### Takeaway
In the live Driving category (top games, 2026-10-08), most covers use one big, saturated vehicle in close-up or at a 3/4 angle, often with a bold stylized title top-left or bottom-right. Many also carry action cues such as crashes, police lights or jumps. Clean, flat "traffic puzzle" covers are in the minority. This is my own visual survey of one category page, so treat it as an observation, not data.

### Cited Findings
- Order of the first tiles in the Driving category with "Top games" sort: Traffic Rider, PolyTrack, Racing Limits, Sky Riders, Rally Racer Dirt, Case Simulator Cars, Escape Road 3, MX Offroad Master, Deadly Descent, Ramp Car vs Police: Chase, Circuit Racing, Real Car Driving, Drive Quest, Night City Racing, Super Star Car, Mad Pursuit, Crazy Grand Prix, Drift Hunters, Demolition Derby 3, Moto X3M. — DOM read of [crazygames.com/c/driving](https://www.crazygames.com/c/driving), 2026-10-08. The /t/car page, fetched earlier, listed a different order: PolyTrack, Racing Limits, Smash Karts, Sky Riders, Ramp Car VS Police, Car OUT! Jam Parking Puzzle, Escape Road 3, Deadly Descent, Car Seller, Drift Hunters.
- Visual reading of the screenshot of the first rows (several tiles were hidden behind a consent dialog; I saw about 12 of them):
  - Traffic Rider: a motorbike seen from behind, among traffic cars on a road, with stylized logo text in the top-left.
  - Escape Road 3: blocky cars with police lights and a helicopter in the scene, and the title in large yellow-on-dark lettering at bottom-right.
  - Drive Quest: a red muscle car at a 3/4 angle, a beach/sky background, title at the top in orange-yellow stylized text.
  - Demolition Derby 3: a purple car mid-crash with fire, title at top-left.
  - Drift Hunters: a white tuner car on grey, with a bold two-tone title at top-left.
  - Xtreme City Drifting and Xtreme Drift: italic title letters filling the tile's width.
  - Moto X3M: a cartoon bike mid-jump on a bright island.
  - Rally Racer Dirt: the title in the top-right in a rugged font, with a rally car.
  - Real Car Driving: a red car, no big title (tiny text at the bottom).
  - Circuit Racing: a blue-and-white race car with a small italic title.
  - Case Simulator Cars: a row of supercars (a Lamborghini and a Bugatti) lined up like slot-machine reels.
  - Some tiles carry small overlay badges in the top-left (the update/"refresh" icon and a purple icon). Those are added by CrazyGames' UI, not by the developer's cover.
- Observed on the Driving page: all 90 tiles are 16:9 crops with rounded corners. — DOM read of [crazygames.com/c/driving](https://www.crazygames.com/c/driving), 2026-10-08
- Observed on the Driving page: no `<video>` elements were present on load (so the preview video loads only on hover or something similar). — DOM read, 2026-10-08. I did not test hover.

### Inferences
- Patterns that repeat: (1) a single hero vehicle taking up 50-70% of the frame, (2) a bold, high-contrast stylized title with an outline or shadow, (3) saturated colors on a mid-tone background, (4) a hint of action (drift, jump, crash, police). Almost nobody uses a flat top-down, schematic view.
- A top-down roundabout view is therefore an outlier. It will stand out from the field, but it risks reading as "diagram" or "puzzle" instead of "driving". An angled, close-up car on a roundabout, with a near-miss moment, would follow the field's pattern. One could also use a cartoon tension face on a car or character.
- I could not verify expression, character and camera-angle patterns for traffic-puzzle and one-tap games, because I did not survey those categories. Candidates to check next: "Car OUT! Jam Parking Puzzle", "Traffic Escape", "Ramp Car vs Police" and the Puzzle and Casual categories.

### Gaps
- No traffic/timing/one-tap category survey. Only the Driving category top ~12 tiles were looked at, and only by eye on one screenshot. No per-game CTR data exists for comparison. CrazyGames does not publish it.
- I could not view the 2:3 or 1:1 covers in place on mobile.

## 4. Display size, cropping, hover and legibility

### Takeaway
On a ~1284 px desktop viewport, category tiles render at about 175-180 x 97-101 CSS px, with the cover loaded at 273 px width. The Larss IO devlog describes a 200x112 px carousel tile. The art therefore has to survive at roughly 180 px wide.

### Cited Findings
- On the Driving category page, the tile `<img>` is requested with `width=273&fit=crop&quality=85` and renders at 180x101 CSS px at a 1284 px viewport (175x97 for the sidebar list on another page). The URLs end in `_16x9-cover`, so the landscape cover is what the grid shows. — DOM measurement of [crazygames.com/c/driving](https://www.crazygames.com/c/driving), 2026-10-08. My own measurement, desktop only, one viewport.
- The Larss IO developer designed at 1920x1080 and found that in a homepage carousel the cover is about 200x112 px and "looked like just a grid". Their lesson: test covers at actual display size. — [fxf8, Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Hover: the docs say users "can preview the gameplay by hovering over your game cover". A 15-20 s muted preview video starts from the cover frame. — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- Official line on small screens: "Over-cluttered covers are hard to scan, especially on small screens". — [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)
- Poki, a comparable portal: text becomes unreadable on small tiles. It says "one clear foreground object", high contrast and a simple background, plus an action pose over a static pose. Poki's square minimum is 628x628. — [Poki thumbnail guide](https://developers.poki.com/guide/game-thumbnail)

### Inferences
- At 180 px wide, a roundabout drawn with many small cars will turn into texture. It needs 1 to 3 large readable shapes (the ring, one hero car, and one clear color contrast) and a thick-outlined title of at most 2 short words ("ROUNDABOUT" is long; consider a two-line stack or a shorter lockup).
- The first frame of the preview video must be the cover, so the preview should be edited around the cover's focal point.

### Gaps
- Mobile tile sizes and the 2:3 / 1:1 usage were not measured (I had a desktop viewport only).
- I did not test the hover behavior, so I cannot say how long the preview takes to start.

## 5. Evidence of thumbnail changes that raised CTR (with numbers)

### Takeaway
I found no credible before/after CTR numbers for a CrazyGames thumbnail change. There is one qualitative case (Larss IO) that shows a redesign but publishes no after-numbers. Poki runs thumbnail A/B tests, which CrazyGames apparently does not advertise.

### Cited Findings
- Larss IO (a 1v1 block-puzzle game): the original cover was a diagonally split grid with a red line, which read as "a grid" at tile size. The redesign shows visible tetromino pieces with VS framing and a refreshed palette. A commenter said the thumbnail "doesn't tell me anything about what the game is". The devlog promised follow-up results after the 23 July promotion decision, and I found none in the page I fetched. Other flaws the developer found beyond the thumbnail: wrong category (Strategy instead of Puzzle), "Play Now" leading to a tutorial, and 13 matchmaking options. — [fxf8, Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Poki offers thumbnail A/B tests: each test round shows two versions randomly and runs for at least 3 days. This is Poki-only; I did not find an equivalent CrazyGames feature. (Search-result summary; the original page redirected, so I could not read it.) — [Poki: A/B thumbnail tests](https://sdk.poki.com/ab-thumbnail-tests)
- The Bump Dev "Food Knockout" Basic Launch devlog contains no CTR or thumbnail numbers. — [Bump Dev devlog](https://bump-dev.itch.io/food-knockout/devlog/1470465/crazygames-basic-launch)
- Searches of Reddit, r/WebGames and gamedev threads, and the CrazyGames dev Discord, returned no before/after CTR figures. (Search-engine coverage of those is weak, so this does not prove none exist.)

### Inferences
- Category mismatch affects CTR on CrazyGames: the Larss IO developer attributes part of the low CTR to the Strategy category. For "Roundabout Timing", compare Driving vs. Puzzle vs. Casual/Skill/One-tap tags and see who the neighbors are in each grid.
- Without A/B tooling on CrazyGames, the practical test is to swap the cover, wait for a stable number of impressions, and compare the CTR within the same placement and week. Changes to the cover likely go live the same working day, which is a weak inference from the FAQ.

### Gaps
- No quantified CTR uplift from a cover change on CrazyGames (or on any portal) found. No confirmation of how often covers can be changed after launch, or whether CrazyGames has a thumbnail test feature in the portal.
