import { useState, useCallback } from 'react';
import { Card } from '@/lib/types';

export function useCardSelection() {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const toggleCard = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const isCardSelected = useCallback((cardId: string) => {
    return selectedCards.has(cardId);
  }, [selectedCards]);

  const getSelectedCards = useCallback((allCards: Card[]) => {
    return allCards.filter(card => selectedCards.has(card.id));
  }, [selectedCards]);

  return {
    selectedCards,
    toggleCard,
    clearSelection,
    isCardSelected,
    getSelectedCards,
  };
}
