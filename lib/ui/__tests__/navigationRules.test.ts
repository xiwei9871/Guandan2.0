import {
  normalizeRoomId,
  getCreateRoomGuard,
  getJoinRoomGuard,
  getRoomActionState,
} from '../navigationRules';

describe('navigationRules', () => {
  describe('normalizeRoomId', () => {
    test('keeps only uppercase letters and digits and limits to 10 chars', () => {
      expect(normalizeRoomId(' ab-12_cd ef 3456 ')).toBe('AB12CDEF34');
    });
  });

  describe('getCreateRoomGuard', () => {
    test('blocks creation when name is empty', () => {
      expect(
        getCreateRoomGuard({
          playerName: '   ',
          isConnected: true,
          isBusy: false,
        })
      ).toEqual({
        disabled: true,
        reason: '请先输入你的名字。',
      });
    });

    test('allows creation when input is valid and connected', () => {
      expect(
        getCreateRoomGuard({
          playerName: 'Alice',
          isConnected: true,
          isBusy: false,
        })
      ).toEqual({
        disabled: false,
        reason: null,
      });
    });
  });

  describe('getJoinRoomGuard', () => {
    test('blocks join when room id is empty', () => {
      expect(
        getJoinRoomGuard({
          playerName: 'Alice',
          roomId: '  ',
          isConnected: true,
          isBusy: false,
        })
      ).toEqual({
        disabled: true,
        reason: '请输入房间号。',
      });
    });
  });

  describe('getRoomActionState', () => {
    test('shows start game only when all 4 players are ready', () => {
      expect(
        getRoomActionState({
          gamePhase: 'waiting',
          isConnected: true,
          isLeaving: false,
          currentPlayerReady: true,
          playersCount: 4,
          allPlayersReady: true,
        })
      ).toMatchObject({
        showReady: false,
        showStart: true,
        canStart: true,
      });
    });

    test('disables leave while leaving in progress', () => {
      expect(
        getRoomActionState({
          gamePhase: 'playing',
          isConnected: true,
          isLeaving: true,
          currentPlayerReady: true,
          playersCount: 4,
          allPlayersReady: true,
        }).canLeave
      ).toBe(false);
    });
  });
});
