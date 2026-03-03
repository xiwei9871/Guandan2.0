import { describe, expect, it } from '@jest/globals';

const samplePlayer = {
  id: 'p3',
  name: '北家',
  position: 'north' as const,
  team: 'red' as const,
  hand: [],
  isReady: true,
  cardsRemaining: 12,
};

const samplePlay = {
  playerId: 'p3',
  cards: [
    {
      id: 'card-1',
      suit: 'hearts' as const,
      rank: 9,
      levelCard: false,
      isWildcard: false,
    },
  ],
  type: 'single',
  mainRank: 9,
  timestamp: 1,
};

describe('PlayerCard layout variants', () => {
  it('renders a dedicated compact layout variant', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const PlayerCard = require('../PlayerCard').default;

    const html = renderToStaticMarkup(
      React.createElement(PlayerCard as any, {
        player: samplePlayer,
        isCurrentTurn: false,
        isSelf: false,
        compact: true,
      })
    );

    expect(html).toContain('player-card--compact');
  });

  it('renders an integrated seat card with a visual team marker and play area', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const PlayerCard = require('../PlayerCard').default;

    const html = renderToStaticMarkup(
      React.createElement(PlayerCard as any, {
        player: samplePlayer,
        isCurrentTurn: false,
        isSelf: false,
        compact: true,
        displayPosition: 'north',
        playInfo: samplePlay,
      })
    );

    expect(html).toContain('data-seat-card="integrated"');
    expect(html).toContain('data-team="red"');
    expect(html).toContain('9');
  });

  it('shows waiting copy instead of finished copy when cards remain', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const PlayerCard = require('../PlayerCard').default;

    const html = renderToStaticMarkup(
      React.createElement(PlayerCard as any, {
        player: {
          ...samplePlayer,
          cardsRemaining: 5,
          rank: undefined,
        },
        isCurrentTurn: false,
        isSelf: false,
        compact: true,
        displayPosition: 'east',
        playInfo: null,
      })
    );

    expect(html).toContain('5');
    expect(html).toContain('等待出牌');
    expect(html).not.toContain('已出完牌');
  });

  it('shows the finished copy only when no cards remain', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const PlayerCard = require('../PlayerCard').default;

    const html = renderToStaticMarkup(
      React.createElement(PlayerCard as any, {
        player: {
          ...samplePlayer,
          cardsRemaining: 0,
          isReady: false,
          rank: undefined,
        },
        isCurrentTurn: false,
        isSelf: false,
        compact: true,
        displayPosition: 'west',
        playInfo: null,
      })
    );

    expect(html).toContain('已出完牌');
  });

  it('shows pending-deal copy in the waiting phase even when cards are still undealt', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const PlayerCard = require('../PlayerCard').default;

    const html = renderToStaticMarkup(
      React.createElement(PlayerCard as any, {
        player: {
          ...samplePlayer,
          cardsRemaining: 0,
          isReady: true,
          rank: undefined,
        },
        isCurrentTurn: false,
        isSelf: false,
        compact: true,
        displayPosition: 'north',
        playInfo: null,
        gamePhase: 'waiting',
      })
    );

    expect(html).toContain('待发牌');
    expect(html).not.toContain('已出完牌');
  });
});
