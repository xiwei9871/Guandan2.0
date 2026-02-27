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

  // Helper function to create complete room state
  function createRoomState(room, players) {
    return {
      roomId: room.id,
      name: room.name,
      maxPlayers: room.maxPlayers,
      status: room.status,
      gameState: room.gameState,
      createdAt: room.createdAt,
      players: players.map(p => ({
        ...p,
        hand: p.hand || []
      })),
      gamePhase: room.gamePhase || 'waiting',
      currentLevel: room.currentLevel || 2,
      currentTurn: room.currentTurn || 0,
      scores: room.scores || { red: 0, blue: 0 },
      lastPlay: room.lastPlay || null,
      lastPlayPlayer: room.lastPlayPlayer || null,
      lastPlays: room.lastPlays || {
        north: null,
        south: null,
        east: null,
        west: null,
      },
      dealer: room.dealer || 0,
      tribute: room.tribute || null,
    };
  }

  // Get current level for determining level cards
  let currentLevel = 2; // Default level

  // Create a deck of cards (two decks for 掼蛋)
  function createDeck(level = 2) {
    const deck = [];
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 2-10, J, Q, K, A
    let cardId = 0;

    // Two decks
    for (let d = 0; d < 2; d++) {
      // Standard cards
      for (const suit of suits) {
        for (const rank of ranks) {
          const isLevelCard = rank === level;
          const isWildcard = suit === 'hearts' && isLevelCard; // 红桃级牌是逢人配
          deck.push({
            suit,
            rank,
            id: `card-${d}-${suit}-${rank}-${cardId++}`,
            levelCard: isLevelCard,
            isWildcard: isWildcard
          });
        }
      }

      // Add jokers for each deck
      // Big Joker (大王) - rank 15, spades suit for identification
      deck.push({
        id: `card-${d}-joker-big-${cardId++}`,
        suit: 'spades',
        rank: 15,
        levelCard: false,
        isWildcard: false
      });

      // Small Joker (小王) - rank 15, hearts suit for identification
      deck.push({
        id: `card-${d}-joker-small-${cardId++}`,
        suit: 'hearts',
        rank: 15,
        levelCard: false,
        isWildcard: false
      });
    }

    return deck;
  }

  // Shuffle deck
  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // Deal cards to players
  function dealCards(players, level = 2) {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
    const deck = shuffleDeck(createDeck(level));
    const cardsPerPlayer = 27;

    players.forEach((player, index) => {
      const start = index * cardsPerPlayer;
      const end = start + cardsPerPlayer;
      player.hand = deck.slice(start, end);
      player.hand.sort((a, b) => {
        // Sort by rank (descending) then by suit
        if (b.rank !== a.rank) return b.rank - a.rank;
        return suitOrder[a.suit] - suitOrder[b.suit];
      });
    });

    return players;
  }

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
      const roomState = createRoomState(room, [player]);
      socket.emit('room:updated', roomState);
    });

    // Join room
    socket.on('room:join', ({ roomId, playerName }, callback) => {
      console.log(`[DEBUG] room:join event - Socket: ${socket.id}, Room: ${roomId}, Player: ${playerName}`);
      console.log(`[DEBUG] Existing rooms:`, Array.from(rooms.keys()));
      console.log(`[DEBUG] Socket data:`, socket.data);

      const room = rooms.get(roomId);

      if (!room) {
        console.log(`[DEBUG] Room ${roomId} not found in rooms Map`);
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

      // Check if player is already in the room (re-join scenario)
      const existingPlayer = players.find(p => p.id === socket.id);
      if (existingPlayer) {
        // Player already in room, just return success
        console.log(`${playerName} re-joined room ${roomId} (already in room)`);
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            playerId: existingPlayer.id,
            roomState: room
          });
        }
        return;
      }

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
      const roomState = createRoomState(room, players);
      if (callback && typeof callback === 'function') {
        callback({
          success: true,
          playerId: player.id,
          roomState: roomState
        });
      }

      // 广播事件 - 使用正确的数据格式
      io.to(roomId).emit('room:playerJoined', { player, roomState });
      io.to(roomId).emit('room:updated', roomState);
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
        const room = rooms.get(roomId);
        const roomState = createRoomState(room, players);
        io.to(roomId).emit('room:updated', roomState);
      }
    });

    // Start game
    socket.on('game:start', ({ roomId, playerId }, callback) => {
      console.log(`[DEBUG] game:start event - Room: ${roomId}, Player: ${playerId}`);

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        console.log(`[DEBUG] Room or players not found`);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      if (players.length !== 4) {
        console.log(`[DEBUG] Not enough players: ${players.length}/4`);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '需要4名玩家才能开始游戏' });
        }
        return;
      }

      if (!players.every(p => p.isReady)) {
        console.log(`[DEBUG] Not all players ready`);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '需要所有玩家都准备好' });
        }
        return;
      }

      // Set the current level
      room.currentLevel = room.currentLevel || 2;

      // Deal cards to players
      console.log(`[DEBUG] Dealing cards to ${players.length} players at level ${room.currentLevel}`);
      const updatedPlayers = dealCards(players, room.currentLevel);

      // Update room state
      updatedPlayers.forEach(p => {
        p.isReady = false; // Reset ready state
        p.cardsRemaining = p.hand.length;
      });

      roomPlayers.set(roomId, updatedPlayers);

      // Update room properties
      room.gamePhase = 'playing';
      room.currentTurn = 0;
      room.dealer = 0;
      room.scores = { red: 0, blue: 0 };
      room.lastPlay = null;
      room.lastPlayPlayer = null;
      room.lastPlays = {
        north: null,
        south: null,
        east: null,
        west: null,
      };

      // Create room state
      const roomState = createRoomState(room, updatedPlayers);

      console.log(`[DEBUG] Game started, sending updated room state to all players`);

      // Notify all players
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }

      console.log(`✅ Game started in room ${roomId}`);
    });

    // Play cards
    socket.on('game:play', ({ roomId, playerId, cards }, callback) => {
      console.log(`[DEBUG] game:play - Room: ${roomId}, Player: ${playerId}, Cards: ${cards?.length || 0}`);

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      const playerIndex = players.findIndex(p => p.id === playerId);
      const player = players[playerIndex];

      if (!player) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '玩家不存在' });
        }
        return;
      }

      // Check if it's this player's turn
      if (room.currentTurn !== playerIndex) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '不是你的回合' });
        }
        return;
      }

      // Remove played cards from hand
      const cardIds = cards.map(c => c.id);
      player.hand = player.hand.filter(c => !cardIds.includes(c.id));
      player.cardsRemaining = player.hand.length;

      // Create PlayInfo object
      const playInfo = {
        playerId: playerId,
        cards: cards,
        type: 'single', // TODO: Determine actual card type
        mainRank: cards[0]?.rank || 2,
        timestamp: Date.now(),
        isPass: false
      };

      // Update last play (backward compatibility)
      room.lastPlay = playInfo;
      room.lastPlayPlayer = playerIndex;

      // Check if this will complete a round (before adding the play)
      const currentPlayedCount = Object.values(room.lastPlays).filter(p => p !== null).length;
      const willCompleteRound = currentPlayedCount === 3;

      // Update lastPlays for player's position
      if (!room.lastPlays) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }
      room.lastPlays[player.position] = playInfo;

      // Move to next player
      room.currentTurn = (room.currentTurn + 1) % 4;

      roomPlayers.set(roomId, players);
      const roomState = createRoomState(room, players);

      // Send state FIRST so client can see all 4 plays
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      // THEN clear if round is complete (after client has received the state)
      if (willCompleteRound) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }

      console.log(`✅ Player ${player.name} played ${cards.length} cards`);
    });

    // Pass turn
    socket.on('game:pass', ({ roomId, playerId }, callback) => {
      console.log(`[DEBUG] game:pass - Room: ${roomId}, Player: ${playerId}`);

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      const playerIndex = players.findIndex(p => p.id === playerId);

      if (!players[playerIndex]) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '玩家不存在' });
        }
        return;
      }

      // Check if it's this player's turn
      if (room.currentTurn !== playerIndex) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '不是你的回合' });
        }
        return;
      }

      // Check if this player can pass (can't pass if they played last)
      if (room.lastPlayPlayer === playerIndex || room.lastPlay === null) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '你必须出牌' });
        }
        return;
      }

      // Create PlayInfo object for pass
      const passInfo = {
        playerId: playerId,
        cards: [],
        type: 'pass',
        mainRank: null,
        timestamp: Date.now(),
        isPass: true
      };

      // Check if this will complete a round (before adding the pass)
      const currentPlayedCount = Object.values(room.lastPlays).filter(p => p !== null).length;
      const willCompleteRound = currentPlayedCount === 3;

      // Update lastPlays for player's position
      if (!room.lastPlays) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }
      room.lastPlays[players[playerIndex].position] = passInfo;

      // Move to next player
      room.currentTurn = (room.currentTurn + 1) % 4;

      const roomState = createRoomState(room, players);

      // Send state FIRST so client can see all 4 plays/passes
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      // THEN clear if round is complete (after client has received the state)
      if (willCompleteRound) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }

      console.log(`✅ Player ${players[playerIndex].name} passed`);
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

    // Track room creators - don't delete room when creator temporarily disconnects
    const roomCreators = new Map();

    function handleLeave(socket) {
      const roomId = socket.data.roomId;
      const player = socket.data.player;

      if (roomId && player) {
        socket.leave(roomId);
        const players = roomPlayers.get(roomId) || [];
        const filteredPlayers = players.filter(p => p.id !== player.id);

        if (filteredPlayers.length === 0) {
          // Only delete room if it's been empty for more than 30 seconds
          // This allows players to reconnect during page navigation
          const roomCreatedAt = rooms.get(roomId)?.createdAt;
          const now = Date.now();

          if (roomCreatedAt && (now - roomCreatedAt) > 30000) {
            // Room has been empty for more than 30 seconds, delete it
            rooms.delete(roomId);
            roomPlayers.delete(roomId);
            roomCreators.delete(roomId);
            console.log(`${player.name} left room ${roomId} - room deleted (empty for >30s)`);
          } else {
            // Room is recently created or empty for less than 30 seconds, keep it
            roomPlayers.set(roomId, []);
            console.log(`${player.name} left room ${roomId} - room kept (recently created/reconnecting)`);
          }
        } else {
          roomPlayers.set(roomId, filteredPlayers);
          const room = rooms.get(roomId);
          const roomState = createRoomState(room, filteredPlayers);
          io.to(roomId).emit('room:playerLeft', { playerId: player.id, roomState });
          console.log(`${player.name} left room ${roomId}`);
        }
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
