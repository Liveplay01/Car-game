/** Icon paths, drawn in the spirit of SF Symbols (rounded strokes, 24×24). */
export const ICONS = {
  progress: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h2.5a1.5 1.5 0 0 1 1.5 1.5V7a4 4 0 0 1-4 4M7 5H4.5A1.5 1.5 0 0 0 3 6.5V7a4 4 0 0 0 4 4"/>',
  game: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v5.8M4.6 16.5l5-2.9M19.4 16.5l-5-2.9"/>',
  shop: '<path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  build: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.6-.6-2.3 2.9-2.1Z"/>',
  pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  /** A finger pressing down: the tap hint of the first shifts. */
  tap: '<path d="M9.5 11V4.8a1.8 1.8 0 0 1 3.6 0V10l3.6.9a2.4 2.4 0 0 1 1.8 2.6l-.6 4.5a3 3 0 0 1-3 2.6h-3.3a3 3 0 0 1-2.4-1.2L6 15.2a1.6 1.6 0 0 1 2.4-2.1l1.1 1.1V11Z"/>',
  /** The modifiers before a shift (`.run-mods`): Tailwind, a living streak, the Family's share. */
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  streak: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>',
  hat: '<path d="M3 16c2.5 1.5 5.5 2 9 2s6.5-.5 9-2"/><path d="M6 15.5 7.5 7a2 2 0 0 1 2.4-1.6L12 6l2.1-.6A2 2 0 0 1 16.5 7L18 15.5"/><path d="M6.6 12.5c3.5 1 7.3 1 10.8 0"/>',
  siren: '<path d="M7 18v-5a5 5 0 0 1 10 0v5"/><path d="M5 18h14v3H5zM12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4M2 12h2M20 12h2"/>',
  coin: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#0B0D10" stroke-opacity=".35" stroke-width="1.6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L8.5 4.6A1 1 0 0 0 7 5.5Z" fill="currentColor"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 3.5v5.1h5.1"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  download:'<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>',
  chest: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17M5 9V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2M11 11.5h2v3h-2z"/>',
  flame: '<path d="M12 3c.8 3.4 4.6 5 4.6 9.6a4.6 4.6 0 0 1-9.2 0c0-2 .9-3.3 2-4.4.2 1.3.8 2 1.6 2.3C11 8.4 11.3 5.6 12 3z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bot: '<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5M9.5 13h.01M14.5 13h.01M9.5 16h5"/>',
  truck: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  external: '<path d="M7 17 17 7M9 7h8v8"/>',
  bug: '<rect x="7" y="8" width="10" height="13" rx="5"/><path d="M12 13v8M9 8a3 3 0 0 1 6 0M3 13h4M17 13h4M4 7l3 2.5M20 7l-3 2.5M4 19l3-2M20 19l-3-2"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z"/>',
  cloud: '<path d="M7 19a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.8 4.8 0 0 1-1 9.5H7Z"/>',
  sync: '<path d="M4.5 11.5A7.5 7.5 0 0 1 18.2 7.3L20 9M20 4.5V9h-4.5"/><path d="M19.5 12.5a7.5 7.5 0 0 1-13.7 4.2L4 15M4 19.5V15h4.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/><path d="M10 21h4"/>',
  tiktok: '<path fill="#25F4EE" d="M15.2 3h3.1c.2 2.3 1.5 4 4 4.3v3.2a9 9 0 0 1-4-1.2v6.5a6.3 6.3 0 1 1-6.3-6.3c.4 0 .8 0 1.2.1v3.3a3.2 3.2 0 1 0 1.9 2.9V3Z"/><path fill="#FE2C55" d="M13.4 4.7h3.1c.2 2.3 1.5 4 4 4.3v3.2a9 9 0 0 1-4-1.2v6.5a6.3 6.3 0 0 1-6.3 6.3c-2.1 0-3.9-1-5-2.6a6.3 6.3 0 0 0 8.2-6V4.7Z"/><path fill="#111" d="M14.3 3h3.1c.2 2.3 1.5 4 4 4.3v3.2a9 9 0 0 1-4-1.2v6.5a6.3 6.3 0 1 1-6.3-6.3c.4 0 .8 0 1.2.1v3.3a3.2 3.2 0 1 0 1.9 2.9V3Z"/>',
  youtube: '<path fill="#FF0033" d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-4.8Z"/><path fill="#fff" d="m9.6 15.4 6.2-3.4-6.2-3.4v6.8Z"/>',
  instagram: '<defs><linearGradient id="ig" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stop-color="#FFB13D"/><stop offset=".5" stop-color="#E1306C"/><stop offset="1" stop-color="#833AB4"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/><rect x="6.5" y="6.5" width="11" height="11" rx="3.5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.3" cy="6.9" r="1.1" fill="#fff"/>',
} as const;

/**
 * A Fandom mark for the link to the wiki (Settings): a bold white F on Fandom's pink, drawn
 * here as simple shapes, not their official artwork.
 */
export const FANDOM_LOGO =
  '<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="27" fill="#FA005A"/>' +
  '<path fill="#fff" d="M38 26h46a8 8 0 0 1 0 16H56v10h22a8 8 0 0 1 0 16H56v18a9 9 0 0 1-18 0z"/></svg>';

/**
 * The CrazyGames logo (their pinned-tab mark, imgs.crazygames.com/favicons) in white on their
 * purple, as their app icon. Only for the link to the game's page there (Settings).
 */
export const CRAZYGAMES_LOGO =
  '<svg viewBox="0 0 1120 1120" aria-hidden="true"><rect width="1120" height="1120" rx="250" fill="#6842FF"/>' +
  '<g transform="translate(179 179) scale(0.68)"><g transform="translate(0 1120) scale(0.1 -0.1)" fill="#fff">' +
  '<path d="M1648 11185c-127-41-283-269-402-589-106-283-189-714-231-1206-21-246-38-770-31-929l6-134-50-152c-396-1207-399-2944-8-4145 471-1447 1475-2341 3008-2679 240-53 685-121 790-121 22 0 40-3 40-8 0-4-251-132-557-285-844-421-1194-608-1235-658-36-43-12-111 44-124 82-18 504-80 690-100 453-51 812-64 1198-45 580 29 1080 106 1530 235 773 221 1522 620 2064 1099 617 544 1095 1216 1409 1976 135 328 185 494 331 1115 117 498 176 1050 176 1655 0 787-103 1500-300 2085l-40 119 0 287c0 953-109 1680-325 2171-91 207-208 368-299 413-77 38-152 43-254 17-241-61-543-264-945-634l-84-78-99 46c-394 185-919 331-1449 403-621 85-1368 93-2020 20-606-68-1176-217-1628-428l-89-42-86 82c-336 318-660 543-892 619-87 28-201 34-262 15zm4257-1975c758-40 1324-194 1737-471 302-203 510-451 683-812 176-367 279-823 316-1396 15-243 6-881-15-1086-82-758-266-1265-608-1670-325-385-811-630-1468-739-449-75-1070-94-1615-51-634 51-1124 194-1487 435-124 83-165 116-287 234-412 401-640 967-727 1808-21 208-30 810-15 1046 67 1052 360 1751 909 2164 400 302 946 474 1672 528 281 21 630 24 905 10z"/>' +
  '<path d="M4315 7421c-148-24-270-86-370-186-80-80-125-151-163-257l-27-73-3-746c-3-841-4-830 69-979 59-119 170-230 289-289 96-47 194-71 290-71 292 0 557 208 630 496 18 71 20 112 20 498l0 421-70 2c-227 7-427 165-485 384-31 117-13 278 43 383 39 75 154 185 230 220 34 16 62 33 62 36 0 11-81 66-146 98-107 54-260 80-369 63z"/>' +
  '<path d="M6451 7419c-200-30-383-162-479-346-75-144-73-119-70-976l3-762 23-65c136-381 552-556 907-381 151 74 277 220 332 384l28 82 3 466 3 466-55-5c-71-6-188 21-268 60-36 19-88 57-124 94-245 244-184 663 120 825l59 32-24 20c-100 81-305 128-458 106z"/>' +
  '</g></g></svg>';

/**
 * A chest as the Shop draws it (`ShopPage.addChestIcon`), flat, in a 52 × 48 box (Leo, 08.10.2026).
 * Painted by `--chest-body`, `--chest-lid` and `--chest-band`, so one picture serves every kind.
 */
export const CHEST_FLAT =
  '<path fill="var(--chest-lid)" d="M0 19V11A10 10 0 0 1 10 1h32a10 10 0 0 1 10 10v8Z"/>' +
  '<rect fill="var(--chest-body)" y="19" width="52" height="28" rx="5"/>' +
  '<path fill="var(--chest-band)" fill-opacity=".75" d="M8 1h5v46H8zM39 1h5v46h-5z"/>' +
  '<rect fill="var(--chest-band)" fill-opacity=".9" y="19" width="52" height="5"/>' +
  '<rect fill="var(--chest-band)" x="21" y="15" width="10" height="12" rx="2.5"/>' +
  '<circle fill="var(--chest-body)" cx="26" cy="21" r="2"/>';
