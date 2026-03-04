export interface NetworkConfig {
  host: string;
  port: number;
  appOrigin: string | null;
  socketCorsOrigins: string[];
  useSameOriginSocket: boolean;
  clientSocketUrl: string | null;
}

const DEFAULT_PORT = 3003;

function normalizeOrigin(origin: string | undefined | null): string | null {
  const value = String(origin || '').trim();
  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, '');
}

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function parseOrigins(value: string | undefined): string[] {
  const seen = new Set<string>();

  String(value || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry))
    .forEach((entry) => {
      if (!seen.has(entry)) {
        seen.add(entry);
      }
    });

  return [...seen];
}

export function getNetworkConfig(env: NodeJS.ProcessEnv = process.env): NetworkConfig {
  const isProduction = env.NODE_ENV === 'production';
  const host = env.HOST || (isProduction ? '0.0.0.0' : 'localhost');
  const port = parsePort(env.PORT);
  const defaultOrigin = !isProduction ? `http://${host}:${port}` : null;
  const appOrigin = normalizeOrigin(env.APP_ORIGIN) || defaultOrigin;
  const explicitSocketUrl = normalizeOrigin(env.NEXT_PUBLIC_SOCKET_URL);
  const useSameOriginSocket = isProduction && !explicitSocketUrl;
  const clientSocketUrl = explicitSocketUrl || (useSameOriginSocket ? null : appOrigin);
  const parsedOrigins = parseOrigins(env.SOCKET_CORS_ORIGINS);
  const socketCorsOrigins = parsedOrigins.length > 0
    ? parsedOrigins
    : appOrigin
      ? [appOrigin]
      : [];

  return {
    host,
    port,
    appOrigin,
    socketCorsOrigins,
    useSameOriginSocket,
    clientSocketUrl,
  };
}
