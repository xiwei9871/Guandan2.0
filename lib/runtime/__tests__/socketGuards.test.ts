import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const ORIGINAL_ENV = process.env;

function loadSocketGuards() {
  jest.resetModules();
  return require('../socketGuards');
}

describe('socket guards', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes valid room ids and rejects empty ones', () => {
    const { normalizeRoomId, validateRoomId } = loadSocketGuards();

    expect(normalizeRoomId(' room-42 ')).toBe('ROOM42');
    expect(validateRoomId(' room-42 ')).toEqual({ ok: true, value: 'ROOM42' });
    expect(validateRoomId('!!!')).toEqual({ ok: false, error: '房间号无效' });
  });

  it('rejects empty or malformed player names', () => {
    const { validatePlayerName } = loadSocketGuards();

    expect(validatePlayerName('  ')).toEqual({ ok: false, error: '玩家名称不能为空' });
    expect(validatePlayerName('alice\nbob')).toEqual({ ok: false, error: '玩家名称包含非法字符' });
    expect(validatePlayerName('  掼蛋玩家  ')).toEqual({ ok: true, value: '掼蛋玩家' });
  });

  it('rate limits repeated room-entry attempts from the same socket and event', () => {
    let nowValue = 1000;
    const { createRateLimiter } = loadSocketGuards();
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      now: () => nowValue,
    });

    expect(limiter.consume('socket-1', 'room:create').allowed).toBe(true);
    expect(limiter.consume('socket-1', 'room:create').allowed).toBe(true);
    expect(limiter.consume('socket-1', 'room:create')).toMatchObject({
      allowed: false,
      retryAfterMs: 1000,
    });

    nowValue += 1001;

    expect(limiter.consume('socket-1', 'room:create').allowed).toBe(true);
    expect(limiter.consume('socket-1', 'room:join').allowed).toBe(true);
  });
});
