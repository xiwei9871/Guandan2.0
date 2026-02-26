'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/constants';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { socket, isConnected } = useSocket();

  // 添加调试信息
  useEffect(() => {
    console.log('=== HomePage Debug ===');
    console.log('isConnected:', isConnected);
    console.log('socket:', socket);
    console.log('Socket URL:', typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3003` : 'N/A');
  }, [isConnected, socket]);

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }

    if (!isConnected || !socket) {
      setError('未连接到服务器，请稍后重试');
      return;
    }

    setIsLoading(true);

    socket?.emit(
      SOCKET_EVENTS.CLIENT.CREATE_ROOM,
      { playerName },
      (response: { success: boolean; roomId?: string; error?: string }) => {
        setIsLoading(false);

        if (response.success && response.roomId) {
          localStorage.setItem('playerName', playerName);
          router.push(`/room/${response.roomId}`);
        } else {
          setError(response.error || '创建房间失败');
        }
      }
    );
  };

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }

    if (!roomId.trim()) {
      setError('请输入房间号');
      return;
    }

    if (!isConnected || !socket) {
      setError('未连接到服务器，请稍后重试');
      return;
    }

    setIsLoading(true);

    socket?.emit(
      SOCKET_EVENTS.CLIENT.JOIN_ROOM,
      { roomId, playerName },
      (response: { success: boolean; error?: string }) => {
        setIsLoading(false);

        if (response.success) {
          localStorage.setItem('playerName', playerName);
          router.push(`/room/${roomId}`);
        } else {
          setError(response.error || '加入房间失败');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">掼蛋在线</h1>
          <p className="text-gray-600">4人对战 · 实时游戏</p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? '已连接到服务器' : '正在连接服务器...'}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Player Name Input */}
          <div className="mb-6">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              玩家名称
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入你的名字"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              maxLength={20}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Create Room Section */}
          <form onSubmit={handleCreateRoom} className="mb-6">
            <button
              type="submit"
              disabled={!isConnected || isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? '创建中...' : '创建房间'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或</span>
            </div>
          </div>

          {/* Join Room Section */}
          <form onSubmit={handleJoinRoom}>
            <div className="mb-4">
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                房间号
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="输入房间号"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                maxLength={10}
              />
            </div>
            <button
              type="submit"
              disabled={!isConnected || isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? '加入中...' : '加入房间'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>需要4名玩家开始游戏</p>
        </div>
      </div>
    </div>
  );
}
