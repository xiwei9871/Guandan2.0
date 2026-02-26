import { CardType, type Card, type Player } from './types.js';

// 简单类型验证
const testCard: Card = {
  id: 'test-1',
  suit: 'hearts',
  rank: 2,
  levelCard: true,
  isWildcard: true,
};

const testPlayer: Player = {
  id: 'player-1',
  name: 'Test',
  position: 'south',
  team: 'red',
  hand: [testCard],
  isReady: false,
  cardsRemaining: 27,
};

console.log('Types validated successfully');
