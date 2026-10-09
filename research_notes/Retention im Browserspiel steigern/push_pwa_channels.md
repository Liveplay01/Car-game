# Owned re-engagement channels for a browser game: web push, PWA install, alternatives

Research date: 2026-10-09. Context: "Roundabout Timing" (Vite+TS+Canvas PWA, anonymous players, web push built, opt-in offered once at daily streak 2, max 1 push per 20 h, quiet 21:00-09:00, distributed on own site, CrazyGames, itch.io, Google Play TWA).

General evidence-quality warning: almost every hard number on opt-in, CTR and fatigue comes from push-vendor blogs (OneSignal, Pushwoosh, Airship, Batch, Gravitec) with undisclosed methods and mixed definitions (opt-in = subscribers/visitors vs. subscribers/installed users). Web-push-specific, games-specific, post-2023 numbers are scarce. Primary-source facts (Google/Chrome, WebKit, MDN) are solid but mostly give mechanisms and relative changes, not absolute rates. Where I could not find a number I say so under Gaps.

---

## 1. Web push opt-in rates for games, soft asks, ask timing, Chrome's quieter UI / auto-revoke, iOS install requirement

### Takeaway
Web push opt-in is low everywhere (single digits to low teens % of visitors; Chrome's own telemetry showed only ~10-12% of notification prompts granted on desktop and ~21-23% on Android), so the ask must be contextual and preceded by a soft ask. Chrome is actively squeezing weak push senders (quiet UI, auto-revoke for low-engagement high-volume sites, a non-blocking Android prompt from Chrome 155), while iOS only allows push for Home Screen web apps, with a user-gesture requirement.

### Cited Findings
**Baseline opt-in numbers (web)**
- Chrome telemetry (2021 USENIX Security paper by Google): notification prompts were 74% of all permission prompts but the least likely to be granted: 12% grant on desktop and 23% on Android in the USENIX version; the Google Research version of the same paper gives 10% desktop / 21% Android. Pre-redesign baseline. — [USENIX Security 2021](https://www.usenix.org/conference/usenixsecurity21/presentation/bilogrevic); [Google Research](https://research.google/pubs/pub49767/)
- Chrome 80 (Feb 2020) quieter UI: A/B test with >40M users, >100M prompts, >70k sites; cut unnecessary user actions on prompts by up to 30% while the grant rate fell by less than 5%. Quiet UI is auto-enabled for users who habitually block and on sites with very low opt-in rates. — [Google Research / USENIX 2021](https://research.google/pubs/pub49767/)
- OneSignal vendor figure: web push opt-in ~10% (iOS native 43.9%); no date or method on page. — [OneSignal](https://onesignal.com/blog/increase-opt-in-rates-for-push-notifications/)
- Gravitec (subscribers / total website visitors, first 3 months): e-commerce ~5%, media 6-8%. — [Gravitec](https://gravitec.net/blog/?p=426)
- Batch reports an average web opt-in of 9% for its clients in 2022 (quoted via an aggregator page; not verified on Batch's own page). Notificare cites a general web push average of 17.05% (some industries up to 25%), which is not iOS-specific and is unsourced. MoEngage gives a 0.5-15% range depending on device and industry. Treat 5-15% as the realistic envelope. — [Batch](https://batch.com/blog/posts/apple-web-push-ios16-4); [Notificare](https://notificare.com/blog/2023/03/27/web-push-in-ios-safari/); [MoEngage](https://www.moengage.com/learn/push-notification-statistics)
- Native-app games context (dated): Urban Airship Good Push Index 2013 (>2,400 apps, 500M messages): games averaged 35% opt-in, the lowest of six verticals, range 16%-92%; opted-in users retained about twice as often (55% vs 29% in month 1), games users opened the app ~35% more. Observational, vendor-sourced, 13 years old. A Kahuna analysis contradicted the games ranking. — [MediaPost on Urban Airship](https://www.mediapost.com/publications/article/216357/push-messaging-almost-doubles-user-retention-rate.html); [Airship](https://www.airship.com/?p=1837)
- Native-app opt-in is not a web proxy, but for orientation: Android opt-in fell from 85% to 67% after Android 13's runtime permission (Batch 2025 via Shno); Airship's 2026 benchmarks say Android/iOS opt-in is now near parity. — [Shno](https://www.shno.co/marketing-statistics/push-notification-statistics); [Airship 2026](https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/)

**Soft ask / pre-permission prompt**
- Soft ask = custom in-page message first; the browser prompt fires only on "yes". Reason: a denied browser permission cannot be re-requested by the site, and browsers throttle prompting. — [Airship](https://www.airship.com/blog/mobile-app-marketing-how-to-series-getting-the-opt-in); [Braze docs](https://www.braze.com/docs/developer_guide/platform_integration_guides/web/push_notifications/soft_push_prompt/)
- Lift evidence is vendor anecdotes: NHL +36% opt-ins after adding a soft ask (Airship case); Plotline claims 2-3x with priming (no methodology, treat as unverified). — [Airship](https://www.airship.com/blog/mobile-app-marketing-how-to-series-getting-the-opt-in); [Plotline](https://www.plotline.so/blog/how-to-improve-push-notification-opt-in-rates)
- Copy rules repeated across vendors: name the concrete benefit, offer "Not now" instead of a hard "No", only show the system prompt on yes, re-ask only on a new high-value trigger. Caveat from OneSignal: delaying the ask only works if notifications are not core to the experience (Words With Friends turn alerts example). — [AppMaster/TRTC/OneSignal summary via search](https://onesignal.com/blog/how-to-create-more-compelling-opt-in-messages-for-ios-push/)

**Timing of the ask**
- Google's own guidance: do not request on page load; tie the request to a relevant moment (order placed, several articles read, flight price search). — [Chrome for Developers, Jul 2026](https://developer.chrome.com/blog/notification-prompts-android)
- Facebook Games guidance: ask after a good experience, e.g. finishing early levels or setting a personal best; schedule notifications at session end and cancel pending ones at session start; drop stale timers. — [Meta games notification best practices](https://developers.facebook.com/documentation/games/retain/notifications/best-practices)
- Pushwoosh: games often prompt too early or without value explanation, hurting opt-in, especially on iOS. — [Pushwoosh](https://www.pushwoosh.com/blog/game-app-push-notifications/)
- Plotline: do not ask during onboarding; ask after the user has experienced value. — [Plotline](https://www.plotline.so/blog/how-to-improve-push-notification-opt-in-rates)
- I found no controlled study that compares "after first win" vs "after N sessions/streak" for web push opt-in.

**Chrome pressure on push senders**
- Oct 10, 2025 (Chrome for Android + desktop): Chrome auto-revokes notification permission for sites with very low engagement AND high notification volume; builds on Safety Check; user is notified and can re-grant; user can disable the feature; installed web apps are exempt. Google: "less than 1% of all notifications receive any interaction"; tests showed a significant drop in notification overload with minimal change in total clicks, and lower-volume sites saw more clicks. — [Google blog, 2025-10-10](https://blog.google/chromium/automatic-notification-permission/)
- Chrome 155 on Android (announced 2026-07-22): moves to a small, non-blocking prompt at the top that times out if ignored; users can subscribe later via Site Controls (entry only appears after the site has prompted). `requestPermission()` then resolves `'default'` on timeout, so code must handle that and watch `navigator.permissions.query({name:'notifications'})` `onchange` to subscribe when the state later becomes `'granted'`. Google says comprehension is similar and friction significantly lower; no numbers given. No release date stated. — [Chrome for Developers](https://developer.chrome.com/blog/notification-prompts-android); press: [Android Authority](https://www.androidauthority.com/chrome-android-redesigned-notification-prompts-3690645/)

**iOS / iPadOS Safari (16.4+)**
- Push works only for web apps added to the Home Screen with a manifest (`display` standalone/fullscreen); Safari tabs cannot request push permission; permission must be requested in response to a direct user interaction; managed per app in Notifications settings; uses Push API + Notifications API + Service Workers via APNs; Badging API (`setAppBadge`) works for the installed app and has its own toggle; sites without a qualifying manifest save as plain bookmarks that cannot use push. — [WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- EU: iOS 17.4 beta (Feb 2024) removed Home Screen web apps in the EU (breaking push), Apple reversed before release in early March 2024 and kept the existing capability; sources do not explicitly confirm push specifically returned, and I found nothing newer. One vendor guide claims push was removed in the EU; unverified. — [9to5Mac](https://9to5mac.com/2024/02/08/ios-17-4-web-app-eu/); [AlternativeTo](https://alternativeto.net/news/2024/3/apple-reverses-decision-to-remove-progressive-web-apps-from-ios-17-4-in-eu)
- Apple itself cited low user adoption of Home Screen web apps as a reason in the 2024 EU episode. — [AlternativeTo](https://alternativeto.net/news/2024/3/apple-reverses-decision-to-remove-progressive-web-apps-from-ios-17-4-in-eu)
- Vendors (Notificare, EngageLab) expect lower iOS web-push opt-in because of the install step, with no measured share of iPhone users who install. — [Notificare](https://notificare.com/blog/2023/03/27/web-push-in-ios-safari/)

### Inferences
- Realistic expectation for a no-account browser game: 3-12% of eligible (returning) players subscribing on Android Chrome/desktop with a good soft ask, well under that on iOS where the install is a gate. This is an estimate from the 5-15% vendor envelope and Chrome's 10-23% prompt-grant figures, not a measured game number. Measure your own funnel: soft ask shown, accepted, browser granted, first push delivered, clicked.
- Because a blocked permission is effectively permanent and Chrome quiets/auto-revokes weak senders, the soft ask is the main protection of the one real shot. The existing "offer once" design is right, but "once" should apply to the browser prompt, not to the soft ask; a declined soft ask should be re-askable on a later strong moment at no cost.
- The existing low volume (max 1 per 20 h, only meaningful events) is compatible with Chrome's auto-revoke criteria (low engagement AND high volume), because revocation targets noisy senders. Keep click rate healthy; if clicks per send are very low, that is the signal Chrome uses.
- For Chrome 155+, add handling for the `'default'` timeout and a `permissions.onchange` path; also expose an always-available toggle in Settings (already exists) so Site-Controls subscribers get a working subscription.

### Gaps
- No games-specific web push opt-in benchmark from 2023-2026; no OneSignal/PushEngage primary report found with method.
- No measured share of iPhone users who add a given site to the Home Screen.
- No data on web-push opt-in for "ask after first win vs. later" (only generic advice).
- Pushwoosh 2025 benchmark page could not be fetched (DNS error); only snippets of it were seen.

---

## 2. Notification types, timing, frequency; fatigue evidence

### Takeaway
Event-tied notifications (reward ready, streak at risk, timer finished, being overtaken) are what vendors and platform guidance recommend for games, but there is almost no public, rigorous evidence on frequency thresholds or per-type uplift; the only hard fatigue numbers are old self-reported surveys.

### Cited Findings
- Meta Games guidance: tie notifications to an event the player experienced (session end, start of a timed mechanic), cancel pending ones at next session start, cancel stale ones ("energy full" if player is back), because notifications about something no longer true erode trust. — [Meta](https://developers.facebook.com/documentation/games/retain/notifications/best-practices)
- Pushwoosh game case studies (self-reported): justDice streak-linked automated pushes reached CTRs up to 7.4%; a well-timed onboarding/welcome-bonus reminder cut early churn by 26%; Bladestorm daily/weekly offer pushes averaged 5.6% CTR (peak 28.21%) vs a stated game benchmark of 0.46-1.05%; Pushwoosh claims a linear correlation between push engagement and retention. Vendor numbers, no methodology. — [Pushwoosh](https://www.pushwoosh.com/blog/game-app-push-notifications/)
- Cross-industry CTR averages: ~2.25% (CleverTap 2025 via an aggregator); Pushwoosh 2025 (Q4 2024-Q2 2025) range 0.5%-7.4% by industry/platform. Airship reports "direct open rate", not CTR. — [Shno / Wisernotify aggregators](https://wisernotify.com/blog/push-notification-stats/); [Pushwoosh](https://www.pushwoosh.com/blog/push-notification-benchmarks/) (page not fetchable; figure from search snippet)
- Web view/display rate: Gravitec 2022 reports 35-60% view rate depending on industry; TTL and send time matter; its CTR is opened/delivered, different from CTR on sent. — [Gravitec](https://gravitec.net/blog/push-notification-performance-metrics/)
- Chrome's data point: <1% of all web notifications get any interaction. — [Google blog](https://blog.google/chromium/automatic-notification-permission/)
- Beach Bum Games (OneSignal case): a re-engagement opening about two minutes after a player quits. — [OneSignal case study](https://onesignal.com/case-studies/beach-bum-games-case-study) (via search summary)
- Localytics survey (2017, 1,000 US smartphone users, self-reported): would disable notifications at 1 per week: 10%; 2-5 per week: 37%; 6-10 per week: 33%. Localytics behavioural data could not pinpoint a threshold; app abandonment peaked at 6-10 pushes per week. — [Localytics/Upland](https://uplandsoftware.com/localytics/?p=3498); [MarketingProfs](https://www.marketingprofs.com/charts/2018/33486/how-many-mobile-push-notifications-are-too-many)
- Airship argues against a universal cap (expectations set at opt-in matter); Braze says high-interruption channels accelerate opt-outs faster than campaign metrics show; neither gives a threshold. — [Airship benchmarks](https://www.airship.com/blog/a-marketers-guide-to-push-notification-benchmarks/); [Braze frequency capping](https://www.braze.com/resources/articles/whats-frequency-capping.md)
- Duolingo (secondary write-ups): personalised, goal-tied push copy instead of generic "come back" gave a ~5% DAU increase (Taplytics, vendor); retention is most fragile in the first 7 days; simplifying streaks to "complete one lesson" and letting users choose a streak goal raised retention (Lenny's Newsletter summary). No Duolingo-published fatigue data found. — [Taplytics](https://taplytics.com/blog/how-duolingo-ran-an-experiment-on-their-streaks-feature); [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- Airship 2026 (681 billion pushes, >3 billion users, 15 verticals): Android median/low-tier senders cut monthly volume 15% YoY while the top tier increased volume; gaming-vertical figures are in the gated report. — [Airship](https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/)

### Inferences
- The current rule set (one per 20 h, quiet hours 21-09, only five meaningful categories, no marketing) sits far below every cited fatigue range (2-5/week and up). Fatigue is unlikely to be the binding constraint; permission count and click rate are.
- Type ranking by plausibility (evidence is vendor/logic-based, not tested): (1) reward ready/timer finished and streak-at-risk, because they are tied to a player-owned promise; (2) social overtake, because it is personal and specific; (3) comeback nudges, whose value is highest but whose opt-out risk is highest, so keep the 3/7/14/30 ladder and stop after 30 days; (4) new season pass, a broadcast event, lowest priority.
- Send-time: schedule streak/reward reminders relative to the player's own typical play hour (fuzzy per-user timing) rather than a fixed hour; cancel on session start (Meta guidance).
- A/B holdout is the only reliable way to quantify uplift; build a persistent 10% no-push holdout and compare D7/D30 return.

### Gaps
- No public evidence on per-type uplift (streak-at-risk vs reward vs overtake) for casual or browser games.
- No behavioural (non-survey) opt-out-by-frequency curves from Airship/Braze/OneSignal.
- Gaming-specific 2025/2026 Airship benchmark values are gated.

---

## 3. Is streak 2 too late as the first opt-in trigger?

### Takeaway
No study answers this directly. Guidance (Meta, Google, Plotline) says ask right after a demonstrated success and before the user drifts away; a streak-2 gate catches only players who already returned once, which is a quality filter but excludes the largest and most push-valuable group (one-session players). A two-stage approach is better supported than a single late ask.

### Cited Findings
- Meta: ask after a good experience like finishing early levels or a personal best. — [Meta](https://developers.facebook.com/documentation/games/retain/notifications/best-practices)
- Google: tie the request to a relevant moment; examples are post-action alerts for something the user wants. — [Chrome for Developers](https://developer.chrome.com/blog/notification-prompts-android)
- Duolingo: retention is most fragile in the first 7 days; surviving week 1 raises long-term retention odds. — [Lenny's Newsletter summary](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- Pushwoosh claims a game reduced early churn 26% via a well-timed reminder of a welcome bonus (self-reported). — [Pushwoosh](https://www.pushwoosh.com/blog/game-app-push-notifications/)
- Urban Airship 2013: opt-in users retained ~2x in month 1, but the gap closes by month 6; observational. — [MediaPost](https://www.mediapost.com/publications/article/216357/push-messaging-almost-doubles-user-retention-rate.html)
- Plotline: priming after value moment, not onboarding (unverified numbers). — [Plotline](https://www.plotline.so/blog/how-to-improve-push-notification-opt-in-rates)

### Inferences
- Streak 2 means the player already came back, so the ask is highly credible ("keep your streak"), acceptance is probably higher than for a day-0 cold ask, and the browser prompt is spent on an engaged user. That is a strength (also helps against Chrome's quiet UI, which targets low-acceptance sites).
- The weakness: the players push is most likely to rescue are those who played once and did not come back; they never see the offer. Proposed: a lightweight soft ask after the first clearly positive moment (e.g. first shift cleared, new personal best, first chest earned) phrased around a concrete one-time benefit ("tell me when my free chest is ready"), with "Not now" free to re-ask at streak 2 and a later milestone. Only the browser prompt, never the soft ask, is single-shot.
- Cap the number of soft asks (e.g. 3 over the first 14 days) to avoid nagging.
- On iOS Safari tabs the soft ask should instead be an "Add to Home Screen" explainer (see section 4), since push cannot be requested there.
- Test with an A/B: ask at first-win vs streak-2 vs both, measure granted push users per 100 new players and D7/D30 return, not just opt-in rate.

### Gaps
- No experiment data on first-session vs later asks for web push.
- Day-1 retention for this game would be needed to size how many players never reach streak 2 (not in scope of public sources).

---

## 4. PWA install: prompt conversion, `beforeinstallprompt` practice, retention effect

### Takeaway
Public data on absolute install-prompt conversion is almost nonexistent; the available evidence is Chrome's relative gains from better install UX, a few vendor case studies of large relative retention lifts (Rakuten 24), and selection-biased comparisons. Installed PWAs have two concrete advantages for a push-based strategy: Chrome's auto-revoke exempts installed web apps, and iOS push requires installation.

### Cited Findings
- Chrome install UX (2020 initiative): install and engagement of installed PWAs rose >100%; in-product help for engaged users gave >100% install increase on desktop; new install icon more than doubled installs; Richer Install UI on Android doubled installs for some PWAs. Relative changes only. Recommended label "Install"; show to engaged users, not first-time visitors. — [Chrome for Developers](https://developer.chrome.com/blog/pwa-install-features)
- Chrome Android ML-based install prompt experiment (2026 W3C thread by a Chrome engineer): ML criteria cut prompt show rate ~70% (table says -71%), kept install rates about the same; prompt CTR rose 1.2% -> 3.2%; 4% increase in WebAPK launches with about the same number installed. Data partly redacted, internal experiment. Desktop omnibox install icon CTR ~0.01% (different experiment). — [W3C public-webapps, Jan-Mar 2026](https://lists.w3.org/Archives/Public/public-webapps/2026JanMar/0015.html)
- Rakuten 24 (web.dev case study, custom prompt via `beforeinstallprompt`): +450% visitor retention vs previous mobile web flow, +310% visit frequency vs other web users, +150% sales per customer, +200% conversion, over 1 month. Compares new installable flow to the old flow, vendor/Google-published, no absolute rates. — [web.dev](https://web.dev/case-studies/rakuten-24)
- Indie developer (Indie Hackers, party game PWA, 6 months of data): install rate for the PWA prompt "in low single digits"; most users bookmark or reopen from chat history. Seen via search summary only (page returned 403 on fetch). — [Indie Hackers](https://www.indiehackers.com/post/pwa-vs-native-app-for-a-party-game-what-6-months-of-data-say-about-retention-da126462bb)
- Pinterest / Twitter Lite old Google case studies (+40-60% engagement, Twitter Lite +65% pages/session, -20% bounce, +75% tweets) are cited by secondary blogs only and compare PWA to mobile web, not installed to non-installed users. Not verified against web.dev. — [dev.to summary](https://dev.to/rabitsolutions/8-famous-examples-of-pwa-development-done-right-3nad)
- Unsourced marketing claims ("2-3x retention", "3x time spent for installed") found; no primary source; do not use. Selection bias makes installed-vs-not comparisons unreliable. — [arXiv 2511.14611 (cites an unnamed reference)](https://arxiv.org/pdf/2511.14611)
- Measurement: Chrome/Edge expose `beforeinstallprompt` (`userChoice`) and `appinstalled`; Safari has neither, so iOS installs are hard to track (detect standalone via `display-mode`/`navigator.standalone`). — [search summary of web.dev/MDN guidance](https://web.dev/learn/pwa/installation)
- Chrome auto-revoke exempts installed web apps. — [Google blog](https://blog.google/chromium/automatic-notification-permission/)
- Badging API: `navigator.setAppBadge()` only works for installed PWAs; supported in Chrome/Edge on Windows and macOS (desktop installs), not on Android Chromium (Android auto-shows a badge for unread notifications); supported on iOS/iPadOS 16.4+ for Home Screen apps, with notification permission required; callable from the service worker. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Display_badge_on_app_icon)

### Inferences
- Treat install as a separate, later ask than push: show the custom install prompt after a clearly successful session (not first visit), fire it from the captured `beforeinstallprompt` on a user gesture, and keep a manual iOS instruction sheet (Share -> Add to Home Screen) because no event exists there.
- Expect low single-digit install conversion of all visitors (Indie Hackers anecdote); the relevant metric is installs per returning player, and launches from standalone mode vs tab.
- Installed users are self-selected; to show a causal retention effect, run a randomised prompt A/B instead of comparing installers to non-installers.
- Strategic angle: for iOS the install step is the true gate to push, so the iOS flow should be "install first, then ask for notifications inside the installed app", and the Android flow "soft ask -> browser prompt", with install prompt later as a way to also escape Chrome auto-revoke.

### Gaps
- No credible, recent absolute install-prompt conversion benchmarks; no game-specific installed-vs-tab retention numbers.
- Starbucks case study figures not found in primary form.
- Original web.dev Pinterest/Twitter Lite pages not retrieved (404 on the URL tried).

---

## 5. Alternative owned channels for anonymous-player games, and EU privacy implications

### Takeaway
For a no-account game the realistic complements to push are: install (badging, launcher presence), an optional email via the existing cloud-save sync flow, in-game "what's new/ready" surfaces, and the Google Play TWA. Email and calendar approaches have thin public evidence for games. In the EU, push subscriptions and any email need explicit opt-in consent and easy withdrawal.

### Cited Findings
**Email**
- Only quantitative game-email data found is old: a Kabam session (Casual Connect, 2012) reported 7-day retention over holdout rising from 5% to 7% from emails; advice: set expectations at signup, welcome message at once, segment active vs lapsed, easy unsubscribe, event-based timing beats generic. Vendor/age caveat. — [Adrian Crook summary](https://adriancrook.com/email-marketing-tactics-to-drive-player-engagement-and-retention/)
- No browser-game postmortem found with email or push opt-in numbers. An itch.io devlog describes in-game fictional mail as a return hook without needing an address (anecdote). — [itch.io](https://itch.io/post/16649950)

**Calendar / ICS, Web Share, bookmark prompts**
- I found no sources with measured effect for ICS reminders, Web Share, or bookmark prompts in games. See Gaps.

**Badging API** — see section 4 (installed PWAs only; Android auto-badges for notifications; iOS needs notification permission).

**Google Play TWA**
- OYO (web.dev): native Android app had 3x the conversion of the PWA, but users uninstalled over storage concerns; OYO Lite TWA (850 KB, ~7% of native size) delivered 3x PWA conversion and 3x logged-in users; single codebase. Google-published, no uninstall/D30 numbers. — [web.dev OYO Lite](https://web.dev/case-studies/oyo-lite-twa)
- TWA push: subscription made in the browser does not carry over; the user must subscribe inside the installed TWA (notifications opened in-browser if subscribed there). TWA falls back to a Custom Tab if Chrome is too old. Notification delegation behaviour was an open question in the sources. — [GitHub issue svgomg-twa #60](https://github.com/GoogleChromeLabs/svgomg-twa/issues/60)
- TWA is a store-listing and launcher-icon channel; Android shows a badge on the icon for unread notifications for installed web apps. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Display_badge_on_app_icon)

**GDPR / ePrivacy (practitioner positions, not regulator guidance)**
- Push vendors treat consent as the legal basis under GDPR Art. 6 and ePrivacy Art. 5(3) for subscribers; the browser permission is one consent layer, marketing use needs additional consent; service worker + device storage for subscriber identification fall under ePrivacy; withdrawal must be as easy as opt-in; keep consent records; collect only what is necessary (token, not name/email). — [ConsentStack](https://www.consentstack.io/vendors/subscribers); [iZooto](https://www.izooto.com/blog/web-push-notifications-gdpr)
- Whether a push endpoint is personal data is disputed across providers (one stores it as linked to a person only in limited cases; another claims no recognisable data). — [WonderPush](https://docs.wonderpush.com/docs/gdpr-compliance); [CleverPush](https://cleverpush.com/en/gdpr/)
- My search did not return EDPB/CNIL/CJEU primary guidance on push subscriptions; the Planet49 (2019) rule of active specific consent is general knowledge, not verified in this session.

### Inferences
- Because the project already runs a Sync-Code cloud save, an optional "email me my code/streak recovery" is a natural value-first email collection point (magic-link or recovery email). It must be explicit opt-in, separate from marketing consent, and stored only if needed; an email that is only a recovery channel is a lighter privacy footprint than a newsletter. This is a design suggestion, not a researched best practice.
- Privacy footprint of the existing push design is low (token on server, no name/email); the privacy policy already mentions services, so add the push endpoint and its retention to it (project rule: new data-receiving service = new legal paragraph).
- Cheap in-game "return hooks" (daily reward visible on the title screen, a "next free chest in 3h" timer, "you were overtaken" badge on the leaderboard tab when the app opens) cost nothing in permissions and catch players who decline push; use `setAppBadge()` on desktop/iOS installs for the same signals when installed.
- For Play TWA players: ask for push inside the TWA, and treat Play listing + launcher icon as a retention channel in itself (OYO suggests store-installed users convert better), but OYO is e-commerce.

### Gaps
- No measured effect found for ICS/calendar reminders, Web Share-driven re-engagement, bookmark prompts, or email magic links for anonymous browser games.
- No regulator-level EU guidance retrieved for web push consent; Art. 5(3) strict-necessity argument unverified here.
- No Play-Store-retention numbers for TWA games.

---

## 6. Limits: what does not work

### Takeaway
Web push in iOS Safari tabs, in cross-origin iframes (CrazyGames, itch.io embeds), and with weak-engagement high-volume senders (Chrome auto-revoke) is unavailable or unreliable. Treat portal traffic as an acquisition channel to convert onto the own site or install, not as a push channel.

### Cited Findings
- iOS: Safari tabs cannot request web push; needs Home Screen install and a user gesture. — [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Cross-origin iframes: Firefox bug 1560741 documents that notification permission requests from cross-origin iframes are denied, noting Chrome made a similar change earlier (2019 tracker entry; verify current behaviour). A portal game runs in such an iframe unless the iframe is granted a permissions policy; notifications from the portal origin would belong to the portal, not the game. — [Mozilla bug 1560741](https://bugzil.la/1560741)
- CrazyGames requirements: no cross-promotion of external games/platforms; community links (Discord, dev site) only on the game menu and only if they do not lead directly to a playable web version; no external login; custom fullscreen buttons prohibited. I found no CrazyGames rule on notifications; assume push is not available there. — [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Chrome auto-revoke/quiet UI penalise low-engagement, high-volume senders; installed apps exempt. — [Google blog](https://blog.google/chromium/automatic-notification-permission/)
- Chrome 155 Android prompt can time out, so a single ignored prompt no longer equals a decision and requestPermission code that assumes grant/deny breaks. — [Chrome for Developers](https://developer.chrome.com/blog/notification-prompts-android)
- Badging does not work on Android Chromium via API and not on Linux; desktop Safari/Firefox cannot install PWAs. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Display_badge_on_app_icon)
- TWA: Chrome must be installed and recent; otherwise falls back to Custom Tab (push may be affected). Browser-subscribed push does not transfer to the TWA. — [GitHub issue](https://github.com/GoogleChromeLabs/svgomg-twa/issues/60)

### Inferences
- On CrazyGames/itch.io embeds, do not show push or install soft asks; use the portal's SDK-permitted surfaces only. Existing project rules already hide Install and CrazyGames links in the Play app (`inPlayStore`) and avoid analytics on portals; extending "no push offer in iframes" (check `window !== window.top` or the `?crazygames` flag) avoids showing a prompt that cannot work and is a nuisance to portal reviewers (project context: CrazyGames rejected 09.10.2026 for a different reason).
- Confirm with CrazyGames support whether any permission/notification policy exists before attempting it.

### Gaps
- Current (2026) Chrome behaviour for notification permission in cross-origin iframes with `allow="notifications"` was not verified.
- No itch.io-specific documentation on permissions for embedded games was found.
