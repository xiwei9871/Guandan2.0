import { describe, expect, it, jest } from '@jest/globals';

describe('HandCards integrated layout', () => {
  it('renders a dedicated actions cluster inside the hand zone', () => {
    jest.doMock('@/hooks/useCardSelection', () => ({
      useCardSelection: () => ({
        toggleCard: jest.fn(),
        clearSelection: jest.fn(),
        isCardSelected: () => false,
        getSelectedCards: () => [],
      }),
    }));

    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const HandCards = require('../HandCards').default;

    const html = renderToStaticMarkup(
      React.createElement(HandCards as any, {
        cards: [],
        currentLevel: 2,
        onPlayCards: jest.fn(),
        onPass: jest.fn(),
        isCurrentTurn: true,
        canPlay: true,
        canPass: true,
      })
    );

    expect(html).toContain('data-testid="hand-actions"');
    expect(html).toContain('data-testid="hand-card-strip"');
  });

  it('renders a dedicated submit action in tribute mode', () => {
    jest.doMock('@/hooks/useCardSelection', () => ({
      useCardSelection: () => ({
        toggleCard: jest.fn(),
        clearSelection: jest.fn(),
        isCardSelected: () => false,
        getSelectedCards: (cards: any[]) => cards.slice(0, 1),
      }),
    }));

    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const HandCards = require('../HandCards').default;

    const html = renderToStaticMarkup(
      React.createElement(HandCards as any, {
        cards: [
          {
            id: 'return-card',
            suit: 'clubs',
            rank: 9,
            levelCard: false,
            isWildcard: false,
          },
        ],
        currentLevel: 2,
        onPlayCards: jest.fn(),
        onPass: jest.fn(),
        isCurrentTurn: true,
        canPlay: true,
        canPass: false,
        mode: 'tribute',
        submitLabel: 'tribute',
        onSubmitSelected: jest.fn(),
        canSubmit: true,
      })
    );

    expect(html).toContain('data-testid="tribute-submit"');
    expect(html).toContain('tribute');
  });
});
