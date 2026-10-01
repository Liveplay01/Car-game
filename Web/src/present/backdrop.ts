/**
 * Big Screen: what a pasted link shows behind the roundabout (`ui/backdrop.ts` puts it there).
 * A YouTube video plays muted and on a loop (through youtube-nocookie.com), a link to a video
 * file the same, and anything else is taken for a picture. Only web links (https; http is
 * upgraded, the game itself runs on https).
 */
export type BackdropMedia = { k: 'youtube'; id: string } | { k: 'video'; url: string } | { k: 'image'; url: string };

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const VIDEO_FILE = /\.(mp4|webm|m4v|mov|ogv)$/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video a YouTube link points to (watch, youtu.be, Shorts, Live, embed), or null. */
export function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (YOUTUBE_HOSTS.includes(host)) {
    const [first, second] = url.pathname.split('/').filter(Boolean);
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'shorts' || first === 'live' || first === 'embed' || first === 'v') id = second ?? null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** What a pasted text shows, or null when it is not a web link. */
export function parseBackdropLink(text: string): BackdropMedia | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return null;
  const id = youtubeId(url);
  if (id) return { k: 'youtube', id };
  const href = url.toString();
  return VIDEO_FILE.test(url.pathname) ? { k: 'video', url: href } : { k: 'image', url: href };
}

/** The player for a YouTube video: no sound, no controls, round and round, no tracking cookies. */
export function youtubeEmbed(id: string): string {
  const query = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    playsinline: '1',
    disablekb: '1',
    fs: '0',
    rel: '0',
    iv_load_policy: '3',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${query.toString()}`;
}
