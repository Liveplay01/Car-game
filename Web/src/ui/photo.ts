import { h, icon } from './dom';
import { ICONS } from './icons';
import { CanvasDrawer } from '../present/draw';
import type { RenderList } from '../present/render';
import type { PhotoCard } from '../present/photo';
import { css, type ColorToken } from '../present/theme';
import { fontFor } from '../present/measure';
import { unitHash } from '../present/render';
import { S } from '../present/strings';

/**
 * The photo of a finished shift (Leo, 29.09.2026: "like a photo that was just shot"). The
 * button fires a flash with a shutter; a print drops out of it, tilted, and develops from
 * white. Under it only Share and Download. The print is the file that goes out: the scene
 * from above on a white card, a headline sticker, NEW BEST stamped on when it is one, the
 * orange date a film camera burns in, the score, the best facts and a line that dares.
 */

/** The print: 4:5 (what feeds and chats show whole), the photo square on it. */
const W = 1080;
const H = 1350;
const M = 48;
const P = W - 2 * M;
/** The scene is drawn at this many points, twice the pixels. */
const SCENE = P / 2;

export interface PhotoShot {
  list: RenderList;
  card: PhotoCard;
}

export interface PhotoHooks {
  /** Shutter sound and a light haptic, each only when the player has them on. */
  shutter(): void;
  reduceMotion(): boolean;
  /** The challenge link to send along, when the shift has one. */
  link(): string | null;
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
/** The print lands fast and settles long, like paper dropped on a table (expo out). */
const EASE_LAND = 'cubic-bezier(0.16, 1, 0.3, 1)';

export class PhotoView {
  private root: HTMLElement | null = null;
  private url: string | null = null;
  private opener: HTMLElement | null = null;
  private closing = false;

  constructor(
    private readonly app: HTMLElement,
    private readonly hooks: PhotoHooks,
  ) {}

  get isOpen(): boolean {
    return this.root !== null;
  }

  /** Flash first, in the frame of the click; the print follows as soon as it is made. */
  async open(capture: () => PhotoShot | null, opener: HTMLElement): Promise<void> {
    if (this.root) return;
    const shot = capture();
    if (!shot) return;
    const rm = this.hooks.reduceMotion();
    this.opener = opener;
    this.closing = false;

    const flash = h('div', { class: 'photo-flash', 'aria-hidden': 'true' });
    const scrim = h('div', { class: 'photo-scrim', 'aria-hidden': 'true' });
    const root = h('div', { class: 'photo-view', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.photo.dialog }, scrim, flash);
    document.body.append(root);
    this.root = root;
    this.app.inert = true;
    this.hooks.shutter();
    flash.animate(rm ? [{ opacity: 0.5 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0.95, offset: 0.12 }, { opacity: 0 }], { duration: rm ? 200 : 520, easing: 'ease-out', fill: 'forwards' });
    scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE_OUT, fill: 'forwards' });
    scrim.addEventListener('click', () => this.close());

    const print = await makePrint(shot);
    if (this.root !== root || this.closing) return;
    const blob = await new Promise<Blob | null>((resolve) => print.toBlob(resolve, 'image/png'));
    if (!blob || this.root !== root || this.closing) return this.close();
    const day = new Date().toISOString().slice(0, 10);
    const file = new File([blob], `car-game-${day}.png`, { type: 'image/png' });
    this.url = URL.createObjectURL(blob);

    const img = h('img', { src: this.url, alt: `${shot.card.headline}: ${shot.card.scoreLabel.toLowerCase()} ${shot.card.score}. ${shot.card.hook}`, draggable: 'false' });
    const develop = h('div', { class: 'photo-develop', 'aria-hidden': 'true' });
    const figure = h('figure', { class: 'photo-print' }, img, develop);
    // Develop covers exactly the photo on the print.
    Object.assign(develop.style, { left: `${(M / W) * 100}%`, top: `${(M / H) * 100}%`, width: `${(P / W) * 100}%`, height: `${(P / H) * 100}%` });

    const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    const canCopy = typeof ClipboardItem === 'function' && !!navigator.clipboard?.write;
    const shareLabel = h('span', {}, canShareFile ? S.photo.share : S.photo.copy);
    const shareBtn = h('button', { class: 'btn primary photo-btn', type: 'button' }, icon(ICONS.share), shareLabel);
    shareBtn.addEventListener('click', () => void this.share(file, shot.card, canShareFile, shareBtn, shareLabel));
    const downloadLabel = h('span', {}, S.photo.download);
    const downloadBtn = h('button', { class: 'btn glass photo-btn', type: 'button' }, icon(ICONS.download), downloadLabel);
    downloadBtn.addEventListener('click', () => this.download(file, downloadBtn, downloadLabel));
    const actions = h('div', { class: 'photo-actions' }, canShareFile || canCopy ? shareBtn : null, downloadBtn);
    const closeBtn = h('button', { class: 'icon-btn glass photo-close', type: 'button', 'aria-label': S.photo.close, 'aria-keyshortcuts': 'Escape' }, icon(ICONS.close));
    closeBtn.addEventListener('click', () => this.close());
    const stage = h('div', { class: 'photo-stage' }, figure, actions);
    root.append(stage, closeBtn);
    stage.addEventListener('click', (e) => {
      if (e.target === stage) this.close();
    });
    document.addEventListener('keydown', this.onKey, { capture: true });

    // Decoded before it moves, so it never lands blank; but never waits long for it.
    await Promise.race([img.decode().catch(() => undefined), new Promise((resolve) => window.setTimeout(resolve, 400))]);
    if (this.root !== root) return;
    if (rm) {
      figure.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_OUT, fill: 'backwards' });
      develop.remove();
    } else {
      // Out of the flash: the whole screen shrinks into the print and it lands, tilted.
      figure.animate(
        [
          { transform: 'translateY(-3%) scale(1.22) rotate(0deg)', opacity: 0, filter: 'brightness(1.8)' },
          { opacity: 1, offset: 0.25 },
          { transform: 'translateY(0) scale(1) rotate(-2.5deg)', opacity: 1, filter: 'brightness(1)' },
        ],
        { duration: 720, easing: EASE_LAND, fill: 'backwards' },
      );
      // And develops: the white lifts off the photo, the way an instant print comes up.
      develop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1600, delay: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    }
    [...actions.children, closeBtn].forEach((el, i) => {
      (el as HTMLElement).animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 320,
        delay: rm ? 0 : 420 + i * 60,
        easing: EASE_OUT,
        fill: 'backwards',
      });
    });
    ((actions.firstElementChild as HTMLElement | null) ?? closeBtn).focus({ preventScroll: true });
  }

  close(): void {
    const root = this.root;
    if (!root || this.closing) return;
    this.closing = true;
    document.removeEventListener('keydown', this.onKey, { capture: true });
    const rm = this.hooks.reduceMotion();
    const parts = [...root.querySelectorAll<HTMLElement>('.photo-print, .photo-actions, .photo-close')];
    for (const el of parts) {
      const tilt = el.classList.contains('photo-print') ? ' rotate(-2.5deg)' : '';
      el.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 0, transform: `translateY(16px) scale(0.97)${tilt}` }], { duration: 180, easing: EASE_OUT, fill: 'forwards' });
    }
    const scrim = root.querySelector<HTMLElement>('.photo-scrim');
    const done = (): void => {
      root.remove();
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = null;
      this.root = null;
      this.closing = false;
      this.app.inert = false;
      this.opener?.focus({ preventScroll: true });
    };
    if (scrim) scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' }).finished.then(done, done);
    else done();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (!this.root) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.close();
    } else if (e.key === 'Tab') {
      // Focus stays on the print's buttons.
      const focusables = [...this.root.querySelectorAll<HTMLElement>('button')];
      const i = focusables.indexOf(document.activeElement as HTMLElement);
      const next = focusables[(i + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length];
      e.preventDefault();
      next?.focus();
    }
  };

  private async share(file: File, card: PhotoCard, withFile: boolean, button: HTMLButtonElement, label: HTMLElement): Promise<void> {
    if (withFile) {
      const url = this.hooks.link();
      try {
        await navigator.share({ files: [file], title: 'Car Game', text: `${card.hook} ${S.run.pictureText}`, ...(url ? { url } : {}) });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
      confirm(button, label, S.run.pictureCopied);
    } catch {
      this.download(file, button, label);
    }
  }

  private download(file: File, button: HTMLButtonElement, label: HTMLElement): void {
    const href = URL.createObjectURL(file);
    const link = h('a', { href, download: file.name });
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    confirm(button, label, S.photo.saved);
  }
}

/** The button says it worked, a check in place of its icon, then goes back. */
function confirm(button: HTMLButtonElement, label: HTMLElement, text: string): void {
  const original = button.dataset.label ?? label.textContent ?? '';
  button.dataset.label = original;
  const svg = button.querySelector('svg');
  const iconPaths = button.dataset.icon ?? svg?.innerHTML ?? '';
  button.dataset.icon = iconPaths;
  button.classList.add('done');
  label.textContent = text;
  if (svg) svg.innerHTML = ICONS.check;
  window.clearTimeout(Number(button.dataset.timer ?? 0));
  button.dataset.timer = String(
    window.setTimeout(() => {
      button.classList.remove('done');
      label.textContent = original;
      if (svg) svg.innerHTML = iconPaths;
    }, 1600),
  );
}

// MARK: The print

async function makePrint(shot: PhotoShot): Promise<HTMLCanvasElement> {
  const scene = document.createElement('canvas');
  const drawer = new CanvasDrawer(scene);
  drawer.resize(SCENE, SCENE, 2);
  drawer.draw(shot.list);
  const logo = await loadImage(new URL('icons/icon-192.png', document.baseURI).href);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d')!;
  paper(g);
  photo(g, scene);
  stickers(g, shot.card);
  caption(g, shot.card, logo);
  tape(g, shot.card.mapColor);
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), 800);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/** White card stock: a faint fall of light across it and a fine tooth. */
function paper(g: CanvasRenderingContext2D): void {
  g.fillStyle = css('photoPaper');
  g.fillRect(0, 0, W, H);
  const light = g.createLinearGradient(0, 0, W, H);
  light.addColorStop(0, 'rgba(255,255,255,0.5)');
  light.addColorStop(1, 'rgba(0,0,0,0.05)');
  g.fillStyle = light;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = unitHash(i, 1301) < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.5)';
    g.fillRect(unitHash(i, 1302) * W, unitHash(i, 1303) * H, 1.4, 1.4);
  }
}

/** The scene with what a film camera does to it: warmth, a light leak in a corner, a vignette. */
function photo(g: CanvasRenderingContext2D, scene: HTMLCanvasElement): void {
  g.save();
  g.beginPath();
  g.rect(M, M, P, P);
  g.clip();
  g.drawImage(scene, M, M, P, P);
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = 'rgba(255,196,130,0.35)';
  g.fillRect(M, M, P, P);
  g.globalCompositeOperation = 'screen';
  const leak = g.createRadialGradient(M + P * 0.98, M + P * 0.02, 0, M + P * 0.98, M + P * 0.02, P * 0.6);
  leak.addColorStop(0, 'rgba(255,140,70,0.42)');
  leak.addColorStop(0.5, 'rgba(255,90,90,0.12)');
  leak.addColorStop(1, 'rgba(255,90,90,0)');
  g.fillStyle = leak;
  g.fillRect(M, M, P, P);
  g.globalCompositeOperation = 'source-over';
  const vignette = g.createRadialGradient(M + P / 2, M + P / 2, P * 0.42, M + P / 2, M + P / 2, P * 0.76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = vignette;
  g.fillRect(M, M, P, P);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = 2;
  g.strokeRect(M + 1, M + 1, P - 2, P - 2);
}

function spaced(g: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, hgt, r);
}

/** On the photo: the headline sticker, the NEW BEST stamp and the burnt-in date. */
function stickers(g: CanvasRenderingContext2D, card: PhotoCard): void {
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = fontFor(30, true);
  spaced(g, 1.5);
  const pad = 20;
  const width = Math.min(P - 80, g.measureText(card.headline).width + 2 * pad + 22);
  const x = M + 32;
  const y = M + 32;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 4;
  g.fillStyle = 'rgba(14,16,19,0.82)';
  roundRect(g, x, y, width, 60, 16);
  g.fill();
  g.restore();
  g.fillStyle = css(card.tint);
  g.beginPath();
  g.arc(x + pad + 6, y + 30, 6, 0, Math.PI * 2);
  g.fill();
  g.fillText(card.headline, x + pad + 22, y + 31, width - 2 * pad - 22);
  spaced(g, 0);

  if (card.newBest) {
    g.save();
    g.translate(M + P - 180, M + 140);
    g.rotate(-0.21);
    g.font = fontFor(46, true);
    spaced(g, 3);
    g.textAlign = 'center';
    const w = g.measureText(S.photo.newBest).width + 64;
    g.shadowColor = 'rgba(0,0,0,0.4)';
    g.shadowBlur = 20;
    g.fillStyle = 'rgba(14,16,19,0.6)';
    roundRect(g, -w / 2, -46, w, 92, 14);
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = css('accent');
    g.lineWidth = 6;
    roundRect(g, -w / 2 + 8, -38, w - 16, 76, 9);
    g.stroke();
    g.fillStyle = css('accent');
    g.fillText(S.photo.newBest, 0, 3);
    spaced(g, 0);
    g.restore();
  }

  const now = new Date();
  const stamp = `'${String(now.getFullYear()).slice(2)} ${now.getMonth() + 1} ${now.getDate()}`;
  g.save();
  g.font = `bold 36px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  g.textAlign = 'right';
  g.textBaseline = 'alphabetic';
  spaced(g, 2);
  g.fillStyle = css('photoDate');
  g.shadowColor = css('photoDate', 0.9);
  g.shadowBlur = 16;
  for (let pass = 0; pass < 2; pass++) g.fillText(stamp, M + P - 36, M + P - 34);
  g.restore();
}

/** Under the photo: the score, the facts, where, and the dare; the game's name and icon. */
function caption(g: CanvasRenderingContext2D, card: PhotoCard, logo: HTMLImageElement | null): void {
  const left = M + 16;
  const right = W - M - 16;
  const top = M + P;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';

  g.font = fontFor(24, true);
  spaced(g, 4);
  g.fillStyle = css('photoInkMuted');
  g.fillText(card.scoreLabel, left, top + 66);
  spaced(g, 0);

  let size = 116;
  g.font = fontFor(size, true);
  while (size > 60 && g.measureText(card.score).width > 560) g.font = fontFor((size -= 4), true);
  g.fillStyle = css('photoInk');
  spaced(g, -2);
  g.fillText(card.score, left - 4, top + 66 + size * 0.92);
  spaced(g, 0);

  g.font = fontFor(28, false);
  g.fillStyle = css('photoInk', 0.78);
  g.fillText(card.facts.join('  ·  '), left, top + 234, 640);

  // The place, marked with the map's colour.
  g.fillStyle = css(card.mapColor ?? 'photoInkMuted');
  g.beginPath();
  g.arc(left + 8, top + 283, 8, 0, Math.PI * 2);
  g.fill();
  g.font = fontFor(26, true);
  g.fillStyle = css('photoInkMuted');
  g.fillText(card.place, left + 26, top + 292, 360);

  g.textAlign = 'right';
  g.font = `italic ${fontFor(32, true)}`;
  g.fillStyle = css('photoInk');
  g.fillText(card.hook, right, top + 292, 560);

  const icon = 92;
  if (logo) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.18)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 3;
    roundRect(g, right - icon, top + 34, icon, icon, 22);
    g.fillStyle = css('background');
    g.fill();
    g.restore();
    g.save();
    roundRect(g, right - icon, top + 34, icon, icon, 22);
    g.clip();
    g.drawImage(logo, right - icon, top + 34, icon, icon);
    g.restore();
  }
  g.font = fontFor(32, true);
  g.fillStyle = css('photoInk');
  g.fillText('Car Game', right - (logo ? icon + 20 : 0), top + 82);
  g.font = fontFor(22, false);
  g.fillStyle = css('photoInkMuted');
  g.fillText(location.host, right - (logo ? icon + 20 : 0), top + 114, 380);
}

/** A strip of tape holding the print, tinted with the map's colour. */
function tape(g: CanvasRenderingContext2D, color: ColorToken | null): void {
  g.save();
  g.translate(W / 2, M - 4);
  g.rotate(-0.05);
  const w = 250;
  const hgt = 62;
  const edge: [number, number][] = [];
  for (let i = 0; i <= 6; i++) edge.push([-w / 2 + (i % 2 === 0 ? 0 : 7), -hgt / 2 + (i * hgt) / 6]);
  for (let i = 6; i >= 0; i--) edge.push([w / 2 - (i % 2 === 0 ? 0 : 7), -hgt / 2 + (i * hgt) / 6]);
  g.beginPath();
  edge.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
  g.shadowColor = 'rgba(0,0,0,0.12)';
  g.shadowBlur = 6;
  g.shadowOffsetY = 2;
  g.fillStyle = 'rgba(255,255,250,0.62)';
  g.fill();
  g.shadowColor = 'transparent';
  if (color) {
    g.fillStyle = css(color, 0.3);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(-w / 2 + 12, -hgt / 2 + 8, w - 24, 6);
  g.restore();
}
