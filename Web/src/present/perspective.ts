import type { Layout as RoundaboutLayout } from '../core/roundabout';
import { type Vec2, v, mul, fromAngle, length, lerpV } from '../core/vec2';
import { type Camera, type RenderList, fitCamera, toScreen, arc, Ease, Metrics } from './render';
import { type Screen, BuildLayout } from './flow';

/**
 * One city, seen from different places. The roundabout keeps running
 * under every tab; the camera glides to the view that tab needs. Never a zoom on start/end:
 * the Game tab, playing and the result all share the street view.
 */
export type Perspective = 'street' | 'builder' | 'shop' | 'upgrades' | 'progress' | 'social';

export const perspectiveOf = (s: Screen): Perspective => {
  if (s.k !== 'page') return 'street';
  switch (s.tab) {
    case 'streetBuilder':
      return 'builder';
    case 'shop':
      return 'shop';
    case 'upgrades':
      return 'upgrades';
    case 'progress':
      return 'progress';
    case 'social':
      return 'social';
    case 'game':
      return 'street';
  }
};

export const PerspectiveTuning = {
  glide: 0.65,
  /** Back to the game (Leo, 16.10.2026): a slower glide in, as if the eye settles on the ring. */
  focusGlide: 0.9,
  /** After loading the game starts this far out and settles in on the ring over `focusArrive`. */
  focusFrom: 0.88,
  focusArrive: 1.2,
  shopDirection: 2.3,
  shopDistance: 150,
  /** The other tabs step further back, so coming to the game feels like moving closer. */
  shopZoom: 0.64,
  progressDirection: -0.9,
  socialDirection: -2.3,
  upgradesZoom: 1.06,
};

/**
 * The game's own view. On a phone the ring sits high so the queue has room; on a wide screen
 * (desktop) that leaves the ring stuck to the top, so it moves most of the way to the middle
 * (Leo, 27.09.2026). The queue below still shows its front cars: the move stops where the front car would go under the
 * tab bar (`bottomInset`), which on a phone held sideways takes a large share of the height.
 */
export function streetCamera(layout: RoundaboutLayout, viewport: Vec2, bottomInset = 0): Camera {
  const fit = fitCamera(layout.viewBounds, viewport, Metrics.sceneInsets, Metrics.sceneVerticalBias);
  const landscape = Ease.clamp01((viewport.x / viewport.y - 0.9) / 0.5);
  if (landscape <= 0) return fit;
  const ringY = fit.focus.y + fit.center.y * fit.scale;
  const middle = (Metrics.sceneInsets.top + viewport.y) / 2 - 10;
  const front = toScreen(fit, layout.stopPose(layout.player).position).y + layout.laneWidth * fit.scale;
  const room = Math.max(0, viewport.y - bottomInset - 12 - front);
  return { ...fit, focus: v(fit.focus.x, fit.focus.y + Math.min((middle - ringY) * 0.8 * landscape, room)) };
}

export function perspectiveCamera(p: Perspective, layout: RoundaboutLayout, viewport: Vec2, bottomInset: number): Camera {
  const street = streetCamera(layout, viewport, bottomInset);
  const T = PerspectiveTuning;
  switch (p) {
    case 'street':
      return street;
    case 'builder': {
      const map = BuildLayout.builderMap(viewport, bottomInset);
      return { viewport, center: v(0, 0), focus: map.center, scale: map.radius / layout.ringRadius };
    }
    case 'shop':
    case 'progress':
    case 'social': {
      const dir = p === 'shop' ? T.shopDirection : p === 'social' ? T.socialDirection : T.progressDirection;
      return { viewport, center: mul(fromAngle(dir), layout.ringRadius + T.shopDistance), focus: v(viewport.x / 2, viewport.y * 0.45), scale: street.scale * T.shopZoom };
    }
    case 'upgrades':
      return { ...street, scale: street.scale * T.upgradesZoom };
  }
}

/** Between two cameras: the zoom in steps of equal feel (geometric), the rest straight. */
export const blendCameras = (a: Camera, b: Camera, t: number): Camera => ({
  viewport: b.viewport,
  center: lerpV(a.center, b.center, t),
  focus: lerpV(a.focus, b.focus, t),
  scale: a.scale * Math.pow(b.scale / a.scale, t),
});

/** The camera on its way; the session asks it every frame for the camera to draw with. */
export class CameraRig {
  perspective: Perspective | null = null;
  ringRadius = 0;
  from: Camera | null = null;
  age = 0;
  /** How long the glide under way takes. */
  glide = PerspectiveTuning.glide;
  shown: Camera | null = null;

  camera(p: Perspective, layout: RoundaboutLayout, viewport: Vec2, bottomInset: number, delta: number, reduceMotion: boolean): Camera {
    const T = PerspectiveTuning;
    const target = perspectiveCamera(p, layout, viewport, bottomInset);
    const moved = p !== this.perspective || layout.ringRadius !== this.ringRadius;
    if (this.perspective === null && p === 'street' && !reduceMotion) {
      // The first frame after loading: the eye comes to rest on the ring.
      this.from = { ...target, scale: target.scale * T.focusFrom };
      this.glide = T.focusArrive;
      this.age = 0;
    } else if (moved && this.shown && !reduceMotion && this.perspective !== null) {
      this.from = this.shown;
      this.glide = p === 'street' && p !== this.perspective ? T.focusGlide : T.glide;
      this.age = 0;
    } else this.age += delta;
    this.perspective = p;
    this.ringRadius = layout.ringRadius;
    let cam = target;
    const from = this.from;
    if (from && this.age < this.glide && from.viewport.x === viewport.x && from.viewport.y === viewport.y) {
      cam = blendCameras(from, target, Ease.settle(this.age / this.glide));
    } else this.from = null;
    this.shown = cam;
    return cam;
  }

  /** How fast the glide under way moves now, 0 at rest to 1 at its fastest (the slope of `Ease.settle`). */
  get motion(): number {
    if (!this.from || this.age >= this.glide) return 0;
    const k = 8.5;
    const x = this.age / this.glide;
    return (k * k * x * Math.exp(-k * x)) / (k / Math.E);
  }
}

/** Upgrades: the city around the ring steps back into the dark; the ring itself stays. */
export function addRecede(list: RenderList, opacity: number, layout: RoundaboutLayout): void {
  if (opacity <= 0.001) return;
  const cam = list.camera;
  const center = toScreen(cam, v(0, 0));
  const inner = (layout.ringRadius + layout.laneWidth / 2 + 10) * cam.scale;
  const far = length(v(cam.viewport.x + 2 * Math.abs(center.x - cam.viewport.x / 2), cam.viewport.y + 2 * Math.abs(center.y - cam.viewport.y / 2)));
  const steps = 5;
  const feather = 60;
  for (let step = 0; step < steps; step++) {
    const from = inner + (feather * step) / steps;
    list.s(arc(center, from + feather / steps / 2, feather / steps + 0.5, 0, Math.PI * 2), list.background, (opacity * 0.6 * (step + 1)) / (steps + 1));
  }
  const start = inner + feather;
  list.s(arc(center, (start + far) / 2, far - start, 0, Math.PI * 2), list.background, opacity * 0.6);
}
