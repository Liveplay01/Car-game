import { test, expect, type Locator, type Page } from '@playwright/test';

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

/** The bits of `window.__game` (dev server only) the tests reach into. */
interface Game {
  game: {
    perform(action: { k: string; section?: number }): void;
    save: { career: { collection: string[]; carSkins: string[]; casinoProfit: number } };
  };
}

const SOCIAL_RANKS = 1;

/** A player with a name and a cloud copy, in English: Ranks opens without asking. Returns the scores sent and the errors seen. */
async function start(page: Page, query: string, boards: Boards = () => []): Promise<{ sent: string[]; errors: string[] }> {
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
  await page.waitForFunction(() => (window as unknown as { __game?: object }).__game !== undefined);
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

test('Ranks: no Casino board before the Casino is reached', async ({ page }) => {
  await start(page, 'level=5');
  const tabs = await openRanks(page);
  await expect(tabs.getByRole('button')).toHaveText(['Shift level', 'Unlimited', 'Daily', 'Boss Rush']);
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
