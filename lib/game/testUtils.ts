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
