# Visual-design evidence for high-CTR casual/hypercasual game thumbnails (applied to Roundabout Timing)

Research date: 2026-10-08. Evidence quality is flagged inline: **[DATA]** = measured numbers with stated method, **[VENDOR]** = vendor/case-study claim without full method, **[GUIDE]** = platform guideline (no numbers), **[ANECDOTE]** = forum/blog opinion, **[OLD]** = before 2023. Overall finding: there is almost no public, controlled CTR data for *browser-game portal thumbnails*. Most numeric claims come from app-store icon tests, social-ad creatives, or YouTube thumbnails, and have to be transferred by analogy.

## Q1. Which visual elements measurably affect CTR (focal points, subject size, color/contrast, faces, text, arrows/motion, tension, borders, logos)?

### Takeaway
The best-supported levers are (a) a simple, uncluttered icon/background (SplitMetrics: clear and simple icon backgrounds correlate with a conversion lift of over 26%), (b) high contrast, (c) a single clear focal subject, and (d) a motion or tension cue. Specific folk claims ("warm backgrounds win", "faces +20-30%", "red beats blue") are mostly unsupported or category-dependent. The one large open-data YouTube analysis found essentially no difference in brightness, saturation, or contrast between breakout and underperforming thumbnails.

### Cited Findings

**Platform guidance for the exact venue type (web game portals) [GUIDE]**
- Poki: "Embrace simplicity" with one clear focal point instead of a cluttered composition. Suggest movement with dynamic poses. Prioritize contrast. Avoid text entirely because "text quickly becomes unreadable on smaller tiles" and reduces click-through. Avoid fine detail because it deteriorates at small sizes. Use no padding or borders (full-bleed square, 1:1, at least 628x628, rounded corners applied by Poki). Avoid colors matching the platform background (#83FFE7, a mint/aqua). Poki says thumbnails mainly drive CTR by communicating theme and style, and affect conversion-to-play only indirectly. — [Poki developer guide](https://developers.poki.com/guide/game-thumbnail)
- CrazyGames: requires three covers (16:9 1920x1080, 2:3 800x1200, 1:1 800x800). Do: keep the visuals consistent across the three formats; put the game title on the cover in a stylized font; keep designs "clean, balanced, and easy to read on small screens". Don't: use plain gameplay screenshots, add borders, add text beyond the title ("New", "Play Now"), use blurry or pixelated imagery. States covers must grab attention "in a fraction of a second". Preview video is 15-20 s, silent, and shows exciting gameplay, with the static cover as its first frame. — [CrazyGames docs](https://docs.crazygames.com/requirements/game-covers/)
- Earlier CrazyGames page (via search snippet) lists "bold, high contrast graphics, appealing and consistent color palette" and "stick with just a few key elements" instead of lots of text, logos, or details. — [CrazyGames docs](https://docs.crazygames.com/general/game-covers/)
- itch.io community thread **[ANECDOTE]**: text must contrast with its background and not sit over noisy areas. One commenter said he did not read the text on covers and judged games by the visuals. — [itch.io thread](https://itch.io/t/4976086/my-project-thumbnails-too-boring)

**Icon / store-tile A/B data**
- SplitMetrics ASO Benchmarks 2024 (about 200 apps, over 3,500 A/B tests, Google Play and App Store) **[DATA, vendor-reported summary]**: icon optimization can lift conversion by up to 25%. Clear, simple icon backgrounds gave a conversion increase of over 26%. Bold colors in finance icons and screenshots gave about 12%. Red branding gave about 5% in China. Nearly 50% of users only view the first two screenshots. Summary is from PocketGamer.biz (22 Aug 2024). — [PocketGamer.biz](http://www.pocketgamer.biz/research-finds-that-app-icon-optimization-can-boost-user-numbers-by-up-to-25/); also via search snippet [App Developer Magazine](https://appdevelopermagazine.com/apps-that-use-icons-gain-users/)
- SGN (Cookie Jam), Google Play store-listing experiment: an 8% conversion increase "simply by changing the background color of their app icon." **[OLD, Dec 2015, vendor]**. The summary does not say which colors. — [Android Developers Blog](https://android-developers.googleblog.com/2015/12/android-developer-story-sgn-game-cookie.html)
- AppQuantum x AppTweak, game "Gold and Goblins" **[VENDOR, Aug 2023]**: a single icon change gave +21.5% first-time-installer downloads and +26% retained first-time installers within two weeks. Three variants were tested (an "earth drill", a "goblin", and both combined). The "earth drill" version won. The case study does not describe the specific visual changes. — [AppTweak case study](https://www.apptweak.com/en/case-studies/appquantum?format=md), [AppQuantum](https://appquantum.com/news/august-2023/appquantum-x-apptweak-case-study-game-downloads-increased-by-21.5.html)
- **Conflict to flag:** a third-party blog (Sonar) cites this same case as a "close-cropped character face with exaggerated expression." The AppTweak case study itself does not say this. Do not repeat the face claim. — [Sonar](https://trysonar.app/blog/app-icon-design-what-actually-gets-tapped.md) vs [AppTweak](https://www.apptweak.com/en/case-studies/appquantum?format=md)
- Sonar (blog; vendor sources, moderate quality) rules of thumb: limit to 2-3 colors, high *value* contrast matters more than hue variety, text is illegible below about 120 px, avoid fine gradients and small taglines. The claim "distinctive silhouettes show roughly 34% higher recognition" is attributed to AppSamurai and was not verified at the primary source. — [Sonar](https://trysonar.app/blog/app-icon-design-what-actually-gets-tapped.md)

**What top game icons look like (descriptive, not causal) [VENDOR, Feb 2024]**
- AppTweak, top 50 games per category (US, Google Play and App Store): Racing icons are dominated by black, brown, grey, white, blue, red, orange. Arcade icons by black, white, yellow, orange, red, blue. Casual icons emphasize "cats & characters" and multiple bright colors. Text is mostly low-presence except in board and casino icons. This describes what ranks, not what causes clicks. — [AppTweak icon trends](https://www.apptweak.com/en/aso-blog/infographic-mobile-games-app-icon-trends?format=md), [AppTweak casual creatives](https://www.apptweak.com/en/aso-blog/creatives-trends-for-top-casual-mobile-games?format=md)

**Color and contrast in ads**
- VidMob (5,019,094 Facebook/Instagram video ads, published Aug 2022 **[DATA, not games, video ads]**): high vibrancy lifted conversion rates by 38% vs. low vibrancy. Personal Care ads with higher contrast in Stories had a 63% lift in view rates. Beauty campaigns with cooler colors differed by 60% from warmer ones, while personal-care with warmer ads performed 40% better. Ad copy on a moderate-contrast background gave a 40% engagement lift. The direction of warm-vs-cool flips by category. — [MediaPost on the VidMob study](https://www.mediapost.com/publications/article/376501/color-is-key-to-improving-campaign-performance-vi.html)
- Warm-color CTA-button claims ("+21%", "+26% CTR for high-contrast text") appeared in search-summary text with no primary source. Treat as **[ANECDOTE]**.
- A Bruin "color palette vs CTR" page quotes warm 2.5% vs cool 1.8% CTR, but it is an illustrative hypothetical for a software demo, not data. Do not cite it. — [Bruin](https://getbruin.com/use-cases/mobile-gaming/creative-color-palette-performance-analysis/)

**Faces and text: perceptual science and YouTube data**
- Cerf, Frady, Koch (2009, Journal of Vision 9(12)) **[DATA, peer-reviewed, [OLD]]**: in free viewing, observers looked at faces and text 16.6 and 11.1 times more than size/position-matched control regions. Text is nearly as strong as faces. Observers could not easily ignore them even when instructed to. — [Caltech repository](https://authors.library.caltech.edu/40670)
- Eden, 507,478 long-form YouTube videos from 8,691 channels (Aug 2025 to Aug 2026), thumbnail analysis of 2,960 thumbnails **[DATA, observational, thumbnails not randomized, differences under about 2.5 percentage points are noise]**:
  - Faces: 84.2% of breakout thumbnails vs. 82.2% of underperformers (within noise). Eye contact 32.4% vs. 29.2%. Neutral/serious expressions were more common in winners (51.1%) than smiles (21.2%). Shocked faces were 11.7% of breakouts on 100k+ channels vs. 5.6% below 100k.
  - Text: any overlaid text 86.6% vs. 83.2%. A 4-6 word text range appeared in 30.6% of breakouts vs. 26.5% of underperformers. All-caps text was 62.3% of breakouts.
  - **Brightness, saturation, contrast: no measurable difference** (brightness 40.9 vs 40.5, saturation 35.2 vs 34.7, contrast 23.5 vs 23.1).
  — [Eden](https://eden.so/blog/what-makes-a-good-youtube-thumbnail/)
- Blog-circulated claims that "a face with clear high-arousal emotion explains more CTR variance than any other variable (Spotter 50,000-video study)", "+20-30% CTR for genuine emotion", and "face presence 20-80% CTR difference" come from SEO blogs with no accessible primary study. **[ANECDOTE/unverified]**. The Eden data above does not support a large face effect. — [Unilink](https://www.unilink.us/blog/youtube-thumbnail-design-2026) (secondary). The vidIQ study page (https://vidiq.com/research/youtube-thumbnail-study/) returned 403 and could not be checked.
- Attention hierarchy from eye-tracking summaries: when an image has both a face and text, fixations land closer to the text. Participants spent about twice as much attention on thumbnails as on title text in video browsing. — search-result summaries of eye-tracking literature (PMC3845417 returned a CAPTCHA; not verified at source).

**Motion, tension, "fail" cues (video ad evidence, adjacent to thumbnails)**
- Industry claim: 70-80% of the most successful hypercasual creatives launched show a fail situation. Segwise's own page admits it has no statistics or primary sources. **[ANECDOTE/unverified]**. — [Segwise](https://segwise.ai/blog/fail-ads-mobile-game.md)
- RocketShip HQ (27 Feb 2026) **[VENDOR/analyst opinion, no numbers]**: fail ads work through an "I can do better" response. Best format is 2-3 s of failure followed by 1 s of a potential success state, no voiceover. "Obvious mistake I could avoid" outperforms extreme incompetence. Fail ads brought higher 48-hour uninstall rates (buyer's remorse risk). — [RocketShip HQ](https://www.rocketshiphq.com/?p=4409)
- Supersonic's Bazooka Boy: best creative was a looping fail video at about $0.15 CPI during a marketability test. **[ANECDOTE, secondary via search snippet]**.
- CrazyLabs on PocketGamer.biz (Feb 2023, sponsored) **[VENDOR, OLD-ish]**: for runners, put the character in the lower third and show a fail early (3-5 s). Feature unique characters and color palettes. For clickers, show a virtual hand and highlight contrast. No driving/timing guidance. — [PocketGamer.biz](http://www.pocketgamer.biz/the-ultimate-cheat-sheet-for-successful-sreatives-by-sub-genre-games/)
- General hypercasual guidance (mobidictum/TikTok/Segwise-type sources): strong visual hook in the first second, clean visuals with strong contrast and clear focus, core loop visible. **[GUIDE]**. — [Mobidictum](https://mobidictum.com/high-performing-ad-creatives-hypercasual-mobile-gaming/)
- Liftoff case study (old, not games-specific): animated banner +99% conversion vs. static. **[OLD, vendor]**. — via search snippet of [Liftoff PDF](https://liftoff.io/ko/wp-content/uploads/2017/02/Liftoff_Case_Study_Grab_Singapore.pdf) (not fetched).

### Inferences
- For a portal tile, the only controlled-style numbers are icon tests (about 8% to 26%). A realistic prior for a *thumbnail redesign* is a swing of roughly +10% to +25% relative CTR, not multiples. Going from 1.0% to 1.1-1.3% is the plausible range from design alone (extrapolation from icon tests, not measured on portals).
- Because the Eden YouTube data shows no brightness/saturation/contrast difference, "pump the saturation" is not a reliable standalone lever. The robust lever is *relative* distinctiveness: stand out from the neighboring tiles and the platform chrome (Poki explicitly warns against its mint #83FFE7).
- Warm-vs-cool is category-dependent (VidMob flips direction), so test it rather than assume it. The only safe rule is to differ from the surrounding grid and keep clear value contrast.
- A "fail/near-miss" moment is the best-supported emotional hook for skill games, and "obvious mistake I could avoid" maps directly to Roundabout Timing ("I would have tapped earlier").

### Gaps
- No public controlled A/B data on portal-grid thumbnails (Poki, CrazyGames, itch.io) with CTR deltas. Developers rarely publish them. Searches for Reddit/gamedev postmortems with numbers returned nothing usable.
- No verifiable primary data on arrows/motion-cue effects, drop shadows/outlines, or logos on CTR for game thumbnails.
- No primary-source data on subject-size-to-CTR in games. The Eden study did not report subject size.
- Voodoo, Playrix, Homa, Ketchapp, Unity, AppLovin and Moloco publish nothing specific on static thumbnail/icon element effects that I could access. Their reports concern ad *video* formats and networks. The AppsFlyer "Hypercasual IPM of 48" report was returned but not read.

## Q2. Designing for legibility at tiny sizes (150-300 px tiles, 48-96 px icons)

### Takeaway
Treat the tile as a ~16-32 px "gist" image: only large, high-value-contrast shapes and one silhouette survive. Test by shrinking to 100-150 px, blurring/squinting, and grayscale. Skip text beyond (optionally) the title, and keep the focal subject large.

### Cited Findings
- Poki: heavy detail deteriorates at small sizes; text becomes unreadable on small tiles; one focal point. — [Poki](https://developers.poki.com/guide/game-thumbnail)
- CrazyGames: "clean, balanced, and easy to read on small screens"; no blurry or pixelated imagery. — [CrazyGames](https://docs.crazygames.com/requirements/game-covers/)
- Sonar summary of icon guidance: text is unreadable below about 120 px (Apple HIG advises no text in icons); fine gradients turn muddy at about 60 px; limit to 2-3 colors; value contrast beats hue variety. **[blog; the HIG point is official, the rest is rule of thumb]**. — [Sonar](https://trysonar.app/blog/app-icon-design-what-actually-gets-tapped.md)
- Tiny-image science **[DATA, OLD: Torralba, Fergus, Freeman 2008]**: 32x32 color images are enough for scene recognition and object detection, with a big performance drop below 32x32. About 80% correct superordinate classification is possible at 8 cycles/image (16x16 px), meaning coarse layout and silhouette carry the gist. — [Torralba et al., "80 million tiny images"](https://people.csail.mit.edu/torralba/courses/6.870/papers/80millionimages.pdf)
- Testing heuristics from design blogs **[ANECDOTE/rule of thumb]**: squint/blur test (hold at arm's length or half-close eyes and see what survives); grayscale test (convert to grayscale and check that subject and text still separate); shrink to about 200x113 px for video thumbnails; text cap height about 16-20 px or at least 12% of frame height at 120 px width. High contrast does not by itself equal readability, since fine lines blur into gray blobs. Pastels often fall below contrast thresholds. — [VloggingPro thumbnail legibility](https://vloggingpro.com/tools/thumbnail-legibility/), [MergeImages](https://mergeimages.net/de/blog/youtube-thumbnail-text-readability), [CreatiCalc](https://creaticalc.com/blog/youtube-thumbnail-mobile-readability) (all via search summaries, not fetched)
- Cerf et al.: text and faces automatically draw gaze even in free viewing, so any text, if used, becomes a second focal point competing with the subject. — [Caltech](https://authors.library.caltech.edu/40670)

### Inferences
- Practical test protocol for the team: (1) export the tile at 150, 100, and 64 px; (2) apply a 4-8 px Gaussian blur and grayscale; (3) place it next to 10-20 competitor tiles on the real portal background and check that you can still name what the game is (cars + roundabout + danger) and where the eye lands first.
- Roundabout geometry gives a natural bold silhouette: a thick ring with 2-3 cars. Design the ring and the cars as the shapes that survive blur, not the road markings.

### Gaps
- The squint/grayscale/shrink thresholds come from design blogs, not controlled studies. No source gave a validated "minimum subject area percent" for game tiles.

## Q3. Genre-specific patterns (traffic/driving/crash/near-miss/timing games)

### Takeaway
I found no rigorous analysis of thumbnails in this specific genre. Available evidence supports: simple stylized rendering, one clear focal "event" (a near-collision or fail moment), and motion or tension cues, consistent with Poki's "dynamic poses" guidance and the "fail ad" literature. Racing icons skew to dark/neutral palettes plus red/orange/blue, which may mean a bright, saturated palette would stand out, but this is inference.

### Cited Findings
- AppTweak top-50 icon analysis: Racing icons are dominated by black, brown, grey, white, blue, red, orange. Arcade by black, white, yellow, orange, red, blue. Casual by black, light grey, blue, beige, yellow, orange. — [AppTweak](https://www.apptweak.com/en/aso-blog/infographic-mobile-games-app-icon-trends?format=md)
- Poki: depict dynamic movement rather than static stances. — [Poki](https://developers.poki.com/guide/game-thumbnail)
- Fail/near-fail framing is the most-cited hypercasual creative pattern (see Q1 caveats: unquantified). "Obvious mistake I could avoid" is the effective tension level, with a short success-state follow-up. — [RocketShip HQ](https://www.rocketshiphq.com/?p=4409)
- CrazyLabs: for action/runner creatives, put the subject in the lower third and make the unique character and palette recognizable. — [PocketGamer.biz](http://www.pocketgamer.biz/the-ultimate-cheat-sheet-for-successful-sreatives-by-sub-genre-games/)
- Searches for "Traffic Run / Crossy Road / traffic-escape creative analysis" returned only stock icon sites. No genre deconstruction was found.

### Inferences
- Likely best composition for a "tension/skill" tile: 2-3 high-contrast cars on a thick ring, with one car on a visible collision course (moment *just before* impact), reinforced by a short motion cue (speed streaks or a skid arc), plus a minimal "danger" cue such as a small spark or impact star. Per the fail-ad evidence, "avoidable" tension should be legible (the viewer should see that a tap would solve it).
- Bird's-eye vs. 3D angle: no evidence found. Top-down is the game's real view, which aligns with CrazyGames' "don't just use a screenshot" rule only if the tile is stylized and enlarged, not a raw screenshot.
- Cartoon vs. realistic: no evidence found. Casual icon trends favor cartoon characters with bright colors. Since vehicle colors are game information, keep the cars distinct in hue.

### Gaps
- No data on bird's-eye vs. 3D, speed lines, explosions, or cartoon vs. realistic in driving/crash game thumbnails. This must be tested on the real portals.

## Q4. Common mistakes that depress CTR

### Takeaway
All credible sources agree on the same list: screenshots/UI instead of key art, text, clutter and fine detail, low contrast or blending with the platform background, blurry assets, and borders. Quantification is thin; "muted/dark palette" and "generic AI art" claims are unsupported by data.

### Cited Findings
- CrazyGames explicitly forbids or discourages plain gameplay screenshots, borders, extra text such as "New" or "Play Now", store logos, and blurry or pixelated imagery. — [CrazyGames](https://docs.crazygames.com/requirements/game-covers/)
- Poki: text, borders/padding/letterboxing, fine detail, and colors matching the platform background (#83FFE7). — [Poki](https://developers.poki.com/guide/game-thumbnail)
- SplitMetrics: cluttered icon backgrounds underperformed simple ones (over 26% conversion gap). — [PocketGamer.biz](http://www.pocketgamer.biz/research-finds-that-app-icon-optimization-can-boost-user-numbers-by-up-to-25/)
- itch.io community **[ANECDOTE]**: unreadable text colors/noise, and generic presentation that fails to show what makes the game distinctive. — [itch.io thread](https://itch.io/t/4976086/my-project-thumbnails-too-boring)
- Sonar: fine gradients and small taglines collapse at icon size; 4+ colors create noise. — [Sonar](https://trysonar.app/blog/app-icon-design-what-actually-gets-tapped.md)
- Eden YouTube data: text on thumbnails is *common* in winners (86.6%), so text itself is not the failure, and the brightness/saturation/contrast measures did not separate winners from losers. The mistakes that matter are therefore about legibility and clarity, not "dull vs. vivid" as such. — [Eden](https://eden.so/blog/what-makes-a-good-youtube-thumbnail/)

### Inferences
- Because the current CTR is 1.0%, check first whether the existing tile is (a) a screenshot, (b) contains small text, (c) has a palette near the portal chrome, or (d) has a subject under about 40% of the frame. These are the mistakes with source support. "AI-looking art" and "dark palette" have no data behind them here.

### Gaps
- No quantified penalty for any single mistake in a portal context. No data found on generic AI-style art vs. hand-authored art.

## Q5. Text on the thumbnail (English-only game): CTA text vs. no text

### Takeaway
The two web-game portal operators that publish guidance say *no text, or title only*. They name "Play Now" and "New" as explicitly unwanted. YouTube-style data, where text is common and 4-6 words is the modal range in winners, is a different context (long titles absent, large format) and the effect is within noise. For a tiny tile, no CTA text; the game title in a bold stylized font is the only text with support.

### Cited Findings
- Poki: "avoid text entirely", as it is unreadable on small tiles and reduces CTR. — [Poki](https://developers.poki.com/guide/game-thumbnail)
- CrazyGames: title on the cover is encouraged, nothing else ("New", "Play Now" are listed as don'ts). — [CrazyGames](https://docs.crazygames.com/requirements/game-covers/)
- App icons: Apple HIG advises against text in icons; text unreadable below about 120 px. — [Sonar summary](https://trysonar.app/blog/app-icon-design-what-actually-gets-tapped.md)
- Eden YouTube data: 86.6% of breakouts vs. 83.2% of underperformers had text (within noise); 4-6 words was the most common range; 62.3% of breakouts used all caps; only 6.3% repeated the title verbatim. **[observational]**. — [Eden](https://eden.so/blog/what-makes-a-good-youtube-thumbnail/)
- Cerf et al. 2009: text attracts gaze almost as strongly as faces, so even a small amount of text pulls attention. — [Caltech](https://authors.library.caltech.edu/40670)
- Hypercasual video ads often use short text overlays and tips, but I found no CTR figures for specific words like "Tap!" or "Don't crash!" **[no data]**.

### Inferences
- Recommended A/B arms: (A) no text; (B) title wordmark only; (C) one 1-2 word cue ("TAP!") at very large size. Expect A or B to be safest on the portals per their rules. C is the only variant worth testing against that guidance, and it could violate the CrazyGames rule on non-title text. It is potentially usable on itch.io or your own site.
- If the game title is on the tile, make it high-contrast and at least about 12% of tile height. If it can't be read at 150 px, drop it.

### Gaps
- No data on specific CTA wording ("Tap!", "Don't crash!") or on short-text vs. no-text in game portal tiles. Portals do not publish this.

## Source-quality summary for the report writer
- Strongest primary sources: Poki and CrazyGames developer docs (guidelines, no numbers), Cerf et al. 2009 (peer-reviewed, old), Torralba et al. 2008 (peer-reviewed, old), the Eden 507k-video YouTube analysis (large but observational and different medium), the VidMob 5M-ad study (large but video ads in other categories, via press coverage).
- Vendor claims with numbers but weak method detail: SplitMetrics 2024 (via PocketGamer.biz), AppQuantum/AppTweak (21.5%), SGN/Google (8%, 2015).
- Unreliable or unverified, do not present as fact: "face = +20-30% CTR", "Spotter 50,000-video study" as relayed by SEO blogs, "70-80% of top hypercasual creatives are fail ads" (no primary source), "34% higher recognition for silhouettes", warm-CTA "+21%", Bruin's "2.5% vs 1.8%" (hypothetical), Sonar's "close-cropped face" gloss on the AppQuantum case.
