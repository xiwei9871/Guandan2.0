interface PlayerRef {
  id: string;
  clientId?: string;
}

interface LobbyRulesRuntime {
  isRoomOwner: (ownerId: string | null | undefined, playerId: string | null | undefined) => boolean;
  resolveRoomOwnerId: (
    ownerId: string | null | undefined,
    players: PlayerRef[]
  ) => string | null;
}

const runtime = require('./lobbyRules.runtime.js') as LobbyRulesRuntime;

export function isRoomOwner(
  ownerId: string | null | undefined,
  playerId: string | null | undefined
): boolean {
  return runtime.isRoomOwner(ownerId, playerId);
}

export function resolveRoomOwnerId(
  ownerId: string | null | undefined,
  players: PlayerRef[]
): string | null {
  return runtime.resolveRoomOwnerId(ownerId, players);
}
