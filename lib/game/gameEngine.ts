import type { RoomState, Player, Card, Play, GamePhase } from '../types';
import { CardType } from '../types';
import { detectCardType, canBeat } from './cardChecker';
import { createDeck, shuffleDeck, dealCards, setLevelCards, sortHand } from './deck';

/**
 * 游戏初始化结果
 */
export interface GameInitResult {
  gameState: RoomState;
  hands: Card[][];
}

/**
 * 玩家出牌结果
 */
export interface PlayResult {
  success: boolean;
  gameState?: RoomState;
  error?: string;
}

/**
 * 游戏结束结果
 */
export interface GameEndResult {
  winner: 'red' | 'blue';
  levelChange: number;
  redRanks: number[];
  blueRanks: number[];
}

/**
 * 初始化游戏
 * @param roomId 房间ID
 * @param players 玩家列表
 * @param currentLevel 当前等级
 * @returns 游戏初始化结果
 */
export function initializeGame(
  roomId: string,
  players: Player[],
  currentLevel: number
): GameInitResult {
  // 创建并洗牌
  const deck = createDeck(2);
  const shuffledDeck = shuffleDeck(deck);

  // 设置级牌
  const deckWithLevelCards = setLevelCards(shuffledDeck, currentLevel);

  // 发牌
  const hands = dealCards(deckWithLevelCards, 4, 27);

  // 排序手牌
  for (let i = 0; i < hands.length; i++) {
    hands[i] = sortHand(hands[i]);
  }

  // 创建游戏状态
  const gameState: RoomState = {
    roomId,
    players: players.map((player, index) => ({
      ...player,
      hand: hands[index],
      cardsRemaining: hands[index].length,
    })),
    currentLevel,
    currentTurn: 0, // 从第一个玩家开始
    lastPlay: null,
    lastPlayPlayer: null,
    gamePhase: 'playing',
    scores: {
      red: 0,
      blue: 0,
    },
    tribute: null,
    dealer: 0, // 第一个玩家为庄家
  };

  return { gameState, hands };
}

/**
 * 处理玩家出牌
 * @param gameState 当前游戏状态
 * @param playerIndex 玩家索引
 * @param cards 要出的牌
 * @returns 出牌结果
 */
export function handlePlayerPlay(
  gameState: RoomState,
  playerIndex: number,
  cards: Card[]
): PlayResult {
  // 验证游戏阶段
  if (gameState.gamePhase !== 'playing') {
    return {
      success: false,
      error: '游戏未进行中',
    };
  }

  // 验证是否轮到该玩家
  if (gameState.currentTurn !== playerIndex) {
    return {
      success: false,
      error: '未轮到该玩家',
    };
  }

  const player = gameState.players[playerIndex];

  // 验证玩家手牌中是否有这些牌
  const playerHandCardIds = new Set(player.hand.map(c => c.id));
  const invalidCards = cards.filter(c => !playerHandCardIds.has(c.id));
  if (invalidCards.length > 0) {
    return {
      success: false,
      error: '玩家手牌中没有这些牌',
    };
  }

  // 检测牌型
  const cardTypeResult = detectCardType(cards);
  if (!cardTypeResult.valid) {
    return {
      success: false,
      error: '无效的牌型',
    };
  }

  // 验证是否能打过上一手牌
  if (gameState.lastPlay && gameState.lastPlayPlayer !== null) {
    // 如果不是自己接自己的牌
    if (gameState.lastPlayPlayer !== playerIndex) {
      const canBeatLastPlay = canBeat(
        cards,
        {
          type: gameState.lastPlay.type,
          mainRank: gameState.lastPlay.mainRank,
          cards: gameState.lastPlay.cards,
        },
        gameState.currentLevel
      );

      if (!canBeatLastPlay) {
        return {
          success: false,
          error: '打不过上一手牌',
        };
      }
    }
  }

  // 出牌成功，更新游戏状态
  const newGameState = { ...gameState };

  // 从玩家手牌中移除出的牌
  newGameState.players = newGameState.players.map((p, idx) => {
    if (idx === playerIndex) {
      const playedCardIds = new Set(cards.map(c => c.id));
      const newHand = p.hand.filter(c => !playedCardIds.has(c.id));
      return {
        ...p,
        hand: newHand,
        cardsRemaining: newHand.length,
      };
    }
    return p;
  });

  // 记录出牌
  const play: Play = {
    playerId: player.id,
    cards,
    type: cardTypeResult.type!,
    mainRank: cardTypeResult.mainRank,
    timestamp: Date.now(),
  };

  newGameState.lastPlay = play;
  newGameState.lastPlayPlayer = playerIndex;

  // 检查玩家是否出完牌
  const currentPlayer = newGameState.players[playerIndex];
  if (currentPlayer.cardsRemaining === 0) {
    // 玩家出完牌，设置排名
    const finishedPlayers = newGameState.players.filter(p => p.rank !== undefined);
    const rank = (finishedPlayers.length + 1) as 1 | 2 | 3 | 4;

    newGameState.players[playerIndex] = {
      ...currentPlayer,
      rank,
    };

    // 检查游戏是否结束
    if (finishedPlayers.length >= 2) {
      // 已经有3人出完，游戏结束
      const endResult = handleGameEnd(newGameState);
      newGameState.scores.red += endResult.levelChange > 0 ? endResult.levelChange : 0;
      newGameState.scores.blue += endResult.levelChange < 0 ? -endResult.levelChange : 0;
      newGameState.gamePhase = 'finished';
    } else if (finishedPlayers.length === 1) {
      // 第2个出完的，继续游戏
      const nextPlayer = getNextPlayer(newGameState, playerIndex);
      newGameState.currentTurn = nextPlayer;
    } else {
      // 第1个出完的，继续游戏
      const nextPlayer = getNextPlayer(newGameState, playerIndex);
      newGameState.currentTurn = nextPlayer;
    }
  } else {
    // 正常出牌，下一个人
    const nextPlayer = getNextPlayer(newGameState, playerIndex);
    newGameState.currentTurn = nextPlayer;
  }

  return {
    success: true,
    gameState: newGameState,
  };
}

/**
 * 处理玩家跳过
 * @param gameState 当前游戏状态
 * @param playerIndex 玩家索引
 * @returns 跳过结果
 */
export function handlePlayerPass(
  gameState: RoomState,
  playerIndex: number
): PlayResult {
  // 验证游戏阶段
  if (gameState.gamePhase !== 'playing') {
    return {
      success: false,
      error: '游戏未进行中',
    };
  }

  // 验证是否轮到该玩家
  if (gameState.currentTurn !== playerIndex) {
    return {
      success: false,
      error: '未轮到该玩家',
    };
  }

  // 如果没有人出过牌，不能跳过
  if (!gameState.lastPlay || gameState.lastPlayPlayer === null) {
    return {
      success: false,
      error: '必须出牌',
    };
  }

  // 如果是自己接自己的牌（其他人都跳过了），不能跳过
  if (gameState.lastPlayPlayer === playerIndex) {
    return {
      success: false,
      error: '必须出牌',
    };
  }

  // 跳过成功，下一个人
  const newGameState = { ...gameState };
  const nextPlayer = getNextPlayer(newGameState, playerIndex);
  newGameState.currentTurn = nextPlayer;

  // 如果回到出牌的人，清空上一手牌
  if (nextPlayer === gameState.lastPlayPlayer) {
    newGameState.lastPlay = null;
    newGameState.lastPlayPlayer = null;
  }

  return {
    success: true,
    gameState: newGameState,
  };
}

/**
 * 获取下一个玩家
 * @param gameState 游戏状态
 * @param currentPlayerIndex 当前玩家索引
 * @returns 下一个玩家索引
 */
function getNextPlayer(gameState: RoomState, currentPlayerIndex: number): number {
  for (let i = 1; i <= 3; i++) {
    const nextIndex = (currentPlayerIndex + i) % 4;
    const player = gameState.players[nextIndex];

    // 只有没有出完牌的玩家才能出牌
    if (player.cardsRemaining > 0) {
      return nextIndex;
    }
  }

  return currentPlayerIndex;
}

/**
 * 处理游戏结束
 * @param gameState 游戏状态
 * @returns 游戏结束结果
 */
export function handleGameEnd(gameState: RoomState): GameEndResult {
  // 获取所有玩家的排名
  const rankedPlayers = gameState.players
    .filter(p => p.rank !== undefined)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  if (rankedPlayers.length < 3) {
    throw new Error('游戏尚未结束');
  }

  const firstPlace = rankedPlayers[0];
  const lastPlace = rankedPlayers[rankedPlayers.length - 1];

  // 计算升级规则
  let levelChange = 0;
  let winner: 'red' | 'blue';

  // 获取各队排名
  const redRanks = gameState.players
    .filter(p => p.team === 'red' && p.rank !== undefined)
    .map(p => p.rank!)
    .sort((a, b) => a - b);

  const blueRanks = gameState.players
    .filter(p => p.team === 'blue' && p.rank !== undefined)
    .map(p => p.rank!)
    .sort((a, b) => a - b);

  // 判断升级
  if (firstPlace.team === lastPlace.team) {
    // 头游和末游同队，不升级
    levelChange = 0;
    winner = firstPlace.team === 'red' ? 'blue' : 'red';
  } else {
    // 头游和末游不同队
    winner = firstPlace.team;

    const secondPlace = rankedPlayers[1];
    const thirdPlace = rankedPlayers[2];

    if (secondPlace.team === firstPlace.team) {
      // 头游+二游同队 → +3级
      levelChange = 3;
    } else if (thirdPlace.team === firstPlace.team) {
      // 头游+三游同队 → +2级
      levelChange = 2;
    } else {
      // 头游+末游同队 → +1级（但已经排除头游末游同队的情况）
      // 所以这里是头游不同队，二游不同队，三游不同队 → +1级
      levelChange = 1;
    }
  }

  return {
    winner,
    levelChange,
    redRanks,
    blueRanks,
  };
}

/**
 * 处理玩家出完牌
 * @param gameState 游戏状态
 * @param playerIndex 玩家索引
 * @returns 更新后的游戏状态
 */
export function handlePlayerOut(
  gameState: RoomState,
  playerIndex: number
): RoomState {
  const player = gameState.players[playerIndex];

  if (player.cardsRemaining > 0) {
    throw new Error('玩家仍有手牌');
  }

  const finishedPlayers = gameState.players.filter(p => p.rank !== undefined);
  const rank = (finishedPlayers.length + 1) as 1 | 2 | 3 | 4;

  const newGameState = { ...gameState };
  newGameState.players = newGameState.players.map((p, idx) => {
    if (idx === playerIndex) {
      return {
        ...p,
        rank,
      };
    }
    return p;
  });

  return newGameState;
}

/**
 * 计算下一个等级
 * @param currentLevel 当前等级
 * @param levelChange 升级数
 * @returns 新等级
 */
export function calculateNextLevel(currentLevel: number, levelChange: number): number {
  let newLevel = currentLevel + levelChange;

  // 限制等级范围 2-14 (A)
  if (newLevel < 2) newLevel = 2;
  if (newLevel > 14) newLevel = 14;

  return newLevel;
}

/**
 * 验证玩家是否可以出牌
 * @param gameState 游戏状态
 * @param playerIndex 玩家索引
 * @returns 是否可以出牌
 */
export function canPlayerPlay(gameState: RoomState, playerIndex: number): boolean {
  if (gameState.gamePhase !== 'playing') {
    return false;
  }

  if (gameState.currentTurn !== playerIndex) {
    return false;
  }

  const player = gameState.players[playerIndex];
  return player.cardsRemaining > 0;
}

/**
 * 验证玩家是否可以跳过
 * @param gameState 游戏状态
 * @param playerIndex 玩家索引
 * @returns 是否可以跳过
 */
export function canPlayerPass(gameState: RoomState, playerIndex: number): boolean {
  if (gameState.gamePhase !== 'playing') {
    return false;
  }

  if (gameState.currentTurn !== playerIndex) {
    return false;
  }

  // 必须有人出过牌才能跳过
  if (!gameState.lastPlay || gameState.lastPlayPlayer === null) {
    return false;
  }

  // 不能跳过自己出的牌
  if (gameState.lastPlayPlayer === playerIndex) {
    return false;
  }

  return true;
}
