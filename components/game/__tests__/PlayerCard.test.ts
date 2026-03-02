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
});
