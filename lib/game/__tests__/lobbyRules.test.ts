import { describe, expect, it } from '@jest/globals';
import { isRoomOwner, resolveRoomOwnerId } from '../lobbyRules';

describe('lobby owner rules', () => {
  it('allows only the room owner to start the game', () => {
    expect(isRoomOwner('owner-1', 'owner-1')).toBe(true);
    expect(isRoomOwner('owner-1', 'guest-2')).toBe(false);
    expect(isRoomOwner(null, 'guest-2')).toBe(false);
  });

  it('transfers owner to the first remaining player when the owner leaves', () => {
    expect(
      resolveRoomOwnerId('owner-1', [
        { id: 'guest-2' },
        { id: 'guest-3' },
      ])
    ).toBe('guest-2');

    expect(resolveRoomOwnerId('owner-1', [])).toBeNull();
  });

  it('keeps ownership tied to a stable client id instead of a transient socket id', () => {
    expect(
      resolveRoomOwnerId('owner-client', [
        { id: 'socket-2', clientId: 'owner-client' },
        { id: 'socket-3', clientId: 'guest-client' },
      ])
    ).toBe('owner-client');
  });
});
