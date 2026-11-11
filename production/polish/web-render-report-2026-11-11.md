## Performance Profile: Web render loop (game loop, render, physics, GC, delta time)
Generated: 2026-11-11

Measured with Playwright and installed Chrome. The viewport was 390×844 @3x, with **4× CPU throttle**, service workers blocked, and `?demo&level=N`.
`__probe.perf(600)` records build and draw time per frame. Heap sampling covers the same 600 frames, including garbage the GC has already collected.
After that, 6 s of real `requestAnimationFrame` frames were recorded during a shift.
The dev machine is a desktop, so the absolute numbers are not phone numbers. Only the before/after comparison counts.

### Performance Budgets
| Metric | Budget | Measured (L80, after) | Status |
|--------|--------|------------------------|--------|
| Frame time | none committed (`performance.*` not set, yaml-helper missing) | build 10.8 ms + draw 9.3 ms avg at 4× throttle | NOT ASSESSED |
| Memory | none committed | 342 KB garbage per frame | NOT ASSESSED |
| Load time | none committed | not measured | NOT ASSESSED — NO DATA |
| Draw calls | none committed | 818 render items per frame | NOT ASSESSED |

### Before / after (4× throttle)
| Level | Build avg | Draw avg | Garbage/frame | Live rAF p99 | Frames > 20 ms |
|-------|-----------|----------|---------------|--------------|----------------|
| 1 before | 8.7 ms | 7.3 ms | 187 KB | – | – |
| 1 after | 6.8 ms | 5.5 ms | 161 KB | 17.9 ms | 2 / 858 |
| 80 before | 10.7 ms | 8.7 ms | 391 KB | 30 ms | 27 / 669 |
| 80 after | 10.8 ms | 9.3 ms | 342 KB | 24.2 ms | 8 / 601 |
| 150 before | 8.6 ms | 6.5 ms | 395 KB | – | – |
| 150 after | 10.1 ms | 8.0 ms | 357 KB | 24.2 ms | 12 / 716 |

Garbage per frame drops by 10–14 % on every level, and the L80 frame spikes drop from 27 to 8.
The average times are within noise. Another session was running tests on the same machine during the "after" run.

### Changes made
1. **Road reused across frames** (`present/scene.ts`, `roadCache`). The road items of a layout are kept, keyed by own arm, car length, queue spacing, queue visibility, module slots and modules.
   The drawer then gets the very same objects. Its `sameItem` reference fast path matches, so the baked picture stays.
   This applies to plain groups only. A swipe's link road, and any tagged, clipped, glass or faded group, is still built fresh.
2. **Cull without a square root** (`present/draw.ts`, `offscreen`). The reach now uses `|x| + |y|` as an upper bound of the half diagonal.
   The bound is at most √2 too wide, so nothing visible is culled.
3. **View key text made once per change** (`present/draw.ts`, `view()`). The ground and baked-stretch keys no longer turn 12 floats into a string every frame.
   The text is rebuilt only when the camera, canvas or offset changes.

### Proposed but not done
- **RenderItem pooling.** Transitions (`present/transitions.ts`) keep the old frame's items and splice them later. A reused object would show the new frame's values in the old picture.
- **City layer cache.** `CityLayer.add` changes every frame: sway, window glow, scars, rise and holidays.
- **`Math.hypot` → `Math.sqrt` in `core/vec2.ts`.** The results can differ in the last bit. Replays need the same bits for the same seed and taps.
- **`shell.ts` small allocations.** That is one empty array per frame, and a sort that runs twice per 90 frames. Not measurable.
- **DPR cap.** It already exists: `dprCap` is 2 and drops adaptively in `adaptQuality`.

### Remaining hotspots (L80, after)
| # | Location | Share of garbage |
|---|----------|------------------|
| 1 | `RenderList.add` (`present/render.ts:213`) | 12 % |
| 2 | `CanvasDrawer.item` (`present/draw.ts:899`) | 9 % (not colour strings: `css()` is cached) |
| 3 | `addRoof` / `CityLayer.add` (`present/city.ts`) | 11 % |
| 4 | `vec2.add` / `vec2.mul` (`core/vec2.ts`) | 7 % |

### Requires Investigation
- What `item` allocates besides colours: heap snapshot diff of one frame.
- A real phone (mid-range Android) with Chrome remote profiling. The desktop numbers with throttle are only an approximation.
- City layer: split it into a static part (roofs, outlines) that can be baked and a moving part (sway, glow).

Verdict: **COMPLETE**
