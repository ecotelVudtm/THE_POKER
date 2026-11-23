export type SkillType = 'SLEIGHT_OF_HAND' | 'EAGLE_EYE' | 'PRESSURE_AURA';

export type MiniGameType = 'TIMING_BAR' | 'BALANCE_CIRCLE' | 'RHYTHM_TAP';

export type SkillMasteryKey = 'sleightOfHand' | 'eagleEye' | 'pressureAura';

export interface SkillDefinition {
  type: SkillType;
  viaCost: number;
  miniGameType: MiniGameType;
  masteryKey: SkillMasteryKey;
  expOnSuccess: number;
  expOnFail: number;
}

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  SLEIGHT_OF_HAND: {
    type: 'SLEIGHT_OF_HAND',
    viaCost: 30,
    miniGameType: 'TIMING_BAR',
    masteryKey: 'sleightOfHand',
    expOnSuccess: 40,
    expOnFail: 10,
  },
  EAGLE_EYE: {
    type: 'EAGLE_EYE',
    viaCost: 50,
    miniGameType: 'BALANCE_CIRCLE',
    masteryKey: 'eagleEye',
    expOnSuccess: 35,
    expOnFail: 10,
  },
  PRESSURE_AURA: {
    type: 'PRESSURE_AURA',
    viaCost: 25,
    miniGameType: 'RHYTHM_TAP',
    masteryKey: 'pressureAura',
    expOnSuccess: 35,
    expOnFail: 10,
  },
};

export const MINIGAME_TIMEOUT_MS = 6000;
export const PRESSURE_AURA_TIME_PENALTY_SECONDS = 10;

export interface MiniGameParameters {
  /** Width of the valid success zone (0..1) for TIMING_BAR / BALANCE_CIRCLE */
  zoneWidth: number;
  /** Target zone start (0..1) */
  targetStart: number;
  /** Target zone end (0..1) */
  targetEnd: number;
  /** Cursor / ring / rhythm speed multiplier (lower = easier) */
  speedMultiplier: number;
  /** Minimum hold ratio (0..1) for BALANCE_CIRCLE */
  requiredBalanceRatio: number;
  /** Target beat offsets in ms for RHYTHM_TAP */
  rhythmBeatsMs: number[];
  /** Allowed timing tolerance in ms for RHYTHM_TAP */
  rhythmToleranceMs: number;
  /** Composite difficulty score (higher = harder) */
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
  /** TIMING_BAR: normalized stop position 0..1 */
  cursorPosition?: number;
  /** BALANCE_CIRCLE: sampled normalized distances from center (0 = perfect, 1 = edge) */
  balanceSamples?: number[];
  /** BALANCE_CIRCLE: optional pre-computed hold ratio if samples omitted (clamped & verified) */
  balanceHoldRatio?: number;
  /** RHYTHM_TAP: tap timestamps in ms relative to challenge start */
  tapTimestampsMs?: number[];
}

export interface DifficultyModifiers {
  masteryLevel: number;
  blessed: boolean;
  icedTeaActive: boolean;
  debtPressure: boolean;
  pressured: boolean;
}
