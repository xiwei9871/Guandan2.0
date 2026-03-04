'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/constants';
import { getNetworkConfig } from '@/lib/runtime/networkConfig';

export function useSocket(roomId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const { clientSocketUrl } = getNetworkConfig();

    console.log('Connecting to Socket.io at:', clientSocketUrl || 'same-origin');

    const socketOptions = {
      autoConnect: true,
      transports: ['websocket', 'polling'] as const,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    const socketInstance = clientSocketUrl
      ? io(clientSocketUrl, socketOptions)
      : io(socketOptions);

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server, socket ID:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      console.log('Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}
