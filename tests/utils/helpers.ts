import { Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../fixtures/game-data';

// 等待 Socket 连接成功
export async function waitForSocketConnected(page: Page): Promise<void> {
  // 等待连接状态指示器变为绿色（已连接）
  await page.waitForSelector('text=已连接到服务器', { timeout: TIMEOUTS.SOCKET_CONNECT });
  // 额外等待确保 Socket.io 完全初始化
  await page.waitForTimeout(500);
}

// 创建房间并返回房间号
export async function createRoom(page: Page, playerName: string): Promise<string> {
  // 等待 Socket 连接
  await waitForSocketConnected(page);

  // 填写玩家名称
  await page.fill('#playerName', playerName);

  // 点击创建房间按钮（第一个提交按钮）
  await page.locator('button[type="submit"]').first().click();

  // 等待跳转到房间页面
  await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: TIMEOUTS.ROOM_CREATE });

  // 提取房间号
  const url = page.url();
  const roomId = url.split('/').pop() || '';

  expect(roomId).toMatch(/^[A-Z0-9]{6}$/);

  console.log(`✅ Room created: ${roomId} by ${playerName}`);

  return roomId;
}

// 加入房间
export async function joinRoom(page: Page, roomId: string, playerName: string): Promise<void> {
  // 等待 Socket 连接
  await waitForSocketConnected(page);

  // 填写玩家名称
  await page.fill('#playerName', playerName);

  // 填写房间号
  await page.fill('#roomId', roomId);

  // 点击加入房间
  await page.click('button:has-text("加入房间")');

  // 等待跳转到房间页面
  await page.waitForURL(`\/room\/${roomId}`, { timeout: TIMEOUTS.JOIN_ROOM });

  // 验证玩家名称显示
  await expect(page.locator('text=您')).toContain(playerName);

  console.log(`✅ ${playerName} joined room ${roomId}`);
}

// 设置准备状态
export async function setReady(page: Page): Promise<void> {
  await page.click('button:has-text("准备")');

  // 等待按钮状态变化
  await page.waitForTimeout(1000);

  console.log('✅ Player ready');
}

// 截图保存
export async function saveScreenshot(page: Page, name: string): Promise<string> {
  const path = `tests/e2e/screenshots/${name}`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}`);
  return path;
}

// 验证页面文本
export async function expectText(page: Page, text: string): Promise<void> {
  await expect(page.locator('body')).toContainText(text);
}

// 等待控制台日志
export async function waitForConsoleLog(page: Page, message: string): Promise<void> {
  await page.waitForFunction(
    () => {
      const logs = page.evaluate(() => {
        return (window as any).consoleLogs || [];
      });
      return logs.some((log: string) => log.includes(message));
    },
    { timeout: 5000 }
  );
}
