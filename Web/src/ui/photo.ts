import { h, animatedIcon, playIcon } from './dom';
import { CanvasDrawer } from '../present/draw';
import type { RenderList } from '../present/render';
import type { PhotoCard, PatternToken, PerformancePattern } from '../present/photo';
import { css } from '../present/theme';
import { unitHash } from '../present/render';
import { S } from '../present/strings';

/**
 * The photo of a finished shift (Leo, 29.09.2026: "like a photo that was just shot"; 18.10.2026: like a speed-camera
 * photo). The button fires a flash with a shutter and the picture comes up out of it. Under it only Share and Download.
 * The picture is the file that goes out: the scene from above as a speed camera shoots it, the date and place burnt into
 * its top edge, and a black strip under it with the score, the best facts, a line that dares and the invite as a QR code.
 */

/** The print: 4:5 (what feeds and chats show whole), the photo on top and the data strip under it. */
const W = 1080;
const H = 1350;
const M = 48;
const PHOTO_H = 1008;
/** The row burnt into the top of the photo. */
const BAR_H = 64;
/** The scene is drawn at this many points, twice the pixels. */
const SCENE = W / 2;

export interface PhotoShot {
  list: RenderList;
  card: PhotoCard;
}

export interface PhotoHooks {
  /** Shutter sound and a light haptic, each only when the player has them on. */
  shutter(): void;
  reduceMotion(): boolean;
  /**
   * The shift as a challenge to send with the picture: the line that dares, the link to use at once, and the short link
   * on its way (asked for as the print opens, so it is there by the tap). Null when the shift cannot be sent.
   */
  challenge(): { text: string; fallback: string; link: Promise<string> } | null;
  /** Where the QR code on the print leads: an invite, or the game's own address. */
  invite(): Promise<string>;
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export class PhotoView {
  private root: HTMLElement | null = null;
  private url: string | null = null;
  private opener: HTMLElement | null = null;
  private closing = false;
  /** This print's challenge, and its link as soon as the short one is made. */
  private dare: { text: string; url: string } | null = null;

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
    const challenge = this.hooks.challenge();
    const dare = challenge ? { text: challenge.text, url: challenge.fallback } : null;
    this.dare = dare;
    void challenge?.link.then((url) => dare && (dare.url = url));
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

    const print = await makePrint(shot, this.hooks.invite());
    if (this.root !== root || this.closing) return;
    const blob = await new Promise<Blob | null>((resolve) => print.toBlob(resolve, 'image/png'));
    if (!blob || this.root !== root || this.closing) return this.close();
    const day = new Date().toISOString().slice(0, 10);
    const file = new File([blob], `car-game-${day}.png`, { type: 'image/png' });
    this.url = URL.createObjectURL(blob);

    const img = h('img', { src: this.url, alt: `${shot.card.headline}: ${shot.card.scoreLabel.toLowerCase()} ${shot.card.score}. ${shot.card.hook}`, draggable: 'false' });
    const figure = h('figure', { class: 'photo-print' }, img);

    const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    const canCopy = typeof ClipboardItem === 'function' && !!navigator.clipboard?.write;
    const shareLabel = h('span', {}, dare ? (canShareFile ? S.photo.sendChallenge : S.photo.copyChallenge) : canShareFile ? S.photo.share : S.photo.copy);
    const shareBtn = h('button', { class: 'btn primary photo-btn', type: 'button' }, animatedIcon('share'), shareLabel);
    shareBtn.addEventListener('click', () => void this.share(file, shot.card, canShareFile, shareBtn, shareLabel));
    const downloadLabel = h('span', {}, S.photo.download);
    const downloadBtn = h('button', { class: 'btn glass photo-btn', type: 'button' }, animatedIcon('download'), downloadLabel);
    downloadBtn.addEventListener('click', () => this.download(file, downloadBtn, downloadLabel));
    const actions = h('div', { class: 'photo-actions' }, canShareFile || canCopy ? shareBtn : null, downloadBtn);
    const closeBtn = h('button', { class: 'icon-btn glass photo-close', type: 'button', 'aria-label': S.photo.close, 'aria-keyshortcuts': 'Escape' }, animatedIcon('close'));
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
    // Out of the flash: the picture is there at once, a little over-exposed, and settles into its grey.
    figure.animate(
      rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(0.97)', filter: 'brightness(2)' }, { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' }],
      { duration: rm ? 200 : 280, easing: EASE_OUT, fill: 'backwards' },
    );
    [...actions.children, closeBtn].forEach((el, i) => {
      (el as HTMLElement).animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 200,
        delay: rm ? 0 : 160 + i * 40,
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
    for (const el of parts) el.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px) scale(0.98)' }], { duration: 160, easing: EASE_OUT, fill: 'forwards' });
    const scrim = root.querySelector<HTMLElement>('.photo-scrim');
    const done = (): void => {
      root.remove();
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = null;
      this.dare = null;
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

  /**
   * The picture goes out with its challenge: the dare and the link in the text (many apps drop a separate url next to a
   * file), so the photo is what the friend sees first. Without a share sheet, picture and link go to the clipboard
   * together where the browser takes both, else the picture alone.
   */
  private async share(file: File, card: PhotoCard, withFile: boolean, button: HTMLButtonElement, label: HTMLElement): Promise<void> {
    const dare = this.dare;
    const text = dare ? `${dare.text}
${dare.url}` : `${card.hook} ${S.run.pictureText}`;
    if (withFile) {
      try {
        await navigator.share({ files: [file], title: S.gameTitle, text });
        return;
      } catch (error) {
        // Cancelled stays cancelled; a sheet that failed falls back to the clipboard or the download below.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    const image = { 'image/png': file };
    if (dare) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ ...image, 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
        confirm(button, label, S.photo.challengeCopied);
        return;
      } catch {
        // Picture and text in one item is not taken everywhere: the picture alone then.
      }
    }
    try {
      await navigator.clipboard.write([new ClipboardItem(image)]);
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

/** The icon each button wears while it says "done", to put back. */
const resting = new WeakMap<HTMLButtonElement, SVGSVGElement>();

/** The button says it worked, a check in place of its icon, then goes back. */
function confirm(button: HTMLButtonElement, label: HTMLElement, text: string): void {
  const original = button.dataset.label ?? label.textContent ?? '';
  button.dataset.label = original;
  const current = button.querySelector('svg');
  if (current && !resting.has(button)) resting.set(button, current);
  const check = animatedIcon('check');
  current?.replaceWith(check);
  playIcon(check);
  button.classList.add('done');
  label.textContent = text;
  window.clearTimeout(Number(button.dataset.timer ?? 0));
  button.dataset.timer = String(
    window.setTimeout(() => {
      button.classList.remove('done');
      label.textContent = original;
      const back = resting.get(button);
      resting.delete(button);
      if (back) button.querySelector('svg')?.replaceWith(back);
    }, 1600),
  );
}

// MARK: The print

async function makePrint(shot: PhotoShot, invite: Promise<string>): Promise<HTMLCanvasElement> {
  const scene = document.createElement('canvas');
  const drawer = new CanvasDrawer(scene);
  drawer.resize(SCENE, SCENE, 2);
  drawer.draw(shot.list);
  const code = await inviteCode(invite);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d')!;
  g.fillStyle = css('background');
  g.fillRect(0, 0, W, H);
  photo(g, scene);
  dataBar(g, shot.card, new Date());
  strip(g, shot.card, code);
  return out;
}

/** The QR code's modules for the invite, or null when it is late (the print never waits long) or the code cannot be made. */
async function inviteCode(invite: Promise<string>): Promise<boolean[][] | null> {
  const late = new Promise<null>((resolve) => window.setTimeout(resolve, 800, null));
  const url = await Promise.race([invite, late]).catch(() => null);
  if (!url) return null;
  const { qrModules } = await import('./qr');
  return qrModules(url);
}

/** The invite in the corner of the data strip: dark modules on a white card. */
function qrCode(g: CanvasRenderingContext2D, modules: boolean[][], x: number, y: number, size: number): void {
  const pad = 8;
  const cell = Math.floor((size - 2 * pad) / modules.length);
  const used = modules.length * cell + 2 * pad;
  g.fillStyle = '#ffffff';
  g.fillRect(x + size - used, y + size - used, used, used);
  g.fillStyle = '#0b0d10';
  modules.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) g.fillRect(x + size - used + pad + c * cell, y + size - used + pad + r * cell, cell, cell);
  }));
}

/**
 * The scene as a speed camera shoots it: grey with a cold tint and hard contrast, the flash washing out the middle, the
 * edges falling off, a little grain, the two measuring lines across the road and the viewfinder's corners.
 */
function photo(g: CanvasRenderingContext2D, scene: HTMLCanvasElement): void {
  g.drawImage(scene, 0, (scene.height - PHOTO_H) / 2, W, PHOTO_H, 0, 0, W, PHOTO_H);
  const pixels = g.getImageData(0, 0, W, PHOTO_H);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const v = Math.min(1, Math.max(0, (luma - 0.5) * 1.4 + 0.55)) * 255;
    d[i] = v * 0.93;
    d[i + 1] = v * 0.99;
    d[i + 2] = v;
  }
  g.putImageData(pixels, 0, 0);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, PHOTO_H);
  g.clip();
  g.globalCompositeOperation = 'screen';
  const flash = g.createRadialGradient(W / 2, PHOTO_H * 0.46, 0, W / 2, PHOTO_H * 0.46, W * 0.62);
  flash.addColorStop(0, 'rgba(255,255,255,0.26)');
  flash.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = flash;
  g.fillRect(0, 0, W, PHOTO_H);
  g.globalCompositeOperation = 'source-over';
  const edge = g.createRadialGradient(W / 2, PHOTO_H / 2, W * 0.4, W / 2, PHOTO_H / 2, W * 0.82);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, PHOTO_H);
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = unitHash(i, 1301) < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
    g.fillRect(unitHash(i, 1302) * W, unitHash(i, 1303) * PHOTO_H, 2, 2);
  }
  // The measuring lines, with a tick at each end.
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 2;
  for (const at of [0.36, 0.64]) {
    const y = Math.round(BAR_H + (PHOTO_H - BAR_H) * at);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.moveTo(M, y - 12);
    g.lineTo(M, y + 12);
    g.moveTo(W - M, y - 12);
    g.lineTo(W - M, y + 12);
    g.stroke();
  }
  // The viewfinder's corners.
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 4;
  const left = M;
  const right = W - M;
  const top = BAR_H + M;
  const bottom = PHOTO_H - M;
  const arm = 56;
  for (const [x, y, dx, dy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]] as const) {
    g.beginPath();
    g.moveTo(x + dx * arm, y);
    g.lineTo(x, y);
    g.lineTo(x, y + dy * arm);
    g.stroke();
  }
  g.restore();
}

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const mono = (px: number, bold = false): string => `${bold ? 700 : 500} ${px}px ${MONO}`;

function spaced(g: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

const two = (n: number): string => String(n).padStart(2, '0');

/** The data row burnt into the top of the frame, as on a camera's print: when, and where. */
function dataBar(g: CanvasRenderingContext2D, card: PhotoCard, now: Date): void {
  g.fillStyle = 'rgba(0,0,0,0.82)';
  g.fillRect(0, 0, W, BAR_H);
  g.textBaseline = 'middle';
  g.font = mono(24, true);
  spaced(g, 2);
  g.fillStyle = css('primary', 0.92);
  g.textAlign = 'left';
  g.fillText(`${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}  ${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`, M, BAR_H / 2 + 1);
  g.textAlign = 'right';
  g.fillText(card.place.toUpperCase(), W - M, BAR_H / 2 + 1, 440);
  spaced(g, 0);
}

/** Under the photo, on black: the measured score, what drove it, the dare, and the invite. */
function strip(g: CanvasRenderingContext2D, card: PhotoCard, code: boolean[][] | null): void {
  const top = PHOTO_H;
  const qr = 128;
  const textRight = code ? W - M - qr - 24 : W - M;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';

  g.font = mono(24, true);
  spaced(g, 4);
  g.fillStyle = css('muted');
  g.fillText(card.scoreLabel, M, top + 56);
  g.textAlign = 'right';
  g.fillStyle = css(card.tint);
  g.fillText(card.headline, textRight, top + 56, textRight - M - 160);
  spaced(g, 0);
  g.textAlign = 'left';

  let size = 112;
  g.font = mono(size, true);
  while (size > 56 && g.measureText(card.score).width > 560) g.font = mono((size -= 8), true);
  g.fillStyle = css('primary');
  spaced(g, -3);
  g.fillText(card.score, M - 4, top + 56 + 24 + size * 0.82);
  spaced(g, 0);

  if (card.newBest) {
    const w = 200;
    const x = textRight - w;
    const y = top + 88;
    g.fillStyle = css('accent');
    g.fillRect(x, y, w, 48);
    g.font = mono(24, true);
    spaced(g, 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = css('background');
    g.fillText(S.photo.newBest, x + w / 2, y + 25);
    spaced(g, 0);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

  const scoreW = g.measureText(card.score).width;
  const patternX = Math.max(M + scoreW + 36, textRight - 380);
  const patternY = top + (card.newBest ? 144 : 96);
  drawPerformancePattern(g, card.pattern, patternX, patternY, textRight - patternX);

  g.font = mono(24);
  g.fillStyle = css('primary', 0.8);
  g.fillText(card.facts.join('  ·  '), M, top + 232, textRight - M);
  g.font = mono(28, true);
  g.fillStyle = css(card.mapColor ?? 'accent');
  g.fillText(card.hook, M, top + 280, textRight - M);
  g.font = mono(20);
  g.fillStyle = css('muted');
  g.fillText(`${S.gameTitle} · ${location.host}`, M, top + 322, textRight - M);

  if (code) qrCode(g, code, W - M - qr, H - 32 - qr, qr);
}

function drawPerformancePattern(g: CanvasRenderingContext2D, pattern: PerformancePattern, x: number, y: number, maxW: number): void {
  const tokens = pattern?.tokens;
  if (!tokens || tokens.length === 0) return;

  g.save();
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.font = mono(13, true);
  spaced(g, 2);
  g.fillStyle = css('muted');
  g.fillText(S.photo.telemetry, x, y);
  spaced(g, 0);

  if (pattern.badge) {
    const labelW = g.measureText(S.photo.telemetry).width;
    const badgeX = x + labelW + 12;
    const badgeW = g.measureText(pattern.badge).width + 16;
    g.fillStyle = pattern.isPerfectRun ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    g.strokeStyle = pattern.isPerfectRun ? '#10b981' : '#f59e0b';
    g.lineWidth = 1;
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(badgeX, y - 13, badgeW, 18, 4);
    } else {
      g.rect(badgeX, y - 13, badgeW, 18);
    }
    g.fill();
    g.stroke();

    g.fillStyle = pattern.isPerfectRun ? '#34d399' : '#fbbf24';
    g.font = mono(11, true);
    g.textAlign = 'center';
    g.fillText(pattern.badge, badgeX + badgeW / 2, y);
    g.textAlign = 'left';
  }

  const count = tokens.length;
  const cols = Math.min(8, count);
  const gap = 5;
  const tokenW = Math.max(16, Math.floor((maxW - (cols - 1) * gap) / cols));
  const tokenH = 20;
  const startY = y + 8;

  tokens.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (row > 1) return;
    const tx = x + col * (tokenW + gap);
    const ty = startY + row * (tokenH + gap);
    drawVectorToken(g, t, tx, ty, tokenW, tokenH);
  });

  g.restore();
}

function drawVectorToken(g: CanvasRenderingContext2D, token: PatternToken, x: number, y: number, w: number, h: number): void {
  g.save();
  g.beginPath();
  if (typeof g.roundRect === 'function') {
    g.roundRect(x, y, w, h, 4);
  } else {
    g.rect(x, y, w, h);
  }

  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (token) {
    case 'perfect': {
      g.fillStyle = 'rgba(16, 185, 129, 0.2)';
      g.fill();
      g.strokeStyle = '#10b981';
      g.lineWidth = 1.2;
      g.stroke();

      g.fillStyle = '#34d399';
      g.beginPath();
      g.moveTo(cx, cy - 5);
      g.lineTo(cx + 5, cy);
      g.lineTo(cx, cy + 5);
      g.lineTo(cx - 5, cy);
      g.closePath();
      g.fill();

      g.fillStyle = '#ffffff';
      g.fillRect(cx - 1, cy - 1, 2, 2);
      break;
    }
    case 'tight': {
      g.fillStyle = 'rgba(245, 158, 11, 0.2)';
      g.fill();
      g.strokeStyle = '#f59e0b';
      g.lineWidth = 1.2;
      g.stroke();

      g.strokeStyle = '#fbbf24';
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const ox of [-3, 2]) {
        g.beginPath();
        g.moveTo(cx + ox - 2, cy - 4);
        g.lineTo(cx + ox + 2, cy);
        g.lineTo(cx + ox - 2, cy + 4);
        g.stroke();
      }
      break;
    }
    case 'clean': {
      g.fillStyle = 'rgba(56, 189, 248, 0.16)';
      g.fill();
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 1.2;
      g.stroke();

      g.fillStyle = '#38bdf8';
      g.beginPath();
      g.moveTo(cx - 6, cy - 2);
      g.lineTo(cx + 3, cy - 2);
      g.lineTo(cx + 6, cy);
      g.lineTo(cx + 3, cy + 2);
      g.lineTo(cx - 6, cy + 2);
      g.closePath();
      g.fill();
      break;
    }
    case 'hazard': {
      g.fillStyle = 'rgba(244, 63, 94, 0.2)';
      g.fill();
      g.strokeStyle = '#f43f5e';
      g.lineWidth = 1.2;
      g.stroke();

      g.fillStyle = '#fb7185';
      g.fillRect(cx - 1, cy - 5, 2, 6);
      g.fillRect(cx - 1, cy + 3, 2, 2);
      break;
    }
    case 'strike': {
      g.fillStyle = 'rgba(239, 68, 68, 0.22)';
      g.fill();
      g.strokeStyle = '#ef4444';
      g.lineWidth = 1.2;
      g.stroke();

      g.strokeStyle = '#f87171';
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - 4, cy - 4);
      g.lineTo(cx + 4, cy + 4);
      g.moveTo(cx + 4, cy - 4);
      g.lineTo(cx - 4, cy + 4);
      g.stroke();
      break;
    }
    case 'revive': {
      g.fillStyle = 'rgba(168, 85, 247, 0.22)';
      g.fill();
      g.strokeStyle = '#a855f7';
      g.lineWidth = 1.2;
      g.stroke();

      g.fillStyle = '#c084fc';
      g.beginPath();
      g.moveTo(cx, cy - 5);
      g.lineTo(cx + 4, cy - 2);
      g.lineTo(cx + 3, cy + 3);
      g.lineTo(cx, cy + 6);
      g.lineTo(cx - 3, cy + 3);
      g.lineTo(cx - 4, cy - 2);
      g.closePath();
      g.fill();
      break;
    }
  }
  g.restore();
}

