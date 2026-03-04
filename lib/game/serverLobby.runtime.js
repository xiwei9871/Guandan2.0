const { resolveRoomOwnerId } = require('./lobbyRules.runtime.js');

const POSITIONS = ['south', 'west', 'north', 'east'];
const TEAMS = ['red', 'blue', 'red', 'blue'];

function createLobby(options = {}) {
  const rooms = new Map();
  const roomPlayers = new Map();
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const reconnectGraceMs = options.reconnectGraceMs ?? 30000;
  const roomIdleTtlMs = options.roomIdleTtlMs ?? 15 * 60 * 1000;

  function getRoom(roomId) {
    return rooms.get(roomId) || null;
  }

  function getPlayers(roomId) {
    return roomPlayers.get(roomId) || [];
  }

  function createRoom({ roomId, playerName, socketId, clientId }) {
    const stableClientId = clientId || socketId;
    const player = createPlayer({
      socketId,
      clientId: stableClientId,
      playerName,
      index: 0,
    });
    const room = {
      id: roomId,
      ownerId: stableClientId,
      name: `${playerName}的房间`,
      maxPlayers: 4,
      status: 'waiting',
      gameState: null,
      createdAt: now(),
      lastActivityAt: now(),
    };

    rooms.set(roomId, room);
    roomPlayers.set(roomId, [player]);

    return { roomId, room, player, players: [player] };
  }

  function joinRoom({ roomId, playerName, socketId, clientId }) {
    pruneExpiredRooms();
    const room = rooms.get(roomId);

    if (!room) {
      throw createLobbyError('ROOM_NOT_FOUND', '房间不存在');
    }

    pruneExpiredPlayers(roomId);

    const players = getPlayers(roomId);
    const stableClientId = clientId || socketId;
    const existingPlayer = players.find(
      (player) => player.clientId === stableClientId || player.id === socketId
    );

    if (existingPlayer) {
      existingPlayer.id = socketId;
      existingPlayer.clientId = stableClientId;
      existingPlayer.name = playerName;
      delete existingPlayer.disconnectedAt;
      room.lastActivityAt = now();

      if (!room.ownerId) {
        room.ownerId = stableClientId;
      }

      return { room, player: existingPlayer, players, rejoined: true };
    }

    if (room.status !== 'waiting') {
      throw createLobbyError('ROOM_NOT_WAITING', '房间已开始游戏');
    }

    if (players.length >= room.maxPlayers) {
      throw createLobbyError('ROOM_FULL', '房间已满');
    }

    const player = createPlayer({
      socketId,
      clientId: stableClientId,
      playerName,
      index: players.length,
    });

    players.push(player);
    roomPlayers.set(roomId, players);
    room.lastActivityAt = now();

    if (!room.ownerId) {
      room.ownerId = stableClientId;
    }

    return { room, player, players, rejoined: false };
  }

  function disconnectPlayer({ roomId, socketId }) {
    const room = rooms.get(roomId);
    if (!room) {
      return { room: null, player: null, players: [] };
    }

    const players = getPlayers(roomId);
    const player = players.find((candidate) => candidate.id === socketId) || null;

    if (!player) {
      return { room, player: null, players };
    }

    player.disconnectedAt = now();
    room.lastActivityAt = now();
    return { room, player, players };
  }

  function leavePlayer({ roomId, socketId, clientId }) {
    const room = rooms.get(roomId);
    if (!room) {
      return { room: null, player: null, players: [] };
    }

    const players = getPlayers(roomId);
    const player =
      players.find((candidate) => candidate.id === socketId) ||
      players.find((candidate) => candidate.clientId === clientId) ||
      null;

    if (!player) {
      return { room, player: null, players };
    }

    const remainingPlayers = players.filter(
      (candidate) =>
        candidate.id !== player.id &&
        (!clientId || candidate.clientId !== clientId)
    );

    if (remainingPlayers.length === 0) {
      removeRoom(roomId);
      return { room: null, player, players: [] };
    }

    roomPlayers.set(roomId, remainingPlayers);
    room.ownerId = resolveRoomOwnerId(room.ownerId, remainingPlayers);
    room.lastActivityAt = now();

    return { room, player, players: remainingPlayers };
  }

  function pruneExpiredPlayers(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
      return [];
    }

    const players = getPlayers(roomId);
    const activePlayers = players.filter((player) => {
      if (typeof player.disconnectedAt !== 'number') {
        return true;
      }

      return now() - player.disconnectedAt < reconnectGraceMs;
    });

    if (activePlayers.length !== players.length) {
      if (activePlayers.length === 0) {
        removeRoom(roomId);
        return [];
      }

      roomPlayers.set(roomId, activePlayers);
      room.ownerId = resolveRoomOwnerId(room.ownerId, activePlayers);
      room.lastActivityAt = now();
    }

    return activePlayers;
  }

  function pruneExpiredRooms() {
    const expiredRoomIds = [];

    for (const [roomId, room] of rooms.entries()) {
      if (room.status !== 'waiting') {
        continue;
      }

      const lastActivityAt = room.lastActivityAt ?? room.createdAt ?? 0;
      if (now() - lastActivityAt > roomIdleTtlMs) {
        expiredRoomIds.push(roomId);
      }
    }

    expiredRoomIds.forEach(removeRoom);
    return expiredRoomIds;
  }

  function removeRoom(roomId) {
    rooms.delete(roomId);
    roomPlayers.delete(roomId);
  }

  return {
    rooms,
    roomPlayers,
    createRoom,
    joinRoom,
    disconnectPlayer,
    leavePlayer,
    pruneExpiredPlayers,
    pruneExpiredRooms,
    getRoom,
    getPlayers,
  };
}

function createPlayer({ socketId, clientId, playerName, index }) {
  return {
    id: socketId,
    clientId,
    name: playerName,
    position: POSITIONS[index],
    team: TEAMS[index],
    hand: [],
    isReady: false,
    cardsRemaining: 0,
  };
}

function createLobbyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

module.exports = {
  createLobby,
};
