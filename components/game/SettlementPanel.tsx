import { buildSettlementSummary } from '@/lib/ui/settlementSummary';
import { RoomState } from '@/lib/types';

interface SettlementPanelProps {
  roomState: RoomState;
}

function getTeamLabel(team: 'red' | 'blue'): string {
  return team === 'red' ? '红队' : '蓝队';
}

export default function SettlementPanel({ roomState }: SettlementPanelProps) {
  const summary = buildSettlementSummary(roomState);
  const rankedPlayers = [...roomState.players]
    .filter((player) => player.rank !== undefined)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-900">
          {summary?.title ?? '本局结束'}
        </h2>
        {summary && (
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p>{summary.winner}</p>
            <p>{summary.levelChange}</p>
            <p>{summary.nextLevel}</p>
            <p>{summary.redRanks}</p>
            <p>{summary.blueRanks}</p>
          </div>
        )}
      </div>

      {rankedPlayers.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rankedPlayers.map((player) => (
            <div
              key={player.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <p className="font-semibold text-slate-900">
                第 {player.rank} 名 · {player.name}
              </p>
              <p className="text-xs text-slate-500">
                {getTeamLabel(player.team)} · {player.position}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
