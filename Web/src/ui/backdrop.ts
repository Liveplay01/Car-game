import './backdrop.css';
import { h } from './dom';
import { openSheet } from './sheets';
import { type Backdrop, saveBackdrop } from '../storage/backdrop';
import { type BackdropMedia, parseBackdropLink, youtubeEmbed } from '../present/backdrop';
import { S } from '../present/strings';

/** How long a link may take before it counts as broken. */
const LOAD_TIMEOUT_MS = 15000;
/** Uploaded pictures are made smaller before they are kept: longest edge and JPEG quality, then smaller tries. */
const SHRINK_STEPS: [number, number][] = [
  [1600, 0.85],
  [1024, 0.75],
  [720, 0.7],
];
/** A data URL longer than this (about 1.5 MB) takes the next, smaller step. */
const KEEP_LIMIT = 1_500_000;

/** What a backdrop shows, or null when its link is no web link. */
function mediaOf(b: Backdrop): BackdropMedia | null {
  return b.k === 'upload' ? { k: 'image', url: b.src } : parseBackdropLink(b.url);
}

/**
 * Big Screen (Leo, 01.10.2026): the player's own picture or video, behind the canvas. The canvas
 * leaves its ground see-through only while Big Screen shows (`RenderList.backdrop`), so the
 * layer is hidden everywhere else. A YouTube video is a muted, looping player that ignores the
 * finger; a picture or a video file fills the screen. Nothing here ever reaches the game rules.
 */
export class BackdropLayer {
  private readonly root: HTMLElement;
  private media: HTMLElement | null = null;
  private shown: Backdrop | null = null;
  /** Which `show` may still finish: a newer one wins. */
  private ticket = 0;

  constructor(app: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = h('div', { class: 'backdrop', 'aria-hidden': 'true' });
    app.insertBefore(this.root, canvas);
  }

  /** What shows now (null: nothing). */
  get value(): Backdrop | null {
    return this.shown;
  }

  /** There is something to show behind the canvas. */
  get ready(): boolean {
    return this.media !== null;
  }

  /** Shows the layer while the scene lets it through. */
  set visible(on: boolean) {
    this.root.classList.toggle('show', on && this.media !== null);
  }

  /**
   * Puts `b` behind the canvas once it has loaded, and true; false when it would not load (what
   * showed before stays). Null takes it away.
   */
  async show(b: Backdrop | null): Promise<boolean> {
    const ticket = ++this.ticket;
    if (!b) {
      this.swap(null, null);
      return true;
    }
    const media = mediaOf(b);
    if (!media) return false;
    // Offline a YouTube player would only show its error page.
    if (media.k === 'youtube' && !navigator.onLine) return false;
    const el = BackdropLayer.element(media);
    // Loaded unseen inside the layer, then faded in over the old one.
    el.classList.add('loading');
    this.root.append(el);
    const ok = await BackdropLayer.loaded(el);
    if (ticket !== this.ticket || !ok) {
      el.remove();
      return ticket === this.ticket ? false : ok;
    }
    this.swap(el, b);
    return true;
  }

  private swap(el: HTMLElement | null, b: Backdrop | null): void {
    const old = this.media;
    this.media = el;
    this.shown = b;
    el?.classList.remove('loading');
    if (old) {
      old.classList.add('leaving');
      window.setTimeout(() => old.remove(), 400);
    }
    if (!el) this.root.classList.remove('show');
  }

  private static element(media: BackdropMedia): HTMLElement {
    switch (media.k) {
      case 'youtube':
        return h('iframe', {
          src: youtubeEmbed(media.id),
          title: 'Big Screen video',
          allow: 'autoplay; encrypted-media; picture-in-picture',
          referrerpolicy: 'strict-origin-when-cross-origin',
          tabindex: '-1',
        });
      case 'video': {
        const video = h('video', { src: media.url, autoplay: true, loop: true, playsinline: true, preload: 'auto', disablepictureinpicture: true });
        // As properties too: autoplay only works muted, and the attribute alone is not enough everywhere.
        video.muted = true;
        video.defaultMuted = true;
        return video;
      }
      case 'image':
        return h('img', { src: media.url, alt: '', decoding: 'async', referrerpolicy: 'no-referrer' });
    }
  }

  /** Resolves once the element shows something: true, or false on an error or after the timeout. */
  private static loaded(el: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean): void => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), LOAD_TIMEOUT_MS);
      if (el instanceof HTMLImageElement) {
        el.decode().then(
          () => finish(el.naturalWidth > 0),
          () => finish(false),
        );
      } else if (el instanceof HTMLVideoElement) {
        el.addEventListener('loadeddata', () => {
          finish(true);
          void el.play().catch(() => undefined);
        });
        el.addEventListener('error', () => finish(false));
      } else {
        // A player page always "loads": what it plays is YouTube's to say.
        el.addEventListener('load', () => finish(true));
      }
    });
  }
}

/**
 * A picture from the device, made smaller (JPEG) so it fits in the browser's storage. Null when
 * it is not a picture the browser can read.
 */
async function shrink(file: File, step: number): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const [edge, quality] = SHRINK_STEPS[Math.min(step, SHRINK_STEPS.length - 1)];
    const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const g = canvas.getContext('2d');
    if (!g) return null;
    // JPEG has no see-through: a transparent PNG sits on the game's own dark.
    g.fillStyle = '#0B0D10';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The upload, as small as it has to be to stay on this device. `kept`: false when even the smallest would not fit. */
async function prepareUpload(file: File): Promise<{ backdrop: Backdrop; kept: boolean } | null> {
  for (let step = 0; step < SHRINK_STEPS.length; step++) {
    const src = await shrink(file, step);
    if (!src) return null;
    const last = step === SHRINK_STEPS.length - 1;
    if (src.length > KEEP_LIMIT && !last) continue;
    const backdrop: Backdrop = { k: 'upload', src };
    if (saveBackdrop(backdrop)) return { backdrop, kept: true };
    if (last) return { backdrop, kept: false };
  }
  return null;
}

export interface BackdropActions {
  /** Something new shows: Big Screen goes on. `kept`: false when it lasts only this visit. */
  applied(kept: boolean): void;
  /** The picture was taken away. */
  removed(): void;
  closed(): void;
}

/**
 * Big Screen's sheet: paste a link (YouTube, a picture or a video file) or upload a picture
 * (pictures only, Leo 01.10.2026). What shows now can be taken away. It closes once the new
 * one shows behind the roundabout.
 */
export function backdropSheet(layer: HTMLElement, screen: BackdropLayer, actions: BackdropActions): () => void {
  const current = h('div', { class: 'backdrop-current' });
  const help = h('p', { class: 'field-help', id: 'backdrop-help', 'aria-live': 'polite' });
  const say = (text: string, error = false): void => {
    help.textContent = text;
    help.classList.toggle('error', error);
  };

  const input = h('input', {
    class: 'text-input',
    type: 'url',
    name: 'backdrop',
    inputmode: 'url',
    autocomplete: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
    enterkeyhint: 'go',
    placeholder: S.backdrop.linkPlaceholder,
    'aria-label': S.backdrop.linkLabel,
    'aria-describedby': 'backdrop-help',
    value: screen.value?.k === 'link' ? screen.value.url : '',
  });
  const showBtn = h('button', { class: 'btn primary', type: 'submit' }, S.backdrop.show);
  const pickBtn = h('button', { class: 'btn', type: 'button' }, S.backdrop.pick);
  const picker = h('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });

  const setBusy = (busy: boolean): void => {
    for (const b of [showBtn, pickBtn]) {
      b.disabled = busy;
      b.classList.toggle('busy', busy);
    }
    input.readOnly = busy;
  };

  const renderCurrent = (): void => {
    const now = screen.value;
    if (!now) {
      current.replaceChildren();
      return;
    }
    const kind = now.k === 'upload' ? 'upload' : (parseBackdropLink(now.url)?.k ?? 'image');
    const remove = h('button', { class: 'btn destructive', type: 'button' }, S.backdrop.remove);
    remove.addEventListener('click', () => {
      void screen.show(null);
      saveBackdrop(null);
      input.value = '';
      say('');
      renderCurrent();
      actions.removed();
    });
    current.replaceChildren(
      h(
        'div',
        { class: 'list' },
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.backdrop.now(kind)), h('div', { class: 'row-sub' }, S.backdrop.nowSub)), remove),
      ),
    );
  };

  /** Shows `b`; once it shows the sheet closes, otherwise it says why. */
  const apply = async (b: Backdrop, kept: boolean, failure: string): Promise<void> => {
    setBusy(true);
    say(S.backdrop.loading);
    const ok = await screen.show(b);
    if (!form.isConnected) return;
    setBusy(false);
    if (!ok) {
      say(failure, true);
      return;
    }
    actions.applied(b.k === 'link' ? saveBackdrop(b) : kept);
    close();
  };

  const form = h(
    'form',
    {
      class: 'backdrop-form',
      novalidate: true,
      onsubmit: (e: Event) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!parseBackdropLink(text)) {
          say(S.backdrop.notALink, true);
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        input.removeAttribute('aria-invalid');
        void apply({ k: 'link', url: text.includes('://') ? text : `https://${text}` }, true, S.backdrop.cannotLoad);
      },
    },
    h('div', { class: 'join-row' }, input, showBtn),
    help,
  );
  input.addEventListener('input', () => {
    if (!help.classList.contains('error')) return;
    input.removeAttribute('aria-invalid');
    say('');
  });

  pickBtn.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    // Pictures only (Leo, 01.10.2026): a video comes as a link.
    if (!file.type.startsWith('image/')) {
      say(S.backdrop.notAPicture, true);
      return;
    }
    setBusy(true);
    say(S.backdrop.loading);
    void prepareUpload(file).then((prepared) => {
      if (!form.isConnected) return;
      setBusy(false);
      if (!prepared) {
        say(S.backdrop.unreadable, true);
        return;
      }
      void apply(prepared.backdrop, prepared.kept, S.backdrop.unreadable);
    });
  });

  const body = h(
    'div',
    { class: 'backdrop-sheet' },
    h('p', { class: 'section-note backdrop-intro' }, S.backdrop.intro),
    current,
    h('p', { class: 'section-note backdrop-label' }, S.backdrop.linkLabel),
    form,
    h('div', { class: 'backdrop-or', 'aria-hidden': 'true' }, h('span', {}, S.backdrop.or)),
    h(
      'div',
      { class: 'list' },
      h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.backdrop.upload), h('div', { class: 'row-sub' }, S.backdrop.uploadSub)), pickBtn, picker),
    ),
    h('p', { class: 'section-note backdrop-note' }, S.backdrop.note),
  );
  renderCurrent();
  const close = openSheet(layer, S.backdrop.title, body, actions.closed);
  return close;
}
