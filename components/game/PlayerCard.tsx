import { Player, Position } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
  compact?: boolean;
}

const positionNames: Record<Position, string> = {
  south: '南',
  west: '西',
  north: '北',
  east: '东',
};

export default function PlayerCard({
  player,
  isCurrentTurn,
  isSelf,
  compact = false,
}: PlayerCardProps) {
  const teamColor = player.team === 'red' ? 'bg-red-500' : 'bg-blue-500';
  const teamBgColor = player.team === 'red' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const teamTextColor = player.team === 'red' ? 'text-red-700' : 'text-blue-700';
  const rootSpacing = compact ? 'p-2 sm:p-2.5' : 'p-2 sm:p-4';
  const turnBadgeClassName = compact
    ? '-top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6'
    : '-top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8';
  const selfBadgeClassName = compact
    ? '-top-1 -left-1 sm:-top-1.5 sm:-left-1.5 w-4 h-4 sm:w-5 sm:h-5'
    : '-top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6';
  const teamBadgeClassName = compact ? 'w-5 h-5' : 'w-6 h-6';
  const teamTextClassName = compact ? 'text-xs sm:text-sm' : 'text-sm';
  const titleClassName = compact ? 'text-base sm:text-lg' : 'text-lg';
  const subtitleClassName = compact ? 'text-xs' : 'text-sm';
  const cardsSectionClassName = compact ? 'mt-2 pt-2' : 'mt-3 pt-3';
  const cardsRowClassName = compact ? 'text-xs sm:text-sm' : 'text-sm';
  const cardPipClassName = compact ? 'w-1.5 h-2.5' : 'w-2 h-3';
  const overflowTextClassName = compact ? 'text-[10px] text-gray-500 ml-1' : 'text-xs text-gray-500 ml-1';

  return (
    <div
      data-layout={compact ? 'compact' : 'default'}
      className={`
        player-card ${compact ? 'player-card--compact' : 'player-card--default'}
        relative ${rootSpacing} rounded-lg border-2 transition-all duration-300
        ${isCurrentTurn ? 'bg-blue-50 border-4 border-blue-500 scale-105 shadow-lg' : teamBgColor}
        ${isSelf ? 'shadow-md' : ''}
      `}
    >
      {isCurrentTurn && (
        <div className={`absolute ${turnBadgeClassName} bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-pulse`}>
          <span className="text-xs font-bold text-yellow-900 hidden sm:inline">出牌</span>
          <span className="text-xs font-bold text-yellow-900 sm:hidden">!</span>
        </div>
      )}

      {isSelf && (
        <div className={`absolute ${selfBadgeClassName} bg-green-500 rounded-full flex items-center justify-center shadow-md`}>
          <span className="text-xs font-bold text-white">我</span>
        </div>
      )}

      <div className={`flex items-center justify-center ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className={`${teamBadgeClassName} ${teamColor} rounded-full`} />
        <span className={`ml-2 ${teamTextClassName} font-semibold ${teamTextColor}`}>
          {player.team === 'red' ? '红队' : '蓝队'}
        </span>
      </div>

      <div className="text-center mb-2">
        <h3 className={`${titleClassName} font-bold text-gray-800 truncate`}>{player.name}</h3>
        <p className={`${subtitleClassName} text-gray-500`}>{positionNames[player.position]}</p>
      </div>

      {player.isReady && !player.rank && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            已准备
          </span>
        </div>
      )}

      {player.rank && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-sm font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
            第 {player.rank} 名
          </span>
        </div>
      )}

      <div className={`${cardsSectionClassName} border-t border-gray-200`}>
        <div className={`flex items-center justify-between ${cardsRowClassName}`}>
          <span className="text-gray-600">剩余牌数</span>
          <span className="font-bold text-gray-800">{player.cardsRemaining}</span>
        </div>
        <div className="mt-2 flex gap-1 justify-center">
          {Array.from({ length: Math.min(player.cardsRemaining, 10) }).map((_, i) => (
            <div
              key={i}
              className={`${cardPipClassName} bg-gray-400 rounded-sm`}
            />
          ))}
          {player.cardsRemaining > 10 && (
            <span className={overflowTextClassName}>+</span>
          )}
        </div>
      </div>

      {player.cardsRemaining === 0 && !player.rank && (
        <div className="mt-2 text-center text-xs text-gray-500">
          已出完
        </div>
      )}
    </div>
  );
}
