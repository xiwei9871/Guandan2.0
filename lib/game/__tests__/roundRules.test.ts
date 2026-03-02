import { describe, it, expect } from '@jest/globals';
import {
  canCurrentPlayerPass,
  canCurrentPlayerPlay,
  isCurrentPlayerLeadingNewRound,
  shouldClearLastPlaysBeforePass,
  shouldClearLastPlaysBeforePlay,
} from '../roundRules';
import type { RoomState } from '../../types';

function createPlayers(cardsRemaining: Record<'south' | 'west' | 'north' | 'east', number>): RoomState['players'] {
  return [
    {
      id: 'p1',
      name: 'mq1',
      position: 'south',
      team: 'red',
      hand: [],
      isReady: false,
      cardsRemaining: cardsRemaining.south,
    },
    {
      id: 'p2',
      name: 'mq2',
      position: 'west',
      team: 'blue',
      hand: [],
      isReady: false,
      cardsRemaining: cardsRemaining.west,
    },
    {
      id: 'p3',
      name: 'mq3',
      position: 'north',
      team: 'red',
      hand: [],
      isReady: false,
      cardsRemaining: cardsRemaining.north,
    },
    {
      id: 'p4',
      name: 'mq4',
      position: 'east',
      team: 'blue',
      hand: [],
      isReady: false,
      cardsRemaining: cardsRemaining.east,
    },
  ];
}

const fullRoundLastPlays: NonNullable<RoomState['lastPlays']> = {
  south: {
    playerId: 'p1',
    cards: [{ id: 'joker-big', suit: 'spades', rank: 15, levelCard: false, isWildcard: false }],
    type: 'single',
    mainRank: 15,
    timestamp: Date.now(),
    isPass: false,
  },
  west: {
    playerId: 'p2',
    cards: [],
    type: 'pass',
    mainRank: 0,
    timestamp: Date.now(),
    isPass: true,
  },
  north: {
    playerId: 'p3',
    cards: [],
    type: 'pass',
    mainRank: 0,
    timestamp: Date.now(),
    isPass: true,
  },
  east: {
    playerId: 'p4',
    cards: [],
    type: 'pass',
    mainRank: 0,
    timestamp: Date.now(),
    isPass: true,
  },
};

describe('roundRules', () => {
  it('allows the last-play player to lead after three other positions have acted', () => {
    const canPlay = canCurrentPlayerPlay({
      lastPlay: fullRoundLastPlays.south!,
      lastPlayPlayer: 0,
      currentPlayerIndex: 0,
      currentPlayerPosition: 'south',
      lastPlays: fullRoundLastPlays,
    });

    expect(canPlay).toBe(true);
  });

  it('does not allow passing when the current player is leading a new trick', () => {
    const canPass = canCurrentPlayerPass({
      lastPlay: fullRoundLastPlays.south!,
      lastPlayPlayer: 0,
      currentPlayerIndex: 0,
      currentPlayerPosition: 'south',
      lastPlays: fullRoundLastPlays,
    });

    expect(canPass).toBe(false);
  });

  it('allows passing only when following another player in the current trick', () => {
    const canPass = canCurrentPlayerPass({
      lastPlay: fullRoundLastPlays.south!,
      lastPlayPlayer: 0,
      currentPlayerIndex: 1,
      currentPlayerPosition: 'west',
      lastPlays: {
        south: fullRoundLastPlays.south,
        west: null,
        north: null,
        east: null,
      },
    });

    expect(canPass).toBe(true);
  });

  it('does not treat the fourth responder as a new-round leader before they act', () => {
    const leadingNewRound = isCurrentPlayerLeadingNewRound({
      lastPlay: fullRoundLastPlays.south,
      lastPlayPlayer: 0,
      currentPlayerIndex: 3,
      currentPlayerPosition: 'east',
      lastPlays: {
        south: fullRoundLastPlays.south,
        west: fullRoundLastPlays.west,
        north: fullRoundLastPlays.north,
        east: null,
      },
    });

    expect(leadingNewRound).toBe(false);
  });

  it('clears center plays only when the first real play of a new round happens', () => {
    expect(shouldClearLastPlaysBeforePlay(fullRoundLastPlays, fullRoundLastPlays.south)).toBe(true);
    expect(shouldClearLastPlaysBeforePass(fullRoundLastPlays)).toBe(false);
  });

  it('allows a leader to start a new trick after all remaining active players have acted', () => {
    const activePositions: Array<'south' | 'west' | 'east'> = ['south', 'west', 'east'];
    const lastPlays: NonNullable<RoomState['lastPlays']> = {
      south: fullRoundLastPlays.south,
      west: fullRoundLastPlays.west,
      north: null,
      east: {
        playerId: 'p4',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: Date.now(),
        isPass: true,
      },
    };

    expect(
      canCurrentPlayerPlay({
        lastPlay: fullRoundLastPlays.south!,
        lastPlayPlayer: 0,
        currentPlayerIndex: 0,
        currentPlayerPosition: 'south',
        lastPlays,
        activePositions,
      })
    ).toBe(true);

    expect(
      canCurrentPlayerPass({
        lastPlay: fullRoundLastPlays.south!,
        lastPlayPlayer: 0,
        currentPlayerIndex: 0,
        currentPlayerPosition: 'south',
        lastPlays,
        activePositions,
      })
    ).toBe(false);

    expect(shouldClearLastPlaysBeforePlay(lastPlays, fullRoundLastPlays.south, activePositions)).toBe(true);
  });

  it('still allows pass when the current player acted earlier in the trick but another player now leads', () => {
    const lastPlays: NonNullable<RoomState['lastPlays']> = {
      south: {
        playerId: 'p1',
        cards: [{ id: 'old-single', suit: 'hearts', rank: 9, levelCard: false, isWildcard: false }],
        type: 'single',
        mainRank: 9,
        timestamp: Date.now() - 20,
        isPass: false,
      },
      west: {
        playerId: 'p2',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: Date.now() - 10,
        isPass: true,
      },
      north: {
        playerId: 'p3',
        cards: [{ id: 'joker-big', suit: 'spades', rank: 15, levelCard: false, isWildcard: false }],
        type: 'single',
        mainRank: 15,
        timestamp: Date.now(),
        isPass: false,
      },
      east: {
        playerId: 'p4',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: Date.now() + 10,
        isPass: true,
      },
    };

    expect(
      canCurrentPlayerPass({
        lastPlay: lastPlays.north,
        lastPlayPlayer: 2,
        currentPlayerIndex: 0,
        currentPlayerPosition: 'south',
        lastPlays,
      })
    ).toBe(true);
  });

  it('still allows the out players partner to pass in normal turn order before the last opponent responds', () => {
    const leadPlay = {
      playerId: 'p1',
      cards: [{ id: 'south-last', suit: 'spades', rank: 10, levelCard: false, isWildcard: false }],
      type: 'single',
      mainRank: 10,
      timestamp: Date.now(),
      isPass: false,
    };
    const activePositions: Array<'west' | 'north' | 'east'> = ['west', 'north', 'east'];
    const players = createPlayers({
      south: 0,
      west: 7,
      north: 8,
      east: 6,
    });
    const lastPlays: NonNullable<RoomState['lastPlays']> = {
      south: leadPlay,
      west: {
        playerId: 'p2',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: leadPlay.timestamp + 10,
        isPass: true,
      },
      north: null,
      east: null,
    };

    expect(
      canCurrentPlayerPass({
        lastPlay: leadPlay,
        lastPlayPlayer: 0,
        currentPlayerIndex: 2,
        currentPlayerPosition: 'north',
        lastPlays,
        activePositions,
        players,
      })
    ).toBe(true);
  });

  it('lets the out players partner catch wind only after every remaining player has responded', () => {
    const leadPlay = {
      playerId: 'p1',
      cards: [{ id: 'south-last', suit: 'spades', rank: 10, levelCard: false, isWildcard: false }],
      type: 'single',
      mainRank: 10,
      timestamp: Date.now(),
      isPass: false,
    };
    const activePositions: Array<'west' | 'north' | 'east'> = ['west', 'north', 'east'];
    const players = createPlayers({
      south: 0,
      west: 7,
      north: 8,
      east: 6,
    });
    const lastPlays: NonNullable<RoomState['lastPlays']> = {
      south: leadPlay,
      west: {
        playerId: 'p2',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: leadPlay.timestamp + 10,
        isPass: true,
      },
      north: {
        playerId: 'p3',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: leadPlay.timestamp + 20,
        isPass: true,
      },
      east: {
        playerId: 'p4',
        cards: [],
        type: 'pass',
        mainRank: 0,
        timestamp: leadPlay.timestamp + 30,
        isPass: true,
      },
    };

    expect(
      canCurrentPlayerPlay({
        lastPlay: leadPlay,
        lastPlayPlayer: 0,
        currentPlayerIndex: 2,
        currentPlayerPosition: 'north',
        lastPlays,
        activePositions,
        players,
      })
    ).toBe(true);

    expect(
      canCurrentPlayerPass({
        lastPlay: leadPlay,
        lastPlayPlayer: 0,
        currentPlayerIndex: 2,
        currentPlayerPosition: 'north',
        lastPlays,
        activePositions,
        players,
      })
    ).toBe(false);

    expect(
      isCurrentPlayerLeadingNewRound({
        lastPlay: leadPlay,
        lastPlayPlayer: 0,
        currentPlayerIndex: 2,
        currentPlayerPosition: 'north',
        lastPlays,
        activePositions,
        players,
      })
    ).toBe(true);
  });

  it('does not allow pass when lastPlayPlayer is missing even if a lastPlay object exists', () => {
    expect(
      canCurrentPlayerPass({
        lastPlay: fullRoundLastPlays.south!,
        lastPlayPlayer: null,
        currentPlayerIndex: 1,
        currentPlayerPosition: 'west',
        lastPlays: fullRoundLastPlays,
      })
    ).toBe(false);
  });
});
