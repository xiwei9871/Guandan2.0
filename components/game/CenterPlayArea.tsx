'use client';

import { RoomState, Position } from '@/lib/types';
import PlayedCards from './PlayedCards';

interface CenterPlayAreaProps {
  roomState: RoomState;
  currentPlayerId: string;
}

const positionNames: Record<Position, string> = {
  south: '南',
  west: '西',
  north: '北',
  east: '东',
};

function getGamePhaseMessage(phase: string): string {
  switch (phase) {
    case 'waiting':
      return '等待玩家准备';
    case 'tributing':
      return '进贡阶段';
    case 'playing':
      return '游戏进行中';
    case 'finished':
      return '游戏结束';
    default:
      return '等待开始';
  }
}

export default function CenterPlayArea({ roomState, currentPlayerId }: CenterPlayAreaProps) {
  const { lastPlays, currentTurn, gamePhase, players, currentLevel } = roomState;

  // Get player info for each position
  const getPlayerByPosition = (position: Position) => {
    return players.find(p => p.position === position);
  };

  // Get play info for each position
  const getPlayByPosition = (position: Position) => {
    if (!lastPlays) return null;
    return lastPlays[position] || null;
  };

  // Check if a position is the current turn
  const isPositionCurrentTurn = (position: Position) => {
    const player = getPlayerByPosition(position);
    return player ? players.indexOf(player) === currentTurn : false;
  };

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-green-200 to-green-300 border-4 border-green-400 rounded-lg shadow-inner overflow-hidden">
      {/* Center Status Message */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-gray-700 text-center">
            {getGamePhaseMessage(gamePhase)}
          </p>
          {gamePhase === 'playing' && (
            <p className="text-xs text-gray-500 text-center mt-1">
              当前级牌: {currentLevel}
            </p>
          )}
        </div>
      </div>

      {/* North Position - Top Center */}
      {(() => {
        const play = getPlayByPosition('north');
        const player = getPlayerByPosition('north');
        if (!play && !player) return null;
        return (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <PlayedCards
              cards={play?.cards || []}
              playerName={player?.name || positionNames.north}
              position="north"
              isPass={play?.isPass || false}
              isCurrentPlayer={isPositionCurrentTurn('north')}
              currentLevel={currentLevel}
            />
          </div>
        );
      })()}

      {/* West Position - Left Center */}
      {(() => {
        const play = getPlayByPosition('west');
        const player = getPlayerByPosition('west');
        if (!play && !player) return null;
        return (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <PlayedCards
              cards={play?.cards || []}
              playerName={player?.name || positionNames.west}
              position="west"
              isPass={play?.isPass || false}
              isCurrentPlayer={isPositionCurrentTurn('west')}
              currentLevel={currentLevel}
            />
          </div>
        );
      })()}

      {/* East Position - Right Center */}
      {(() => {
        const play = getPlayByPosition('east');
        const player = getPlayerByPosition('east');
        if (!play && !player) return null;
        return (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <PlayedCards
              cards={play?.cards || []}
              playerName={player?.name || positionNames.east}
              position="east"
              isPass={play?.isPass || false}
              isCurrentPlayer={isPositionCurrentTurn('east')}
              currentLevel={currentLevel}
            />
          </div>
        );
      })()}

      {/* South Position - Bottom Center */}
      {(() => {
        const play = getPlayByPosition('south');
        const player = getPlayerByPosition('south');
        if (!play && !player) return null;
        return (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <PlayedCards
              cards={play?.cards || []}
              playerName={player?.name || positionNames.south}
              position="south"
              isPass={play?.isPass || false}
              isCurrentPlayer={isPositionCurrentTurn('south')}
              currentLevel={currentLevel}
            />
          </div>
        );
      })()}

      {/* Empty state when no plays and game is starting */}
      {!lastPlays && gamePhase === 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-green-800 text-opacity-60 text-sm">等待出牌...</p>
        </div>
      )}
    </div>
  );
}
