import { buildSettlementSummary } from '../settlementSummary';
import type { RoomState } from '../../types';

describe('settlementSummary', () => {
  test('builds Chinese settlement labels from a finished room state', () => {
    const roomState: RoomState = {
      roomId: 'ABC123',
      players: [
        {
          id: 'p1',
          name: '张三',
          position: 'south',
          team: 'red',
          hand: [],
          isReady: false,
          cardsRemaining: 0,
          rank: 1,
        },
        {
          id: 'p2',
          name: '李四',
          position: 'west',
          team: 'blue',
          hand: [],
          isReady: false,
          cardsRemaining: 0,
          rank: 2,
        },
        {
          id: 'p3',
          name: '王五',
          position: 'north',
          team: 'blue',
          hand: [],
          isReady: false,
          cardsRemaining: 0,
          rank: 4,
        },
        {
          id: 'p4',
          name: '赵六',
          position: 'east',
          team: 'red',
          hand: [],
          isReady: false,
          cardsRemaining: 0,
          rank: 3,
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

    expect(buildSettlementSummary(roomState)).toEqual({
      title: '本局结束',
      winner: '胜方：红队',
      levelChange: '本局升级：2级',
      nextLevel: '下一局级牌：4',
      redRanks: '红队名次：1、3',
      blueRanks: '蓝队名次：2、4',
    });
  });
});
