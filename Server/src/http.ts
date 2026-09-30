import type { Context } from 'hono';
import { ApiError } from './errors.ts';

const MAX_BODY = 4096;

/** The JSON object of a request body; anything else is a 400. */
export async function readJson(c: Context): Promise<Record<string, unknown>> {
  const text = await c.req.text();
  if (text.length > MAX_BODY) throw new ApiError(413, 'too_large', 'The request is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'bad_json', 'Send a JSON body.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError(400, 'bad_json', 'Send a JSON object.');
  return body as Record<string, unknown>;
}

/** A whole number within bounds, or a 422 naming the field. */
export function integerField(body: Record<string, unknown>, field: string, min: number, max: number): number {
  const value = body[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(422, 'invalid_score', `"${field}" must be a whole number from ${min} to ${max}.`);
  }
  return value;
}
