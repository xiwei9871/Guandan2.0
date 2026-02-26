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
  return cards.map(card => ({
    type: CardType.SINGLE,
    cards: [card],
    mainRank: card.rank,
    description: `单张 ${card.rank}`
  }));
}

function getPairPlays(rankMap: Map<number, Card[]>): CardPlayOption[] {
  const plays: CardPlayOption[] = [];
  for (const [rank, cards] of Array.from(rankMap.entries())) {
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
  for (const [rank, cards] of Array.from(rankMap.entries())) {
    if (cards.length >= 4) {
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
    .filter(r => r <= 13) // 不能包含2和王
    .sort((a, b) => a - b);

  // 查找连续的rank序列
  for (let start = 0; start < sortedRanks.length; start++) {
    for (let length = 5; length <= sortedRanks.length - start; length++) {
      const sequence = sortedRanks.slice(start, start + length);
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

    // 炸弹可以打任何非炸弹
    if (play.type === CardType.BOMB && lastPlay.type !== CardType.BOMB) {
      return true;
    }

    // 必须是同类型且rank更大
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
