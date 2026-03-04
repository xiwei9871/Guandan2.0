const ROOM_ID_MAX_LENGTH = 10;
const PLAYER_NAME_MAX_LENGTH = 20;

function normalizeRoomId(roomId, maxLength = ROOM_ID_MAX_LENGTH) {
  return String(roomId || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);
}

function validateRoomId(roomId) {
  const value = normalizeRoomId(roomId);
  if (!value) {
    return { ok: false, error: '房间号无效' };
  }

  return { ok: true, value };
}

function validatePlayerName(playerName, maxLength = PLAYER_NAME_MAX_LENGTH) {
  const value = String(playerName || '').trim();
  if (!value) {
    return { ok: false, error: '玩家名称不能为空' };
  }

  if (value.length > maxLength) {
    return { ok: false, error: `玩家名称不能超过${maxLength}个字符` };
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return { ok: false, error: '玩家名称包含非法字符' };
  }

  return { ok: true, value };
}

function createRateLimiter(options) {
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const buckets = new Map();

  return {
    consume(subject, eventName) {
      const key = `${subject}:${eventName}`;
      const currentTime = now();
      const existing = buckets.get(key);

      if (!existing || currentTime - existing.startedAt >= options.windowMs) {
        buckets.set(key, { startedAt: currentTime, count: 1 });
        return {
          allowed: true,
          retryAfterMs: 0,
          remaining: options.max - 1,
        };
      }

      if (existing.count >= options.max) {
        return {
          allowed: false,
          retryAfterMs: options.windowMs - (currentTime - existing.startedAt),
          remaining: 0,
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: options.max - existing.count,
      };
    },
  };
}

module.exports = {
  ROOM_ID_MAX_LENGTH,
  PLAYER_NAME_MAX_LENGTH,
  normalizeRoomId,
  validateRoomId,
  validatePlayerName,
  createRateLimiter,
};
