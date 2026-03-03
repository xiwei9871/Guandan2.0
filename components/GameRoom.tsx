'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/constants';
import { Card, Player, RoomState } from '@/lib/types';
import { canCurrentPlayerPass, canCurrentPlayerPlay } from '@/lib/game/roundRules';
import { isRoomOwner } from '@/lib/game/lobbyRules';
import { clearStoredPlayerName, getOrCreatePlayerClientId, getStoredPlayerName } from '@/lib/clientIdentity';
import PlayerCard from './game/PlayerCard';
import HandCards from './game/HandCards';
import CenterPlayArea from './game/CenterPlayArea';
import SettlementPanel from './game/SettlementPanel';

interface GameRoomProps {
  roomId: string;
}

type RelativeSeat = 'bottom' | 'left' | 'top' | 'right';

const displayPositionBySeat: Record<RelativeSeat, Player['position']> = {
  bottom: 'south',
  left: 'west',
  top: 'north',
  right: 'east',
};

const positionOrder: Player['position'][] = ['south', 'west', 'north', 'east'];
const relativeSeatByOffset: RelativeSeat[] = ['bottom', 'left', 'top', 'right'];
const seatWidthClass = 'w-[190px]';

function formatCardLabel(card: Card) {
  const suitLabel: Record<Card['suit'], string> = {
    spades: '黑桃',
    hearts: '红桃',
    clubs: '梅花',
    diamonds: '方块',
  };

  const rankLabel: Record<number, string> = {
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
    15: card.suit === 'spades' ? '大王' : '小王',
  };

  return `${suitLabel[card.suit]}${rankLabel[card.rank] || card.rank}`;
}

export default function GameRoom({ roomId }: GameRoomProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const router = useRouter();
  const { socket, isConnected } = useSocket(roomId);

  const safeRoomState: RoomState =
    roomState || {
      roomId,
      ownerId: null,
      players: [],
      currentLevel: 2,
      currentTurn: 0,
      lastPlay: null,
      lastPlayPlayer: null,
      lastPlays: {
        north: null,
        south: null,
        east: null,
        west: null,
      },
      gamePhase: 'waiting',
      scores: { red: 0, blue: 0 },
      tribute: null,
      dealer: 0,
      result: null,
    };

  useEffect(() => {
    if (!socket) return;

    const playerName = getStoredPlayerName();
    if (!playerName) {
      setError('未找到玩家信息，请返回首页重新进入。');
      const timeoutId = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(timeoutId);
    }

    const clientId = getOrCreatePlayerClientId();

    socket.emit(
      SOCKET_EVENTS.CLIENT.JOIN_ROOM,
      { roomId, playerName, clientId },
      (response: { success: boolean; playerId?: string; roomState?: RoomState; error?: string }) => {
        if (response.success && response.playerId) {
          setPlayerId(response.playerId);
          setRoomState(response.roomState || null);
          return;
        }

        setError(response.error || '加入房间失败');
      }
    );

    socket.on(SOCKET_EVENTS.SERVER.ROOM_UPDATED, (state: RoomState) => {
      setRoomState(state);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_JOINED, (data: { roomState: RoomState }) => {
      setRoomState(data.roomState);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_LEFT, (data: { roomState: RoomState }) => {
      setRoomState(data.roomState);
    });

    socket.on(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, (state: RoomState) => {
      setRoomState(state);
    });

    socket.on(SOCKET_EVENTS.SERVER.ERROR, (message: string) => {
      setError(message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.SERVER.ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED);
      socket.off(SOCKET_EVENTS.SERVER.ERROR);
    };
  }, [roomId, router, socket]);

  const currentPlayer = safeRoomState.players.find((player) => player.id === playerId);
  const currentPlayerIndex = safeRoomState.players.findIndex((player) => player.id === playerId);
  const viewerPosition = currentPlayer?.position || 'south';
  const allPlayersReady =
    safeRoomState.players.length === 4 && safeRoomState.players.every((player) => player.isReady);
  const currentPlayerIsOwner = isRoomOwner(
    safeRoomState.ownerId,
    currentPlayer?.clientId || currentPlayer?.id || null
  );
  const canStartGame = currentPlayerIsOwner && allPlayersReady;
  const canStartNextRound = safeRoomState.players.length === 4;
  const showWaitingForOwner =
    safeRoomState.gamePhase === 'waiting' && allPlayersReady && !!currentPlayer && !currentPlayerIsOwner;

  const activePositions = safeRoomState.players
    .filter((player) => player.cardsRemaining > 0)
    .map((player) => player.position);

  const canPlay = canCurrentPlayerPlay({
    lastPlay: safeRoomState.lastPlay,
    lastPlayPlayer: safeRoomState.lastPlayPlayer,
    currentPlayerIndex,
    currentPlayerPosition: currentPlayer?.position,
    lastPlays: safeRoomState.lastPlays,
    activePositions,
    players: safeRoomState.players,
  });

  const canPass = canCurrentPlayerPass({
    lastPlay: safeRoomState.lastPlay,
    lastPlayPlayer: safeRoomState.lastPlayPlayer,
    currentPlayerIndex,
    currentPlayerPosition: currentPlayer?.position,
    lastPlays: safeRoomState.lastPlays,
    activePositions,
    players: safeRoomState.players,
  });

  const isCurrentPlayerTurn =
    !!playerId &&
    safeRoomState.currentTurn === safeRoomState.players.findIndex((player) => player.id === playerId);

  const tributeState = safeRoomState.tribute;
  const activeGive = tributeState?.phase === 'giving' ? tributeState.pendingGives?.[0] || null : null;
  const activeReturn = tributeState?.phase === 'returning' ? tributeState.pendingReturns?.[0] || null : null;
  const isActiveGivePlayer =
    !!playerId &&
    tributeState?.phase === 'giving' &&
    (tributeState.pendingGives || []).some((give) => give.fromPlayerId === playerId);
  const isActiveReturnPlayer = !!playerId && activeReturn?.fromPlayerId === playerId;
  const tributeTargetPlayer =
    activeGive?.toPlayerId
      ? safeRoomState.players.find((player) => player.id === activeGive.toPlayerId) || null
      : null;
  const returnTargetPlayer =
    activeReturn ? safeRoomState.players.find((player) => player.id === activeReturn.toPlayerId) || null : null;
  const canSubmitTributeAction = isActiveGivePlayer || isActiveReturnPlayer;
  const tributeSubmitLabel: 'tribute' | 'return' = isActiveReturnPlayer ? 'return' : 'tribute';

  const relativeSeatPlayers = safeRoomState.players.reduce((acc, player) => {
    const viewerIndex = positionOrder.indexOf(viewerPosition);
    const playerIndex = positionOrder.indexOf(player.position);
    const offset = (playerIndex - viewerIndex + positionOrder.length) % positionOrder.length;
    acc[relativeSeatByOffset[offset]] = player;
    return acc;
  }, {} as Record<RelativeSeat, Player | undefined>);

  const handleReady = () => {
    if (!socket || !playerId) return;

    socket.emit(
      SOCKET_EVENTS.CLIENT.SET_READY,
      { roomId, playerId },
      (response: { success: boolean; roomState?: RoomState; error?: string }) => {
        if (response.success && response.roomState) {
          setRoomState(response.roomState);
          return;
        }

        setError(response.error || '准备失败');
      }
    );
  };

  const handleLeaveRoom = () => {
    if (!socket || !playerId) return;

    setIsLeaving(true);
    socket.emit(
      SOCKET_EVENTS.CLIENT.LEAVE_ROOM,
      { roomId, playerId },
      (response: { success: boolean }) => {
        setIsLeaving(false);
        if (!response.success) return;

        clearStoredPlayerName();
        router.push('/');
      }
    );
  };

  const handleStartGame = () => {
    if (!socket || !playerId) return;

    socket.emit(
      SOCKET_EVENTS.CLIENT.START_GAME,
      { roomId, playerId },
      (response: { success: boolean; roomState?: RoomState; error?: string }) => {
        if (response.success && response.roomState) {
          setRoomState(response.roomState);
          return;
        }

        setError(response.error || '开始游戏失败');
      }
    );
  };

  const handlePlayCards = (cards: Card[]) => {
    if (!socket || !playerId) return;

    socket.emit(
      SOCKET_EVENTS.CLIENT.PLAY_CARDS,
      { roomId, playerId, cards },
      (response: { success: boolean; roomState?: RoomState; error?: string }) => {
        if (response.success && response.roomState) {
          setRoomState(response.roomState);
          setError('');
          return;
        }

        setError(response.error || '出牌失败');
        setTimeout(() => setError(''), 3000);
      }
    );
  };

  const handlePass = () => {
    if (!socket || !playerId) return;

    socket.emit(
      SOCKET_EVENTS.CLIENT.PASS_TURN,
      { roomId, playerId },
      (response: { success: boolean; roomState?: RoomState; error?: string }) => {
        if (response.success && response.roomState) {
          setRoomState(response.roomState);
          setError('');
          return;
        }

        setError(response.error || '不要失败');
        setTimeout(() => setError(''), 3000);
      }
    );
  };

  const handleSubmitTribute = (cards: Card[]) => {
    if (!socket || !playerId || cards.length !== 1) return;

    const eventName = isActiveReturnPlayer
      ? SOCKET_EVENTS.CLIENT.RETURN_TRIBUTE
      : SOCKET_EVENTS.CLIENT.SUBMIT_TRIBUTE;

    socket.emit(
      eventName,
      { roomId, playerId, cardId: cards[0].id },
      (response: { success: boolean; roomState?: RoomState; error?: string }) => {
        if (response.success && response.roomState) {
          setRoomState(response.roomState);
          setError('');
          return;
        }

        setError(response.error || (isActiveReturnPlayer ? '还贡失败' : '进贡失败'));
        setTimeout(() => setError(''), 3000);
      }
    );
  };

  if (error && !roomState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-6xl text-red-500">!</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">出错了</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-500 px-6 py-2 text-white transition hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-600">正在加载房间...</p>
        </div>
      </div>
    );
  }

  const phaseLabel =
    roomState.gamePhase === 'playing'
      ? '游戏中'
      : roomState.gamePhase === 'tributing'
        ? '进贡阶段'
        : roomState.gamePhase === 'finished'
          ? '游戏结束'
          : null;

  const tributeStatusLabel = isActiveGivePlayer
    ? `请选择 1 张牌进贡${tributeTargetPlayer ? `给 ${tributeTargetPlayer.name}` : ''}`
    : isActiveReturnPlayer
      ? `请选择 1 张 10 及以下的牌还贡给 ${returnTargetPlayer?.name || '目标玩家'}`
      : activeGive
        ? `等待 ${safeRoomState.players.find((player) => player.id === activeGive.fromPlayerId)?.name || '玩家'} 进贡`
        : activeReturn
          ? `等待 ${safeRoomState.players.find((player) => player.id === activeReturn.fromPlayerId)?.name || '玩家'} 还贡`
          : '进贡处理中';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#e6ebee]">
      <div className="flex h-12 flex-shrink-0 items-center justify-between bg-white/90 px-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <h1 className="text-base font-bold text-slate-900">房间 {roomId}</h1>
          <p>{roomState.players.length}/4 玩家</p>
          <p>级牌 {roomState.currentLevel > 13 ? 'A' : roomState.currentLevel}</p>
          {phaseLabel && <span className="font-semibold text-slate-600">{phaseLabel}</span>}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 ${
              isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium">{isConnected ? '已连接' : '未连接'}</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {isLeaving ? '离开中...' : '离开'}
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute left-1/2 top-14 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-6 py-3 shadow-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="min-h-0 flex-1 p-2 sm:p-3">
        <div
          data-testid="integrated-table"
          className="relative h-full overflow-hidden rounded-[24px] border border-slate-300 bg-[radial-gradient(circle_at_center,_#48e0d7_0%,_#22d3c5_55%,_#12b5a7_100%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]"
        >
          <div className="absolute inset-[18px] rounded-[28px] border border-white/30" />

          <div className="absolute inset-0">
            {playerId ? (
              <CenterPlayArea roomState={safeRoomState} currentPlayerId={playerId} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/80">
                <p>加载中...</p>
              </div>
            )}
          </div>

          {roomState.gamePhase === 'playing' && (
            <div className="absolute right-4 top-4 rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <span className="text-red-600">{roomState.scores.red}</span>
              <span className="mx-2 text-slate-400">:</span>
              <span className="text-blue-600">{roomState.scores.blue}</span>
            </div>
          )}

          {relativeSeatPlayers.top && (
            <div className={`absolute left-1/2 top-8 -translate-x-1/2 ${seatWidthClass}`}>
              <PlayerCard
                player={relativeSeatPlayers.top}
                displayPosition={displayPositionBySeat.top}
                playInfo={safeRoomState.lastPlays?.[relativeSeatPlayers.top.position] || null}
                gamePhase={safeRoomState.gamePhase}
                isCurrentTurn={
                  roomState.currentTurn ===
                  roomState.players.findIndex((player) => player.id === relativeSeatPlayers.top?.id)
                }
                isSelf={currentPlayer?.id === relativeSeatPlayers.top.id}
                compact
              />
            </div>
          )}

          {relativeSeatPlayers.left && (
            <div className={`absolute left-10 top-1/2 -translate-y-1/2 ${seatWidthClass}`}>
              <PlayerCard
                player={relativeSeatPlayers.left}
                displayPosition={displayPositionBySeat.left}
                playInfo={safeRoomState.lastPlays?.[relativeSeatPlayers.left.position] || null}
                gamePhase={safeRoomState.gamePhase}
                isCurrentTurn={
                  roomState.currentTurn ===
                  roomState.players.findIndex((player) => player.id === relativeSeatPlayers.left?.id)
                }
                isSelf={currentPlayer?.id === relativeSeatPlayers.left.id}
                compact
              />
            </div>
          )}

          {relativeSeatPlayers.right && (
            <div className={`absolute right-10 top-1/2 -translate-y-1/2 ${seatWidthClass}`}>
              <PlayerCard
                player={relativeSeatPlayers.right}
                displayPosition={displayPositionBySeat.right}
                playInfo={safeRoomState.lastPlays?.[relativeSeatPlayers.right.position] || null}
                gamePhase={safeRoomState.gamePhase}
                isCurrentTurn={
                  roomState.currentTurn ===
                  roomState.players.findIndex((player) => player.id === relativeSeatPlayers.right?.id)
                }
                isSelf={currentPlayer?.id === relativeSeatPlayers.right.id}
                compact
              />
            </div>
          )}

          {relativeSeatPlayers.bottom && (
            <div
              data-testid="seat-self-bottom"
              className={`absolute bottom-52 left-1/2 -translate-x-1/2 ${seatWidthClass} z-20`}
            >
              <PlayerCard
                player={relativeSeatPlayers.bottom}
                displayPosition={displayPositionBySeat.bottom}
                playInfo={safeRoomState.lastPlays?.[relativeSeatPlayers.bottom.position] || null}
                gamePhase={safeRoomState.gamePhase}
                isCurrentTurn={
                  roomState.currentTurn ===
                  roomState.players.findIndex((player) => player.id === relativeSeatPlayers.bottom?.id)
                }
                isSelf
                compact
              />
            </div>
          )}

          {roomState.gamePhase === 'waiting' && (
            <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
              <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-md">
                {showWaitingForOwner ? '等待房主开始游戏' : '等待玩家准备'}
              </div>
              <div className="flex gap-3">
                {currentPlayer && !currentPlayer.isReady && (
                  <button
                    onClick={handleReady}
                    disabled={!isConnected}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    准备
                  </button>
                )}
                {canStartGame && (
                  <button
                    data-testid="start-game-button"
                    onClick={handleStartGame}
                    disabled={!isConnected}
                    className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    开始游戏
                  </button>
                )}
              </div>
              <div
                data-testid={showWaitingForOwner ? 'waiting-for-owner' : 'waiting-for-players'}
                className="text-xs text-slate-600"
              >
                {roomState.players.length < 4
                  ? `等待更多玩家加入... (${roomState.players.length}/4)`
                  : '已准备，等待其他玩家'}
              </div>
            </div>
          )}

          {roomState.gamePhase === 'tributing' && (
            <div
              data-testid="tribute-status"
              className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3"
            >
              <div className="rounded-full bg-white/92 px-5 py-2 text-sm font-semibold text-slate-700 shadow-md">
                {tributeStatusLabel}
              </div>
              <div className="rounded-full bg-white/80 px-4 py-2 text-xs text-slate-600 shadow">
                {tributeState?.mode === 'double' ? '双贡流程' : tributeState?.mode === 'inner' ? '内贡流程' : '单贡流程'}
              </div>
              <div
                data-testid="tribute-action-log"
                className="max-w-md rounded-2xl bg-white/80 px-4 py-3 text-xs text-slate-600 shadow"
              >
                {tributeState?.revealedActions && tributeState.revealedActions.length > 0 ? (
                  <div className="space-y-1">
                    {tributeState.revealedActions.map((action, index) => {
                      const fromName =
                        safeRoomState.players.find((player) => player.id === action.fromPlayerId)?.name || '玩家';
                      const toName = action.toPlayerId
                        ? safeRoomState.players.find((player) => player.id === action.toPlayerId)?.name || '玩家'
                        : null;

                      return (
                        <div key={`${action.kind}-${action.card.id}-${index}`}>
                          {action.kind === 'return'
                            ? `${fromName} 还贡 ${formatCardLabel(action.card)}${toName ? ` 给 ${toName}` : ''}`
                            : `${fromName} 进贡 ${formatCardLabel(action.card)}${toName ? ` 给 ${toName}` : ''}`}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>贡还牌记录会显示在这里</div>
                )}
              </div>
            </div>
          )}

          {roomState.gamePhase === 'finished' && (
            <div className="absolute inset-x-6 bottom-6 top-20 z-30 overflow-y-auto rounded-[24px] bg-white/92 p-4 shadow-xl">
              <div className="mb-4 flex justify-center">
                <button
                  onClick={handleStartGame}
                  disabled={!isConnected || !canStartNextRound}
                  className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:opacity-50"
                >
                  开始下一局
                </button>
              </div>
              <SettlementPanel roomState={roomState} />
            </div>
          )}

          {(roomState.gamePhase === 'playing' || roomState.gamePhase === 'tributing') &&
            currentPlayer &&
            currentPlayer.hand && (
              <div data-testid="table-hand-zone" className="absolute inset-x-3 bottom-3 z-30">
                <HandCards
                  cards={currentPlayer.hand}
                  currentLevel={roomState.currentLevel}
                  onPlayCards={handlePlayCards}
                  onPass={handlePass}
                  isCurrentTurn={roomState.gamePhase === 'tributing' ? canSubmitTributeAction : isCurrentPlayerTurn}
                  canPlay={canPlay}
                  canPass={canPass}
                  mode={roomState.gamePhase === 'tributing' ? 'tribute' : 'play'}
                  submitLabel={tributeSubmitLabel}
                  onSubmitSelected={handleSubmitTribute}
                  canSubmit={canSubmitTributeAction}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
