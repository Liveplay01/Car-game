// Condition & failure icons, v2. 24×24 grid, 2 px safe area, 1.8 stroke, round caps.
// Neutral parts are strokes in currentColor; the part that carries meaning is one solid colour from the game palette.
// Every loop starts and ends on the resting picture, so playback never jumps.
(() => {
const E = 'cubic-bezier(.23,1,.32,1)';
const IN = 'cubic-bezier(.55,0,.85,.4)';
const C = { blue: '#4FA3FF', coin: '#E3C15A', amber: '#FFB703', red: '#FF453A', danger: '#FF5A5F', orange: '#FF9F0A', yellow: '#FFD60A', epic: '#B45CF0', ice: '#BFE6F5', sand: '#D9C08C', smoke: '#9CA3AC', lamp: '#FFEED0', hazard: '#FFD100', muted: '#99A2AF', ink: '#0B0D10', police: '#2F63E0', grey: '#9AA3AE', road: '#353C46', bus: '#F7BE16' };
const on = (sel, name, dur, ease = E, delay = '0s', n = 1) => `.on ${sel}{animation:${name} ${dur} ${ease} ${delay} ${n} both}`;
const KO = 'style="stroke:var(--icon-bg)"';
const CL = 'M7 14a3.5 3.5 0 0 1-.4-7A5.5 5.5 0 0 1 17.4 7a3.5 3.5 0 0 1-.4 7H7Z';
const cloud = (cls = '') => `<path class="${cls}" d="${CL}" fill="currentColor" fill-opacity=".14"/>`;
const spark = (s) => `M0 ${-s}C${.18 * s} ${-.3 * s} ${.3 * s} ${-.18 * s} ${s} 0C${.3 * s} ${.18 * s} ${.18 * s} ${.3 * s} 0 ${s}C${-.18 * s} ${.3 * s} ${-.3 * s} ${.18 * s} ${-s} 0C${-.3 * s} ${-.18 * s} ${-.18 * s} ${-.3 * s} 0 ${-s}Z`;
const burst = (x, y, s = 3.8) => `<g transform="translate(${x} ${y})"><path d="${spark(s)}" fill="${C.orange}" stroke="none"/><path d="${spark(s * .5)}" transform="rotate(45)" fill="${C.yellow}" stroke="none"/></g>`;
const car = (c, x, y, r = 0, s = 1, extra = '') => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-4.5" y="-2.6" width="9" height="5.2" rx="1.7" fill="${c}" stroke-width="1.6" paint-order="stroke" ${KO}/><rect x="1" y="-1.85" width="1.7" height="3.7" rx=".6" fill="${C.ink}" fill-opacity=".45" stroke="none"/>${extra}</g>`;
const runner = (c) => `<circle cx="14.6" cy="4.6" r="2.1" fill="${c}" stroke="none"/><path d="M13.4 8.4 11 13.2M13.3 8.8l2.8 2 1.8-1M13.3 8.8l-2.8.4-1.7 2M11 13.2l3.3 2.2-.8 4.6M11 13.2l-1.8 3.4-3.4 1" stroke="${c}" stroke-width="2"/>`;
const speed = `<path class="sp" pathLength="1" d="M2.5 8.5h3M2 13h3.5" stroke="${C.muted}" stroke-width="1.6"/>`;
const star = (cx, cy, R, r) => 'M' + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; return `${(cx + Math.cos(a) * k).toFixed(2)} ${(cy + Math.sin(a) * k).toFixed(2)}`; }).join('L') + 'Z';
const slash = (a, b) => `<path d="M${a} ${a}L${b} ${b}" stroke-width="5.4" ${KO}/><path class="sl" pathLength="1" d="M${a} ${a}L${b} ${b}" stroke="${C.danger}" stroke-width="2.2"/>`;


const arc = (a0, a1, r) => { const p = (a) => [12 + r * Math.cos(a * Math.PI / 180), 12 + r * Math.sin(a * Math.PI / 180)].map((v) => v.toFixed(2)).join(' '); return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`; };
const head = (a, r) => { const t = a * Math.PI / 180, x = 12 + r * Math.cos(t), y = 12 + r * Math.sin(t), dx = -Math.sin(t), dy = Math.cos(t), nx = Math.cos(t), ny = Math.sin(t); const b = (k) => `${(x - dx * 2.4 + nx * k * 2).toFixed(2)} ${(y - dy * 2.4 + ny * k * 2).toFixed(2)}`; return `M${b(1)}L${x.toFixed(2)} ${y.toFixed(2)}L${b(-1)}`; };
const siren = (rays) => `<rect x="4.5" y="17" width="15" height="3.6" rx="1.2" fill="currentColor" fill-opacity=".14" stroke="currentColor"/><path class="dome" d="M7 17v-4.2a5 5 0 0 1 10 0V17Z" fill="${C.blue}" stroke="${C.blue}" stroke-width="1.2"/>` +
  (rays ? ['M12 3v2.2', 'M5 6l1.5 1.5M19 6l-1.5 1.5', 'M2.8 12.5h2M21.2 12.5h-2'].map((d, i) => `<path class="r${i}" d="${d}" stroke="currentColor"/>`).join('') : '');

const ICONS = {
  lightRain: {
    body: cloud() + `<path class="d1" d="M9 17.4l-.9 2.8" stroke="${C.blue}" stroke-width="2"/><path class="d2" d="M15 17.4l-.9 2.8" stroke="${C.blue}" stroke-width="2"/>`,
  },
  heavyRain: {
    body: cloud() + [[8, 16.8], [12, 18.2], [16, 16.8]].map(([x, y], i) => `<path class="d${i + 1}" d="M${x} ${y}l-1.2 3.8" stroke="${C.blue}" stroke-width="2"/>`).join(''),
  },
  storm: {
    body: `<g class="cl">${cloud()}</g><path class="b" d="M12.8 14l-3.4 4.6h3l-1.3 4 4.5-5.8h-3l1.4-2.8Z" fill="${C.coin}" stroke="${C.coin}" stroke-width="1.2"/>`,
  },
  extreme: {
    body: ['M4 4.5h16', 'M5.5 8.5h14', 'M8 12.5h10', 'M9.5 16.5h6', 'M11 20.5h2.5'].map((d, i) => `<path class="t${i}" d="${d}" stroke="${C.red}" stroke-width="2"/>`).join(''),
  },
  fog: {
    body: cloud() + `<path class="f1" d="M4.5 17.5h11" stroke="${C.smoke}" stroke-width="2"/><path class="f2" d="M8.5 21h11" stroke="${C.smoke}" stroke-width="2"/>`,
  },
  hail: {
    body: cloud() + [[8, 18.2], [12, 21], [16, 18.2]].map(([x, y], i) => `<circle class="h${i}" cx="${x}" cy="${y}" r="1.5" fill="${C.ice}" stroke="none"/>`).join(''),
  },
  sandstorm: {
    body: `<circle class="sun" cx="15.5" cy="8.5" r="4.5" fill="${C.orange}" stroke="none"/>` +
      ['M3 12.5h10a2.5 2.5 0 1 0-2.5-2.5', 'M3 16.5h14a2.5 2.5 0 1 1-2.5 2.5', 'M3 20.5h7'].map((d, i) => `<path class="w w${i}" pathLength="1" d="${d}" stroke-width="4.4" ${KO}/><path class="w w${i}" pathLength="1" d="${d}" stroke="${C.sand}" stroke-width="2"/>`).join(''),
  },
  snow: {
    body: `<g class="fl" stroke="${C.ice}">` + [0, 60, 120].map((r) => `<g transform="rotate(${r} 12 12)"><path d="M12 3.5v17M9.8 4.9 12 6.7l2.2-1.8M9.8 19.1l2.2-1.8 2.2 1.8"/></g>`).join('') + `</g>`,
  },
  night: {
    body: `<path class="mo" d="M19.5 14.8A8 8 0 1 1 9.2 4.5a6.4 6.4 0 0 0 10.3 10.3Z" fill="${C.lamp}" stroke="${C.lamp}" stroke-width="1"/>` +
      `<g transform="translate(17.6 6.4)"><path class="s1" d="${spark(2.3)}" fill="${C.lamp}" stroke="none"/></g><g transform="translate(20.8 10.8)"><path class="s2" d="${spark(1.4)}" fill="${C.lamp}" stroke="none"/></g>`,
  },
  blackout: {
    body: `<path class="cone" d="M13.2 6.6h5.6l3 8.4H10.2Z" fill="${C.lamp}" fill-opacity=".45" stroke="none"/><path d="M7 21V8.5a4 4 0 0 1 4-4h2.4M4.5 21h5" stroke="${C.muted}"/><path d="M13.4 4.6h5.2" stroke="${C.muted}" stroke-width="3"/>` + slash(3.5, 20.5),
  },
  marathon: {
    body: `<path d="M6 21V3.5" stroke="currentColor"/><path d="M6 4.5h13V13H6Z" fill="currentColor" fill-opacity=".14" stroke="${C.orange}" stroke-width="1.4"/>` +
      [[6, 4.5], [14.66, 4.5], [10.33, 8.75]].map(([x, y], i) => `<rect class="c${i}" x="${x}" y="${y}" width="4.34" height="4.25" fill="${C.orange}" stroke="none"/>`).join(''),
  },
  roadworks: {
    body: `<defs><clipPath id="cc"><path d="M10.4 4.5h3.2l4.3 14H6.1Z"/></clipPath></defs><g class="cn"><path d="M10.4 4.5h3.2l4.3 14H6.1Z" fill="${C.orange}" stroke="${C.orange}" stroke-width="1.6"/><g clip-path="url(#cc)" fill="#F4F6F9" stroke="none"><rect x="4" y="9" width="16" height="1.9"/><rect x="4" y="13.4" width="16" height="1.9"/></g></g><path d="M4 20h16" stroke="currentColor"/>`,
  },
  roadClosure: {
    body: `<path d="M6.5 13v7.5M17.5 13v7.5" stroke="currentColor"/><defs><clipPath id="bc"><rect x="2.5" y="6" width="19" height="7" rx="2"/></clipPath></defs><g class="bd"><rect x="2.5" y="6" width="19" height="7" rx="2" fill="#F4F6F9" stroke="none"/><path clip-path="url(#bc)" fill="${C.red}" stroke="none" d="${[0, 6, 12, 18].map((o) => `M${4 + o} 6h3l-3.5 7h-3Z`).join('')}"/></g>`,
  },
  concert: {
    body: `<g class="nt" fill="${C.epic}" stroke="${C.epic}"><path d="M9.6 17V6.6M18.2 15V4.6"/><path d="M9.6 6.6 18.2 4.6v3l-8.6 2Z" stroke-width="1"/><ellipse cx="7.6" cy="17.2" rx="2.6" ry="2" transform="rotate(-22 7.6 17.2)" stroke="none"/><ellipse cx="16.2" cy="15.2" rx="2.6" ry="2" transform="rotate(-22 16.2 15.2)" stroke="none"/></g>`,
  },
  vipConvoy: {
    body: `<path class="st" d="${star(12, 12.4, 9, 3.9)}" fill="${C.coin}" stroke="${C.coin}" stroke-width="1.4"/><g transform="translate(19.6 4)"><path class="gl" d="${spark(2.2)}" fill="${C.lamp}" stroke="none"/></g>`,
  },
  policeOperation: { body: siren(true) },
  schoolRun: {
    body: `<g class="sg"><rect x="5" y="3" width="14" height="15.5" rx="3" fill="${C.bus}" stroke="none"/><rect x="7" y="5.5" width="10" height="6" rx="1.4" fill="${C.ink}" fill-opacity=".5" stroke="none"/><circle cx="8.4" cy="15" r="1.2" fill="${C.ink}" stroke="none"/><circle cx="15.6" cy="15" r="1.2" fill="${C.ink}" stroke="none"/><path d="M7.5 18.5v2.5M16.5 18.5v2.5" stroke="currentColor" stroke-width="2.4"/></g>`,
  },
  road: {
    body: `<circle cx="12" cy="12" r="2.6" fill="currentColor" fill-opacity=".14" stroke="currentColor"/><g class="ra" stroke="${C.amber}" stroke-width="2">` + [0, 1, 2].map((i) => { const a0 = -75 + i * 120; return `<path d="${arc(a0, a0 + 78, 7.5)}${head(a0 + 78, 7.5)}"/>`; }).join('') + `</g>`,
  },

  mergeCrash: {
    body: `<path d="M2 5h20M2 13h7M15 13h7M9 13v9M15 13v9" stroke="currentColor"/><path d="M3 9h3M10.5 9h3M18 9h3" stroke="currentColor" stroke-opacity=".35"/><path class="dr" pathLength="1" d="M12 22v-12" stroke="${C.red}" stroke-width="2"/><g class="bu"><circle cx="12" cy="9" r="4.4" fill="var(--icon-bg)" stroke="none"/>${burst(12, 9, 4)}</g>`,
  },
  cutOffCrash: {
    body: `<path d="M4 3v18M20 3v18" stroke="currentColor" stroke-opacity=".35"/><path d="M12 3v3M12 10v4M12 18v3" stroke="currentColor" stroke-opacity=".35"/><path class="dr" pathLength="1" d="M16 21v-4c0-3.5-8-4-8-8V8" stroke="${C.red}" stroke-width="2"/><g class="bu">${burst(8, 6.6, 3.8)}</g>`,
  },
  ringCrash: {
    body: `<g stroke="currentColor" opacity=".28" stroke-width="4" stroke-linecap="butt"><path d="M12 1v4.5M12 19v4M1 12h4.5M19 12h4"/><circle cx="12" cy="12" r="6.5"/></g><circle cx="12" cy="12" r="2.6" fill="currentColor" fill-opacity=".14" stroke="currentColor"/><g class="bu"><circle cx="16.6" cy="7.4" r="4.2" fill="var(--icon-bg)" stroke="none"/>${burst(16.6, 7.4, 3.8)}</g>`,
  },
  policeCrash: {
    body: siren(false) + `<g class="bu"><circle cx="18" cy="7" r="4.4" fill="var(--icon-bg)" stroke="none"/>${burst(18, 7, 3.8)}</g>`,
  },
  bomb: {
    body: `<circle cx="10.5" cy="14" r="6.5" fill="currentColor" fill-opacity=".14" stroke="currentColor"/><path d="M14.6 9.9l1.6-1.6" stroke="currentColor" stroke-width="2.6"/><path d="M16.2 8.3c.6-1.6 1.8-2.4 3.2-2.4" stroke="currentColor" stroke-width="1.4"/><g transform="translate(19.8 5.6)"><path class="fz" d="${spark(2.4)}" fill="${C.orange}" stroke="none"/></g>`,
  },
  escape: {
    body: `<path d="M17.6 16.2A7 7 0 1 1 17.6 7.8" stroke="currentColor"/><g class="ar" stroke="${C.epic}" stroke-width="2"><path d="M9 12h12M18 9l3 3-3 3"/></g>`,
  },
  bossEscape: {
    body: `<path class="cr" d="M5.5 14h13l1.2-8-3.9 2.8L12 3.5 8.2 8.8 4.3 6Z" fill="${C.coin}" stroke="${C.coin}" stroke-width="1.2"/><g class="ar" stroke="${C.epic}" stroke-width="2"><path d="M4.5 19.5h14.5M16.5 17l2.5 2.5-2.5 2.5"/></g>`,
  },
  ruleCrash: {
    body: `<circle cx="12" cy="12" r="9.4" stroke="${C.danger}" stroke-width="2.2"/><g class="bu">${burst(12, 12, 5.6)}</g>`,
  },
  ruleCutOff: {
    body: `<circle cx="12" cy="12" r="9.4" stroke="${C.danger}" stroke-width="2.2"/><path class="dr" pathLength="1" d="M15 18v-2.5c0-3-6-3-6-6V6.5" stroke="currentColor" stroke-width="2"/><path d="M6.8 8.6 9 6.4l2.2 2.2" stroke="currentColor" stroke-width="2"/>`,
  },
};

// Calm motion: one short gesture (~0.9 s) per 3 s cycle, small amplitude, no overshoot chains.
const T = '3s';
const a = (sel, k, d = 0, ease = E) => `.on ${sel}{animation:${k} ${T} ${ease} ${d}s 1 both}`;
const KF = `.sp,.sl,.w,.dr{stroke-dasharray:1 1}
@keyframes spin120{0%{transform:none}30%,100%{transform:rotate(120deg)}}
@keyframes pulse{0%{transform:none}12%{transform:scale(.9)}30%,100%{transform:none}}
@keyframes lift{0%{transform:none}12%{transform:translateY(-1.2px)}30%,100%{transform:none}}
@keyframes dim{0%{opacity:1}10%{opacity:.3}28%,100%{opacity:1}}
@keyframes flash{0%{opacity:1}6%{opacity:.25}12%{opacity:1}18%{opacity:.45}30%,100%{opacity:1}}
@keyframes fall{0%{transform:none;opacity:1}10%{transform:translateY(1.5px);opacity:0}11%{transform:translateY(-1.5px);opacity:0}28%,100%{transform:none;opacity:1}}
@keyframes draw{0%{stroke-dashoffset:0;opacity:1}8%{stroke-dashoffset:0;opacity:0}9%{stroke-dashoffset:1;opacity:1}30%,100%{stroke-dashoffset:0}}
@keyframes slideR{0%{transform:none}15%{transform:translateX(1.4px)}32%,100%{transform:none}}
@keyframes slideL{0%{transform:none}15%{transform:translateX(-1.4px)}32%,100%{transform:none}}
@keyframes spin60{0%{transform:none}30%,100%{transform:rotate(60deg)}}
@keyframes spin72{0%{transform:none}30%,100%{transform:rotate(72deg)}}
@keyframes spin36{0%{transform:none}30%,100%{transform:rotate(36deg)}}
@keyframes twinkle{0%,18%{transform:scale(0)}30%{transform:scale(1) rotate(45deg)}46%,100%{transform:scale(0) rotate(90deg)}}
@keyframes flick{0%{opacity:0}8%{opacity:.7}14%{opacity:.25}22%{opacity:.6}34%,100%{opacity:0}}
@keyframes enter{0%{transform:none;opacity:1}8%{transform:none;opacity:0}9%{transform:translate(var(--bx),var(--by));opacity:0}16%{opacity:1}32%,100%{transform:none;opacity:1}}
@keyframes pop{0%{transform:none;opacity:1}8%{transform:scale(.5);opacity:0}26%{transform:scale(.5);opacity:0}36%,100%{transform:none;opacity:1}}`;
const crash = (bx, by) => `.mv{--bx:${bx}px;--by:${by}px}` + a('.mv', 'enter') + a('.bu', 'pop');
const ring = ['ca', 'cb'].map((n, i) => { const s = i ? 1 : -1; return `@keyframes ${n}{0%{transform:rotate(${24 * s}deg);opacity:1}8%{transform:rotate(${24 * s}deg);opacity:0}9%{transform:rotate(${60 * s}deg);opacity:0}16%{opacity:1}32%,100%{transform:rotate(${24 * s}deg);opacity:1}}`; }).join('');
const MOTION = {
  lightRain: a('.d1', 'fall') + a('.d2', 'fall', .12),
  heavyRain: a('.d1', 'fall') + a('.d2', 'fall', .08) + a('.d3', 'fall', .16),
  storm: a('.b', 'flash', 0, 'linear'),
  extreme: [0, 1, 2, 3, 4].map((i) => a('.t' + i, 'dim', i * .06)).join(''),
  fog: a('.f1', 'slideR') + a('.f2', 'slideL'),
  hail: [0, 1, 2].map((i) => a('.h' + i, 'fall', i * .08)).join(''),
  sandstorm: [0, 1, 2].map((i) => a('.w' + i, 'draw', i * .08)).join(''),
  snow: '.fl{transform-box:view-box;transform-origin:12px 12px}' + a('.fl', 'spin60'),
  night: a('.s1', 'dim') + a('.s2', 'dim', .15),
  blackout: '.cone{opacity:0}' + a('.cone', 'flick', 0, 'linear') + a('.sl', 'draw', .1),
  marathon: [0, 1, 2].map((i) => a('.c' + i, 'dim', i * .08)).join(''),
  roadworks: '.cn{transform-origin:50% 100%}' + a('.cn', 'pulse'),
  roadClosure: a('.bd', 'lift'),
  concert: '.nt{transform-origin:50% 100%}' + a('.nt', 'pulse'),
  vipConvoy: '.gl{transform:scale(0)}' + a('.st', 'spin72') + a('.gl', 'twinkle', .1),
  policeOperation: [0, 1, 2].map((i) => a('.r' + i, 'dim', i * .08)).join(''),
  schoolRun: a('.sg', 'lift'),
  road: '.ra{transform-box:view-box;transform-origin:12px 12px}' + a('.ra', 'spin120'),
  mergeCrash: a('.dr', 'draw') + a('.bu', 'pop'),
  cutOffCrash: a('.dr', 'draw') + a('.bu', 'pop'),
  ringCrash: a('.bu', 'pop'),
  policeCrash: a('.dome', 'dim', 0, 'linear') + a('.bu', 'pop'),
  bomb: a('.fz', 'pulse'),
  escape: a('.ar', 'slideR'),
  bossEscape: a('.ar', 'slideR') + a('.cr', 'lift', .08),
  ruleCrash: a('.bu', 'pop'),
  ruleCutOff: a('.dr', 'draw'),
};

const BIG = new Set();
const BASE = `:host{display:inline-flex;--icon-bg:#14181D}
.frm{width:var(--sz);height:var(--sz);display:grid;place-items:center;color:#F4F6F9}
.frm.chip{border-radius:50%;background:#1E232A;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 6px 20px rgba(5,7,10,.45);--icon-bg:#1E232A}
svg{width:100%;height:100%;display:block;overflow:visible}
.chip svg{width:46%;height:46%}
svg *{transform-box:fill-box;transform-origin:center}
svg [transform]{transform-box:view-box;transform-origin:0 0}
.loop *{animation-iteration-count:infinite!important}
@media (prefers-reduced-motion:reduce){svg *{animation:none!important}}`;

class CgIcon extends HTMLElement {
  static get observedAttributes() { return ['name', 'mode', 'size', 'frame']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.addEventListener('pointerenter', () => this.replay());
    this.addEventListener('pointerdown', () => this.replay());
  }
  #get(k, d) { return this['_' + k] ?? this.getAttribute(k) ?? d; }
  set name(v) { this._name = v; this.render(); } get name() { return this.#get('name'); }
  set mode(v) { this._mode = v; this.render(); } get mode() { return this.#get('mode', 'loop'); }
  set size(v) { this._size = v; this.render(); } get size() { return this.#get('size', 48); }
  set frame(v) { this._frame = v; this.render(); } get frame() { return this.#get('frame', 'free'); }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const ic = ICONS[this.name];
    if (!ic || !this.isConnected) return;
    const key = [this.name, this.mode, this.size, this.frame].join('|');
    if (key === this._key) return;
    this._key = key;
    const cls = this.mode === 'still' ? '' : this.mode === 'loop' ? 'on loop' : 'on';
    this.shadowRoot.innerHTML = `<style>${BASE}${KF}${MOTION[this.name] || ""}</style><div class="frm ${this.frame === 'chip' ? 'chip' : ''}" style="--sz:${parseFloat(this.size)}px"><svg class="${cls}" viewBox="${BIG.has(this.name) ? '2.5 2.5 19 19' : '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.body}</svg></div>`;
  }
  replay() {
    if (this.mode === 'still') return;
    const s = this.shadowRoot.querySelector('svg');
    if (!s) return;
    s.classList.remove('on');
    void s.getBoundingClientRect();
    s.classList.add('on');
  }
}
if (!customElements.get('cg-icon')) customElements.define('cg-icon', CgIcon);
window.CG_ICON_NAMES = Object.keys(ICONS);
})();
