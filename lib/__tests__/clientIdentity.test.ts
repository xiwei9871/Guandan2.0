import { beforeEach, describe, expect, it } from '@jest/globals';

const {
  clearStoredPlayerName,
  getOrCreatePlayerClientId,
  getStoredPlayerName,
  setStoredPlayerName,
} = require('../clientIdentity');

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('client identity storage', () => {
  beforeEach(() => {
    global.sessionStorage = createStorageMock() as Storage;
    global.localStorage = createStorageMock() as Storage;
  });

  it('stores the stable client id in session storage instead of local storage', () => {
    const clientId = getOrCreatePlayerClientId();

    expect(global.sessionStorage.getItem('playerClientId')).toBe(clientId);
    expect(global.localStorage.getItem('playerClientId')).toBeNull();
    expect(getOrCreatePlayerClientId()).toBe(clientId);
  });

  it('stores the player name in session storage and clears it from there', () => {
    setStoredPlayerName('mq1');

    expect(getStoredPlayerName()).toBe('mq1');
    expect(global.localStorage.getItem('playerName')).toBeNull();

    clearStoredPlayerName();

    expect(getStoredPlayerName()).toBeNull();
  });
});
