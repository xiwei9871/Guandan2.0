'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/constants';
import { Player, RoomState, Card } from '@/lib/types';
import PlayerCard from './game/PlayerCard';
import HandCards from './game/HandCards';

interface GameRoomProps {
  roomId: string;
}

export default function GameRoom({ roomId }: GameRoomProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const router = useRouter();
  const { socket, isConnected } = useSocket(roomId);

  useEffect(() => {
    if (!socket) return;

    // Get player name from localStorage
    const playerName = localStorage.getItem('playerName');

    if (!playerName) {
      setError('未找到玩家信息，请返回首页重新进入');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    // Join room
    socket.emit(
      SOCKET_EVENTS.CLIENT.JOIN_ROOM,
      { roomId, playerName },
      (response: { success: boolean; playerId?: string; roomState?: RoomState; error?: string }) => {
        if (response.success && response.playerId) {
          setPlayerId(response.playerId);
          setRoomState(response.roomState || null);
        } else {
          setError(response.error || '加入房间失败');
        }
      }
    );

    // Listen for room updates
    socket.on(SOCKET_EVENTS.SERVER.ROOM_UPDATED, (state: RoomState) => {
      setRoomState(state);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_JOINED, (data: { player: Player; roomState: RoomState }) => {
      setRoomState(data.roomState);
    });

    socket.on(SOCKET_EVENTS.SERVER.PLAYER_LEFT, (data: { playerId: string; roomState: RoomState }) => {
      setRoomState(data.roomState);
    });

    socket.on(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, (state: RoomState) => {
      setRoomState(state);
    });

    socket.on(SOCKET_EVENTS.SERVER.ERROR, (errorMessage: string) => {
      setError(errorMessage);
    });

    return () => {
      socket.off(SOCKET_EVENTS.SERVER.ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.SERVER.PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED);
      socket.off(SOCKET_EVENTS.SERVER.ERROR);
    };
  }, [socket, roomId, router]);

  const handleReady = () => {
    if (!socket || !playerId) return;

    socket.emit(SOCKET_EVENTS.CLIENT.SET_READY, { roomId, playerId }, (response: { success: boolean; roomState?: RoomState; error?: string }) => {
      if (response.success && response.roomState) {
        setRoomState(response.roomState);
      } else {
        setError(response.error || '准备失败');
      }
    });
  };

  const handleLeaveRoom = () => {
    if (!socket || !playerId) return;

    setIsLeaving(true);
    socket.emit(
      SOCKET_EVENTS.CLIENT.LEAVE_ROOM,
      { roomId, playerId },
      (response: { success: boolean }) => {
        setIsLeaving(false);
        if (response.success) {
          localStorage.removeItem('playerName');
          router.push('/');
        }
      }
    );
  };

  const handleStartGame = () => {
    if (!socket || !playerId) return;

    socket.emit(SOCKET_EVENTS.CLIENT.START_GAME, { roomId, playerId }, (response: { success: boolean; roomState?: RoomState; error?: string }) => {
      if (response.success && response.roomState) {
        setRoomState(response.roomState);
      } else {
        setError(response.error || '开始游戏失败');
      }
    });
  };

  const handlePlayCards = (cards: Card[]) => {
    if (!socket || !playerId) return;

    socket.emit(SOCKET_EVENTS.CLIENT.PLAY_CARDS, { roomId, playerId, cards }, (response: { success: boolean; roomState?: RoomState; error?: string }) => {
      if (response.success && response.roomState) {
        setRoomState(response.roomState);
        setError(''); // Clear error on success
      } else {
        setError(response.error || '出牌失败');
        setTimeout(() => setError(''), 3000); // Auto-clear error after 3 seconds
      }
    });
  };

  const handlePass = () => {
    if (!socket || !playerId) return;

    socket.emit(SOCKET_EVENTS.CLIENT.PASS_TURN, { roomId, playerId }, (response: { success: boolean; roomState?: RoomState; error?: string }) => {
      if (response.success && response.roomState) {
        setRoomState(response.roomState);
        setError(''); // Clear error on success
      } else {
        setError(response.error || '跳过失败');
        setTimeout(() => setError(''), 3000); // Auto-clear error after 3 seconds
      }
    });
  };

  const isCurrentPlayerTurn = roomState && playerId ? roomState.currentTurn === roomState.players.findIndex(p => p.id === playerId) : false;
  const canStartGame = roomState && roomState.players.length === 4 && roomState.players.every(p => p.isReady);
  const currentPlayer = roomState?.players.find(p => p.id === playerId);

  if (error && !roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">出错了</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载房间...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">房间 {roomId}</h1>
            <p className="text-sm text-gray-600">
              {roomState.players.length}/4 玩家 · 级牌 {roomState.currentLevel > 13 ? 'A' : roomState.currentLevel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? '已连接' : '未连接'}</span>
            </div>
            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
            >
              {isLeaving ? '离开中...' : '离开'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Game Phase Display */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="text-center">
            <span className="text-lg font-semibold text-gray-800">
              {roomState.gamePhase === 'waiting' && '等待玩家准备'}
              {roomState.gamePhase === 'tributing' && '进贡阶段'}
              {roomState.gamePhase === 'playing' && '游戏中'}
              {roomState.gamePhase === 'finished' && '游戏结束'}
            </span>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-4">
          {/* Players Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* North Player */}
            <div className="col-start-2">
              {roomState.players.find(p => p.position === 'north') && (
                <PlayerCard
                  player={roomState.players.find(p => p.position === 'north')!}
                  isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'north')}
                  isSelf={currentPlayer?.position === 'north'}
                />
              )}
            </div>

            {/* West Player */}
            <div className="col-start-1 row-start-2">
              {roomState.players.find(p => p.position === 'west') && (
                <PlayerCard
                  player={roomState.players.find(p => p.position === 'west')!}
                  isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'west')}
                  isSelf={currentPlayer?.position === 'west'}
                />
              )}
            </div>

            {/* Center Area */}
            <div className="col-start-2 row-start-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-4 min-h-48 flex items-center justify-center border-4 border-green-300">
              <div className="text-center">
                {roomState.gamePhase === 'waiting' && (
                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">等待游戏开始</p>
                    <p className="text-sm text-gray-600">需要4名玩家全部准备</p>
                  </div>
                )}
                {roomState.gamePhase === 'playing' && isCurrentPlayerTurn && (
                  <div>
                    <p className="text-lg font-bold text-blue-600 mb-2">轮到你出牌</p>
                    <p className="text-sm text-gray-600">选择手牌出牌或不要</p>
                  </div>
                )}
                {roomState.gamePhase === 'playing' && !isCurrentPlayerTurn && (
                  <div>
                    <p className="text-lg font-semibold text-gray-700">等待其他玩家出牌</p>
                  </div>
                )}
                {roomState.lastPlay && (
                  <div className="mt-4 p-3 bg-white rounded-lg shadow">
                    <p className="text-sm text-gray-600 mb-1">
                      {roomState.players.find(p => p.id === roomState.lastPlay?.playerId)?.name} 出牌
                    </p>
                    <p className="text-lg font-bold text-gray-800">{roomState.lastPlay.cards.length} 张牌</p>
                  </div>
                )}
              </div>
            </div>

            {/* East Player */}
            <div className="col-start-3 row-start-2">
              {roomState.players.find(p => p.position === 'east') && (
                <PlayerCard
                  player={roomState.players.find(p => p.position === 'east')!}
                  isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'east')}
                  isSelf={currentPlayer?.position === 'east'}
                />
              )}
            </div>

            {/* South Player */}
            <div className="col-start-2 row-start-3">
              {roomState.players.find(p => p.position === 'south') && (
                <PlayerCard
                  player={roomState.players.find(p => p.position === 'south')!}
                  isCurrentTurn={roomState.currentTurn === roomState.players.findIndex(p => p.position === 'south')}
                  isSelf={currentPlayer?.position === 'south'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        {roomState.gamePhase === 'playing' && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">红队</p>
                <p className="text-2xl font-bold text-red-600">{roomState.scores.red}</p>
              </div>
              <div className="text-4xl text-gray-300">vs</div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">蓝队</p>
                <p className="text-2xl font-bold text-blue-600">{roomState.scores.blue}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {roomState.gamePhase === 'waiting' && currentPlayer && !currentPlayer.isReady && (
            <button
              onClick={handleReady}
              disabled={!isConnected}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition transform hover:scale-105"
            >
              准备
            </button>
          )}
          {roomState.gamePhase === 'waiting' && canStartGame && (
            <button
              onClick={handleStartGame}
              disabled={!isConnected}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition transform hover:scale-105"
            >
              开始游戏
            </button>
          )}
        </div>

        {/* Empty Player Slots */}
        {roomState.players.length < 4 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-center text-blue-800">
              等待更多玩家加入... ({roomState.players.length}/4)
            </p>
          </div>
        )}

        {/* Hand Cards */}
        {roomState.gamePhase === 'playing' && currentPlayer && currentPlayer.hand && (
          <div className="mt-6">
            <HandCards
              cards={currentPlayer.hand}
              currentLevel={roomState.currentLevel}
              onPlayCards={handlePlayCards}
              onPass={handlePass}
              isCurrentTurn={isCurrentPlayerTurn}
              canPlay={!roomState.lastPlay || roomState.lastPlayPlayer !== roomState.players.findIndex(p => p.id === playerId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
