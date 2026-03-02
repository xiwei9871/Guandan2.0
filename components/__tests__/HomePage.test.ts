import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPush = jest.fn();

describe('HomePage text', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders the main Chinese labels without mojibake', () => {
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

    expect(html).toContain('掼蛋在线');
    expect(html).toContain('已连接到服务器');
    expect(html).toContain('创建房间');
    expect(html).toContain('加入房间');
  });
});
