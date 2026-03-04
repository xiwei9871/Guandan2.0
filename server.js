const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { getNetworkConfig } = require('./lib/runtime/networkConfig.runtime.js');
const { detectCardType, canBeat } = require('./lib/game/cardChecker.runtime.js');
const { isRoomOwner } = require('./lib/game/lobbyRules.runtime.js');
const { createLobby } = require('./lib/game/serverLobby.runtime.js');
const {
  getNextTurnIndex,
  shouldRequireBeat,
  applyRankingAndSettlement,
} = require('./lib/game/serverRoundState.runtime.js');
const {
  beginTributeRound,
  applyTribute,
  applyReturnTribute,
} = require('./lib/game/serverTribute.runtime.js');

const networkConfig = getNetworkConfig();
const dev = process.env.NODE_ENV !== 'production';
const hostname = networkConfig.host;
const port = networkConfig.port;

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
      origin: networkConfig.socketCorsOrigins.length > 0 ? networkConfig.socketCorsOrigins : true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.io logic
  const lobby = createLobby();
  const { rooms, roomPlayers } = lobby;

  function normalizeRoomId(roomId) {
    return String(roomId || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
  }

  function getCardsRemaining(player) {
    if (typeof player.cardsRemaining === 'number') {
      return player.cardsRemaining;
    }

    if (Array.isArray(player.hand)) {
      return player.hand.length;
    }

    return 0;
  }

  function getActivePositions(players) {
    return players
      .filter((player) => getCardsRemaining(player) > 0)
      .map((player) => player.position);
  }

  function getCurrentLeadPosition(lastPlays, lastPlay) {
    if (!lastPlays || !lastPlay) {
      return null;
    }

    const positions = ['south', 'west', 'north', 'east'];
    for (const position of positions) {
      const play = lastPlays[position];
      if (
        play &&
        !play.isPass &&
        play.playerId === lastPlay.playerId &&
        play.timestamp === lastPlay.timestamp
      ) {
        return position;
      }
    }

    for (const position of positions) {
      const play = lastPlays[position];
      if (play && !play.isPass && play.playerId === lastPlay.playerId) {
        return position;
      }
    }

    return null;
  }

  function haveAllActivePlayersActed(lastPlays, lastPlay, activePositions, players) {
    if (!lastPlays || !lastPlay || activePositions.length === 0) {
      return false;
    }

    const leadPosition = getCurrentLeadPosition(lastPlays, lastPlay);
    if (!leadPosition) {
      return false;
    }

    const responderPositions = activePositions.filter((position) => position !== leadPosition);

    if (responderPositions.length === 0) {
      return false;
    }

    return responderPositions.every((position) => {
      const play = lastPlays[position];
      return play !== null && play !== undefined && play.timestamp >= lastPlay.timestamp;
    });
  }

  // Helper function to create complete room state
  function createRoomState(room, players) {
    return {
      roomId: room.id,
      ownerId: room.ownerId || null,
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
      currentTurn: room.currentTurn ?? 0,
      scores: room.scores || { red: 0, blue: 0 },
      lastPlay: room.lastPlay || null,
      lastPlayPlayer: room.lastPlayPlayer ?? null,
      lastPlays: room.lastPlays || {
        north: null,
        south: null,
        east: null,
        west: null,
      },
      dealer: room.dealer ?? 0,
      tribute: room.tribute || null,
      result: room.result || null,
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
    socket.on('room:create', ({ playerName, clientId }, callback) => {
      const stableClientId = clientId || socket.id;
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const player = {
        id: socket.id,
        clientId: stableClientId,
        name: playerName,
        position: 'south',
        team: 'red',
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      const room = {
        id: roomId,
        ownerId: stableClientId,
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
      const createdLobbyState = lobby.createRoom({
        roomId,
        playerName,
        socketId: socket.id,
        clientId,
      });
      socket.data.player = createdLobbyState.player;
      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${playerName}`);

      // 发送 ACK 响应
      if (callback && typeof callback === 'function') {
        callback({ success: true, roomId });
      }

      // 广播房间更新事件
      const roomState = createRoomState(createdLobbyState.room, [createdLobbyState.player]);
      socket.emit('room:updated', roomState);
    });

    // Join room
    socket.on('room:join', ({ roomId, playerName, clientId }, callback) => {
      const stableClientId = clientId || socket.id;
      roomId = normalizeRoomId(roomId);
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

      const reconnectingPlayer = lobby
        .getPlayers(roomId)
        .find((player) => player.clientId === stableClientId || player.id === socket.id);

      try {
        const { room: joinedRoom, player, players, rejoined } = lobby.joinRoom({
          roomId,
          playerName,
          socketId: socket.id,
          clientId,
        });

        if (reconnectingPlayer && reconnectingPlayer.id !== socket.id) {
          const previousSocket = io.sockets.sockets.get(reconnectingPlayer.id);
          if (previousSocket) {
            previousSocket.leave(roomId);
            previousSocket.data.roomId = null;
            previousSocket.data.player = null;
          }
        }

        socket.data.roomId = roomId;
        socket.data.player = player;
        socket.join(roomId);

        const roomState = createRoomState(joinedRoom, players);
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            playerId: player.id,
            roomState: roomState
          });
        }

        if (rejoined) {
          console.log(`${playerName} re-joined room ${roomId} (matched by stable client id)`);
          io.to(roomId).emit('room:updated', roomState);
          return;
        }

        console.log(`${playerName} joined room ${roomId}`);
        io.to(roomId).emit('room:playerJoined', { player, roomState });
        io.to(roomId).emit('room:updated', roomState);
        return;
      } catch (error) {
        if (error && error.code === 'ROOM_FULL') {
          socket.emit('error', '房间已满');
          if (callback && typeof callback === 'function') {
            callback({ success: false, error: '房间已满' });
          }
          return;
        }

        throw error;
      }

      const players = roomPlayers.get(roomId) || [];

      // Check if player is already in the room (re-join scenario)
      const existingPlayer = players.find(
        p => p.clientId === stableClientId || p.id === socket.id
      );
      if (existingPlayer) {
        if (existingPlayer.id !== socket.id) {
          const previousSocket = io.sockets.sockets.get(existingPlayer.id);
          if (previousSocket) {
            previousSocket.leave(roomId);
            previousSocket.data.roomId = null;
            previousSocket.data.player = null;
          }
        }

        existingPlayer.id = socket.id;
        existingPlayer.clientId = stableClientId;
        existingPlayer.name = playerName;
        socket.data.roomId = roomId;
        socket.data.player = existingPlayer;
        socket.join(roomId);

        console.log(`${playerName} re-joined room ${roomId} (matched by stable client id)`);
        const roomState = createRoomState(room, players);
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            playerId: existingPlayer.id,
            roomState: roomState
          });
        }
        io.to(roomId).emit('room:updated', roomState);
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
      const teams = ['red', 'blue', 'red', 'blue'];
      const index = players.length;

      const player = {
        id: socket.id,
        clientId: stableClientId,
        name: playerName,
        position: positions[index],
        team: teams[index],
        hand: [],
        isReady: false,
        cardsRemaining: 0,
      };

      socket.data.roomId = roomId;
      socket.data.player = player;
      if (!room.ownerId || players.length === 0) {
        room.ownerId = player.clientId || player.id;
      }
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
      roomId = normalizeRoomId(roomId);
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

      const isFinishedRoundRestart = room.status === 'finished' || room.gamePhase === 'finished';

      if (!isFinishedRoundRestart && !players.every(p => p.isReady)) {
        console.log(`[DEBUG] Not all players ready`);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '需要所有玩家都准备好' });
        }
        return;
      }

      const currentPlayer = players.find((player) => player.id === playerId);

      if (!currentPlayer) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Player not found in room' });
        }
        return;
      }

      if (!isRoomOwner(room.ownerId, currentPlayer.clientId || currentPlayer.id)) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '只有房主可以开始游戏' });
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
      room.status = 'playing';
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

      if (isFinishedRoundRestart) {
        beginTributeRound(room, updatedPlayers);
      } else {
        room.gamePhase = 'playing';
        room.currentTurn = 0;
        room.tribute = null;
      }

      updatedPlayers.forEach((player) => {
        delete player.rank;
      });
      room.result = null;

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
      roomId = normalizeRoomId(roomId);
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

      // Validate selected cards before applying state changes
      if (!Array.isArray(cards) || cards.length === 0) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '必须出牌' });
        }
        return;
      }

      const selectedIds = cards.map(c => c.id);
      if (new Set(selectedIds).size !== selectedIds.length) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '选中的牌无效' });
        }
        return;
      }

      const handById = new Map(player.hand.map(c => [c.id, c]));
      if (selectedIds.some(id => !handById.has(id))) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '手牌中不存在选中的牌' });
        }
        return;
      }

      const selectedCards = selectedIds.map(id => handById.get(id));
      if (selectedCards.some(card => !card)) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '手牌数据异常' });
        }
        return;
      }

      const typeResult = detectCardType(selectedCards);
      if (!typeResult.valid || !typeResult.type) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '非法牌型' });
        }
        return;
      }

      const previousLastPlay = room.lastPlay;
      const activePositions = getActivePositions(players);
      const roundCompleteBeforePlay = haveAllActivePlayersActed(
        room.lastPlays,
        previousLastPlay,
        activePositions,
        players
      );

      if (shouldRequireBeat({
        lastPlay: previousLastPlay,
        lastPlayPlayer: room.lastPlayPlayer,
        playerIndex,
        roundComplete: roundCompleteBeforePlay,
      })) {
        const canBeatLastPlay = canBeat(
          selectedCards,
          {
            type: previousLastPlay.type,
            mainRank: previousLastPlay.mainRank,
            cards: previousLastPlay.cards,
          },
          room.currentLevel || 2
        );

        if (!canBeatLastPlay) {
          if (callback && typeof callback === 'function') {
            callback({ success: false, error: '打不过上一手牌' });
          }
          return;
        }
      }

      // Remove played cards from hand
      const cardIds = selectedIds;
      player.hand = player.hand.filter(c => !cardIds.includes(c.id));
      player.cardsRemaining = player.hand.length;

      // Create PlayInfo object
      const playInfo = {
        playerId: playerId,
        cards: selectedCards,
        type: typeResult.type,
        mainRank: typeResult.mainRank,
        timestamp: Date.now(),
        isPass: false
      };

      // Only clear center plays when a new round actually starts with a real play
      if (roundCompleteBeforePlay) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }

      // Update lastPlays for player's position
      if (!room.lastPlays) {
        room.lastPlays = {
          north: null,
          south: null,
          east: null,
          west: null,
        };
      }

      // Update last play (backward compatibility)
      room.lastPlay = playInfo;
      room.lastPlayPlayer = playerIndex;
      room.lastPlays[player.position] = playInfo;

      const settlementResult = applyRankingAndSettlement(room, players, playerIndex);
      if (!settlementResult.finished) {
        room.currentTurn = getNextTurnIndex(players, playerIndex, room.lastPlayPlayer, false);
      }

      roomPlayers.set(roomId, players);
      const roomState = createRoomState(room, players);

      // Send state
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }

      console.log(`✅ Player ${player.name} played ${cards.length} cards`);
    });

    // Pass turn
    socket.on('game:pass', ({ roomId, playerId }, callback) => {
      roomId = normalizeRoomId(roomId);
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

      const activePositions = getActivePositions(players);
      if (haveAllActivePlayersActed(room.lastPlays, room.lastPlay, activePositions, players)) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '\u5fc5\u987b\u51fa\u724c' });
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

      const roundComplete = haveAllActivePlayersActed(
        room.lastPlays,
        room.lastPlay,
        activePositions,
        players
      );

      room.currentTurn = getNextTurnIndex(
        players,
        playerIndex,
        room.lastPlayPlayer,
        roundComplete
      );

      const roomState = createRoomState(room, players);

      // Send state
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }

      console.log(`✅ Player ${players[playerIndex].name} passed`);
    });

    socket.on('game:tribute', ({ roomId, playerId, cardId }, callback) => {
      roomId = normalizeRoomId(roomId);
      console.log(`[DEBUG] game:tribute - Room: ${roomId}, Player: ${playerId}, Card: ${cardId}`);

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      try {
        applyTribute(room, players, {
          fromPlayerId: playerId,
          cardId,
        });
      } catch (error) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: error.message || '进贡失败' });
        }
        return;
      }

      const roomState = createRoomState(room, players);
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }
    });

    socket.on('game:returnTribute', ({ roomId, playerId, cardId }, callback) => {
      roomId = normalizeRoomId(roomId);
      console.log(`[DEBUG] game:returnTribute - Room: ${roomId}, Player: ${playerId}, Card: ${cardId}`);

      const room = rooms.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!room || !players) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: '房间不存在' });
        }
        return;
      }

      try {
        applyReturnTribute(room, players, {
          fromPlayerId: playerId,
          cardId,
        });
      } catch (error) {
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: error.message || '还贡失败' });
        }
        return;
      }

      const roomState = createRoomState(room, players);
      io.to(roomId).emit('room:updated', roomState);
      io.to(roomId).emit('game:stateChanged', roomState);

      if (callback && typeof callback === 'function') {
        callback({ success: true, roomState });
      }
    });

    // Leave room
    socket.on('room:leave', (_, callback) => {
      handleLeave(socket, 'leave');
      if (callback && typeof callback === 'function') {
        callback({ success: true });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      handleLeave(socket, 'disconnect');
    });

    function handleLeave(socket, reason) {
      const roomId = socket.data.roomId;
      const player = socket.data.player;

      if (!roomId || !player) {
        return;
      }

      if (reason === 'disconnect') {
        lobby.disconnectPlayer({
          roomId,
          socketId: socket.id,
        });
        socket.data.roomId = null;
        socket.data.player = null;
        return;
      }

      socket.leave(roomId);
      const { room, players } = lobby.leavePlayer({
        roomId,
        socketId: socket.id,
        clientId: player.clientId,
      });

      socket.data.roomId = null;
      socket.data.player = null;

      if (!room) {
        return;
      }

      const roomState = createRoomState(room, players);
      io.to(roomId).emit('room:playerLeft', { playerId: player.id, roomState });
      io.to(roomId).emit('room:updated', roomState);
      console.log(`${player.name} left room ${roomId}`);
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
