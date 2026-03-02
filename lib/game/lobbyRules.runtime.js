function isRoomOwner(ownerId, playerId) {
  return Boolean(ownerId && playerId && ownerId === playerId);
}

function getStablePlayerId(player) {
  if (!player) {
    return null;
  }

  return player.clientId || player.id || null;
}

function resolveRoomOwnerId(ownerId, players) {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  if (ownerId && players.some((player) => getStablePlayerId(player) === ownerId)) {
    return ownerId;
  }

  return getStablePlayerId(players[0]);
}

module.exports = {
  isRoomOwner,
  resolveRoomOwnerId,
};
