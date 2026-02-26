import { describe, it, expect } from '@jest/globals';
import { CardType } from '../../types';
import { detectCardType, canBeat } from '../cardChecker';
import { createCard } from '../testUtils';

describe('CardType Detection', () => {
  it('should detect single card', () => {
    const cards = [createCard('hearts', 5)];
    expect(detectCardType(cards)).toEqual({
      type: CardType.SINGLE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect pair', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.PAIR,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect bomb', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('clubs', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.BOMB,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect straight (5 cards)', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('hearts', 4),
      createCard('hearts', 5),
      createCard('hearts', 6),
      createCard('hearts', 7)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.STRAIGHT,
      mainRank: 7,
      valid: true
    });
  });

  it('should detect invalid straight with less than 5 cards', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('hearts', 4),
      createCard('hearts', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: null,
      mainRank: 0,
      valid: false
    });
  });

  it('should detect pair straight (3 pairs)', () => {
    const cards = [
      createCard('hearts', 3),
      createCard('spades', 3),
      createCard('hearts', 4),
      createCard('spades', 4),
      createCard('hearts', 5),
      createCard('spades', 5)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.PAIR_STRAIGHT,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple with one', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('hearts', 3)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE_WITH_ONE,
      mainRank: 5,
      valid: true
    });
  });

  it('should detect triple with pair', () => {
    const cards = [
      createCard('hearts', 5),
      createCard('spades', 5),
      createCard('diamonds', 5),
      createCard('hearts', 3),
      createCard('spades', 3)
    ];
    expect(detectCardType(cards)).toEqual({
      type: CardType.TRIPLE_WITH_PAIR,
      mainRank: 5,
      valid: true
    });
  });
});

describe('Can Beat', () => {
  it('should allow higher single to beat lower single', () => {
    const lastPlay = {
      type: CardType.SINGLE,
      mainRank: 5,
      cards: [createCard('hearts', 5)]
    };
    const newCards = [createCard('hearts', 6)];
    expect(canBeat(newCards, lastPlay, 2)).toBe(true);
  });

  it('should not allow lower single to beat higher single', () => {
    const lastPlay = {
      type: CardType.SINGLE,
      mainRank: 5,
      cards: [createCard('hearts', 5)]
    };
    const newCards = [createCard('hearts', 4)];
    expect(canBeat(newCards, lastPlay, 2)).toBe(false);
  });

  it('should allow bomb to beat any non-bomb', () => {
    const lastPlay = {
      type: CardType.STRAIGHT,
      mainRank: 7,
      cards: []
    };
    const bombCards = [
      createCard('hearts', 4),
      createCard('spades', 4),
      createCard('diamonds', 4),
      createCard('clubs', 4)
    ];
    expect(canBeat(bombCards, lastPlay, 2)).toBe(true);
  });
});
