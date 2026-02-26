// tests/utils/cardPlayBot.ts
import { Page } from '@playwright/test';
import { Card } from '../../lib/types';
import * as cardSelector from './cardSelector';

export class CardPlayBot {
  constructor(private page: Page, private playerName: string) {}

  async getCurrentHand(): Promise<Card[]> {
    const cards = await this.page.evaluate(() => {
      const cardButtons = document.querySelectorAll('button[class*="border-2"]');
      const cards: any[] = [];

      cardButtons.forEach((btn, index) => {
        // 从按钮文本中提取牌的信息
        const text = btn.textContent || '';
        const suitMatch = text.match(/[♠♥♣♦]/);
        const rankMatch = text.match(/(\d+|J|Q|K|A)/);

        if (suitMatch && rankMatch) {
          const suitMap: Record<string, string> = {
            '♠': 'spades',
            '♥': 'hearts',
            '♣': 'clubs',
            '♦': 'diamonds'
          };

          const rankMap: Record<string, number> = {
            'J': 11, 'Q': 12, 'K': 13, 'A': 14
          };

          cards.push({
            id: `card-${index}`,
            suit: suitMap[suitMatch[0]],
            rank: rankMap[rankMatch[0]] || parseInt(rankMatch[0]),
            levelCard: btn.textContent?.includes('级') || false,
            isWildcard: btn.textContent?.includes('配') || false
          });
        }
      });

      return cards;
    });

    return cards;
  }

  async getGameState(): Promise<{
    currentTurn: number;
    lastPlay: any;
    isMyTurn: boolean;
  }> {
    const state = await this.page.evaluate(() => {
      const bodyText = document.body.innerText;

      // 检查是否是当前玩家的回合
      const isMyTurn = bodyText.includes('轮到你出牌');

      // 尝试获取上家出牌信息
      const lastPlayElement = document.querySelector('[class*="last-play"]');
      let lastPlay = null;
      if (lastPlayElement) {
        const text = lastPlayElement.textContent || '';
        const cardCount = text.match(/(\d+)\s*张牌/);
        if (cardCount) {
          lastPlay = {
            cardsCount: parseInt(cardCount[1]),
            // 这里可以扩展更多细节
          };
        }
      }

      return {
        isMyTurn,
        lastPlay
      };
    });

    return {
      currentTurn: 0, // 简化处理
      lastPlay: state.lastPlay,
      isMyTurn: state.isMyTurn
    };
  }

  async playCards(cards: Card[]): Promise<boolean> {
    try {
      // 先清除已选择的牌
      const selectedCards = await this.page.locator('button.border-blue-500').count();
      if (selectedCards > 0) {
        const clearButton = this.page.locator('button:has-text("清除")');
        if (await clearButton.count() > 0) {
          await clearButton.click();
        }
      }

      // 选择要出的牌（通过rank和suit匹配）
      for (const card of cards) {
        const suitSymbol = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' }[card.suit];
        const rankDisplay = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[card.rank] || card.rank;

        // 查找包含对应花色和rank的按钮
        const cardButton = this.page.locator('button', { hasText: suitSymbol }).filter({ hasText: String(rankDisplay) }).first();

        if (await cardButton.count() > 0) {
          await cardButton.click();
          await this.page.waitForTimeout(100); // 短暂等待确保选择生效
        }
      }

      // 点击出牌按钮
      const playButton = this.page.locator('button:has-text("出牌")');
      await playButton.click();

      await this.page.waitForTimeout(1000); // 等待服务器响应
      return true;
    } catch (error) {
      console.error(`${this.playerName} 出牌失败:`, error);
      return false;
    }
  }

  async passTurn(): Promise<boolean> {
    try {
      const passButton = this.page.locator('button:has-text("不要")');
      if (await passButton.count() > 0) {
        await passButton.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`${this.playerName} 过牌失败:`, error);
      return false;
    }
  }

  async makePlayDecision(currentLevel: number = 2): Promise<{ played: boolean; passed: boolean; error?: string }> {
    try {
      // 检查是否是自己的回合
      const gameState = await this.getGameState();

      if (!gameState.isMyTurn) {
        return { played: false, passed: false };
      }

      // 获取当前手牌
      const hand = await this.getCurrentHand();

      // 获取合法出牌
      const validPlays = cardSelector.getValidPlays(hand, gameState.lastPlay, currentLevel);

      // 决定是否过牌
      const isFirstPlay = !gameState.lastPlay;
      if (cardSelector.shouldPass(validPlays, isFirstPlay)) {
        const success = await this.passTurn();
        console.log(`${this.playerName} 选择过牌`);
        return { played: false, passed: success };
      }

      // 选择并执行出牌
      const selectedPlay = cardSelector.selectRandomPlay(validPlays);
      if (selectedPlay) {
        const success = await this.playCards(selectedPlay.cards);
        console.log(`${this.playerName} 出牌: ${selectedPlay.description}`);
        return { played: success, passed: false };
      }

      return { played: false, passed: false, error: '没有找到合法出牌' };
    } catch (error) {
      return { played: false, passed: false, error: String(error) };
    }
  }
}
