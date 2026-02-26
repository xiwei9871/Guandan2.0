import { Player, Position } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
}

const positionNames: Record<Position, string> = {
  south: '南',
  west: '西',
  north: '北',
  east: '东',
};

export default function PlayerCard({ player, isCurrentTurn, isSelf }: PlayerCardProps) {
  const teamColor = player.team === 'red' ? 'bg-red-500' : 'bg-blue-500';
  const teamBgColor = player.team === 'red' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const teamTextColor = player.team === 'red' ? 'text-red-700' : 'text-blue-700';

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-300
        ${teamBgColor}
        ${isCurrentTurn ? 'ring-4 ring-yellow-400 ring-opacity-75 scale-105 shadow-lg' : ''}
        ${isSelf ? 'shadow-md' : ''}
      `}
    >
      {/* Turn Indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-pulse">
          <span className="text-xs font-bold text-yellow-900">出牌</span>
        </div>
      )}

      {/* Self Indicator */}
      {isSelf && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
          <span className="text-xs font-bold text-white">我</span>
        </div>
      )}

      {/* Team Badge */}
      <div className={`flex items-center justify-center mb-3`}>
        <div className={`w-6 h-6 ${teamColor} rounded-full`} />
        <span className={`ml-2 text-sm font-semibold ${teamTextColor}`}>
          {player.team === 'red' ? '红队' : '蓝队'}
        </span>
      </div>

      {/* Player Name */}
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-gray-800 truncate">{player.name}</h3>
        <p className="text-sm text-gray-500">{positionNames[player.position]}</p>
      </div>

      {/* Ready Status */}
      {player.isReady && !player.rank && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            已准备
          </span>
        </div>
      )}

      {/* Rank (if finished) */}
      {player.rank && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-sm font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
            第{player.rank}名
          </span>
        </div>
      )}

      {/* Cards Remaining */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">剩余牌数</span>
          <span className="font-bold text-gray-800">{player.cardsRemaining}</span>
        </div>
        {/* Card count indicator */}
        <div className="mt-2 flex gap-1 justify-center">
          {Array.from({ length: Math.min(player.cardsRemaining, 10) }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-3 bg-gray-400 rounded-sm"
            />
          ))}
          {player.cardsRemaining > 10 && (
            <span className="text-xs text-gray-500 ml-1">+</span>
          )}
        </div>
      </div>

      {/* Empty state indicator */}
      {player.cardsRemaining === 0 && !player.rank && (
        <div className="mt-2 text-center text-xs text-gray-500">
          已出完
        </div>
      )}
    </div>
  );
}
