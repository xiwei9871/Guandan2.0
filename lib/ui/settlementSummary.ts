import type { RoomState, Team } from '../types';

interface SettlementSummary {
  title: string;
  winner: string;
  levelChange: string;
  nextLevel: string;
  redRanks: string;
  blueRanks: string;
}

function getTeamLabel(team: Team): string {
  return team === 'red' ? '红队' : '蓝队';
}

function formatRanks(ranks: number[]): string {
  return ranks.join('、');
}

function formatLevel(level: number): string {
  return level > 13 ? 'A' : String(level);
}

export function buildSettlementSummary(
  roomState: Pick<RoomState, 'currentLevel' | 'result'>
): SettlementSummary | null {
  if (!roomState.result) {
    return null;
  }

  return {
    title: '本局结束',
    winner: `胜方：${getTeamLabel(roomState.result.winner)}`,
    levelChange: `本局升级：${roomState.result.levelChange}级`,
    nextLevel: `下一局级牌：${formatLevel(roomState.currentLevel)}`,
    redRanks: `红队名次：${formatRanks(roomState.result.redRanks)}`,
    blueRanks: `蓝队名次：${formatRanks(roomState.result.blueRanks)}`,
  };
}
