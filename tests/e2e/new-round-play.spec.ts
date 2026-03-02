import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { PLAYERS } from '../fixtures/game-data';
import {
  createRoom,
  joinRoom,
  setReady,
  saveScreenshot,
  waitForText,
} from '../utils/helpers';

const BASE_URL = 'http://localhost:3003';
const START_GAME_LABEL = '\u5f00\u59cb\u6e38\u620f';
const HAND_LABEL = '\u624b\u724c';
const PASS_LABEL = '\u4e0d\u8981';
const TURN_LABEL = '\u8f6e\u5230\u4f60\u51fa\u724c';
const PLAY_LABEL = '\u51fa\u724c';
const READY_LABEL = '\u51c6\u5907';
const LEAVE_ROOM_LABEL = '\u79bb\u5f00\u623f\u95f4';
const CLEAR_LABEL = '\u6e05\u9664';

const START_GAME_TEXT = new RegExp(START_GAME_LABEL);
const HAND_TEXT = new RegExp(`${HAND_LABEL} \\(27\\)`);
const PASS_MARKER_TEXT = new RegExp(PASS_LABEL);
const TURN_TEXT = new RegExp(TURN_LABEL);
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
      if (button.disabled) {
        return false;
      }

      if (!button.className.includes('border')) {
        return false;
      }

      const text = (button.textContent || '').trim();
      return !ignoredLabels.includes(text);
    });
  }, IGNORED_BUTTON_LABELS);
}

async function hasEnabledPlayButton(page: Page): Promise<boolean> {
  return page.evaluate((playLabel: string) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((button) => {
      const text = button.textContent || '';
      return text.includes(playLabel) && !button.disabled;
    });
  }, PLAY_LABEL);
}

async function isCurrentTurnPage(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').innerText();
  if (TURN_TEXT.test(bodyText)) {
    return true;
  }

  return hasEnabledCard(page);
}

async function getCurrentTurnPage(pages: Page[], timeoutMs = 15000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const page of pages) {
      if (page.isClosed()) {
        continue;
      }

      if (await isCurrentTurnPage(page)) {
        return page;
      }
    }

    await delay(200);
  }

  throw new Error('Failed to locate current-turn page within timeout');
}

async function selectOneCard(page: Page, preferredLabels: string[] = []): Promise<string | null> {
  return page.evaluate(
    ({ labels, ignoredLabels }: { labels: string[]; ignoredLabels: string[] }) => {
      const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      const cardButtons = buttons.filter((button) => {
        const text = (button.textContent || '').trim();

        if (button.disabled) return false;
        if (!button.className.includes('border')) return false;
        return !ignoredLabels.some((label) => text.includes(label));
      });

      const clickAndGetText = (button: HTMLButtonElement | undefined): string | null => {
        if (!button) return null;
        button.click();
        return (button.textContent || '').trim();
      };

      for (const label of labels) {
        const selected = clickAndGetText(
          cardButtons.find((button) => (button.textContent || '').includes(label))
        );

        if (selected) {
          return selected;
        }
      }

      return clickAndGetText(cardButtons[0]);
    },
    { labels: preferredLabels, ignoredLabels: IGNORED_BUTTON_LABELS }
  );
}

async function playOneCard(page: Page, preferredLabels: string[] = []): Promise<void> {
  const selected = await selectOneCard(page, preferredLabels);
  expect(selected).toBeTruthy();

  const playButton = page.getByRole('button', { name: PLAY_TEXT }).first();
  await expect(playButton).toBeVisible({ timeout: 5000 });
  await playButton.click();
}

async function passTurn(page: Page): Promise<void> {
  const passButton = page.getByRole('button', { name: PASS_TEXT }).first();
  await expect(passButton).toBeVisible({ timeout: 5000 });
  await passButton.click();
}

test.describe('Round reset after three passes', () => {
  let browser: Browser;
  let contexts: BrowserContext[] = [];
  let pages: Page[] = [];

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    const response = await fetch(BASE_URL);
    expect(response.ok).toBeTruthy();
  });

  test.afterAll(async () => {
    for (const page of pages) {
      await page.close().catch(() => {});
    }

    for (const context of contexts) {
      await context.close().catch(() => {});
    }
  });

  test('leader can play again after three passes and center area is not cleared before new lead', async () => {
    test.setTimeout(180000);

    const page1Context = await browser.newContext();
    const page1 = await page1Context.newPage();
    contexts.push(page1Context);
    pages.push(page1);
    await page1.goto(BASE_URL);
    const roomId = await createRoom(page1, PLAYERS[0].name);

    const page2Context = await browser.newContext();
    const page2 = await page2Context.newPage();
    contexts.push(page2Context);
    pages.push(page2);
    await page2.goto(BASE_URL);
    await joinRoom(page2, roomId, PLAYERS[1].name);

    const page3Context = await browser.newContext();
    const page3 = await page3Context.newPage();
    contexts.push(page3Context);
    pages.push(page3);
    await page3.goto(BASE_URL);
    await joinRoom(page3, roomId, PLAYERS[2].name);

    const page4Context = await browser.newContext();
    const page4 = await page4Context.newPage();
    contexts.push(page4Context);
    pages.push(page4);
    await page4.goto(BASE_URL);
    await joinRoom(page4, roomId, PLAYERS[3].name);

    await setReady(page1);
    await setReady(page2);
    await setReady(page3);
    await setReady(page4);

    await waitForText(page1, START_GAME_TEXT, 15000);
    await page1.getByRole('button', { name: START_GAME_TEXT }).click();

    await Promise.all([
      waitForText(page1, HAND_TEXT, 20000),
      waitForText(page2, HAND_TEXT, 20000),
      waitForText(page3, HAND_TEXT, 20000),
      waitForText(page4, HAND_TEXT, 20000),
    ]);

    const playerPages = [page1, page2, page3, page4];

    const leaderPage = await getCurrentTurnPage(playerPages);
    expect(await hasEnabledPlayButton(leaderPage)).toBe(false);

    await playOneCard(leaderPage, ['BIG', 'SMALL']);
    await delay(1000);

    for (let i = 0; i < 3; i++) {
      const passPage = await getCurrentTurnPage(playerPages);
      await passTurn(passPage);
      await delay(1000);
    }

    const passMarkersBeforeNewLead = await leaderPage.getByText(PASS_MARKER_TEXT).count();
    expect(passMarkersBeforeNewLead).toBeGreaterThanOrEqual(1);
    await saveScreenshot(leaderPage, '02-before-new-round-lead.png');

    await expect
      .poll(async () => isCurrentTurnPage(leaderPage), { timeout: 15000 })
      .toBe(true);

    const selectedCard = await selectOneCard(leaderPage, ['2', '3', '4', '5']);
    expect(selectedCard).toBeTruthy();
    expect(await hasEnabledPlayButton(leaderPage)).toBe(true);

    await leaderPage.getByRole('button', { name: PLAY_TEXT }).first().click();

    await expect
      .poll(async () => leaderPage.getByText(PASS_MARKER_TEXT).count(), { timeout: 10000 })
      .toBe(0);
  });
});
