export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
  code: string;
}

export type ItemType =
  | 'PHONE'
  | 'INCENSE_BOWL'
  | 'LUCKY_MANGO'
  | 'ICED_TEA'
  | 'LUCKY_COIN';

export type LoanPackage = 'CHIPS_2000' | 'CHIPS_5000' | 'TIME_60S';

export type SkillType = 'SLEIGHT_OF_HAND' | 'EAGLE_EYE' | 'PRESSURE_AURA';
export type MiniGameType = 'TIMING_BAR' | 'BALANCE_CIRCLE' | 'RHYTHM_TAP';

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type GamePhase =
  | 'WAITING'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';
export type BetAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export interface MasteryProgress {
  level: number;
  exp: number;
}

export interface SkillMastery {
  sleightOfHand: MasteryProgress;
  eagleEye: MasteryProgress;
  pressureAura: MasteryProgress;
}

export interface DebtRecord {
  loanId: string;
  packageType: LoanPackage;
  principal: number;
  repaidAmount: number;
  status: 'ACTIVE' | 'REPAID' | 'DEFAULTED';
  createdAt: string;
  resolvedAt?: string;
}

export interface Account {
  id: string;
  username: string;
  displayName: string;
  chips: number;
  skillMastery: SkillMastery;
  debtHistory: DebtRecord[];
  stats: {
    wins: number;
    matchesPlayed: number;
    caughtCount: number;
  };
}

export interface PlayerItemsState {
  incenseCooldownHands: number;
  icedTeaCooldownHands: number;
  luckyMangoUsesLeft: number;
  lockedItem: ItemType | null;
  lockedItemHandsLeft: number;
}

export interface PlayerStatusEffects {
  blessed: boolean;
  mangoShield: boolean;
  pressured: boolean;
  debtPressure: boolean;
  debtPressureSuppressedThisHand: boolean;
  icedTeaActive: boolean;
}

export interface ActiveLoan {
  loanId: string;
  packageType: LoanPackage;
  principal: number;
  currentOwed: number;
  interestRate: number;
  handsElapsed: number;
  takenAtHand: number;
}

export interface PublicPlayerView {
  accountId: string;
  displayName: string;
  isBot: boolean;
  seatIndex: number;
  chips: number;
  currentBet: number;
  totalBetInHand: number;
  holeCards: (Card | null)[];
  exposedCardIndices: number[];
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
  timedOut: boolean;
  timeBankSeconds: number;
  turnRemainingSeconds: number;
  via: number;
  itemsState: PlayerItemsState;
  statusEffects: PlayerStatusEffects;
  activeLoan: ActiveLoan | null;
  phoneOpen: boolean;
  hasActiveChallenge: boolean;
  skillMastery?: SkillMastery;
}

export interface SidePot {
  amount: number;
  eligibleAccountIds: string[];
}

export interface HandWinner {
  accountId: string;
  displayName: string;
  amount: number;
  handName: string;
  bestCards: Card[];
}

export interface RoomLogEntry {
  timestamp: number;
  message: string;
}

export interface FilteredRoomState {
  id: string;
  name: string;
  hostAccountId: string;
  status: RoomStatus;
  phase: GamePhase;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  dealerIndex: number;
  currentTurnIndex: number;
  currentTurnAccountId: string | null;
  pot: number;
  sidePots: SidePot[];
  communityCards: Card[];
  handNumber: number;
  currentBet: number;
  minRaise: number;
  players: PublicPlayerView[];
  lastWinners: HandWinner[];
  eventLog: RoomLogEntry[];
}

export interface MiniGameChallenge {
  challengeId: string;
  accountId: string;
  skillType: SkillType;
  miniGameType: MiniGameType;
  targetAccountId?: string;
  cardIndex?: 0 | 1;
  createdAt: number;
  expiresAt: number;
  params: {
    zoneWidth: number;
    targetStart: number;
    targetEnd: number;
    speedMultiplier: number;
    requiredBalanceRatio: number;
    rhythmBeatsMs: number[];
    rhythmToleranceMs: number;
    difficultyScore: number;
  };
}

export interface MiniGameSubmissionPayload {
  challengeId: string;
  cursorPosition?: number;
  balanceSamples?: number[];
  balanceHoldRatio?: number;
  tapTimestampsMs?: number[];
}

export interface MiniGameResultEvent {
  roomId: string;
  accountId: string;
  skillType: SkillType;
  success: boolean;
  reason: string;
  accuracy: number;
  exposedCardIndex: number | null;
  mangoShieldBlocked: boolean;
  expGained: number;
  leveledUp: boolean;
  newLevel: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  createdAt: number;
}
