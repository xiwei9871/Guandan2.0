# 掼蛋游戏UI改进设计

**目标:** 改进掼蛋游戏界面布局，提升可玩性和视觉效果

**设计原则:**
- 16:9宽屏比例优化
- 手牌区域占据足够空间，方便查看自己的牌
- 中央出牌区环绕显示四家出牌，清晰直观
- 经典掼蛋游戏风格（绿色牌桌 + 现代卡片）

---

## 布局结构

### 垂直空间分配（总计100%）

```
Header (5%)
├─ 房间信息、连接状态

顶部玩家 (10%)
├─ 北玩家卡片（居中）

中央区域 (50%)
├─ 西玩家卡片（左侧）
├─ 中央出牌区（环绕显示四家出牌）
└─ 东玩家卡片（右侧）

手牌+按钮区 (35%)
├─ 手牌显示区域
└─ 出牌/过牌/清除按钮
```

### 中央出牌区布局

中央出牌区采用环绕式布局，根据玩家位置显示对应出牌：

```
        [北家出牌]
           ↑
           |
[西家出牌] ←   → [东家出牌]
           |
           ↓
        [南家出牌]
```

- 每个出牌显示实际牌面（约原尺寸60-70%）
- 过牌显示"不要"标签
- 当前回合高亮对应位置

---

## 组件设计

### 1. GameRoom 主布局

**文件:** `components/GameRoom.tsx`

**布局结构:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 p-4">
  {/* Header - 5% */}
  <div className="h-[5vh]">...</div>

  {/* 北玩家 - 10% */}
  <div className="h-[10vh]">...</div>

  {/* 中央区域 - 50% */}
  <div className="h-[50vh] flex">
    {/* 西玩家 */}
    <div className="w-1/6">...</div>

    {/* 中央出牌区 */}
    <div className="flex-1 relative">
      {/* 四家出牌环绕显示 */}
    </div>

    {/* 东玩家 */}
    <div className="w-1/6">...</div>
  </div>

  {/* 手牌+按钮 - 35% */}
  <div className="h-[35vh]">
    {/* 手牌区 */}
    <div>...</div>
    {/* 按钮 - 保持现有 */}
    <div>...</div>
  </div>
</div>
```

### 2. 中央出牌区组件

**新文件:** `components/game/CenterPlayArea.tsx`

**Props:**
```tsx
interface CenterPlayAreaProps {
  roomState: RoomState;
  currentPlayerId: string | null;
}
```

**布局实现:**
```tsx
<div className="relative w-full h-full bg-gradient-to-br from-green-200 to-green-300 rounded-lg border-4 border-green-400">
  {/* 北家出牌 - 上方居中 */}
  {northPlay && (
    <div className="absolute top-2 left-1/2 -translate-x-1/2">
      <PlayedCards cards={northPlay} position="north" />
    </div>
  )}

  {/* 西家出牌 - 左侧居中 */}
  {westPlay && (
    <div className="absolute left-2 top-1/2 -translate-y-1/2">
      <PlayedCards cards={westPlay} position="west" />
    </div>
  )}

  {/* 东家出牌 - 右侧居中 */}
  {eastPlay && (
    <div className="absolute right-2 top-1/2 -translate-y-1/2">
      <PlayedCards cards={eastPlay} position="east" />
    </div>
  )}

  {/* 南家出牌 - 下方居中 */}
  {southPlay && (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
      <PlayedCards cards={southPlay} position="south" />
    </div>
  )}

  {/* 中央提示信息 */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
    {/* 游戏状态提示 */}
  </div>
</div>
```

### 3. 出牌显示组件

**新文件:** `components/game/PlayedCards.tsx`

**Props:**
```tsx
interface PlayedCardsProps {
  cards: Card[];
  playerName: string;
  position: 'north' | 'south' | 'east' | 'west';
  isPass?: boolean;
}
```

**显示逻辑:**
- 如果是过牌：显示灰色"不要"标签
- 如果有牌：横向展示牌面，使用70%尺寸
- 支持不同方向的布局调整

### 4. 数据结构调整

**服务器端 (server.js):**

需要修改 `lastPlay` 数据结构，从单一出牌记录改为四家出牌记录：

```js
// 原来的结构
room.lastPlay = {
  playerId: playerId,
  cards: cards,
  type: 'single',
  mainRank: cards[0]?.rank || 2,
  timestamp: Date.now()
};

// 新的结构
room.lastPlays = {
  north: { playerId, cards, type, mainRank, timestamp, isPass } | null,
  south: { playerId, cards, type, mainRank, timestamp, isPass } | null,
  east: { playerId, cards, type, mainRank, timestamp, isPass } | null,
  west: { playerId, cards, type, mainRank, timestamp, isPass } | null,
};
```

**客户端类型定义 (lib/types.ts):**

```tsx
export interface RoomState {
  // ... 其他字段
  lastPlays?: {
    north?: PlayInfo | null;
    south?: PlayInfo | null;
    east?: PlayInfo | null;
    west?: PlayInfo | null;
  };
}

export interface PlayInfo {
  playerId: string;
  cards: Card[];
  type: string;
  mainRank: number;
  timestamp: number;
  isPass?: boolean;
}
```

---

## 实现步骤

### 阶段1: 数据结构改造
1. 修改 server.js，将 `lastPlay` 改为 `lastPlays`（四方位记录）
2. 修改类型定义，添加 `PlayInfo` 和 `lastPlays`
3. 更新出牌逻辑，记录到对应方位

### 阶段2: 组件创建
1. 创建 `CenterPlayArea.tsx` - 中央出牌区组件
2. 创建 `PlayedCards.tsx` - 单个出牌显示组件
3. 更新 `GameRoom.tsx` - 重新组织布局

### 阶段3: 样式优化
1. 调整高度百分比（5%, 10%, 50%, 35%）
2. 优化绿色牌桌背景渐变
3. 添加当前回合高亮效果
4. 确保响应式适配

### 阶段4: 测试验证
1. 启动服务器测试
2. 创建4人房间验证布局
3. 验证出牌环绕显示正确
4. 确认过牌显示"不要"标签

---

## 视觉规范

### 颜色方案
- 背景色: `bg-gradient-to-br from-green-100 to-green-200`
- 中央出牌区: `bg-gradient-to-br from-green-200 to-green-300`
- 边框: `border-green-400`
- 高亮: `border-blue-500`
- 过牌标签: `bg-gray-400 text-gray-700`

### 尺寸规范
- 玩家卡片: 宽度150px, 高度80px
- 出牌卡片: 原尺寸的70%
- 手牌卡片: 保持当前大小
- 按钮: 保持当前大小

### 响应式
- 桌面端: 使用vh百分比布局
- 移动端: 使用flex布局自动调整
