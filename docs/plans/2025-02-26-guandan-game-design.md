# 掼蛋在线游戏 MVP 设计文档

**创建日期**: 2025-02-26
**项目名称**: 掼蛋在线游戏
**技术栈**: Next.js 14 + TypeScript + Socket.io

---

## 1. 项目概述

### 1.1 目标
开发一个基于 Web 的掼蛋在线游戏 MVP，支持 4 名玩家在局域网内实时对战。

### 1.2 核心功能
- 房间创建和加入（最多4人）
- 完整掼蛋规则实现
- 实时多人联机对战
- 游戏结算和升级系统

### 1.3 暂不包含（后续迭代）
- AI 对手
- 用户账号系统
- 精美动画效果
- 历史战绩记录

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────┐
│           Next.js 14+ (App Router)              │
│  ┌───────────────────────────────────────────┐  │
│  │   前端层 (React + TypeScript)             │  │
│  └───────────────────────────────────────────┘  │
│                     ↕                            │
│  ┌───────────────────────────────────────────┐  │
│  │   API层 (Socket.io集成)                   │  │
│  └───────────────────────────────────────────┘  │
│                     ↕                            │
│  ┌───────────────────────────────────────────┐  │
│  │   业务逻辑层                              │  │
│  │  - 游戏房间管理                           │  │
│  │  - 牌型判断引擎                           │  │
│  │  - 游戏状态机                             │  │
│  └───────────────────────────────────────────┘  │
│                     ↕                            │
│  ┌───────────────────────────────────────────┐  │
│  │   数据层（内存存储）                      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术选择 | 理由 |
|------|---------|------|
| 前端框架 | Next.js 14 | 全栈框架，开发体验好，易于部署 |
| 语言 | TypeScript | 类型安全，减少 bug |
| 实时通信 | Socket.io | 成熟稳定，自动重连，房间管理 |
| UI组件库 | shadcn/ui + Tailwind CSS | 现代化、可定制 |
| 状态管理 | Zustand | 轻量级，适合游戏状态 |
| 样式 | Tailwind CSS | 快速开发，响应式 |

---

## 3. 核心数据结构

### 3.1 玩家信息
```typescript
interface Player {
  id: string;
  name: string;
  position: 'south' | 'west' | 'north' | 'east';
  team: 'red' | 'blue';
  hand: Card[];
  isReady: boolean;
}
```

### 3.2 扑克牌
```typescript
interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: number; // 1-13 (A-K)
  levelCard: boolean;
  isWildcard: boolean; // 逢人配
}
```

### 3.3 牌型枚举
```typescript
enum CardType {
  SINGLE = 'single',
  PAIR = 'pair',
  TRIPLE = 'triple',
  TRIPLE_WITH_ONE = 'triple_with_one',
  TRIPLE_WITH_PAIR = 'triple_with_pair',
  STRAIGHT = 'straight',
  PAIR_STRAIGHT = 'pair_straight',
  TRIPLE_STRAIGHT = 'triple_straight',
  BOMB = 'bomb',
  ROCKET = 'rocket',
  STRAIGHT_FLUSH = 'straight_flush'
}
```

### 3.4 房间状态
```typescript
interface RoomState {
  roomId: string;
  players: Player[4];
  currentLevel: number; // 当前打几 (2-A)
  currentTurn: number;
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  gamePhase: 'waiting' | 'playing' | 'finished';
  scores: { red: number; blue: number };
  tributes: TributeState | null;
}
```

---

## 4. 游戏流程

### 4.1 游戏阶段

```
1. 房间创建阶段
   ├─ 创建房间 → 生成房间ID
   ├─ 玩家加入
   └─ 准备开始

2. 游戏准备阶段
   ├─ 确定庄家
   ├─ 确定当前级数
   ├─ 洗牌发牌（每人27张）
   └─ 翻底牌决定主牌

3. 贡牌阶段（非首局）
   ├─ 判断是否进贡
   ├─ 抗贡判断
   └─ 还牌

4. 出牌阶段
   ├─ 报牌
   ├─ 轮流出牌
   ├─ 牌型判断和大小比较
   └─ 玩家出局确定名次

5. 结算阶段
   ├─ 判断双方胜负
   ├─ 计算升级级数
   └─ 确定下一局级数
```

### 4.2 升级规则

| 排名组合 | 升级级数 |
|---------|---------|
| 头游+二游同队 | +3级 |
| 头游+三游同队 | +2级 |
| 头游+末游同队 | +1级 |
| 头游末游不同队 | 不升级（换对方打） |

---

## 5. UI界面设计

### 5.1 主界面布局

```
┌────────────────────────────────────────────────────┐
│                    顶部栏                          │
│   [房间号: 1234]  [当前级数: 2]  [红队: 0 | 蓝队: 0] │
├────────────────────────────────────────────────────┤
│                                                      │
│        ┌──────────────────────────────┐            │
│        │      北方玩家 (对手2)         │            │
│        └──────────────────────────────┘            │
│                                                      │
│  ┌──────────┐         游戏中央区         ┌──────────┐│
│  │ 西方玩家 │     ┌──────────────┐     │ 东方玩家 ││
│  │ (队友)   │     │  底牌/出牌区  │     │ (对手1)  ││
│  └──────────┘     └──────────────┘     └──────────┘│
│                                                      │
│        ┌──────────────────────────────┐            │
│        │      南方玩家 (你)           │            │
│        │   [手牌展示] [操作按钮]       │            │
│        └──────────────────────────────┘            │
└────────────────────────────────────────────────────┘
```

### 5.2 页面路由

```
/                    → 首页（创建/加入房间）
/room/[roomId]       → 游戏房间页面
```

### 5.3 核心组件

- `HomePage` - 首页
- `GameRoomPage` - 游戏房间
- `GameInfoBar` - 顶部信息栏
- `PlayerCard` - 玩家卡片
- `HandCards` - 手牌展示
- `ActionButtons` - 操作按钮
- `CenterArea` - 中央游戏区

---

## 6. 实时通信

### 6.1 Socket.io 事件

#### 客户端 → 服务器
```typescript
'room:create'    - 创建房间
'room:join'      - 加入房间
'room:leave'     - 离开房间
'room:ready'     - 准备游戏
'game:start'     - 开始游戏
'game:play'      - 出牌
'game:pass'      - 过牌
```

#### 服务器 → 客户端
```typescript
'room:updated'         - 房间状态更新
'room:playerJoined'    - 玩家加入
'room:playerLeft'      - 玩家离开
'game:stateChanged'    - 游戏状态变化
'game:playerPlayed'    - 玩家出牌
'game:turnChanged'     - 回合变化
'game:roundEnded'      - 游戏结束
```

### 6.2 状态同步策略

- **服务器权威模式**：所有游戏逻辑在服务器端执行
- 客户端只负责发送操作和展示状态
- 服务器验证逻辑 → 更新状态 → 广播给所有客户端

---

## 7. 项目结构

```
guandan_Game2.0/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 首页
│   ├── room/[roomId]/       # 游戏房间
│   ├── layout.tsx           # 根布局
│   └── api/                 # API 路由
├── components/              # React 组件
│   ├── game/               # 游戏组件
│   ├── ui/                 # UI 基础组件
│   └── layout/             # 布局组件
├── lib/                    # 核心逻辑
│   ├── game/              # 游戏逻辑引擎
│   ├── socket/            # Socket.io 配置
│   └── types.ts           # 类型定义
├── hooks/                  # React Hooks
├── store/                  # Zustand 状态管理
└── public/                 # 静态资源
```

---

## 8. 部署方案

### 8.1 本地测试
- `localhost:3000`
- 本机开启多个浏览器窗口测试

### 8.2 内网部署（后续）
- 在一台电脑上启动 Next.js 服务器
- 其他电脑通过 `http://服务器IP:3000` 访问
- Socket.io 自动连接到同一地址

---

## 9. 开发计划

详见实现计划文档。

---

**文档版本**: 1.0
**最后更新**: 2025-02-26
