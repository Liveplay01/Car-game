// Turns the designer's condition icons (icon/condition-icons.js, a web component with SVG and CSS keyframes) into
// src/present/conditionIconData.ts: flat shapes in the 24 grid, game colour tokens, and the keyframes of each moving part.
// The game draws them on its canvas through the Pen (present/conditionIcons.ts), so they also reach the website's SVGs.
//   node scripts/condition-icons.mjs [path/to/condition-icons.js]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] ?? path.join(root, 'icon/condition-icons.js'));
const target = path.join(root, 'src/present/conditionIconData.ts');

// MARK: Run the component and take the markup it renders per icon

let Component;
const sandbox = {
  HTMLElement: class {
    attachShadow() {
      this.shadowRoot = { innerHTML: '', querySelector: () => null };
      return this.shadowRoot;
    }
    addEventListener() {}
    getAttribute() {
      return null;
    }
  },
  customElements: { get: () => null, define: (_, c) => (Component = c) },
};
sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync(source, 'utf8'), sandbox);

const markup = {};
for (const id of sandbox.CG_ICON_NAMES) {
  const el = new Component();
  Object.assign(el, { _name: id, _mode: 'loop', _frame: 'free', _size: 48 });
  Object.defineProperty(el, 'isConnected', { value: true });
  el.render();
  markup[id] = el.shadowRoot.innerHTML;
}

// MARK: Colours: the designer's hex values are the game's own tokens

const theme = fs.readFileSync(path.join(root, 'src/present/theme.ts'), 'utf8');
const tokens = new Map();
for (const [, name, r, g, b, a] of theme.matchAll(/^\s+(\w+): \[(\d+), (\d+), (\d+), ([\d.]+)\],/gm)) {
  if (+a === 1) tokens.set(name, [+r, +g, +b]);
}
const PREFER = {
  '#F4F6F9': 'primary',
  '#99A2AF': 'muted',
  '#14181D': 'card',
  '#4FA3FF': 'lightBlue',
  '#E3C15A': 'coin',
  '#FFB703': 'accent',
  '#FF453A': 'juiceRed',
  '#FF5A5F': 'destructive',
  '#FF9F0A': 'juiceOrange',
  '#FFD60A': 'hazard',
  '#B45CF0': 'rarityEpic',
  '#BFE6F5': 'skinIce',
  '#D9C08C': 'mapSand',
  '#FFEED0': 'headlight',
  '#9CA3AC': 'smokeLight',
  '#0B0D10': 'background',
  '#F7BE16': 'vehicleBus',
};
const token = (value) => {
  if (value === 'currentColor') return 'primary';
  if (value === 'var(--icon-bg)') return 'card';
  const hex = value.toUpperCase();
  const name = PREFER[hex];
  if (!name || !tokens.has(name)) throw new Error(`No colour token for ${value}`);
  const [r, g, b] = tokens.get(name);
  const [x, y, z] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (Math.abs(r - x) + Math.abs(g - y) + Math.abs(b - z) > 16) throw new Error(`${value} is too far from ${name}`);
  return name;
};

// MARK: CSS: keyframes, which part plays which, rest states

const num = (x) => Math.round(x * 100) / 100;

function parseTransform(value) {
  const o = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
  if (value === 'none') return o;
  for (const [, fn, args] of value.matchAll(/(\w+)\(([^)]*)\)/g)) {
    if (args.includes('var(')) return null;
    const v = args.split(/[ ,]+/).map((s) => parseFloat(s));
    if (fn === 'translateX') o.tx = v[0];
    else if (fn === 'translateY') o.ty = v[0];
    else if (fn === 'translate') [o.tx, o.ty] = [v[0], v[1] ?? 0];
    else if (fn === 'scale') [o.sx, o.sy] = [v[0], v[1] ?? v[0]];
    else if (fn === 'rotate') o.rot = v[0];
    else throw new Error(`transform ${fn}`);
  }
  return o;
}

/** Per property, its stops: [at 0..1, value]. CSS tweens each property between the keyframes that name it. */
function parseKeyframes(css) {
  const out = {};
  for (const [, name, body] of css.matchAll(/@keyframes (\w+)\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    const props = {};
    let usesVars = false;
    for (const [, stops, decls] of body.matchAll(/([\d.%,]+)\{([^}]*)\}/g)) {
      for (const stop of stops.split(',')) {
        const at = parseFloat(stop) / 100;
        const put = (key, val) => (props[key] ??= []).push([at, num(val)]);
        for (const [, prop, value] of decls.matchAll(/([\w-]+):([^;]+)/g)) {
          if (prop === 'opacity') put('op', +value);
          else if (prop === 'stroke-dashoffset') put('dash', +value);
          else if (prop === 'transform') {
            const t = parseTransform(value);
            if (t) for (const key of Object.keys(t)) put(key, t[key]);
            else usesVars = true;
          }
        }
      }
    }
    if (!usesVars) out[name] = Object.fromEntries(Object.entries(props).map(([k, stops]) => [k, stops.sort((a, b) => a[0] - b[0])]));
  }
  return out;
}

// MARK: SVG: parse, flatten curves, apply transforms and clips

function parseTree(svg) {
  const root = { tag: 'root', attrs: {}, children: [] };
  const stack = [root];
  for (const [, close, tag, rest, self] of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^>"]|"[^"]*")*?)(\/?)>/g)) {
    if (close) {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const [, k, v] of rest.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[k] = v;
    const node = { tag, attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!self && !rest.endsWith('/')) stack.push(node);
  }
  return root.children[0];
}

const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseMatrix(value) {
  let m = IDENTITY;
  for (const [, fn, args] of (value ?? '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = args.split(/[ ,]+/).map(parseFloat);
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, v[0], v[1] ?? 0]);
    else if (fn === 'scale') m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else if (fn === 'rotate') {
      const a = (v[0] * Math.PI) / 180;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      m = mul(m, [1, 0, 0, 1, v[1] ?? 0, v[2] ?? 0]);
      m = mul(m, [c, s, -s, c, 0, 0]);
      m = mul(m, [1, 0, 0, 1, -(v[1] ?? 0), -(v[2] ?? 0)]);
    } else throw new Error(`transform ${fn}`);
  }
  return m;
}

/** A path's subpaths as point lists. Curves become short straight pieces. */
function flatten(d) {
  const tokens = [...d.matchAll(/([a-zA-Z])|(-?\d*\.?\d+(?:e-?\d+)?)/g)].map((m) => m[1] ?? parseFloat(m[2]));
  const subs = [];
  let cur = null;
  let i = 0;
  let [x, y, sx, sy, cmd] = [0, 0, 0, 0, ''];
  let last = null;
  const arg = () => tokens[i++];
  const move = (nx, ny) => {
    cur = { pts: [nx, ny], closed: false };
    subs.push(cur);
    [x, y, sx, sy] = [nx, ny, nx, ny];
  };
  const line = (nx, ny) => {
    if (!cur) move(x, y);
    cur.pts.push(nx, ny);
    [x, y] = [nx, ny];
  };
  const cubic = (x1, y1, x2, y2, nx, ny) => {
    const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(nx - x2, ny - y2);
    const n = Math.min(20, Math.max(3, Math.ceil(len / 1)));
    const [x0, y0] = [x, y];
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      const u = 1 - t;
      line(u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * nx, u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * ny);
    }
    last = [x2, y2, 'c'];
  };
  const arcTo = (rx, ry, rot, large, sweep, nx, ny) => {
    if (rx === 0 || ry === 0) return line(nx, ny);
    const phi = (rot * Math.PI) / 180;
    const [c, s] = [Math.cos(phi), Math.sin(phi)];
    const dx = (x - nx) / 2;
    const dy = (y - ny) / 2;
    const x1 = c * dx + s * dy;
    const y1 = -s * dx + c * dy;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) {
      rx *= Math.sqrt(lam);
      ry *= Math.sqrt(lam);
    }
    const k0 = (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1);
    const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, k0));
    const cx1 = (k * rx * y1) / ry;
    const cy1 = (-k * ry * x1) / rx;
    const cx = c * cx1 - s * cy1 + (x + nx) / 2;
    const cy = s * cx1 + c * cy1 + (y + ny) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
    let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    if (sweep && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(3, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / 1));
    for (let q = 1; q <= n; q++) {
      const a = t1 + (dt * q) / n;
      line(cx + rx * Math.cos(a) * c - ry * Math.sin(a) * s, cy + rx * Math.cos(a) * s + ry * Math.sin(a) * c);
    }
    line(nx, ny);
  };
  while (i < tokens.length) {
    if (typeof tokens[i] === 'string') cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const [ox, oy] = rel ? [x, y] : [0, 0];
    switch (cmd.toUpperCase()) {
      case 'M': {
        move(arg() + ox, arg() + oy);
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L':
        line(arg() + ox, arg() + oy);
        break;
      case 'H':
        line(arg() + ox, y);
        break;
      case 'V':
        line(x, arg() + oy);
        break;
      case 'C': {
        const [a, b, c, d2, e, f] = [arg() + ox, arg() + oy, arg() + ox, arg() + oy, arg() + ox, arg() + oy];
        cubic(a, b, c, d2, e, f);
        break;
      }
      case 'S': {
        const [c, d2, e, f] = [arg() + ox, arg() + oy, arg() + ox, arg() + oy];
        const [rx, ry] = last?.[2] === 'c' ? [2 * x - last[0], 2 * y - last[1]] : [x, y];
        cubic(rx, ry, c, d2, e, f);
        break;
      }
      case 'Q': {
        const [a, b, e, f] = [arg() + ox, arg() + oy, arg() + ox, arg() + oy];
        cubic(x + (2 / 3) * (a - x), y + (2 / 3) * (b - y), e + (2 / 3) * (a - e), f + (2 / 3) * (b - f), e, f);
        break;
      }
      case 'A': {
        const [rx, ry, rot, large, sweep] = [arg(), arg(), arg(), arg(), arg()];
        arcTo(rx, ry, rot, large, sweep, arg() + ox, arg() + oy);
        break;
      }
      case 'Z':
        if (cur) {
          cur.closed = true;
          [x, y] = [sx, sy];
          cur = null;
        }
        break;
      default:
        throw new Error(`path command ${cmd}`);
    }
    if (!'CSQ'.includes(cmd.toUpperCase())) last = null;
  }
  return subs;
}

const roundRect = (x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return [x, y, x + w, y, x + w, y + h, x, y + h];
  const pts = [];
  for (const [cx, cy, from] of [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]]) {
    for (let s = 0; s <= 6; s++) {
      const a = ((from + (s / 6) * 90) * Math.PI) / 180;
      pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  }
  return pts;
};

/** Sutherland–Hodgman against a convex clip. */
function clipTo(poly, clip) {
  const area = clip.reduce((s, _, i) => (i % 2 ? s : s + clip[i] * clip[(i + 3) % clip.length] - clip[(i + 2) % clip.length] * clip[i + 1]), 0);
  const sign = area < 0 ? -1 : 1;
  let out = poly;
  for (let i = 0; i < clip.length; i += 2) {
    const [ax, ay, bx, by] = [clip[i], clip[i + 1], clip[(i + 2) % clip.length], clip[(i + 3) % clip.length]];
    const inside = (px, py) => sign * ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) >= 0;
    const cross = (p, q) => {
      const t = ((bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax)) / ((by - ay) * (q[0] - p[0]) - (bx - ax) * (q[1] - p[1]));
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const input = [];
    for (let k = 0; k < out.length; k += 2) input.push([out[k], out[k + 1]]);
    const next = [];
    input.forEach((cur, k) => {
      const prev = input[(k + input.length - 1) % input.length];
      if (inside(cur[0], cur[1])) {
        if (!inside(prev[0], prev[1])) next.push(cross(prev, cur));
        next.push(cur);
      } else if (inside(prev[0], prev[1])) next.push(cross(prev, cur));
    });
    out = next.flat();
    if (!out.length) break;
  }
  return out;
}

const bbox = (pts) => {
  const xs = pts.filter((_, i) => i % 2 === 0);
  const ys = pts.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

const DASHED = new Set(['sp', 'sl', 'w', 'dr']);

const extent = (shapes) =>
  bbox(shapes.flatMap((s) => (s.circle ? [s.circle[0] - s.circle[2], s.circle[1] - s.circle[2], s.circle[0] + s.circle[2], s.circle[1] + s.circle[2]] : s.pts)));

/** Everything one icon needs: its shapes in drawing order, grouped into parts that move together. */
function buildIcon(id, html, keyframes) {
  const style = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  const svg = parseTree(html.slice(html.indexOf('<svg'), html.indexOf('</svg>') + 6));

  // `.on .d1{animation:fall 3s cubic-bezier(...) 0.12s 1 both}`
  const motion = {};
  for (const [, cls, kf, dur, ease, delay] of style.matchAll(/\.on \.(\w+)\{animation:(\w+) ([\d.]+)s (cubic-bezier\([^)]*\)|linear) ([\d.]+)s 1 both\}/g)) {
    if (!keyframes[kf]) throw new Error(`${id}: no keyframes ${kf}`);
    motion[cls] = { kf, dur: +dur, ease: ease === 'linear' ? 'linear' : 'out', delay: +delay };
  }
  const origins = {};
  for (const [, cls, origin] of style.matchAll(/\.(\w+)\{[^}]*transform-origin:([^;}]+)/g)) origins[cls] = origin.trim();

  const clips = {};
  const findClips = (node) => {
    for (const c of node.children) {
      if (c.tag !== 'clipPath') {
        findClips(c);
        continue;
      }
      const shape = c.children[0];
      clips[c.attrs.id] = shape.tag === 'rect' ? roundRect(+shape.attrs.x, +shape.attrs.y, +shape.attrs.width, +shape.attrs.height, +(shape.attrs.rx ?? 0)) : flatten(shape.attrs.d)[0].pts;
    }
  };
  findClips(svg);

  /** The shapes of a node and below, in order; a moving node comes back as one part. */
  const walk = (node, inherited, matrix, clip) => {
    if (node.tag === 'defs' || node.tag === 'clipPath') return [];
    const a = node.attrs;
    const css = Object.fromEntries([...(a.style ?? '').matchAll(/([\w-]+):([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
    const own = { ...inherited };
    for (const k of ['fill', 'stroke', 'stroke-width', 'stroke-linecap']) if (a[k] !== undefined) own[k] = a[k];
    if (css.stroke) own.stroke = css.stroke;
    own.opacity = (inherited.opacity ?? 1) * (a.opacity !== undefined ? +a.opacity : 1);
    const m = a.transform ? mul(matrix, parseMatrix(a.transform)) : matrix;
    const here = a['clip-path'] ? clips[/url\(#(\w+)\)/.exec(a['clip-path'])[1]] : clip;
    const cls = (a.class ?? '').split(/\s+/).filter(Boolean);

    let entries;
    if (node.tag === 'g') entries = node.children.flatMap((c) => walk(c, own, m, here));
    else entries = leaf(node, own, m, here, cls);

    const moving = cls.map((c) => motion[c]).find(Boolean);
    if (!moving) return entries;
    if (entries.some((e) => e.shapes)) throw new Error(`${id}: a moving part inside a moving part`);
    const shapes = entries.filter((e) => e.pts || e.circle);
    if (!shapes.length) return [];
    const [x0, y0, x1, y1] = extent(shapes);
    const origin = cls.map((c) => origins[c]).find(Boolean) ?? '50% 50%';
    const [ox, oy] = origin.split(/\s+/);
    const pivot = origin.includes('px') ? [parseFloat(ox), parseFloat(oy)] : [x0 + (parseFloat(ox) / 100) * (x1 - x0), y0 + (parseFloat(oy) / 100) * (y1 - y0)];
    return [{ shapes, pivot: pivot.map(num), motion: moving }];
  };

  const leaf = (node, own, m, clip, cls) => {
    const a = node.attrs;
    const fill = own.fill ?? 'none';
    const stroke = own.stroke ?? 'currentColor';
    const paint = {
      ...(fill !== 'none' ? { fill: [token(fill), num(own.opacity * +(a['fill-opacity'] ?? 1))] } : {}),
      ...(stroke !== 'none' ? { stroke: [token(stroke), num(+(own['stroke-width'] ?? 1.8) * Math.hypot(m[0], m[1])), num(own.opacity * +(a['stroke-opacity'] ?? 1))] } : {}),
      ...(own['stroke-linecap'] === 'butt' ? { butt: true } : {}),
      ...(cls.some((c) => DASHED.has(c)) ? { dash: true } : {}),
    };
    const to = (pts) => pts.flatMap((_, i) => (i % 2 ? [] : apply(m, pts[i], pts[i + 1]).map(num)));
    if (node.tag === 'circle') {
      if (clip) throw new Error(`${id}: clipped circle`);
      const [cx, cy] = apply(m, +a.cx, +a.cy);
      return [{ circle: [num(cx), num(cy), num(+a.r * Math.hypot(m[0], m[1]))], ...paint }];
    }
    let polys;
    if (node.tag === 'path') polys = flatten(a.d);
    else if (node.tag === 'rect') polys = [{ pts: roundRect(+a.x, +a.y, +a.width, +a.height, +(a.rx ?? 0)), closed: true }];
    else if (node.tag === 'ellipse') polys = [{ pts: Array.from({ length: 48 }, (_, i) => (i % 2 ? +a.cy + +a.ry * Math.sin(((i >> 1) / 24) * 2 * Math.PI) : +a.cx + +a.rx * Math.cos(((i >> 1) / 24) * 2 * Math.PI))), closed: true }];
    else throw new Error(`${id}: <${node.tag}>`);
    return polys.flatMap((poly) => {
      if (!clip) return [{ pts: to(poly.pts), closed: poly.closed, ...paint }];
      if (paint.stroke) throw new Error(`${id}: clipped stroke`);
      const cut = clipTo(to(poly.pts), to(clip));
      return cut.length >= 6 ? [{ pts: cut.map(num), closed: true, ...paint }] : [];
    });
  };

  // Shapes that stand still, one after another, share a part.
  const parts = [];
  for (const entry of svg.children.flatMap((c) => walk(c, {}, IDENTITY, null))) {
    if (entry.shapes) parts.push(entry);
    else if (parts.length && !parts.at(-1).motion) parts.at(-1).shapes.push(entry);
    else parts.push({ shapes: [entry] });
  }
  return parts.map((p) => ({ ...p, shapes: p.shapes.filter((s) => s.circle || s.pts.length >= 4) }));
}

// MARK: Write

const keyframesAll = {};
const icons = {};
for (const [id, html] of Object.entries(markup)) {
  const kf = parseKeyframes(html);
  Object.assign(keyframesAll, kf);
  icons[id] = buildIcon(id, html, kf);
}

const used = new Set(Object.values(icons).flatMap((parts) => parts.flatMap((p) => (p.motion ? [p.motion.kf] : []))));
const keyframes = Object.fromEntries(Object.entries(keyframesAll).filter(([k]) => used.has(k)));

const ids = Object.keys(icons);
const body = `// Generated by scripts/condition-icons.mjs from icon/condition-icons.js. Do not edit; run \`node scripts/condition-icons.mjs\`.
import type { ColorToken } from './theme';

/** A colour token and how opaque it is. */
export type Paint = readonly [ColorToken, number];

export interface IconShape {
  /** Points x, y, x, y … in the 24 grid. */
  pts?: number[];
  closed?: boolean;
  /** A circle: x, y, radius. */
  circle?: readonly [number, number, number];
  fill?: Paint;
  /** Colour, width, opacity. */
  stroke?: readonly [ColorToken, number, number];
  butt?: true;
  /** The stroke draws itself along its length (\`stroke-dashoffset\`). */
  dash?: true;
}

/** Per property, the stops [at 0..1, value] it is tweened between (a property no stop names stays at rest). */
export type Track = Partial<Record<'tx' | 'ty' | 'sx' | 'sy' | 'rot' | 'op' | 'dash', readonly (readonly [number, number])[]>>;

export interface IconPart {
  shapes: IconShape[];
  /** What it turns and scales round, in the 24 grid. */
  pivot?: readonly [number, number];
  motion?: { kf: string; dur: number; ease: 'out' | 'linear'; delay: number };
}

export const ICON_KEYFRAMES: Record<string, Track> = ${JSON.stringify(keyframes)};

export type ConditionIconId = ${ids.map((i) => `'${i}'`).join(' | ')};

export const CONDITION_ICONS: Record<ConditionIconId, IconPart[]> = ${JSON.stringify(icons)};
`;
fs.writeFileSync(target, body);
console.log(`${ids.length} icons, ${Object.keys(keyframes).length} keyframes -> ${path.relative(root, target)} (${Math.round(body.length / 1024)} KB)`);
