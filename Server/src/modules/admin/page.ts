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
  :root { --bg:#f4f4f6; --surface:#fff; --text:#16181d; --muted:#6b7080; --line:#e2e3e8; --accent:#2f6bff; --bug:#d93a3a; --idea:#c98a00; --ok:#1f9d55; --club:#7a3cff; color-scheme: light dark; }
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
  button.club { background: var(--club); border-color: var(--club); color: #fff; font-weight: 700; padding: 8px 18px; box-shadow: 0 0 0 3px color-mix(in srgb, var(--club) 25%, transparent); }
  button.club[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--club); }
  .badge { display:inline-block; min-width: 22px; padding: 0 6px; margin-left: 8px; border-radius: 11px; background: #fff; color: var(--club); font-size: 13px; line-height: 22px; text-align:center; }
  .tag.club { color: var(--club); }
  .orig { margin: 0 0 12px; padding: 8px 12px; background: var(--bg); border-radius: 8px; color: var(--muted); white-space: pre-wrap; word-break: break-word; font-size: 14px; }
  .field { display:block; width:100%; margin: 0 0 8px; }
  textarea.field { font: inherit; color: inherit; background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 8px 12px; min-height: 96px; resize: vertical; }
  .hint { color: var(--muted); font-size: 12px; margin: -4px 0 8px; }
</style>
</head>
<body>
<main>
  <h1>Build with us · Inbox</h1>
  <p class="sub">Bug reports and feature ideas from timing.love.</p>
  <form class="bar" id="login">
    <input id="token" type="password" placeholder="Admin token" autocomplete="current-password" style="flex:1;min-width:220px">
    <button class="primary" type="submit">Load</button>
    <button class="club" type="button" id="clubBtn" aria-pressed="false">Club ideas<span class="badge" id="clubBadge">0</span></button>
  </form>
  <div id="clubView" hidden>
    <div class="bar">
      <div class="seg" id="ideaStatus" role="group" aria-label="Idea status">
        <button type="button" data-v="pending" aria-pressed="true">Pending</button>
        <button type="button" data-v="open" aria-pressed="false">Open</button>
        <button type="button" data-v="built" aria-pressed="false">Built</button>
        <button type="button" data-v="rejected" aria-pressed="false">Rejected</button>
      </div>
      <span class="counts" id="ideaCounts"></span>
    </div>
    <p class="sub">Reword an idea so it fits the game, then publish it: players give money to it until it has 30,000,000. Ideas from the Club and from Build with us land here.</p>
    <details class="card" id="newIdea">
      <summary><strong>Write a new idea</strong></summary>
      <form id="ideaForm" style="margin-top:12px">
        <input class="field" id="newTitle" maxlength="60" placeholder="Title for the game (max 60)" required>
        <textarea class="field" id="newText" maxlength="600" placeholder="Text for the game (max 600)" required></textarea>
        <button class="primary" type="submit">Publish now</button>
        <span class="msg" id="newMsg"></span>
      </form>
    </details>
    <div id="ideaList"><p class="empty">Type the admin token to load the ideas.</p></div>
  </div>
  <div id="inboxView">
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
      <select id="item"><option value="chest:premium">Premium Chest</option><option value="chest:diamond">Diamond Chest</option><option value="chest:standard">Standard Chest</option><option value="chest:event">Event Chest</option><option value="money">Money</option><option value="ladybug">Ladybug skin</option><option value="goldbug">Goldbug skin</option><option value="scarab">Scarab skin</option><option value="bluebottle">Bluebottle skin</option><option value="orchid">Orchid Beetle skin</option><option value="firefly">Firefly skin</option></select>
      <input id="amount" type="number" min="1" max="999999999" step="1" placeholder="Amount" hidden style="width:140px">
      <button class="primary" type="submit">Give</button>
    </form>
    <p class="msg" id="rewardMsg">The game picks it up the next time the player opens it.</p>
  </section>
  </div>
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

  let view = 'inbox';
  let ideaStatus = 'pending';
  const millions = (n) => (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/[.]0$/, '') + 'M';
  const titleOf = (t) => t.split(String.fromCharCode(10))[0].slice(0, 60);
  function setView(next) {
    view = next;
    $('clubView').hidden = next !== 'club';
    $('inboxView').hidden = next === 'club';
    $('clubBtn').setAttribute('aria-pressed', String(next === 'club'));
    load();
  }
  async function loadIdeas() {
    if (!token) return;
    try {
      const data = await api('GET', '/ideas?status=' + ideaStatus);
      const c = data.counts;
      $('clubBadge').textContent = c.pending;
      $('ideaCounts').textContent = 'Pending ' + c.pending + ' · Open ' + c.open + ' · Built ' + c.built + ' · Rejected ' + c.rejected;
      $('ideaList').innerHTML = data.items.length ? data.items.map((i) => {
        const btn = (to, label, cls) => '<button type="button" ' + (cls ? 'class="' + cls + '" ' : '') + 'data-to="' + to + '">' + label + '</button>';
        const actions = {
          pending: btn('open', 'Publish', 'primary') + btn('rejected', 'Reject'),
          open: btn('open', 'Save', 'primary') + btn('built', 'Mark built') + btn('pending', 'Back to pending') + btn('rejected', 'Reject'),
          built: btn('built', 'Save', 'primary') + btn('open', 'Reopen'),
          rejected: btn('pending', 'Back to pending'),
        }[i.status];
        return '<article class="card" data-id="' + i.id + '">' +
          '<div class="meta"><span class="tag club">' + (i.source === 'club' ? 'Club' : i.source === 'team' ? 'Team' : 'Build with us') + '</span><span>' + when(i.createdAt) + '</span>' +
          (i.player ? '<span>' + esc(i.player.name) + (i.player.code ? ' · <code>' + esc(i.player.code.replace(/(.{4})(?=.)/g, '$1-')) + '</code>' : '') + '</span>' : '') +
          (i.status === 'open' || i.status === 'built' ? '<span>' + millions(i.raised) + ' of 30M</span>' : '') + '</div>' +
          '<p class="orig">' + esc(i.original) + '</p>' +
          '<input class="field" data-title maxlength="60" placeholder="Title for the game (max 60)" value="' + esc(i.title || titleOf(i.original)) + '">' +
          '<textarea class="field" data-text maxlength="600" placeholder="Text for the game (max 600)">' + esc(i.text || i.original) + '</textarea>' +
          '<div class="actions">' + actions + '<button type="button" data-delete>Delete</button></div></article>';
      }).join('') : '<p class="empty">Nothing here.</p>';
    } catch (e) { $('ideaList').innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
  }
  $('ideaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('POST', '/ideas', { title: $('newTitle').value, text: $('newText').value }); $('newTitle').value = ''; $('newText').value = ''; $('newMsg').textContent = 'Published.'; $('newIdea').open = false; ideaStatus = 'open'; $('ideaStatus').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === 'open'))); loadIdeas(); }
    catch (err) { $('newMsg').textContent = err.message; }
  });
  $('clubBtn').addEventListener('click', () => setView(view === 'club' ? 'inbox' : 'club'));
  $('ideaStatus').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; ideaStatus = b.dataset.v; $('ideaStatus').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); loadIdeas(); });
  $('ideaList').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const card = b.closest('[data-id]'); const id = card.dataset.id;
    try {
      if ('delete' in b.dataset) { if (!confirm('Delete this idea and the money given to it?')) return; await api('DELETE', '/ideas/' + id); }
      else await api('PATCH', '/ideas/' + id, { status: b.dataset.to, title: card.querySelector('[data-title]').value, text: card.querySelector('[data-text]').value });
      loadIdeas();
    } catch (err) { alert(err.message); }
  });
  async function loadBadge() { try { $('clubBadge').textContent = (await api('GET', '/ideas?limit=1')).counts.pending; } catch (e) { /* the inbox shows the error */ } }
  async function load() {
    if (!token) return;
    if (view === 'club') return loadIdeas();
    loadBadge();
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
  $('item').addEventListener('change', () => { const money = $('item').value === 'money'; $('amount').hidden = !money; $('amount').required = money; });
  $('reward').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('POST', '/rewards', { friendCode: $('code').value, item: $('item').value, amount: Number($('amount').value), reason: 'thank you' }); $('rewardMsg').textContent = 'Given. The game picks it up the next time the player opens it.'; $('code').value = ''; }
    catch (err) { $('rewardMsg').textContent = err.message; }
  });
  load();
</script>
</body>
</html>
`;
