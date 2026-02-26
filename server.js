const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3003;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.io logic
  const rooms = new Map();
  const roomPlayers = new Map();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create room
    socket.on('room:create', ({ playerName }, callback) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const player = {
        id: socket.id,
        name: playerName,
        position: 'south',
        team: 'red',
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      const room = {
        id: roomId,
        name: `${playerName}的房间`,
        maxPlayers: 4,
        status: 'waiting',
        gameState: null,
        createdAt: Date.now(),
      };

      socket.data.roomId = roomId;
      socket.data.player = player;
      rooms.set(roomId, room);
      roomPlayers.set(roomId, [player]);
      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${playerName}`);

      // 发送 ACK 响应
      if (callback && typeof callback === 'function') {
        callback({ success: true, roomId });
      }

      // 广播房间更新事件
      socket.emit('room:updated', room);
    });

    // Join room
    socket.on('room:join', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('error', '房间不存在');
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', '房间已开始游戏');
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间已开始游戏' });
        }
        return;
      }

      const players = roomPlayers.get(roomId) || [];
      if (players.length >= room.maxPlayers) {
        socket.emit('error', '房间已满');
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间已满' });
        }
        return;
      }

      const positions = ['south', 'west', 'north', 'east'];
      const teams = ['red', 'blue', 'blue', 'red'];
      const index = players.length;

      const player = {
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

      console.log(`${playerName} joined room ${roomId}`);

      // 发送 ACK 响应
      if (callback && typeof callback === 'function') {
        callback({
          success: true,
          playerId: player.id,
          roomState: room
        });
      }

      // 广播事件 - 使用正确的数据格式
      io.to(roomId).emit('room:playerJoined', { player, roomState: room });
      io.to(roomId).emit('room:updated', room);
    });

    // Set ready
    socket.on('room:ready', (isReady) => {
      const roomId = socket.data.roomId;
      const playerId = socket.id;

      if (!roomId) return;

      const players = roomPlayers.get(roomId);
      if (!players) return;

      const player = players.find(p => p.id === playerId);
      if (player) {
        player.isReady = isReady;
        roomPlayers.set(roomId, players);
        io.to(roomId).emit('room:updated', rooms.get(roomId));
      }
    });

    // Leave room
    socket.on('room:leave', () => {
      handleLeave(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      handleLeave(socket);
    });

    function handleLeave(socket) {
      const roomId = socket.data.roomId;
      const player = socket.data.player;

      if (roomId && player) {
        socket.leave(roomId);
        const players = roomPlayers.get(roomId) || [];
        const filteredPlayers = players.filter(p => p.id !== player.id);

        if (filteredPlayers.length === 0) {
          rooms.delete(roomId);
          roomPlayers.delete(roomId);
        } else {
          roomPlayers.set(roomId, filteredPlayers);
          const updatedRoom = rooms.get(roomId);
          io.to(roomId).emit('room:playerLeft', { playerId: player.id, roomState: updatedRoom });
        }
        console.log(`${player.name} left room ${roomId}`);
      }
    }
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
