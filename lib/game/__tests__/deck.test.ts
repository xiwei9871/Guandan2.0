import { describe, it, expect } from '@jest/globals';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  setLevelCards,
  sortHand,
} from '../deck';

describe('Deck Management', () => {
  describe('createDeck', () => {
    it('should create 108 cards for 2 decks', () => {
      const deck = createDeck(2);
      expect(deck.length).toBe(108);
    });

    it('should create correct number of cards for variable decks', () => {
      const oneDeck = createDeck(1);
      expect(oneDeck.length).toBe(54);

      const threeDecks = createDeck(3);
      expect(threeDecks.length).toBe(162);
    });

    it('should have unique card IDs', () => {
      const deck = createDeck(2);
      const ids = new Set(deck.map(card => card.id));
      expect(ids.size).toBe(108);
    });

    it('should contain all suits and ranks', () => {
      const deck = createDeck(1);
      const suits = new Set(deck.map(card => card.suit));
      const ranks = new Set(deck.map(card => card.rank));

      expect(suits.has('spades')).toBe(true);
      expect(suits.has('hearts')).toBe(true);
      expect(suits.has('diamonds')).toBe(true);
      expect(suits.has('clubs')).toBe(true);

      for (let rank = 1; rank <= 13; rank++) {
        expect(ranks.has(rank)).toBe(true);
      }
    });

    it('should have exactly 2 jokers per deck', () => {
      const deck = createDeck(2);
      const jokers = deck.filter(card => card.rank === 14);
      expect(jokers.length).toBe(4); // 2 decks × 2 jokers
    });
  });

  describe('shuffleDeck', () => {
    it('should shuffle deck and maintain same cards', () => {
      const deck = createDeck(2);
      const shuffled = shuffleDeck(deck);

      expect(shuffled.length).toBe(deck.length);

      const deckIds = new Set(deck.map(card => card.id));
      const shuffledIds = new Set(shuffled.map(card => card.id));

      expect(deckIds).toEqual(shuffledIds);
    });

    it('should create different order on shuffle', () => {
      const deck = createDeck(2);
      const shuffled1 = shuffleDeck(deck);
      const shuffled2 = shuffleDeck(deck);

      // 极小概率会相同，但实际测试中应该不同
      const isDifferent = shuffled1.some((card, index) => card.id !== shuffled2[index].id);
      expect(isDifferent).toBe(true);
    });

    it('should not mutate original deck', () => {
      const deck = createDeck(2);
      const originalFirstCard = deck[0];
      shuffleDeck(deck);

      expect(deck[0]).toEqual(originalFirstCard);
    });
  });

  describe('dealCards', () => {
    it('should deal 27 cards to 4 players', () => {
      const deck = createDeck(2);
      const hands = dealCards(deck, 4, 27);

      expect(hands.length).toBe(4);
      expect(hands.every(hand => hand.length === 27)).toBe(true);
    });

    it('should deal all cards when total equals deck size', () => {
      const deck = createDeck(2);
      const hands = dealCards(deck, 4, 27);

      const totalDealt = hands.reduce((sum, hand) => sum + hand.length, 0);
      expect(totalDealt).toBe(108);
    });

    it('should not duplicate cards across hands', () => {
      const deck = createDeck(2);
      const hands = dealCards(deck, 4, 27);

      const allDealtCards = hands.flat();
      const cardIds = new Set(allDealtCards.map(card => card.id));

      expect(cardIds.size).toBe(108);
    });

    it('should throw error if not enough cards', () => {
      const deck = createDeck(1); // Only 54 cards

      expect(() => dealCards(deck, 4, 27)).toThrow('Not enough cards to deal');
    });
  });

  describe('setLevelCards', () => {
    it('should mark level cards correctly', () => {
      const cards = createDeck(1);
      const levelCards = setLevelCards(cards, 5);

      const fives = levelCards.filter(card => card.rank === 5);
      expect(fives.every(card => card.levelCard)).toBe(true);
      expect(fives.length).toBe(4); // 4 per deck
    });

    it('should mark only level cards as level cards', () => {
      const cards = createDeck(1);
      const levelCards = setLevelCards(cards, 10);

      const tens = levelCards.filter(card => card.rank === 10);
      const others = levelCards.filter(card => card.rank !== 10);

      expect(tens.every(card => card.levelCard)).toBe(true);
      expect(others.every(card => !card.levelCard)).toBe(true);
    });

    it('should mark heart level cards as wildcards', () => {
      const cards = createDeck(1);
      const levelCards = setLevelCards(cards, 7);

      const heartSevens = levelCards.filter(
        card => card.rank === 7 && card.suit === 'hearts'
      );

      expect(heartSevens.length).toBe(1);
      expect(heartSevens[0].isWildcard).toBe(true);
      expect(heartSevens[0].levelCard).toBe(true);
    });

    it('should not mark non-heart level cards as wildcards', () => {
      const cards = createDeck(1);
      const levelCards = setLevelCards(cards, 3);

      const nonHeartThrees = levelCards.filter(
        card => card.rank === 3 && card.suit !== 'hearts'
      );

      expect(nonHeartThrees.every(card => !card.isWildcard)).toBe(true);
      expect(nonHeartThrees.every(card => card.levelCard)).toBe(true);
    });

    it('should handle Ace as level (14)', () => {
      const cards = createDeck(1);
      const levelCards = setLevelCards(cards, 14);

      const aces = levelCards.filter(card => card.rank === 14);
      expect(aces.length).toBe(2); // Only jokers have rank 14
      expect(aces.filter(card => !card.levelCard).length).toBe(0);
    });
  });

  describe('sortHand', () => {
    it('should sort cards by suit and rank', () => {
      const hand = [
        { id: '1', suit: 'clubs', rank: 5, levelCard: false, isWildcard: false },
        { id: '2', suit: 'spades', rank: 3, levelCard: false, isWildcard: false },
        { id: '3', suit: 'hearts', rank: 10, levelCard: false, isWildcard: false },
        { id: '4', suit: 'diamonds', rank: 7, levelCard: false, isWildcard: false },
      ];

      const sorted = sortHand(hand);

      expect(sorted[0].suit).toBe('spades');
      expect(sorted[1].suit).toBe('hearts');
      expect(sorted[2].suit).toBe('diamonds');
      expect(sorted[3].suit).toBe('clubs');
    });

    it('should sort cards of same suit by descending rank', () => {
      const hand = [
        { id: '1', suit: 'spades', rank: 5, levelCard: false, isWildcard: false },
        { id: '2', suit: 'spades', rank: 13, levelCard: false, isWildcard: false },
        { id: '3', suit: 'spades', rank: 2, levelCard: false, isWildcard: false },
      ];

      const sorted = sortHand(hand);

      expect(sorted[0].rank).toBe(13);
      expect(sorted[1].rank).toBe(5);
      expect(sorted[2].rank).toBe(2);
    });

    it('should not mutate original hand', () => {
      const hand = [
        { id: '1', suit: 'clubs', rank: 5, levelCard: false, isWildcard: false },
        { id: '2', suit: 'spades', rank: 3, levelCard: false, isWildcard: false },
      ];

      const originalFirst = hand[0];
      sortHand(hand);

      expect(hand[0]).toEqual(originalFirst);
    });
  });
});
