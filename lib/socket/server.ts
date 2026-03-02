import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { Room, Player, RoomState, Card } from '../types';
import { SOCKET_EVENTS } from '../constants';
import {
  initializeGame,
  handlePlayerPlay,
  handlePlayerPass,
  calculateNextLevel,
} from '../game/gameEngine';

interface ServerToClientEvents {
  [SOCKET_EVENTS.SERVER.ROOM_UPDATED]: (room: Room) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_JOINED]: (player: Player) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_LEFT]: (playerId: string) => void;
  [SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED]: (gameState: RoomState) => void;
  [SOCKET_EVENTS.SERVER.PLAYER_PLAYED]: (data: { playerId: string; cards: Card[]; playerIndex: number }) => void;
  [SOCKET_EVENTS.SERVER.TURN_CHANGED]: (data: { previousPlayer: number; nextPlayer: number }) => void;
  [SOCKET_EVENTS.SERVER.ROUND_ENDED]: (data: { winner: 'red' | 'blue'; redScore: number; blueScore: number }) => void;
  [SOCKET_EVENTS.SERVER.ERROR]: (message: string) => void;
}

interface ClientToServerEvents {
  [SOCKET_EVENTS.CLIENT.CREATE_ROOM]: (data: { playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.JOIN_ROOM]: (data: { roomId: string; playerName: string }) => void;
  [SOCKET_EVENTS.CLIENT.LEAVE_ROOM]: () => void;
  [SOCKET_EVENTS.CLIENT.SET_READY]: (isReady: boolean) => void;
  [SOCKET_EVENTS.CLIENT.START_GAME]: () => void;
  [SOCKET_EVENTS.CLIENT.PLAY_CARDS]: (data: { cards: Card[] }) => void;
  [SOCKET_EVENTS.CLIENT.PASS_TURN]: () => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents>;

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
      const teams: Array<'red' | 'blue'> = ['red', 'blue', 'red', 'blue'];
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

    // 开始游戏
    socket.on(SOCKET_EVENTS.CLIENT.START_GAME, () => {
      const roomId = socket.data.roomId;

      if (!roomId) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '未加入房间');
        return;
      }

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '房间不存在');
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '游戏已开始');
        return;
      }

      if (players.length !== 4) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '需要4名玩家才能开始');
        return;
      }

      if (!players.every(p => p.isReady)) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '所有玩家都需要准备');
        return;
      }

      // 初始化游戏
      const currentLevel = 2; // 默认从2开始
      const { gameState } = initializeGame(roomId, players, currentLevel);

      // 更新房间状态
      room.status = 'playing';
      room.gameState = gameState;
      rooms.set(roomId, room);

      // 通知所有玩家游戏开始
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, gameState);

      console.log(`Game started in room ${roomId}`);
    });

    // 玩家出牌
    socket.on(SOCKET_EVENTS.CLIENT.PLAY_CARDS, ({ cards }: { cards: Card[] }) => {
      const roomId = socket.data.roomId;
      const playerId = socket.id;

      if (!roomId) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '未加入房间');
        return;
      }

      const room = rooms.get(roomId);
      if (!room || !room.gameState) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '游戏未开始');
        return;
      }

      // 找到玩家索引
      const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '玩家不在游戏中');
        return;
      }

      // 处理出牌
      const result = handlePlayerPlay(room.gameState, playerIndex, cards);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, result.error || '出牌失败');
        return;
      }

      // 更新游戏状态
      room.gameState = result.gameState!;
      rooms.set(roomId, room);

      // 通知所有玩家
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, result.gameState!);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.PLAYER_PLAYED, {
        playerId,
        cards,
        playerIndex,
      });

      // 如果游戏结束，发送结束通知
      if (result.gameState!.gamePhase === 'finished') {
        io.to(roomId).emit(SOCKET_EVENTS.SERVER.ROUND_ENDED, {
          winner: result.gameState!.scores.red > result.gameState!.scores.blue ? 'red' : 'blue',
          redScore: result.gameState!.scores.red,
          blueScore: result.gameState!.scores.blue,
        });

        // 计算新等级
        const levelChange = result.gameState!.scores.red - result.gameState!.scores.blue;
        const newLevel = calculateNextLevel(room.gameState.currentLevel, levelChange);

        console.log(`Game ended in room ${roomId}. Level change: ${levelChange}, New level: ${newLevel}`);
      }
    });

    // 玩家跳过
    socket.on(SOCKET_EVENTS.CLIENT.PASS_TURN, () => {
      const roomId = socket.data.roomId;
      const playerId = socket.id;

      if (!roomId) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '未加入房间');
        return;
      }

      const room = rooms.get(roomId);
      if (!room || !room.gameState) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '游戏未开始');
        return;
      }

      // 找到玩家索引
      const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, '玩家不在游戏中');
        return;
      }

      // 处理跳过
      const result = handlePlayerPass(room.gameState, playerIndex);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, result.error || '跳过失败');
        return;
      }

      // 更新游戏状态
      room.gameState = result.gameState!;
      rooms.set(roomId, room);

      // 通知所有玩家
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.GAME_STATE_CHANGED, result.gameState!);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER.TURN_CHANGED, {
        previousPlayer: playerIndex,
        nextPlayer: result.gameState!.currentTurn,
      });
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
