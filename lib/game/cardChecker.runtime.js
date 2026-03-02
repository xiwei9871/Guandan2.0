const TYPE = {
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  TRIPLE_WITH_PAIR: 'triple_with_pair',
  STRAIGHT: 'straight',
  PAIR_STRAIGHT: 'pair_straight',
  TRIPLE_STRAIGHT: 'triple_straight',
  BOMB: 'bomb',
  STRAIGHT_FLUSH: 'straight_flush',
  ROCKET: 'rocket',
};

const STRAIGHT_STARTS = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PAIR_STRAIGHT_STARTS = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TRIPLE_STRAIGHT_STARTS = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const NORMAL_POINTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const DEFAULT_ORDER = [
  TYPE.ROCKET,
  TYPE.BOMB,
  TYPE.STRAIGHT_FLUSH,
  TYPE.TRIPLE_WITH_PAIR,
  TYPE.PAIR_STRAIGHT,
  TYPE.TRIPLE_STRAIGHT,
  TYPE.STRAIGHT,
  TYPE.TRIPLE,
  TYPE.PAIR,
  TYPE.SINGLE,
];
const MIN_BOMB_SIZE = 4;
const MAX_BOMB_SIZE = 10;

function nextPoint(point) {
  if (point === 14) return 2;
  if (point === 13) return 14;
  return point + 1;
}

function isJoker(card) {
  return card.rank === 15;
}

function getPoint(card) {
  if (!isJoker(card)) return card.rank;
  return card.suit === 'spades' ? 17 : 16;
}

function pointWeight(point, currentLevel) {
  if (point === 17) return 1000;
  if (point === 16) return 900;
  if (point === currentLevel) return 800;
  return point;
}

function sequenceWeight(point) {
  return point;
}

function buildRun(start, count) {
  const run = [start];
  let current = start;
  for (let i = 1; i < count; i += 1) {
    current = nextPoint(current);
    run.push(current);
  }
  return run;
}

function groupByPoint(cards) {
  const map = new Map();
  for (const card of cards) {
    const point = getPoint(card);
    map.set(point, (map.get(point) || 0) + 1);
  }
  return map;
}

function hasWildcards(cards) {
  return cards.some((card) => card.isWildcard);
}

function getWildcards(cards) {
  return cards.filter((card) => card.isWildcard);
}

function getFixedCards(cards) {
  return cards.filter((card) => !card.isWildcard);
}

function detectSingle(cards) {
  if (cards.length !== 1) return null;
  return { type: TYPE.SINGLE, mainRank: getPoint(cards[0]), valid: true };
}

function detectUniform(cards, expectedLength, type) {
  if (cards.length !== expectedLength) return null;

  const wildcards = getWildcards(cards);
  const fixedCards = getFixedCards(cards);

  if (fixedCards.length === 0) {
    return {
      type,
      mainRank: getPoint(cards[0]),
      valid: true,
    };
  }

  const fixedPoints = [...new Set(fixedCards.map(getPoint))];
  if (fixedPoints.length !== 1) {
    return null;
  }

  const targetPoint = fixedPoints[0];
  if (wildcards.length > 0 && targetPoint > 14) {
    return null;
  }

  return { type, mainRank: targetPoint, valid: true };
}

function detectBomb(cards) {
  if (cards.length < MIN_BOMB_SIZE || cards.length > MAX_BOMB_SIZE) return null;
  return detectUniform(cards, cards.length, TYPE.BOMB);
}

function detectPair(cards) {
  return detectUniform(cards, 2, TYPE.PAIR);
}

function detectTriple(cards) {
  return detectUniform(cards, 3, TYPE.TRIPLE);
}

function detectTripleWithPair(cards) {
  if (cards.length !== 5) return null;

  const wildcards = getWildcards(cards);
  const fixedCards = getFixedCards(cards);
  const fixedPointMap = groupByPoint(fixedCards);

  if (wildcards.length > 0 && fixedCards.some((card) => isJoker(card))) {
    return null;
  }

  const fixedPoints = [...fixedPointMap.keys()].filter((point) => point <= 14);
  const candidatePoints = [...new Set([...NORMAL_POINTS, ...fixedPoints])];

  let best = null;

  for (const triplePoint of candidatePoints) {
    for (const pairPoint of candidatePoints) {
      if (triplePoint === pairPoint) {
        continue;
      }

      let valid = true;
      for (const point of fixedPointMap.keys()) {
        if (point !== triplePoint && point !== pairPoint) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        continue;
      }

      const tripleCount = fixedPointMap.get(triplePoint) || 0;
      const pairCount = fixedPointMap.get(pairPoint) || 0;
      if (tripleCount > 3 || pairCount > 2) {
        continue;
      }

      const needed = (3 - tripleCount) + (2 - pairCount);
      if (needed !== wildcards.length) {
        continue;
      }

      if (!best || triplePoint > best.mainRank) {
        best = {
          type: TYPE.TRIPLE_WITH_PAIR,
          mainRank: triplePoint,
          valid: true,
        };
      }
    }
  }

  return best;
}

function detectRun(cards, eachCount, starts, type, requireSameSuit = false) {
  const runLength = cards.length / eachCount;
  if (!Number.isInteger(runLength)) {
    return null;
  }

  const wildcards = getWildcards(cards);
  const fixedCards = getFixedCards(cards);

  if (fixedCards.some(isJoker)) {
    return null;
  }

  if (requireSameSuit) {
    const suits = new Set(fixedCards.map((card) => card.suit));
    if (suits.size > 1) {
      return null;
    }
  }

  const pointMap = new Map();
  for (const card of fixedCards) {
    pointMap.set(card.rank, (pointMap.get(card.rank) || 0) + 1);
  }

  let bestTop = null;

  for (const start of starts) {
    const run = buildRun(start, runLength);

    let valid = true;
    for (const point of pointMap.keys()) {
      if (!run.includes(point)) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      continue;
    }

    let missing = 0;
    for (const point of run) {
      const count = pointMap.get(point) || 0;
      if (count > eachCount) {
        valid = false;
        break;
      }
      missing += eachCount - count;
    }

    if (!valid || missing !== wildcards.length) {
      continue;
    }

    const top = run[run.length - 1];
    if (bestTop === null || sequenceWeight(top) > sequenceWeight(bestTop)) {
      bestTop = top;
    }
  }

  if (bestTop === null) {
    return null;
  }

  return {
    type,
    mainRank: bestTop,
    valid: true,
  };
}

function isFourJokers(cards) {
  if (cards.length !== 4) return false;
  if (!cards.every(isJoker)) return false;
  const spades = cards.filter((card) => card.suit === 'spades').length;
  const hearts = cards.filter((card) => card.suit === 'hearts').length;
  return spades === 2 && hearts === 2;
}

function getPossibleTypes(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return [];
  }

  if (isFourJokers(cards)) {
    return [{ type: TYPE.ROCKET, mainRank: 17, valid: true }];
  }

  const possible = [];
  const seen = new Set();

  function push(result) {
    if (!result || seen.has(result.type)) {
      return;
    }
    seen.add(result.type);
    possible.push(result);
  }

  if (cards.length === 1) {
    push(detectSingle(cards));
  }

  if (cards.length === 2) {
    push(detectPair(cards));
  }

  if (cards.length === 3) {
    push(detectTriple(cards));
  }

  if (cards.length >= MIN_BOMB_SIZE && cards.length <= MAX_BOMB_SIZE) {
    push(detectBomb(cards));
  }

  if (cards.length === 5) {
    push(detectTripleWithPair(cards));
    push(detectRun(cards, 1, STRAIGHT_STARTS, TYPE.STRAIGHT_FLUSH, true));
    push(detectRun(cards, 1, STRAIGHT_STARTS, TYPE.STRAIGHT, false));
  }

  if (cards.length === 6) {
    push(detectRun(cards, 2, PAIR_STRAIGHT_STARTS, TYPE.PAIR_STRAIGHT, false));
    push(detectRun(cards, 3, TRIPLE_STRAIGHT_STARTS, TYPE.TRIPLE_STRAIGHT, false));
  }

  return possible;
}

function detectCardType(cards, preferredType = null) {
  const possibleTypes = getPossibleTypes(cards);
  if (possibleTypes.length === 0) {
    return { type: null, mainRank: 0, valid: false };
  }

  const possibleMap = new Map(possibleTypes.map((result) => [result.type, result]));
  if (preferredType && possibleMap.has(preferredType)) {
    return possibleMap.get(preferredType);
  }

  for (const type of DEFAULT_ORDER) {
    if (possibleMap.has(type)) {
      return possibleMap.get(type);
    }
  }

  return { type: null, mainRank: 0, valid: false };
}

function compareSpecial(newType, newCards, lastType, lastCards, currentLevel) {
  if (newType.type === TYPE.ROCKET) return true;
  if (lastType.type === TYPE.ROCKET) return false;

  const newBomb = newType.type === TYPE.BOMB;
  const lastBomb = lastType.type === TYPE.BOMB;
  const newFlush = newType.type === TYPE.STRAIGHT_FLUSH;
  const lastFlush = lastType.type === TYPE.STRAIGHT_FLUSH;

  if (!newBomb && !lastBomb && !newFlush && !lastFlush) {
    return null;
  }

  if (newBomb && lastBomb) {
    if (newCards.length !== lastCards.length) {
      return newCards.length > lastCards.length;
    }
    return pointWeight(newType.mainRank, currentLevel) > pointWeight(lastType.mainRank, currentLevel);
  }

  if (newFlush && lastFlush) {
    return sequenceWeight(newType.mainRank) > sequenceWeight(lastType.mainRank);
  }

  if (newBomb && lastFlush) {
    return newCards.length >= 6;
  }

  if (newFlush && lastBomb) {
    return lastCards.length <= 5;
  }

  if (newBomb || newFlush) {
    return true;
  }

  return false;
}

function canBeat(newCards, lastPlay, currentLevel = 2) {
  const lastCards = lastPlay.cards || [];
  const lastType = detectCardType(lastCards, lastPlay.type || null);
  if (!lastType.valid) {
    return false;
  }

  const newTypes = getPossibleTypes(newCards);
  if (newTypes.length === 0) {
    return false;
  }

  for (const newType of newTypes) {
    const specialResult = compareSpecial(
      newType,
      newCards,
      lastType,
      lastCards,
      currentLevel
    );

    if (specialResult === true) {
      return true;
    }

    if (specialResult === false) {
      continue;
    }

    if (newType.type !== lastType.type) {
      continue;
    }

    if (newCards.length !== lastCards.length) {
      continue;
    }

    const sequenceTypes = new Set([
      TYPE.STRAIGHT,
      TYPE.PAIR_STRAIGHT,
      TYPE.TRIPLE_STRAIGHT,
      TYPE.STRAIGHT_FLUSH,
    ]);

    if (sequenceTypes.has(newType.type)) {
      if (sequenceWeight(newType.mainRank) > sequenceWeight(lastType.mainRank)) {
        return true;
      }
      continue;
    }

    if (pointWeight(newType.mainRank, currentLevel) > pointWeight(lastType.mainRank, currentLevel)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  TYPE,
  detectCardType,
  canBeat,
};
