import crypto from 'crypto';
import { Player } from '../../domain/entities/Player';
import { BetAction, Room } from '../../domain/entities/Room';
import { estimateHandStrength } from '../../domain/rules/HandEvaluator';
import { ITEM_CONFIG, ItemType } from '../../domain/value-objects/Item';

export interface BotDecision {
  itemToUse?: ItemType;
  action: BetAction;
  raiseAmount?: number;
}

export class BotAIEngine {
  public decide(room: Room, bot: Player): BotDecision {
    const strength = estimateHandStrength(bot.holeCards, room.communityCards);
    const toCall = Math.max(0, room.currentBet - bot.currentBet);
    const potOdds = toCall > 0 ? toCall / Math.max(1, room.pot + toCall) : 0;
    const roll = crypto.randomInt(0, 100);

    // Occasionally use ICED_TEA or INCENSE_BOWL for lively gameplay
    let itemToUse: ItemType | undefined;
    if (
      bot.itemsState.icedTeaCooldownHands === 0 &&
      bot.itemsState.lockedItem !== 'ICED_TEA' &&
      (bot.timeBankSeconds < 180 || roll < 12)
    ) {
      itemToUse = 'ICED_TEA';
    } else if (
      bot.itemsState.incenseCooldownHands === 0 &&
      bot.itemsState.lockedItem !== 'INCENSE_BOWL' &&
      bot.via >= ITEM_CONFIG.INCENSE_BOWL.viaCost &&
      !bot.statusEffects.blessed &&
      roll >= 12 &&
      roll < 28
    ) {
      itemToUse = 'INCENSE_BOWL';
    }

    // Strong hand: raise or all-in
    if (strength >= 0.72) {
      if (bot.chips <= toCall + room.minRaise) {
        return { itemToUse, action: 'ALL_IN' };
      }
      if (roll < 70) {
        const raiseBy = Math.min(
          bot.chips - toCall,
          Math.max(room.minRaise, Math.floor(room.bigBlind * (2 + (roll % 3))))
        );
        return { itemToUse, action: 'RAISE', raiseAmount: raiseBy };
      }
      return { itemToUse, action: toCall === 0 ? 'CHECK' : 'CALL' };
    }

    // Medium hand: call/check or occasional bluff raise
    if (strength >= 0.42) {
      if (toCall === 0) {
        if (roll < 22 && bot.chips > room.minRaise) {
          return { itemToUse, action: 'RAISE', raiseAmount: room.minRaise };
        }
        return { itemToUse, action: 'CHECK' };
      }
      if (potOdds <= strength + 0.08 || toCall <= room.bigBlind * 2) {
        return { itemToUse, action: toCall >= bot.chips ? 'ALL_IN' : 'CALL' };
      }
      return { itemToUse, action: 'FOLD' };
    }

    // Weak hand: check if free, occasional bluff, otherwise fold
    if (toCall === 0) {
      if (roll < 10 && bot.chips > room.minRaise) {
        return { itemToUse, action: 'RAISE', raiseAmount: room.minRaise };
      }
      return { itemToUse, action: 'CHECK' };
    }

    if (toCall <= room.bigBlind && roll < 30) {
      return { itemToUse, action: 'CALL' };
    }

    return { itemToUse, action: 'FOLD' };
  }
}
