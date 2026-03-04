import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const ORIGINAL_ENV = process.env;

function loadNetworkConfig(overrides: Record<string, string | undefined> = {}) {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    ...overrides,
  };

  return require('../networkConfig');
}

describe('network runtime config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.APP_ORIGIN;
    delete process.env.SOCKET_CORS_ORIGINS;
    delete process.env.NEXT_PUBLIC_SOCKET_URL;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to localhost:3003 in development', () => {
    const { getNetworkConfig } = loadNetworkConfig({
      NODE_ENV: 'development',
    });

    expect(getNetworkConfig()).toMatchObject({
      host: 'localhost',
      port: 3003,
      appOrigin: 'http://localhost:3003',
      socketCorsOrigins: ['http://localhost:3003'],
      useSameOriginSocket: false,
      clientSocketUrl: 'http://localhost:3003',
    });
  });

  it('defaults to same-origin socket mode in production', () => {
    const { getNetworkConfig } = loadNetworkConfig({
      NODE_ENV: 'production',
    });

    expect(getNetworkConfig()).toMatchObject({
      host: '0.0.0.0',
      port: 3003,
      appOrigin: null,
      socketCorsOrigins: [],
      useSameOriginSocket: true,
      clientSocketUrl: null,
    });
  });

  it('allows host, port, and origin overrides from the environment', () => {
    const { getNetworkConfig } = loadNetworkConfig({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '4100',
      APP_ORIGIN: 'https://guandan.example.com',
    });

    expect(getNetworkConfig()).toMatchObject({
      host: '127.0.0.1',
      port: 4100,
      appOrigin: 'https://guandan.example.com',
      useSameOriginSocket: true,
      clientSocketUrl: null,
    });
  });

  it('parses comma-separated cors origins into a stable list', () => {
    const { getNetworkConfig } = loadNetworkConfig({
      NODE_ENV: 'production',
      SOCKET_CORS_ORIGINS: ' https://a.example.com,https://b.example.com , ,https://a.example.com ',
    });

    expect(getNetworkConfig().socketCorsOrigins).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });
});
