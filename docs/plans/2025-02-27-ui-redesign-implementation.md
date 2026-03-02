# UI改进实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 改进掼蛋游戏UI布局，采用环绕式显示四家出牌，优化手牌区域占比（35%），使用绿色牌桌风格

**架构:** 重构GameRoom组件布局，将lastPlay改为lastPlays记录四方位出牌，创建中央出牌区组件采用环绕布局

**技术栈:** Next.js, React, TypeScript, Tailwind CSS, Socket.IO

---

## Task 1: 修改类型定义，添加lastPlays结构

**Files:**
- Modify: `lib/types.ts`

**Step 1: 添加PlayInfo接口**

在文件末尾添加：

```typescript
export interface PlayInfo {
  playerId: string;
  cards: Card[];
  type: string;
  mainRank: number;
  timestamp: number;
  isPass?: boolean;
}
```

**Step 2: 修改RoomState接口**

在RoomState接口中添加lastPlays字段：

```typescript
export interface RoomState {
  roomId: string;
  name: string;
  maxPlayers: number;
  status: string;
  gameState: any;
  createdAt: number;
  players: Player[];
  gamePhase: 'waiting' | 'tributing' | 'playing' | 'finished';
  currentLevel: number;
  currentTurn: number;
  scores: { red: number; blue: number };
  lastPlay: Play | null; // 保留向后兼容
  lastPlayPlayer: number | null;
  lastPlays?: {
    north?: PlayInfo | null;
    south?: PlayInfo | null;
    east?: PlayInfo | null;
    west?: PlayInfo | null;
  };
  dealer?: number;
  tribute?: any;
}
```

**Step 3: 提交**

```bash
git add lib/types.ts
git commit -m "feat: add PlayInfo interface and lastPlays to RoomState"
```

---

## Task 2: 修改服务器端，支持四方位出牌记录

**Files:**
- Modify: `server.js:100-120`

**Step 1: 修改createRoomState函数，初始化lastPlays**

找到`createRoomState`函数，修改返回对象：

```javascript
function createRoomState(room, players) {
  return {
    roomId: room.id,
    name: room.name,
    maxPlayers: room.maxPlayers,
    status: room.status,
    gameState: room.gameState,
    createdAt: room.createdAt,
    players: players.map(p => ({
      ...p,
      hand: p.hand || []
    })),
    gamePhase: room.gamePhase || 'waiting',
    currentLevel: room.currentLevel || 2,
    currentTurn: room.currentTurn || 0,
    scores: room.scores || { red: 0, blue: 0 },
    lastPlay: room.lastPlay || null,
    lastPlayPlayer: room.lastPlayPlayer || null,
    lastPlays: room.lastPlays || {
      north: null,
      south: null,
      east: null,
      west: null,
    },
    dealer: room.dealer || 0,
    tribute: room.tribute || null,
  };
}
```

**Step 2: 修改game:start事件处理，初始化lastPlays**

找到`socket.on('game:start')`处理器，添加：

```javascript
room.lastPlays = {
  north: null,
  south: null,
  east: null,
  west: null,
};
```

**Step 3: 修改game:play事件处理，记录到对应方位**

找到`socket.on('game:play')`处理器，替换lastPlay更新逻辑：

```javascript
// 确定玩家方位
const player = players[playerIndex];
const position = player.position; // 'north', 'south', 'east', 'west'

// 创建出牌信息
const playInfo = {
  playerId: playerId,
  cards: cards,
  type: 'single', // TODO: 确定实际牌型
  mainRank: cards[0]?.rank || 2,
  timestamp: Date.now(),
  isPass: false
};

// 更新对应方位的出牌记录
room.lastPlays[position] = playInfo;

// 保留lastPlay用于向后兼容
room.lastPlay = playInfo;
room.lastPlayPlayer = playerIndex;
```

**Step 4: 修改game:pass事件处理，记录过牌**

找到`socket.on('game:pass')`处理器，添加：

```javascript
// 确定玩家方位
const player = players[playerIndex];
const position = player.position;

// 记录过牌
room.lastPlays[position] = {
  playerId: playerId,
  cards: [],
  type: 'pass',
  mainRank: 0,
  timestamp: Date.now(),
  isPass: true
};
```

**Step 5: 添加新一轮清除逻辑**

在`game:play`事件中，检测是否新一轮开始：

```javascript
// 检查是否所有人出牌或过牌（新一轮）
const allPlayed = Object.values(room.lastPlays).every(p => p !== null);
if (allPlayed) {
  // 清除旧记录，准备新一轮
  room.lastPlays = {
    north: null,
    south: null,
    east: null,
    west: null,
  };
}
```

**Step 6: 提交**

```bash
git add server.js
git commit -m "feat: server support for lastPlays with four positions"
```

---

## Task 3: 创建PlayedCards组件（单个出牌显示）

**Files:**
- Create: `components/game/PlayedCards.tsx`

**Step 1: 创建组件文件**

```typescript
'use client';

import { Card } from '@/lib/types';

interface PlayedCardsProps {
  cards: Card[];
  playerName: string;
  position: 'north' | 'south' | 'east' | 'west';
  isPass?: boolean;
  isCurrentPlayer?: boolean;
}

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<string, string> = {
  spades: 'text-gray-800',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-800',
};

const rankDisplay: Record<number, string> = {
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '王'
};

export default function PlayedCards({
  cards,
  playerName,
  position,
  isPass = false,
  isCurrentPlayer = false
}: PlayedCardsProps) {
  // 过牌显示
  if (isPass) {
    return (
      <div className={`
        flex flex-col items-center justify-center
        px-4 py-2 rounded-lg
        ${isCurrentPlayer ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-300'}
      `}>
        <span className="text-sm text-gray-600">{playerName}</span>
        <span className="text-lg font-bold text-gray-500">不要</span>
      </div>
    );
  }

  // 显示出牌
  return (
    <div className={`
      flex flex-col items-center
      ${isCurrentPlayer ? 'bg-blue-50 border-2 border-blue-500 rounded-lg p-2' : ''}
    `}>
      <span className="text-xs text-gray-600 mb-1">{playerName}</span>
      <div className="flex gap-0.5">
        {cards.map((card, index) => {
          const displayText = card.rank === 15
            ? (card.suit === 'spades' ? '大王' : '小王')
            : (rankDisplay[card.rank] || card.rank);

          const textColor = card.rank === 15
            ? (card.suit === 'spades' ? 'text-red-600' : 'text-gray-800')
            : suitColors[card.suit];

          return (
            <div
              key={card.id || index}
              className="w-8 h-11 rounded border-2 border-gray-300 bg-white flex flex-col items-center justify-center"
            >
              <span className={`text-xs font-bold ${textColor}`}>
                {displayText}
              </span>
              {card.rank !== 15 && (
                <span className={`text-sm ${textColor}`}>
                  {suitSymbols[card.suit]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add components/game/PlayedCards.tsx
git commit -m "feat: add PlayedCards component for displaying single player's cards"
```

---

## Task 4: 创建CenterPlayArea组件（中央出牌区）

**Files:**
- Create: `components/game/CenterPlayArea.tsx`

**Step 1: 创建组件文件**

```typescript
'use client';

import { RoomState } from '@/lib/types';
import PlayedCards from './PlayedCards';

interface CenterPlayAreaProps {
  roomState: RoomState;
  currentPlayerId: string | null;
}

export default function CenterPlayArea({ roomState, currentPlayerId }: CenterPlayAreaProps) {
  const lastPlays = roomState.lastPlays || {};
  const players = roomState.players || [];

  // 获取各方位的出牌信息
  const getPlayInfo = (position: 'north' | 'south' | 'east' | 'west') => {
    const play = lastPlays[position];
    const player = players.find(p => p.position === position);

    if (!play) return null;

    return {
      cards: play.cards || [],
      playerName: player?.name || '',
      position,
      isPass: play.isPass || false,
      isCurrentPlayer: roomState.currentTurn === players.findIndex(p => p.position === position)
    };
  };

  const northPlay = getPlayInfo('north');
  const southPlay = getPlayInfo('south');
  const eastPlay = getPlayInfo('east');
  const westPlay = getPlayInfo('west');

  // 游戏状态提示
  const getStatusMessage = () => {
    if (roomState.gamePhase === 'waiting') return '等待游戏开始';
    if (roomState.gamePhase === 'playing') {
      const isMyTurn = roomState.currentTurn === players.findIndex(p => p.id === currentPlayerId);
      if (isMyTurn) return '轮到你出牌';
      return '等待其他玩家出牌';
    }
    return '';
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-green-200 to-green-300 rounded-lg border-4 border-green-400 shadow-inner">
      {/* 北家出牌 - 上方居中 */}
      {northPlay && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <PlayedCards {...northPlay} />
        </div>
      )}

      {/* 西家出牌 - 左侧居中 */}
      {westPlay && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <PlayedCards {...westPlay} />
        </div>
      )}

      {/* 东家出牌 - 右侧居中 */}
      {eastPlay && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <PlayedCards {...eastPlay} />
        </div>
      )}

      {/* 南家出牌 - 下方居中 */}
      {southPlay && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <PlayedCards {...southPlay} />
        </div>
      )}

      {/* 中央状态提示 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        {getStatusMessage() && (
          <div className="bg-white bg-opacity-80 px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-700">{getStatusMessage()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add components/game/CenterPlayArea.tsx
git commit -m "feat: add CenterPlayArea component with four-position layout"
```

---

## Task 5: 重构GameRoom布局

**Files:**
- Modify: `components/GameRoom.tsx:200-400`

**Step 1: 导入CenterPlayArea组件**

在文件顶部添加：

```typescript
import CenterPlayArea from './game/CenterPlayArea';
```

**Step 2: 重构主布局结构**

替换整个return语句，使用新的vh高度布局：

```typescript
return (
  <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200">
    <div className="max-w-7xl mx-auto p-4 flex flex-col" style={{ height: '100vh' }}>
      {/* Header - 5% */}
      <div className="flex-none" style={{ height: '5vh' }}>
        <div className="bg-white rounded-lg shadow-md p-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">房间 {roomId}</h1>
            <p className="text-xs text-gray-600">
              {roomState.players.length}/4 玩家 · 级牌 {roomState.currentLevel > 13 ? 'A' : roomState.currentLevel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs">{isConnected ? '已连接' : '未连接'}</span>
            </div>
            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 transition text-sm"
            >
              {isLeaving ? '离开中...' : '离开'}
            </button>
          </div>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="flex-none bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 北玩家 - 10% */}
      <div className="flex-none flex justify-center" style={{ height: '10vh' }}>
        {roomState.players.find(p => p.position === 'north') && (
          <PlayerCard
            player={roomState.players.find(p => p.position === 'north')!}
            isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'north')}
            isSelf={currentPlayer?.position === 'north'}
          />
        )}
      </div>

      {/* 中央区域 - 50% (西玩家 + 出牌区 + 东玩家) */}
      <div className="flex flex-grow" style={{ height: '50vh' }}>
        {/* 西玩家 */}
        <div className="flex-none w-1/6 flex items-center justify-center">
          {roomState.players.find(p => p.position === 'west') && (
            <PlayerCard
              player={roomState.players.find(p => p.position === 'west')!}
              isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'west')}
              isSelf={currentPlayer?.position === 'west'}
            />
          )}
        </div>

        {/* 中央出牌区 */}
        <div className="flex-1 p-2">
          <CenterPlayArea roomState={roomState} currentPlayerId={playerId} />
        </div>

        {/* 东玩家 */}
        <div className="flex-none w-1/6 flex items-center justify-center">
          {roomState.players.find(p => p.position === 'east') && (
            <PlayerCard
              player={roomState.players.find(p => p.position === 'east')!}
              isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'east')}
              isSelf={currentPlayer?.position === 'east'}
            />
          )}
        </div>
      </div>

      {/* 手牌 + 按钮 - 35% */}
      <div className="flex-none" style={{ height: '35vh' }}>
        {roomState.gamePhase === 'playing' && currentPlayer && currentPlayer.hand && (
          <HandCards
            cards={currentPlayer.hand}
            currentLevel={roomState.currentLevel}
            onPlayCards={handlePlayCards}
            onPass={handlePass}
            isCurrentTurn={isCurrentPlayerTurn}
            canPlay={!roomState.lastPlay || roomState.lastPlayPlayer !== roomState.players.findIndex(p => p.id === playerId)}
          />
        )}

        {/* 游戏未开始时的按钮 */}
        {roomState.gamePhase === 'waiting' && (
          <div className="flex gap-4 justify-center items-center h-full">
            {currentPlayer && !currentPlayer.isReady && (
              <button
                onClick={handleReady}
                disabled={!isConnected}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition"
              >
                准备
              </button>
            )}
            {roomState.players.length === 4 && roomState.players.every(p => p.isReady) && (
              <button
                onClick={handleStartGame}
                disabled={!isConnected}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition"
              >
                开始游戏
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
```

**Step 3: 提交**

```bash
git add components/GameRoom.tsx
git commit -m "refactor: restructure GameRoom layout with vh percentages (5%, 10%, 50%, 35%)"
```

---

## Task 6: 调整HandCards组件高度

**Files:**
- Modify: `components/game/HandCards.tsx:109-248`

**Step 1: 修改容器高度**

找到return语句中的主容器div，调整高度：

```typescript
return (
  <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 h-full flex flex-col">
    {/* 手牌标题 */}
    <div className="flex-none mb-2 sm:mb-3 flex items-center justify-between flex-wrap gap-2">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
        手牌 ({cards.length})
      </h3>
      <div className="text-xs sm:text-sm text-gray-600">
        级牌: {rankDisplay[currentLevel] || currentLevel}
      </div>
    </div>

    {/* 手牌区域 - 占据剩余空间 */}
    <div className="flex-1 flex flex-col justify-end min-h-0">
      <div className="flex flex-wrap justify-center gap-0 -ml-2 overflow-y-auto">
        {sortedCards.map((card, index) => {
          // ... 保持原有卡片渲染逻辑
        })}
      </div>
    </div>

    {/* 操作按钮 */}
    {isCurrentTurn && (
      <div className="flex-none flex flex-wrap gap-2 sm:gap-3 justify-center mt-2">
        {/* ... 保持原有按钮逻辑 */}
      </div>
    )}

    {/* 提示信息 */}
    {/* ... 保持原有提示逻辑 */}
  </div>
);
```

**Step 2: 提交**

```bash
git add components/game/HandCards.tsx
git commit -m "refactor: adjust HandCards to use flexible height in 35% container"
```

---

## Task 7: 添加当前回合高亮效果

**Files:**
- Modify: `components/game/PlayerCard.tsx`

**Step 1: 增强高亮效果**

在PlayerCard组件中，当`isCurrentTurn`为true时添加更明显的视觉效果：

```typescript
className={`
  relative p-3 rounded-lg shadow transition-all duration-200
  ${isCurrentTurn
    ? 'bg-blue-50 border-4 border-blue-500 scale-105 shadow-lg'
    : 'bg-white border-2 border-gray-200'
  }
  ${isSelf ? 'ring-2 ring-green-400' : ''}
`}
```

**Step 2: 提交**

```bash
git add components/game/PlayerCard.tsx
git commit -m "style: enhance current turn highlight with blue border and scale"
```

---

## Task 8: 测试和验证

**Files:**
- Test: Manual testing in browser

**Step 1: 重启服务器**

```bash
npx kill-port 3003
node server.js &
```

**Step 2: 打开浏览器测试**

访问 `http://localhost:3003`

**Step 3: 验证布局**

创建4人房间，开始游戏，验证：
- [ ] 头部占约5%高度
- [ ] 北玩家在上方约10%高度
- [ ] 中央出牌区占约50%，西/东玩家在左右
- [ ] 手牌+按钮占约35%
- [ ] 四家出牌环绕显示在中央区域
- [ ] 过牌显示"不要"标签
- [ ] 当前回合玩家高亮

**Step 4: 测试出牌流程**

- [ ] 玩家出牌后，对应位置显示牌面
- [ ] 过牌后显示"不要"
- [ ] 新一轮开始时清除旧记录

**Step 5: 响应式测试**

调整浏览器窗口大小，验证布局适配

**Step 6: 提交最终文档**

```bash
git add docs/plans/2025-02-27-ui-redesign-design.md
git add docs/plans/2025-02-27-ui-redesign-implementation.md
git commit -m "docs: add UI redesign design and implementation plans"
```

---

## 完成标准

- [ ] 布局比例符合设计（5%, 10%, 50%, 35%）
- [ ] 四家出牌环绕显示在中央区域
- [ ] 过牌显示"不要"标签
- [ ] 当前回合高亮效果明显
- [ ] 绿色牌桌风格正确应用
- [ ] 响应式布局正常工作
- [ ] E2E测试仍然通过
