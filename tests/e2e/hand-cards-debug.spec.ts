import { test, expect, Browser } from '@playwright/test';
import { PLAYERS } from '../fixtures/game-data';
import {
  createRoom,
  joinRoom,
  setReady,
} from '../utils/helpers';

test.describe('手牌显示调试测试', () => {
  let browser: Browser;
  let roomId: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    // 验证服务器运行中
    try {
      const response = await fetch('http://localhost:3003');
      expect(response.ok).toBeTruthy();
      console.log('✅ Server is running');
    } catch (error) {
      throw new Error('Server is not running on http://localhost:3003. Please start it with: node server.js');
    }
  });

  test('调试: 检查游戏开始后手牌数据是否存在', async () => {
    // 创建房间
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto('http://localhost:3003');

    roomId = await createRoom(page1, PLAYERS[0].name);

    // 加入其他玩家
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:3003');
    await joinRoom(page2, roomId, PLAYERS[1].name);

    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();
    await page3.goto('http://localhost:3003');
    await joinRoom(page3, roomId, PLAYERS[2].name);

    const ctx4 = await browser.newContext();
    const page4 = await ctx4.newPage();
    await page4.goto('http://localhost:3003');
    await joinRoom(page4, roomId, PLAYERS[3].name);

    // 等待所有玩家加入
    await page1.waitForTimeout(2000);

    // 所有玩家准备
    await setReady(page1);
    await setReady(page2);
    await setReady(page3);
    await setReady(page4);

    await page1.waitForTimeout(2000);

    // 点击开始游戏
    console.log('\n=== 点击开始游戏 ===');
    await page1.waitForSelector('button:has-text("开始游戏")', { timeout: 5000 });
    await page1.click('button:has-text("开始游戏")');

    // 等待游戏状态更新
    await page1.waitForTimeout(5000);

    // 调试: 注入 JavaScript 检查页面状态
    const debugInfo = await page1.evaluate(() => {
      // 检查 React state 或其他状态
      const bodyText = document.body.innerText;

      // 检查是否有手牌相关的元素
      const handElements = document.querySelectorAll('[class*="hand"]');
      const cardElements = document.querySelectorAll('[class*="card"]');

      return {
        bodyText: bodyText.substring(0, 500),
        hasHandElements: handElements.length > 0,
        handElementCount: handElements.length,
        hasCardElements: cardElements.length > 0,
        cardElementCount: cardElements.length,
        hasHandText: bodyText.includes('手牌'),
        hasPlayingText: bodyText.includes('游戏中'),
        allText: bodyText
      };
    });

    console.log('\n=== 调试信息 ===');
    console.log('是否有"手牌"文本:', debugInfo.hasHandText);
    console.log('是否有"游戏中"文本:', debugInfo.hasPlayingText);
    console.log('手牌元素数量:', debugInfo.handElementCount);
    console.log('卡片元素数量:', debugInfo.cardElementCount);
    console.log('页面文本预览:', debugInfo.bodyText);

    // 检查手牌区域是否存在
    const handCardsExists = await page1.locator('text=手牌').count();
    console.log('手牌区域出现次数:', handCardsExists);

    // 截图
    await page1.screenshot({ path: 'tests/e2e/screenshots/debug-hand-cards.png', fullPage: true });

    // 检查是否有其他玩家
    const playerCount = await page1.locator('text=27').count();
    console.log('显示27张牌的玩家数量:', playerCount);

    // 验证
    expect(debugInfo.hasPlayingText, '游戏应该在"playing"状态').toBeTruthy();
    // expect(debugInfo.hasHandText, '应该显示手牌区域').toBeTruthy();

    // 清理
    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
    await ctx4.close();
  });
});
