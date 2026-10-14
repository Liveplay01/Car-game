# Vehicle style study

An isolated art direction study for Roundabout Timing. These files are visual prototypes only;
they are not imported by the game and do not alter production art, physics, colours, or UI.

Open `car-style-study.html` directly in a browser. It compares three treatments against the
product's current art direction from `PRODUCT.md` and `src/present/theme.ts`:

1. **Current language** — restrained flat shapes and strong readability.
2. **Crafted miniature** — the recommended direction: the same graphic shapes, with controlled
   body planes, wheel depth, glass reflections, and tiny material cues. It avoids photorealism,
   broad glow, and surface noise so cars stay legible at game size.
3. **Ink and enamel** — a more illustrated option with deliberate contour and restrained
   highlights.

The older `Web/design-preview.html` is a separate mood experiment. Its broad amber glow, film
grain, and racing stripe are not the direction tested here and conflict with the product's
anti-references; use this study and `PRODUCT.md` for future vehicle-art discussions.

The three models (sedan, beetle, and police car) are deliberately shown together. The test is
whether they look like one authored fleet and remain distinguishable over the existing dark road.
The mini-scene/UI framing is illustrative; only the SVG cars are drawn as asset candidates.

If the recommended direction is chosen, the next step should be one production-size car rendered
through `CarArt` and reviewed in the real game at phone size. Keep all new model details inside
the existing collision footprint and preserve vehicle colours as gameplay information.
