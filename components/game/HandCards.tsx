'use client';

import { Card } from '@/lib/types';
import { useCardSelection } from '@/hooks/useCardSelection';

interface HandCardsProps {
  cards: Card[];
  currentLevel: number;
  onPlayCards: (cards: Card[]) => void;
  onPass: () => void;
  isCurrentTurn: boolean;
  canPlay: boolean;
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
};

export default function HandCards({
  cards,
  currentLevel,
  onPlayCards,
  onPass,
  isCurrentTurn,
  canPlay,
}: HandCardsProps) {
  const { toggleCard, clearSelection, isCardSelected, getSelectedCards } = useCardSelection();

  const selectedCardObjects = getSelectedCards(cards);

  const handlePlayCards = () => {
    if (selectedCardObjects.length > 0) {
      onPlayCards(selectedCardObjects);
      clearSelection();
    }
  };

  const handlePass = () => {
    onPass();
    clearSelection();
  };

  // Sort cards by suit and rank
  const sortedCards = [...cards].sort((a, b) => {
    const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return b.rank - a.rank; // Higher rank first
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          手牌 ({cards.length})
        </h3>
        <div className="text-sm text-gray-600">
          级牌: {rankDisplay[currentLevel] || currentLevel}
        </div>
      </div>

      {/* Cards Container */}
      <div className="mb-4 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {sortedCards.map((card) => {
            const selected = isCardSelected(card.id);
            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                disabled={!isCurrentTurn}
                className={`
                  relative w-16 h-24 rounded-lg border-2 transition-all duration-200
                  ${selected
                    ? 'border-blue-500 shadow-lg transform -translate-y-2'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${!isCurrentTurn ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                  bg-white
                `}
              >
                {/* Card Content */}
                <div className={`flex flex-col items-center justify-center h-full ${suitColors[card.suit]}`}>
                  {/* Rank */}
                  <div className="text-xl font-bold">
                    {rankDisplay[card.rank] || card.rank}
                  </div>

                  {/* Suit */}
                  <div className="text-2xl">
                    {suitSymbols[card.suit]}
                  </div>

                  {/* Level Card Indicator */}
                  {card.levelCard && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-900">级</span>
                    </div>
                  )}

                  {/* Wildcard Indicator */}
                  {card.isWildcard && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">配</span>
                    </div>
                  )}

                  {/* Selected Checkmark */}
                  {selected && (
                    <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {isCurrentTurn && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={handlePlayCards}
            disabled={selectedCardObjects.length === 0 || !canPlay}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all duration-200
              ${selectedCardObjects.length > 0 && canPlay
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            出牌 ({selectedCardObjects.length})
          </button>

          {canPlay && (
            <button
              onClick={handlePass}
              className="px-6 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all duration-200"
            >
              不要
            </button>
          )}

          {selectedCardObjects.length > 0 && (
            <button
              onClick={clearSelection}
              className="px-6 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
            >
              清除
            </button>
          )}
        </div>
      )}

      {/* Instructions */}
      {isCurrentTurn && selectedCardObjects.length === 0 && (
        <div className="mt-3 text-center text-sm text-gray-600">
          点击手牌选择要出的牌
        </div>
      )}

      {/* Waiting Message */}
      {!isCurrentTurn && (
        <div className="mt-3 text-center text-sm text-gray-600">
          等待其他玩家出牌...
        </div>
      )}
    </div>
  );
}
