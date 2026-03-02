import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { RoomState } from '../../lib/types';

const mockPush = jest.fn();

const finishedRoomState: RoomState = {
  roomId: 'ABC123',
  players: [
    {
      id: 'p1',
      name: '张三',
      position: 'south',
      team: 'red',
      hand: [],
      isReady: true,
      cardsRemaining: 0,
      rank: 1,
    },
    {
      id: 'p2',
      name: '李四',
      position: 'west',
      team: 'blue',
      hand: [],
      isReady: true,
      cardsRemaining: 0,
      rank: 2,
    },
    {
      id: 'p3',
      name: '王五',
      position: 'north',
      team: 'red',
      hand: [],
      isReady: true,
      cardsRemaining: 0,
      rank: 3,
    },
    {
      id: 'p4',
      name: '赵六',
      position: 'east',
      team: 'blue',
      hand: [],
      isReady: true,
      cardsRemaining: 0,
      rank: 4,
    },
  ],
  currentLevel: 4,
  currentTurn: 0,
  lastPlay: null,
  lastPlayPlayer: null,
  lastPlays: {
    north: null,
    south: null,
    east: null,
    west: null,
  },
  gamePhase: 'finished',
  scores: { red: 0, blue: 0 },
  tribute: null,
  dealer: 0,
  result: {
    winner: 'red',
    levelChange: 2,
    redRanks: [1, 3],
    blueRanks: [2, 4],
  },
};

const waitingRoomState: RoomState = {
  roomId: 'ROOM42',
  ownerId: 'p1',
  players: [
    {
      id: 'p1',
      name: '房主',
      position: 'south',
      team: 'red',
      hand: [],
      isReady: true,
      cardsRemaining: 27,
    },
    {
      id: 'p2',
      name: '玩家二',
      position: 'west',
      team: 'blue',
      hand: [],
      isReady: true,
      cardsRemaining: 27,
    },
    {
      id: 'p3',
      name: '玩家三',
      position: 'north',
      team: 'red',
      hand: [],
      isReady: true,
      cardsRemaining: 27,
    },
    {
      id: 'p4',
      name: '玩家四',
      position: 'east',
      team: 'blue',
      hand: [],
      isReady: true,
      cardsRemaining: 27,
    },
  ],
  currentLevel: 2,
  currentTurn: 0,
  lastPlay: null,
  lastPlayPlayer: null,
  lastPlays: {
    north: null,
    south: null,
    east: null,
    west: null,
  },
  gamePhase: 'waiting',
  scores: { red: 0, blue: 0 },
  tribute: null,
  dealer: 0,
  result: null,
};

const waitingRoomStateWithStableOwner: RoomState = {
  ...waitingRoomState,
  ownerId: 'owner-client',
  players: waitingRoomState.players.map((player, index) => ({
    ...player,
    id: `socket-${index + 1}`,
    clientId: index === 0 ? 'owner-client' : `guest-client-${index}`,
  })),
};

function renderGameRoom(
  roomState: RoomState,
  playerId: string,
  playerCardMock: (props: any) => string = () => 'PLAYER_CARD'
) {
  const mockUseState = jest
    .fn()
    .mockImplementationOnce(() => [roomState, jest.fn()])
    .mockImplementationOnce(() => ['', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()])
    .mockImplementationOnce(() => [playerId, jest.fn()]);

  jest.doMock('react', () => {
    const actual = jest.requireActual('react');
    return {
      __esModule: true,
      ...actual,
      useState: mockUseState,
      useEffect: jest.fn(),
    };
  });

  jest.doMock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
  }));

  jest.doMock('@/hooks/useSocket', () => ({
    useSocket: () => ({ socket: null, isConnected: true }),
  }));

  jest.doMock('../game/PlayerCard', () => ({
    __esModule: true,
    default: (props: any) => playerCardMock(props),
  }));

  jest.doMock('../game/HandCards', () => ({
    __esModule: true,
    default: () => 'HAND_CARDS',
  }));

  jest.doMock('../game/CenterPlayArea', () => ({
    __esModule: true,
    default: () => 'CENTER_PLAY_AREA',
  }));

  jest.doMock('../game/SettlementPanel', () => ({
    __esModule: true,
    default: () => 'SETTLEMENT_PANEL',
  }));

  let html = '';

  jest.isolateModules(() => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const GameRoom = require('../GameRoom').default;

    html = renderToStaticMarkup(
      React.createElement(GameRoom, { roomId: roomState.roomId })
    );
  });

  return html;
}

describe('GameRoom settlement view', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders settlement panel when the room has finished', () => {
    const mockUseState = jest
      .fn()
      .mockImplementationOnce(() => [finishedRoomState, jest.fn()])
      .mockImplementationOnce(() => ['', jest.fn()])
      .mockImplementationOnce(() => [false, jest.fn()])
      .mockImplementationOnce(() => ['p1', jest.fn()]);

    jest.doMock('react', () => {
      const actual = jest.requireActual('react');
      return {
        __esModule: true,
        ...actual,
        useState: mockUseState,
        useEffect: jest.fn(),
      };
    });

    jest.doMock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }));

    jest.doMock('@/hooks/useSocket', () => ({
      useSocket: () => ({ socket: null, isConnected: true }),
    }));

    jest.doMock('../game/PlayerCard', () => ({
      __esModule: true,
      default: () => 'PLAYER_CARD',
    }));

    jest.doMock('../game/HandCards', () => ({
      __esModule: true,
      default: () => 'HAND_CARDS',
    }));

    jest.doMock('../game/CenterPlayArea', () => ({
      __esModule: true,
      default: () => 'CENTER_PLAY_AREA',
    }));

    jest.doMock('../game/SettlementPanel', () => ({
      __esModule: true,
      default: () => 'SETTLEMENT_PANEL',
    }));

    let html = '';

    jest.isolateModules(() => {
      const React = require('react');
      const { renderToStaticMarkup } = require('react-dom/server');
      const GameRoom = require('../GameRoom').default;

      html = renderToStaticMarkup(
        React.createElement(GameRoom, { roomId: finishedRoomState.roomId })
      );
    });

    expect(html).toContain('SETTLEMENT_PANEL');
  });

  it('shows a next-round button when the room has finished', () => {
    const mockUseState = jest
      .fn()
      .mockImplementationOnce(() => [finishedRoomState, jest.fn()])
      .mockImplementationOnce(() => ['', jest.fn()])
      .mockImplementationOnce(() => [false, jest.fn()])
      .mockImplementationOnce(() => ['p1', jest.fn()]);

    jest.doMock('react', () => {
      const actual = jest.requireActual('react');
      return {
        __esModule: true,
        ...actual,
        useState: mockUseState,
        useEffect: jest.fn(),
      };
    });

    jest.doMock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }));

    jest.doMock('@/hooks/useSocket', () => ({
      useSocket: () => ({ socket: null, isConnected: true }),
    }));

    jest.doMock('../game/PlayerCard', () => ({
      __esModule: true,
      default: () => 'PLAYER_CARD',
    }));

    jest.doMock('../game/HandCards', () => ({
      __esModule: true,
      default: () => 'HAND_CARDS',
    }));

    jest.doMock('../game/CenterPlayArea', () => ({
      __esModule: true,
      default: () => 'CENTER_PLAY_AREA',
    }));

    jest.doMock('../game/SettlementPanel', () => ({
      __esModule: true,
      default: () => 'SETTLEMENT_PANEL',
    }));

    let html = '';

    jest.isolateModules(() => {
      const React = require('react');
      const { renderToStaticMarkup } = require('react-dom/server');
      const GameRoom = require('../GameRoom').default;

      html = renderToStaticMarkup(
        React.createElement(GameRoom, { roomId: finishedRoomState.roomId })
      );
    });

    expect(html).toContain('开始下一局');
  });

  it('shows the start-game button only to the room owner when all players are ready', () => {
    const html = renderGameRoom(waitingRoomState, 'p1');

    expect(html).toContain('data-testid="start-game-button"');
    expect(html).not.toContain('data-testid="waiting-for-owner"');
  });

  it('shows a waiting-for-owner state to ready non-owners instead of a start button', () => {
    const html = renderGameRoom(waitingRoomState, 'p2');

    expect(html).not.toContain('data-testid="start-game-button"');
    expect(html).toContain('data-testid="waiting-for-owner"');
  });

  it('treats the creator as owner even after the socket id changes', () => {
    const html = renderGameRoom(waitingRoomStateWithStableOwner, 'socket-1');

    expect(html).toContain('data-testid="start-game-button"');
    expect(html).not.toContain('data-testid="waiting-for-owner"');
  });

  it('renders the north player card in compact mode', () => {
    const html = renderGameRoom(
      waitingRoomState,
      'p1',
      (props: any) => `PLAYER_CARD:${props.player.position}:${props.compact ? 'compact' : 'default'}`
    );

    expect(html).toContain('PLAYER_CARD:north:compact');
  });
});
