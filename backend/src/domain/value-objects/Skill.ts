export type SkillType =
  | 'SLEIGHT_OF_HAND'
  | 'EAGLE_EYE'
  | 'PRESSURE_AURA'
  | 'VIA_SIPHON'
  | 'TIME_FREEZE'
  | 'POKER_FACE';

export type MiniGameType = 'TIMING_BAR' | 'BALANCE_CIRCLE' | 'RHYTHM_TAP';

export type SkillMasteryKey =
  | 'sleightOfHand'
  | 'eagleEye'
  | 'pressureAura'
  | 'viaSiphon'
  | 'timeFreeze'
  | 'pokerFace';

export const ALL_SKILLS: readonly SkillType[] = [
  'SLEIGHT_OF_HAND',
  'EAGLE_EYE',
  'PRESSURE_AURA',
  'VIA_SIPHON',
  'TIME_FREEZE',
  'POKER_FACE',
];

export const MAX_EQUIPPED_SKILLS = 3;

export interface SkillDefinition {
  type: SkillType;
  viaCost: number;
  shopPrice: number;
  miniGameType: MiniGameType;
  masteryKey: SkillMasteryKey;
  expOnSuccess: number;
  expOnFail: number;
  requiresTarget?: boolean;
}

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  SLEIGHT_OF_HAND: {
    type: 'SLEIGHT_OF_HAND',
    viaCost: 30,
    shopPrice: 500,
    miniGameType: 'TIMING_BAR',
    masteryKey: 'sleightOfHand',
    expOnSuccess: 40,
    expOnFail: 10,
  },
  EAGLE_EYE: {
    type: 'EAGLE_EYE',
    viaCost: 50,
    shopPrice: 800,
    miniGameType: 'BALANCE_CIRCLE',
    masteryKey: 'eagleEye',
    expOnSuccess: 35,
    expOnFail: 10,
  },
  PRESSURE_AURA: {
    type: 'PRESSURE_AURA',
    viaCost: 25,
    shopPrice: 400,
    miniGameType: 'RHYTHM_TAP',
    masteryKey: 'pressureAura',
    expOnSuccess: 35,
    expOnFail: 10,
    requiresTarget: true,
  },
  VIA_SIPHON: {
    type: 'VIA_SIPHON',
    viaCost: 20,
    shopPrice: 350,
    miniGameType: 'TIMING_BAR',
    masteryKey: 'viaSiphon',
    expOnSuccess: 35,
    expOnFail: 10,
    requiresTarget: true,
  },
  TIME_FREEZE: {
    type: 'TIME_FREEZE',
    viaCost: 25,
    shopPrice: 400,
    miniGameType: 'BALANCE_CIRCLE',
    masteryKey: 'timeFreeze',
    expOnSuccess: 35,
    expOnFail: 10,
  },
  POKER_FACE: {
    type: 'POKER_FACE',
    viaCost: 20,
    shopPrice: 350,
    miniGameType: 'RHYTHM_TAP',
    masteryKey: 'pokerFace',
    expOnSuccess: 35,
    expOnFail: 10,
  },
};

export const MINIGAME_TIMEOUT_MS = 6000;
export const PRESSURE_AURA_TIME_PENALTY_SECONDS = 10;
export const VIA_SIPHON_AMOUNT = 25;
export const TIME_FREEZE_BANK_BONUS = 15;
export const TIME_FREEZE_TURN_BONUS = 10;

export interface MiniGameParameters {
  zoneWidth: number;
  targetStart: number;
  targetEnd: number;
  speedMultiplier: number;
  requiredBalanceRatio: number;
  rhythmBeatsMs: number[];
  rhythmToleranceMs: number;
  difficultyScore: number;
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
  params: MiniGameParameters;
}

export interface MiniGameSubmissionPayload {
  challengeId: string;
  cursorPosition?: number;
  balanceSamples?: number[];
  balanceHoldRatio?: number;
  tapTimestampsMs?: number[];
}

export interface DifficultyModifiers {
  masteryLevel: number;
  blessed: boolean;
  icedTeaActive: boolean;
  debtPressure: boolean;
  pressured: boolean;
}
