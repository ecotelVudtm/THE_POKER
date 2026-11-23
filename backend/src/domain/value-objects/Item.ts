export type ItemType =
  | 'PHONE'
  | 'INCENSE_BOWL'
  | 'LUCKY_MANGO'
  | 'ICED_TEA'
  | 'LUCKY_COIN'
  | 'INSTANT_NOODLES';

export const ALL_ITEMS: readonly ItemType[] = [
  'PHONE',
  'INCENSE_BOWL',
  'LUCKY_MANGO',
  'ICED_TEA',
  'LUCKY_COIN',
  'INSTANT_NOODLES',
];

export const LOCKABLE_ITEMS: readonly ItemType[] = [
  'INCENSE_BOWL',
  'LUCKY_MANGO',
  'ICED_TEA',
  'LUCKY_COIN',
  'INSTANT_NOODLES',
];

export const ITEM_CONFIG = {
  INCENSE_BOWL: {
    maxSticks: 5,
    initialSticks: 1,
    burnOutHandsWithoutLighting: 4,
    viaCostPerStick: 100,
  },
  LUCKY_MANGO: {
    maxUsesPerMatch: 2,
  },
  ICED_TEA: {
    maxSipsPerMatch: 3,
    bonusTimeSeconds: 20,
  },
  LUCKY_COIN: {
    maxWinProbabilityThreshold: 0.25,
    refundRatio: 0.15,
  },
  INSTANT_NOODLES: {
    maxBites: 3,
    maxViaLimit: 120,
  },
} as const;

export function getNextIncenseViaCost(currentSticks: number): number | null {
  if (currentSticks >= ITEM_CONFIG.INCENSE_BOWL.maxSticks) return null;
  return ITEM_CONFIG.INCENSE_BOWL.viaCostPerStick;
}

export interface PlayerItemsState {
  /** Active burning incense sticks (0..5). Starts at 1 free when unlocked. */
  incenseSticks: number;
  /** Consecutive hands elapsed without lighting a new stick (burns out at 4). */
  incenseHandsIdle: number;
  /** Remaining iced tea sips (0..3). */
  icedTeaSipsLeft: number;
  /** Whether iced tea was already sipped in the current betting round. */
  icedTeaUsedThisRound: boolean;
  /** Remaining instant noodle bites (0..3); eaten 1 per win, keeps Max Vía at 120 while > 0. */
  noodleBitesLeft: number;
  luckyMangoUsesLeft: number;
  lockedItem: ItemType | null;
  lockedItemHandsLeft: number;
}

export function createInitialItemsState(): PlayerItemsState {
  return {
    incenseSticks: ITEM_CONFIG.INCENSE_BOWL.initialSticks,
    incenseHandsIdle: 0,
    icedTeaSipsLeft: ITEM_CONFIG.ICED_TEA.maxSipsPerMatch,
    icedTeaUsedThisRound: false,
    noodleBitesLeft: ITEM_CONFIG.INSTANT_NOODLES.maxBites,
    luckyMangoUsesLeft: ITEM_CONFIG.LUCKY_MANGO.maxUsesPerMatch,
    lockedItem: null,
    lockedItemHandsLeft: 0,
  };
}
