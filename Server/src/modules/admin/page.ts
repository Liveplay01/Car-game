/**
 * The moderator page (Leo, 03.10.2026, reworked 03.11.2026): four tabs — Bugs, Ideas, Errors, Players
 * (rewards and messages). One file, no build step; the admin token is typed here and kept in this tab
 * only (sessionStorage), every call sends it as a Bearer token. No backslashes in here: this is a
 * template literal, they would be eaten before the browser sees them.
 */
export const ADMIN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>RAT Admin</title>
<style>
  :root { --bg:#f3f4f7; --surface:#fff; --raised:#f7f8fa; --text:#15171c; --muted:#697085; --line:#e3e5eb; --accent:#2f6bff; --bug:#d93a3a; --idea:#c98a00; --ok:#1f9d55; --club:#7a3cff; --shadow:0 1px 2px rgb(20 24 40 / .06); color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0e0f12; --surface:#17191e; --raised:#1d2026; --text:#eceef3; --muted:#8d92a3; --line:#2a2d35; --accent:#5b8cff; --shadow:none; } }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  input, select, textarea, button { font: inherit; color: inherit; }
  input, select, textarea { background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 8px 12px; min-height: 40px; }
  input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  textarea { min-height: 96px; resize: vertical; width: 100%; }
  button { background: var(--surface); border:1px solid var(--line); border-radius: 10px; padding: 6px 14px; min-height: 36px; cursor: pointer; transition: background .15s, border-color .15s, transform .1s; }
  button:hover { background: var(--raised); }
  button:active { transform: scale(.97); }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  button.primary:hover { filter: brightness(1.08); }
  button.danger { color: var(--bug); }
  button.danger:hover { background: color-mix(in srgb, var(--bug) 10%, transparent); }

  .top { position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
  .top-in { max-width: 920px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; gap: 16px; min-height: 56px; }
  .brand { font-weight: 800; letter-spacing: -.01em; white-space: nowrap; }
  .brand span { color: var(--muted); font-weight: 500; }
  nav { display: flex; gap: 2px; overflow-x: auto; flex: 1; scrollbar-width: none; }
  nav button { border: 0; background: transparent; border-radius: 8px; display: flex; align-items: center; gap: 6px; white-space: nowrap; color: var(--muted); font-weight: 600; }
  nav button:hover { background: var(--raised); color: var(--text); }
  nav button[aria-selected="true"] { background: var(--raised); color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); border-radius: 8px 8px 0 0; }
  .badge { min-width: 20px; padding: 0 6px; border-radius: 10px; background: var(--line); color: var(--text); font-size: 12px; line-height: 20px; text-align: center; }
  .badge.hot { background: var(--bug); color: #fff; }
  .badge.club { background: var(--club); color: #fff; }
  .signout { border: 0; background: transparent; color: var(--muted); }

  main { max-width: 920px; margin: 0 auto; padding: 24px 16px 80px; }
  .lock { max-width: 380px; margin: 14vh auto 0; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; box-shadow: var(--shadow); }
  .lock h1 { font-size: 22px; margin: 0 0 4px; }
  .lock input { width: 100%; margin: 16px 0 12px; }
  .lock button { width: 100%; }

  .head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 8px; }
  .head h1 { font-size: 22px; line-height: 1.2; margin: 0; flex: 1; min-width: 140px; }
  .sub { color: var(--muted); margin: 0 0 16px; max-width: 70ch; font-size: 14px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
  .counts { color: var(--muted); font-size: 13px; margin-left: auto; }
  .seg { display: inline-flex; flex-wrap: wrap; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 2px; }
  .seg button { border: 0; min-height: 32px; padding: 2px 12px; border-radius: 8px; background: transparent; color: var(--muted); }
  .seg button[aria-pressed="true"] { background: var(--raised); color: var(--text); font-weight: 600; box-shadow: inset 0 0 0 1px var(--line); }

  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; box-shadow: var(--shadow); }
  .card.new { border-color: color-mix(in srgb, var(--accent) 55%, var(--line)); }
  .card.done { opacity: .65; }
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow); }
  main h2 { font-size: 16px; margin: 24px 0 12px; }
  .panel h2 { font-size: 16px; margin: 0 0 12px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; font-size: 13px; color: var(--muted); margin-bottom: 8px; }
  .tag { font-weight: 700; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
  .tag.bug { color: var(--bug); } .tag.club { color: var(--club); }
  .pill { font-size: 12px; font-weight: 600; padding: 0 8px; border-radius: 10px; background: var(--raised); border: 1px solid var(--line); }
  .pill.new { color: var(--accent); } .pill.done { color: var(--ok); }
  .text { white-space: pre-wrap; word-break: break-word; margin: 0 0 12px; }
  .orig { margin: 0 0 12px; padding: 8px 12px; background: var(--raised); border-radius: 8px; color: var(--muted); white-space: pre-wrap; word-break: break-word; font-size: 13px; overflow-x: auto; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .actions .gap { margin-left: auto; }
  .field { display: block; width: 100%; margin: 0 0 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .row .grow { flex: 1; min-width: 180px; }
  .empty { text-align: center; color: var(--muted); padding: 48px 0; }
  .msg { font-size: 13px; color: var(--muted); min-height: 20px; margin: 8px 0 0; }
  code { font-size: 13px; }
  details.panel summary { cursor: pointer; font-weight: 600; }
  details.panel[open] summary { margin-bottom: 12px; }
  .toast { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 16px); background: var(--text); color: var(--bg); padding: 8px 16px; border-radius: 20px; font-size: 14px; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
  .toast.on { opacity: 1; transform: translate(-50%, 0); }
  .toast.err { background: var(--bug); color: #fff; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<form class="lock" id="login">
  <h1>RAT Admin</h1>
  <p class="sub" style="margin:0">Type the admin token. It stays in this tab only.</p>
  <input id="token" type="password" placeholder="Admin token" autocomplete="current-password" required>
  <button class="primary" type="submit">Open</button>
  <p class="msg" id="loginMsg"></p>
</form>

<div id="app" hidden>
<header class="top"><div class="top-in">
  <div class="brand">RAT <span>Admin</span></div>
  <nav role="tablist" id="tabs">
    <button type="button" role="tab" data-tab="bugs">Bugs<span class="badge" id="bBugs">0</span></button>
    <button type="button" role="tab" data-tab="ideas">Ideas<span class="badge" id="bIdeas">0</span></button>
    <button type="button" role="tab" data-tab="errors">Errors<span class="badge" id="bErrors">0</span></button>
    <button type="button" role="tab" data-tab="ranks">Ranks<span class="badge" id="bRanks">0</span></button>
    <button type="button" role="tab" data-tab="players">Players</button>
  </nav>
  <button type="button" class="signout" id="signout">Sign out</button>
</div></header>

<main>
  <section id="bugs" hidden>
    <div class="head"><h1>Bug reports</h1><span class="counts" id="counts"></span></div>
    <p class="sub">From the game and timing.love. Feature ideas are not here: they are Game Fund ideas.</p>
    <div class="bar">
      <div class="seg" id="status" role="group" aria-label="Status">
        <button type="button" data-v="" aria-pressed="true">All</button>
        <button type="button" data-v="new" aria-pressed="false">New</button>
        <button type="button" data-v="seen" aria-pressed="false">Seen</button>
        <button type="button" data-v="done" aria-pressed="false">Done</button>
        <button type="button" data-v="wontfix" aria-pressed="false">Won't fix</button>
      </div>
    </div>
    <div id="list"></div>
  </section>

  <section id="ideas" hidden>
    <div class="head"><h1>Game Fund ideas</h1><span class="counts" id="ideaCounts"></span></div>
    <p class="sub">Reword an idea so it fits the game, then publish it: players give money to it until it has 30,000,000. Ideas come from the game and from timing.love/build; timing.love/build lists the published ones.</p>
    <div class="bar">
      <div class="seg" id="ideaStatus" role="group" aria-label="Idea status">
        <button type="button" data-v="pending" aria-pressed="true">Pending</button>
        <button type="button" data-v="open" aria-pressed="false">Open</button>
        <button type="button" data-v="building" aria-pressed="false">In progress</button>
        <button type="button" data-v="built" aria-pressed="false">Built</button>
        <button type="button" data-v="rejected" aria-pressed="false">Rejected</button>
      </div>
    </div>
    <details class="panel" id="newIdea">
      <summary>Write a new idea</summary>
      <form id="ideaForm">
        <input class="field" id="newTitle" maxlength="60" placeholder="Title for the game (max 60)" required>
        <textarea class="field" id="newText" maxlength="600" placeholder="Text for the game (max 600)" required></textarea>
        <button class="primary" type="submit">Publish now</button>
      </form>
    </details>
    <div id="ideaList"></div>
  </section>

  <section id="errors" hidden>
    <div class="head"><h1>Errors</h1></div>
    <p class="sub">Uncaught errors from the game in the field, one row per kind, counted. No address, no player. Kept 30 days after the last time; dismissed ones come back if they happen again.</p>
    <div id="errList"></div>
  </section>

  <section id="ranks" hidden>
    <div class="head"><h1>Ranks</h1></div>
    <p class="sub">Flagged runs are ones the server replayed and could not confirm. Nothing is removed automatically: check, then remove the score or ban the player. A banned player vanishes from every list; Players can lift it.</p>
    <h2>Flagged</h2>
    <div id="flagList"></div>
    <h2>Board</h2>
    <div class="bar">
    <div class="seg" id="boardSeg" role="group" aria-label="Board">
      <button type="button" data-v="unlimited" aria-pressed="true">Unlimited</button>
      <button type="button" data-v="daily" aria-pressed="false">Daily</button>
      <button type="button" data-v="shift-level" aria-pressed="false">Shift level</button>
      <button type="button" data-v="rush" aria-pressed="false">Boss Rush</button>
      <button type="button" data-v="casino" aria-pressed="false">Arcade</button>
    </div>
    </div>
    <div id="rankList"></div>
  </section>

  <section id="players" hidden>
    <div class="head"><h1>Players</h1></div>
    <p class="sub">Both reach the player the next time they open the game.</p>
    <div class="panel">
      <h2>Give a reward</h2>
      <form id="reward">
        <div class="row">
          <input class="grow" id="code" placeholder="Friend code (K7M2-9QXA)" required>
          <select id="item"><option value="chest:premium">Premium Chest</option><option value="chest:diamond">Diamond Chest</option><option value="chest:standard">Standard Chest</option><option value="chest:event">Event Chest</option><option value="money">Money</option><option value="ladybug">Ladybug skin</option><option value="goldbug">Goldbug skin</option><option value="scarab">Scarab skin</option><option value="bluebottle">Bluebottle skin</option><option value="orchid">Orchid Beetle skin</option><option value="firefly">Firefly skin</option></select>
          <input id="amount" type="number" min="1" max="999999999" step="1" placeholder="Amount" hidden style="width:140px">
          <button class="primary" type="submit">Give</button>
        </div>
      </form>
    </div>
    <div class="panel">
      <h2>Send a message</h2>
      <form id="note">
        <div class="row">
          <select id="noteTo" aria-label="Audience"><option value="all">All players</option><option value="play">Google Play players</option><option value="player">One player</option></select>
          <input class="grow" id="noteCode" placeholder="Friend code (K7M2-9QXA)" hidden>
        </div>
        <input class="field" id="noteTitle" maxlength="60" placeholder="Heading (max 60)" required>
        <textarea class="field" id="noteBody" maxlength="600" placeholder="Text (max 600)" required></textarea>
        <button class="primary" type="submit">Send</button>
        <p class="msg">Shown at the start of the game until the player taps it away. Offered for 30 days.</p>
      </form>
    </div>
    <h2 style="font-size:16px;margin:24px 0 12px">Sent messages</h2>
    <div id="noteList"></div>
  </section>
</main>
</div>
<div class="toast" id="toast" role="status"></div>

<script>
  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem('ratAdmin') || '';
  let tab = sessionStorage.getItem('ratTab') || 'bugs';
  let ideaStatus = 'pending';
  let bugStatus = '';
  let board = 'unlimited';
  let toastTimer = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const when = (t) => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const millions = (n) => (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/[.]0$/, '') + 'M';
  const titleOf = (t) => t.split(String.fromCharCode(10))[0].slice(0, 60);
  const who = (p) => p ? '<span>' + esc(p.name) + (p.code ? ' · <code>' + esc(p.code.replace(/(.{4})(?=.)/g, '$1-')) + '</code>' : '') + '</span>' : '';
  const pick = (group, button) => group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === button)));

  function toast(text, bad) {
    const t = $('toast');
    t.textContent = text;
    t.classList.toggle('err', !!bad);
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
  }

  async function api(method, path, body) {
    const r = await fetch('/v1/admin' + path, { method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error((j.error && j.error.message) || 'Request failed');
      e.status = r.status;
      throw e;
    }
    return j;
  }
  const fail = (e) => toast(e.message, true);

  function signOut(message) {
    token = '';
    sessionStorage.removeItem('ratAdmin');
    $('app').hidden = true;
    $('login').hidden = false;
    $('loginMsg').textContent = message || '';
    $('token').value = '';
    $('token').focus();
  }

  function setTab(next) {
    tab = next;
    sessionStorage.setItem('ratTab', next);
    for (const b of $('tabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === next));
    for (const s of ['bugs', 'ideas', 'errors', 'ranks', 'players']) $(s).hidden = s !== next;
    load();
  }

  const counts = async () => {
    const [bugs, ideas, errs] = await Promise.all([api('GET', '/feedback?kind=bug&limit=1'), api('GET', '/ideas?limit=1'), api('GET', '/errors')]);
    $('bBugs').textContent = bugs.counts.bug.new;
    $('bBugs').classList.toggle('hot', bugs.counts.bug.new > 0);
    $('bIdeas').textContent = ideas.counts.pending;
    $('bIdeas').classList.toggle('club', ideas.counts.pending > 0);
    $('bErrors').textContent = errs.items.length;
    $('bErrors').classList.toggle('hot', errs.items.length > 0);
    const flags = await api('GET', '/flags');
    $('bRanks').textContent = flags.flags.length;
    $('bRanks').classList.toggle('hot', flags.flags.length > 0);
  };

  const rankActions = (b, id) => '<button type="button" data-score data-board="' + esc(b) + '" data-player="' + esc(id) + '">Remove score</button>' +
    '<button type="button" data-ban data-player="' + esc(id) + '">Ban</button>' +
    '<button type="button" class="danger gap" data-erase data-player="' + esc(id) + '">Delete player</button>';
  const reasons = { mismatch: 'replay scored differently', invalid: 'proof invalid', no_proof: 'no proof, top 10', bot_taps: 'machine-like taps', casino_jump: 'profit rose too fast' };

  const loaders = {
    async bugs() {
      const q = new URLSearchParams({ kind: 'bug' });
      if (bugStatus) q.set('status', bugStatus);
      const data = await api('GET', '/feedback?' + q);
      $('counts').textContent = data.counts.bug.new + ' new · ' + data.counts.bug.total + ' total';
      $('list').innerHTML = data.items.length ? data.items.map((f) =>
        '<article class="card ' + (f.status === 'new' ? 'new' : f.status === 'done' || f.status === 'wontfix' ? 'done' : 'bug') + '" data-id="' + f.id + '">' +
        '<div class="meta"><span class="tag bug">Bug</span><span class="pill ' + f.status + '">' + (f.status === 'wontfix' ? "won't fix" : f.status) + '</span><span>' + when(f.createdAt) + '</span>' + who(f.player) + '</div>' +
        '<p class="text">' + esc(f.text) + '</p><div class="actions">' +
        ['seen', 'done', 'wontfix', 'new'].filter((s) => s !== f.status).map((s) => '<button type="button" data-status="' + s + '">' + (s === 'wontfix' ? "Won't fix" : s === 'new' ? 'Mark new' : s === 'seen' ? 'Seen' : 'Done') + '</button>').join('') +
        (f.player && f.player.code ? '<button type="button" data-give="' + esc(f.player.code) + '">Give Premium Chest</button>' : '') +
        '<button type="button" class="danger gap" data-delete>Delete</button></div></article>').join('') : '<p class="empty">Nothing here.</p>';
    },
    async ideas() {
      const data = await api('GET', '/ideas?status=' + ideaStatus);
      const c = data.counts;
      $('ideaCounts').textContent = c.pending + ' pending · ' + c.open + ' open · ' + c.building + ' in progress · ' + c.built + ' built · ' + c.rejected + ' rejected';
      $('ideaList').innerHTML = data.items.length ? data.items.map((i) => {
        const btn = (to, label, cls) => '<button type="button" ' + (cls ? 'class="' + cls + '" ' : '') + 'data-to="' + to + '">' + label + '</button>';
        const actions = {
          pending: btn('open', 'Publish', 'primary') + btn('rejected', 'Reject'),
          open: btn('open', 'Save', 'primary') + btn('building', 'Mark in progress') + btn('built', 'Mark built') + btn('pending', 'Back to pending') + btn('rejected', 'Reject'),
          building: btn('building', 'Save', 'primary') + btn('built', 'Mark built') + btn('open', 'Reopen'),
          built: btn('built', 'Save', 'primary') + btn('open', 'Reopen'),
          rejected: btn('pending', 'Back to pending'),
        }[i.status];
        const live = i.status === 'open' || i.status === 'building' || i.status === 'built';
        const name = esc(i.title || titleOf(i.original));
        return '<article class="card idea" data-id="' + i.id + '">' +
          '<div class="meta"><span class="tag club">' + (i.source === 'club' ? 'In the game' : i.source === 'team' ? 'Team' : 'timing.love') + '</span><span>' + when(i.createdAt) + '</span>' + who(i.player) +
          (live ? '<span class="pill">' + millions(i.raised) + ' of 30M</span>' : '') + '</div>' +
          '<p class="orig">' + esc(i.original) + '</p>' +
          '<input class="field" data-title maxlength="60" placeholder="Title for the game (max 60)" value="' + name + '">' +
          '<textarea class="field" data-text maxlength="600" placeholder="Text for the game (max 600)">' + esc(i.text || i.original) + '</textarea>' +
          '<div class="actions">' + actions + '<button type="button" class="danger gap" data-delete aria-label="Delete ' + name + '">Delete</button></div></article>';
      }).join('') : '<p class="empty">Nothing here.</p>';
    },
    async errors() {
      const data = await api('GET', '/errors');
      $('errList').innerHTML = data.items.length ? data.items.map((x) =>
        '<article class="card bug" data-id="' + x.id + '">' +
        '<div class="meta"><span class="tag bug">' + esc(x.type) + '</span><span class="pill">' + x.count + '×</span><span>' + esc(x.channel) + '</span><span>last ' + when(x.lastAt) + '</span><span>first ' + when(x.firstAt) + '</span></div>' +
        '<p class="text">' + esc(x.message) + '</p>' + (x.stack ? '<pre class="orig">' + esc(x.stack) + '</pre>' : '') +
        '<div class="actions"><button type="button" data-dismiss>Dismiss</button></div></article>').join('') : '<p class="empty">No errors. Good.</p>';
    },
    async ranks() {
      const [flags, list] = await Promise.all([api('GET', '/flags'), api('GET', '/boards/' + board)]);
      $('flagList').innerHTML = flags.flags.length ? flags.flags.map((f) =>
        '<article class="card bug"><div class="meta"><span class="tag bug">' + esc(f.board) + '</span><span class="pill">' + esc(reasons[f.reason] || f.reason) + '</span><strong>' + esc(f.name) + '</strong>' +
        '<span>claimed ' + f.claimed + (f.replayed === null ? '' : ' · replayed ' + f.replayed) + '</span><span>' + when(f.flaggedAt) + '</span></div>' +
        '<div class="actions">' + rankActions(f.board, f.playerId) +
        '<button type="button" data-dismissflag data-board="' + esc(f.board) + '" data-period="' + esc(f.period) + '" data-player="' + esc(f.playerId) + '" data-reason="' + esc(f.reason) + '">Dismiss flag</button></div></article>').join('') : '<p class="empty">No flags.</p>';
      $('rankList').innerHTML = list.entries.length ? list.entries.map((e) =>
        '<article class="card"><div class="meta"><span class="pill">#' + e.rank + '</span><strong>' + esc(e.name) + '</strong><span>' + e.score + '</span><span>' + when(e.at) + '</span></div>' +
        '<div class="actions">' + rankActions(list.board, e.playerId) + '</div></article>').join('') : '<p class="empty">Empty.</p>';
    },
    async players() {
      const data = await api('GET', '/messages');
      const to = { all: 'All players', play: 'Google Play', player: 'One player' };
      $('noteList').innerHTML = data.items.length ? data.items.map((m) =>
        '<article class="card" data-note="' + m.id + '"><div class="meta"><span class="tag">' + to[m.audience] + '</span><span>' + when(m.createdAt) + '</span>' + who(m.player) + '</div>' +
        '<p class="text"><strong>' + esc(m.title) + '</strong><br>' + esc(m.body) + '</p><div class="actions"><button type="button" data-withdraw>Withdraw</button></div></article>').join('') : '<p class="empty">No messages out.</p>';
    },
  };

  async function load() {
    if (!token) return;
    try {
      await loaders[tab]();
      $('login').hidden = true;
      $('app').hidden = false;
      counts().catch(() => {});
    } catch (e) {
      if (e.status === 401) signOut(e.message);
      else toast(e.message, true);
    }
  }

  $('login').addEventListener('submit', (e) => {
    e.preventDefault();
    token = $('token').value.trim();
    sessionStorage.setItem('ratAdmin', token);
    setTab(tab);
  });
  $('signout').addEventListener('click', () => signOut());
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });

  $('status').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; bugStatus = b.dataset.v; pick($('status'), b); load(); });
  $('list').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    try {
      if (b.dataset.status) await api('PATCH', '/feedback/' + id, { status: b.dataset.status });
      else if (b.dataset.give) { await api('POST', '/rewards', { friendCode: b.dataset.give, item: 'chest:premium', reason: 'bug report' }); b.textContent = 'Given'; b.disabled = true; return; }
      else if ('delete' in b.dataset) { if (!confirm('Delete this entry?')) return; await api('DELETE', '/feedback/' + id); }
      load();
    } catch (err) { fail(err); }
  });

  $('ideaStatus').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; ideaStatus = b.dataset.v; pick($('ideaStatus'), b); load(); });
  $('ideaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/ideas', { title: $('newTitle').value, text: $('newText').value });
      $('ideaForm').reset();
      $('newIdea').open = false;
      ideaStatus = 'open';
      pick($('ideaStatus'), $('ideaStatus').querySelector('[data-v="open"]'));
      toast('Published.');
      load();
    } catch (err) { fail(err); }
  });
  $('ideaList').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const card = b.closest('[data-id]'); const id = card.dataset.id;
    try {
      if ('delete' in b.dataset) { if (!confirm('Delete this idea from the Game fund and permanently remove its gifts?')) return; await api('DELETE', '/ideas/' + id); }
      else { await api('PATCH', '/ideas/' + id, { status: b.dataset.to, title: card.querySelector('[data-title]').value, text: card.querySelector('[data-text]').value }); toast('Saved.'); }
      load();
    } catch (err) { fail(err); }
  });

  $('boardSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; board = b.dataset.v; pick($('boardSeg'), b); load(); });
  $('ranks').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b || !b.dataset.player) return;
    const id = b.dataset.player;
    try {
      if ('score' in b.dataset) { if (!confirm('Remove this score?')) return; await api('DELETE', '/scores/' + b.dataset.board + '/' + id); }
      else if ('ban' in b.dataset) { if (!confirm('Ban this player? They disappear from every list.')) return; await api('PATCH', '/players/' + id, { banned: true }); }
      else if ('erase' in b.dataset) { if (!confirm('Delete this player and all their data for good?')) return; await api('DELETE', '/players/' + id); }
      else await api('DELETE', '/flags/' + [b.dataset.board, b.dataset.period, id, b.dataset.reason].map(encodeURIComponent).join('/'));
      load();
    } catch (err) { fail(err); }
  });

  $('errList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dismiss]'); if (!b) return;
    try { await api('DELETE', '/errors/' + b.closest('[data-id]').dataset.id); load(); } catch (err) { fail(err); }
  });

  $('item').addEventListener('change', () => { const money = $('item').value === 'money'; $('amount').hidden = !money; $('amount').required = money; });
  $('reward').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('POST', '/rewards', { friendCode: $('code').value, item: $('item').value, amount: Number($('amount').value), reason: 'thank you' }); toast('Given.'); $('code').value = ''; }
    catch (err) { fail(err); }
  });
  $('noteTo').addEventListener('change', () => { const one = $('noteTo').value === 'player'; $('noteCode').hidden = !one; $('noteCode').required = one; });
  $('note').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/messages', { audience: $('noteTo').value, friendCode: $('noteCode').value, title: $('noteTitle').value, body: $('noteBody').value });
      $('note').reset();
      $('noteCode').hidden = true;
      toast('Sent.');
      load();
    } catch (err) { fail(err); }
  });
  $('noteList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-withdraw]'); if (!b) return;
    try { await api('DELETE', '/messages/' + b.closest('[data-note]').dataset.note); load(); } catch (err) { fail(err); }
  });

  if (token) setTab(tab);
</script>
</body>
</html>
`;
