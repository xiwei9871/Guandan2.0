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
