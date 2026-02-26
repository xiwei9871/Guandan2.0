# E2E 测试文档

## 测试文件概览

| 文件名 | 测试目的 | 主要功能 | 状态 |
|--------|---------|---------|------|
| `guanda-full-game.spec.ts` | 完整游戏流程测试 | 从创建房间到游戏结束的完整流程验证 | ✅ 主要测试 |
| `complete-game-flow.spec.ts` | 完整对局测试 | 从发牌到有玩家出完所有牌的智能对局 | ✅ 主要测试 |
| `card-play-interaction.spec.ts` | 出牌功能交互测试 | 验证选牌、出牌、验证的交互流程 | 🔧 调试用 |
| `hand-cards-debug.spec.ts` | 手牌显示调试测试 | 调试手牌数据是否存在及显示问题 | 🔧 调试用 |

## 测试文件详细说明

### 1. 掼蛋完整流程测试
**文件**: `guanda-full-game.spec.ts`

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
npx playwright test tests/e2e/guanda-full-game.spec.ts --reporter=list

# 查看测试过程
npx playwright test tests/e2e/guanda-full-game.spec.ts --reporter=list --headed
```

**预期结果**:
- 测试会在30-200轮之间结束
- 显示最终排名
- 输出游戏统计信息

### 2. 完整对局智能测试
**文件**: `complete-game-flow.spec.ts`

**测试内容**:
- 使用智能机器人(CardPlayBot)进行自动对局
- 从发牌到有玩家出完所有牌的完整流程
- 验证智能出牌决策系统
- 验证牌型检测和合法出牌逻辑

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
- 智能机器人自动完成对局
- 测试在合理时间内结束(5分钟超时)
- 显示最终排名和统计信息

### 3. 出牌功能交互测试
**文件**: `card-play-interaction.spec.ts`

**测试内容**:
- 验证玩家选牌交互
- 验证出牌按钮功能
- 验证出牌合法性检查
- 调试出牌流程中的问题

**运行方式**:
```bash
npx playwright test tests/e2e/card-play-interaction.spec.ts --reporter=list --headed
```

**用途**: 调试出牌相关功能

### 4. 手牌显示调试测试
**文件**: `hand-cards-debug.spec.ts`

**测试内容**:
- 检查游戏开始后手牌数据是否存在
- 验证手牌在页面上的显示
- 调试手牌相关渲染问题

**运行方式**:
```bash
npx playwright test tests/e2e/hand-cards-debug.spec.ts --reporter=list --headed
```

**用途**: 调试手牌显示相关功能

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

### 截图目录
所有测试截图保存在 `tests/e2e/screenshots/` 目录

### 截图命名规范

#### 1. 完整流程测试截图 (`guanda-full-game.spec.ts`)
格式: `{序号}-{阶段名称}.png`

- `01-created.png` - 房间创建完成
- `02-all-joined.png` - 所有玩家加入完成
- `03-all-ready.png` - 所有玩家准备完成
- `04-cards-dealt.png` - 发牌完成
- `05-playing.png` - 游戏进行中
- `06-finished.png` - 游戏结束
- `07-after-play.png` - 出牌后状态

#### 2. 调试截图
格式: `{调试目的}-{描述}.png`

- `debug-hand-cards.png` - 手牌调试截图
- `error-join-{玩家名}.png` - 错误截图(如加入房间失败)

#### 3. 智能对局测试截图 (`complete-game-flow.spec.ts`)
格式: `complete-game-{阶段}.png`

- `complete-game-start.png` - 游戏开始时
- `complete-game-end.png` - 游戏结束时

### 截图查看
```bash
# 查看所有截图
ls tests/e2e/screenshots/

# 在Windows中直接打开
explorer tests\e2e\screenshots\
```

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
