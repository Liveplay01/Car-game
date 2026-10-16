# Product

## Register

product

## Users

Players on a phone, mostly one-handed, often in short breaks (on the bus, waiting in a
queue), sometimes on a desktop browser. They want a quick shift of ~20 seconds that feels
fair and learnable, and a reason to come back (levels, upgrades, chests).

## Product Purpose

A roundabout timing game for the browser, installable as a PWA (rules: `../FOUNDATION.md`).
One tap sends the front car into the spinning roundabout; good timing brings points and
combo, bad timing a crash with real physics. Success: the timing feels exact on touch, the
game runs at 60 fps on an older phone, and progress is never lost on the device.

## Brand Personality

Calm, precise, satisfying. A dark night-time city (sunny map skins bring daylight around it),
a clean dark road, one amber accent (street-lamp #ffb703) for the interface and coin gold for
what the player earns. The juice is in the moment (Tight Fit, takedown, crash), not in the chrome.

### Colour roles (Leo, 16.10.2026)

Off the road every state speaks one grammar (`--state-*` in `ui/shell.css`, the same tokens on the canvas):

- **Amber** (`accent`): what runs, grows or wants a tap. A bar filling, a lot you lead, a button, a link.
- **Gold** (`coin`, `--money`): what is earned. Money, a goal reached, a tier passed, a lot won, a "Done ✓".
- **Red** (`destructive`): lost, or nearly out of time.
- **Muted**: what waits or is open.

On the road the Ring Signals keep their own colours (FOUNDATION.md, "Der Ring als Signalspur"); green belongs
to the player there. No feature brings its own status colours (blue, teal, violet): rarity and player colours
mean rarity and players, nothing else.

Every progress bar is one part (`present/meter.ts`, `.club-bar`): 6 px, round ends, a track of `controlFill`.
It glides to where it grew since it was last seen, a light runs along it when it is nearly full, and a goal
reached sends one gold wave out from its card, like a payout on the ring.

### Actions

A tap selects or opens; a labelled button in the sheet buys, builds or removes. Only what cannot be undone
(tearing down, prestige, deleting) asks twice, on the same button with a new label. No hidden double taps.

## Anti-references

Casino-style mobile games (flashing banners, fake urgency, coin showers on every screen),
neon arcade clutter, cartoon UI chrome. Also: vehicle colours used as UI colours.

The Casino in the Shop (since 28.09.2026) is the one exception to "no casino look", like the
chest opening: its wins may be loud, but only inside it. It stays honest: odds and returns
one tap away, a real history, near misses only when the draw gives them, every win at least
double the stake, reveals that skip on a tap, no timers, no "win it back", nothing pointing
the player into it from elsewhere, and play money only (no currency can be bought).

## Design Idea

The game should feel like a precise, perfectly tuned machine, and keep its charm as a car and
roundabout game. The modern, Apple-like look is the base: clear, calm, high-quality, smooth.
On top of it sit deliberate playful details like the Ring Signals, which turn game events into
feedback that is beautiful and understood at once.

Every movement, display and interaction flows into the next. Feedback arrives at exactly the
right moment, transitions feel inevitable, and effects feel earned. Precision comes not from
more decoration but from everything interlocking.

The rule: modern and restrained in tone, playful and alive in feedback, always fluid in
motion, clear in function. Every new UI idea must make the game clearer or more satisfying
*and* fit the overall look and the car game.

Controls use familiar gestures and clear cause and effect, so every action is learned fast and
soon feels self-evident: intuitive, fluid, no unnecessary thinking.

## Design Principles

1. The scene is the product: UI floats over it only where needed and never covers the road.
2. Native feel over invention: tab bar, grouped lists, sheets, switches, segmented controls
   as iOS players know them.
3. The more often an event happens, the less animation it gets (FOUNDATION.md motion table).
4. Vehicle types are told apart by shape, colour and symbol, so colour blindness is covered.
5. Fair and exact: taps count at the moment of the touch; same seed and taps, same result.

## Accessibility & Inclusion

WCAG AA contrast for text, 44 px touch targets, keyboard play (Space, Enter, D, Esc),
visible focus, a live region for results, Reduce Motion (off by default, "System" to follow the device; a slow device gets it recommended once)
removes shake, slow-mo and flying parts.
