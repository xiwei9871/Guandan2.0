import { CardType, type Card } from '../types';

interface RuntimeTypeResult {
  type: string | null;
  mainRank: number;
  valid: boolean;
}

interface RuntimeModule {
  detectCardType: (cards: Card[]) => RuntimeTypeResult;
  canBeat: (
    newCards: Card[],
    lastPlay: { type: string; mainRank: number; cards: Card[] },
    currentLevel: number
  ) => boolean;
}

const runtime = require('./cardChecker.runtime.js') as RuntimeModule;

export interface CardTypeResult {
  type: CardType | null;
  mainRank: number;
  valid: boolean;
}

export function detectCardType(cards: Card[]): CardTypeResult {
  const result = runtime.detectCardType(cards);
  const normalizedType =
    result.valid && result.type && Object.values(CardType).includes(result.type as CardType)
      ? (result.type as CardType)
      : null;

  return {
    type: normalizedType,
    mainRank: result.mainRank,
    valid: result.valid && normalizedType !== null,
  };
}

export function canBeat(
  newCards: Card[],
  lastPlay: { type: CardType; mainRank: number; cards: Card[] },
  currentLevel: number
): boolean {
  return runtime.canBeat(newCards, lastPlay, currentLevel);
}
