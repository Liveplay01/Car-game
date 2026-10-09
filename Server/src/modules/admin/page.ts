/**
 * The inbox for "Build with us" (Leo, 03.10.2026): bug reports and ideas, a status per entry,
 * and a reward for a friend code. One file, no build step; the admin token is typed here and
 * kept in this tab only (sessionStorage), every call sends it as a Bearer token.
 */
export const ADMIN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>RAT Inbox</title>
<style>
  :root { --bg:#f4f4f6; --surface:#fff; --text:#16181d; --muted:#6b7080; --line:#e2e3e8; --accent:#2f6bff; --bug:#d93a3a; --idea:#c98a00; --ok:#1f9d55; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1013; --surface:#191b20; --text:#eceef3; --muted:#8d92a3; --line:#2a2d35; --accent:#5b8cff; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 28px; line-height:1.2; margin: 0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 24px; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom: 16px; }
  input, select, button { font: inherit; color: inherit; }
  input, select { background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 8px 12px; min-height: 40px; }
  button { background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 8px 14px; min-height: 40px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  button:hover { filter: brightness(0.97); }
  .seg { display:inline-flex; background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 2px; }
  .seg button { border: 0; min-height: 34px; padding: 4px 12px; border-radius: 8px; background: transparent; }
  .seg button[aria-pressed="true"] { background: var(--bg); font-weight: 600; }
  .counts { color: var(--muted); font-size: 13px; margin-left: auto; }
  .card { background: var(--surface); border:1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 12px; }
  .meta { display:flex; flex-wrap:wrap; gap: 8px 12px; align-items:center; font-size: 13px; color: var(--muted); margin-bottom: 8px; }
  .tag { font-weight: 700; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
  .tag.bug { color: var(--bug); } .tag.idea { color: var(--idea); }
  .status-new { color: var(--accent); font-weight: 600; }
  .text { white-space: pre-wrap; word-break: break-word; margin: 0 0 12px; }
  .actions { display:flex; flex-wrap: wrap; gap: 8px; }
  .actions button { min-height: 34px; padding: 4px 12px; font-size: 13px; }
  .empty { text-align:center; color: var(--muted); padding: 48px 0; }
  .reward { margin-top: 32px; }
  h2 { font-size: 18px; margin: 0 0 12px; }
  .msg { font-size: 13px; color: var(--muted); min-height: 20px; margin-top: 8px; }
  code { font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>Build with us · Inbox</h1>
  <p class="sub">Bug reports and feature ideas from timing.love.</p>
  <form class="bar" id="login">
    <input id="token" type="password" placeholder="Admin token" autocomplete="current-password" style="flex:1;min-width:220px">
    <button class="primary" type="submit">Load</button>
  </form>
  <div class="bar">
    <div class="seg" id="kind" role="group" aria-label="Kind">
      <button type="button" data-v="" aria-pressed="true">All</button>
      <button type="button" data-v="bug" aria-pressed="false">Bugs</button>
      <button type="button" data-v="idea" aria-pressed="false">Ideas</button>
    </div>
    <select id="status" aria-label="Status">
      <option value="">Every status</option><option value="new">New</option><option value="seen">Seen</option><option value="done">Done</option><option value="wontfix">Won't fix</option>
    </select>
    <span class="counts" id="counts"></span>
  </div>
  <div id="list"><p class="empty">Type the admin token to load the inbox.</p></div>
  <section class="card reward">
    <h2>Give a reward</h2>
    <form class="bar" id="reward" style="margin:0">
      <input id="code" placeholder="Friend code (K7M2-9QXA)" style="flex:1;min-width:180px" required>
      <select id="item"><option value="chest:premium">Premium Chest</option><option value="chest:standard">Standard Chest</option><option value="chest:event">Event Chest</option><option value="ladybug">Ladybug skin</option><option value="goldbug">Goldbug skin</option><option value="scarab">Scarab skin</option><option value="bluebottle">Bluebottle skin</option><option value="orchid">Orchid Beetle skin</option><option value="firefly">Firefly skin</option></select>
      <button class="primary" type="submit">Give</button>
    </form>
    <p class="msg" id="rewardMsg">The game picks it up the next time the player opens it.</p>
  </section>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem('ratAdmin') || '';
  let kind = '';
  $('token').value = token;
  async function api(method, path, body) {
    const r = await fetch('/v1/admin' + path, { method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Request failed');
    return j;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const when = (t) => new Date(t).toLocaleString();
  async function load() {
    if (!token) return;
    const q = new URLSearchParams();
    if (kind) q.set('kind', kind);
    if ($('status').value) q.set('status', $('status').value);
    try {
      const data = await api('GET', '/feedback?' + q);
      $('counts').textContent = 'Bugs ' + data.counts.bug.new + ' new / ' + data.counts.bug.total + ' · Ideas ' + data.counts.idea.new + ' new / ' + data.counts.idea.total;
      $('list').innerHTML = data.items.length ? data.items.map((f) => '<article class="card" data-id="' + f.id + '">' +
        '<div class="meta"><span class="tag ' + f.kind + '">' + (f.kind === 'bug' ? 'Bug' : 'Idea') + '</span><span>' + when(f.createdAt) + '</span>' +
        '<span class="status-' + f.status + '">' + f.status + '</span>' +
        (f.player ? '<span>' + esc(f.player.name) + (f.player.code ? ' · <code>' + esc(f.player.code.replace(/(.{4})(?=.)/g, '$1-')) + '</code>' : '') + '</span>' : '') + '</div>' +
        '<p class="text">' + esc(f.text) + '</p><div class="actions">' +
        ['seen', 'done', 'wontfix', 'new'].filter((s) => s !== f.status).map((s) => '<button type="button" data-status="' + s + '">Mark ' + (s === 'wontfix' ? "won't fix" : s) + '</button>').join('') +
        (f.player && f.player.code ? '<button type="button" data-give="' + esc(f.player.code) + '">Give Premium Chest</button>' : '') +
        '<button type="button" data-delete>Delete</button></div></article>').join('') : '<p class="empty">Nothing here.</p>';
    } catch (e) { $('list').innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
  }
  $('login').addEventListener('submit', (e) => { e.preventDefault(); token = $('token').value.trim(); sessionStorage.setItem('ratAdmin', token); load(); });
  $('kind').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.v; $('kind').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  $('status').addEventListener('change', load);
  $('list').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    try {
      if (b.dataset.status) await api('PATCH', '/feedback/' + id, { status: b.dataset.status });
      else if (b.dataset.give) { await api('POST', '/rewards', { friendCode: b.dataset.give, item: 'chest:premium', reason: 'bug report' }); b.textContent = 'Given'; b.disabled = true; return; }
      else if ('delete' in b.dataset) { if (!confirm('Delete this entry?')) return; await api('DELETE', '/feedback/' + id); }
      load();
    } catch (err) { alert(err.message); }
  });
  $('reward').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('POST', '/rewards', { friendCode: $('code').value, item: $('item').value, reason: 'thank you' }); $('rewardMsg').textContent = 'Given. The game picks it up the next time the player opens it.'; $('code').value = ''; }
    catch (err) { $('rewardMsg').textContent = err.message; }
  });
  load();
</script>
</body>
</html>
`;
