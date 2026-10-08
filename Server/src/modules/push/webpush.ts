import { createECDH, createPrivateKey, createCipheriv, generateKeyPairSync, hkdfSync, randomBytes, sign, type KeyObject } from 'node:crypto';

/**
 * Web Push without a library: the message encrypted for one browser (RFC 8291, `aes128gcm` of
 * RFC 8188) and the VAPID header that tells the push service who sends it (RFC 8292). Chrome,
 * Firefox, Safari (iOS 16.4+ from the home screen) and a Trusted Web Activity all take this.
 */

/** Where one browser takes its messages: the push service's address and the browser's keys. */
export interface PushTarget {
  endpoint: string;
  /** The browser's P-256 public key, uncompressed (65 bytes), base64url. */
  p256dh: string;
  /** The browser's 16-byte auth secret, base64url. */
  auth: string;
}

export interface VapidKeys {
  /** Uncompressed P-256 public key (65 bytes), base64url: what the game subscribes with. */
  publicKey: string;
  /** The private scalar (32 bytes), base64url. */
  privateKey: string;
  /** Who to contact about these messages: a mailto: or https: address. */
  subject: string;
}

const b64 = (data: Buffer): string => data.toString('base64url');
const unb64 = (text: string): Buffer => Buffer.from(text, 'base64url');

/** A fresh key pair for `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (`npm run vapid`). */
export function newVapidKeys(): { publicKey: string; privateKey: string } {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const publicKey = Buffer.concat([Buffer.from([4]), unb64(jwk.x ?? ''), unb64(jwk.y ?? '')]);
  return { publicKey: b64(publicKey), privateKey: jwk.d ?? '' };
}

/** Whether a key pair from the environment has the right shape (65-byte public key starting with 4, 32-byte private key). */
export function validVapidKeys(publicKey: string, privateKey: string): boolean {
  const pub = unb64(publicKey);
  return pub.length === 65 && pub[0] === 4 && unb64(privateKey).length === 32;
}

function signingKey(keys: VapidKeys): KeyObject {
  const pub = unb64(keys.publicKey);
  return createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64(pub.subarray(1, 33)), y: b64(pub.subarray(33, 65)) }, format: 'jwk' });
}

/** The `Authorization` header for one push service: an ES256 token for its origin, good for 12 hours. */
export function vapidHeader(endpoint: string, keys: VapidKeys, now: number): string {
  const header = b64(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key: signingKey(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64(signature)}, k=${keys.publicKey}`;
}

const RECORD_SIZE = 4096;

/** `payload` encrypted for `target`: one record, `aes128gcm`, with a fresh key and salt every time. */
export function encrypt(target: PushTarget, payload: Buffer): Buffer {
  const uaPublic = unb64(target.p256dh);
  const authSecret = unb64(target.auth);
  const ecdh = createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  // The last (and only) record ends with the delimiter 2.
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const head = Buffer.alloc(21);
  salt.copy(head, 0);
  head.writeUInt32BE(RECORD_SIZE, 16);
  head.writeUInt8(asPublic.length, 20);
  return Buffer.concat([head, asPublic, body]);
}

/** A message that is not worth showing a day later (a reminder for this evening) is dropped by the push service. */
const TTL_SECONDS = 12 * 3600;

/**
 * Sends one message; the push service's status comes back. 404 and 410 mean the browser has
 * dropped the subscription (uninstalled, permission taken back): forget it.
 */
export async function sendPush(target: PushTarget, payload: string, keys: VapidKeys, now: number): Promise<number> {
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidHeader(target.endpoint, keys, now),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(TTL_SECONDS),
      Urgency: 'normal',
    },
    body: encrypt(target, Buffer.from(payload)),
    signal: AbortSignal.timeout(10_000),
  });
  await response.body?.cancel();
  return response.status;
}
