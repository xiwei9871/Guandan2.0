export const DECK_SIZE = 108; // Two standard decks.
export const HAND_SIZE = 27; // 27 cards per player.
export const MAX_PLAYERS = 4;
export const ROOM_ID_MAX_LENGTH = 10;
export const PLAYER_NAME_MAX_LENGTH = 20;
export const ROOM_ENTRY_RATE_LIMIT_WINDOW_MS = 10000;
export const ROOM_ENTRY_RATE_LIMIT_MAX = 10;

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const LEVEL_NAMES: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const TEAM_NAMES: Record<string, string> = {
  red: '红队',
  blue: '蓝队',
};

export const SOCKET_EVENTS = {
  CLIENT: {
    CREATE_ROOM: 'room:create',
    JOIN_ROOM: 'room:join',
    LEAVE_ROOM: 'room:leave',
    SET_READY: 'room:ready',
    START_GAME: 'game:start',
    PLAY_CARDS: 'game:play',
    PASS_TURN: 'game:pass',
    SUBMIT_TRIBUTE: 'game:tribute',
    RETURN_TRIBUTE: 'game:returnTribute',
  },
  SERVER: {
    ROOM_UPDATED: 'room:updated',
    PLAYER_JOINED: 'room:playerJoined',
    PLAYER_LEFT: 'room:playerLeft',
    GAME_STATE_CHANGED: 'game:stateChanged',
    PLAYER_PLAYED: 'game:playerPlayed',
    TURN_CHANGED: 'game:turnChanged',
    ROUND_ENDED: 'game:roundEnded',
    ERROR: 'error',
  },
} as const;
