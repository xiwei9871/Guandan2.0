import { describe, expect, it } from '@jest/globals';
import type { Card, Player } from '../../types';
import {
  buildTributePlan,
  detectAntiTribute,
  getEligibleTributeCard,
  getEligibleTributeRank,
  getTributeMode,
  validateTributeCard,
  validateReturnTributeCard,
} from '../tributeRules';

function createCard(
  id: string,
  rank: number,
  suit: Card['suit'],
  options: Partial<Pick<Card, 'levelCard' | 'isWildcard'>> = {}
): Card {
  return {
    id,
    rank,
    suit,
    levelCard: false,
    isWildcard: false,
    ...options,
  };
}

function createPlayer(
  id: string,
  team: Player['team'],
  rank?: Player['rank'],
  hand: Card[] = []
): Player {
  const positions: Player['position'][] = ['south', 'west', 'north', 'east'];
  const seat = Number(id.replace(/\D/g, '')) - 1;

  return {
    id,
    clientId: id,
    name: id,
    position: positions[Math.max(0, seat)],
    team,
    hand,
    isReady: false,
    cardsRemaining: hand.length,
    ...(rank ? { rank } : {}),
  };
}

describe('tributeRules', () => {
  it('detects double tribute when one team finishes first and second', () => {
    const players = [
      createPlayer('p1', 'red', 1),
      createPlayer('p2', 'blue', 3),
      createPlayer('p3', 'red', 2),
      createPlayer('p4', 'blue', 4),
    ];

    expect(getTributeMode(players)).toEqual({
      mode: 'double',
      givers: ['p2', 'p4'],
      receivers: ['p1', 'p3'],
    });
  });

  it('detects single tribute when ranks are 1 and 3 for one team', () => {
    const players = [
      createPlayer('p1', 'red', 1),
      createPlayer('p2', 'blue', 2),
      createPlayer('p3', 'red', 3),
      createPlayer('p4', 'blue', 4),
    ];

    expect(getTributeMode(players)).toEqual({
      mode: 'single',
      givers: ['p4'],
      receivers: ['p1'],
    });
  });

  it('detects inner tribute when first and last are teammates', () => {
    const players = [
      createPlayer('p1', 'red', 1),
      createPlayer('p2', 'blue', 2),
      createPlayer('p3', 'blue', 3),
      createPlayer('p4', 'red', 4),
    ];

    expect(getTributeMode(players)).toEqual({
      mode: 'inner',
      givers: ['p4'],
      receivers: ['p1'],
    });
  });

  it('treats one double-joker loser or split big jokers as anti-tribute in double tribute', () => {
    const doubleJokerLosers = [
      createPlayer('p2', 'blue', 3, [
        createCard('j1', 15, 'spades'),
        createCard('j2', 15, 'hearts'),
      ]),
      createPlayer('p4', 'blue', 4, [createCard('x1', 13, 'clubs')]),
    ];

    const splitBigJokers = [
      createPlayer('p2', 'blue', 3, [createCard('j1', 15, 'spades')]),
      createPlayer('p4', 'blue', 4, [createCard('j2', 15, 'spades')]),
    ];

    expect(detectAntiTribute('double', doubleJokerLosers)).toBe(true);
    expect(detectAntiTribute('double', splitBigJokers)).toBe(true);
  });

  it('requires double jokers for anti-tribute in single and inner tribute', () => {
    const loserWithDoubleJokers = [
      createPlayer('p4', 'blue', 4, [
        createCard('j1', 15, 'spades'),
        createCard('j2', 15, 'hearts'),
      ]),
    ];
    const loserWithOnlyBigJoker = [
      createPlayer('p4', 'blue', 4, [createCard('j1', 15, 'spades')]),
    ];

    expect(detectAntiTribute('single', loserWithDoubleJokers)).toBe(true);
    expect(detectAntiTribute('single', loserWithOnlyBigJoker)).toBe(false);
    expect(detectAntiTribute('inner', loserWithDoubleJokers)).toBe(true);
  });

  it('skips the heart level card when selecting the tribute card', () => {
    const hand = [
      createCard('heart-level', 10, 'hearts', { levelCard: true, isWildcard: true }),
      createCard('spade-a', 14, 'spades'),
      createCard('club-k', 13, 'clubs'),
    ];

    expect(getEligibleTributeCard(hand, 10)).toEqual(expect.objectContaining({ id: 'spade-a' }));
  });

  it('treats non-heart level cards as larger than A when choosing tribute', () => {
    const hand = [
      createCard('heart-level', 5, 'hearts', { levelCard: true, isWildcard: true }),
      createCard('club-level', 5, 'clubs', { levelCard: true }),
      createCard('spade-a', 14, 'spades'),
      createCard('diamond-10', 10, 'diamonds'),
    ];

    expect(getEligibleTributeRank(hand, 5)).toBe(5);
    expect(getEligibleTributeCard(hand, 5)).toEqual(expect.objectContaining({ id: 'club-level' }));
  });

  it('allows any suit at the highest eligible tribute rank to be used for tribute', () => {
    const hand = [
      createCard('spade-level', 5, 'spades', { levelCard: true }),
      createCard('club-level', 5, 'clubs', { levelCard: true }),
      createCard('heart-level', 5, 'hearts', { levelCard: true, isWildcard: true }),
      createCard('diamond-10', 10, 'diamonds'),
    ];

    expect(validateTributeCard(hand, hand[0], 5)).toBe(true);
    expect(validateTributeCard(hand, hand[1], 5)).toBe(true);
    expect(validateTributeCard(hand, hand[2], 5)).toBe(false);
  });

  it('rejects A and the heart level card when a non-heart level card is available', () => {
    const hand = [
      createCard('heart-level', 5, 'hearts', { levelCard: true, isWildcard: true }),
      createCard('club-level', 5, 'clubs', { levelCard: true }),
      createCard('spade-a', 14, 'spades'),
    ];

    expect(validateTributeCard(hand, hand[0], 5)).toBe(false);
    expect(validateTributeCard(hand, hand[1], 5)).toBe(true);
    expect(validateTributeCard(hand, hand[2], 5)).toBe(false);
  });

  it('builds a double-tribute plan so first place gets the larger tribute card', () => {
    const giverA = createPlayer('p2', 'blue', 3, [
      createCard('a-max', 5, 'clubs', { levelCard: true }),
      createCard('a-low', 7, 'clubs'),
    ]);
    const giverB = createPlayer('p4', 'blue', 4, [
      createCard('b-max', 13, 'clubs'),
      createCard('b-low', 6, 'diamonds'),
    ]);
    const receiverA = createPlayer('p1', 'red', 1, []);
    const receiverB = createPlayer('p3', 'red', 2, []);

    const plan = buildTributePlan(
      [receiverA, giverA, receiverB, giverB],
      { mode: 'double', givers: ['p2', 'p4'], receivers: ['p1', 'p3'] },
      5
    );

    expect(plan.gives).toEqual([
      expect.objectContaining({ fromPlayerId: 'p2', toPlayerId: 'p1', card: expect.objectContaining({ id: 'a-max' }) }),
      expect.objectContaining({ fromPlayerId: 'p4', toPlayerId: 'p3', card: expect.objectContaining({ id: 'b-max' }) }),
    ]);
    expect(plan.returns).toEqual([
      expect.objectContaining({ fromPlayerId: 'p1', toPlayerId: 'p2' }),
      expect.objectContaining({ fromPlayerId: 'p3', toPlayerId: 'p4' }),
    ]);
  });

  it('validates the house rule that all return tribute cards must be rank 10 or lower', () => {
    expect(validateReturnTributeCard(createCard('ok', 10, 'clubs'))).toBe(true);
    expect(validateReturnTributeCard(createCard('bad', 11, 'clubs'))).toBe(false);
  });
});
