import { GamePhase } from '../types';

interface CreateRoomGuardInput {
  playerName: string;
  isConnected: boolean;
  isBusy: boolean;
}

interface JoinRoomGuardInput extends CreateRoomGuardInput {
  roomId: string;
}

interface RoomActionStateInput {
  gamePhase: GamePhase;
  isConnected: boolean;
  isLeaving: boolean;
  currentPlayerReady: boolean;
  playersCount: number;
  allPlayersReady: boolean;
}

export interface GuardResult {
  disabled: boolean;
  reason: string | null;
}

export interface RoomActionState {
  showReady: boolean;
  canReady: boolean;
  showStart: boolean;
  canStart: boolean;
  canLeave: boolean;
}

function hasName(playerName: string): boolean {
  return playerName.trim().length > 0;
}

export function normalizeRoomId(roomId: string): string {
  return roomId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
}

export function getCreateRoomGuard(input: CreateRoomGuardInput): GuardResult {
  if (!hasName(input.playerName)) {
    return { disabled: true, reason: '请先输入你的名字。' };
  }

  if (!input.isConnected) {
    return { disabled: true, reason: '服务器尚未连接。' };
  }

  if (input.isBusy) {
    return { disabled: true, reason: null };
  }

  return { disabled: false, reason: null };
}

export function getJoinRoomGuard(input: JoinRoomGuardInput): GuardResult {
  if (!hasName(input.playerName)) {
    return { disabled: true, reason: '请先输入你的名字。' };
  }

  if (normalizeRoomId(input.roomId).length === 0) {
    return { disabled: true, reason: '请输入房间号。' };
  }

  if (!input.isConnected) {
    return { disabled: true, reason: '服务器尚未连接。' };
  }

  if (input.isBusy) {
    return { disabled: true, reason: null };
  }

  return { disabled: false, reason: null };
}

export function getRoomActionState(input: RoomActionStateInput): RoomActionState {
  const showReady = input.gamePhase === 'waiting' && !input.currentPlayerReady;
  const showStart =
    input.gamePhase === 'waiting' &&
    input.playersCount === 4 &&
    input.allPlayersReady;

  return {
    showReady,
    canReady: showReady && input.isConnected && !input.isLeaving,
    showStart,
    canStart: showStart && input.isConnected && !input.isLeaving,
    canLeave: !input.isLeaving,
  };
}
