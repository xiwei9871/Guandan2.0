// tests/utils/cardPlayBot.ts
import { Page } from '@playwright/test';
import { Card } from '../../lib/types';
import * as cardSelector from './cardSelector';

export class CardPlayBot {
  constructor(private page: Page, private playerName: string) {}

  async getCurrentHand(): Promise<Card[]> {
    try {
      const cards = await this.page.evaluate(() => {
      const cardButtons = document.querySelectorAll('button[class*="border-2"]');
      const cards: any[] = [];

      cardButtons.forEach((btn, index) => {
        // 从按钮文本中提取牌的信息
        const text = btn.textContent || '';

        // Check for jokers first
        if (text.includes('大王')) {
          cards.push({
            id: `card-${index}`,
            suit: 'spades',
            rank: 15,
            levelCard: false,
            isWildcard: false
          });
          return;
        }

        if (text.includes('小王')) {
          cards.push({
            id: `card-${index}`,
            suit: 'hearts',
            rank: 15,
            levelCard: false,
            isWildcard: false
          });
          return;
        }

        // Regular cards
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
    } catch (error) {
      console.error(`${this.playerName} getCurrentHand 出错:`, error);
      return [];
    }
  }

  async getGameState(): Promise<{
    currentTurn: number;
    lastPlay: any;
    isMyTurn: boolean;
  }> {
    try {
      const state = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;

        // 检查是否是当前玩家的回合
        // 更精确的判断：如果有"等待其他玩家出牌"则不是自己的回合
        const isWaiting = bodyText.includes('等待其他玩家出牌');
        const isMyTurn = bodyText.includes('轮到你出牌') && !isWaiting;

        // 尝试获取上家出牌信息 - 从页面文本中提取
        let lastPlay = null;
        const lastPlayMatch = bodyText.match(/(\w+)\s*出牌\s*(\d+)\s*张牌/);
        if (lastPlayMatch) {
          lastPlay = {
            playerName: lastPlayMatch[1],
            cardsCount: parseInt(lastPlayMatch[2]),
            type: 'unknown'
          };
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
    } catch (error) {
      console.error(`${this.playerName} getGameState 出错:`, error);
      return {
        currentTurn: 0,
        lastPlay: null,
        isMyTurn: false
      };
    }
  }

  async playCards(cards: Card[]): Promise<boolean> {
    try {
      console.log(`${this.playerName} 开始出牌，选择 ${cards.length} 张牌`);

      // 先清除已选择的牌
      const clearButton = this.page.locator('button:has-text("清除")');
      if (await clearButton.count() > 0) {
        await clearButton.click();
        await this.page.waitForTimeout(200);
      }

      // 选择要出的牌
      // 使用Map来跟踪每种牌的选择次数，避免重复选择同一张牌
      const cardSelectionCount = new Map<string, number>();

      for (const card of cards) {
        let cardKey = '';
        let searchStrings: string[] = [];

        // Handle jokers
        if (card.rank === 15) {
          cardKey = card.suit === 'spades' ? '大王' : '小王';
          searchStrings = [cardKey];
        } else {
          // Regular cards
          const suitSymbol = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' }[card.suit];
          const rankDisplay = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[card.rank] || card.rank;
          cardKey = `${suitSymbol}${rankDisplay}`;
          searchStrings = [suitSymbol, String(rankDisplay)];
        }

        // 获取这种牌已经选择了多少次
        const selectionIndex = cardSelectionCount.get(cardKey) || 0;
        cardSelectionCount.set(cardKey, selectionIndex + 1);

        // 查找所有匹配的按钮
        let allCardButtons;
        if (card.rank === 15) {
          // For jokers, search by text
          allCardButtons = this.page.locator('button').filter({ hasText: cardKey });
        } else {
          // For regular cards, search by suit and rank
          allCardButtons = this.page.locator('button').filter({ hasText: searchStrings[0] }).filter({ hasText: searchStrings[1] });
        }

        const count = await allCardButtons.count();

        console.log(`${this.playerName} 查找牌 ${cardKey}, 找到 ${count} 个按钮，选择第 ${selectionIndex + 1} 个`);

        if (count > selectionIndex) {
          // 找到第selectionIndex个按钮（0-based index）
          const cardButton = allCardButtons.nth(selectionIndex);
          await cardButton.click();
          await this.page.waitForTimeout(100);
        } else {
          console.error(`${this.playerName} 未找到足够的牌 ${cardKey}，需要第 ${selectionIndex + 1} 个，只有 ${count} 个`);
          return false;
        }
      }

      // 验证是否选中了牌
      const selectedCount = await this.page.locator('button.border-blue-500').count();
      console.log(`${this.playerName} 已选中 ${selectedCount} 张牌`);

      if (selectedCount !== cards.length) {
        console.error(`${this.playerName} 牌选择失败，期望 ${cards.length} 张，实际选中 ${selectedCount} 张`);
        // 清除选择
        await clearButton.click();
        return false;
      }

      // 点击出牌按钮
      const playButton = this.page.locator('button:has-text("出牌")');
      await playButton.click();

      await this.page.waitForTimeout(500);
      console.log(`${this.playerName} 出牌完成`);
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
      console.log(`${this.playerName} 开始决策...`);

      // 检查是否是自己的回合
      const gameState = await this.getGameState();
      console.log(`${this.playerName} isMyTurn: ${gameState.isMyTurn}`);

      if (!gameState.isMyTurn) {
        console.log(`${this.playerName} 跳过 (不是回合)`);
        return { played: false, passed: false };
      }

      // 获取当前手牌
      const hand = await this.getCurrentHand();
      console.log(`${this.playerName} 获取手牌: ${hand.length}张`);

      // 获取合法出牌
      const validPlays = cardSelector.getValidPlays(hand, gameState.lastPlay, currentLevel);
      console.log(`${this.playerName} 手牌数量: ${hand.length}, 合法出牌数: ${validPlays.length}`);

      // 决定是否过牌
      const isFirstPlay = !gameState.lastPlay;
      if (cardSelector.shouldPass(validPlays, isFirstPlay)) {
        console.log(`${this.playerName} 决定过牌`);
        const success = await this.passTurn();
        console.log(`${this.playerName} 过牌结果: ${success}`);
        return { played: false, passed: success };
      }

      // 选择并执行出牌
      const selectedPlay = cardSelector.selectRandomPlay(validPlays);
      if (selectedPlay) {
        console.log(`${this.playerName} 选择出牌: ${selectedPlay.description}`);
        const success = await this.playCards(selectedPlay.cards);
        console.log(`${this.playerName} 出牌结果: ${success}`);
        return { played: success, passed: false };
      }

      console.log(`${this.playerName} 没有找到合法出牌`);
      return { played: false, passed: false, error: '没有找到合法出牌' };
    } catch (error) {
      console.error(`${this.playerName} 决策出错:`, error);
      return { played: false, passed: false, error: String(error) };
    }
  }
}
