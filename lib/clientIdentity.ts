const PLAYER_CLIENT_ID_KEY = 'playerClientId';

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreatePlayerClientId(): string {
  const storedClientId = localStorage.getItem(PLAYER_CLIENT_ID_KEY);

  if (storedClientId) {
    return storedClientId;
  }

  const clientId = generateClientId();
  localStorage.setItem(PLAYER_CLIENT_ID_KEY, clientId);

  return clientId;
}
