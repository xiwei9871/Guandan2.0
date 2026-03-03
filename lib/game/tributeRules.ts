import type { Card, Player } from '../types';

export type TributeMode = 'double' | 'single' | 'inner';

export interface TributeModeResult {
  mode: TributeMode;
  givers: string[];
  receivers: string[];
}

export interface TributeGive {
  fromPlayerId: string;
  toPlayerId?: string | null;
  card?: Card | null;
}

export interface TributeReturn {
  fromPlayerId: string;
  toPlayerId: string;
}

export interface TributePlan {
  gives: TributeGive[];
  returns: TributeReturn[];
}

export interface RevealedTributeAction {
  kind: 'tribute' | 'return';
  fromPlayerId: string;
  toPlayerId?: string | null;
  card: Card;
}

function getRankedPlayers(players: Player[]) {
  return [...players]
    .filter((player): player is Player & { rank: NonNullable<Player['rank']> } => player.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);
}

function compareCardsDescending(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return b.rank - a.rank;
  }

  const suitOrder: Record<Card['suit'], number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
  };

  return suitOrder[a.suit] - suitOrder[b.suit];
}

function getTributeCardStrength(card: Card): [number, number, number] {
  if (card.rank === 15) {
    return [3, card.suit === 'spades' ? 2 : 1, 0];
  }

  if (card.levelCard && card.suit !== 'hearts') {
    const suitOrder: Record<Card['suit'], number> = {
      spades: 4,
      clubs: 3,
      diamonds: 2,
      hearts: 1,
    };

    return [2, suitOrder[card.suit], 0];
  }

  const suitOrder: Record<Card['suit'], number> = {
    spades: 4,
    hearts: 3,
    clubs: 2,
    diamonds: 1,
  };

  return [1, card.rank, suitOrder[card.suit]];
}

export function compareTributeCardsDescending(a: Card, b: Card): number {
  const strengthA = getTributeCardStrength(a);
  const strengthB = getTributeCardStrength(b);

  for (let index = 0; index < strengthA.length; index += 1) {
    if (strengthA[index] !== strengthB[index]) {
      return strengthB[index] - strengthA[index];
    }
  }

  return 0;
}

function isBigJoker(card: Card): boolean {
  return card.rank === 15 && card.suit === 'spades';
}

function getJokerCounts(players: Player[]) {
  return players.map((player) => ({
    playerId: player.id,
    totalJokers: player.hand.filter((card) => card.rank === 15).length,
    bigJokers: player.hand.filter(isBigJoker).length,
  }));
}

export function getTributeMode(players: Player[]): TributeModeResult {
  const ranked = getRankedPlayers(players);
  if (ranked.length !== 4) {
    throw new Error('Tribute mode requires four ranked players');
  }

  const first = ranked[0];
  const second = ranked[1];
  const last = ranked[3];

  if (first.team === second.team) {
    return {
      mode: 'double',
      givers: [ranked[2].id, ranked[3].id],
      receivers: [ranked[0].id, ranked[1].id],
    };
  }

  if (first.team === last.team) {
    return {
      mode: 'inner',
      givers: [ranked[3].id],
      receivers: [ranked[0].id],
    };
  }

  return {
    mode: 'single',
    givers: [ranked[3].id],
    receivers: [ranked[0].id],
  };
}

export function detectAntiTribute(mode: TributeMode, losingPlayers: Player[]): boolean {
  const jokerCounts = getJokerCounts(losingPlayers);

  if (mode === 'double') {
    if (jokerCounts.some((entry) => entry.totalJokers >= 2)) {
      return true;
    }

    return jokerCounts.filter((entry) => entry.bigJokers >= 1).length >= 2;
  }

  return jokerCounts.some((entry) => entry.totalJokers >= 2);
}

export function getEligibleTributeCard(hand: Card[], currentLevel?: number): Card {
  void currentLevel;
  const eligibleCards = [...hand]
    .filter((card) => !(card.suit === 'hearts' && card.levelCard))
    .sort(compareTributeCardsDescending);

  if (eligibleCards.length === 0) {
    throw new Error('No eligible tribute card available');
  }

  return eligibleCards[0];
}

export function getEligibleTributeRank(hand: Card[], currentLevel?: number): number {
  return getEligibleTributeCard(hand, currentLevel).rank;
}

export function validateTributeCard(hand: Card[], selectedCard: Card, currentLevel?: number): boolean {
  if (selectedCard.suit === 'hearts' && selectedCard.levelCard) {
    return false;
  }

  const selectedInHand = hand.some((card) => card.id === selectedCard.id);
  if (!selectedInHand) {
    return false;
  }

  const highestEligibleCard = getEligibleTributeCard(hand, currentLevel);

  if (selectedCard.levelCard && selectedCard.suit !== 'hearts') {
    return highestEligibleCard.levelCard && highestEligibleCard.suit !== 'hearts';
  }

  return (
    !selectedCard.levelCard &&
    selectedCard.rank === highestEligibleCard.rank &&
    !highestEligibleCard.levelCard
  );
}

export function buildTributePlan(
  players: Player[],
  tributeMode: TributeModeResult,
  currentLevel: number
): TributePlan {
  void currentLevel;

  const playerById = new Map(players.map((player) => [player.id, player]));
  const candidateGives = tributeMode.givers.map((giverId) => {
    const giver = playerById.get(giverId);
    if (!giver) {
      throw new Error(`Missing tribute giver: ${giverId}`);
    }

    return {
      fromPlayerId: giver.id,
      card: getEligibleTributeCard(giver.hand, currentLevel),
    };
  });

  let gives: TributeGive[];

  if (tributeMode.mode === 'double') {
    const sortedByCard = [...candidateGives].sort((a, b) => compareTributeCardsDescending(a.card, b.card));
    gives = [
      {
        fromPlayerId: sortedByCard[0].fromPlayerId,
        toPlayerId: tributeMode.receivers[0],
        card: sortedByCard[0].card,
      },
      {
        fromPlayerId: sortedByCard[1].fromPlayerId,
        toPlayerId: tributeMode.receivers[1],
        card: sortedByCard[1].card,
      },
    ];
  } else {
    gives = [
      {
        fromPlayerId: candidateGives[0].fromPlayerId,
        toPlayerId: tributeMode.receivers[0],
        card: candidateGives[0].card,
      },
    ];
  }

  const returns: TributeReturn[] = gives.map((give) => {
    if (!give.toPlayerId) {
      throw new Error('Tribute plan requires a receiver before building return actions');
    }

    return {
      fromPlayerId: give.toPlayerId,
      toPlayerId: give.fromPlayerId,
    };
  });

  return { gives, returns };
}

export function validateReturnTributeCard(card: Card): boolean {
  return card.rank <= 10;
}

export function compareTributeSelections(
  selections: Array<{ fromPlayerId: string; card: Card }>,
  giverOrder: string[]
) {
  const orderIndex = new Map(giverOrder.map((playerId, index) => [playerId, index]));

  return [...selections].sort((a, b) => {
    const cardComparison = compareTributeCardsDescending(a.card, b.card);
    if (cardComparison !== 0) {
      return cardComparison;
    }

    return (orderIndex.get(a.fromPlayerId) ?? 0) - (orderIndex.get(b.fromPlayerId) ?? 0);
  });
}
