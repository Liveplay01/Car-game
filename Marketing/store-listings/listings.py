# Builds TEXTS.md from this table and checks Play Store limits. python listings.py
BODY = """HOW IT PLAYS
Cars flow around the roundabout. Tap once to send the next car in. Hit the gap and you merge. Miss it and you crash. Easy to learn, hard to put down.

WHAT YOU GET
- One-tap timing with combos, perfect inputs and near misses
- Police chases with rising wanted levels
- Boss convoys that need three cars lined up
- Real crash physics: impact, tyre grip and bent metal, nothing scripted
- Seasonal maps: snow, sakura, tropics and more
- Hundreds of skins and ride types, chests with the odds always shown
- Street builder, upgrades, daily shifts, goals and trials
- Plays offline after the first launch
- 8 languages: English, Deutsch, Español, Français, Italiano, 日本語, 한국어, 中文

FAIR BY DESIGN
No forced ads. Rewarded ads are optional and only on tap. No real-money chests. The Arcade uses in-game coins only.

Tap. Merge. Don't crash."""

L = [
 ("timing", "Keyword: one tap game, timing game, reaction game, tap game",
  "One-tap timing at the roundabout. Tap. Merge. Don't crash.",
  "One tap. Pure timing.\nRead the gap, tap once, merge in. Chain perfect inputs for combos and watch your score multiply."),
 ("police", "Keyword: police chase game, car chase, cop game",
  "Outrun the police. Squeeze through near misses and push your wanted level.",
  "Outrun the police.\nEvery near miss raises your wanted level. Slip through tight gaps, bust armoured convoys and call in backup."),
 ("bosses", "Keyword: boss fight game, boss battle, convoy",
  "Take down armoured convoys. One tap. Three cars lined up. Perfect timing.",
  "Take down the bosses.\nArmoured convoys need three cars lined up. Time the ring, trap the boss and log every bust in your museum."),
 ("crash", "Keyword: car crash game, crash simulator, traffic crash, physics game",
  "Real crash physics at the roundabout. Merge perfectly or watch it all go wrong.",
  "Real crash physics.\nImpact, tyre grip, reacting traffic and bent metal. Every pile-up plays out differently, nothing is scripted."),
 ("mayhem", "Keyword: destruction game, wreck game, car smash",
  "Cause mayhem. A mode where crashing is the point. Real physics, real wrecks.",
  "Cause mayhem.\nSwitch to Mayhem and break everything with real physics. Chain reactions, spinouts, wrecks that look different every time."),
 ("seasons", "Keyword: snow game, seasonal, map variety; also country CSLs",
  "Snow, sakura, tropics and more. Every season brings new roads to master.",
  "Every season, new roads.\nSnow, sakura nights, palm-lined tropics and desert convoys. Same tight timing, fresh maps to master."),
 ("collection", "Keyword: car collection game, skins, collect cars",
  "Collect every ride. Skins, maps and more to find. Chest odds always shown.",
  "Collect every ride.\nOpen chests, win skins and complete the collection. Odds are always shown, and your skins ride on the road."),
 ("builder", "Keyword: city builder, road builder, tycoon; URL param for builder reels",
  "Build your own streets: toll booths, cameras, detour signs. One-tap timing.",
  "Build your own streets.\nPlace toll booths, speed cameras and detour signs, then upgrade your patrol. Every shift pays into your city."),
 ("upgrades", "Keyword: upgrade game, idle upgrades, progression",
  "Upgrade your patrol: faster radios, more backup. One-tap timing.",
  "Upgrade your patrol.\nFaster radios, longer pursuits, more backup. Goals and trials keep every shift moving toward the next upgrade."),
 ("mafia", "Keyword: mafia game, gangster game; not for CrazyGames traffic",
  "Borrow from the Family. Time the pointer, pay it back. One-tap timing.",
  "Borrow from the Family.\nPick a loan, stop the pointer in the green zone and pay it back in time. The nearer the middle, the kinder the deal."),
 ("arcade", "Keyword: arcade game, chest game, collect skins; play money only",
  "The Arcade is open: crash, slots and more. In-game coins only.",
  "The Arcade is open.\nSpend your in-game coins on Crash, slots and the Club auction. Play money only, no real-money purchases."),
 ("daily", "Keyword: daily game, casual game, quick game; inactive-user CSL",
  "One shift a day. Keep your streak, finish goals and open a free chest tomorrow.",
  "One shift a day.\nKeep your streak alive, clear goals, trials and weekly runs, and come back for a free chest. Perfect for a quick break."),
 ("offline", "Keyword: offline game, no wifi game, free game no ads",
  "Play offline. Free to play, one thumb, optional rewarded ads only. Tap. Merge.",
  "Play anywhere, even offline.\nNo signal needed after the first launch. Open it, tap, you're driving. Ads are optional and only on tap."),
]
out = ["# Custom Store Listings: Roundabout Timing\n",
 "Images: `Marketing/store-listings/<id>/1..4`. Rebuild: `cd Marketing/trailer/capture; node compose-csl.mjs [id]`. Source: `capture/csl.json`.",
 "Play limits: name 30, short description 80, full description 4000. App name stays `Roundabout Timing` on every listing.\n"]
bad = False
for i, t, short, intro in L:
    full = intro + "\n\n" + BODY
    if len(short) > 80 or len(full) > 4000:
        bad = True
    out.append(f"## {i}\nTrigger: {t}\n\nShort ({len(short)}): {short}\n\nFull ({len(full)}):\n```\n{full}\n```\n")
open("TEXTS.md", "w", encoding="utf8").write("\n".join(out))
print("OVER LIMIT" if bad else "ok", [len(s) for _, _, s, _ in L])
