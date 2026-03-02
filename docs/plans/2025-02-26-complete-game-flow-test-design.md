# 完整对局流程测试设计文档

**日期**: 2025-02-26
**类型**: E2E测试设计
**状态**: 已批准

## 概述

设计一个完整的掼蛋游戏对局测试，从发牌到有玩家出完所有牌，验证核心游戏流程和牌型规则。

## 测试目标

1. 验证完整的游戏流程（发牌 → 出牌 → 结算）
2. 测试核心牌型：单张、对子、三张、炸弹、顺子
3. 验证过牌（不要）功能
4. 验证多玩家轮流出牌机制
5. 验证游戏结束检测

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│          CompleteGameFlow Test                          │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐               │
│  │  CardPlayBot │ ────▶│ CardSelector │               │
│  │  (测试驱动)   │      │  (智能选择)   │               │
│  └──────────────┘      └──────────────┘               │
│         │                       │                        │
│         ▼                       ▼                        │
│  ┌──────────────────────────────────────┐              │
│  │      Game Loop Controller            │              │
│  │  - 轮换4个玩家页面                      │              │
│  │  - 检测当前轮次                        │              │
│  │  - 决定出牌/过牌                       │              │
│  │  - 检测游戏结束                        │              │
│  └──────────────────────────────────────┘              │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────┐              │
│  │         Playwright Browser           │              │
│  └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. CardSelector (智能出牌选择器)

**职责**: 分析手牌并选择合法的出牌

**方法**:
- `getAllPossiblePlays(hand: Card[])`: 扫描手牌，生成所有可能的牌型组合
- `getValidPlays(hand: Card[], lastPlay: Play | null)`: 根据上家出牌，筛选能打过的牌
- `selectRandomPlay(validPlays: Play[])`: 随机选择一个合法出牌
- `shouldPass(validPlays: Play[]): boolean`: 决定是否过牌（30%概率）

**支持的牌型**:
- 单张: 任意一张牌
- 对子: 两张相同rank的牌
- 三张: 三张相同rank的牌
- 炸弹: 四张相同rank的牌
- 顺子: 5张以上连续的牌

### 2. CardPlayBot (出牌机器人)

**职责**: 封装出牌操作，处理页面交互

**方法**:
- `playCards(page: Page, cards: Card[])`: 选择并打出指定的牌
- `passTurn(page: Page)`: 点击过牌按钮
- `getCurrentHand(page: Page)`: 从页面获取当前手牌
- `getLastPlay(page: Page)`: 获取上家出牌信息

### 3. 游戏循环控制器

**流程**:
```typescript
while (游戏未结束) {
  for (每个玩家) {
    if (是当前玩家轮次) {
      获取手牌数据
      获取上家出牌
      找出所有合法出牌
      决定：出牌 or 过牌
      执行操作
      等待状态更新
      检查手牌是否为0（游戏结束）
    }
  }
}
```

## 测试流程

### 阶段1: 初始化 (setup)

1. 创建4个浏览器上下文
2. 玩家1创建房间
3. 玩家2、3、4依次加入房间
4. 所有玩家点击准备
5. 点击开始游戏
6. 等待发牌完成

### 阶段2: 游戏循环 (game loop)

```
每轮处理:
  ├─ 检测当前轮到哪个玩家
  ├─ 获取该玩家的手牌
  ├─ 获取上家出牌（如果有）
  ├─ CardSelector 分析合法出牌
  ├─ 决策: 出牌(70%) or 过牌(30%)
  ├─ 执行操作
  ├─ 等待服务器响应
  └─ 检查游戏是否结束
```

### 阶段3: 结束验证 (verification)

1. 检测到有玩家手牌=0
2. 验证游戏状态为finished
3. 记录玩家排名
4. 输出统计信息

## 技术实现

### 获取手牌数据

```typescript
async function getCurrentHand(page: Page): Promise<Card[]> {
  return await page.evaluate(() => {
    // 从DOM中提取手牌信息
    const cardElements = document.querySelectorAll('[data-card-id]');
    const cards: Card[] = [];

    cardElements.forEach(el => {
      const cardId = el.getAttribute('data-card-id');
      const suit = el.getAttribute('data-suit');
      const rank = parseInt(el.getAttribute('data-rank') || '0');
      const levelCard = el.getAttribute('data-level-card') === 'true';
      const isWildcard = el.getAttribute('data-wildcard') === 'true';

      cards.push({ id: cardId!, suit: suit as Suit, rank, levelCard, isWildcard });
    });

    return cards;
  });
}
```

### 牌型组合生成

```typescript
function getAllPossiblePlays(hand: Card[]): Play[] {
  const plays: Play[] = [];
  const rankMap = groupByRank(hand);

  // 单张
  hand.forEach(card => {
    plays.push({ type: CardType.SINGLE, cards: [card], mainRank: card.rank });
  });

  // 对子
  rankMap.forEach((cards, rank) => {
    if (cards.length >= 2) {
      plays.push({ type: CardType.PAIR, cards: cards.slice(0, 2), mainRank: rank });
    }
  });

  // 三张
  rankMap.forEach((cards, rank) => {
    if (cards.length >= 3) {
      plays.push({ type: CardType.TRIPLE, cards: cards.slice(0, 3), mainRank: rank });
    }
  });

  // 炸弹
  rankMap.forEach((cards, rank) => {
    if (cards.length >= 4) {
      plays.push({ type: CardType.BOMB, cards: cards.slice(0, 4), mainRank: rank });
    }
  });

  // 顺子
  const straights = findStraights(hand);
  plays.push(...straights);

  return plays;
}
```

### 过牌策略

```typescript
function shouldPass(validPlays: Play[]): boolean {
  // 如果没有合法出牌，必须过牌
  if (validPlays.length === 0) {
    return true;
  }

  // 如果是首出（上家没人出牌），不能过牌
  // 这里需要在调用处判断

  // 30%概率主动过牌，测试过牌功能
  return Math.random() < 0.3;
}
```

### 游戏结束检测

```typescript
async function isGameEnded(pages: Page[]): Promise<boolean> {
  for (const page of pages) {
    const handCount = await page.evaluate(() => {
      const handText = document.querySelector('h3:has-text("手牌")')?.textContent;
      const match = handText?.match(/手牌 \((\d+)\)/);
      return match ? parseInt(match[1]) : 27;
    });

    if (handCount === 0) {
      return true;
    }
  }
  return false;
}
```

## 预期输出

```
完整对局测试
═══════════════════════════════════

✅ 游戏初始化完成
   房间ID: ABC123
   玩家: 张三, 李四, 王五, 赵六

✅ 游戏循环开始
   第1轮: 张三出单张 5
   第2轮: 李四过牌
   第3轮: 王五出单张 8
   第4轮: 赵六出单张 K
   ...

✅ 游戏结束
   头游: 张三
   二游: 王五
   三游: 李四
   末游: 赵六

📊 游戏统计:
   - 总轮数: 45轮
   - 总出牌次数: 156次
   - 过牌次数: 24次
   - 测试牌型: 单张✓ 对子✓ 三张✓ 炸弹✓ 顺子✓
```

## 文件结构

```
tests/
├── e2e/
│   ├── complete-game-flow.spec.ts    # 主测试文件
│   └── screenshots/                   # 截图目录
├── utils/
│   ├── helpers.ts                     # 现有辅助函数
│   ├── cardSelector.ts                # 新增: 智能出牌选择器
│   └── cardPlayBot.ts                 # 新增: 出牌机器人
└── fixtures/
    └── game-data.ts                   # 现有测试数据
```

## 风险与限制

### 风险

1. **随机性**: 发牌随机导致测试不稳定
   - 缓解: 多次运行取平均

2. **时间**: 完整对局可能需要较长时间
   - 缓解: 设置合理的超时时间

3. **浏览器资源**: 4个并发页面可能消耗资源
   - 缓解: 使用headless模式

### 限制

1. 不测试所有牌型（只测试核心5种）
2. 不测试逢人配功能
3. 不测试进贡阶段
4. AI策略较简单（随机选择）

## 后续改进

1. 添加更智能的AI策略
2. 测试所有牌型
3. 测试进贡阶段
4. 测试网络重连场景
5. 性能测试（大量并发游戏）

## 参考资料

- `lib/game/cardChecker.ts` - 牌型检测逻辑
- `docs/rules.md` - 掼蛋游戏规则
- `components/game/HandCards.tsx` - 手牌UI组件
