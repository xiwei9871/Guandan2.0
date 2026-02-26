import { NextRequest } from 'next/server';
import { initializeSocketServer } from '@/lib/socket/server';

let io: any = null;

export async function GET(req: NextRequest) {
  if (!io) {
    const httpServer = (req as any).socket?.server;
    if (httpServer) {
      io = initializeSocketServer(httpServer);
    }
  }

  return new Response('Socket.io server is running', { status: 200 });
}
