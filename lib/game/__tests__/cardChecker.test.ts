import { describe, it, expect } from '@jest/globals';
import { CardType } from '../../types';
import { detectCardType, canBeat } from '../cardChecker';
import { createCard } from '../testUtils';

function createWildcardCard(rank = 2, id = `wild-heart-${rank}`) {
  return {
    id,
    suit: 'hearts' as const,
    rank,
    levelCard: true,
    isWildcard: true,
  };
}

describe('Strict Guandan Card Type Detection', () => {
  it('detects single, pair, triple, and triple-with-pair', () => {
    expect(detectCardType([createCard('hearts', 5)])).toEqual({
      type: CardType.SINGLE,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([createCard('hearts', 5), createCard('spades', 5)])
    ).toEqual({
      type: CardType.PAIR,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 5),
        createCard('spades', 5),
        createCard('diamonds', 5),
      ])
    ).toEqual({
      type: CardType.TRIPLE,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 3),
        createCard('diamonds', 3),
        createCard('hearts', 4),
        createCard('spades', 4),
      ])
    ).toEqual({
      type: CardType.TRIPLE_WITH_PAIR,
      mainRank: 3,
      valid: true,
    });
  });

  it('rejects triple-with-one under strict rules', () => {
    expect(
      detectCardType([
        createCard('hearts', 5),
        createCard('spades', 5),
        createCard('diamonds', 5),
        createCard('hearts', 7),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });
  });

  it('validates straight as exactly 5 cards and supports A2345 / 10JQKA', () => {
    expect(
      detectCardType([
        createCard('hearts', 14),
        createCard('spades', 2),
        createCard('hearts', 3),
        createCard('clubs', 4),
        createCard('diamonds', 5),
      ])
    ).toEqual({
      type: CardType.STRAIGHT,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 10),
        createCard('spades', 11),
        createCard('hearts', 12),
        createCard('clubs', 13),
        createCard('diamonds', 14),
      ])
    ).toEqual({
      type: CardType.STRAIGHT,
      mainRank: 14,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 4),
        createCard('hearts', 5),
        createCard('clubs', 6),
        createCard('diamonds', 7),
        createCard('hearts', 8),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });
  });

  it('validates pair-straight as exactly 3 consecutive pairs and rejects 998866', () => {
    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 3),
        createCard('hearts', 4),
        createCard('spades', 4),
        createCard('hearts', 5),
        createCard('spades', 5),
      ])
    ).toEqual({
      type: CardType.PAIR_STRAIGHT,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 9),
        createCard('spades', 9),
        createCard('hearts', 8),
        createCard('spades', 8),
        createCard('hearts', 6),
        createCard('spades', 6),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });

    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 3),
        createCard('hearts', 4),
        createCard('spades', 4),
        createCard('hearts', 5),
        createCard('spades', 5),
        createCard('hearts', 6),
        createCard('spades', 6),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });
  });

  it('validates steel plate as exactly two consecutive triples', () => {
    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 3),
        createCard('diamonds', 3),
        createCard('hearts', 4),
        createCard('spades', 4),
        createCard('diamonds', 4),
      ])
    ).toEqual({
      type: CardType.TRIPLE_STRAIGHT,
      mainRank: 4,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 3),
        createCard('spades', 3),
        createCard('diamonds', 3),
        createCard('hearts', 4),
        createCard('spades', 4),
        createCard('diamonds', 4),
        createCard('hearts', 5),
        createCard('spades', 5),
        createCard('diamonds', 5),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });
  });

  it('detects straight flush and four-joker rocket', () => {
    expect(
      detectCardType([
        createCard('hearts', 10),
        createCard('hearts', 11),
        createCard('hearts', 12),
        createCard('hearts', 13),
        createCard('hearts', 14),
      ])
    ).toEqual({
      type: CardType.STRAIGHT_FLUSH,
      mainRank: 14,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('spades', 15),
        createCard('spades', 15),
        createCard('hearts', 15),
        createCard('hearts', 15),
      ])
    ).toEqual({
      type: CardType.ROCKET,
      mainRank: 17,
      valid: true,
    });
  });

  it('treats heart level wildcards as matching rank for same-point groups', () => {
    const wildcard = createWildcardCard();

    const fiveBomb = [
      createCard('spades', 13),
      createCard('hearts', 13),
      createCard('diamonds', 13),
      createCard('clubs', 13),
      wildcard,
    ];

    expect(detectCardType(fiveBomb)).toEqual({
      type: CardType.BOMB,
      mainRank: 13,
      valid: true,
    });
  });

  it('allows wildcards to extend same-point bombs up to nine and ten cards', () => {
    const nineBomb = [
      createCard('spades', 9),
      createCard('spades', 9),
      createCard('hearts', 9),
      createCard('hearts', 9),
      createCard('diamonds', 9),
      createCard('diamonds', 9),
      createCard('clubs', 9),
      createWildcardCard(2, 'wild-nine-bomb-1'),
      createWildcardCard(2, 'wild-nine-bomb-2'),
    ];

    const tenBomb = [
      createCard('spades', 10),
      createCard('spades', 10),
      createCard('hearts', 10),
      createCard('hearts', 10),
      createCard('diamonds', 10),
      createCard('diamonds', 10),
      createCard('clubs', 10),
      createCard('clubs', 10),
      createWildcardCard(2, 'wild-ten-bomb-1'),
      createWildcardCard(2, 'wild-ten-bomb-2'),
    ];

    expect(detectCardType(nineBomb)).toEqual({
      type: CardType.BOMB,
      mainRank: 9,
      valid: true,
    });

    expect(detectCardType(tenBomb)).toEqual({
      type: CardType.BOMB,
      mainRank: 10,
      valid: true,
    });
  });

  it('lets heart level wildcards complete pair, triple, and triple-with-pair', () => {
    const wildcard = createWildcardCard();

    expect(
      detectCardType([createCard('spades', 9), wildcard])
    ).toEqual({
      type: CardType.PAIR,
      mainRank: 9,
      valid: true,
    });

    expect(
      detectCardType([createCard('spades', 11), createCard('clubs', 11), wildcard])
    ).toEqual({
      type: CardType.TRIPLE,
      mainRank: 11,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('spades', 7),
        createCard('clubs', 7),
        wildcard,
        createCard('spades', 4),
        createCard('clubs', 4),
      ])
    ).toEqual({
      type: CardType.TRIPLE_WITH_PAIR,
      mainRank: 7,
      valid: true,
    });
  });

  it('lets heart level wildcards complete straight, pair-straight, steel plate, and straight flush', () => {
    expect(
      detectCardType([
        createCard('spades', 10),
        createCard('clubs', 11),
        createCard('diamonds', 12),
        createCard('hearts', 13),
        createWildcardCard(2, 'wild-straight'),
      ])
    ).toEqual({
      type: CardType.STRAIGHT,
      mainRank: 14,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('spades', 3),
        createCard('clubs', 3),
        createCard('spades', 4),
        createCard('clubs', 4),
        createCard('spades', 5),
        createWildcardCard(2, 'wild-pair-straight'),
      ])
    ).toEqual({
      type: CardType.PAIR_STRAIGHT,
      mainRank: 5,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('spades', 6),
        createCard('clubs', 6),
        createCard('diamonds', 6),
        createCard('spades', 7),
        createCard('clubs', 7),
        createWildcardCard(2, 'wild-triple-straight'),
      ])
    ).toEqual({
      type: CardType.TRIPLE_STRAIGHT,
      mainRank: 7,
      valid: true,
    });

    expect(
      detectCardType([
        createCard('hearts', 10),
        createCard('hearts', 11),
        createCard('hearts', 12),
        createCard('hearts', 13),
        createWildcardCard(2, 'wild-straight-flush'),
      ])
    ).toEqual({
      type: CardType.STRAIGHT_FLUSH,
      mainRank: 14,
      valid: true,
    });
  });

  it('does not allow wildcards to fake a four-joker rocket', () => {
    expect(
      detectCardType([
        createCard('spades', 15),
        createCard('hearts', 15),
        createWildcardCard(2, 'wild-rocket-1'),
        createWildcardCard(2, 'wild-rocket-2'),
      ])
    ).toEqual({
      type: null,
      mainRank: 0,
      valid: false,
    });
  });
});

describe('Strict Guandan Can Beat', () => {
  it('applies level priority for same-type non-sequence hands', () => {
    const lastPlay = {
      type: CardType.PAIR,
      mainRank: 14,
      cards: [createCard('hearts', 14), createCard('spades', 14)],
    };

    const levelPair = [createCard('hearts', 10), createCard('spades', 10)];

    expect(canBeat(levelPair, lastPlay, 10)).toBe(true);
    expect(canBeat(lastPlay.cards, { ...lastPlay, cards: levelPair, mainRank: 10 }, 10)).toBe(false);
  });

  it('enforces same-type comparison for non-bomb non-flush hands', () => {
    const lastPlay = {
      type: CardType.PAIR,
      mainRank: 9,
      cards: [createCard('hearts', 9), createCard('spades', 9)],
    };

    expect(
      canBeat([createCard('hearts', 10), createCard('spades', 10)], lastPlay, 2)
    ).toBe(true);

    expect(
      canBeat([createCard('hearts', 8), createCard('spades', 8)], lastPlay, 2)
    ).toBe(false);

    expect(
      canBeat(
        [
          createCard('hearts', 10),
          createCard('spades', 10),
          createCard('diamonds', 10),
        ],
        lastPlay,
        2
      )
    ).toBe(false);
  });

  it('applies bomb hierarchy: 6+ bomb > straight flush > 5 bomb > 4 bomb', () => {
    const straightFlush = {
      type: CardType.STRAIGHT_FLUSH,
      mainRank: 14,
      cards: [
        createCard('hearts', 10),
        createCard('hearts', 11),
        createCard('hearts', 12),
        createCard('hearts', 13),
        createCard('hearts', 14),
      ],
    };

    const fiveBombCards = [
      createCard('hearts', 7),
      createCard('spades', 7),
      createCard('diamonds', 7),
      createCard('clubs', 7),
      createCard('hearts', 7),
    ];

    const sixBombCards = [
      createCard('hearts', 8),
      createCard('spades', 8),
      createCard('diamonds', 8),
      createCard('clubs', 8),
      createCard('hearts', 8),
      createCard('spades', 8),
    ];

    expect(canBeat(fiveBombCards, straightFlush, 2)).toBe(false);
    expect(canBeat(sixBombCards, straightFlush, 2)).toBe(true);
    expect(canBeat(straightFlush.cards, { ...straightFlush, cards: fiveBombCards, type: CardType.BOMB }, 2)).toBe(true);
  });

  it('treats four-joker rocket as absolute maximum', () => {
    const rocketCards = [
      createCard('spades', 15),
      createCard('spades', 15),
      createCard('hearts', 15),
      createCard('hearts', 15),
    ];

    const eightBomb = {
      type: CardType.BOMB,
      mainRank: 9,
      cards: [
        createCard('hearts', 9),
        createCard('spades', 9),
        createCard('diamonds', 9),
        createCard('clubs', 9),
        createCard('hearts', 9),
        createCard('spades', 9),
        createCard('diamonds', 9),
        createCard('clubs', 9),
      ],
    };

    expect(canBeat(rocketCards, eightBomb, 2)).toBe(true);
    expect(canBeat(eightBomb.cards, { type: CardType.ROCKET, mainRank: 17, cards: rocketCards }, 2)).toBe(false);
  });

  it('lets a wildcard five-bomb beat a natural four-bomb', () => {
    const wildcard = createWildcardCard();

    const wildcardFiveBomb = [
      createCard('spades', 13),
      createCard('hearts', 13),
      createCard('diamonds', 13),
      createCard('clubs', 13),
      wildcard,
    ];

    const naturalFourBomb = {
      type: CardType.BOMB,
      mainRank: 14,
      cards: [
        createCard('spades', 14),
        createCard('hearts', 14),
        createCard('diamonds', 14),
        createCard('clubs', 14),
      ],
    };

    expect(canBeat(wildcardFiveBomb, naturalFourBomb, 2)).toBe(true);
  });

  it('lets nine- and ten-card wildcard bombs participate in bomb hierarchy', () => {
    const nineBomb = [
      createCard('spades', 9),
      createCard('spades', 9),
      createCard('hearts', 9),
      createCard('hearts', 9),
      createCard('diamonds', 9),
      createCard('diamonds', 9),
      createCard('clubs', 9),
      createWildcardCard(2, 'wild-nine-bomb-compare-1'),
      createWildcardCard(2, 'wild-nine-bomb-compare-2'),
    ];

    const tenBomb = [
      createCard('spades', 10),
      createCard('spades', 10),
      createCard('hearts', 10),
      createCard('hearts', 10),
      createCard('diamonds', 10),
      createCard('diamonds', 10),
      createCard('clubs', 10),
      createCard('clubs', 10),
      createWildcardCard(2, 'wild-ten-bomb-compare-1'),
      createWildcardCard(2, 'wild-ten-bomb-compare-2'),
    ];

    const straightFlush = {
      type: CardType.STRAIGHT_FLUSH,
      mainRank: 14,
      cards: [
        createCard('hearts', 10),
        createCard('hearts', 11),
        createCard('hearts', 12),
        createCard('hearts', 13),
        createCard('hearts', 14),
      ],
    };

    expect(canBeat(nineBomb, straightFlush, 2)).toBe(true);
    expect(
      canBeat(
        tenBomb,
        {
          type: CardType.BOMB,
          mainRank: 9,
          cards: nineBomb,
        },
        2
      )
    ).toBe(true);
  });

  it('compares wildcard-assisted sequence hands by their resolved main rank', () => {
    const lastStraight = {
      type: CardType.STRAIGHT,
      mainRank: 13,
      cards: [
        createCard('spades', 9),
        createCard('clubs', 10),
        createCard('diamonds', 11),
        createCard('hearts', 12),
        createCard('spades', 13),
      ],
    };

    expect(
      canBeat(
        [
          createCard('spades', 10),
          createCard('clubs', 11),
          createCard('diamonds', 12),
          createCard('hearts', 13),
          createWildcardCard(2, 'wild-straight-compare'),
        ],
        lastStraight,
        2
      )
    ).toBe(true);
  });
});
