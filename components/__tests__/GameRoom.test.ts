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

const waitingRoomStateWithOnePlayer: RoomState = {
  ...waitingRoomState,
  players: [waitingRoomState.players[0]],
};

const playingRoomState: RoomState = {
  ...waitingRoomState,
  gamePhase: 'playing',
  lastPlays: {
    north: {
      playerId: 'p3',
      cards: [
        {
          id: 'play-1',
          suit: 'hearts',
          rank: 9,
          levelCard: false,
          isWildcard: false,
        },
      ],
      type: 'single',
      mainRank: 9,
      timestamp: 1,
    },
    south: null,
    east: null,
    west: null,
  },
  players: waitingRoomState.players.map((player, index) => ({
    ...player,
    hand:
      index === 0
        ? [
            {
              id: 'card-1',
              suit: 'spades',
              rank: 14,
              levelCard: false,
              isWildcard: false,
            },
          ]
        : [],
  })),
};

const tributingGivingRoomState: RoomState = {
  ...waitingRoomState,
  gamePhase: 'tributing',
  currentTurn: 3,
  players: waitingRoomState.players.map((player, index) => ({
    ...player,
    hand:
      index === 3
        ? [
            {
              id: 'max-tribute',
              suit: 'spades',
              rank: 13,
              levelCard: false,
              isWildcard: false,
            },
            {
              id: 'other-card',
              suit: 'clubs',
              rank: 9,
              levelCard: false,
              isWildcard: false,
            },
          ]
        : [],
    cardsRemaining: index === 3 ? 2 : 0,
  })),
  tribute: {
    fromPlayer: 'p4',
    toPlayer: 'p1',
    cards: [],
    phase: 'giving',
    mode: 'single',
    exempt: false,
    pendingGives: [
      {
        fromPlayerId: 'p4',
        toPlayerId: 'p1',
        card: {
          id: 'max-tribute',
          suit: 'spades',
          rank: 13,
          levelCard: false,
          isWildcard: false,
        },
      },
    ],
    resolvedGives: [],
    pendingReturns: [],
    resolvedReturns: [],
    revealedActions: [],
    leadPlayerId: 'p4',
  } as any,
};

const tributingReturningRoomState: RoomState = {
  ...tributingGivingRoomState,
  currentTurn: 0,
  players: waitingRoomState.players.map((player, index) => ({
    ...player,
    hand:
      index === 0
        ? [
            {
              id: 'return-card',
              suit: 'clubs',
              rank: 9,
              levelCard: false,
              isWildcard: false,
            },
          ]
        : [],
    cardsRemaining: index === 0 ? 1 : 0,
  })),
  tribute: {
    fromPlayer: 'p4',
    toPlayer: 'p1',
    cards: [
      {
        id: 'tribute-card',
        suit: 'spades',
        rank: 13,
        levelCard: false,
        isWildcard: false,
      },
    ],
    phase: 'returning',
    mode: 'single',
    exempt: false,
    pendingGives: [
      {
        fromPlayerId: 'p4',
        toPlayerId: 'p1',
        card: {
          id: 'tribute-card',
          suit: 'spades',
          rank: 13,
          levelCard: false,
          isWildcard: false,
        },
      },
    ],
    resolvedGives: [
      {
        fromPlayerId: 'p4',
        toPlayerId: 'p1',
        card: {
          id: 'tribute-card',
          suit: 'spades',
          rank: 13,
          levelCard: false,
          isWildcard: false,
        },
      },
    ],
    pendingReturns: [
      {
        fromPlayerId: 'p1',
        toPlayerId: 'p4',
      },
    ],
    resolvedReturns: [],
    revealedActions: [
      {
        kind: 'tribute',
        fromPlayerId: 'p4',
        toPlayerId: 'p1',
        card: {
          id: 'tribute-card',
          suit: 'spades',
          rank: 13,
          levelCard: false,
          isWildcard: false,
        },
      },
    ],
    leadPlayerId: 'p4',
  } as any,
};

const tributingDoubleGivingRoomState: RoomState = {
  ...waitingRoomState,
  gamePhase: 'tributing',
  currentTurn: -1,
  players: waitingRoomState.players.map((player, index) => ({
    ...player,
    hand:
      index === 1
        ? [
            {
              id: 'west-level',
              suit: 'clubs',
              rank: 5,
              levelCard: true,
              isWildcard: false,
            },
          ]
        : index === 3
          ? [
              {
                id: 'east-k',
                suit: 'spades',
                rank: 13,
                levelCard: false,
                isWildcard: false,
              },
            ]
          : [],
    cardsRemaining: index === 1 || index === 3 ? 1 : 0,
  })),
  tribute: {
    fromPlayer: null,
    toPlayer: null,
    cards: [],
    phase: 'giving',
    mode: 'double',
    exempt: false,
    giverOrder: ['p2', 'p4'],
    receiverOrder: ['p1', 'p3'],
    pendingGives: [
      { fromPlayerId: 'p2', toPlayerId: null },
      { fromPlayerId: 'p4', toPlayerId: null },
    ],
    resolvedGives: [],
    pendingReturns: [],
    resolvedReturns: [],
    revealedActions: [],
    leadPlayerId: null,
  } as any,
};

function renderGameRoom(
  roomState: RoomState,
  playerId: string,
  playerCardMock: (props: any) => string = () => 'PLAYER_CARD',
  handCardsMock: (props: any) => string = () => 'HAND_CARDS'
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
    default: (props: any) => handCardsMock(props),
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

function renderErroredGameRoom(error: string) {
  const mockUseState = jest
    .fn()
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => [error, jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()])
    .mockImplementationOnce(() => [null, jest.fn()]);

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
    useSocket: () => ({ socket: null, isConnected: false }),
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

    html = renderToStaticMarkup(React.createElement(GameRoom, { roomId: 'ROOM42' }));
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

  it('maps the current player to the bottom seat regardless of original position', () => {
    const html = renderGameRoom(waitingRoomState, 'p3');

    expect(html).toContain('data-testid="seat-self-bottom"');
  });

  it('renders an integrated table shell', () => {
    const html = renderGameRoom(waitingRoomState, 'p1');

    expect(html).toContain('data-testid="integrated-table"');
  });

  it('renders a room invite link based on the current room id', () => {
    const html = renderGameRoom(waitingRoomState, 'p1');

    expect(html).toContain('data-testid="room-invite-link"');
    expect(html).toContain('/room/ROOM42');
  });

  it('shows the waiting-ready copy only once', () => {
    const html = renderGameRoom(waitingRoomState, 'p1');
    const waitingReadyCount = (html.match(/等待玩家准备/g) || []).length;

    expect(waitingReadyCount).toBe(1);
  });

  it('shows only one waiting prompt when the room is still filling', () => {
    const html = renderGameRoom(waitingRoomStateWithOnePlayer, 'p1');
    const waitingPromptCount = (html.match(/等待更多玩家加入/g) || []).length;

    expect(waitingPromptCount).toBe(1);
  });

  it('renders the current hand inside the integrated table shell', () => {
    const html = renderGameRoom(playingRoomState, 'p1');

    expect(html).toContain('data-testid="table-hand-zone"');
  });

  it('passes relative seat labels and play info into the integrated seat cards', () => {
    const html = renderGameRoom(
      playingRoomState,
      'p1',
      (props: any) => `PLAYER_CARD:${props.displayPosition}:${props.playInfo?.cards?.length || 0}`
    );

    expect(html).toContain('PLAYER_CARD:north:1');
    expect(html).toContain('PLAYER_CARD:south:0');
  });

  it('uses the same seat width for all four integrated seat slots', () => {
    const html = renderGameRoom(waitingRoomState, 'p1');
    const uniformSeatWidthCount = (html.match(/w-\[190px\]/g) || []).length;

    expect(uniformSeatWidthCount).toBe(4);
  });

  it('shows a tribute prompt and tribute action for the active tribute giver', () => {
    const html = renderGameRoom(
      tributingGivingRoomState,
      'p4',
      () => 'PLAYER_CARD',
      (props: any) => `HAND_CARDS:${props.mode}:${props.submitLabel}:${props.canSubmit}`
    );

    expect(html).toContain('data-testid="tribute-status"');
    expect(html).toContain('HAND_CARDS:tribute:tribute:true');
  });

  it('allows either double-tribute giver to submit while both tribute selections are pending', () => {
    const westHtml = renderGameRoom(
      tributingDoubleGivingRoomState,
      'p2',
      () => 'PLAYER_CARD',
      (props: any) => `HAND_CARDS:${props.mode}:${props.submitLabel}:${props.canSubmit}`
    );
    const eastHtml = renderGameRoom(
      tributingDoubleGivingRoomState,
      'p4',
      () => 'PLAYER_CARD',
      (props: any) => `HAND_CARDS:${props.mode}:${props.submitLabel}:${props.canSubmit}`
    );

    expect(westHtml).toContain('HAND_CARDS:tribute:tribute:true');
    expect(eastHtml).toContain('HAND_CARDS:tribute:tribute:true');
  });

  it('shows a tribute prompt and return action for the active return player', () => {
    const html = renderGameRoom(
      tributingReturningRoomState,
      'p1',
      () => 'PLAYER_CARD',
      (props: any) => `HAND_CARDS:${props.mode}:${props.submitLabel}:${props.canSubmit}`
    );

    expect(html).toContain('data-testid="tribute-status"');
    expect(html).toContain('HAND_CARDS:tribute:return:true');
  });

  it('renders revealed tribute actions in the public tribute status area', () => {
    const html = renderGameRoom(tributingReturningRoomState, 'p2');

    expect(html).toContain('data-testid="tribute-status"');
    expect(html).toContain('data-testid="tribute-action-log"');
  });

  it('shows clearer room-unavailable copy when joining the room fails', () => {
    const html = renderErroredGameRoom('房间不存在');

    expect(html).toContain('data-testid="room-join-error"');
    expect(html).toContain('data-testid="room-join-help"');
  });
});
