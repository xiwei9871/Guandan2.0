import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPush = jest.fn();

function renderHomePage(options?: { createdRoomId?: string }) {
  const mockUseState = jest
    .fn()
    .mockImplementationOnce(() => ['', jest.fn()])
    .mockImplementationOnce(() => ['', jest.fn()])
    .mockImplementationOnce(() => ['', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()])
    .mockImplementationOnce(() => [options?.createdRoomId || '', jest.fn()]);

  jest.doMock('react', () => {
    const actual = jest.requireActual('react');
    return {
      __esModule: true,
      ...actual,
      useState: mockUseState,
    };
  });

  jest.doMock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
  }));

  jest.doMock('@/hooks/useSocket', () => ({
    useSocket: () => ({ socket: null, isConnected: true }),
  }));

  let html = '';

  jest.isolateModules(() => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const HomePage = require('../HomePage').default;

    html = renderToStaticMarkup(React.createElement(HomePage));
  });

  return html;
}

describe('HomePage text', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders the main Chinese labels without mojibake', () => {
    const html = renderHomePage();

    expect(html).toContain('掼蛋在线');
    expect(html).toContain('已连接到服务器');
    expect(html).toContain('创建房间');
    expect(html).toContain('加入房间');
  });

  it('shows a room share hint after a room has been created', () => {
    const html = renderHomePage({ createdRoomId: 'ROOM42' });

    expect(html).toContain('data-testid="created-room-share"');
    expect(html).toContain('/room/ROOM42');
  });
});
