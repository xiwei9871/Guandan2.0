// tests/e2e/complete-game-flow.spec.ts
import { test, expect, Browser } from '@playwright/test';
import { PLAYERS } from '../fixtures/game-data';
import {
  createRoom,
  joinRoom,
  setReady,
  saveScreenshot,
} from '../utils/helpers';
import { CardPlayBot } from '../utils/cardPlayBot';

test.describe('完整游戏流程测试', () => {
  let browser: Browser;
  let roomId: string;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    try {
      const response = await fetch('http://localhost:3003');
      expect(response.ok).toBeTruthy();
      console.log('✅ Server is running');
    } catch (error) {
      throw new Error('Server is not running on http://localhost:3003. Please start it with: node server.js');
    }
  });

  test('完整对局: 从发牌到有玩家出完所有牌', async () => {
    console.log('\n=== 完整对局测试开始 ===\n');

    // 阶段1: 初始化
    console.log('=== 阶段1: 初始化游戏 ===');

    const contexts: any[] = [];
    const bots: CardPlayBot[] = [];
    const pages: any[] = [];

    // 创建4个玩家
    for (let i = 0; i < 4; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto('http://localhost:3003');
      contexts.push(ctx);
      pages.push(page);

      if (i === 0) {
        // 第一个玩家创建房间
        roomId = await createRoom(page, PLAYERS[i].name);
        console.log(`✅ ${PLAYERS[i].name} 创建房间: ${roomId}`);
      } else {
        // 其他玩家加入房间
        await joinRoom(page, roomId, PLAYERS[i].name);
        console.log(`✅ ${PLAYERS[i].name} 加入房间`);
      }
    }

    // 等待所有玩家加入完成
    await pages[0].waitForTimeout(2000);

    // 所有玩家准备
    console.log('\n=== 所有玩家准备 ===');
    for (const page of pages) {
      await setReady(page);
    }

    await pages[0].waitForTimeout(2000);

    // 开始游戏
    console.log('\n=== 开始游戏 ===');
    await pages[0].waitForSelector('button:has-text("开始游戏")', { timeout: 5000 });
    await pages[0].click('button:has-text("开始游戏")');
    console.log('✅ 游戏开始');

    // 等待发牌完成
    await pages[0].waitForTimeout(3000);

    // 创建机器人
    for (let i = 0; i < 4; i++) {
      bots.push(new CardPlayBot(pages[i], PLAYERS[i].name));
    }

    await saveScreenshot(pages[0], 'complete-game-start.png');

    // 阶段2: 游戏循环
    console.log('\n=== 阶段2: 游戏循环开始 ===\n');

    let round = 0;
    const maxRounds = 200; // 防止无限循环
    let gameEnded = false;
    const stats = {
      totalRounds: 0,
      playCount: 0,
      passCount: 0,
      winner: null as string | null
    };

    // 辅助函数：获取手牌数量
    async function getHandCount(page: any): Promise<number> {
      try {
        const handText = await page.locator('h3:has-text("手牌")').textContent();
        const match = handText?.match(/手牌 \((\d+)\)/);
        return match ? parseInt(match[1]) : 27;
      } catch {
        return 27;
      }
    }

    while (!gameEnded && round < maxRounds) {
      round++;
      stats.totalRounds = round;

      // 轮流处理每个玩家
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        const bot = bots[playerIndex];

        // 尝试让玩家出牌/过牌
        const result = await bot.makePlayDecision(2); // 2是当前级牌

        if (result.played) {
          stats.playCount++;
          console.log(`第${round}轮: ${PLAYERS[playerIndex].name} 出牌`);
        } else if (result.passed) {
          stats.passCount++;
          console.log(`第${round}轮: ${PLAYERS[playerIndex].name} 过牌`);
        }

        // 检查这个玩家是否出完牌
        const handCount = await getHandCount(pages[playerIndex]);
        if (handCount === 0) {
          gameEnded = true;
          stats.winner = PLAYERS[playerIndex].name;
          console.log(`\n🎉 ${PLAYERS[playerIndex].name} 出完所有牌，游戏结束！`);
          break;
        }

        // 等待其他玩家更新
        await pages[0].waitForTimeout(500);
      }

      if (round % 10 === 0) {
        console.log(`--- 已进行 ${round} 轮 ---`);
      }
    }

    // 阶段3: 结束验证
    console.log('\n=== 阶段3: 游戏结束验证 ===\n');

    // 截图
    await saveScreenshot(pages[0], 'complete-game-end.png');

    // 获取所有玩家的最终手牌数
    const finalHands: any[] = [];
    for (let i = 0; i < 4; i++) {
      const count = await getHandCount(pages[i]);
      finalHands.push({
        name: PLAYERS[i].name,
        cardsRemaining: count
      });
    }

    // 按剩余牌数排序
    finalHands.sort((a, b) => a.cardsRemaining - b.cardsRemaining);

    console.log('\n📊 最终排名:');
    finalHands.forEach((player, index) => {
      const rank = ['头游', '二游', '三游', '末游'][index];
      console.log(`   ${rank}: ${player.name} (${player.cardsRemaining}张牌)`);
    });

    console.log('\n📈 游戏统计:');
    console.log(`   - 总轮数: ${stats.totalRounds}`);
    console.log(`   - 出牌次数: ${stats.playCount}`);
    console.log(`   - 过牌次数: ${stats.passCount}`);

    // 验证游戏结果
    expect(stats.winner).toBeTruthy();
    expect(stats.totalRounds).toBeGreaterThan(0);
    expect(finalHands[0].cardsRemaining).toBe(0);

    // 清理
    console.log('\n=== 清理测试环境 ===');
    for (const ctx of contexts) {
      await ctx.close();
    }

    console.log('\n✅ 完整对局测试完成!');
  });
});
