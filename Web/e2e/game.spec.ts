import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Probe } from '../src/ui/devProbe';

/**
 * Mini checks in a real browser on a phone-sized screen (Leo, 15.10.2026): the game starts, the casino
 * skins drive, Social → Ranks shows the Casino board when it should, and the Daily board keeps to its day.
 * The ranking service is answered here (`http://api.test`, `playwright.config.ts`); the save is the dev
 * server's `?demo` one (`src/main.ts`).
 */

interface Entry {
  name: string;
  score: number;
}

/** What the ranking service answers for a board (and its day, on the Daily). */
type Boards = (board: string, day: number | null) => Entry[] | Promise<Entry[]>;

/** More of the service, answered by a test: a JSON body for a path, or null for the defaults. */
type Api = (method: string, path: string, body: unknown) => unknown;

/** The bits of `window.__game` (dev server only) the tests reach into. */
interface Game {
  game: {
    perform(action: { k: string; section?: number }): void;
    save: { career: { collection: string[]; carSkins: string[]; casinoProfit: number; money: number } };
  };
}

const SOCIAL_RANKS = 1;

/** A player with a name and a cloud copy, in English: Ranks opens without asking. Returns the scores sent and the errors seen. */
async function start(page: Page, query: string, boards: Boards = () => [], api: Api = () => null): Promise<{ sent: string[]; errors: string[] }> {
  const sent: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('carGame.lang', 'en');
    localStorage.setItem('carGame.account.v1', JSON.stringify({ id: 'p1', name: 'Tester', token: 'token' }));
    localStorage.setItem('carGame.sync.v1', JSON.stringify({ code: 'K7M2-9QXA-4TFB', version: 1, hash: '' }));
  });
  await page.route('http://api.test/**', async (route) => {
    const url = new URL(route.request().url());
    const answer = api(route.request().method(), url.pathname, route.request().postDataJSON());
    if (answer !== null) return route.fulfill({ json: answer });
    const board = url.pathname.match(/^\/v1\/boards\/([\w-]+)(\/score)?$/);
    if (board?.[2]) {
      sent.push(`${board[1]} ${route.request().postData()}`);
      return route.fulfill({ json: { accepted: true, best: { rank: 1, score: 1, meta: {} } } });
    }
    if (board) {
      const day = url.searchParams.get('day');
      const entries = await boards(board[1], day === null ? null : Number(day));
      return route.fulfill({ json: { board: { id: board[1], title: board[1], period: 'all' }, entries: entries.map((e, i) => ({ rank: i + 1, title: null, meta: {}, me: false, ...e })), me: null } });
    }
    if (url.pathname === '/v1/me/title') return route.fulfill({ status: 204 });
    return route.abort();
  });
  await page.goto(`/?demo&${query}`);
  // The probe comes right after the game, behind one more import: wait for both.
  await page.waitForFunction(() => (window as unknown as { __probe?: object }).__probe !== undefined);
  return { sent, errors };
}

/** A tap that a sheet over the page cannot catch (an intro, an offer): what is tested is the panel, not the sheet. */
const tap = (target: Locator): Promise<void> => target.dispatchEvent('click');

async function openRanks(page: Page): Promise<Locator> {
  await page.evaluate((section) => (window as unknown as { __game: Game }).__game.game.perform({ k: 'showSocial', section }), SOCIAL_RANKS);
  const tabs = page.getByRole('group', { name: 'Boards' });
  await expect(tabs).toBeVisible();
  return tabs;
}

test('the game starts on a phone without errors', async ({ page }) => {
  const { errors } = await start(page, 'level=12');
  await expect(page.locator('#scene')).toBeVisible();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});

test('the probe plays a whole shift to its result without errors', async ({ page }) => {
  const { errors } = await start(page, 'level=3');
  const end = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe.play('careful'));
  expect(end.played).toBe(true);
  expect(end.screen).toBe('result');
  expect(end.result?.outcome).toBe('completed');
  expect(errors).toEqual([]);
});

test('the casino skins drive on the road without errors', async ({ page }) => {
  const { errors } = await start(page, 'level=12');
  await page.evaluate((ids) => {
    const career = (window as unknown as { __game: Game }).__game.game.save.career;
    career.collection.push(...ids);
    career.carSkins = ids;
  }, ['luckyStrike', 'megaWin', 'doubleDown', 'tycoon']);
  await page.waitForTimeout(4000);
  expect(errors).toEqual([]);
});

test('Ranks: the Casino board shows once the Casino is reached, with its money', async ({ page }) => {
  const { errors } = await start(page, 'level=12', (board) => (board === 'casino' ? [{ name: 'High Roller', score: 2_500_000 }] : []));
  const tabs = await openRanks(page);
  await tap(tabs.getByRole('button', { name: 'Casino' }));
  const row = page.locator('.board-row', { hasText: 'High Roller' });
  await expect(row).toBeVisible();
  await expect(row.locator('.board-value')).toHaveText(/2,500,000/);
  expect(errors).toEqual([]);
});

test('Ranks: My crew only is a switch under the boards, and an empty crew board leads to Social → Crew', async ({ page }) => {
  const empty = { board: { id: 'shift-level', title: 'shift-level', period: 'all' }, entries: [], me: null, crew: 0 };
  const { errors } = await start(page, 'level=5', () => [], (_method, path) => (path.startsWith('/v1/crews/boards/') ? empty : null));
  await openRanks(page);
  const chip = page.getByRole('button', { name: 'My crew only' });
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await tap(chip);
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await tap(page.getByRole('button', { name: 'Open Crew' }));
  expect(await page.evaluate(() => (window as unknown as { __game: Game }).__game.game.socialPage.section)).toBe(0);
  expect(errors).toEqual([]);
});

test('Ranks: the Casino board can be read before the Casino is reached', async ({ page }) => {
  await start(page, 'level=5');
  const tabs = await openRanks(page);
  await expect(tabs.getByRole('button')).toHaveText(['Shift level', 'Unlimited', 'Daily', 'Casino']);
});

test('Ranks: the casino profit goes to the Casino board on the next save', async ({ page }) => {
  const { sent } = await start(page, 'level=12');
  // A save while the start's own send is still on its way waits for the next save: saves come often, so save again.
  const save = (): Promise<void> =>
    page.evaluate(() => {
      const game = (window as unknown as { __game: Game }).__game.game;
      game.save.career.casinoProfit = 12_345;
      (game as unknown as { persist(): void }).persist();
    });
  await expect.poll(async () => (await save(), sent.filter((s) => s.startsWith('casino ')))).toEqual(['casino {"profit":12345}']);
});

test('Ranks: after midnight the Daily board never shows yesterday’s list', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T23:59:00+02:00'));
  const days: number[] = [];
  const { errors } = await start(page, 'level=12', async (board, day) => {
    if (board !== 'daily' || day === null) return [];
    days.push(day);
    // Today's list takes a moment to arrive: nothing of yesterday may stand in for it meanwhile.
    if (days.length > 1) await new Promise((resolve) => setTimeout(resolve, 1500));
    return [{ name: `Played day ${day}`, score: 1000 }];
  });
  const tabs = await openRanks(page);
  await tap(tabs.getByRole('button', { name: 'Daily' }));
  await expect(page.getByText(/^Played day \d+$/)).toBeVisible();
  const yesterday = days[0];

  await page.clock.setFixedTime(new Date('2026-10-16T00:01:00+02:00'));
  await tap(tabs.getByRole('button', { name: 'Unlimited' }));
  await tap(tabs.getByRole('button', { name: 'Daily' }));
  // While today's answer is still on its way (1.5 s): no waiting for it, the list must not show yesterday at all.
  await page.waitForTimeout(300);
  expect(await page.getByText(`Played day ${yesterday}`).count()).toBe(0);
  await expect(page.getByText(`Played day ${yesterday + 1}`)).toBeVisible();
  expect(days.at(-1)).toBe(yesterday + 1);
  expect(errors).toEqual([]);
});

test('Ranks: the board tabs fit a 360 px screen in English', async ({ page }) => {
  await start(page, 'level=12');
  const tabs = await openRanks(page);
  const cut = await tabs.getByRole('button').evaluateAll((buttons) => buttons.filter((b) => b.scrollWidth > b.clientWidth + 0.5).map((b) => b.textContent));
  expect(cut).toEqual([]);
});

/** A crew of two in the Silver league, a gift waiting, computer crews in the table. */
const crewView = (gifts: number) => ({
  crew: {
    name: 'Night Shift',
    code: 'K7M2-9QXA',
    link: 'http://api.test/k/K7M29QXA?by=ABCD2345',
    owner: true,
    renameAt: null,
    max: 20,
    members: [
      { id: 'p1', name: 'Tester', title: null, joinedAt: 0, owner: true, me: true, xp: 320 },
      { id: 'p2', name: 'Anna', title: null, joinedAt: 1, owner: false, me: false, xp: 140 },
    ],
    week: {
      week: 2911,
      league: 'silver',
      goal: 300,
      xp: 460,
      endsAt: Date.now() + 2 * 86_400_000,
      promote: 3,
      demote: 3,
      table: [
        { id: null, name: 'Night Owls', xp: 900, computer: true, me: false },
        { id: 'c1', name: 'Night Shift', xp: 460, computer: false, me: true },
        ...['Ring Riders', 'Exit Strategy', 'Lane Changers', 'Merge Masters', 'Yield Squad', 'Green Wave', 'Slow Lane', 'Gap Hunters'].map((name, i) => ({ id: null, name, xp: 400 - i * 40, computer: true, me: false })),
      ],
    },
    last: { place: 2, move: 1, league: 'silver' },
    gifts: Array.from({ length: gifts }, (_, i) => ({ id: `g${i}`, from: { id: 'p2', name: 'Anna' }, to: null, item: 'chest:premium', at: 0 })),
  },
  gifting: { items: ['money:5000', 'money:25000', 'money:100000', 'chest:standard', 'chest:premium', 'chest:diamond', 'chest:event'], left: 10 },
});

test('Crew: the league table, a gift to take, and a gift given out of your own money', async ({ page }) => {
  const posted: unknown[] = [];
  const { errors } = await start(page, 'level=30', () => [], (method, path, body) => {
    if (path === '/v1/crews' && method === 'GET') return crewView(1);
    if (path === '/v1/crews/gifts' && method === 'POST') return (posted.push(body), crewView(1));
    if (path === '/v1/me/referral') return { code: 'ABCD-2345', link: null, level: 5, reward: 'chest:standard', milestones: [], invitedBy: null, invited: [], done: 0, max: 25 };
    return null;
  });
  const game = (): Promise<number> => page.evaluate(() => (window as unknown as { __game: Game }).__game.game.save.career.money);
  await page.evaluate(() => (window as unknown as { __game: Game }).__game.game.perform({ k: 'showSocial', section: 0 }));
  const table = page.getByRole('list', { name: 'This week’s league table' });
  await expect(table).toBeVisible();
  await expect(table.getByText('Computer crew').first()).toBeVisible();
  await expect(page.getByText('Last week: 2nd · up to the Silver league')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take' })).toBeVisible();
  const before = await game();
  const give = page.locator('.row', { hasText: '5,000' }).first().getByRole('button', { name: 'Give' });
  await tap(give);
  await tap(page.locator('.row', { hasText: '5,000' }).first().getByRole('button', { name: 'Give it?' }));
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toEqual({ item: 'money:5000', to: null });
  expect(await game()).toBe(before - 5000);
  expect(errors).toEqual([]);
});

test('Keep driving: a crash that ends an Unlimited run is offered back for an ad, and the run goes on', async ({ page }) => {
  const { errors } = await start(page, 'level=30&adfake');
  // Not the first day, in Unlimited.
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { game: { save: { firstDay: number; mode: string }; perform(a: { k: string }): void } } }).__game.game;
    g.save.firstDay = 0;
    g.save.mode = 'unlimited';
    g.perform({ k: 'restart' });
  });
  await page.waitForFunction(() => (window as unknown as { __game: { game: { adOffer: { ready: boolean } } } }).__game.game.adOffer.ready);
  const crashed = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe.play('reckless'));
  expect(crashed.shift.outcome).toBe('struckOut');
  expect(crashed.screen).toBe('playing');
  const offered = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe.wait(1.5));
  expect(offered.revive).not.toBeNull();
  await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe.perform({ k: 'watchAdGame', reward: 'revive' }));
  // The pretend ad takes two seconds of real time.
  await page.waitForTimeout(2600);
  const back = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe.wait(0.2));
  expect(back.revived).toBe(1);
  expect(back.shift.outcome).toBeNull();
  expect(back.revive).toBeNull();
  expect(errors).toEqual([]);
});

test('Settings → Account: the player is the one entry, Cloud sync rides in it', async ({ page }) => {
  const { errors } = await start(page, 'level=12');
  await page.evaluate(() => (window as unknown as { __game: Game }).__game.game.perform({ k: 'openSettings' }));
  await tap(page.getByRole('button', { name: 'Account' }));
  const content = page.locator('.settings-content:not(.view-ghost)');
  await expect(content.locator('.settings-group').first().locator('.row-title')).toHaveText(['Tester']);
  await expect(content.locator('.row-title', { hasText: /^Cloud sync$/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});
