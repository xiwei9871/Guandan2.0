import type { Position, RoomState } from '../types';

const POSITIONS: Position[] = ['south', 'west', 'north', 'east'];

function hasAction(play: unknown): boolean {
  return play !== null && play !== undefined;
}

function getTrackedPositions(activePositions?: Position[]): Position[] {
  if (!activePositions || activePositions.length === 0) {
    return POSITIONS;
  }

  return POSITIONS.filter((position) => activePositions.includes(position));
}

function getPlayerByPosition(
  players: RoomState['players'] | undefined,
  position: Position
): RoomState['players'][number] | undefined {
  return players?.find((player) => player.position === position);
}

function getCurrentLeadPosition(
  lastPlay: RoomState['lastPlay'],
  lastPlays?: RoomState['lastPlays']
): Position | null {
  if (!lastPlay || !lastPlays) {
    return null;
  }

  for (const position of POSITIONS) {
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

  for (const position of POSITIONS) {
    const play = lastPlays[position];
    if (play && !play.isPass && play.playerId === lastPlay.playerId) {
      return position;
    }
  }

  return null;
}

function hasRespondedToCurrentLead(
  play: NonNullable<RoomState['lastPlays']>[Position] | null | undefined,
  lastPlay: RoomState['lastPlay']
): boolean {
  if (!play || !lastPlay) {
    return false;
  }

  return play.timestamp >= lastPlay.timestamp;
}

export function hasCompleteRound(
  lastPlays?: RoomState['lastPlays'],
  lastPlay?: RoomState['lastPlay'],
  activePositions?: Position[],
  players?: RoomState['players']
): boolean {
  if (!lastPlays || !lastPlay) {
    return false;
  }

  const leadPosition = getCurrentLeadPosition(lastPlay, lastPlays);
  if (!leadPosition) {
    return false;
  }

  const responderPositions = getTrackedPositions(activePositions).filter(
    (position) => position !== leadPosition
  );

  if (responderPositions.length === 0) {
    return false;
  }

  return responderPositions.every((position) =>
    hasRespondedToCurrentLead(lastPlays[position], lastPlay)
  );
}

export function isCurrentPlayerLeadingNewRound(params: {
  lastPlays?: RoomState['lastPlays'];
  lastPlay?: RoomState['lastPlay'];
  currentPlayerPosition?: Position;
  currentPlayerIndex?: number;
  lastPlayPlayer?: RoomState['lastPlayPlayer'];
  activePositions?: Position[];
  players?: RoomState['players'];
}): boolean {
  const {
    lastPlays,
    lastPlay,
    currentPlayerPosition,
    currentPlayerIndex,
    lastPlayPlayer,
    activePositions,
    players,
  } = params;

  if (!lastPlays || !lastPlay || !currentPlayerPosition) {
    return false;
  }

  const trackedPositions = getTrackedPositions(activePositions);
  if (!trackedPositions.includes(currentPlayerPosition)) {
    return false;
  }

  if (
    !hasCompleteRound(lastPlays, lastPlay, activePositions, players)
  ) {
    return false;
  }

  const leadPosition = getCurrentLeadPosition(lastPlay, lastPlays);
  if (!leadPosition) {
    return false;
  }

  const leadPlayer = getPlayerByPosition(players, leadPosition);
  if (leadPlayer && leadPlayer.cardsRemaining === 0) {
    return players?.some(
      (player) =>
        player.position === currentPlayerPosition &&
        player.team === leadPlayer.team &&
        player.cardsRemaining > 0
    ) ?? false;
  }

  if (
    typeof currentPlayerIndex === 'number' &&
    currentPlayerIndex >= 0 &&
    lastPlayPlayer !== null &&
    lastPlayPlayer !== undefined
  ) {
    return lastPlayPlayer === currentPlayerIndex;
  }

  return hasAction(lastPlays[currentPlayerPosition]);
}

export function canCurrentPlayerPlay(params: {
  lastPlay: RoomState['lastPlay'];
  lastPlayPlayer: RoomState['lastPlayPlayer'];
  currentPlayerIndex: number;
  currentPlayerPosition?: Position;
  lastPlays?: RoomState['lastPlays'];
  activePositions?: Position[];
  players?: RoomState['players'];
}): boolean {
  const {
    lastPlay,
    lastPlayPlayer,
    currentPlayerIndex,
    currentPlayerPosition,
    lastPlays,
    activePositions,
    players,
  } = params;

  if (currentPlayerIndex < 0) {
    return false;
  }

  if (
    hasCompleteRound(lastPlays, lastPlay, activePositions, players)
  ) {
    return true;
  }

  if (!lastPlay) {
    return true;
  }

  return lastPlayPlayer !== currentPlayerIndex;
}

export function canCurrentPlayerPass(params: {
  lastPlay: RoomState['lastPlay'];
  lastPlayPlayer: RoomState['lastPlayPlayer'];
  currentPlayerIndex: number;
  currentPlayerPosition?: Position;
  lastPlays?: RoomState['lastPlays'];
  activePositions?: Position[];
  players?: RoomState['players'];
}): boolean {
  const {
    lastPlay,
    lastPlayPlayer,
    currentPlayerIndex,
    lastPlays,
    activePositions,
    players,
  } = params;

  if (currentPlayerIndex < 0) {
    return false;
  }

  if (!lastPlay) {
    return false;
  }

  if (lastPlayPlayer === null || lastPlayPlayer === undefined) {
    return false;
  }

  if (hasCompleteRound(lastPlays, lastPlay, activePositions, players)) {
    return false;
  }

  return lastPlayPlayer !== currentPlayerIndex;
}

export function shouldClearLastPlaysBeforePlay(
  lastPlays?: RoomState['lastPlays'],
  lastPlay?: RoomState['lastPlay'],
  activePositions?: Position[],
  players?: RoomState['players']
): boolean {
  return hasCompleteRound(lastPlays, lastPlay, activePositions, players);
}

export function shouldClearLastPlaysBeforePass(_lastPlays?: RoomState['lastPlays']): boolean {
  return false;
}
