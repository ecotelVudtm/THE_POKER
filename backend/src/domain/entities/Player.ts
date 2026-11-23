import { Card } from './Card';
import { createDefaultSkillMastery, SkillMastery } from './Account';
import { SkinId, WinEffectId } from '../value-objects/Cosmetic';
import { createInitialItemsState, ITEM_CONFIG, ItemType, PlayerItemsState } from '../value-objects/Item';
import { ActiveLoan } from '../value-objects/Loan';
import { MiniGameChallenge, SkillType } from '../value-objects/Skill';

export const INITIAL_TIME_BANK_SECONDS = 180;
export const TURN_TIME_LIMIT_SECONDS = 20;
export const MAX_VIA = 100;
export const INITIAL_VIA = 30;
export const VIA_GAIN_PER_ROUND = 10;
export const VIA_GAIN_ON_WIN = 20;

export interface PlayerStatusEffects {
  blessed: boolean;
  mangoShield: boolean;
  pressured: boolean;
  debtPressure: boolean;
  /** Temporary suppression of debtPressure for the current hand (from LUCKY_MANGO) */
  debtPressureSuppressedThisHand: boolean;
  icedTeaActive: boolean;
}

export interface Player {
  accountId: string;
  socketId: string | null;
  displayName: string;
  isBot: boolean;
  seatIndex: number;
  chips: number;
  /** Table chip snapshot last synced to Account so maxBuyIn caps never wipe out reserve chips */
  lastSyncedChips: number;
  currentBet: number;
  totalBetInHand: number;
  holeCards: Card[];
  /** Indices (0 or 1) of hole cards publicly exposed due to "Lộ Tẩy" */
  exposedCardIndices: number[];
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
  timedOut: boolean;
  hasActedThisRound: boolean;
  timeBankSeconds: number;
  turnRemainingSeconds: number;
  via: number;
  matchWins: number;
  winStreak: number;
  ownedItems: ItemType[];
  equippedSkills: SkillType[];
  equippedSkin: SkinId;
  equippedWinEffect: WinEffectId;
  itemsState: PlayerItemsState;
  statusEffects: PlayerStatusEffects;
  activeLoan: ActiveLoan | null;
  activeChallenge: MiniGameChallenge | null;
  phoneOpen: boolean;
  skillMastery: SkillMastery;
  /** Snapshot of estimated win probability when going All-In (for LUCKY_COIN passive) */
  allInWinProbability: number | null;
}

export function createInitialStatusEffects(): PlayerStatusEffects {
  return {
    blessed: false,
    mangoShield: false,
    pressured: false,
    debtPressure: false,
    debtPressureSuppressedThisHand: false,
    icedTeaActive: false,
  };
}

export function createPlayer(params: {
  accountId: string;
  socketId: string | null;
  displayName: string;
  isBot: boolean;
  seatIndex: number;
  chips: number;
  ownedItems?: ItemType[];
  equippedSkills?: SkillType[];
  equippedSkin?: SkinId;
  equippedWinEffect?: WinEffectId;
  skillMastery?: SkillMastery;
}): Player {
  return {
    accountId: params.accountId,
    socketId: params.socketId,
    displayName: params.displayName,
    isBot: params.isBot,
    seatIndex: params.seatIndex,
    chips: params.chips,
    lastSyncedChips: params.chips,
    currentBet: 0,
    totalBetInHand: 0,
    holeCards: [],
    exposedCardIndices: [],
    folded: false,
    allIn: false,
    eliminated: false,
    timedOut: false,
    hasActedThisRound: false,
    timeBankSeconds: INITIAL_TIME_BANK_SECONDS,
    turnRemainingSeconds: TURN_TIME_LIMIT_SECONDS,
    via: INITIAL_VIA,
    matchWins: 0,
    winStreak: 0,
    ownedItems: params.ownedItems ? [...params.ownedItems] : [],
    equippedSkills: params.equippedSkills ? [...params.equippedSkills] : [],
    equippedSkin: params.equippedSkin ?? 'DEFAULT',
    equippedWinEffect: params.equippedWinEffect ?? 'NONE',
    itemsState: createInitialItemsState(),
    statusEffects: createInitialStatusEffects(),
    activeLoan: null,
    activeChallenge: null,
    phoneOpen: false,
    skillMastery: params.skillMastery ?? createDefaultSkillMastery(),
    allInWinProbability: null,
  };
}

export function getPlayerMaxVia(player: Player): number {
  const hasNoodles =
    player.ownedItems.includes('INSTANT_NOODLES') &&
    player.itemsState.noodleBitesLeft > 0 &&
    !(
      player.itemsState.lockedItem === 'INSTANT_NOODLES' &&
      player.itemsState.lockedItemHandsLeft > 0
    );
  return hasNoodles ? ITEM_CONFIG.INSTANT_NOODLES.maxViaLimit : MAX_VIA;
}

export function addVia(player: Player, amount: number): void {
  const maxVia = getPlayerMaxVia(player);
  player.via = Math.max(0, Math.min(maxVia, player.via + amount));
}

export function isEffectiveDebtPressure(player: Player): boolean {
  return player.statusEffects.debtPressure && !player.statusEffects.debtPressureSuppressedThisHand;
}
