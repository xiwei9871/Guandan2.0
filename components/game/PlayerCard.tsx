import { Card, GamePhase, Player, PlayInfo, Position } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
  compact?: boolean;
  displayPosition?: Position;
  playInfo?: PlayInfo | null;
  gamePhase?: GamePhase;
}

const positionNames: Record<Position, string> = {
  south: '南',
  west: '西',
  north: '北',
  east: '东',
};

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

function getCardLabel(card: Card): string {
  if (card.rank === 15) {
    return card.suit === 'spades' ? '大王' : '小王';
  }

  return rankDisplay[card.rank] || String(card.rank);
}

export default function PlayerCard({
  player,
  isCurrentTurn,
  isSelf,
  compact = false,
  displayPosition,
  playInfo = null,
  gamePhase = 'playing',
}: PlayerCardProps) {
  const seatPosition = displayPosition || player.position;
  const teamAccent = player.team === 'red' ? 'bg-red-500' : 'bg-blue-500';
  const shellClassName = compact ? 'rounded-2xl p-2.5' : 'rounded-3xl p-3';
  const titleClassName = compact ? 'text-sm' : 'text-base';
  const countClassName = compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const playAreaClassName = compact ? 'min-h-[82px]' : 'min-h-[96px]';
  const cardClassName = compact ? 'h-11 w-8 text-xs' : 'h-14 w-10 text-sm';
  const statusClassName = compact ? 'text-[10px]' : 'text-xs';
  const cards = playInfo?.cards || [];

  const countLabel =
    gamePhase === 'waiting' && player.cardsRemaining === 0 ? '未发牌' : `${player.cardsRemaining} 张`;

  const emptyStateLabel =
    gamePhase === 'waiting'
      ? '待发牌'
      : player.cardsRemaining === 0
        ? '已出完牌'
        : '等待出牌...';

  return (
    <div
      data-layout={compact ? 'compact' : 'default'}
      data-seat-card="integrated"
      data-team={player.team}
      className={`player-card ${compact ? 'player-card--compact' : 'player-card--default'} relative overflow-hidden border border-white/60 bg-white/88 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur ${shellClassName}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${teamAccent}`} />

      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${teamAccent}`} />
            <h3 className={`${titleClassName} truncate font-semibold text-slate-900`}>{player.name}</h3>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {positionNames[seatPosition]}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full bg-slate-900/6 font-semibold text-slate-600 ${countClassName}`}>
              {countLabel}
            </span>
            {player.rank ? (
              <span className={`${statusClassName} rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700`}>
                第 {player.rank} 名
              </span>
            ) : player.isReady ? (
              <span className={`${statusClassName} rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700`}>
                已准备
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex max-w-[86px] flex-wrap justify-end gap-1">
          {isCurrentTurn && (
            <span className={`${statusClassName} rounded-full bg-amber-300 px-2 py-0.5 font-bold text-amber-950`}>
              出牌中
            </span>
          )}
          {isSelf && (
            <span className={`${statusClassName} rounded-full bg-blue-500 px-2 py-0.5 font-bold text-white`}>
              我
            </span>
          )}
        </div>
      </div>

      <div className={`ml-1.5 rounded-2xl border border-slate-200/70 bg-white/80 px-2 py-2 ${playAreaClassName}`}>
        {playInfo?.isPass ? (
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">不要</span>
          </div>
        ) : cards.length > 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center justify-center">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className={`relative -ml-2 first:ml-0 rounded-xl border border-slate-200 bg-white shadow-sm ${cardClassName}`}
                  style={{ zIndex: index + 1 }}
                >
                  <div className="flex h-full flex-col items-center justify-center">
                    <span className={`font-bold ${suitColors[card.suit]}`}>{getCardLabel(card)}</span>
                    {card.rank !== 15 && (
                      <span className={`text-base leading-none ${suitColors[card.suit]}`}>
                        {suitSymbols[card.suit]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">{emptyStateLabel}</div>
        )}
      </div>
    </div>
  );
}
