import { test, expect, Browser } from '@playwright/test';
import { PLAYERS } from '../fixtures/game-data';
import {
  createRoom,
  joinRoom,
  setReady,
} from '../utils/helpers';

test.describe('出牌功能交互测试', () => {
  let browser: Browser;
  let roomId: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    try {
      const response = await fetch('http://localhost:3003');
      expect(response.ok).toBeTruthy();
    } catch (error) {
      throw new Error('Server is not running');
    }
  });

  test('完整出牌流程: 选牌 → 出牌 → 验证', async () => {
    console.log('\n=== 创建房间和加入玩家 ===');

    const contexts = [];
    const pages = [];

    // 创建者
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto('http://localhost:3003');
    roomId = await createRoom(page1, PLAYERS[0].name);
    contexts.push(ctx1);
    pages.push(page1);

    // 加入其他玩家
    for (let i = 1; i < 4; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto('http://localhost:3003');
      await joinRoom(page, roomId, PLAYERS[i].name);
      contexts.push(ctx);
      pages.push(page);
    }

    await page1.waitForTimeout(2000);

    // 所有玩家准备
    console.log('\n=== 所有玩家准备 ===');
    for (const page of pages) {
      await setReady(page);
    }

    await page1.waitForTimeout(2000);

    // 点击开始游戏
    console.log('\n=== 开始游戏 ===');
    await page1.waitForSelector('button:has-text("开始游戏")', { timeout: 5000 });
    await page1.click('button:has-text("开始游戏")');

    // 等待发牌完成
    await page1.waitForTimeout(5000);

    // 验证手牌显示
    console.log('\n=== 验证手牌显示 ===');

    // 检查手牌区域是否存在
    const handRegionExists = await page1.locator('text=手牌').count() > 0;
    console.log('手牌区域存在:', handRegionExists);
    expect(handRegionExists).toBeTruthy();

    // 检查手牌数量 - 使用更精确的选择器
    const handHeader = page1.locator('h3:has-text("手牌")');
    const handCountText = await handHeader.textContent();
    console.log('手牌数量文本:', handCountText);
    expect(handCountText).toContain('27');

    // 检查是否有卡片按钮
    const cardButtons = await page1.locator('button[class*="border"]').count();
    console.log('卡片按钮数量:', cardButtons);
    expect(cardButtons).toBeGreaterThan(20); // 至少应该有20+张牌

    // 检查出牌按钮是否存在
    const playButtonExists = await page1.locator('button:has-text("出牌")').count() > 0;
    console.log('出牌按钮存在:', playButtonExists);
    expect(playButtonExists).toBeTruthy();

    // 检查"不要"按钮是否存在
    const passButtonExists = await page1.locator('button:has-text("不要")').count() > 0;
    console.log('不要按钮存在:', passButtonExists);
    expect(passButtonExists).toBeTruthy();

    // 交互测试: 选择一张牌
    console.log('\n=== 测试选牌功能 ===');

    // 找到第一张牌并点击
    const firstCard = page1.locator('button[class*="border"]').first();
    await firstCard.click();

    // 等待选择状态更新
    await page1.waitForTimeout(500);

    // 验证选择指示器（选中时按钮应该有蓝色边框和向上位移）
    const selectedCard = page1.locator('button.border-blue-500');
    const selectedCount = await selectedCard.count();
    console.log('已选中的卡片数量:', selectedCount);
    expect(selectedCount).toBeGreaterThan(0);

    // 检查出牌按钮文本是否更新（应该显示选中的牌数）
    const playButtonText = await page1.locator('button:has-text("出牌")').first().textContent();
    console.log('出牌按钮文本:', playButtonText);
    expect(playButtonText).not.toContain('(0)'); // 应该不再是0张牌

    // 交互测试: 点击出牌
    console.log('\n=== 测试出牌功能 ===');

    // 点击出牌按钮
    await page1.click('button:has-text("出牌")');

    // 等待服务器处理
    await page1.waitForTimeout(2000);

    // 验证手牌数量减少
    const newHandHeader = page1.locator('h3:has-text("手牌")');
    const newHandCountText = await newHandHeader.textContent();
    console.log('出牌后手牌数量:', newHandCountText);
    // 手牌数量应该从27减少
    expect(newHandCountText).not.toContain('(27)');

    // 截图保存
    await page1.screenshot({ path: 'tests/e2e/screenshots/07-after-play.png', fullPage: true });
    console.log('📸 截图保存: 07-after-play.png');

    // 清理
    console.log('\n=== 清理测试环境 ===');
    for (const ctx of contexts) {
      await ctx.close();
    }

    console.log('\n✅ 出牌功能测试完成!');
  });
});
