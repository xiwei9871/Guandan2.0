# 掼蛋游戏 MVP 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个支持4人局域网实时对战的掼蛋游戏 MVP

**Architecture:** Next.js 14 全栈应用，使用 Socket.io 实现实时通信，服务器权威模式管理游戏状态，客户端负责 UI 渲染和用户交互。

**Tech Stack:** Next.js 14, TypeScript, Socket.io, Tailwind CSS, shadcn/ui, Zustand

---

## Phase 1: 项目初始化

### Task 1: 初始化 Next.js 项目

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Step 1: 创建 Next.js 项目**

运行:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

**Step 2: 安装依赖**

运行:
```bash
npm install socket.io socket.io-client zustand
npm install -D @types/node
```

**Step 3: 配置 Tailwind CSS**

创建 `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 4: 验证项目运行**

运行: `npm run dev`
访问: `http://localhost:3000`
预期: 看到 Next.js 欢迎页面

**Step 5: 提交**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: 配置项目基础结构

**Files:**
- Create: `lib/types.ts` - 核心类型定义
- Create: `lib/constants.ts` - 游戏常量
- Create: `components/ui/` 目录

**Step 1: 创建核心类型定义**

创建 `lib/types.ts`:
```typescript
// 花色
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// 玩家位置
export type Position = 'south' | 'west' | 'north' | 'east';

// 队伍
export type Team = 'red' | 'blue';

// 牌型
export enum CardType {
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

// 扑克牌
export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1-13 (A-K)
  levelCard: boolean; // 是否为当前级牌
  isWildcard: boolean; // 是否为逢人配(红桃级牌)
}

// 玩家
export interface Player {
  id: string;
  name: string;
  position: Position;
  team: Team;
  hand: Card[];
  isReady: boolean;
  cardsRemaining: number; // 剩余牌数
  rank?: 1 | 2 | 3 | 4; // 名次
}

// 出牌
export interface Play {
  playerId: string;
  cards: Card[];
  type: CardType;
  mainRank: number;
  timestamp: number;
}

// 游戏阶段
export type GamePhase = 'waiting' | 'tributing' | 'playing' | 'finished';

// 贡牌状态
export interface TributeState {
  fromPlayer: string | null;
  toPlayer: string | null;
  cards: Card[];
  phase: 'giving' | 'returning';
}

// 房间状态
export interface RoomState {
  roomId: string;
  players: Player[];
  currentLevel: number; // 当前打几 (2=2, 3=3, ..., 14=A)
  currentTurn: number; // 当前出牌玩家索引 0-3
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  gamePhase: GamePhase;
  scores: {
    red: number;
    blue: number;
  };
  tribute: TributeState | null;
  dealer: number; // 庄家索引
}

// 房间
export interface Room {
  id: string;
  name: string;
  maxPlayers: 4;
  status: 'waiting' | 'playing' | 'finished';
  gameState: RoomState | null;
  createdAt: number;
}
```

**Step 2: 创建游戏常量**

创建 `lib/constants.ts`:
```typescript
export const DECK_SIZE = 108; // 两副牌
export const HAND_SIZE = 27; // 每人27张
export const MAX_PLAYERS = 4;

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const LEVEL_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export const TEAM_NAMES: Record<string, string> = {
  red: '红队',
  blue: '蓝队'
};

// Socket 事件
export const SOCKET_EVENTS = {
  // 客户端发送
  CLIENT: {
    CREATE_ROOM: 'room:create',
    JOIN_ROOM: 'room:join',
    LEAVE_ROOM: 'room:leave',
    SET_READY: 'room:ready',
    START_GAME: 'game:start',
    PLAY_CARDS: 'game:play',
    PASS_TURN: 'game:pass',
  },
  // 服务器发送
  SERVER: {
    ROOM_UPDATED: 'room:updated',
    PLAYER_JOINED: 'room:playerJoined',
    PLAYER_LEFT: 'room:playerLeft',
    GAME_STATE_CHANGED: 'game:stateChanged',
    PLAYER_PLAYED: 'game:playerPlayed',
    TURN_CHANGED: 'game:turnChanged',
    ROUND_ENDED: 'game:roundEnded',
    ERROR: 'error',
  }
} as const;
```

**Step 3: 验证类型定义**

创建测试文件 `lib/types.test.ts`:
```typescript
import { CardType, type Card, type Player } from './types';

// 简单类型验证
const testCard: Card = {
  id: 'test-1',
  suit: 'hearts',
  rank: 2,
  levelCard: true,
  isWildcard: true,
};

const testPlayer: Player = {
  id: 'player-1',
  name: 'Test',
  position: 'south',
  team: 'red',
  hand: [testCard],
  isReady: false,
  cardsRemaining: 27,
};

console.log('Types validated successfully');
```

运行: `npx ts-node lib/types.test.ts`
预期: 无类型错误

**Step 4: 提交**

```bash
git add lib/
git commit -m "feat: add core type definitions and constants"
```

---

## Phase 2: 牌型判断引擎

### Task 3: 实现基础牌型判断

**Files:**
- Create: `lib/game/cardChecker.ts`
- Create: `lib/game/__tests__/cardChecker.test.ts`

**Step 1: 编写牌型判断的测试**

创建 `lib/game/__tests__/cardChecker.test.ts`:
```typescript
import { describe, it, expect } from '@jest/globals';
import { CardType } from '../../types';
import { detectCardType, canBeat } from '../cardChecker';
import { createCard } from '../testUtils';

describe('CardType Detection', () => {
  it('should detect single card', () => {
    const cards = [createCard('hearts', 5)];
    expect(detectCardType(cards)).toEqual({
      type: CardType.SINGLE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect pair', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.PAIR,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect bomb', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('clubs', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.BOMB,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect straight (5 cards)', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('hearts', 4),
      createCard('hearts', 5),
      createCard('hearts', 6),
      createCard('hearts', 7)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.STRAIGHT,
      mainRank: 7,
      valid: true
    });
  });

  it('should detect invalid straight with less than 5 cards', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('hearts', 4),
      createCard('hearts', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: null,
      mainRank: 0,
      valid: false
    });
  });

  it('should detect pair straight (3 pairs)', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('spades', 3),
      createCard('hearts', 4),
      createCard('spades', 4),
      createCard('hearts', 5),
      createCard('spades', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.PAIR_STRAIGHT,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple with one', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('hearts', 3)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE_WITH_ONE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple with pair', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('hearts', 3),
      createCard('spades', 3)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE_WITH_PAIR,
      mainRank: 5,
      valid: true
    });
  });
});

describe('Can Beat', () => {
  it('should allow higher single to beat lower single', () => {
    const lastPlay = {
      type: CardType.SINGLE,
      mainRank: 5,
      cards: [createCard('hearts', 5)]
    };
    const newCards = [createCard('hearts', 6)];
    expect(canBeat(newCards, lastPlay, 2)).toBe(true);
  });

  it('should not allow lower single to beat higher single', () => {
    const lastPlay = {
      type: CardType.SINGLE,
      mainRank: 5,
      cards: [createCard('hearts', 5)]
    };
    const newCards = [createCard('hearts', 4)];
    expect(canBeat(newCards, lastPlay, 2)).toBe(false);
  });

  it('should allow bomb to beat any non-bomb', () => {
    const lastPlay = {
      type: CardType.STRAIGHT,
      mainRank: 7,
      cards: []
    };
    const bombCards = [
      createCard('hearts', 4),
      createCard('spades', 4),
      createCard('diamonds', 4),
      createCard('clubs', 4)
    ];
    expect(canBeat(bombCards, lastPlay, 2)).toBe(true);
  });
});
```

**Step 2: 运行测试（预期失败）**

运行: `npm test`
预期: FAIL - cardChecker 模块不存在

**Step 3: 实现牌型判断逻辑**

创建 `lib/game/cardChecker.ts`:
```typescript
import { CardType, type Card } from '../types';

export interface CardTypeResult {
  type: CardType | null;
  mainRank: number;
  valid: boolean;
}

// 统计每个点数的牌数
function countRanks(cards: Card[]): Map<number, Card[]> {
  const rankMap = new Map<number, Card[]>();
  for (const card of cards) {
    if (!rankMap.has(card.rank)) {
      rankMap.set(card.rank, []);
    }
    rankMap.get(card.rank)!.push(card);
  }
  return rankMap;
}

// 检测牌型
export function detectCardType(cards: Card[]): CardTypeResult {
  if (cards.length === 0) {
    return { type: null, mainRank: 0, valid: false };
  }

  const rankMap = countRanks(cards);
  const ranks = Array.from(rankMap.entries()).sort((a, b) => a[0] - b[0]);

  // 单张
  if (cards.length === 1) {
    return { type: CardType.SINGLE, mainRank: cards[0].rank, valid: true };
  }

  // 对子
  if (cards.length === 2) {
    if (rankMap.size === 1) {
      return { type: CardType.PAIR, mainRank: cards[0].rank, valid: true };
    }
    // 王炸（大小王）
    if (cards.some(c => c.rank === 14 && c.suit === 'spades') &&
        cards.some(c => c.rank === 14 && c.suit === 'hearts')) {
      return { type: CardType.ROCKET, mainRank: 14, valid: true };
    }
  }

  // 三张
  if (cards.length === 3 && rankMap.size === 1) {
    return { type: CardType.TRIPLE, mainRank: cards[0].rank, valid: true };
  }

  // 炸弹
  if (cards.length === 4 && rankMap.size === 1) {
    return { type: CardType.BOMB, mainRank: cards[0].rank, valid: true };
  }

  // 三带一
  if (cards.length === 4) {
    for (const [rank, cs] of ranks) {
      if (cs.length === 3) {
        return { type: CardType.TRIPLE_WITH_ONE, mainRank: rank, valid: true };
      }
    }
  }

  // 三带二
  if (cards.length === 5) {
    const tripleRank = ranks.find(([_, cs]) => cs.length === 3);
    const pairRank = ranks.find(([_, cs]) => cs.length === 2);
    if (tripleRank && pairRank) {
      return { type: CardType.TRIPLE_WITH_PAIR, mainRank: tripleRank[0], valid: true };
    }
  }

  // 顺子（至少5张，连续）
  if (cards.length >= 5 && rankMap.size === cards.length) {
    const sortedRanks = ranks.map(([r]) => r).sort((a, b) => a - b);
    let isStraight = true;
    for (let i = 1; i < sortedRanks.length; i++) {
      if (sortedRanks[i] - sortedRanks[i-1] !== 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight && sortedRanks[sortedRanks.length - 1] <= 13) { // 不能包含A(14)
      return { type: CardType.STRAIGHT, mainRank: sortedRanks[sortedRanks.length - 1], valid: true };
    }
  }

  // 连对（至少3对）
  if (cards.length >= 6 && cards.length % 2 === 0) {
    const pairs = ranks.filter(([_, cs]) => cs.length === 2);
    if (pairs.length === cards.length / 2) {
      const sortedRanks = pairs.map(([r]) => r).sort((a, b) => a - b);
      let isConsecutive = true;
      for (let i = 1; i < sortedRanks.length; i++) {
        if (sortedRanks[i] - sortedRanks[i-1] !== 1) {
          isConsecutive = false;
          break;
        }
      }
      if (isConsecutive && sortedRanks[sortedRanks.length - 1] <= 13) {
        return { type: CardType.PAIR_STRAIGHT, mainRank: sortedRanks[sortedRanks.length - 1], valid: true };
      }
    }
  }

  return { type: null, mainRank: 0, valid: false };
}

// 判断是否能打过上一手牌
export function canBeat(
  newCards: Card[],
  lastPlay: { type: CardType; mainRank: number; cards: Card[] },
  currentLevel: number
): boolean {
  const newType = detectCardType(newCards);

  if (!newType.valid) {
    return false;
  }

  // 王炸最大
  if (newType.type === CardType.ROCKET) {
    return true;
  }

  // 炸弹可以打任何非炸弹
  if (newType.type === CardType.BOMB) {
    if (lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.ROCKET) {
      return true;
    }
    // 炸弹比大小
    return newType.mainRank > lastPlay.mainRank;
  }

  // 同类型比较
  if (newType.type === lastPlay.type) {
    if (newCards.length !== lastPlay.cards.length) {
      return false;
    }
    return newType.mainRank > lastPlay.mainRank;
  }

  return false;
}
```

**Step 4: 创建测试工具函数**

创建 `lib/game/testUtils.ts`:
```typescript
import { type Card } from '../types';

export function createCard(suit: Card['suit'], rank: number): Card {
  return {
    id: `card-${suit}-${rank}`,
    suit,
    rank,
    levelCard: false,
    isWildcard: false,
  };
}
```

**Step 5: 运行测试**

运行: `npm test`
预期: 所有测试通过

**Step 6: 提交**

```bash
git add lib/game/
git commit -m "feat: implement card type detection engine"
```

---

## Phase 3: Socket.io 服务器

### Task 4: 设置 Socket.io 服务器

**Files:**
- Create: `lib/socket/server.ts`
- Create: `app/api/socket/route.ts`

**Step 1: 安装 Jest 和测试依赖**

运行:
```bash
npm install -D jest @jest/globals @types/jest ts-jest
```

创建 `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

**Step 2: 创建 Socket.io 服务器**

创建 `lib/socket/server.ts`:
```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { Room, Player, RoomState } from '../types';
import { SOCKET_EVENTS } from '../constants';

interface ServerToClientEvents {
  [SOCKET_EVENTS.SERVER.ROOM_UPDATED]: (room: Room) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_JOINED]: (player: Player) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_LEFT]: (playerId: string) => void;
  [SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED]: (gameState: RoomState) => void;
  [SOCKET_EVENTS.SERVER.ERROR]: (message: string) => void;
}

interface ClientToServerEvents {
  [SOCKET_EVENTS.CLIENT.CREATE_ROOM]: (data: { playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.JOIN_ROOM]: (data: { roomId: string; playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.LEAVE_ROOM]: () => void;
  [SOCKET_EVENTS.CLIENT.SET_READY]: (isReady: boolean) => void;
}

let io: Server<ServerToClientEvents, ClientToServerEvents>;

export function initializeSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
        : 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 创建房间
    socket.on(SOCKET_EVENTS.CLIENT.CREATE_ROOM, ({ playerName }) => {
      const roomId = generateRoomId();
      const player: Player = {
        id: socket.id,
        name: playerName,
        position: 'south',
        team: 'red',
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      const room: Room = {
        id: roomId,
        name: `${playerName}的房间`,
        maxPlayers: 4,
        status: 'waiting',
        gameState: null,
        createdAt: Date.now(),
      };

      // 存储房间和玩家
      socket.data.roomId = roomId;
      socket.data.player = player;
      rooms.set(roomId, room);
      roomPlayers.set(roomId, [player]);

      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${playerName}`);
      socket.emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, room);
    });

    // 加入房间
    socket.on(SOCKET_EVENTS.CLIENT.JOIN_ROOM, ({ roomId, playerName }) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间不存在');
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间已开始游戏');
        return;
      }

      const players = roomPlayers.get(roomId) || [];
      if (players.length >= room.maxPlayers) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间已满');
        return;
      }

      // 分配位置和队伍
      const positions: Array<'south' | 'west' | 'north' | 'east'> = ['south', 'west', 'north', 'east'];
      const teams: Array<'red' | 'blue'> = ['red', 'blue', 'blue', 'red'];
      const index = players.length;

      const player: Player = {
        id: socket.id,
        name: playerName,
        position: positions[index],
        team: teams[index],
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      socket.data.roomId = roomId;
      socket.data.player = player;
      players.push(player);
      roomPlayers.set(roomId, players);
      room.currentPlayers = players.length;

      socket.join(roomId);

      // 通知所有玩家
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_JOINED, player);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, room);

      console.log(`${playerName} joined room ${roomId}`);
    });

    // 设置准备状态
    socket.on(SOCKET_EVENTS.CLIENT.SET_READY, (isReady: boolean) => {
      const roomId = socket.data.roomId;
      const playerId = socket.id;

      if (!roomId) return;

      const players = roomPlayers.get(roomId);
      if (!players) return;

      const player = players.find(p => p.id === playerId);
      if (player) {
        player.isReady = isReady;
        roomPlayers.set(roomId, players);

        io.to(roomId).emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, rooms.get(roomId)!);
      }
    });

    // 离开房间
    socket.on(SOCKET_EVENTS.CLIENT.LEAVE_ROOM, () => {
      handleLeave(socket);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      handleLeave(socket);
    });
  });

  return io;
}

function handleLeave(socket: Socket) {
  const roomId = socket.data.roomId;
  const player = socket.data.player as Player;

  if (roomId && player) {
    socket.leave(roomId);

    const players = roomPlayers.get(roomId) || [];
    const filteredPlayers = players.filter(p => p.id !== player.id);

    if (filteredPlayers.length === 0) {
      // 删除空房间
      rooms.delete(roomId);
      roomPlayers.delete(roomId);
    } else {
      roomPlayers.set(roomId, filteredPlayers);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_LEFT, player.id);
    }

    console.log(`${player.name} left room ${roomId}`);
  }
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getIO() {
  return io;
}

// 内存存储
const rooms = new Map<string, Room>();
const roomPlayers = new Map<string, Player[]>();

export { rooms, roomPlayers };
```

**Step 3: 创建 API 路由**

创建 `app/api/socket/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { initializeSocketServer } from '@/lib/socket/server';

let io: any = null;

export async function GET(req: NextRequest) {
  if (!io) {
    const httpServer = (req as any).socket?.server;
    if (httpServer) {
      io = initializeSocketServer(httpServer);
    }
  }

  return new Response('Socket.io server is running', { status: 200 });
}
```

**Step 4: 更新根布局以包含 Socket.io 客户端**

修改 `app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "掼蛋在线游戏",
  description: "4人局域网掼蛋对战游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 5: 创建 Socket.io 客户端 Hook**

创建 `hooks/useSocket.ts`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/constants';

export function useSocket roomId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      autoConnect: false,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && roomId) {
      socket.connect();
    }
  }, [socket, roomId]);

  return { socket, isConnected };
}
```

**Step 6: 测试 Socket 连接**

运行: `npm run dev`
预期: 服务器启动，无错误

**Step 7: 提交**

```bash
git add lib/socket/ app/api/ hooks/
git commit -m "feat: implement Socket.io server and client"
```

---

## Phase 4: 首页和房间系统

### Task 5: 创建首页 UI

**Files:**
- Create: `components/HomePage.tsx`
- Modify: `app/page.tsx`

**Step 1: 创建首页组件**

创建 `components/HomePage.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';
import { SOCKET_EVENTS } from '@/lib/constants';

export function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  const handleCreateRoom = () => {
    if (!playerName.trim() || !socket) return;

    socket.emit(SOCKET_EVENTS.CLIENT.CREATE_ROOM, { playerName: playerName.trim() });

    socket.once(SOCKET_EVENTS.SERVER.ROOM_UPDATED, (room: any) => {
      router.push(`/room/${room.id}`);
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomId.trim() || !socket) return;

    socket.emit(SOCKET_EVENTS.CLIENT.JOIN_ROOM, {
      roomId: roomId.trim().toUpperCase(),
      playerName: playerName.trim(),
    });

    socket.once(SOCKET_EVENTS.SERVER.ROOM_UPDATED, () => {
      router.push(`/room/${roomId.trim().toUpperCase()}`);
    });

    socket.once(SOCKET_EVENTS.SERVER.ERROR, (message: string) => {
      alert(message);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-green-800">掼蛋</h1>
        <p className="text-center text-gray-600 mb-8">在线对战游戏</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              您的昵称
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="请输入昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              maxLength={10}
            />
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-4">创建房间</h2>
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim() || !isConnected}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              创建新房间
            </button>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-4">加入房间</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="房间号"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomId.trim() || !isConnected}
                className="px-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                加入
              </button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            连接状态: {isConnected ? '已连接' : '连接中...'}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 更新首页**

修改 `app/page.tsx`:
```typescript
import { HomePage } from '@/components/HomePage';

export default function Home() {
  return <HomePage />;
}
```

**Step 3: 测试首页**

运行: `npm run dev`
访问: `http://localhost:3000`
预期: 看到首页，显示连接状态为"已连接"

**Step 4: 提交**

```bash
git add components/ app/
git commit -m "feat: add home page with create/join room functionality"
```

---

### Task 6: 创建游戏房间页面

**Files:**
- Create: `app/room/[roomId]/page.tsx`
- Create: `components/GameRoom.tsx`
- Create: `components/game/PlayerCard.tsx`

**Step 1: 创建玩家卡片组件**

创建 `components/game/PlayerCard.tsx`:
```typescript
'use client';

import { type Player } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
}

export function PlayerCard({ player, isCurrentTurn, isSelf }: PlayerCardProps) {
  const positionLabels = {
    south: '南方',
    west: '西方',
    north: '北方',
    east: '东方',
  };

  const teamColors = {
    red: 'border-red-500 bg-red-50',
    blue: 'border-blue-500 bg-blue-50',
  };

  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all
      ${teamColors[player.team]}
      ${isCurrentTurn ? 'ring-4 ring-yellow-400' : ''}
      ${isSelf ? 'ring-2 ring-green-500' : ''}
    `}>
      <div className="font-bold text-lg">{player.name}</div>
      <div className="text-sm text-gray-600">
        {positionLabels[player.position]} | {player.team === 'red' ? '红队' : '蓝队'}
      </div>
      <div className="mt-2 text-sm">
        手牌: {player.cardsRemaining} 张
        {player.rank && <span className="ml-2">第 {player.rank} 名</span>}
      </div>
      <div className="mt-1 text-sm">
        {player.isReady ? <span className="text-green-600">已准备</span> : <span className="text-gray-400">未准备</span>}
      </div>
    </div>
  );
}
```

**Step 2: 创建游戏房间组件**

创建 `components/GameRoom.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useSearchParams } from 'next/navigation';
import { PlayerCard } from './game/PlayerCard';
import { SOCKET_EVENTS } from '@/lib/constants';
import type { Room, Player } from '@/lib/types';

export function GameRoom() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const { socket, isConnected } = useSocket(roomId);

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // 监听房间更新
    socket.on(SOCKET_EVENTS.SERVER.ROOM_UPDATED, (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_JOINED, (player: Player) => {
      setPlayers(prev => [...prev, player]);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_LEFT, (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    // 请求房间状态
    socket.emit(SOCKET_EVENTS.CLIENT.JOIN_ROOM, {
      roomId,
      playerName: 'Player', // 临时名称
    });

    return () => {
      socket.off(SOCKET_EVENTS.SERVER.ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_LEFT);
    };
  }, [socket, roomId]);

  const handleReadyToggle = () => {
    if (!socket || !currentPlayer) return;
    const newReadyState = !currentPlayer.isReady;
    socket.emit(SOCKET_EVENTS.CLIENT.SET_READY, newReadyState);
    setCurrentPlayer(prev => prev ? { ...prev, isReady: newReadyState } : null);
  };

  const allReady = players.length === 4 && players.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-lg p-4 mb-4 flex justify-between items-center">
          <div>
            <span className="font-bold">房间号:</span> {roomId}
          </div>
          <div>
            <span className="font-bold">玩家:</span> {players.length}/4
          </div>
          <div>
            连接状态: {isConnected ? '已连接' : '断开'}
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="grid grid-cols-3 grid-rows-3 gap-4 h-[600px]">
          {/* 北方玩家 */}
          <div className="col-start-2 row-start-1">
            {players.find(p => p.position === 'north') && (
              <PlayerCard
                player={players.find(p => p.position === 'north')!}
                isCurrentTurn={currentTurn === 2}
                isSelf={false}
              />
            )}
          </div>

          {/* 西方玩家 */}
          <div className="col-start-1 row-start-2">
            {players.find(p => p.position === 'west') && (
              <PlayerCard
                player={players.find(p => p.position === 'west')!}
                isCurrentTurn={currentTurn === 1}
                isSelf={false}
              />
            )}
          </div>

          {/* 中央区域 */}
          <div className="col-start-2 row-start-2 bg-white/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              {!allReady && players.length < 4 && (
                <div className="text-gray-600">等待玩家加入... ({players.length}/4)</div>
              )}
              {!allReady && players.length === 4 && (
                <div className="text-gray-600">等待所有玩家准备...</div>
              )}
              {allReady && (
                <div className="text-green-600 font-bold">可以开始游戏!</div>
              )}
            </div>
          </div>

          {/* 东方玩家 */}
          <div className="col-start-3 row-start-2">
            {players.find(p => p.position === 'east') && (
              <PlayerCard
                player={players.find(p => p.position === 'east')!}
                isCurrentTurn={currentTurn === 3}
                isSelf={false}
              />
            )}
          </div>

          {/* 南方玩家（自己） */}
          <div className="col-start-2 row-start-3">
            {currentPlayer && (
              <PlayerCard
                player={currentPlayer}
                isCurrentTurn={currentTurn === 0}
                isSelf={true}
              />
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={handleReadyToggle}
            disabled={!currentPlayer}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              currentPlayer?.isReady
                ? 'bg-gray-500 hover:bg-gray-600'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {currentPlayer?.isReady ? '取消准备' : '准备'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: 创建房间页面**

创建 `app/room/[roomId]/page.tsx`:
```typescript
import { GameRoom } from '@/components/GameRoom';

export default function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <GameRoom roomId={params.roomId} />;
}
```

**Step 4: 修复 GameRoom 组件的 roomId 传递**

修改 `components/GameRoom.tsx` 的 props:
```typescript
interface GameRoomProps {
  roomId: string;
}

export function GameRoom({ roomId }: GameRoomProps) {
  // 移除 useSearchParams，直接使用 roomId prop
  const { socket, isConnected } = useSocket(roomId);
  // ... 其余代码保持不变，但移除 searchParams 相关代码
```

**Step 5: 测试房间功能**

运行: `npm run dev`
1. 打开两个浏览器窗口
2. 创建房间，记录房间号
3. 在另一个窗口加入房间
预期: 两个窗口都能看到对方

**Step 6: 提交**

```bash
git add components/game/ app/room/
git commit -m "feat: add game room page with player management"
```

---

## Phase 5: 游戏逻辑引擎

### Task 7: 实现发牌和游戏状态管理

**Files:**
- Create: `lib/game/deck.ts` - 牌堆管理
- Create: `lib/game/gameState.ts` - 游戏状态机

**Step 1: 创建牌堆测试**

创建 `lib/game/__tests__/deck.test.ts`:
```typescript
import { describe, it, expect } from '@jest/globals';
import { createDeck, shuffleDeck, dealCards } from '../deck';

describe('Deck Management', () => {
  it('should create a deck with 108 cards', () => {
    const deck = createDeck(2); // 两副牌
    expect(deck.length).toBe(108);
  });

  it('should shuffle deck randomly', () => {
    const deck1 = createDeck(2);
    const deck2 = shuffleDeck([...deck1]);
    expect(deck1).not.toEqual(deck2);
  });

  it('should deal 27 cards to each of 4 players', () => {
    const deck = shuffleDeck(createDeck(2));
    const hands = dealCards(deck, 4, 27);
    expect(hands).toHaveLength(4);
    hands.forEach(hand => {
      expect(hand.length).toBe(27);
    });
  });
});
```

**Step 2: 运行测试（预期失败）**

运行: `npm test`
预期: FAIL - deck 模块不存在

**Step 3: 实现牌堆管理**

创建 `lib/game/deck.ts`:
```typescript
import { type Card } from '../types';
import { SUITS, RANKS } from '../constants';

// 创建牌堆
export function createDeck(numDecks: number = 2): Card[] {
  const deck: Card[] = [];

  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${d}-${suit}-${rank}`,
          suit,
          rank,
          levelCard: false,
          isWildcard: false,
        });
      }
    }
  }

  return deck;
}

// 洗牌
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 发牌
export function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);

  for (let i = 0; i < numPlayers * cardsPerPlayer; i++) {
    const playerIndex = i % numPlayers;
    hands[playerIndex].push(deck[i]);
  }

  // 排序手牌
  hands.forEach(hand => {
    hand.sort((a, b) => {
      if (a.suit !== b.suit) {
        return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      }
      return b.rank - a.rank; // 大牌在前
    });
  });

  return hands;
}

// 设置级牌和逢人配
export function setLevelCards(cards: Card[], level: number): Card[] {
  return cards.map(card => {
    const isLevelCard = card.rank === level;
    const isWildcard = isLevelCard && card.suit === 'hearts';
    return {
      ...card,
      levelCard: isLevelCard,
      isWildcard,
    };
  });
}
```

**Step 4: 运行测试**

运行: `npm test`
预期: 通过

**Step 5: 提交**

```bash
git add lib/game/deck.ts
git commit -m "feat: implement deck management and card dealing"
```

---

### Task 8: 实现游戏状态机

**Files:**
- Create: `lib/game/gameEngine.ts` - 游戏引擎

**Step 1: 创建游戏引擎测试**

创建 `lib/game/__tests__/gameEngine.test.ts`:
```typescript
import { describe, it, expect } from '@jest/globals';
import { initializeGame, handlePlayerPlay } from '../gameEngine';
import { type Player, type RoomState } from '../../types';

describe('Game Engine', () => {
  const mockPlayers: Player[] = [
    {
      id: 'p1',
      name: 'Player 1',
      position: 'south',
      team: 'red',
      hand: [],
      isReady: true,
      cardsRemaining: 27,
    },
    // ... 其他3个玩家
  ];

  it('should initialize game with correct state', () => {
    const gameState = initializeGame('room-1', mockPlayers, 2);
    expect(gameState.gamePhase).toBe('playing');
    expect(gameState.currentLevel).toBe(2);
    expect(gameState.players.every(p => p.hand.length === 27)).toBe(true);
  });
});
```

**Step 2: 实现游戏引擎**

创建 `lib/game/gameEngine.ts`:
```typescript
import { type RoomState, type Player, type Card, GamePhase } from '../types';
import { createDeck, shuffleDeck, dealCards, setLevelCards } from './deck';
import { detectCardType, canBeat } from './cardChecker';
import { HAND_SIZE } from '../constants';

// 初始化游戏
export function initializeGame(
  roomId: string,
  players: Player[],
  currentLevel: number
): RoomState {
  // 创建并洗牌
  const deck = shuffleDeck(createDeck(2));

  // 发牌
  const hands = dealCards(deck, 4, HAND_SIZE);

  // 设置级牌和逢人配
  const playersWithCards: Player[] = players.map((player, index) => ({
    ...player,
    hand: setLevelCards(hands[index], currentLevel),
    cardsRemaining: HAND_SIZE,
    isReady: false,
  }));

  // 随机选择庄家
  const dealer = Math.floor(Math.random() * 4);

  return {
    roomId,
    players: playersWithCards,
    currentLevel,
    currentTurn: dealer,
    lastPlay: null,
    lastPlayPlayer: null,
    gamePhase: 'playing' as GamePhase,
    scores: {
      red: 0,
      blue: 0,
    },
    tribute: null,
    dealer,
  };
}

// 处理玩家出牌
export function handlePlayerPlay(
  gameState: RoomState,
  playerIndex: number,
  cards: Card[]
): { success: boolean; message: string; newGameState?: RoomState } {
  const player = gameState.players[playerIndex];

  // 验证是否轮到该玩家
  if (gameState.currentTurn !== playerIndex) {
    return { success: false, message: '还没轮到您出牌' };
  }

  // 验证牌是否在手牌中
  const cardIds = cards.map(c => c.id);
  const handCardIds = player.hand.map(c => c.id);
  const hasAllCards = cardIds.every(id => handCardIds.includes(id));

  if (!hasAllCards) {
    return { success: false, message: '您没有这些牌' };
  }

  // 检测牌型
  const cardType = detectCardType(cards);

  if (!cardType.valid) {
    return { success: false, message: '无效的牌型' };
  }

  // 如果有上一手牌，检查是否能打过
  if (gameState.lastPlay && gameState.lastPlayPlayer !== playerIndex) {
    if (!canBeat(cards, gameState.lastPlay, gameState.currentLevel)) {
      return { success: false, message: '打不过上一手牌' };
    }
  }

  // 执行出牌
  const newPlayers = [...gameState.players];
  const newPlayer = { ...newPlayers[playerIndex] };
  newPlayer.hand = newPlayer.hand.filter(c => !cardIds.includes(c.id));
  newPlayer.cardsRemaining = newPlayer.hand.length;
  newPlayers[playerIndex] = newPlayer;

  const newGameState: RoomState = {
    ...gameState,
    players: newPlayers,
    lastPlay: {
      playerId: player.id,
      cards,
      type: cardType.type!,
      mainRank: cardType.mainRank,
      timestamp: Date.now(),
    },
    lastPlayPlayer: playerIndex,
  };

  // 检查玩家是否出完牌
  if (newPlayer.cardsRemaining === 0) {
    // 处理玩家出局逻辑
    return handlePlayerOut(newGameState, playerIndex);
  }

  // 下一个玩家
  newGameState.currentTurn = (playerIndex + 1) % 4;

  return { success: true, message: '出牌成功', newGameState };
}

// 处理玩家出牌（不出）
export function handlePlayerPass(
  gameState: RoomState,
  playerIndex: number
): { success: boolean; message: string; newGameState?: RoomState } {
  // 如果是第一个出牌，不能不要
  if (!gameState.lastPlay || gameState.lastPlayPlayer === playerIndex) {
    return { success: false, message: '您必须出牌' };
  }

  const newGameState = {
    ...gameState,
    currentTurn: (playerIndex + 1) % 4,
  };

  // 如果回到最后出牌的人，清空上一手牌
  if (newGameState.currentTurn === gameState.lastPlayPlayer) {
    newGameState.lastPlay = null;
    newGameState.lastPlayPlayer = null;
  }

  return { success: true, message: '过牌', newGameState };
}

// 处理玩家出局
function handlePlayerOut(
  gameState: RoomState,
  playerIndex: number
): { success: boolean; message: string; newGameState: RoomState } {
  const newPlayers = [...gameState.players];
  const finishedPlayers = newPlayers.filter(p => p.rank !== undefined);
  const nextRank = (finishedPlayers.length + 1) as 1 | 2 | 3 | 4;

  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    rank: nextRank,
  };

  const newGameState = {
    ...gameState,
    players: newPlayers,
  };

  // 检查游戏是否结束
  if (finishedPlayers.length === 3) {
    return handleGameEnd(newGameState);
  }

  // 继续游戏，跳过已出局的玩家
  let nextTurn = (gameState.currentTurn + 1) % 4;
  while (newPlayers[nextTurn].rank !== undefined) {
    nextTurn = (nextTurn + 1) % 4;
  }
  newGameState.currentTurn = nextTurn;

  return {
    success: true,
    message: `${newPlayers[playerIndex].name} 获得第 ${nextRank} 名`,
    newGameState,
  };
}

// 处理游戏结束
function handleGameEnd(gameState: RoomState): { success: boolean; message: string; newGameState: RoomState } {
  const players = gameState.players;

  // 按名次排序
  const sortedPlayers = [...players].sort((a, b) => (a.rank || 5) - (b.rank || 5));

  const firstPlace = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];
  const fourthPlace = sortedPlayers[3];

  // 判断胜负
  const redTeam = players.filter(p => p.team === 'red');
  const blueTeam = players.filter(p => p.team === 'blue');

  const redRanks = redTeam.map(p => p.rank || 5).sort((a, b) => a - b);
  const blueRanks = blueTeam.map(p => p.rank || 5).sort((a, b) => a - b);

  // 获胜方是前两名都出完的一方
  const winnerTeam = redRanks[0] < blueRanks[0] ? 'red' : 'blue';

  // 计算升级级数
  let levelIncrease = 0;

  if (winnerTeam === 'red') {
    if (redRanks[0] === 1 && redRanks[1] === 2) levelIncrease = 3;
    else if (redRanks[0] === 1 && redRanks[1] === 3) levelIncrease = 2;
    else if (redRanks[0] === 1) levelIncrease = 1;
  } else {
    if (blueRanks[0] === 1 && blueRanks[1] === 2) levelIncrease = 3;
    else if (blueRanks[0] === 1 && blueRanks[1] === 3) levelIncrease = 2;
    else if (blueRanks[0] === 1) levelIncrease = 1;
  }

  // 更新分数
  const newScores = { ...gameState.scores };
  newScores[winnerTeam] += levelIncrease;

  const newGameState: RoomState = {
    ...gameState,
    gamePhase: 'finished',
    scores: newScores,
  };

  return {
    success: true,
    message: `${winnerTeam === 'red' ? '红队' : '蓝队'} 获胜！升 ${levelIncrease} 级`,
    newGameState,
  };
}
```

**Step 3: 运行测试**

运行: `npm test`
预期: 通过

**Step 4: 提交**

```bash
git add lib/game/gameEngine.ts
git commit -m "feat: implement game engine with state machine"
```

---

## Phase 6: Socket 游戏事件集成

### Task 9: 集成游戏逻辑到 Socket 服务器

**Files:**
- Modify: `lib/socket/server.ts`

**Step 1: 添加游戏事件处理器**

在 `lib/socket/server.ts` 中添加游戏事件处理:

```typescript
// 在文件顶部导入
import { initializeGame, handlePlayerPlay, handlePlayerPass } from '../game/gameState';

// 在 socket 连接处理中添加以下事件处理器：

// 开始游戏
socket.on(SOCKET_EVENTS.CLIENT.START_GAME, () => {
  const roomId = socket.data.roomId;
  const players = roomPlayers.get(roomId);

  if (!players || players.length !== 4) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, '需要4名玩家才能开始游戏');
    return;
  }

  if (!players.every(p => p.isReady)) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, '所有玩家都需要准备');
    return;
  }

  const room = rooms.get(roomId);
  if (room && room.status !== 'waiting') {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, '游戏已经开始');
    return;
  }

  // 初始化游戏
  const gameState = initializeGame(roomId, players, 2);
  room!.status = 'playing';
  room!.gameState = gameState;

  // 向每个玩家发送他们的手牌
  players.forEach((player, index) => {
    const playerSocket = io?.to(player.id);
    if (playerSocket) {
      // 只发送该玩家的手牌
      const playerState = {
        ...gameState,
        players: gameState.players.map((p, i) => ({
          ...p,
          hand: i === index ? p.hand : [], // 只显示自己的手牌
        })),
      };
      io?.to(player.id).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, playerState);
    }
  });

  console.log(`Game started in room ${roomId}`);
});

// 出牌
socket.on(SOCKET_EVENTS.CLIENT.PLAY_CARDS, ({ cards }) => {
  const roomId = socket.data.roomId;
  const playerId = socket.id;

  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room || !room.gameState) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, '游戏未开始');
    return;
  }

  const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, '玩家不在游戏中');
    return;
  }

  const result = handlePlayerPlay(room.gameState, playerIndex, cards);

  if (!result.success) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, result.message);
    return;
  }

  room.gameState = result.newGameState!;

  // 广播游戏状态
  room.gameState.players.forEach((player, index) => {
    const playerState = {
      ...room.gameState!,
      players: room.gameState!.players.map((p, i) => ({
        ...p,
        hand: i === index ? p.hand : [],
      })),
    };
    io?.to(player.id).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, playerState);
  });

  // 广播出牌信息（公开的牌）
  io?.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_PLAYED, {
    playerId,
    cards,
    type: result.newGameState!.lastPlay!.type,
  });

  // 检查游戏是否结束
  if (result.newGameState!.gamePhase === 'finished') {
    io?.to(roomId).emit(SOCKET_EVENTS.SERVER.ROUND_ENDED, {
      result,
    });
  }
});

// 过牌
socket.on(SOCKET_EVENTS.CLIENT.PASS_TURN, () => {
  const roomId = socket.data.roomId;
  const playerId = socket.id;

  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room || !room.gameState) return;

  const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const result = handlePlayerPass(room.gameState, playerIndex);

  if (!result.success) {
    socket.emit(SOCKET_EVENTS.SERVER.ERROR, result.message);
    return;
  }

  room.gameState = result.newGameState!;

  // 广播回合变化
  io?.to(roomId).emit(SOCKET_EVENTS.SERVER.TURN_CHANGED, {
    currentTurn: result.newGameState!.currentTurn,
  });

  // 广播游戏状态
  room.gameState.players.forEach((player, index) => {
    const playerState = {
      ...room.gameState!,
      players: room.gameState!.players.map((p, i) => ({
        ...p,
        hand: i === index ? p.hand : [],
      })),
    };
    io?.to(player.id).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, playerState);
  });
});
```

**Step 2: 提交**

```bash
git add lib/socket/server.ts
git commit -m "feat: integrate game logic with socket events"
```

---

## Phase 7: 游戏UI完善

### Task 10: 实现手牌显示和选牌

**Files:**
- Create: `components/game/HandCards.tsx`
- Create: `hooks/useCardSelection.ts`

**Step 1: 创建选牌 Hook**

创建 `hooks/useCardSelection.ts`:
```typescript
'use client';

import { useState } from 'react';
import { type Card } from '@/lib/types';

export function useCardSelection() {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedCards(new Set());
  };

  return {
    selectedCards,
    toggleCard,
    clearSelection,
    isSelected: (cardId: string) => selectedCards.has(cardId),
  };
}
```

**Step 2: 创建手牌组件**

创建 `components/game/HandCards.tsx`:
```typescript
'use client';

import { type Card } from '@/lib/types';
import { useCardSelection } from '@/hooks/useCardSelection';

interface HandCardsProps {
  cards: Card[];
  onPlayCards: (cards: Card[]) => void;
  disabled?: boolean;
}

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANK_NAMES: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

const SUIT_COLORS = {
  spades: 'text-gray-800',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-800',
};

export function HandCards({ cards, onPlayCards, disabled }: HandCardsProps) {
  const { selectedCards, toggleCard, isSelected, clearSelection } = useCardSelection();

  const handlePlayClick = () => {
    const selected = cards.filter(c => isSelected(c.id));
    if (selected.length > 0) {
      onPlayCards(selected);
      clearSelection();
    }
  };

  return (
    <div className="bg-green-700 rounded-lg p-4">
      <div className="flex flex-wrap justify-center gap-1 mb-4">
        {cards.map(card => {
          const isWildcard = card.isWildcard;
          const isLevelCard = card.levelCard;

          return (
            <button
              key={card.id}
              onClick={() => !disabled && toggleCard(card.id)}
              disabled={disabled}
              className={`
                relative w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center
                transition-all transform hover:-translate-y-2
                ${isSelected(card.id) ? 'border-yellow-400 -translate-y-4' : 'border-white'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isWildcard ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white' : 'bg-white'}
              `}
            >
              <div className={`text-2xl font-bold ${SUIT_COLORS[card.suit]}`}>
                {RANK_NAMES[card.rank]}
              </div>
              <div className={`text-xl ${SUIT_COLORS[card.suit]}`}>
                {SUIT_SYMBOLS[card.suit]}
              </div>
              {isLevelCard && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full text-xs flex items-center justify-center">
                  级
                </div>
              )}
              {isWildcard && (
                <div className="absolute top-0 left-0 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  配
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!disabled && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handlePlayClick}
            disabled={selectedCards.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            出牌 ({selectedCards.size})
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedCards.size === 0}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            清空
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: 更新 GameRoom 组件集成手牌显示**

修改 `components/GameRoom.tsx`，添加手牌显示和出牌逻辑。

**Step 4: 测试选牌和出牌**

运行: `npm run dev`
测试: 点击牌选择，点击出牌按钮

**Step 5: 提交**

```bash
git add hooks/ components/game/HandCards.tsx
git commit -m "feat: add hand cards display and selection"
```

---

## Phase 8: 测试和优化

### Task 11: 端到端测试

**Step 1: 本地多窗口测试**

1. 启动开发服务器
2. 打开4个浏览器窗口
3. 创建房间，其他3个加入
4. 测试完整游戏流程

**Step 2: 修复发现的问题**

记录并修复测试中发现的所有 bug

**Step 3: 提交**

```bash
git add .
git commit -m "fix: resolve issues found in testing"
```

---

### Task 12: 最终优化和文档

**Step 1: 添加错误处理和用户提示**

**Step 2: 优化 UI 响应式设计**

**Step 3: 添加游戏规则说明**

创建 `docs/rules.md`

**Step 4: 更新 README**

创建 `README.md`:
```markdown
# 掼蛋在线游戏

一个基于 Next.js 的掼蛋在线对战游戏。

## 功能

- 4人实时对战
- 完整掼蛋规则
- 房间系统
- 自动结算

## 快速开始

\`\`\`bash
npm install
npm run dev
\`\`\`

访问 http://localhost:3000

## 技术栈

- Next.js 14
- TypeScript
- Socket.io
- Tailwind CSS
```

**Step 5: 最终提交**

```bash
git add .
git commit -m "docs: add README and finalize MVP"
```

---

## 任务清单总结

- [ ] Phase 1: 项目初始化 (Task 1-2)
- [ ] Phase 2: 牌型判断引擎 (Task 3)
- [ ] Phase 3: Socket.io 服务器 (Task 4)
- [ ] Phase 4: 首页和房间系统 (Task 5-6)
- [ ] Phase 5: 游戏逻辑引擎 (Task 7-8)
- [ ] Phase 6: Socket 游戏事件集成 (Task 9)
- [ ] Phase 7: 游戏 UI 完善 (Task 10)
- [ ] Phase 8: 测试和优化 (Task 11-12)

---

**预计完成时间**: MVP 可在几个工作日内完成

**下一步**: 使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 开始实现。
