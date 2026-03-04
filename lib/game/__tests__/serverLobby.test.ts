import { describe, expect, it } from '@jest/globals';

const { createLobby } = require('../serverLobby.runtime.js');

describe('serverLobby runtime', () => {
  it('keeps the creator as owner when another player joins', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM01',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2',
      clientId: 'client-mq2',
    });

    expect(lobby.getRoom(roomId).ownerId).toBe('client-mq1');
    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq1', 'mq2']);
  });

  it('preserves ownership and room capacity across creator reconnect during page navigation', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM02',
      playerName: 'mq1',
      socketId: 'socket-home',
      clientId: 'client-mq1',
    });

    lobby.disconnectPlayer({
      roomId,
      socketId: 'socket-home',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq1',
      socketId: 'socket-room',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2',
      clientId: 'client-mq2',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq3',
      socketId: 'socket-3',
      clientId: 'client-mq3',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq4',
      socketId: 'socket-4',
      clientId: 'client-mq4',
    });

    expect(lobby.getRoom(roomId).ownerId).toBe('client-mq1');
    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq1', 'mq2', 'mq3', 'mq4']);
    expect(lobby.getPlayers(roomId).find((player: any) => player.clientId === 'client-mq1').id).toBe('socket-room');
  });

  it('keeps the disconnected creator as owner when another player joins before the reconnect finishes', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM21',
      playerName: 'mq1',
      socketId: 'socket-home',
      clientId: 'client-mq1',
    });

    lobby.disconnectPlayer({
      roomId,
      socketId: 'socket-home',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2',
      clientId: 'client-mq2',
    });

    expect(lobby.getRoom(roomId).ownerId).toBe('client-mq1');

    lobby.joinRoom({
      roomId,
      playerName: 'mq1',
      socketId: 'socket-room',
      clientId: 'client-mq1',
    });

    expect(lobby.getRoom(roomId).ownerId).toBe('client-mq1');
    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq1', 'mq2']);
  });

  it('transfers ownership only after the creator explicitly leaves', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM03',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2',
      clientId: 'client-mq2',
    });

    lobby.leavePlayer({
      roomId,
      socketId: 'socket-1',
    });

    expect(lobby.getRoom(roomId).ownerId).toBe('client-mq2');
    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq2']);
  });

  it('removes an empty room as soon as the last player truly leaves', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM04',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.leavePlayer({
      roomId,
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    expect(lobby.getRoom(roomId)).toBeNull();
    expect(lobby.getPlayers(roomId)).toEqual([]);
  });

  it('expires waiting rooms after the configured idle ttl', () => {
    let nowValue = 1000;
    const lobby = createLobby({
      now: () => nowValue,
      roomIdleTtlMs: 60000,
    });

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM05',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    nowValue += 60001;
    lobby.pruneExpiredRooms();

    expect(lobby.getRoom(roomId)).toBeNull();
    expect(() =>
      lobby.joinRoom({
        roomId,
        playerName: 'mq2',
        socketId: 'socket-2',
        clientId: 'client-mq2',
      })
    ).toThrow('房间不存在');
  });

  it('drops disconnected players after the reconnect grace expires', () => {
    let nowValue = 2000;
    const lobby = createLobby({
      now: () => nowValue,
      reconnectGraceMs: 30000,
      roomIdleTtlMs: 120000,
    });

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM06',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2',
      clientId: 'client-mq2',
    });

    lobby.disconnectPlayer({
      roomId,
      socketId: 'socket-2',
    });

    nowValue += 30001;
    lobby.pruneExpiredPlayers(roomId);

    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq1']);
  });

  it('rejects joins into a room that has already expired', () => {
    let nowValue = 5000;
    const lobby = createLobby({
      now: () => nowValue,
      roomIdleTtlMs: 1000,
    });

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM07',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    nowValue += 1001;

    expect(() =>
      lobby.joinRoom({
        roomId,
        playerName: 'mq2',
        socketId: 'socket-2',
        clientId: 'client-mq2',
      })
    ).toThrow('房间不存在');
  });
  it('rejects a fifth player from joining a full room', () => {
    const lobby = createLobby();

    const { roomId } = lobby.createRoom({
      roomId: 'ROOM08',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({ roomId, playerName: 'mq2', socketId: 'socket-2', clientId: 'client-mq2' });
    lobby.joinRoom({ roomId, playerName: 'mq3', socketId: 'socket-3', clientId: 'client-mq3' });
    lobby.joinRoom({ roomId, playerName: 'mq4', socketId: 'socket-4', clientId: 'client-mq4' });

    expect(() =>
      lobby.joinRoom({
        roomId,
        playerName: 'mq5',
        socketId: 'socket-5',
        clientId: 'client-mq5',
      })
    ).toThrow('房间已满');
  });

  it('rejects a new outsider once the game has started', () => {
    const lobby = createLobby();

    const { roomId, room } = lobby.createRoom({
      roomId: 'ROOM09',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({ roomId, playerName: 'mq2', socketId: 'socket-2', clientId: 'client-mq2' });
    room.status = 'playing';

    expect(() =>
      lobby.joinRoom({
        roomId,
        playerName: 'mq3',
        socketId: 'socket-3',
        clientId: 'client-mq3',
      })
    ).toThrow('房间已开始游戏');
  });

  it('allows a known player to rejoin an active room with the same client id', () => {
    const lobby = createLobby();

    const { roomId, room } = lobby.createRoom({
      roomId: 'ROOM10',
      playerName: 'mq1',
      socketId: 'socket-1',
      clientId: 'client-mq1',
    });

    lobby.joinRoom({ roomId, playerName: 'mq2', socketId: 'socket-2', clientId: 'client-mq2' });
    room.status = 'playing';

    lobby.disconnectPlayer({
      roomId,
      socketId: 'socket-2',
    });

    const result = lobby.joinRoom({
      roomId,
      playerName: 'mq2',
      socketId: 'socket-2b',
      clientId: 'client-mq2',
    });

    expect(result.rejoined).toBe(true);
    expect(result.player.id).toBe('socket-2b');
    expect(lobby.getPlayers(roomId).map((player: any) => player.name)).toEqual(['mq1', 'mq2']);
  });
});
