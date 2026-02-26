'use client';

import { useEffect, useState } from 'react';
import GameRoom from '@/components/GameRoom';

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const [roomId, setRoomId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setRoomId(p.roomId);
    });
  }, [params]);

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <GameRoom roomId={roomId} />;
}
