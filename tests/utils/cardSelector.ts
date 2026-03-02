// tests/utils/cardSelector.ts
import { Card, CardType, type Play } from '../../lib/types';
import { detectCardType } from '../../lib/game/cardChecker';

export interface CardPlayOption {
  type: CardType;
  cards: Card[];
  mainRank: number;
  description: string;
}

function groupCardsByRank(cards: Card[]): Map<number, Card[]> {
  const rankMap = new Map<number, Card[]>();
  for (const card of cards) {
    if (!rankMap.has(card.rank)) {
      rankMap.set(card.rank, []);
    }
    rankMap.get(card.rank)!.push(card);
  }
  return rankMap;
}

function findSuitsWithCount(cards: Card[], rank: number, count: number): Card[] {
  return cards.filter(c => c.rank === rank).slice(0, count);
}

function getSinglePlays(cards: Card[]): CardPlayOption[] {
  return cards
    .filter(card => card.rank !== 15) // Exclude jokers from single plays (save for bombs)
    .map(card => ({
      type: CardType.SINGLE,
      cards: [card],
      mainRank: card.rank,
      description: `单张 ${card.rank}`
    }));
}

function getPairPlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of Array.from(rankMap.entries())) {
    // Skip jokers for pair plays
    if (rank === 15) continue;
    if (cards.length >= 2) {
      plays.push({
        type: CardType.PAIR,
        cards: cards.slice(0, 2),
        mainRank: rank,
        description: `对子 ${rank}`
      });
    }
  }
  return plays;
}

function getTriplePlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of Array.from(rankMap.entries())) {
    // Skip jokers for triple plays
    if (rank === 15) continue;
    if (cards.length >= 3) {
      plays.push({
        type: CardType.TRIPLE,
        cards: cards.slice(0, 3),
        mainRank: rank,
        description: `三张 ${rank}`
      });
    }
  }
  return plays;
}

function getBombPlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];

  // Check for 王炸 first - one big joker and one small joker
  const bigJoker = rankMap.get(15)?.filter(c => c.suit === 'spades') || [];
  const smallJoker = rankMap.get(15)?.filter(c => c.suit === 'hearts') || [];
  if (bigJoker.length > 0 && smallJoker.length > 0) {
    plays.push({
      type: CardType.BOMB,
      cards: [bigJoker[0], smallJoker[0]],
      mainRank: 999, // 王炸 is highest
      description: '王炸'
    });
  }

  // Regular bombs - 4 cards of same rank
  for (const [rank, cards] of Array.from(rankMap.entries())) {
    if (rank !== 15 && cards.length >= 4) {
      plays.push({
        type: CardType.BOMB,
        cards: cards.slice(0, 4),
        mainRank: rank,
        description: `炸弹 ${rank}`
      });
    }
  }
  return plays;
}

function getStraightPlays(cards: Card[]): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  const rankMap = groupCardsByRank(cards);
  const sortedRanks = Array.from(rankMap.keys())
    .filter(r => r <= 14 && r !== 15) // 不能包含2和王（rank 15 is joker）
    .sort((a, b) => a - b);

  // 查找连续的5张rank序列
  // 掼蛋规则：顺子只能是5张，不是更多也不是更少
  const STRAIGHT_LENGTH = 5;

  for (let start = 0; start <= sortedRanks.length - STRAIGHT_LENGTH; start++) {
    const sequence = sortedRanks.slice(start, start + STRAIGHT_LENGTH);
    if (isConsecutive(sequence)) {
      const straightCards: Card[] = [];
      for (const rank of sequence) {
        straightCards.push(rankMap.get(rank)![0]); // 取每种rank的一张
      }
      plays.push({
        type: CardType.STRAIGHT,
        cards: straightCards,
        mainRank: sequence[sequence.length - 1],
        description: `顺子 ${sequence[0]}-${sequence[sequence.length - 1]}`
      });
    }
  }
  return plays;
}

function isConsecutive(ranks: number[]): boolean {
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i-1] !== 1) {
      return false;
    }
  }
  return true;
}

export function getAllPossiblePlays(hand: Card[]): CardPlayOption[] {
  const rankMap = groupCardsByRank(hand);
  const plays: CardPlayOption[] = [];

  // 添加各种牌型
  plays.push(...getSinglePlays(hand));
  plays.push(...getPairPlays(rankMap));
  plays.push(...getTriplePlays(rankMap));
  plays.push(...getBombPlays(rankMap));
  plays.push(...getStraightPlays(hand));

  return plays;
}

export function getValidPlays(
  hand: Card[],
  lastPlay: { type: CardType; mainRank: number; cards: Card[] } | null,
  currentLevel: number
): CardPlayOption[] {
  const allPlays = getAllPossiblePlays(hand);

  // 如果是首出（没有上家出牌），所有牌都合法
  if (!lastPlay) {
    return allPlays;
  }

  // 过滤能打过上家的牌
  return allPlays.filter(play => {
    const detection = detectCardType(play.cards);

    if (!detection.valid) {
      return false;
    }

    // 王炸 can beat anything
    if (play.mainRank === 999) {
      return true;
    }

    // Bombs can beat non-bombs
    if (play.type === CardType.BOMB && lastPlay.type !== CardType.BOMB) {
      return true;
    }

    // Must be same type and higher rank (except for bombs)
    if (play.type === lastPlay.type && play.cards.length === lastPlay.cards.length) {
      return play.mainRank > lastPlay.mainRank;
    }

    return false;
  });
}

export function selectRandomPlay(validPlays: CardPlayOption[]): CardPlayOption | null {
  if (validPlays.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * validPlays.length);
  return validPlays[randomIndex];
}

export function shouldPass(validPlays: CardPlayOption[], isFirstPlay: boolean): boolean {
  // 如果没有合法出牌，必须过牌
  if (validPlays.length === 0) {
    return true;
  }

  // 如果是首出，不能过牌
  if (isFirstPlay) {
    return false;
  }

  // 30%概率主动过牌
  return Math.random() < 0.3;
}
