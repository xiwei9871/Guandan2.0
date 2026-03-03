export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Position = 'south' | 'west' | 'north' | 'east';

export type Team = 'red' | 'blue';

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
  STRAIGHT_FLUSH = 'straight_flush',
}

export interface Card {
  id: string;
  suit: Suit;
  rank: number;
  levelCard: boolean;
  isWildcard: boolean;
}

export interface Player {
  id: string;
  clientId?: string;
  name: string;
  position: Position;
  team: Team;
  hand: Card[];
  isReady: boolean;
  cardsRemaining: number;
  rank?: 1 | 2 | 3 | 4;
}

export interface Play {
  playerId: string;
  cards: Card[];
  type: CardType;
  mainRank: number;
  timestamp: number;
}

export type GamePhase = 'waiting' | 'tributing' | 'playing' | 'finished';

export interface TributeState {
  fromPlayer: string | null;
  toPlayer: string | null;
  cards: Card[];
  phase: 'giving' | 'returning';
  mode?: 'double' | 'single' | 'inner';
  exempt?: boolean;
  giverOrder?: string[];
  receiverOrder?: string[];
  pendingGives?: Array<{
    fromPlayerId: string;
    toPlayerId?: string | null;
    card?: Card | null;
  }>;
  resolvedGives?: Array<{
    fromPlayerId: string;
    toPlayerId?: string | null;
    card: Card;
  }>;
  pendingReturns?: Array<{
    fromPlayerId: string;
    toPlayerId: string;
  }>;
  resolvedReturns?: Array<{
    fromPlayerId: string;
    toPlayerId: string;
    card: Card;
  }>;
  revealedActions?: Array<{
    kind: 'tribute' | 'return';
    fromPlayerId: string;
    toPlayerId?: string | null;
    card: Card;
  }>;
  leadPlayerId?: string | null;
}

export interface PlayInfo {
  playerId: string;
  cards: Card[];
  type: string;
  mainRank: number;
  timestamp: number;
  isPass?: boolean;
}

export interface SettlementResult {
  winner: Team;
  levelChange: number;
  redRanks: number[];
  blueRanks: number[];
}

export interface RoomState {
  roomId: string;
  ownerId?: string | null;
  players: Player[];
  currentLevel: number;
  currentTurn: number;
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  lastPlays?: {
    north?: PlayInfo | null;
    south?: PlayInfo | null;
    east?: PlayInfo | null;
    west?: PlayInfo | null;
  };
  gamePhase: GamePhase;
  scores: {
    red: number;
    blue: number;
  };
  tribute: TributeState | null;
  dealer: number;
  result?: SettlementResult | null;
}

export interface Room {
  id: string;
  name: string;
  ownerId?: string | null;
  maxPlayers: 4;
  status: 'waiting' | 'playing' | 'finished';
  gameState: RoomState | null;
  createdAt: number;
}
