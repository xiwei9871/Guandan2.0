import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { PLAYERS } from '../fixtures/game-data';
import { createRoom, joinRoom, setReady, waitForText } from '../utils/helpers';

const BASE_URL = 'http://localhost:3003';
const TURN_LABEL = '\u8f6e\u5230\u4f60\u51fa\u724c';
const START_GAME_LABEL = '\u5f00\u59cb\u6e38\u620f';
const HAND_LABEL = '\u624b\u724c';
const PLAY_LABEL = '\u51fa\u724c';
const PASS_LABEL = '\u4e0d\u8981';
const READY_LABEL = '\u51c6\u5907';
const LEAVE_ROOM_LABEL = '\u79bb\u5f00\u623f\u95f4';
const CLEAR_LABEL = '\u6e05\u9664';

const TURN_TEXT = new RegExp(TURN_LABEL);
const START_GAME_TEXT = new RegExp(START_GAME_LABEL);
const HAND_TEXT = new RegExp(`${HAND_LABEL} \\((\\d+)\\)`);
const PLAY_TEXT = new RegExp(PLAY_LABEL);
const PASS_TEXT = new RegExp(PASS_LABEL);
const IGNORED_BUTTON_LABELS = [
  PLAY_LABEL,
  PASS_LABEL,
  READY_LABEL,
  START_GAME_LABEL,
  LEAVE_ROOM_LABEL,
  CLEAR_LABEL,
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hasEnabledCard(page: Page): Promise<boolean> {
  return page.evaluate((ignoredLabels: string[]) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((button) => {
      const text = (button.textContent || '').trim();
      if (button.disabled) return false;
      if (!button.className.includes('border')) return false;
      return !ignoredLabels.some((label) => text.includes(label));
    });
  }, IGNORED_BUTTON_LABELS);
}

async function hasVisiblePassButton(page: Page): Promise<boolean> {
  const passButton = page.getByRole('button', { name: PASS_TEXT }).first();
  try {
    return await passButton.isVisible({ timeout: 250 });
  } catch {
    return false;
  }
}

async function isLeadTurnPage(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').innerText();
  if (!TURN_TEXT.test(bodyText) && !(await hasEnabledCard(page))) {
    return false;
  }

  return !(await hasVisiblePassButton(page));
}

async function getLeadTurnPage(
  pages: Page[],
  timeoutMs = 15000
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const page of pages) {
      if (page.isClosed()) continue;
      if (await isLeadTurnPage(page)) return page;
    }
    await delay(150);
  }

  throw new Error('Failed to locate lead-turn page within timeout');
}

async function getFollowTurnPage(
  pages: Page[],
  timeoutMs = 15000,
  excludedPages: Page[] = []
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const page of pages) {
      if (page.isClosed() || excludedPages.includes(page)) continue;
      if (await hasVisiblePassButton(page)) return page;
    }
    await delay(150);
  }

  throw new Error('Failed to locate follow-turn page within timeout');
}

async function getHandCount(page: Page): Promise<number> {
  const bodyText = await page.locator('body').innerText();
  const match = bodyText.match(HAND_TEXT);
  return match ? Number(match[1]) : -1;
}

async function getActivePages(pages: Page[]): Promise<Page[]> {
  const active: Page[] = [];
  for (const page of pages) {
    if ((await getHandCount(page)) > 0) {
      active.push(page);
    }
  }
  return active;
}

async function selectFirstCard(page: Page): Promise<void> {
  await page.evaluate((ignoredLabels: string[]) => {
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    const cardButton = buttons.find((button) => {
      const text = (button.textContent || '').trim();
      if (button.disabled) return false;
      if (!button.className.includes('border')) return false;
      return !ignoredLabels.some((label) => text.includes(label));
    });

    if (!cardButton) throw new Error('No playable card button found');
    cardButton.click();
  }, IGNORED_BUTTON_LABELS);
}

async function playOneCard(page: Page): Promise<void> {
  await selectFirstCard(page);
  await page.getByRole('button', { name: PLAY_TEXT }).click();
}

async function passTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: PASS_TEXT }).click();
}

test.describe('Long round smoke', () => {
  let browser: Browser;
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    const response = await fetch(BASE_URL);
    expect(response.ok).toBeTruthy();
  });

  test.afterAll(async () => {
    for (const page of pages) await page.close().catch(() => {});
    for (const context of contexts) await context.close().catch(() => {});
  });

  test('one player can repeatedly lead until their hand count reaches zero, then turn advances to another active player', async () => {
    test.setTimeout(240000);

    const contextsLocal = await Promise.all([0, 1, 2, 3].map(() => browser.newContext()));
    const pagesLocal = await Promise.all(contextsLocal.map((context) => context.newPage()));
    contexts.push(...contextsLocal);
    pages.push(...pagesLocal);

    await Promise.all(pagesLocal.map((page) => page.goto(BASE_URL)));

    const roomId = await createRoom(pagesLocal[0], PLAYERS[0].name);
    await joinRoom(pagesLocal[1], roomId, PLAYERS[1].name);
    await joinRoom(pagesLocal[2], roomId, PLAYERS[2].name);
    await joinRoom(pagesLocal[3], roomId, PLAYERS[3].name);

    await setReady(pagesLocal[0]);
    await setReady(pagesLocal[1]);
    await setReady(pagesLocal[2]);
    await setReady(pagesLocal[3]);

    await waitForText(pagesLocal[0], START_GAME_TEXT, 15000);
    await pagesLocal[0].getByRole('button', { name: START_GAME_TEXT }).click();

    await Promise.all(pagesLocal.map((page) => waitForText(page, HAND_TEXT, 20000)));

    let leaderPage = await getLeadTurnPage(pagesLocal);
    let previousCount = await getHandCount(leaderPage);
    expect(previousCount).toBe(27);

    for (let trick = 0; trick < 27; trick++) {
      await playOneCard(leaderPage);

      await expect
        .poll(async () => getHandCount(leaderPage), { timeout: 10000 })
        .toBe(previousCount - 1);
      const remainingOnLeaderPage = await getHandCount(leaderPage);
      previousCount = remainingOnLeaderPage;

      if (remainingOnLeaderPage === 0) {
        const nextLeader = await getLeadTurnPage(await getActivePages(pagesLocal), 10000);
        expect(nextLeader).not.toBe(leaderPage);
        return;
      }

      const activePages = await getActivePages(pagesLocal);
      const passCount = Math.max(0, activePages.length - 1);
      const passedPages: Page[] = [];

      for (let i = 0; i < passCount; i++) {
        const passPage = await getFollowTurnPage(activePages, 10000, [
          leaderPage,
          ...passedPages,
        ]);
        await passTurn(passPage);
        passedPages.push(passPage);
      }

      leaderPage = await getLeadTurnPage(await getActivePages(pagesLocal), 10000);
    }

    throw new Error('Leader hand count never reached zero within expected trick count');
  });
});
