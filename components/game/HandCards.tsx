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
  canPass: boolean;
  mode?: 'play' | 'tribute';
  submitLabel?: 'play' | 'tribute' | 'return';
  onSubmitSelected?: (cards: Card[]) => void;
  canSubmit?: boolean;
}

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<string, string> = {
  spades: 'text-slate-800',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-800',
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

function getCardDisplay(card: Card, currentLevel: number): string {
  if (card.rank === 15) {
    return card.suit === 'spades' ? '大王' : '小王';
  }

  if (card.levelCard) {
    return rankDisplay[currentLevel] || String(currentLevel);
  }

  return rankDisplay[card.rank] || String(card.rank);
}

export default function HandCards({
  cards,
  currentLevel,
  onPlayCards,
  onPass,
  isCurrentTurn,
  canPlay,
  canPass,
  mode = 'play',
  submitLabel = 'play',
  onSubmitSelected,
  canSubmit = false,
}: HandCardsProps) {
  const { toggleCard, clearSelection, isCardSelected, getSelectedCards } = useCardSelection();
  const selectedCardObjects = getSelectedCards(cards);

  const isTributeMode = mode === 'tribute';
  const canSubmitTribute = isTributeMode && canSubmit && selectedCardObjects.length === 1;
  const tributeButtonLabel = submitLabel === 'return' ? '还贡' : '进贡';

  const handlePlayCards = () => {
    if (selectedCardObjects.length === 0) return;
    onPlayCards(selectedCardObjects);
    clearSelection();
  };

  const handlePass = () => {
    if (!canPass) return;
    onPass();
    clearSelection();
  };

  const handleSubmitSelected = () => {
    if (!onSubmitSelected || !canSubmitTribute) return;
    onSubmitSelected(selectedCardObjects);
    clearSelection();
  };

  const sortedCards = [...cards].sort((a, b) => {
    if (a.rank === 15 && b.rank !== 15) return -1;
    if (b.rank === 15 && a.rank !== 15) return 1;
    if (a.rank === 15 && b.rank === 15) {
      return a.suit === 'spades' ? -1 : 1;
    }
    if (a.levelCard && !b.levelCard) return -1;
    if (!a.levelCard && b.levelCard) return 1;
    if (a.rank !== b.rank) return b.rank - a.rank;

    const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
    return suitOrder[a.suit] - suitOrder[b.suit];
  });

  return (
    <div className="rounded-[28px] border border-white/55 bg-white/84 px-4 py-4 shadow-[0_24px_48px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">手牌 ({cards.length})</h3>
          <p className="text-xs text-slate-500">级牌 {rankDisplay[currentLevel] || currentLevel}</p>
        </div>

        <div
          data-testid="hand-actions"
          className="flex flex-wrap items-center gap-2 self-end sm:max-w-[260px] sm:justify-end"
        >
          {isTributeMode ? (
            <>
              <button
                data-testid="tribute-submit"
                data-submit-label={submitLabel}
                onClick={handleSubmitSelected}
                disabled={!canSubmitTribute}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  canSubmitTribute
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {tributeButtonLabel}
              </button>

              {selectedCardObjects.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600"
                >
                  清除
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handlePlayCards}
                disabled={selectedCardObjects.length === 0 || !canPlay}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selectedCardObjects.length > 0 && canPlay
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                出牌 ({selectedCardObjects.length})
              </button>

              {canPass && (
                <button
                  onClick={handlePass}
                  className="rounded-full bg-slate-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  不要
                </button>
              )}

              {selectedCardObjects.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600"
                >
                  清除
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div data-testid="hand-card-strip" className="overflow-x-auto overflow-y-hidden pb-3">
        <div className="flex min-w-max items-end justify-center px-2 sm:px-4">
          {sortedCards.map((card, index) => {
            const selected = isCardSelected(card.id);
            const cardColor =
              card.rank === 15
                ? card.suit === 'spades'
                  ? 'text-red-600'
                  : 'text-slate-800'
                : suitColors[card.suit];

            return (
              <button
                key={card.id}
                onClick={() => toggleCard(card.id)}
                disabled={!isCurrentTurn}
                className={`relative -ml-4 first:ml-0 h-28 w-20 rounded-2xl border border-slate-200 bg-white shadow-md transition ${
                  selected ? '-translate-y-3 border-blue-500 shadow-xl' : 'hover:-translate-y-1'
                } ${!isCurrentTurn ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                style={{ zIndex: selected ? 30 : index + 1 }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${cardColor}`}>{getCardDisplay(card, currentLevel)}</span>
                  {card.rank !== 15 && (
                    <span className={`text-[30px] leading-none ${cardColor}`}>{suitSymbols[card.suit]}</span>
                  )}
                </div>

                {card.levelCard && (
                  <div className="absolute right-1 top-1 rounded-full bg-amber-300 px-1 text-[10px] font-bold text-amber-950">
                    级
                  </div>
                )}

                {card.isWildcard && (
                  <div className="absolute bottom-1 right-1 rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    百
                  </div>
                )}

                {selected && (
                  <div className="absolute left-1 top-1 rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                    选
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-slate-500">
        {isTributeMode
          ? submitLabel === 'return'
            ? '请选择 1 张牌还贡，只有 10 及以下的牌能通过校验'
            : '请选择 1 张牌进贡，只有当前最大合法牌点的牌能通过校验'
          : isCurrentTurn
            ? '点击手牌进行选择'
            : '等待其他玩家出牌...'}
      </div>
    </div>
  );
}
