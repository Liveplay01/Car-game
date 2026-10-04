/**
 * The seal on a save (Leo, 04.10.2026: players edited their money in DevTools). The game writes
 * a keyed hash next to the save and checks it when it reads the save back, so a hand-edited
 * `localStorage` entry no longer passes as progress. Reading and writing the save is
 * synchronous, so this is a small SHA-256 / HMAC of its own instead of Web Crypto.
 *
 * The key ships with the game: this stops editing the stored text, not someone who reads the
 * code. A real guarantee needs a server that keeps the money (Server/README.md).
 */

const primes = (count: number): number[] => {
  const found: number[] = [];
  for (let n = 2; found.length < count; n++) if (found.every((p) => n % p !== 0)) found.push(n);
  return found;
};
const PRIMES = primes(64);
/** The first 32 bits of the fraction of `x`. */
const fraction = (x: number): number => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
const K = PRIMES.map((p) => fraction(Math.cbrt(p)));
const H0 = PRIMES.slice(0, 8).map((p) => fraction(Math.sqrt(p)));

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

function sha256(data: Uint8Array): Uint8Array {
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 4294967296));
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0);
  const h = Uint32Array.from(H0);
  const w = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => (h[i] = (h[i] + v) >>> 0));
  }
  const out = new Uint8Array(32);
  h.forEach((v, i) => new DataView(out.buffer).setUint32(i * 4, v));
  return out;
}

function hmac(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha256(key) : key);
  const pad = (byte: number): Uint8Array => block.map((b) => b ^ byte);
  const inner = new Uint8Array(64 + message.length);
  inner.set(pad(0x36));
  inner.set(message, 64);
  const outer = new Uint8Array(96);
  outer.set(pad(0x5c));
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

const encoder = new TextEncoder();
const KEY = encoder.encode(['rat', 'seal', '2026-10', String(0x5ea1ed), 'keep-the-money-honest'].join('·'));

/** The seal of a text: 32 hex characters (128 bits of an HMAC-SHA-256). */
export const sealOf = (text: string): string =>
  Array.from(hmac(KEY, encoder.encode(text)).subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
