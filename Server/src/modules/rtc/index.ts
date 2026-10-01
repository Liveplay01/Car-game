import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';

/**
 * Connection help for multiplayer (WebRTC). Most home networks connect directly; many phone
 * networks and school Wi-Fi do not, and need a relay (TURN). A relay needs a login, and a login
 * baked into the game's files would be free for everyone. So the game asks here, shortly before a
 * room opens, and gets a login that stops working after a day.
 *
 *   GET /v1/rtc/ice   → {iceServers: [...]}   always with STUN; with TURN when it is set up
 *
 * TURN comes from Cloudflare's relay (free up to 1 TB a month). In the Cloudflare dashboard:
 * Realtime → TURN Server → create a key, then set CF_TURN_KEY_ID and CF_TURN_API_TOKEN. Without
 * them the route still answers, with STUN only, and the game behaves as before.
 */

const STUN = { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] };

/** Logins last a day; one is reused for an hour so the relay API is not asked for every player. */
const TTL_SECONDS = 86_400;
const REUSE_MS = 3_600_000;

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

interface Cached {
  until: number;
  servers: IceServer[];
}

async function askCloudflare(keyId: string, token: string): Promise<IceServer[]> {
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL_SECONDS }),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Cloudflare TURN answered ${response.status}`);
  const json = (await response.json()) as { iceServers?: IceServer[] | IceServer };
  const list = Array.isArray(json.iceServers) ? json.iceServers : json.iceServers ? [json.iceServers] : [];
  // Cloudflare lists its own STUN too; ours is already in the answer, so keep only the relays.
  return list.filter((s) => s.username && s.credential);
}

export function rtcModule(): ServerModule {
  return {
    name: 'rtc',
    migrations: [],
    routes(app, ctx: ServerContext) {
      const { turnKeyId, turnApiToken } = ctx.config;
      let cached: Cached | null = null;

      app.get('/rtc/ice', rateLimit<AppEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), async (c) => {
        const servers: IceServer[] = [STUN];
        if (turnKeyId && turnApiToken) {
          const now = ctx.now();
          if (!cached || cached.until <= now) {
            try {
              cached = { until: now + REUSE_MS, servers: await askCloudflare(turnKeyId, turnApiToken) };
            } catch (error) {
              // The relay is a bonus: a failed ask means STUN only, and the next player tries again.
              console.error(error);
              cached = null;
            }
          }
          if (cached) servers.push(...cached.servers);
        }
        c.header('Cache-Control', 'private, max-age=600');
        return c.json({ iceServers: servers, relay: servers.length > 1 });
      });
    },
  };
}
