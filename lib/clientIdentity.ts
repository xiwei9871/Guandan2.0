const PLAYER_CLIENT_ID_KEY = 'playerClientId';
const PLAYER_NAME_KEY = 'playerName';

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreatePlayerClientId(): string {
  const storage = getSessionStorage();
  const storedClientId = storage?.getItem(PLAYER_CLIENT_ID_KEY) || null;

  if (storedClientId) {
    return storedClientId;
  }

  const clientId = generateClientId();
  storage?.setItem(PLAYER_CLIENT_ID_KEY, clientId);

  return clientId;
}

function getSessionStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  return sessionStorage;
}

export function getStoredPlayerName(): string | null {
  return getSessionStorage()?.getItem(PLAYER_NAME_KEY) || null;
}

export function setStoredPlayerName(playerName: string): void {
  getSessionStorage()?.setItem(PLAYER_NAME_KEY, playerName);
}

export function clearStoredPlayerName(): void {
  getSessionStorage()?.removeItem(PLAYER_NAME_KEY);
}
