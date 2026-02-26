import type { Card, Suit } from '../types';
import { SUITS, RANKS } from '../constants';

/**
 * 创建一副或多副扑克牌
 * @param numDecks 牌组数量（默认2副牌=108张）
 * @returns 扑克牌数组
 */
export function createDeck(numDecks: number = 2): Card[] {
  const deck: Card[] = [];
  let cardId = 0;

  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `card-${d}-${suit}-${rank}-${cardId++}`,
          suit,
          rank,
          levelCard: false,
          isWildcard: false,
        });
      }
    }
    // 添加大小王
    deck.push({
      id: `card-${d}-joker-big-${cardId++}`,
      suit: 'spades', // 大王用黑桃表示
      rank: 14,
      levelCard: false,
      isWildcard: false,
    });
    deck.push({
      id: `card-${d}-joker-small-${cardId++}`,
      suit: 'hearts', // 小王用红桃表示
      rank: 14,
      levelCard: false,
      isWildcard: false,
    });
  }

  return deck;
}

/**
 * Fisher-Yates 洗牌算法
 * @param deck 扑克牌数组
 * @returns 洗牌后的扑克牌数组
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 发牌
 * @param deck 扑克牌数组
 * @param numPlayers 玩家数量（4人）
 * @param cardsPerPlayer 每人牌数（27张）
 * @returns 每个玩家的手牌
 */
export function dealCards(
  deck: Card[],
  numPlayers: number = 4,
  cardsPerPlayer: number = 27
): Card[][] {
  if (deck.length < numPlayers * cardsPerPlayer) {
    throw new Error('Not enough cards to deal');
  }

  const hands: Card[][] = [];
  for (let i = 0; i < numPlayers; i++) {
    hands.push(deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer));
  }

  return hands;
}

/**
 * 设置级牌和逢人配（红桃级牌）
 * @param cards 扑克牌数组
 * @param level 当前等级（2-14）
 * @returns 处理后的扑克牌数组
 */
export function setLevelCards(cards: Card[], level: number): Card[] {
  return cards.map(card => {
    // 标记级牌
    const isLevelCard = card.rank === level;
    // 标记逢人配（红桃级牌）
    const isWildcard = isLevelCard && card.suit === 'hearts';

    return {
      ...card,
      levelCard: isLevelCard,
      isWildcard,
    };
  });
}

/**
 * 排序手牌（按花色和点数）
 * @param cards 手牌
 * @returns 排序后的手牌
 */
export function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    spades: 4,
    hearts: 3,
    diamonds: 2,
    clubs: 1,
  };

  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[b.suit] - suitOrder[a.suit];
    }
    return b.rank - a.rank;
  });
}
