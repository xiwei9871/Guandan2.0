const {
  compareCardsDescending,
  compareTributeSelections,
  detectAntiTribute,
  getTributeMode,
  validateReturnTributeCard,
  validateTributeCard,
} = require('./tributeRules.runtime.js');

function sortHand(hand) {
  hand.sort(compareCardsDescending);
}

function syncPlayerCounts(players) {
  players.forEach((player) => {
    player.cardsRemaining = Array.isArray(player.hand) ? player.hand.length : 0;
  });
}

function removeCardFromHand(player, cardId) {
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) {
    throw new Error(`Card ${cardId} not found in hand for ${player.id}`);
  }

  const [card] = player.hand.splice(cardIndex, 1);
  return card;
}

function addCardToHand(player, card) {
  player.hand.push(card);
  sortHand(player.hand);
}

function getPlayerIndex(players, playerId) {
  return players.findIndex((player) => player.id === playerId);
}

function getPlayer(players, playerId) {
  const player = players[getPlayerIndex(players, playerId)];
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  return player;
}

function clearPreviousRoundState(room) {
  room.status = 'playing';
  room.lastPlay = null;
  room.lastPlayPlayer = null;
  room.lastPlays = {
    north: null,
    south: null,
    east: null,
    west: null,
  };
}

function buildPendingGives(tributeMode) {
  return tributeMode.givers.map((giverId, index) => ({
    fromPlayerId: giverId,
    toPlayerId: tributeMode.mode === 'double' ? null : tributeMode.receivers[index] || tributeMode.receivers[0] || null,
  }));
}

function buildTributeState(tributeMode, leadPlayerId = null, exempt = false) {
  const pendingGives = buildPendingGives(tributeMode);
  const firstGive = pendingGives[0] || null;

  return {
    fromPlayer: firstGive ? firstGive.fromPlayerId : null,
    toPlayer: firstGive ? firstGive.toPlayerId || null : null,
    cards: [],
    phase: 'giving',
    mode: tributeMode.mode,
    exempt,
    giverOrder: [...tributeMode.givers],
    receiverOrder: [...tributeMode.receivers],
    pendingGives,
    resolvedGives: [],
    pendingReturns: [],
    resolvedReturns: [],
    revealedActions: [],
    leadPlayerId,
  };
}

function resolveTributeAssignments(room, players, tributeMode) {
  const resolvedSelections = room.tribute.resolvedGives.map((give) => ({
    fromPlayerId: give.fromPlayerId,
    card: give.card,
  }));

  let finalGives;
  if (tributeMode.mode === 'double') {
    const sortedSelections = compareTributeSelections(resolvedSelections, tributeMode.givers);
    finalGives = [
      {
        fromPlayerId: sortedSelections[0].fromPlayerId,
        toPlayerId: tributeMode.receivers[0],
        card: sortedSelections[0].card,
      },
      {
        fromPlayerId: sortedSelections[1].fromPlayerId,
        toPlayerId: tributeMode.receivers[1],
        card: sortedSelections[1].card,
      },
    ];
  } else {
    finalGives = [
      {
        fromPlayerId: resolvedSelections[0].fromPlayerId,
        toPlayerId: tributeMode.receivers[0],
        card: resolvedSelections[0].card,
      },
    ];
  }

  finalGives.forEach((give) => {
    const receiver = getPlayer(players, give.toPlayerId);
    addCardToHand(receiver, give.card);
  });

  syncPlayerCounts(players);

  room.tribute.phase = 'returning';
  room.tribute.resolvedGives = finalGives;
  room.tribute.pendingReturns = finalGives.map((give) => ({
    fromPlayerId: give.toPlayerId,
    toPlayerId: give.fromPlayerId,
  }));
  room.tribute.leadPlayerId = compareTributeSelections(resolvedSelections, tributeMode.givers)[0].fromPlayerId;
  room.tribute.fromPlayer = finalGives[0]?.fromPlayerId || null;
  room.tribute.toPlayer = finalGives[0]?.toPlayerId || null;
  room.tribute.cards = finalGives[0]?.card ? [finalGives[0].card] : [];
  room.tribute.revealedActions = finalGives.map((give) => ({
    kind: 'tribute',
    fromPlayerId: give.fromPlayerId,
    toPlayerId: give.toPlayerId,
    card: give.card,
  }));

  room.currentTurn = room.tribute.pendingReturns.length > 0
    ? getPlayerIndex(players, room.tribute.pendingReturns[0].fromPlayerId)
    : getPlayerIndex(players, room.tribute.leadPlayerId);
}

function beginTributeRound(room, players) {
  clearPreviousRoundState(room);

  const tributeMode = getTributeMode(players);
  const losingPlayers = players.filter((player) => tributeMode.givers.includes(player.id));
  const highestReceiverId = tributeMode.receivers[0];

  if (detectAntiTribute(tributeMode.mode, losingPlayers)) {
    room.gamePhase = 'playing';
    room.tribute = null;
    room.currentTurn = getPlayerIndex(players, highestReceiverId);
    return {
      skipped: true,
      leadPlayerId: highestReceiverId,
    };
  }

  room.gamePhase = 'tributing';
  room.tribute = buildTributeState(tributeMode, null, false);
  room.currentTurn = getPlayerIndex(players, room.tribute.pendingGives[0].fromPlayerId);

  return {
    skipped: false,
    leadPlayerId: null,
    tributeMode,
    tribute: room.tribute,
  };
}

function applyTribute(room, players, action) {
  if (!room.tribute || room.gamePhase !== 'tributing' || room.tribute.phase !== 'giving') {
    throw new Error('Room is not currently collecting tribute');
  }

  const pendingGiveIndex = room.tribute.pendingGives.findIndex((give) => give.fromPlayerId === action.fromPlayerId);
  if (pendingGiveIndex < 0) {
    throw new Error('No pending tribute action');
  }

  const pendingGive = room.tribute.pendingGives[pendingGiveIndex];

  const giver = getPlayer(players, pendingGive.fromPlayerId);
  const card = giver.hand.find((candidate) => candidate.id === action.cardId);

  if (!card) {
    throw new Error('Tribute card not found in hand');
  }

  if (!validateTributeCard(giver.hand, card)) {
    throw new Error('Tribute card must match the highest eligible tribute rank');
  }

  const movedCard = removeCardFromHand(giver, action.cardId);
  syncPlayerCounts(players);

  room.tribute.pendingGives.splice(pendingGiveIndex, 1);
  room.tribute.resolvedGives.push({
    fromPlayerId: pendingGive.fromPlayerId,
    toPlayerId: pendingGive.toPlayerId || null,
    card: movedCard,
  });

  room.tribute.revealedActions.push({
    kind: 'tribute',
    fromPlayerId: pendingGive.fromPlayerId,
    toPlayerId: null,
    card: movedCard,
  });

  if (room.tribute.pendingGives.length > 0) {
    room.currentTurn = -1;
    room.tribute.fromPlayer = null;
    room.tribute.toPlayer = null;
    room.tribute.cards = [];
    return { completed: false };
  }

  resolveTributeAssignments(room, players, {
    mode: room.tribute.mode,
    givers: room.tribute.giverOrder || [],
    receivers: room.tribute.receiverOrder || [],
  });

  return { completed: true };
}

function applyReturnTribute(room, players, action) {
  if (!room.tribute || room.gamePhase !== 'tributing' || room.tribute.phase !== 'returning') {
    throw new Error('Room is not currently returning tribute');
  }

  const pendingReturn = room.tribute.pendingReturns[0];
  if (!pendingReturn) {
    throw new Error('No pending return tribute action');
  }

  if (pendingReturn.fromPlayerId !== action.fromPlayerId) {
    throw new Error('Only the active return player may return tribute');
  }

  const returner = getPlayer(players, pendingReturn.fromPlayerId);
  const receiver = getPlayer(players, pendingReturn.toPlayerId);
  const card = returner.hand.find((candidate) => candidate.id === action.cardId);

  if (!card) {
    throw new Error('Return tribute card not found in hand');
  }

  if (!validateReturnTributeCard(card)) {
    throw new Error('Return tribute card must be rank 10 or lower');
  }

  const movedCard = removeCardFromHand(returner, action.cardId);
  addCardToHand(receiver, movedCard);
  syncPlayerCounts(players);

  room.tribute.pendingReturns.shift();
  room.tribute.resolvedReturns.push({
    fromPlayerId: pendingReturn.fromPlayerId,
    toPlayerId: pendingReturn.toPlayerId,
    card: movedCard,
  });
  room.tribute.revealedActions.push({
    kind: 'return',
    fromPlayerId: pendingReturn.fromPlayerId,
    toPlayerId: pendingReturn.toPlayerId,
    card: movedCard,
  });

  if (room.tribute.pendingReturns.length === 0) {
    room.gamePhase = 'playing';
    room.currentTurn = getPlayerIndex(players, room.tribute.leadPlayerId);
    room.tribute = null;
    return { completed: true };
  }

  room.currentTurn = getPlayerIndex(players, room.tribute.pendingReturns[0].fromPlayerId);
  return { completed: false };
}

module.exports = {
  beginTributeRound,
  applyTribute,
  applyReturnTribute,
};
