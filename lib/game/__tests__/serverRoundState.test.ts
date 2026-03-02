import { describe, it, expect } from '@jest/globals';

const runtime = require('../serverRoundState.runtime.js');

describe('serverRoundState runtime', () => {
  it('skips players who have already run out of cards when advancing turn', () => {
    const players = [
      { id: 'p1', cardsRemaining: 0 },
      { id: 'p2', cardsRemaining: 5 },
      { id: 'p3', cardsRemaining: 0 },
      { id: 'p4', cardsRemaining: 7 },
    ];

    expect(runtime.getNextActivePlayerIndex(players, 0)).toBe(1);
    expect(runtime.getNextActivePlayerIndex(players, 1)).toBe(3);
    expect(runtime.getNextActivePlayerIndex(players, 3)).toBe(1);
  });

  it('keeps normal clockwise order while the out players partner is still deciding whether to follow', () => {
    const players = [
      { id: 'p1', team: 'red', cardsRemaining: 0, position: 'south' },
      { id: 'p2', team: 'blue', cardsRemaining: 8, position: 'west' },
      { id: 'p3', team: 'red', cardsRemaining: 7, position: 'north' },
      { id: 'p4', team: 'blue', cardsRemaining: 6, position: 'east' },
    ];

    expect(runtime.getNextTurnIndex(players, 0, 0, false)).toBe(1);
    expect(runtime.getNextTurnIndex(players, 1, 0, false)).toBe(2);
    expect(runtime.getNextTurnIndex(players, 2, 0, false)).toBe(3);
  });

  it('gives the lead to the out players partner only after the round is fully closed', () => {
    const players = [
      { id: 'p1', team: 'red', cardsRemaining: 0, position: 'south' },
      { id: 'p2', team: 'blue', cardsRemaining: 8, position: 'west' },
      { id: 'p3', team: 'red', cardsRemaining: 7, position: 'north' },
      { id: 'p4', team: 'blue', cardsRemaining: 6, position: 'east' },
    ];

    expect(runtime.getNextTurnIndex(players, 3, 0, true)).toBe(2);
  });

  it('does not require beating the old last play once the round has already closed', () => {
    expect(runtime.shouldRequireBeat({ lastPlay: { type: 'single' }, lastPlayPlayer: 0, playerIndex: 2, roundComplete: true })).toBe(false);
    expect(runtime.shouldRequireBeat({ lastPlay: { type: 'single' }, lastPlayPlayer: 0, playerIndex: 2, roundComplete: false })).toBe(true);
  });

  it('finishes the game when the third player gets a rank and assigns the last rank automatically', () => {
    const players = [
      { id: 'p1', team: 'red', cardsRemaining: 0, rank: 1 },
      { id: 'p2', team: 'blue', cardsRemaining: 0, rank: 2 },
      { id: 'p3', team: 'red', cardsRemaining: 0 },
      { id: 'p4', team: 'blue', cardsRemaining: 5 },
    ];

    const room = {
      currentLevel: 2,
      gamePhase: 'playing',
      status: 'playing',
      scores: { red: 0, blue: 0 },
    };

    const result = runtime.applyRankingAndSettlement(room, players, 2);

    expect(result.finished).toBe(true);
    expect(players[2].rank).toBe(3);
    expect(players[3].rank).toBe(4);
    expect(room.gamePhase).toBe('finished');
    expect(room.status).toBe('finished');
    expect(room.currentLevel).toBe(4);
  });

  it('keeps the winning play on the table when the player who just played goes out but the game is not over', () => {
    const players = [
      { id: 'p1', team: 'red', cardsRemaining: 0 },
      { id: 'p2', team: 'blue', cardsRemaining: 7 },
      { id: 'p3', team: 'red', cardsRemaining: 6 },
      { id: 'p4', team: 'blue', cardsRemaining: 5 },
    ];

    const room = {
      currentLevel: 2,
      gamePhase: 'playing',
      status: 'playing',
      scores: { red: 0, blue: 0 },
      lastPlay: { type: 'single', mainRank: 9, cards: [{ id: 'x' }] },
      lastPlayPlayer: 0,
    };

    const result = runtime.applyRankingAndSettlement(room, players, 0);

    expect(result.finished).toBe(false);
    expect(players[0].rank).toBe(1);
    expect(room.lastPlay).toEqual({ type: 'single', mainRank: 9, cards: [{ id: 'x' }] });
    expect(room.lastPlayPlayer).toBe(0);
  });
});
