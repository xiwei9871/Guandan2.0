'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/constants';

export function useSocket(roomId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the same host and port
    const url = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3003`
      : 'http://localhost:3003';

    const socketInstance = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
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
