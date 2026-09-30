import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** An error the client is meant to see: a status, a stable code to branch on, a message for people. */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly headers: Record<string, string>;

  constructor(status: ContentfulStatusCode, code: string, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}
