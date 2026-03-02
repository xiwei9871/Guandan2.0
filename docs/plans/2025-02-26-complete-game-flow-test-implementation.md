# 完整对局流程测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现一个完整的掼蛋游戏对局E2E测试，从发牌到有玩家出完所有牌，验证核心游戏流程和牌型规则。

**Architecture:**
- CardSelector: 分析手牌并选择合法的出牌（支持单张、对子、三张、炸弹、顺子）
- CardPlayBot: 封装出牌操作，处理页面交互
- 游戏循环: 轮流控制4个玩家，决策出牌/过牌，检测游戏结束

**Tech Stack:**
- Playwright (E2E测试框架)
- TypeScript
- Socket.io (获取游戏状态)

---

## Task 1: 创建 CardSelector 工具类

**Files:**
- Create: `tests/utils/cardSelector.ts`

**Step 1: 创建基础结构和类型导入**

```typescript
// tests/utils/cardSelector.ts
import { Card, CardType, type Play } from '../../lib/types';
import { detectCardType } from '../../lib/game/cardChecker';

export interface CardPlayOption {
  type: CardType;
  cards: Card[];
  mainRank: number;
  description: string;
}
```

**Step 2: 实现按rank分组手牌的辅助函数**

```typescript
function groupCardsByRank(cards: Card[]): Map<number, Card[]> {
  const rankMap = new Map<number, Card[]>();
  for (const card of cards) {
    if (!rankMap.has(card.rank)) {
      rankMap.set(card.rank, []);
    }
    rankMap.get(card.rank)!.push(card);
  }
  return rankMap;
}

function findSuitsWithCount(cards: Card[], rank: number, count: number): Card[] {
  return cards.filter(c => c.rank === rank).slice(0, count);
}
```

**Step 3: 实现获取所有可能的单张出牌**

```typescript
function getSinglePlays(cards: Card[]): CardPlayOption[] {
  return cards.map(card => ({
    type: CardType.SINGLE,
    cards: [card],
    mainRank: card.rank,
    description: `单张 ${card.rank}`
  }));
}
```

**Step 4: 实现获取所有可能的对子**

```typescript
function getPairPlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of rankMap) {
    if (cards.length >= 2) {
      plays.push({
        type: CardType.PAIR,
        cards: cards.slice(0, 2),
        mainRank: rank,
        description: `对子 ${rank}`
      });
    }
  }
  return plays;
}
```

**Step 5: 实现获取所有可能的三张**

```typescript
function getTriplePlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of rankMap) {
    if (cards.length >= 3) {
      plays.push({
        type: CardType.TRIPLE,
        cards: cards.slice(0, 3),
        mainRank: rank,
        description: `三张 ${rank}`
      });
    }
  }
  return plays;
}
```

**Step 6: 实现获取所有可能的炸弹**

```typescript
function getBombPlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of rankMap) {
    if (cards.length >= 4) {
      plays.push({
        type: CardType.BOMB,
        cards: cards.slice(0, 4),
        mainRank: rank,
        description: `炸弹 ${rank}`
      });
    }
  }
  return plays;
}
```

**Step 7: 实现获取所有可能的顺子**

```typescript
function getStraightPlays(cards: Card[]): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  const rankMap = groupCardsByRank(cards);
  const sortedRanks = Array.from(rankMap.keys())
    .filter(r => r <= 13) // 不能包含2和王
    .sort((a, b) => a - b);

  // 查找连续的rank序列
  for (let start = 0; start < sortedRanks.length; start++) {
    for (let length = 5; length <= sortedRanks.length - start; length++) {
      const sequence = sortedRanks.slice(start, start + length);
      if (isConsecutive(sequence)) {
        const straightCards: Card[] = [];
        for (const rank of sequence) {
          straightCards.push(rankMap.get(rank)![0]); // 取每种rank的一张
        }
        plays.push({
          type: CardType.STRAIGHT,
          cards: straightCards,
          mainRank: sequence[sequence.length - 1],
          description: `顺子 ${sequence[0]}-${sequence[sequence.length - 1]}`
        });
      }
    }
  }
  return plays;
}

function isConsecutive(ranks: number[]): boolean {
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i-1] !== 1) {
      return false;
    }
  }
  return true;
}
```

**Step 8: 实现获取所有可能出牌的主函数**

```typescript
export function getAllPossiblePlays(hand: Card[]): CardPlayOption[] {
  const rankMap = groupCardsByRank(hand);
  const plays: CardPlayOption[] = [];

  // 添加各种牌型
  plays.push(...getSinglePlays(hand));
  plays.push(...getPairPlays(rankMap));
  plays.push(...getTriplePlays(rankMap));
  plays.push(...getBombPlays(rankMap));
  plays.push(...getStraightPlays(hand));

  return plays;
}
```

**Step 9: 实现过滤合法出牌的函数**

```typescript
export function getValidPlays(
  hand: Card[],
  lastPlay: { type: CardType; mainRank: number; cards: Card[] } | null,
  currentLevel: number
): CardPlayOption[] {
  const allPlays = getAllPossiblePlays(hand);

  // 如果是首出（没有上家出牌），所有牌都合法
  if (!lastPlay) {
    return allPlays;
  }

  // 过滤能打过上家的牌
  return allPlays.filter(play => {
    const detection = detectCardType(play.cards);

    if (!detection.valid) {
      return false;
    }

    // 炸弹可以打任何非炸弹
    if (play.type === CardType.BOMB && lastPlay.type !== CardType.BOMB) {
      return true;
    }

    // 必须是同类型且rank更大
    if (play.type === lastPlay.type && play.cards.length === lastPlay.cards.length) {
      return play.mainRank > lastPlay.mainRank;
    }

    return false;
  });
}
```

**Step 10: 实现随机选择出牌的函数**

```typescript
export function selectRandomPlay(validPlays: CardPlayOption[]): CardPlayOption | null {
  if (validPlays.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * validPlays.length);
  return validPlays[randomIndex];
}
```

**Step 11: 实现决定是否过牌的函数**

```typescript
export function shouldPass(validPlays: CardPlayOption[], isFirstPlay: boolean): boolean {
  // 如果没有合法出牌，必须过牌
  if (validPlays.length === 0) {
    return true;
  }

  // 如果是首出，不能过牌
  if (isFirstPlay) {
    return false;
  }

  // 30%概率主动过牌
  return Math.random() < 0.3;
}
```

**Step 12: 运行测试确保没有类型错误**

Run: `npx tsc --noEmit tests/utils/cardSelector.ts`
Expected: 无错误

**Step 13: 提交**

```bash
git add tests/utils/cardSelector.ts
git commit -m "feat: add CardSelector utility for intelligent card play selection"
```

---

## Task 2: 创建 CardPlayBot 机器人

**Files:**
- Create: `tests/utils/cardPlayBot.ts`

**Step 1: 创建基础结构和导入**

```typescript
// tests/utils/cardPlayBot.ts
import { Page } from '@playwright/test';
import { Card } from '../../lib/types';
import * as cardSelector from './cardSelector';

export class CardPlayBot {
  constructor(private page: Page, private playerName: string) {}
}
```

**Step 2: 实现从页面获取当前手牌的函数**

```typescript
async getCurrentHand(): Promise<Card[]> {
  const cards = await this.page.evaluate(() => {
    const cardButtons = document.querySelectorAll('button[class*="border-2"]');
    const cards: any[] = [];

    cardButtons.forEach((btn, index) => {
      // 从按钮文本中提取牌的信息
      const text = btn.textContent || '';
      const suitMatch = text.match(/[♠♥♣♦]/);
      const rankMatch = text.match(/(\d+|J|Q|K|A)/);

      if (suitMatch && rankMatch) {
        const suitMap: Record<string, string> = {
          '♠': 'spades',
          '♥': 'hearts',
          '♣': 'clubs',
          '♦': 'diamonds'
        };

        const rankMap: Record<string, number> = {
          'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };

        cards.push({
          id: `card-${index}`,
          suit: suitMap[suitMatch[0]],
          rank: rankMap[rankMatch[0]] || parseInt(rankMatch[0]),
          levelCard: btn.textContent?.includes('级') || false,
          isWildcard: btn.textContent?.includes('配') || false
        });
      }
    });

    return cards;
  });

  return cards;
}
```

**Step 3: 实现获取当前游戏状态的函数**

```typescript
async getGameState(): Promise<{
  currentTurn: number;
  lastPlay: any;
  isMyTurn: boolean;
}> {
  const state = await this.page.evaluate(() => {
    const bodyText = document.body.innerText;

    // 检查是否是当前玩家的回合
    const isMyTurn = bodyText.includes('轮到你出牌');

    // 尝试获取上家出牌信息
    const lastPlayElement = document.querySelector('[class*="last-play"]');
    let lastPlay = null;
    if (lastPlayElement) {
      const text = lastPlayElement.textContent || '';
      const cardCount = text.match(/(\d+)\s*张牌/);
      if (cardCount) {
        lastPlay = {
          cardsCount: parseInt(cardCount[1]),
          // 这里可以扩展更多细节
        };
      }
    }

    return {
      isMyTurn,
      lastPlay
    };
  });

  return {
    currentTurn: 0, // 简化处理
    lastPlay: state.lastPlay,
    isMyTurn: state.isMyTurn
  };
}
```

**Step 4: 实现选择并打出指定牌的函数**

```typescript
async playCards(cards: Card[]): Promise<boolean> {
  try {
    // 先清除已选择的牌
    const selectedCards = await this.page.locator('button.border-blue-500').count();
    if (selectedCards > 0) {
      const clearButton = this.page.locator('button:has-text("清除")');
      if (await clearButton.count() > 0) {
        await clearButton.click();
      }
    }

    // 选择要出的牌（通过rank和suit匹配）
    for (const card of cards) {
      const suitSymbol = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' }[card.suit];
      const rankDisplay = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[card.rank] || card.rank;

      // 查找包含对应花色和rank的按钮
      const cardButton = this.page.locator('button', { hasText: suitSymbol }).filter({ hasText: String(rankDisplay) }).first();

      if (await cardButton.count() > 0) {
        await cardButton.click();
        await this.page.waitForTimeout(100); // 短暂等待确保选择生效
      }
    }

    // 点击出牌按钮
    const playButton = this.page.locator('button:has-text("出牌")');
    await playButton.click();

    await this.page.waitForTimeout(1000); // 等待服务器响应
    return true;
  } catch (error) {
    console.error(`${this.playerName} 出牌失败:`, error);
    return false;
  }
}
```

**Step 5: 实现过牌的函数**

```typescript
async passTurn(): Promise<boolean> {
  try {
    const passButton = this.page.locator('button:has-text("不要")');
    if (await passButton.count() > 0) {
      await passButton.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`${this.playerName} 过牌失败:`, error);
    return false;
  }
}
```

**Step 6: 实现智能决策并执行出牌的主函数**

```typescript
async makePlayDecision(currentLevel: number = 2): Promise<{ played: boolean; passed: boolean; error?: string }> {
  try {
    // 检查是否是自己的回合
    const gameState = await this.getGameState();

    if (!gameState.isMyTurn) {
      return { played: false, passed: false };
    }

    // 获取当前手牌
    const hand = await this.getCurrentHand();

    // 获取合法出牌
    const validPlays = cardSelector.getValidPlays(hand, gameState.lastPlay, currentLevel);

    // 决定是否过牌
    const isFirstPlay = !gameState.lastPlay;
    if (cardSelector.shouldPass(validPlays, isFirstPlay)) {
      const success = await this.passTurn();
      console.log(`${this.playerName} 选择过牌`);
      return { played: false, passed: success };
    }

    // 选择并执行出牌
    const selectedPlay = cardSelector.selectRandomPlay(validPlays);
    if (selectedPlay) {
      const success = await this.playCards(selectedPlay.cards);
      console.log(`${this.playerName} 出牌: ${selectedPlay.description}`);
      return { played: success, passed: false };
    }

    return { played: false, passed: false, error: '没有找到合法出牌' };
  } catch (error) {
    return { played: false, passed: false, error: String(error) };
  }
}
```

**Step 7: 运行测试确保没有类型错误**

Run: `npx tsc --noEmit tests/utils/cardPlayBot.ts`
Expected: 无错误

**Step 8: 提交**

```bash
git add tests/utils/cardPlayBot.ts
git commit -m "feat: add CardPlayBot for automated card play"
```

---

## Task 3: 创建完整游戏流程测试

**Files:**
- Create: `tests/e2e/complete-game-flow.spec.ts`

**Step 1: 创建测试文件基础结构**

```typescript
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
});
```

**Step 2: 实现初始化阶段的测试代码**

```typescript
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
```

**Step 3: 实现游戏循环逻辑**

```typescript
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
```

**Step 4: 实现辅助函数获取手牌数量**

```typescript
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
```

**Step 5: 实现游戏结束验证**

```typescript
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
```

**Step 6: 完成测试文件结构**

```typescript
});
```

**Step 7: 运行测试验证（先用较短轮数测试）**

Run: `npx playwright test tests/e2e/complete-game-flow.spec.ts --reporter=list`

注意: 首次运行可能需要调整maxRounds以控制测试时间。

**Step 8: 提交**

```bash
git add tests/e2e/complete-game-flow.spec.ts
git commit -m "feat: add complete game flow E2E test"
```

---

## Task 4: 优化和调试

**Files:**
- Modify: `tests/e2e/complete-game-flow.spec.ts`
- Modify: `tests/utils/cardPlayBot.ts`

**Step 1: 添加更详细的日志输出**

在 `cardPlayBot.ts` 的 `makePlayDecision` 函数中添加：

```typescript
console.log(`${this.playerName} 手牌数量: ${hand.length}, 合法出牌数: ${validPlays.length}`);
```

**Step 2: 添加错误处理和重试机制**

在 `complete-game-flow.spec.ts` 中添加：

```typescript
// 如果玩家连续5轮无法出牌，强制跳过
let stuckCount = 0;
// 在循环中检查stuckCount，如果>5则break
```

**Step 3: 优化等待时间**

调整各个 `waitForTimeout` 的时间，在保证稳定性的前提下提高测试速度。

**Step 4: 添加超时保护**

```typescript
test.setTimeout(300000); // 5分钟超时
```

**Step 5: 运行完整测试验证**

Run: `npx playwright test tests/e2e/complete-game-flow.spec.ts --reporter=list --headed`

**Step 6: 提交优化**

```bash
git add tests/e2e/complete-game-flow.spec.ts tests/utils/cardPlayBot.ts
git commit -m "refactor: optimize complete game flow test with better error handling"
```

---

## Task 5: 添加测试文档

**Files:**
- Create: `tests/e2e/README.md`

**Step 1: 创建测试文档**

```markdown
# E2E 测试文档

## 测试文件说明

### 完整游戏流程测试
**文件**: `complete-game-flow.spec.ts`

**测试内容**:
- 从创建房间到有玩家出完所有牌的完整对局
- 验证核心牌型: 单张、对子、三张、炸弹、顺子
- 验证过牌功能
- 验证多玩家轮流出牌机制

**运行方式**:
```bash
# 确保服务器运行
node server.js &

# 运行测试
npx playwright test tests/e2e/complete-game-flow.spec.ts --reporter=list

# 查看测试过程
npx playwright test tests/e2e/complete-game-flow.spec.ts --reporter=list --headed
```

**预期结果**:
- 测试会在30-200轮之间结束
- 显示最终排名
- 输出游戏统计信息

## 工具类说明

### CardSelector
**文件**: `tests/utils/cardSelector.ts`

智能出牌选择器，分析手牌并选择合法出牌。

**主要函数**:
- `getAllPossiblePlays(hand)`: 获取所有可能的出牌组合
- `getValidPlays(hand, lastPlay, currentLevel)`: 获取能打过上一手牌的合法出牌
- `selectRandomPlay(validPlays)`: 随机选择一个出牌
- `shouldPass(validPlays, isFirstPlay)`: 决定是否过牌

### CardPlayBot
**文件**: `tests/utils/cardPlayBot.ts`

出牌机器人，封装页面交互操作。

**主要方法**:
- `getCurrentHand()`: 从页面获取当前手牌
- `getGameState()`: 获取游戏状态
- `playCards(cards)`: 选择并打出指定的牌
- `passTurn()`: 过牌
- `makePlayDecision(currentLevel)`: 智能决策并执行出牌

## 截图保存

测试过程中的截图会保存在 `tests/e2e/screenshots/` 目录:

- `complete-game-start.png`: 游戏开始时
- `complete-game-end.png`: 游戏结束时

## 故障排查

### 测试卡住不动
- 检查服务器是否正常运行
- 查看浏览器窗口中的实际状态
- 检查网络连接

### 出牌失败
- 检查牌型检测逻辑是否正确
- 确认手牌数据解析是否正确
- 查看控制台错误信息

### 游戏不结束
- 调整 `maxRounds` 参数
- 检查手牌数量检测逻辑
- 查看是否有玩家无法出牌
```

**Step 2: 提交文档**

```bash
git add tests/e2e/README.md
git commit -m "docs: add E2E test documentation"
```

---

## 完成检查清单

运行以下命令验证实现：

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 运行完整游戏流程测试
npx playwright test tests/e2e/complete-game-flow.spec.ts --reporter=list

# 3. 检查截图是否生成
ls tests/e2e/screenshots/complete-game-*.png

# 4. 查看测试报告
npx playwright show-report
```

**预期结果**:
- ✅ 所有测试通过
- ✅ 游戏能正常进行到有玩家出完牌
- ✅ 截图正确生成
- ✅ 统计信息正确输出
