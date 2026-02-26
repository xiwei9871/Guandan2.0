'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/constants';

export function useSocket(roomId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      autoConnect: false,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && roomId) {
      socket.connect();
    }
  }, [socket, roomId]);

  return { socket, isConnected };
}
