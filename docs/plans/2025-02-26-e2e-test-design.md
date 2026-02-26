# 掼蛋游戏端到端测试设计文档

**创建日期**: 2025-02-26
**测试目标**: 验证掼蛋游戏完整游戏流程的端到端集成
**测试框架**: Playwright (@playwright/test)

---

## 1. 设计概述

### 1.1 测试目标
使用 Playwright 自动化测试掼蛋游戏的完整游戏流程，从创建房间到游戏结算，验证所有核心功能正常工作，确保 MVP 可用性。

### 1.2 测试范围
- ✅ 房间创建和加入
- ✅ 4人实时联机
- ✅ 准备系统
- ✅ 发牌机制
- ✅ 出牌和牌型判断
- ✅ 游戏结算和升级计算

### 1.3 技术栈
- **测试框架**: `@playwright/test`
- **语言**: TypeScript
- **浏览器**: Chromium
- **架构**: 单浏览器多标签页（4个 Context）

---

## 2. 架构设计

### 2.1 文件结构

```
tests/
├── e2e/
│   ├── guanda-full-game.spec.ts    # 完整游戏流程测试
│   └── screenshots/                   # 截图保存目录
├── fixtures/
│   └── game-data.ts                  # 游戏测试数据
├── utils/
│   └── helpers.ts                     # 测试工具函数
└── playwright.config.ts               # Playwright 配置
```

### 2.2 多玩家模拟策略

使用 Playwright `browser.newContext()` 创建4个独立的浏览器上下文：

| Context | 玩家 | 位置 | 队伍 |
|---------|------|------|------|
| ctx1 | 张三 | 南方 | 红队 |
| ctx2 | 李四 | 西方 | 蓝队 |
| ctx3 | 王五 | 北方 | 红队 |
| ctx4 | 赵六 | 东方 | 蓝队 |

每个上下文独立维护 Cookie、LocalStorage、SessionStorage 和 Socket 连接。

### 2.3 配置说明

```typescript
// playwright.config.ts
export default definePlaywrightConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // 禁用并行，串行运行
  timeout: 60000,  // 60秒超时
  use: {
    screenshot: 'only-on-failure',  // 只在失败时截图
    video: 'retain-on-failure',  // 失败时保留视频
  },
});
```

---

## 3. 测试流程设计

### 3.1 测试阶段流程

```
Phase 1: Setup
├─ 启动服务器验证
└─ 基础配置检查

Phase 2: Room Creation
├─ Context 1 创建房间
├─ 验证房间号生成
└─ 截图: 01-created.png

Phase 3: Join Room
├─ Context 2-4 依次加入
├─ 验证玩家位置和队伍
└─ 截图: 02-all-joined.png

Phase 4: Ready Up
├─ 4个玩家准备
├─ 验证准备状态
└─ 截图: 03-all-ready.png

Phase 5: Game Start
├─ 验证游戏开始
├─ 验证发牌（27张/人）
└─ 截图: 04-cards-dealt.png

Phase 6: Card Play
├─ 简化出牌演示
├─ 验证牌型判断
└─ 截图: 05-playing.png

Phase 7: Game End
├─ 强制结束游戏
├─ 验证结算逻辑
└─ 截图: 06-finished.png
```

### 3.2 关键验证点

| 阶段 | 验证项 | 方法 |
|------|--------|------|
| 连接 | Socket.io 连接成功 | 检查控制台日志 |
| 创建房间 | 房间号格式正确 | 正则匹配 `[A-Z0-9]{6}` |
| 加入房间 | 4个玩家位置正确 | DOM 元素验证 |
| 准备 | 准备状态更新 | 属性检查 |
| 发牌 | 每人27张牌 | 文本匹配 |
| 出牌 | 牌型识别 | 控制台日志验证 |
| 结算 | 升级规则 | 属性检查 |

---

## 4. 测试数据设计

### 4.1 玩家配置

```typescript
export const PLAYERS = [
  { name: '张三', position: 'south', team: 'red' },
  { name: '李四', position: 'west', team: 'blue' },
  { name: '王五', position: 'north', team: 'red' },
  { name: '赵六', position: 'east', team: 'blue' }
];
```

### 4.2 测试牌型（简化版）

```typescript
export const TEST_PLAYS = {
  simple: { type: 'single', rank: 5, count: 1 },
  pair: { type: 'pair', rank: 8, count: 2 },
  triple: { type: 'triple', rank: 10, count: 3 },
  bomb: { type: 'bomb', rank: 2, count: 4 }
};
```

### 4.3 超时配置

```typescript
export const TIMEOUTS = {
  SOCKET_CONNECT: 5000,
  ROOM_CREATE: 3000,
  JOIN_ROOM: 3000,
  GAME_START: 5000,
  CARD_PLAY: 3000,
  GAME_END: 3000
};
```

---

## 5. 工具函数设计

### 5.1 核心 API

```typescript
// Socket 连接等待
async function waitForSocketConnected(page: Page): Promise<void>

// 创建房间
async function createRoom(page: Page, playerName: string): Promise<string>

// 加入房间
async function joinRoom(page: Page, roomId: string, playerName: string): Promise<void>

// 准备
async function setReady(page: Page): Promise<void>

// 截图保存
async function saveScreenshot(page: Page, name: string): Promise<string>

// 文本验证
async function expectText(page: Page, text: string): Promise<void>

// 模拟出牌
async function playCards(page: Page): Promise<void>
```

### 5.2 错误处理

- **服务器未启动**: 测试前 fetch 检查
- **连接超时**: Promise.race() 检测
- **断言失败**: expect() 自动捕获
- **截图保留**: 失败时自动保存

---

## 6. 实现计划概要

### 6.1 任务分解

1. **安装和配置** (10分钟)
   - 安装 @playwright/test
   - 配置 playwright.config.ts
   - 创建测试目录结构

2. **测试数据准备** (5分钟)
   - 创建 fixtures/game-data.ts
   - 定义玩家、牌型、超时数据

3. **工具函数实现** (20分钟)
   - 创建 utils/helpers.ts
   - 实现7个核心工具函数
   - 添加错误处理

4. **主测试实现** (30分钟)
   - 创建 guanda-full-game.spec.ts
   - 实现6个测试阶段
   - 添加断言和截图

5. **测试验证** (10分钟)
   - 运行测试
   - 修复问题
   - 生成报告

6. **文档和提交** (5分钟)
   - 编写 README
   - Git 提交

### 6.2 预计时间
总计约 80 分钟完成整个测试套件。

---

## 7. 成功标准

- ✅ 所有断言通过
- ✅ 6个阶段截图完整生成
- ✅ 完整流程在 60 秒内完成
- ✅ 无控制台错误
- ✅ 服务器日志无异常
- ✅ HTML 报告可查看

---

**文档版本**: 1.0
**最后更新**: 2025-02-26
