import type { Context } from 'hono';
import type { ServerContext } from './module.ts';

/** Small HTML pages for people and link previews (a challenge's short link, an invite): shared by the modules that make them. */

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** This service's address as the caller sees it, for absolute links in the page. */
export function origin(c: Context, ctx: ServerContext): string {
  if (ctx.config.publicUrl) return ctx.config.publicUrl;
  const url = new URL(c.req.url);
  const proto = (ctx.config.trustProxy && c.req.header('x-forwarded-proto')?.split(',')[0]?.trim()) || url.protocol.replace(':', '');
  const host = (ctx.config.trustProxy && c.req.header('x-forwarded-host')?.split(',')[0]?.trim()) || c.req.header('host') || url.host;
  return `${proto}://${host}`;
}

export const page = (title: string, head: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${head}
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0e1116; color: #e3e6ea;
    font: 17px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; padding: 0 16px; }
  a { color: #ffb703; font-weight: 600; }
</style>
</head>
<body><main>${body}</main></body>
</html>
`;

/** Sets the headers, replacing the app's defaults (`Cache-Control: no-store`). */
export function withHeaders(c: Context, headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) c.header(name, value);
}

export const PAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
  'Referrer-Policy': 'no-referrer',
};

