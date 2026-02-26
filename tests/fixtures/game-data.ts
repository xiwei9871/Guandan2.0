// 玩家配置
export const PLAYERS = [
  { name: '张三', position: 'south', team: 'red' },
  { name: '李四', position: 'west', team: 'blue' },
  { name: '王五', position: 'north', team: 'red' },
  { name: '赵六', position: 'east', team: 'blue' }
];

// 测试用牌型（简化版）
export const TEST_PLAYS = {
  single: { type: 'single', rank: 5, description: '单张5' },
  pair: { type: 'pair', rank: 8, description: '对子8' },
  triple: { type: 'triple', rank: 10, description: '三张10' },
  bomb: { type: 'bomb', rank: 2, description: '炸弹2' }
};

// 超时配置
export const TIMEOUTS = {
  SOCKET_CONNECT: 5000,
  ROOM_CREATE: 3000,
  JOIN_ROOM: 3000,
  GAME_START: 5000,
  CARD_PLAY: 3000,
  GAME_END: 3000
};

// 房间配置
export const ROOM_CONFIG = {
  MAX_PLAYERS: 4,
  READY_WAIT_TIME: 2000,
  CARDS_PER_PLAYER: 27
};
