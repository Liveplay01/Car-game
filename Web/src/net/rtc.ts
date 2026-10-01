import { apiRequest, leaderboardEnabled } from './leaderboard';

/**
 * Where WebRTC looks for a way through, asked right before a room opens. Public STUN servers are
 * always in the list. When the service (`Server/`, Cloudflare TURN) hands out a relay login, it
 * is added: phones on mobile data and school Wi-Fi sit behind networks where two players cannot
 * reach each other directly. A build can also name a fixed relay (`VITE_TURN_URL`,
 * `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`). The service is optional and never in the way:
 * a slow or failed answer means the room opens with STUN, as before.
 */

const STUN: RTCIceServer = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };
/** A login lasts a day on the service; this page reuses it for less than that. */
const REUSE_MS = 45 * 60_000;
/** Longer than this and the room opens without a relay instead of making the player wait. */
const WAIT_MS = 2500;

let cached: { until: number; servers: RTCIceServer[] } | null = null;

function fixedRelay(): RTCIceServer[] {
  const env = import.meta.env;
  const turn = typeof env.VITE_TURN_URL === 'string' ? env.VITE_TURN_URL.trim() : '';
  if (!turn) return [];
  return [
    {
      urls: turn.split(',').map((u: string) => u.trim()).filter(Boolean),
      username: env.VITE_TURN_USERNAME || undefined,
      credential: env.VITE_TURN_CREDENTIAL || undefined,
    },
  ];
}

/** Only well-formed servers: the answer comes over the network and goes straight into WebRTC. */
function clean(list: unknown): RTCIceServer[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((s): RTCIceServer[] => {
    const server = s as Partial<RTCIceServer> | null;
    const raw = Array.isArray(server?.urls) ? server.urls : typeof server?.urls === 'string' ? [server.urls] : [];
    const urls = raw.filter((u): u is string => typeof u === 'string' && /^(stun|turn|turns):/.test(u));
    if (urls.length === 0) return [];
    return [{ urls, username: typeof server?.username === 'string' ? server.username : undefined, credential: typeof server?.credential === 'string' ? server.credential : undefined }];
  });
}

async function fromService(): Promise<RTCIceServer[]> {
  if (!leaderboardEnabled) return [];
  if (cached && cached.until > Date.now()) return cached.servers;
  try {
    const answer = await apiRequest<{ iceServers?: unknown }>('GET', '/v1/rtc/ice', { timeoutMs: WAIT_MS });
    const servers = clean(answer.iceServers);
    cached = { until: Date.now() + REUSE_MS, servers };
    return servers;
  } catch {
    return [];
  }
}

/** The servers for a new `Peer`: our STUN first, then any relay. Never rejects. */
export async function iceServers(): Promise<RTCIceServer[]> {
  return [STUN, ...fixedRelay(), ...(await fromService())];
}
