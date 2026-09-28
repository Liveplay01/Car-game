# Product

## Register

product

## Users

Players on a phone, mostly one-handed, often in short breaks (on the bus, waiting in a
queue), sometimes on a desktop browser. They want a quick shift of ~20 seconds that feels
fair and learnable, and a reason to come back (levels, upgrades, chests).

## Product Purpose

A browser and PWA version of the iOS roundabout timing game (see `../FOUNDATION.md`).
One tap sends the front car into the spinning roundabout; good timing brings points and
combo, bad timing a crash with real physics. Success: the timing feels exact on touch, the
game runs at 60 fps on an older phone, and progress is never lost on the device.

## Brand Personality

Calm, precise, satisfying. A dark night-time city, a clean road, one mint accent for what
the player earns. The juice is in the moment (Tight Fit, takedown, crash), not in the chrome.

## Anti-references

Casino-style mobile games (flashing banners, fake urgency, coin showers on every screen),
neon arcade clutter, cartoon UI chrome. Also: vehicle colours used as UI colours.

The Casino in the Shop (since 28.09.2026) is the one exception to "no casino look", like the
chest opening: its wins may be loud, but only inside it. It stays honest: odds and returns
one tap away, a real history, near misses only when the draw gives them, every win at least
double the stake, reveals that skip on a tap, no timers, no "win it back", nothing pointing
the player into it from elsewhere, and play money only (no currency can be bought).

## Design Principles

1. The scene is the product: UI floats over it only where needed and never covers the road.
2. Native feel over invention: tab bar, grouped lists, sheets, switches, segmented controls
   as iOS players know them.
3. The more often an event happens, the less animation it gets (FOUNDATION.md motion table).
4. Vehicle types are told apart by shape, colour and symbol, so colour blindness is covered.
5. Fair and exact: taps count at the moment of the touch; the same rules as the Swift core.

## Accessibility & Inclusion

WCAG AA contrast for text, 44 px touch targets, keyboard play (Space, Enter, D, Esc),
visible focus, a live region for results, Reduce Motion (follows the system by default)
removes shake, slow-mo and flying parts.
