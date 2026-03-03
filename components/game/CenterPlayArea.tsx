'use client';

import { RoomState } from '@/lib/types';

interface CenterPlayAreaProps {
  roomState: RoomState;
  currentPlayerId: string;
}

function getGamePhaseMessage(phase: string): string {
  switch (phase) {
    case 'waiting':
      return '等待玩家准备';
    case 'tributing':
      return '进贡阶段';
    case 'playing':
      return '本轮进行中';
    case 'finished':
      return '本局结束';
    default:
      return '等待开始';
  }
}

export default function CenterPlayArea({ roomState }: CenterPlayAreaProps) {
  const { gamePhase, currentLevel, currentTurn, players } = roomState;
  const currentTurnPlayer = typeof currentTurn === 'number' ? players[currentTurn] : null;

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[9%] rounded-[50%] border border-slate-900/10 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18)_0%,_rgba(255,255,255,0.05)_48%,_rgba(15,23,42,0.08)_100%)] shadow-[inset_0_8px_24px_rgba(255,255,255,0.15),inset_0_-20px_40px_rgba(15,23,42,0.08)]" />

      <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <div className="rounded-[28px] bg-white/90 px-5 py-3 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-slate-700">{getGamePhaseMessage(gamePhase)}</p>
          <p className="mt-1 text-xs text-slate-500">级牌 {currentLevel > 13 ? 'A' : currentLevel}</p>
        </div>

        {gamePhase === 'playing' && currentTurnPlayer && (
          <div className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white shadow">
            轮到 {currentTurnPlayer.name}
          </div>
        )}
      </div>
    </div>
  );
}
