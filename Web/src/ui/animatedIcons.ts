/**
 * Animated icons (Leo, 20.10.2026): 24×24, stroke icons in `currentColor`. Every icon is cut into named parts and each part
 * moves like the real thing would; the motion starts with the class `play` (once) or `loop` on the `<svg>` (`animatedIcon`,
 * `playIcon` in `dom.ts`). Class, keyframe and clip names are global and carry the icon's id. New icons are drawn the way
 * the existing ones are, see `Car Game Icon Animation/icon-pack/CLAUDE-ICONS.md`.
 */
const wrap = (id: string, style: string, body: string): string =>
  `<svg class="ai ai-${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true"><style>${style}.ai-${id}.loop *{animation-iteration-count:infinite!important}@media (prefers-reduced-motion:reduce){.ai-${id} *{animation:none!important}}</style>${body}</svg>`;
const on = (id: string, sel: string, name: string, dur: string, ease = 'cubic-bezier(.23,1,.32,1)', delay = '0s'): string =>
  `.ai-${id}.play ${sel},.ai-${id}.loop ${sel}{animation:${name} ${dur} ${ease} ${delay} both}`;
const fb = 'transform-box:fill-box;';
const vb = 'transform-box:view-box;';

const coin = wrap('coin',
  `.ai-coin .spin{${fb}transform-origin:center}.ai-coin .shine{opacity:0}.ai-coin .spark{${fb}transform-origin:center;transform:scale(0)}` +
  on('coin', '.shine', 'aiCoinShine', '2.6s', 'ease-in-out') + on('coin', '.spark', 'aiCoinSpark', '2.6s', 'ease-out') +
  `@keyframes aiCoinShine{0%,10%{opacity:0;transform:translateX(0)}14%{opacity:.75}40%{opacity:.75;transform:translateX(26px)}44%,100%{opacity:0;transform:translateX(26px)}}` +
  `@keyframes aiCoinSpark{0%,34%{transform:scale(0) rotate(0)}44%{transform:scale(1.15) rotate(45deg)}60%,100%{transform:scale(0) rotate(90deg)}}`,
  `<defs><clipPath id="aiCoinClip"><circle cx="12" cy="12" r="9.5"/></clipPath></defs>
<g class="spin" stroke="none"><circle cx="12" cy="12" r="9.5" fill="#E3C15A"/><circle cx="12" cy="12" r="9" fill="none" stroke="#B8932F" stroke-width="1"/><circle cx="12" cy="12" r="6" fill="none" stroke="#785C14" stroke-opacity=".55" stroke-width="1.6"/>
<g clip-path="url(#aiCoinClip)"><g transform="rotate(25 12 12)"><rect class="shine" x="-7" y="-6" width="3.6" height="36" fill="#FFF8E1"/></g></g></g>
<path class="spark" stroke="none" fill="#FFF1D0" d="M19.6 1.6l.75 1.85 1.85.75-1.85.75-.75 1.85-.75-1.85L17 4.2l1.85-.75z"/>`);

const flameA = 'M12 2.5C13.2 6.2 18.2 8.6 18.2 14.2C18.2 17.8 15.4 21 12 21C8.6 21 5.8 17.8 5.8 14.2C5.8 11.6 7.2 9.6 8.9 8.3C9.2 10 9.9 11 11 11.5C10.6 8.2 11 5.2 12 2.5Z';
const flameB = 'M13 2.2C13.6 6 18.6 8.8 18.2 14.4C18 17.9 15.3 21 12 21C8.7 21 5.9 17.9 5.9 14.3C5.9 11.2 7.6 9.2 9.4 7.6C9.6 9.6 10.3 10.7 11.3 11.1C11.1 7.8 11.8 4.8 13 2.2Z';
const flameC = 'M11.2 2.8C12.6 6.4 17.8 8.4 18.1 14C18.3 17.7 15.5 21 12 21C8.5 21 5.7 17.8 5.7 14.1C5.7 11.8 6.9 10 8.4 8.8C8.9 10.4 9.6 11.3 10.6 11.7C10 8.5 10.2 5.4 11.2 2.8Z';
const coreA = 'M12 11C13.2 12.8 15.2 14 15.2 16.6C15.2 18.6 13.8 20 12 20C10.2 20 8.8 18.6 8.8 16.6C8.8 14.8 10 13.6 11 12.8C11.2 13.6 11.6 14 12 14.1C11.8 13 11.8 12 12 11Z';
const coreB = 'M12.6 10.4C13.6 12.6 15.4 14 15.3 16.7C15.2 18.7 13.8 20 12 20C10.2 20 8.7 18.6 8.8 16.5C8.9 14.6 10.2 13.4 11.3 12.5C11.5 13.4 11.9 13.8 12.3 13.9C12.1 12.8 12.2 11.6 12.6 10.4Z';
const coreC = 'M11.5 11.4C12.8 13 15 14.1 15.1 16.5C15.2 18.6 13.8 20 12 20C10.2 20 8.8 18.6 8.9 16.7C9 15 9.9 14 10.7 13.2C11 14 11.3 14.3 11.7 14.4C11.4 13.3 11.3 12.3 11.5 11.4Z';
const morph = (vals: string[], dur: string): string => `<animate attributeName="d" dur="${dur}" repeatCount="indefinite" calcMode="spline" keyTimes="0;.33;.66;1" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1" values="${vals.join(';')}"/>`;
const heat = wrap('heat',
  `.ai-heat .fl{${fb}transform-origin:50% 100%}.ai-heat .e{${fb}transform-origin:center;opacity:0;animation:aiHeatEmber 1.9s ease-out infinite}.ai-heat .e2{animation-duration:2.2s;animation-delay:.7s}.ai-heat .e3{animation-duration:1.6s;animation-delay:1.2s}` +
  on('heat', '.fl', 'aiHeatBurst', '.6s') +
  `@keyframes aiHeatEmber{0%{opacity:0;transform:translate(0,2px) scale(1)}20%{opacity:1}100%{opacity:0;transform:translate(1.4px,-7px) scale(.4)}}` +
  `@keyframes aiHeatBurst{0%{transform:scale(1)}30%{transform:scale(1.18,1.26)}60%{transform:scale(.96,.94)}100%{transform:scale(1)}}`,
  `<g class="fl" stroke="none">
<path fill="#C2362B" transform="matrix(1.08 0 0 1.04 -.96 -.84)" d="${flameC}">${morph([flameC, flameA, flameB, flameC], '1.5s')}</path>
<path fill="#FF7A3D" d="${flameA}">${morph([flameA, flameB, flameC, flameA], '1.2s')}</path>
<path fill="#FFE08A" d="${coreA}">${morph([coreA, coreC, coreB, coreA], '.9s')}</path></g>
<circle class="e e1" cx="9" cy="7" r=".9" fill="#FFE08A" stroke="none"/><circle class="e e2" cx="15.6" cy="8.6" r=".7" fill="#FF7A3D" stroke="none"/><circle class="e e3" cx="12.6" cy="3.6" r=".6" fill="#FFE08A" stroke="none"/>`);

const streak = wrap('streak',
  `.ai-streak .sheet{${fb}transform-origin:50% 0;transform:scaleY(0)}.ai-streak .ck{stroke-dasharray:1 1;stroke-dashoffset:0}.ai-streak .r{${fb}transform-origin:center}` +
  on('streak', '.sheet', 'aiStrSheet', '1.8s', 'cubic-bezier(.5,0,.3,1)') + on('streak', '.ck', 'aiStrCheck', '1.8s', 'ease-out') +
  on('streak', '.r1', 'aiStrRing', '1.8s', 'ease-out') + on('streak', '.r2', 'aiStrRing', '1.8s', 'ease-out', '.08s') +
  `@keyframes aiStrSheet{0%{transform:scaleY(1);opacity:.4}10%{transform:scaleY(1);opacity:.4}34%{transform:scaleY(0);opacity:.15}100%{transform:scaleY(0)}}` +
  `@keyframes aiStrCheck{0%,34%{stroke-dashoffset:1}58%,100%{stroke-dashoffset:0}}` +
  `@keyframes aiStrRing{0%{transform:translateY(0)}8%{transform:translateY(-1.6px)}18%,100%{transform:translateY(0)}}`,
  `<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16"/><path class="r r1" d="M8 3v4"/><path class="r r2" d="M16 3v4"/>
<rect class="sheet" x="4.9" y="10.9" width="14.2" height="8.2" rx="1.6" fill="currentColor" stroke="none"/>
<path class="ck" pathLength="1" d="M9 15.2l2 2 4-4.2"/>`);

const chest = wrap('chest',
  // Each chest keeps its outline (`ShopPage.addChestIcon`): `data-kind` on the svg picks the parts.
  `.ai-chest .dome,.ai-chest .gift,.ai-chest .gold,.ai-chest .star,.ai-chest[data-kind=premium] .lid .plain,.ai-chest[data-kind=event] .plain,.ai-chest[data-kind=event] .bands,.ai-chest[data-kind=event] .seam,.ai-chest[data-kind=criminalHunt] .lock .plain{display:none}` +
  `.ai-chest[data-kind=premium] .dome,.ai-chest[data-kind=premium] .gold,.ai-chest[data-kind=event] .gift,.ai-chest[data-kind=criminalHunt] .star{display:inline}` +
  `.ai-chest .lid{${fb}transform-origin:0 100%}.ai-chest .lock{${fb}transform-origin:50% 0}.ai-chest .body{${fb}transform-origin:50% 100%}.ai-chest .glow,.ai-chest .rays{${fb}transform-origin:50% 100%;opacity:0}` +
  on('chest', '.lid', 'aiChLid', '2.2s', 'cubic-bezier(.3,0,.2,1)') + on('chest', '.lock', 'aiChLock', '2.2s', 'ease-in-out') + on('chest', '.body', 'aiChBody', '2.2s', 'ease-out') +
  on('chest', '.glow', 'aiChGlow', '2.2s', 'ease-out') + on('chest', '.rays', 'aiChRays', '2.2s', 'ease-out') +
  `@keyframes aiChLock{0%{transform:rotate(0)}6%{transform:rotate(-14deg)}12%{transform:rotate(11deg)}18%{transform:rotate(-6deg)}24%,100%{transform:rotate(0)}}` +
  `@keyframes aiChLid{0%,24%{transform:none}34%{transform:translateY(-12px) rotate(-12deg)}62%{transform:translateY(-10px) rotate(-10deg)}74%{transform:none}79%{transform:translateY(-2px)}84%,100%{transform:none}}` +
  `@keyframes aiChBody{0%,72%{transform:none}76%{transform:scale(1.04,.93)}84%,100%{transform:none}}` +
  `@keyframes aiChGlow{0%,26%{opacity:0;transform:scale(.4)}36%{opacity:.6;transform:scale(1)}62%{opacity:.45;transform:scale(1.05)}74%,100%{opacity:0;transform:scale(.6)}}` +
  `@keyframes aiChRays{0%,28%{opacity:0;transform:scale(.2)}40%{opacity:1;transform:scale(1)}60%{opacity:.8;transform:scale(1.08)}72%,100%{opacity:0;transform:scale(1.15)}}`,
  `<g transform="translate(1 2.6) scale(.423)" stroke="none">
<ellipse class="glow" cx="26" cy="19" rx="22" ry="11" fill="#FFE08A"/>
<g class="rays" stroke="#FFE08A" stroke-width="3.4" stroke-linecap="round"><path d="M26 13V1M16 14 10 5M36 14l6-9"/></g>
<g class="body"><rect y="19" width="52" height="28" rx="5" fill="var(--chest-body,#3B2C55)"/><path class="bands" d="M8 19h5v28H8zM39 19h5v28h-5z" fill="var(--chest-band,#E3C15A)" fill-opacity=".75"/>
<rect class="gift" x="22" y="19" width="8" height="28" fill="var(--chest-band,#E3C15A)" fill-opacity=".9"/><path class="gold" d="M-1 18h7v7h-7zM46 18h7v7h-7zM-1 41h7v7h-7zM46 41h7v7h-7z" fill="var(--chest-band,#E3C15A)"/></g>
<g class="lid"><g class="plain"><path d="M0 19V11A10 10 0 0 1 10 1h32a10 10 0 0 1 10 10v8Z" fill="var(--chest-lid,#4C3A6B)"/><path d="M8 1h5v18H8zM39 1h5v18h-5z" fill="var(--chest-band,#E3C15A)" fill-opacity=".75"/></g>
<g class="dome"><path d="M0 19V8A13 13 0 0 1 13 -5h26a13 13 0 0 1 13 13v11Z" fill="var(--chest-lid,#4C3A6B)"/><path d="M8 -5h5v24H8zM39 -5h5v24h-5z" fill="var(--chest-band,#E3C15A)" fill-opacity=".75"/></g>
<rect class="seam" y="17" width="52" height="5" fill="var(--chest-band,#E3C15A)" fill-opacity=".9"/>
<g class="gift"><rect x="-3" y="8.5" width="58" height="11" rx="2.5" fill="var(--chest-lid,#4C3A6B)"/><rect x="22" y="8.5" width="8" height="11" fill="var(--chest-band,#E3C15A)" fill-opacity=".9"/><g fill="var(--chest-band,#E3C15A)"><rect x="25.3" y="-0.55" width="14" height="9" rx="4.5" transform="rotate(-25.8 32.3 3.95)"/><rect x="12.7" y="-0.55" width="14" height="9" rx="4.5" transform="rotate(25.8 19.7 3.95)"/><circle cx="26" cy="7" r="3.8"/></g></g></g>
<g class="lock"><rect class="plain" x="21" y="15" width="10" height="12" rx="2.5" fill="var(--chest-band,#E3C15A)"/><circle class="plain" cx="26" cy="21" r="2" fill="var(--chest-body,#3B2C55)"/>
<g class="star"><circle cx="26" cy="21" r="8" fill="var(--chest-band,#E3C15A)"/><path d="M26 15.5L27.45 19L31.23 19.3L28.35 21.76L29.23 25.45L26 23.48L22.77 25.45L23.65 21.76L20.77 19.3L24.55 19Z" fill="var(--chest-body,#3B2C55)"/></g></g></g>`);

const progress = wrap('progress',
  `.ai-progress .cup{${fb}transform-origin:50% 100%}.ai-progress .sp{${fb}transform-origin:center;transform:scale(0)}.ai-progress .shine{opacity:0}` +
  on('progress', '.cup', 'aiPrCup', '1.6s') + on('progress', '.s1', 'aiPrSp', '1.6s', 'ease-out') + on('progress', '.s2', 'aiPrSp', '1.6s', 'ease-out', '.12s') + on('progress', '.shine', 'aiPrShine', '1.6s', 'ease-out') +
  `@keyframes aiPrCup{0%{transform:none}10%{transform:translateY(1px) scale(1.06,.9)}28%{transform:translateY(-3px) rotate(-8deg) scale(.96,1.06)}42%{transform:translateY(-3px) rotate(8deg)}56%{transform:scale(1.04,.95)}66%,100%{transform:none}}` +
  `@keyframes aiPrSp{0%,24%{transform:scale(0) rotate(0)}36%{transform:scale(1.2) rotate(45deg)}54%,100%{transform:scale(0) rotate(90deg)}}` +
  `@keyframes aiPrShine{0%,26%{opacity:0}36%{opacity:1}60%,100%{opacity:0}}`,
  `<path d="M8 21h8M12 17v4"/><g class="cup"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h2.5A1.5 1.5 0 0 1 21 6.5V7a4 4 0 0 1-4 4M7 5H4.5A1.5 1.5 0 0 0 3 6.5V7a4 4 0 0 0 4 4"/><path class="shine" d="M9.8 6.4v2.2" stroke-width="1.5"/></g>
<path class="sp s1" stroke-width="1.4" d="M3.6.4v2.6M2.3 1.7h2.6"/><path class="sp s2" stroke-width="1.4" d="M20.6 14.2v2.6M19.3 15.5h2.6"/>`);

const social = wrap('social',
  `.ai-social .p1,.ai-social .p2{${fb}transform-origin:50% 100%}` + on('social', '.p1', 'aiSoHop', '1.3s') + on('social', '.p2', 'aiSoHop', '1.3s', 'cubic-bezier(.23,1,.32,1)', '.16s') +
  `@keyframes aiSoHop{0%{transform:none}14%{transform:translateY(-2.2px) scale(.97,1.05)}28%{transform:scale(1.04,.96)}38%,100%{transform:none}}`,
  `<g class="p2"><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/></g><g class="p1"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/></g>`);

const game = wrap('game',
  `.ai-game .w{${vb}transform-origin:12px 12px}` + on('game', '.w', 'aiGmSteer', '1.4s', 'cubic-bezier(.45,0,.25,1)') +
  `@keyframes aiGmSteer{0%{transform:rotate(0)}20%{transform:rotate(-42deg)}44%{transform:rotate(28deg)}60%{transform:rotate(-8deg)}72%,100%{transform:rotate(0)}}`,
  `<g class="w"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v5.8M4.6 16.5l5-2.9M19.4 16.5l-5-2.9"/></g>`);

const shop = wrap('shop',
  `.ai-shop .cn{opacity:0}.ai-shop .bag{${fb}transform-origin:50% 100%}.ai-shop .hd{${fb}transform-origin:50% 100%}` +
  on('shop', '.cn', 'aiShCoin', '1.5s', 'cubic-bezier(.55,0,.9,.5)') + on('shop', '.bag', 'aiShBag', '1.5s', 'ease-out') + on('shop', '.hd', 'aiShHd', '1.5s', 'ease-out') +
  `@keyframes aiShCoin{0%{opacity:0;transform:translateY(-6px)}8%{opacity:1}34%{opacity:1;transform:translateY(9px)}35%,100%{opacity:0;transform:translateY(9px)}}` +
  `@keyframes aiShBag{0%,32%{transform:none}40%{transform:scale(1.08,.88)}54%{transform:scale(.97,1.05)}64%,100%{transform:none}}` +
  `@keyframes aiShHd{0%,34%{transform:none}44%{transform:translateY(-1.6px)}58%,100%{transform:none}}`,
  `<defs><clipPath id="aiShopClip"><rect x="0" y="-8" width="24" height="17"/></clipPath></defs><g clip-path="url(#aiShopClip)"><circle class="cn" cx="12" cy="3" r="2.4" fill="#E3C15A" stroke="none"/></g>
<g class="bag"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z"/><path class="hd" d="M9 10V7a3 3 0 0 1 6 0v3"/></g>`);

const build = wrap('build',
  `.ai-build .wr{${vb}transform-origin:15.4px 8.6px}.ai-build .spk{opacity:0}` + on('build', '.wr', 'aiBdTurn', '1.6s', 'cubic-bezier(.45,0,.25,1)') + on('build', '.spk', 'aiBdSpk', '1.6s', 'ease-out') +
  `@keyframes aiBdTurn{0%{transform:rotate(0)}16%,24%{transform:rotate(34deg)}34%{transform:rotate(0)}50%,58%{transform:rotate(34deg)}68%,100%{transform:rotate(0)}}` +
  `@keyframes aiBdSpk{0%,14%{opacity:0}18%{opacity:1}26%{opacity:0}48%{opacity:0}52%{opacity:1}60%,100%{opacity:0}}`,
  `<path class="wr" d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.6-.6-2.3 2.9-2.1Z"/>
<path class="spk" stroke-width="1.4" d="M19.6 3.4l1.2-1.2M21 6.4l1.6-.2M17 2.2l.2-1.6"/>`);

const gear = wrap('gear',
  `.ai-gear .g{${vb}transform-origin:12px 12px}` + on('gear', '.g', 'aiGrTurn', '1.2s', 'cubic-bezier(.3,0,.2,1)') +
  `@keyframes aiGrTurn{0%{transform:rotate(0)}48%{transform:rotate(104deg)}64%{transform:rotate(86deg)}76%,100%{transform:rotate(90deg)}}`,
  `<g class="g"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></g>`);

const siren = wrap('siren',
  `.ai-siren .dome{opacity:0}.ai-siren .ry{${vb}transform-origin:12px 13px}` + on('siren', '.dome', 'aiSiDome', '1.8s', 'linear') + on('siren', '.rl', 'aiSiRay', '1.8s', 'ease-out') + on('siren', '.rr', 'aiSiRay', '1.8s', 'ease-out', '.3s') + on('siren', '.rt', 'aiSiRay', '1.8s', 'ease-out', '.15s') +
  `@keyframes aiSiDome{0%{fill:#FF3B47;opacity:.95}14%{fill:#FF3B47;opacity:.1}17%{fill:#4FA3FF;opacity:.95}31%{fill:#4FA3FF;opacity:.1}34%{fill:#FF3B47;opacity:.95}48%{fill:#FF3B47;opacity:.1}51%{fill:#4FA3FF;opacity:.95}66%,100%{fill:#4FA3FF;opacity:0}}` +
  `@keyframes aiSiRay{0%{transform:scale(1);opacity:1}8%{transform:scale(1.22);opacity:.35}17%{transform:scale(1);opacity:1}25%{transform:scale(1.22);opacity:.35}34%,100%{transform:scale(1);opacity:1}}`,
  `<path class="dome" d="M7 18v-5a5 5 0 0 1 10 0v5Z" stroke="none"/><path d="M7 18v-5a5 5 0 0 1 10 0v5"/><path d="M5 18h14v3H5z"/>
<path class="ry rl" d="M4.2 6.2l1.4 1.4M2 12h2"/><path class="ry rr" d="M19.8 6.2l-1.4 1.4M20 12h2"/><path class="ry rt" d="M12 3v2"/>`);

const lock = wrap('lock',
  `.ai-lock .sh{${vb}transform-origin:16px 11px}.ai-lock .bd{${fb}transform-origin:50% 0}` + on('lock', '.sh', 'aiLkSh', '2s', 'cubic-bezier(.3,0,.2,1)') + on('lock', '.bd', 'aiLkBd', '2s', 'ease-in-out') +
  `@keyframes aiLkBd{0%{transform:rotate(0)}6%{transform:rotate(-7deg)}12%{transform:rotate(6deg)}18%{transform:rotate(-3deg)}24%{transform:rotate(0)}80%{transform:none}84%{transform:translateY(.8px) scale(1.03,.95)}90%,100%{transform:none}}` +
  `@keyframes aiLkSh{0%,22%{transform:none}34%{transform:translateY(-3.4px) rotate(28deg)}40%{transform:translateY(-3px) rotate(22deg)}66%{transform:translateY(-3px) rotate(22deg)}80%,100%{transform:none}}`,
  `<path class="sh" d="M8 11V8a4 4 0 0 1 8 0v3"/><g class="bd"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 15v2"/></g>`);

const help = wrap('help',
  `.ai-help .lb{${vb}transform-origin:12px 12px}` + on('help', '.lb', 'aiHpTurn', '1.2s', 'cubic-bezier(.3,0,.2,1)') +
  `@keyframes aiHpTurn{0%{transform:rotate(0)}48%{transform:rotate(104deg)}64%{transform:rotate(86deg)}76%,100%{transform:rotate(90deg)}}`,
  `<g class="lb"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.8"/><path d="M5.6 5.6l3.7 3.7M18.4 5.6l-3.7 3.7M5.6 18.4l3.7-3.7M18.4 18.4l-3.7-3.7"/></g>`);

export const ANIMATED_ICONS = {
  coin,
  heat,
  streak,
  chest,
  progress,
  social,
  game,
  shop,
  build,
  gear,
  siren,
  lock,
  help,
  pause: wrap('pause',
    `.ai-pause .b{${fb}transform-origin:50% 100%}` + on('pause', '.b1', 'aiPaB', '1s') + on('pause', '.b2', 'aiPaB', '1s', 'cubic-bezier(.23,1,.32,1)', '.1s') +
    `@keyframes aiPaB{0%{transform:none}18%{transform:scale(1.15,.6)}42%{transform:scale(.95,1.08)}60%,100%{transform:none}}`,
    `<rect class="b b1" x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect class="b b2" x="13.9" y="5" width="3.6" height="14" rx="1.2"/>`),
  play: wrap('play',
    `.ai-play .t{${fb}transform-origin:30% 50%}` + on('play', '.t', 'aiPlT', '1s') +
    `@keyframes aiPlT{0%{transform:none}20%{transform:scale(.82,.9) translateX(-1px)}44%{transform:scale(1.08,.96) translateX(1.8px)}64%,100%{transform:none}}`,
    `<path class="t" d="M7 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L8.5 4.6A1 1 0 0 0 7 5.5Z" fill="currentColor"/>`),
  restart: wrap('restart',
    `.ai-restart .r{${vb}transform-origin:12px 12px}` + on('restart', '.r', 'aiReR', '1.1s', 'cubic-bezier(.5,0,.2,1)') +
    `@keyframes aiReR{0%{transform:rotate(0)}70%{transform:rotate(-380deg)}100%{transform:rotate(-360deg)}}`,
    `<g class="r"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 3.5v5.1h5.1"/></g>`),
  tap: wrap('tap',
    `.ai-tap .f{${fb}transform-origin:50% 100%}.ai-tap .rp{${fb}transform-origin:center;opacity:0}` + on('tap', '.f', 'aiTaF', '1.4s') + on('tap', '.rp', 'aiTaR', '1.4s', 'ease-out') +
    `@keyframes aiTaF{0%{transform:none}16%{transform:translateY(1.6px) scale(.95)}30%,100%{transform:none}}` +
    `@keyframes aiTaR{0%,12%{opacity:0;transform:scale(.3)}20%{opacity:1}60%,100%{opacity:0;transform:scale(1.6)}}`,
    `<circle class="rp" cx="11.3" cy="4.6" r="3" stroke-width="1.4"/><path class="f" d="M9.5 11V4.8a1.8 1.8 0 0 1 3.6 0V10l3.6.9a2.4 2.4 0 0 1 1.8 2.6l-.6 4.5a3 3 0 0 1-3 2.6h-3.3a3 3 0 0 1-2.4-1.2L6 15.2a1.6 1.6 0 0 1 2.4-2.1l1.1 1.1V11Z"/>`),
  flame: wrap('flame',
    `.ai-flame .fl{${fb}transform-origin:50% 100%}` + on('flame', '.fl', 'aiHeatBurst2', '.6s') + `@keyframes aiHeatBurst2{0%{transform:scale(1)}30%{transform:scale(1.15,1.24)}60%{transform:scale(.96,.94)}100%{transform:scale(1)}}`,
    `<g class="fl"><path d="${flameA}">${morph([flameA, flameB, flameC, flameA], '1.2s')}</path></g>`),
  wind: wrap('wind',
    `.ai-wind path{stroke-dasharray:1 1}` + on('wind', '.w1', 'aiWiD', '1.6s', 'ease-in-out') + on('wind', '.w2', 'aiWiD', '1.6s', 'ease-in-out', '.12s') + on('wind', '.w3', 'aiWiD', '1.6s', 'ease-in-out', '.24s') +
    `@keyframes aiWiD{0%{stroke-dashoffset:0}30%{stroke-dashoffset:-1}31%{stroke-dashoffset:1}62%,100%{stroke-dashoffset:0}}`,
    `<path class="w1" pathLength="1" d="M3 8h10a3 3 0 1 0-3-3"/><path class="w2" pathLength="1" d="M3 12h15a3 3 0 1 1-3 3"/><path class="w3" pathLength="1" d="M3 16h7"/>`),
  sunset: wrap('sunset',
    `.ai-sunset .sun{${fb}transform-origin:50% 100%}.ai-sunset .ry{${vb}transform-origin:12px 16px}` + on('sunset', '.sun', 'aiSuS', '1.8s', 'ease-in-out') + on('sunset', '.ry', 'aiSuR', '1.8s', 'ease-in-out') +
    `@keyframes aiSuS{0%{transform:none}35%{transform:translateY(1.6px) scaleY(.7)}70%,100%{transform:none}}` +
    `@keyframes aiSuR{0%{transform:scale(1);opacity:1}35%{transform:scale(.8);opacity:.3}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}`,
    `<path class="sun" d="M7 16a5 5 0 0 1 10 0"/><path d="M3 16h18M7 20h10"/><path class="ry" d="M12 5v3M5.6 8.6 7 10M18.4 8.6 17 10M2.5 13h2M19.5 13h2"/>`),
  hat: wrap('hat',
    `.ai-hat .h{${fb}transform-origin:30% 100%}` + on('hat', '.h', 'aiHaT', '1.4s') +
    `@keyframes aiHaT{0%{transform:none}30%{transform:translateY(-3px) rotate(-14deg)}55%{transform:translateY(-3px) rotate(-14deg)}78%{transform:translateY(.4px)}100%{transform:none}}`,
    `<g class="h"><path d="M3 16c2.5 1.5 5.5 2 9 2s6.5-.5 9-2"/><path d="M6 15.5 7.5 7a2 2 0 0 1 2.4-1.6L12 6l2.1-.6A2 2 0 0 1 16.5 7L18 15.5"/><path d="M6.6 12.5c3.5 1 7.3 1 10.8 0"/></g>`),
  fedora: wrap('fedora',
    `.ai-fedora .h{${fb}transform-origin:80% 100%}` + on('fedora', '.h', 'aiFeT', '1.4s') +
    `@keyframes aiFeT{0%{transform:none}30%{transform:translateY(-2.4px) rotate(12deg)}55%{transform:translateY(-2.4px) rotate(12deg)}78%{transform:translateY(.4px)}100%{transform:none}}`,
    `<g class="h"><path d="M2.5 16.5h19"/><path d="M5.5 16.5c0-3.4 1-7 3-9 1.7-1.7 5.3-1.7 7 0 2 2 3 5.6 3 9"/><path d="M6.2 12.8h11.6"/></g>`),
  truck: wrap('truck',
    `.ai-truck .t{${fb}transform-origin:50% 100%}.ai-truck .sl{stroke-dasharray:1 1;stroke-dashoffset:1}` + on('truck', '.t', 'aiTrT', '1.4s') + on('truck', '.sl', 'aiTrL', '1.4s', 'ease-out') +
    `@keyframes aiTrT{0%{transform:none}14%{transform:translateX(-1px) rotate(-3deg)}36%{transform:translateX(2px) rotate(1deg)}56%{transform:translateX(0) translateY(-.6px)}70%,100%{transform:none}}` +
    `@keyframes aiTrL{0%,14%{stroke-dashoffset:1;opacity:1}36%{stroke-dashoffset:0;opacity:1}60%,100%{stroke-dashoffset:-1;opacity:0}}`,
    `<path class="sl" pathLength="1" stroke-width="1.4" d="M-2.5 9h3"/><path class="sl" pathLength="1" stroke-width="1.4" d="M-3.5 13h3.6"/><g class="t"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/></g>`),
  bot: wrap('bot',
    `.ai-bot .ey{${fb}transform-origin:center}.ai-bot .an{${vb}transform-origin:12px 8px}` + on('bot', '.ey', 'aiBoE', '1.6s', 'ease-in-out') + on('bot', '.an', 'aiBoA', '1.6s', 'ease-in-out') +
    `@keyframes aiBoE{0%,10%{transform:none}16%{transform:scaleY(.1)}22%,38%{transform:none}44%{transform:scaleY(.1)}50%,100%{transform:none}}` +
    `@keyframes aiBoA{0%{transform:rotate(0)}12%{transform:rotate(-18deg)}28%{transform:rotate(14deg)}42%{transform:rotate(-6deg)}54%,100%{transform:rotate(0)}}`,
    `<rect x="4.5" y="8" width="15" height="11" rx="3"/><path class="an" d="M12 8V4.5"/><path class="ey" d="M9.5 13h.01M14.5 13h.01" stroke-width="2.4"/><path d="M9.5 16h5"/>`),
  bell: wrap('bell',
    `.ai-bell .b{${vb}transform-origin:12px 4px}.ai-bell .c{${vb}transform-origin:12px 4px}` + on('bell', '.b', 'aiBeB', '1.4s', 'ease-in-out') + on('bell', '.c', 'aiBeC', '1.4s', 'ease-in-out') +
    `@keyframes aiBeB{0%{transform:rotate(0)}10%{transform:rotate(18deg)}24%{transform:rotate(-16deg)}38%{transform:rotate(10deg)}52%{transform:rotate(-5deg)}64%,100%{transform:rotate(0)}}` +
    `@keyframes aiBeC{0%{transform:rotate(0)}14%{transform:rotate(-14deg)}28%{transform:rotate(18deg)}42%{transform:rotate(-10deg)}56%{transform:rotate(4deg)}68%,100%{transform:rotate(0)}}`,
    `<path class="c" d="M10 21h4"/><path class="b" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/>`),
  bulb: wrap('bulb',
    `.ai-bulb .gl{opacity:0}.ai-bulb .ry{${vb}transform-origin:12px 9px;opacity:0}` + on('bulb', '.gl', 'aiBuG', '1.6s', 'ease-out') + on('bulb', '.ry', 'aiBuR', '1.6s', 'ease-out') +
    `@keyframes aiBuG{0%,8%{opacity:0}12%{opacity:.6}16%{opacity:.1}22%{opacity:.7}70%{opacity:.7}100%{opacity:0}}` +
    `@keyframes aiBuR{0%,18%{opacity:0;transform:scale(.7)}30%{opacity:1;transform:scale(1)}70%{opacity:1}100%{opacity:0;transform:scale(1.1)}}`,
    `<path class="gl" fill="#FFB703" stroke="none" d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z"/><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z"/><path class="ry" stroke-width="1.4" d="M12 -1.2v1.6M4.4 2l1.1 1.1M19.6 2l-1.1 1.1M1.6 9h1.6M20.8 9h1.6"/>`),
  bug: wrap('bug',
    `.ai-bug .bd{${fb}transform-origin:center}.ai-bug .lg{${vb}transform-origin:12px 13px}` + on('bug', '.bd', 'aiBgB', '1.2s', 'ease-in-out') + on('bug', '.lg', 'aiBgL', '1.2s', 'linear') +
    `@keyframes aiBgB{0%{transform:none}20%{transform:translateX(-1px) rotate(-5deg)}40%{transform:translateX(1px) rotate(5deg)}60%{transform:translateX(-.6px) rotate(-3deg)}80%,100%{transform:none}}` +
    `@keyframes aiBgL{0%{transform:none}10%{transform:scaleY(.86)}20%{transform:scaleY(1.06)}30%{transform:scaleY(.86)}40%{transform:scaleY(1.06)}50%{transform:scaleY(.86)}62%,100%{transform:none}}`,
    `<g class="bd"><path class="lg" d="M3 13h4M17 13h4M4 7l3 2.5M20 7l-3 2.5M4 19l3-2M20 19l-3-2"/><rect x="7" y="8" width="10" height="13" rx="5"/><path d="M12 13v8M9 8a3 3 0 0 1 6 0"/></g>`),
  cloud: wrap('cloud',
    `.ai-cloud .c{${fb}transform-origin:50% 80%}` + on('cloud', '.c', 'aiClC', '1.6s', 'ease-in-out') +
    `@keyframes aiClC{0%{transform:none}20%{transform:scale(1.08,.94)}40%{transform:translateY(-1.6px) scale(.97,1.04)}62%{transform:translateY(-.6px)}80%,100%{transform:none}}`,
    `<path class="c" d="M7 19a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.8 4.8 0 0 1-1 9.5H7Z"/>`),
  sync: wrap('sync',
    `.ai-sync .s{${vb}transform-origin:12px 12px}` + on('sync', '.s', 'aiSyS', '1.1s', 'cubic-bezier(.5,0,.2,1)') +
    `@keyframes aiSyS{0%{transform:rotate(0)}70%{transform:rotate(195deg)}100%{transform:rotate(180deg)}}`,
    `<g class="s"><path d="M4.5 11.5A7.5 7.5 0 0 1 18.2 7.3L20 9M20 4.5V9h-4.5"/><path d="M19.5 12.5a7.5 7.5 0 0 1-13.7 4.2L4 15M4 19.5V15h4.5"/></g>`),
  globe: wrap('globe',
    `.ai-globe .m{${vb}transform-origin:12px 12px}` + on('globe', '.m', 'aiGlM', '1.6s', 'linear') +
    `@keyframes aiGlM{0%{transform:scaleX(1)}25%{transform:scaleX(0)}50%{transform:scaleX(-1)}75%{transform:scaleX(0)}100%{transform:scaleX(1)}}`,
    `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path class="m" d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z"/>`),
  camera: wrap('camera',
    `.ai-camera .ln{${fb}transform-origin:center}.ai-camera .bd{${fb}transform-origin:50% 100%}.ai-camera .fl{opacity:0}` + on('camera', '.ln', 'aiCaL', '1.2s') + on('camera', '.bd', 'aiCaB', '1.2s') + on('camera', '.fl', 'aiCaF', '1.2s', 'ease-out') +
    `@keyframes aiCaB{0%{transform:none}12%{transform:scale(1.03,.92)}30%,100%{transform:none}}` +
    `@keyframes aiCaL{0%{transform:none}12%{transform:scale(.55)}34%{transform:scale(1.12)}52%,100%{transform:none}}` +
    `@keyframes aiCaF{0%,10%{opacity:0}14%{opacity:.9}40%,100%{opacity:0}}`,
    `<g class="bd"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle class="fl" cx="12" cy="13" r="3.5" fill="currentColor" stroke="none"/><circle class="ln" cx="12" cy="13" r="3.5"/></g>`),
  share: wrap('share',
    `.ai-share .ar{${fb}transform-origin:50% 100%}.ai-share .bx{${fb}transform-origin:50% 100%}` + on('share', '.ar', 'aiShA', '1.2s', 'cubic-bezier(.5,0,.2,1)') + on('share', '.bx', 'aiShX', '1.2s') +
    `@keyframes aiShA{0%{transform:none;opacity:1}30%{transform:translateY(-6px);opacity:0}31%{transform:translateY(3px);opacity:0}58%{transform:none;opacity:1}100%{transform:none}}` +
    `@keyframes aiShX{0%{transform:none}10%{transform:scale(1.05,.9)}26%,100%{transform:none}}`,
    `<path class="ar" d="M12 15V3M8 7l4-4 4 4"/><path class="bx" d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>`),
  download: wrap('download',
    `.ai-download .ar{${fb}transform-origin:50% 100%}.ai-download .tr{${fb}transform-origin:50% 100%}` + on('download', '.ar', 'aiDlA', '1.2s', 'cubic-bezier(.5,0,.6,1)') + on('download', '.tr', 'aiDlT', '1.2s') +
    `@keyframes aiDlA{0%{transform:none;opacity:1}30%{transform:translateY(5px);opacity:0}31%{transform:translateY(-5px);opacity:0}58%{transform:none;opacity:1}100%{transform:none}}` +
    `@keyframes aiDlT{0%,26%{transform:none}34%{transform:scale(1.08,.8)}50%,100%{transform:none}}`,
    `<path class="ar" d="M12 3v12M8 11l4 4 4-4"/><path class="tr" d="M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>`),
  flag: wrap('flag',
    `.ai-flag .fg{${fb}transform-origin:0 50%}` + on('flag', '.fg', 'aiFlF', '1.6s', 'ease-in-out') +
    `@keyframes aiFlF{0%{transform:none}15%{transform:skewY(-8deg) scaleX(.88)}30%{transform:skewY(6deg) scaleX(1.04)}45%{transform:skewY(-5deg) scaleX(.92)}60%{transform:skewY(3deg)}75%,100%{transform:none}}`,
    `<path d="M5 21V4"/><path class="fg" d="M5 4h11l-2 4 2 4H5"/>`),
  check: wrap('check',
    `.ai-check .c{stroke-dasharray:1 1;${fb}transform-origin:center}` + on('check', '.c', 'aiChC', '.9s', 'cubic-bezier(.3,0,.2,1)') +
    `@keyframes aiChC{0%{stroke-dashoffset:1;transform:scale(.8)}50%{stroke-dashoffset:0;transform:scale(1.12)}75%,100%{stroke-dashoffset:0;transform:none}}`,
    `<path class="c" pathLength="1" d="m5 12.5 4.5 4.5L19 7.5"/>`),
  close: wrap('close',
    `.ai-close .x{${vb}transform-origin:12px 12px}` + on('close', '.x', 'aiClX', '.8s') +
    `@keyframes aiClX{0%{transform:rotate(0) scale(1)}40%{transform:rotate(90deg) scale(.8)}100%{transform:rotate(90deg) scale(1)}}`,
    `<path class="x" d="M6 6l12 12M18 6 6 18"/>`),
  plus: wrap('plus',
    `.ai-plus .p{${vb}transform-origin:12px 12px}` + on('plus', '.p', 'aiPlP', '.8s') +
    `@keyframes aiPlP{0%{transform:rotate(0) scale(1)}35%{transform:rotate(90deg) scale(1.25)}100%{transform:rotate(90deg) scale(1)}}`,
    `<path class="p" d="M12 5v14M5 12h14"/>`),
  minus: wrap('minus',
    `.ai-minus .m{${fb}transform-origin:center}` + on('minus', '.m', 'aiMiM', '.7s') +
    `@keyframes aiMiM{0%{transform:none}30%{transform:scaleX(.5)}60%{transform:scaleX(1.1)}100%{transform:none}}`,
    `<path class="m" d="M5 12h14"/>`),
  warning: wrap('warning',
    `.ai-warning .t{${vb}transform-origin:12px 19px}.ai-warning .ex{opacity:1}` + on('warning', '.t', 'aiWaT', '1.2s', 'ease-in-out') + on('warning', '.ex', 'aiWaE', '1.2s', 'linear') +
    `@keyframes aiWaT{0%{transform:rotate(0)}8%{transform:rotate(-7deg)}16%{transform:rotate(6deg)}24%{transform:rotate(-4deg)}32%{transform:rotate(2deg)}40%,100%{transform:rotate(0)}}` +
    `@keyframes aiWaE{0%,40%{opacity:1}48%{opacity:.15}56%{opacity:1}64%{opacity:.15}72%,100%{opacity:1}}`,
    `<g class="t"><path d="M10.3 5a2 2 0 0 1 3.4 0l6.3 11a2 2 0 0 1-1.7 3H5.7A2 2 0 0 1 4 16l6.3-11Z"/><path class="ex" d="M12 10v3M12 16.2h.01"/></g>`),
  deadEnd: wrap('deadEnd',
    `.ai-deadEnd .s{${vb}transform-origin:12px 20px}.ai-deadEnd .bar{${fb}transform-origin:center}` + on('deadEnd', '.s', 'aiDeS', '1.6s', 'ease-in-out') + on('deadEnd', '.bar', 'aiDeB', '1.6s') +
    `@keyframes aiDeS{0%{transform:rotate(0)}14%{transform:rotate(-9deg)}32%{transform:rotate(7deg)}50%{transform:rotate(-4deg)}66%{transform:rotate(2deg)}80%,100%{transform:rotate(0)}}` +
    `@keyframes aiDeB{0%,10%{transform:none}22%{transform:scaleX(1.25)}36%,100%{transform:none}}`,
    `<g class="s"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 17.5v-7"/><path class="bar" d="M8.5 8.5h7"/></g>`),
  external: wrap('external',
    `.ai-external .a{${fb}transform-origin:center}` + on('external', '.a', 'aiExA', '1s', 'cubic-bezier(.5,0,.2,1)') +
    `@keyframes aiExA{0%{transform:none;opacity:1}30%{transform:translate(4px,-4px);opacity:0}31%{transform:translate(-4px,4px);opacity:0}60%,100%{transform:none;opacity:1}}`,
    `<path class="a" d="M7 17 17 7M9 7h8v8"/>`),
  chevronRight: wrap('chevronRight',
    on('chevronRight', '.c', 'aiCvR', '.9s', 'ease-in-out') + `@keyframes aiCvR{0%,100%{transform:none}20%{transform:translateX(2.2px)}40%{transform:none}60%{transform:translateX(1.4px)}80%{transform:none}}`,
    `<path class="c" d="m9 6 6 6-6 6"/>`),
  chevronLeft: wrap('chevronLeft',
    on('chevronLeft', '.c', 'aiCvL', '.9s', 'ease-in-out') + `@keyframes aiCvL{0%,100%{transform:none}20%{transform:translateX(-2.2px)}40%{transform:none}60%{transform:translateX(-1.4px)}80%{transform:none}}`,
    `<path class="c" d="m15 6-6 6 6 6"/>`),
  chevronDown: wrap('chevronDown',
    `.ai-chevronDown .c{${vb}transform-origin:12px 12px}` + on('chevronDown', '.c', 'aiCvD', '.9s') + `@keyframes aiCvD{0%{transform:none}30%{transform:translateY(2px)}50%{transform:rotate(180deg) translateY(0)}100%{transform:rotate(0)}}`,
    `<path class="c" d="m6 9 6 6 6-6"/>`),
  chestLine: wrap('chestLine',
    `.ai-chestLine .lid{${fb}transform-origin:0 100%}.ai-chestLine .lk{${fb}transform-origin:50% 0}` + on('chestLine', '.lid', 'aiClL', '1.4s', 'cubic-bezier(.3,0,.2,1)') + on('chestLine', '.lk', 'aiClK', '1.4s', 'ease-in-out') +
    `@keyframes aiClK{0%{transform:rotate(0)}8%{transform:rotate(-14deg)}16%{transform:rotate(10deg)}24%,100%{transform:rotate(0)}}` +
    `@keyframes aiClL{0%,22%{transform:none}38%{transform:translateY(-2.6px) rotate(-12deg)}62%{transform:translateY(-2.2px) rotate(-10deg)}76%{transform:none}82%{transform:translateY(-.5px)}88%,100%{transform:none}}`,
    `<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17"/><path class="lid" d="M5 9V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2"/><path class="lk" d="M11 11.5h2v3h-2z"/>`),
} as const;

export type AnimatedIconId = keyof typeof ANIMATED_ICONS;
