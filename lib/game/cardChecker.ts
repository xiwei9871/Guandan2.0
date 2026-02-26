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
    if (isStraight && sortedRanks[sortedRanks.length - 1] <= 13) {
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
