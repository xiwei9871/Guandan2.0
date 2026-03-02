import { Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../fixtures/game-data';

const CONNECTED_LABEL = '\u5df2\u8fde\u63a5\u5230\u670d\u52a1\u5668';
const CREATE_ROOM_LABEL = '\u521b\u5efa\u623f\u95f4';
const CREATE_NEW_ROOM_LABEL = '\u521b\u5efa\u65b0\u623f\u95f4';
const JOIN_ROOM_LABEL = '\u52a0\u5165\u623f\u95f4';
const READY_LABEL = '\u51c6\u5907';

const CONNECTED_TEXT = new RegExp(CONNECTED_LABEL);
const CREATE_ROOM_TEXT = new RegExp(`${CREATE_ROOM_LABEL}|${CREATE_NEW_ROOM_LABEL}`);
const JOIN_ROOM_TEXT = new RegExp(JOIN_ROOM_LABEL);
const READY_TEXT = new RegExp(READY_LABEL);

export async function waitForSocketConnected(page: Page): Promise<void> {
  await page.waitForFunction(
    (connectedLabel: string) => {
      const bodyText = document.body.innerText || '';
      return bodyText.includes(connectedLabel);
    },
    CONNECTED_LABEL,
    { timeout: TIMEOUTS.SOCKET_CONNECT }
  );
  await expect(page.getByText(CONNECTED_TEXT)).toBeVisible({
    timeout: TIMEOUTS.SOCKET_CONNECT,
  });
  await page.waitForTimeout(500);
}

export async function createRoom(page: Page, playerName: string): Promise<string> {
  await waitForSocketConnected(page);
  await page.fill('#playerName', playerName);
  await page.getByRole('button', { name: CREATE_ROOM_TEXT }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: TIMEOUTS.ROOM_CREATE });

  const roomId = page.url().split('/').pop() || '';
  expect(roomId).toMatch(/^[A-Z0-9]{6}$/);
  return roomId;
}

export async function joinRoom(page: Page, roomId: string, playerName: string): Promise<void> {
  await waitForSocketConnected(page);
  await page.fill('#playerName', playerName);
  await page.fill('#roomId', roomId);
  await page.getByRole('button', { name: JOIN_ROOM_TEXT }).click();

  try {
    await page.waitForURL(`**/room/${roomId}`, { timeout: TIMEOUTS.JOIN_ROOM });
  } catch (error) {
    const bodyText = await page.locator('body').innerText();
    const knownError =
      bodyText.includes('\u65e0\u6cd5\u52a0\u5165\u8be5\u623f\u95f4\u3002') ||
      bodyText.includes('\u52a0\u5165\u623f\u95f4\u5931\u8d25') ||
      bodyText.includes('\u623f\u95f4\u4e0d\u5b58\u5728');

    if (knownError) {
      throw new Error(`Failed to join room ${roomId}`);
    }

    await page.screenshot({ path: `tests/e2e/screenshots/error-join-${playerName}.png` });
    throw error;
  }
}

export async function setReady(page: Page): Promise<void> {
  await page.getByRole('button', { name: READY_TEXT }).click();
  await page.waitForTimeout(1000);
}

export async function saveScreenshot(page: Page, name: string): Promise<string> {
  const path = `tests/e2e/screenshots/${name}`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

export async function expectText(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.locator('body')).toContainText(text);
}

export async function waitForText(
  page: Page,
  text: string | RegExp,
  timeout = 5000
): Promise<void> {
  await expect(page.locator('body')).toContainText(text, { timeout });
}

export async function waitForConsoleLog(page: Page, message: string): Promise<void> {
  await page.waitForFunction(
    (msg: string) => {
      const logs = (window as { consoleLogs?: string[] }).consoleLogs || [];
      return logs.some((log: string) => log.includes(msg));
    },
    message,
    { timeout: 5000 }
  );
}
