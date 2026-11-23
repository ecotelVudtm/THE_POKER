export type ItemType =
  | 'PHONE'
  | 'INCENSE_BOWL'
  | 'LUCKY_MANGO'
  | 'ICED_TEA'
  | 'LUCKY_COIN';

export const ALL_ITEMS: readonly ItemType[] = [
  'PHONE',
  'INCENSE_BOWL',
  'LUCKY_MANGO',
  'ICED_TEA',
  'LUCKY_COIN',
];

export const LOCKABLE_ITEMS: readonly ItemType[] = [
  'INCENSE_BOWL',
  'LUCKY_MANGO',
  'ICED_TEA',
  'LUCKY_COIN',
];

export const ITEM_CONFIG = {
  INCENSE_BOWL: {
    viaCost: 20,
    cooldownHands: 2,
    miniGameZoneBonus: 0.2,
  },
  LUCKY_MANGO: {
    maxUsesPerMatch: 2,
  },
  ICED_TEA: {
    cooldownHands: 2,
    bonusTimeSeconds: 20,
    miniGameSpeedReduction: 0.15,
  },
  LUCKY_COIN: {
    maxWinProbabilityThreshold: 0.25,
    refundRatio: 0.15,
  },
} as const;

export interface PlayerItemsState {
  incenseCooldownHands: number;
  icedTeaCooldownHands: number;
  luckyMangoUsesLeft: number;
  lockedItem: ItemType | null;
  lockedItemHandsLeft: number;
}

export function createInitialItemsState(): PlayerItemsState {
  return {
    incenseCooldownHands: 0,
    icedTeaCooldownHands: 0,
    luckyMangoUsesLeft: ITEM_CONFIG.LUCKY_MANGO.maxUsesPerMatch,
    lockedItem: null,
    lockedItemHandsLeft: 0,
  };
}
