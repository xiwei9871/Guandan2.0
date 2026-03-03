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
});
