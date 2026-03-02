function getCardsRemaining(player) {
  if (typeof player.cardsRemaining === 'number') {
    return player.cardsRemaining;
  }

  if (Array.isArray(player.hand)) {
    return player.hand.length;
  }

  return 0;
}

function getRankedPlayers(players) {
  return players.filter((player) => player.rank !== undefined);
}

function getNextRank(players) {
  return getRankedPlayers(players).length + 1;
}

function getNextActivePlayerIndex(players, currentIndex) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const nextIndex = (currentIndex + offset) % players.length;
    if (getCardsRemaining(players[nextIndex]) > 0) {
      return nextIndex;
    }
  }

  return currentIndex;
}

function getPartnerIndex(players, playerIndex) {
  const player = players[playerIndex];
  if (!player || !player.team) {
    return -1;
  }

  return players.findIndex(
    (candidate, index) => index !== playerIndex && candidate.team === player.team
  );
}

function getNextTurnIndex(players, currentIndex, lastPlayPlayer, roundComplete = false) {
  const fallback = getNextActivePlayerIndex(players, currentIndex);

  if (!roundComplete) {
    return fallback;
  }

  if (lastPlayPlayer === null || lastPlayPlayer === undefined) {
    return fallback;
  }

  const leadPlayer = players[lastPlayPlayer];
  if (!leadPlayer || getCardsRemaining(leadPlayer) > 0) {
    return fallback;
  }

  const partnerIndex = getPartnerIndex(players, lastPlayPlayer);
  if (partnerIndex < 0 || getCardsRemaining(players[partnerIndex]) === 0) {
    return fallback;
  }

  return partnerIndex;
}

function shouldRequireBeat({ lastPlay, lastPlayPlayer, playerIndex, roundComplete = false }) {
  if (!lastPlay) {
    return false;
  }

  if (lastPlayPlayer === null || lastPlayPlayer === undefined) {
    return false;
  }

  if (lastPlayPlayer === playerIndex) {
    return false;
  }

  return !roundComplete;
}

function assignRankIfOut(players, playerIndex) {
  const player = players[playerIndex];
  if (!player || player.rank !== undefined || getCardsRemaining(player) > 0) {
    return null;
  }

  const rank = getNextRank(players);
  player.rank = rank;
  return rank;
}

function completeLastRank(players) {
  const remainingPlayers = players.filter((player) => player.rank === undefined);
  if (remainingPlayers.length === 1) {
    remainingPlayers[0].rank = getNextRank(players);
  }
}

function calculateNextLevel(currentLevel, levelChange) {
  return Math.max(2, Math.min(14, currentLevel + levelChange));
}

function calculateSettlement(players) {
  const rankedPlayers = [...players]
    .filter((player) => player.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);

  if (rankedPlayers.length < 4) {
    throw new Error('Settlement requires four ranked players');
  }

  const redRanks = rankedPlayers.filter((player) => player.team === 'red').map((player) => player.rank);
  const blueRanks = rankedPlayers.filter((player) => player.team === 'blue').map((player) => player.rank);

  const firstPlace = rankedPlayers[0];
  const secondPlace = rankedPlayers[1];
  const thirdPlace = rankedPlayers[2];
  const lastPlace = rankedPlayers[3];

  let winner;
  let levelChange = 0;

  if (firstPlace.team === lastPlace.team) {
    winner = firstPlace.team === 'red' ? 'blue' : 'red';
    levelChange = 0;
  } else {
    winner = firstPlace.team;

    if (secondPlace.team === firstPlace.team) {
      levelChange = 3;
    } else if (thirdPlace.team === firstPlace.team) {
      levelChange = 2;
    } else {
      levelChange = 1;
    }
  }

  return { winner, levelChange, redRanks, blueRanks };
}

function applyRankingAndSettlement(room, players, playerIndex) {
  assignRankIfOut(players, playerIndex);

  const rankedCount = getRankedPlayers(players).length;
  if (rankedCount >= 3) {
    completeLastRank(players);
    const settlement = calculateSettlement(players);

    room.gamePhase = 'finished';
    room.status = 'finished';
    room.lastPlay = null;
    room.lastPlayPlayer = null;
    room.currentLevel = calculateNextLevel(room.currentLevel || 2, settlement.levelChange);
    room.result = settlement;

    return {
      finished: true,
      settlement,
    };
  }

  const currentPlayer = players[playerIndex];
  return {
    finished: false,
    settlement: null,
  };
}

module.exports = {
  getCardsRemaining,
  getNextActivePlayerIndex,
  getNextTurnIndex,
  shouldRequireBeat,
  assignRankIfOut,
  calculateSettlement,
  calculateNextLevel,
  applyRankingAndSettlement,
};
