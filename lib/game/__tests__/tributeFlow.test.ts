import { describe, expect, it } from '@jest/globals';

const runtime = require('../serverTribute.runtime.js');

function createCard(id: string, rank: number, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', extras: any = {}) {
  return {
    id,
    rank,
    suit,
    levelCard: false,
    isWildcard: false,
    ...extras,
  };
}

function createPlayer(id: string, team: 'red' | 'blue', rank: 1 | 2 | 3 | 4, hand: any[], position: 'south' | 'west' | 'north' | 'east') {
  return {
    id,
    clientId: id,
    name: id,
    team,
    rank,
    hand: [...hand],
    cardsRemaining: hand.length,
    isReady: false,
    position,
  };
}

describe('serverTribute runtime', () => {
  it('enters tributing in giving phase and waits for manual double tribute submissions after a 1-2 finish', () => {
    const room = {
      currentLevel: 5,
      currentTurn: 0,
      gamePhase: 'finished',
      status: 'finished',
      lastPlay: { type: 'single' },
      lastPlayPlayer: 2,
      lastPlays: { north: { type: 'single' }, south: null, east: null, west: null },
      scores: { red: 0, blue: 0 },
      result: { winner: 'red', levelChange: 3 },
      tribute: null,
    };

    const players = [
      createPlayer('p1', 'red', 1, [createCard('r1', 9, 'clubs')], 'south'),
      createPlayer('p2', 'blue', 3, [createCard('b1', 13, 'spades')], 'west'),
      createPlayer('p3', 'red', 2, [createCard('r2', 8, 'hearts')], 'north'),
      createPlayer('p4', 'blue', 4, [createCard('b2', 14, 'clubs')], 'east'),
    ];

    const result = runtime.beginTributeRound(room, players);

    expect(result.skipped).toBe(false);
    expect(room.gamePhase).toBe('tributing');
    expect(room.status).toBe('playing');
    expect(room.tribute.phase).toBe('giving');
    expect(room.tribute.pendingGives).toHaveLength(2);
    expect(room.tribute.pendingReturns).toHaveLength(0);
    expect(room.tribute.resolvedGives).toHaveLength(0);
    expect(players.find((player: any) => player.id === 'p1').hand.map((card: any) => card.id)).not.toContain('b2');
    expect(players.find((player: any) => player.id === 'p3').hand.map((card: any) => card.id)).not.toContain('b1');
  });

  it('accepts non-heart level cards as tribute and allows double givers to submit in any order before assignment', () => {
    const room = {
      currentLevel: 5,
      currentTurn: 0,
      gamePhase: 'finished',
      status: 'finished',
      lastPlay: { type: 'single' },
      lastPlayPlayer: 2,
      lastPlays: { north: { type: 'single' }, south: null, east: null, west: null },
      scores: { red: 0, blue: 0 },
      result: { winner: 'red', levelChange: 3 },
      tribute: null,
    };

    const players = [
      createPlayer('p1', 'red', 1, [createCard('r1', 9, 'clubs')], 'south'),
      createPlayer('p2', 'blue', 3, [
        createCard('b-a', 14, 'spades'),
        createCard('b-level', 5, 'clubs', { levelCard: true }),
      ], 'west'),
      createPlayer('p3', 'red', 2, [createCard('r2', 8, 'hearts')], 'north'),
      createPlayer('p4', 'blue', 4, [
        createCard('c-k', 13, 'clubs'),
        createCard('c-heart-level', 5, 'hearts', { levelCard: true, isWildcard: true }),
      ], 'east'),
    ];

    runtime.beginTributeRound(room, players);

    expect(() =>
      runtime.applyTribute(room, players, {
        fromPlayerId: 'p2',
        cardId: 'b-a',
      })
    ).toThrow('Tribute card must match the highest eligible tribute rank');

    runtime.applyTribute(room, players, {
      fromPlayerId: 'p4',
      cardId: 'c-k',
    });

    expect(room.tribute.phase).toBe('giving');
    expect(room.tribute.resolvedGives).toHaveLength(1);
    expect(room.tribute.revealedActions).toEqual([
      expect.objectContaining({
        kind: 'tribute',
        fromPlayerId: 'p4',
        card: expect.objectContaining({ id: 'c-k' }),
      }),
    ]);

    runtime.applyTribute(room, players, {
      fromPlayerId: 'p2',
      cardId: 'b-level',
    });

    expect(room.tribute.phase).toBe('returning');
    expect(room.tribute.pendingReturns).toHaveLength(2);
    expect(room.tribute.leadPlayerId).toBe('p2');
    expect(players.find((player: any) => player.id === 'p1').hand.map((card: any) => card.id)).toContain('b-level');
    expect(players.find((player: any) => player.id === 'p3').hand.map((card: any) => card.id)).toContain('c-k');
  });

  it('skips tribute on anti-tribute and gives the lead to the would-be highest receiver', () => {
    const room = {
      currentLevel: 5,
      currentTurn: 0,
      gamePhase: 'finished',
      status: 'finished',
      lastPlay: { type: 'single' },
      lastPlayPlayer: 2,
      lastPlays: { north: { type: 'single' }, south: null, east: null, west: null },
      scores: { red: 0, blue: 0 },
      result: { winner: 'red', levelChange: 3 },
      tribute: null,
    };

    const players = [
      createPlayer('p1', 'red', 1, [createCard('r1', 9, 'clubs')], 'south'),
      createPlayer('p2', 'blue', 3, [createCard('j1', 15, 'spades')], 'west'),
      createPlayer('p3', 'red', 2, [createCard('r2', 8, 'hearts')], 'north'),
      createPlayer('p4', 'blue', 4, [createCard('j2', 15, 'spades')], 'east'),
    ];

    const result = runtime.beginTributeRound(room, players);

    expect(result.skipped).toBe(true);
    expect(room.gamePhase).toBe('playing');
    expect(room.tribute).toBeNull();
    expect(room.currentTurn).toBe(0);
  });

  it('validates return tribute cards and enters playing after all returns resolve', () => {
    const room = {
      currentLevel: 5,
      currentTurn: 0,
      gamePhase: 'finished',
      status: 'finished',
      lastPlay: { type: 'single' },
      lastPlayPlayer: 2,
      lastPlays: { north: { type: 'single' }, south: null, east: null, west: null },
      scores: { red: 0, blue: 0 },
      result: { winner: 'red', levelChange: 2 },
      tribute: null,
    };

    const players = [
      createPlayer('p1', 'red', 1, [createCard('r1', 9, 'clubs'), createCard('r2', 11, 'spades')], 'south'),
      createPlayer('p2', 'blue', 2, [createCard('x1', 7, 'clubs')], 'west'),
      createPlayer('p3', 'blue', 3, [createCard('x2', 6, 'hearts')], 'north'),
      createPlayer('p4', 'red', 4, [createCard('b1', 13, 'spades')], 'east'),
    ];

    runtime.beginTributeRound(room, players);

    expect(room.gamePhase).toBe('tributing');
    expect(room.tribute.phase).toBe('giving');

    runtime.applyTribute(room, players, {
      fromPlayerId: 'p4',
      cardId: 'b1',
    });

    expect(room.tribute.pendingReturns).toHaveLength(1);
    expect(room.tribute.pendingReturns[0].fromPlayerId).toBe('p1');

    expect(() =>
      runtime.applyReturnTribute(room, players, {
        fromPlayerId: 'p1',
        cardId: 'r2',
      })
    ).toThrow('Return tribute card must be rank 10 or lower');

    runtime.applyReturnTribute(room, players, {
      fromPlayerId: 'p1',
      cardId: 'r1',
    });

    expect(room.gamePhase).toBe('playing');
    expect(room.tribute).toBeNull();
    expect(room.currentTurn).toBe(3);
    expect(players.find((player: any) => player.id === 'p4').hand.map((card: any) => card.id)).toContain('r1');
  });
});
