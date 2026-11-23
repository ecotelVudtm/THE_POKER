import crypto from 'crypto';
import { Card } from '../../domain/entities/Card';
import { BetAction } from '../../domain/entities/Room';
import { estimateHandStrength } from '../../domain/rules/HandEvaluator';
import { FilteredRoomState, PublicPlayerView } from '../../domain/rules/StateFilter';
import { getNextIncenseViaCost, ItemType } from '../../domain/value-objects/Item';

export interface BotDecision {
  itemToUse?: ItemType;
  action: BetAction;
  raiseAmount?: number;
}

/**
 * Strictly Fair Fog-of-War Bot AI Engine.
 * Accepts ONLY `FilteredRoomState` (the exact same state a human client sees):
 * - NEVER has access to `room.deck` or any unexposed opponent `holeCards` (they are `null`).
 * - Can only see its own 2 hole cards, revealed community cards, pot, bets, and any publicly exposed (Lộ Tẩy) cards.
 */
export class BotAIEngine {
  public decide(view: FilteredRoomState, bot: PublicPlayerView): BotDecision {
    const ownCards = bot.holeCards.filter((c): c is Card => c !== null);
    const strength = estimateHandStrength(ownCards, view.communityCards);
    const toCall = Math.max(0, view.currentBet - bot.currentBet);
    const potOdds = toCall > 0 ? toCall / Math.max(1, view.pot + toCall) : 0;
    const roll = crypto.randomInt(0, 100);

    // Distinct human-like personalities per seat so bots don't behave robotically
    // seat 1: curious caller | seat 2: balanced | seat 3: bold bluffer
    const boldness = bot.seatIndex % 3 === 0 ? 0.12 : bot.seatIndex % 3 === 1 ? 0.06 : 0.0;

    // Occasionally use owned items (ICED_TEA / INCENSE_BOWL)
    let itemToUse: ItemType | undefined;
    const nextIncenseViaCost = getNextIncenseViaCost(bot.itemsState.incenseSticks);
    if (
      bot.ownedItems.includes('ICED_TEA') &&
      bot.itemsState.icedTeaSipsLeft > 0 &&
      !bot.itemsState.icedTeaUsedThisRound &&
      bot.itemsState.lockedItem !== 'ICED_TEA' &&
      (bot.timeBankSeconds < 90 || roll < 8)
    ) {
      itemToUse = 'ICED_TEA';
    } else if (
      bot.ownedItems.includes('INCENSE_BOWL') &&
      nextIncenseViaCost !== null &&
      bot.via >= nextIncenseViaCost &&
      bot.itemsState.lockedItem !== 'INCENSE_BOWL' &&
      roll >= 10 &&
      roll < 20
    ) {
      itemToUse = 'INCENSE_BOWL';
    }

    const effectiveStrength = Math.min(1, strength + boldness);

    // Strong hand: raise, call, or all-in
    if (effectiveStrength >= 0.72) {
      if (bot.chips <= toCall + view.minRaise) {
        return { itemToUse, action: 'ALL_IN' };
      }
      if (roll < 68) {
        const raiseBy = Math.min(
          bot.chips - toCall,
          Math.max(view.minRaise, Math.floor(view.bigBlind * (2 + (roll % 3))))
        );
        return { itemToUse, action: 'RAISE', raiseAmount: raiseBy };
      }
      return { itemToUse, action: toCall === 0 ? 'CHECK' : 'CALL' };
    }

    // Medium hand: call reasonable bets, check, or occasional semi-bluff
    if (effectiveStrength >= 0.4) {
      if (toCall === 0) {
        if (roll < 25 && bot.chips > view.minRaise) {
          return { itemToUse, action: 'RAISE', raiseAmount: view.minRaise };
        }
        return { itemToUse, action: 'CHECK' };
      }
      if (
        potOdds <= effectiveStrength + 0.14 ||
        toCall <= view.bigBlind * 4 ||
        (toCall <= bot.chips * 0.25 && roll < 55)
      ) {
        return { itemToUse, action: toCall >= bot.chips ? 'ALL_IN' : 'CALL' };
      }
      return { itemToUse, action: 'FOLD' };
    }

    // Weak hand: check if free, occasional bluff or curious small call, otherwise fold
    if (toCall === 0) {
      if (roll < 14 && bot.chips > view.minRaise) {
        return { itemToUse, action: 'RAISE', raiseAmount: view.minRaise };
      }
      return { itemToUse, action: 'CHECK' };
    }

    if (toCall <= view.bigBlind * 2 && roll < 42) {
      return { itemToUse, action: toCall >= bot.chips ? 'ALL_IN' : 'CALL' };
    }

    return { itemToUse, action: 'FOLD' };
  }
}
