'use client';

import { Card, Position } from '@/lib/types';

interface PlayedCardsProps {
  cards: Card[];
  playerName: string;
  position: Position;
  isPass?: boolean;
  isCurrentPlayer?: boolean;
  currentLevel?: number;
}

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<string, string> = {
  spades: 'text-gray-800',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-800',
};

const rankDisplay: Record<number, string> = {
  1: 'A',
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
  15: '王',
};

function getCardDisplay(card: Card, currentLevel: number = 2): string {
  // Jokers
  if (card.rank === 15) {
    return card.suit === 'spades' ? '大王' : '小王';
  }

  // Level cards
  if (card.levelCard) {
    return rankDisplay[currentLevel] || String(currentLevel);
  }

  // Regular cards
  return rankDisplay[card.rank] || String(card.rank);
}

const positionNames: Record<Position, string> = {
  south: '南',
  west: '西',
  north: '北',
  east: '东',
};

export default function PlayedCards({
  cards,
  playerName,
  position,
  isPass = false,
  isCurrentPlayer = false,
  currentLevel = 2,
}: PlayedCardsProps) {
  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md p-2 sm:p-3 transition-all duration-200
        ${isCurrentPlayer ? 'ring-2 ring-blue-400 border-2 border-blue-400' : 'border border-gray-200'}
      `}
    >
      {/* Current Player Indicator */}
      {isCurrentPlayer && (
        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
          <span className="text-xs font-bold text-white">●</span>
        </div>
      )}

      {/* Player Name and Position */}
      <div className="mb-2 text-center">
        <h4 className="text-sm font-semibold text-gray-800 truncate">{playerName}</h4>
        <p className="text-xs text-gray-500">{positionNames[position]}</p>
      </div>

      {/* Cards or Pass Display */}
      <div className="flex flex-col items-center justify-center min-h-[3rem]">
        {isPass ? (
          // Pass Display
          <div className="px-3 py-1 bg-gray-200 rounded-full">
            <span className="text-xs font-medium text-gray-600">不要</span>
          </div>
        ) : cards.length === 0 ? (
          // Empty state
          <div className="text-xs text-gray-400">等待出牌...</div>
        ) : (
          // Cards Display
          <div className="flex flex-wrap justify-center gap-0 -ml-1">
            {cards.map((card, index) => {
              const isJoker = card.rank === 15;
              const jokerColor = card.suit === 'spades' ? 'text-red-600' : 'text-gray-800';
              const cardColor = isJoker ? jokerColor : suitColors[card.suit];

              return (
                <div
                  key={card.id}
                  className={`
                    relative w-8 h-11 sm:w-10 sm:h-14 rounded border-2 flex-shrink-0
                    bg-white shadow-sm
                  `}
                  style={{ marginLeft: index > 0 ? '-0.5rem' : '0' }}
                >
                  {/* Card Content */}
                  <div className={`absolute top-0 left-0 w-full h-full p-0.5 flex flex-col items-center justify-center ${cardColor}`}>
                    {/* Jokers show simplified display */}
                    {isJoker ? (
                      <div className="text-xs sm:text-sm font-bold">
                        {card.suit === 'spades' ? '大王' : '小王'}
                      </div>
                    ) : (
                      <>
                        {/* Rank */}
                        <div className="text-xs sm:text-sm font-bold leading-none">
                          {getCardDisplay(card, currentLevel)}
                        </div>
                        {/* Suit */}
                        <div className="text-sm sm:text-base leading-none">
                          {suitSymbols[card.suit]}
                        </div>
                      </>
                    )}

                    {/* Level Card Indicator */}
                    {card.levelCard && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full" />
                    )}

                    {/* Wildcard Indicator */}
                    {card.isWildcard && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Count Badge */}
      {!isPass && cards.length > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {cards.length}张
          </span>
        </div>
      )}
    </div>
  );
}
