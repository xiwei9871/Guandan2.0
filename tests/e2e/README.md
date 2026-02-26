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
