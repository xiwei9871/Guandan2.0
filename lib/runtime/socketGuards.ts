export const ROOM_ID_MAX_LENGTH = 10;
export const PLAYER_NAME_MAX_LENGTH = 20;

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = { ok: false; error: string };

export function normalizeRoomId(roomId: unknown, maxLength = ROOM_ID_MAX_LENGTH): string {
  return String(roomId || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);
}

export function validateRoomId(roomId: unknown): ValidationSuccess<string> | ValidationFailure {
  const value = normalizeRoomId(roomId);
  if (!value) {
    return { ok: false, error: '房间号无效' };
  }

  return { ok: true, value };
}

export function validatePlayerName(
  playerName: unknown,
  maxLength = PLAYER_NAME_MAX_LENGTH
): ValidationSuccess<string> | ValidationFailure {
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

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

interface RateBucket {
  startedAt: number;
  count: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const buckets = new Map<string, RateBucket>();

  return {
    consume(subject: string, eventName: string) {
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
