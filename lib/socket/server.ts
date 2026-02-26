import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { Room, Player, RoomState } from '../types';
import { SOCKET_EVENTS } from '../constants';

interface ServerToClientEvents {
  [SOCKET_EVENTS.SERVER.ROOM_UPDATED]: (room: Room) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_JOINED]: (player: Player) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_LEFT]: (playerId: string) => void;
  [SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED]: (gameState: RoomState) => void;
  [SOCKET_EVENTS.SERVER.ERROR]: (message: string) => void;
}

interface ClientToServerEvents {
  [SOCKET_EVENTS.CLIENT.CREATE_ROOM]: (data: { playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.JOIN_ROOM]: (data: { roomId: string; playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.LEAVE_ROOM]: () => void;
  [SOCKET_EVENTS.CLIENT.SET_READY]: (isReady: boolean) => void;
}

let io: Server<ServerToClientEvents, ClientToServerEvents>;

export function initializeSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
        : 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 创建房间
    socket.on(SOCKET_EVENTS.CLIENT.CREATE_ROOM, ({ playerName }) => {
      const roomId = generateRoomId();
      const player: Player = {
        id: socket.id,
        name: playerName,
        position: 'south',
        team: 'red',
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      const room: Room = {
        id: roomId,
        name: `${playerName}的房间`,
        maxPlayers: 4,
        status: 'waiting',
        gameState: null,
        createdAt: Date.now(),
      };

      // 存储房间和玩家
      socket.data.roomId = roomId;
      socket.data.player = player;
      rooms.set(roomId, room);
      roomPlayers.set(roomId, [player]);

      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${playerName}`);
      socket.emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, room);
    });

    // 加入房间
    socket.on(SOCKET_EVENTS.CLIENT.JOIN_ROOM, ({ roomId, playerName }) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间不存在');
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间已开始游戏');
        return;
      }

      const players = roomPlayers.get(roomId) || [];
      if (players.length >= room.maxPlayers) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间已满');
        return;
      }

      // 分配位置和队伍
      const positions: Array<'south' | 'west' | 'north' | 'east'> = ['south', 'west', 'north', 'east'];
      const teams: Array<'red' | 'blue'> = ['red', 'blue', 'blue', 'red'];
      const index = players.length;

      const player: Player = {
        id: socket.id,
        name: playerName,
        position: positions[index],
        team: teams[index],
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      socket.data.roomId = roomId;
      socket.data.player = player;
      players.push(player);
      roomPlayers.set(roomId, players);

      socket.join(roomId);

      // 通知所有玩家
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_JOINED, player);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, room);

      console.log(`${playerName} joined room ${roomId}`);
    });

    // 设置准备状态
    socket.on(SOCKET_EVENTS.CLIENT.SET_READY, (isReady: boolean) => {
      const roomId = socket.data.roomId;
      const playerId = socket.id;

      if (!roomId) return;

      const players = roomPlayers.get(roomId);
      if (!players) return;

      const player = players.find(p => p.id === playerId);
      if (player) {
        player.isReady = isReady;
        roomPlayers.set(roomId, players);

        io.to(roomId).emit(SOCKET_EVENTS.SERVER.ROOM_UPDATED, rooms.get(roomId)!);
      }
    });

    // 离开房间
    socket.on(SOCKET_EVENTS.CLIENT.LEAVE_ROOM, () => {
      handleLeave(socket);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      handleLeave(socket);
    });
  });

  return io;
}

function handleLeave(socket: Socket) {
  const roomId = socket.data.roomId;
  const player = socket.data.player as Player;

  if (roomId && player) {
    socket.leave(roomId);

    const players = roomPlayers.get(roomId) || [];
    const filteredPlayers = players.filter(p => p.id !== player.id);

    if (filteredPlayers.length === 0) {
      // 删除空房间
      rooms.delete(roomId);
      roomPlayers.delete(roomId);
    } else {
      roomPlayers.set(roomId, filteredPlayers);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_LEFT, player.id);
    }

    console.log(`${player.name} left room ${roomId}`);
  }
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getIO() {
  return io;
}

// 内存存储
const rooms = new Map<string, Room>();
const roomPlayers = new Map<string, Player[]>();

export { rooms, roomPlayers };
