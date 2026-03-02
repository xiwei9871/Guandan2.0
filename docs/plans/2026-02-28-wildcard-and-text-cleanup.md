# Wildcard And Text Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让红桃级牌作为逢人配支持所有合法掼蛋牌型，并清理当前代码中的乱码文案与错误提示。

**Architecture:** 保持现有运行时规则入口 `lib/game/cardChecker.runtime.js` 不变，在该文件内重构为“带万能牌分配”的统一判型/比较逻辑。乱码清理优先覆盖当前运行路径 `server.js`、`components/*`、`lib/constants.ts` 和仍可能被引用的 socket/server 实现，确保 UI 和服务端错误文本一致为正常中文。

**Tech Stack:** Next.js, Socket.IO, Jest, plain JavaScript runtime helpers, TypeScript React components

---

### Task 1: 扩充逢人配测试矩阵

**Files:**
- Modify: `lib/game/__tests__/cardChecker.test.ts`

**Step 1: Write the failing tests**

- 补红桃级牌参与以下牌型的判型测试：
  - 单牌
  - 对子
  - 三张
  - 三带二
  - 顺子
  - 三连对
  - 钢板
  - 同花顺
- 补万能牌参与压牌比较测试：
  - 万能牌组成的同型牌可与自然牌比较
  - 接近边界的顺子 / 同花顺依然合法
  - 四王不允许被万能牌凑出

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/game/__tests__/cardChecker.test.ts --runInBand`

**Step 3: Write minimal implementation**

- 在 `lib/game/cardChecker.runtime.js` 中引入统一的万能牌分配逻辑
- 让所有合法牌型先尝试自然牌识别，再尝试万能牌填充识别

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/game/__tests__/cardChecker.test.ts --runInBand`

### Task 2: 校准压牌与牌型大小比较

**Files:**
- Modify: `lib/game/cardChecker.runtime.js`
- Modify: `lib/game/cardChecker.ts`

**Step 1: Write the failing tests**

- 如果 Task 1 暴露比较错误，在同一测试文件继续补：
  - 万能牌顺子/三连对/钢板之间的比较
  - 万能牌同花顺与炸弹/同花顺的比较

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/game/__tests__/cardChecker.test.ts --runInBand`

**Step 3: Write minimal implementation**

- 统一输出稳定的 `type/mainRank/cards.length`
- 比较时沿用现有特殊牌层级，只替换判型来源

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/game/__tests__/cardChecker.test.ts --runInBand`

### Task 3: 清理乱码文案

**Files:**
- Modify: `server.js`
- Modify: `components/GameRoom.tsx`
- Modify: `components/HomePage.tsx`
- Modify: `components/game/*.tsx`
- Modify: `lib/constants.ts`
- Modify: `lib/socket/server.ts`

**Step 1: Write the failing tests**

- 先在现有页面/摘要测试中补至少一条明确中文断言，覆盖：
  - 连接状态
  - 结算按钮
  - 常见错误提示

**Step 2: Run test to verify it fails**

Run: `npm test -- components/__tests__/GameRoom.test.ts lib/ui/__tests__/settlementSummary.test.ts --runInBand`

**Step 3: Write minimal implementation**

- 逐文件替换乱码中文文本
- 保证服务端 callback/error 文案和前端按钮文案一致
- 清理注释中的乱码，避免后续误读

**Step 4: Run test to verify it passes**

Run: `npm test -- components/__tests__/GameRoom.test.ts lib/ui/__tests__/settlementSummary.test.ts --runInBand`

### Task 4: 全量验证

**Files:**
- Modify: `server.js`
- Modify: `lib/game/cardChecker.runtime.js`
- Modify: `components/*`

**Step 1: Run focused tests**

Run: `npm test -- components/__tests__/GameRoom.test.ts lib/game/__tests__/cardChecker.test.ts lib/game/__tests__/roundRules.test.ts lib/game/__tests__/serverRoundState.test.ts lib/ui/__tests__/settlementSummary.test.ts lib/ui/__tests__/navigationRules.test.ts --runInBand`

**Step 2: Run build**

Run: `npm run build`

**Step 3: Run syntax check**

Run: `node --check server.js`

**Step 4: Restart local server**

Run the existing local restart command for `server.js` and confirm `http://localhost:3003/` returns `200`.
