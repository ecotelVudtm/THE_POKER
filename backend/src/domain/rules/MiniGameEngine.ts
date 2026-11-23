import crypto from 'crypto';
import {
  DifficultyModifiers,
  MINIGAME_TIMEOUT_MS,
  MiniGameChallenge,
  MiniGameParameters,
  MiniGameSubmissionPayload,
  SKILL_DEFINITIONS,
  SkillType,
} from '../value-objects/Skill';

export interface MiniGameEvaluationResult {
  success: boolean;
  reason: string;
  accuracy: number;
  timedOut: boolean;
}

/**
 * Computes server-authoritative mini-game difficulty parameters.
 *
 * Scaling rules:
 * - Higher `masteryLevel` (1..10): widens success zone (+2.5% per level above 1), slows speed (-4% per level), widens rhythm tolerance (+12ms per level).
 * - `blessed` (INCENSE_BOWL): widens success zone by +20% relative.
 * - `icedTeaActive` (ICED_TEA): slows mini-game speed by 15%.
 * - `debtPressure` (overdue PHONE loan): increases difficulty by +20% (shrinks zone -20%, speeds up +20%).
 * - `pressured` (hit by PRESSURE_AURA): increases difficulty by +15% (shrinks zone -15%, speeds up +15%).
 */
export function computeMiniGameParameters(
  skillType: SkillType,
  modifiers: DifficultyModifiers
): MiniGameParameters {
  const clampedLevel = Math.max(1, Math.min(10, modifiers.masteryLevel));
  const levelBonus = clampedLevel - 1; // 0..9

  // Base zone width (0..1)
  let zoneWidth = 0.22 + levelBonus * 0.025;
  // Base speed multiplier (1.0 = standard, lower = easier)
  let speedMultiplier = 1.0 - levelBonus * 0.04;
  // Base balance ratio needed for BALANCE_CIRCLE
  let requiredBalanceRatio = 0.72 - levelBonus * 0.02;
  // Base rhythm tolerance in ms for RHYTHM_TAP (snappy & fair)
  let rhythmToleranceMs = 210 + levelBonus * 14;

  if (modifiers.blessed) {
    zoneWidth *= 1.2; // +20% (kept for scaling tests / legacy blessed modifier)
    rhythmToleranceMs *= 1.2;
    requiredBalanceRatio -= 0.06;
  }

  if (modifiers.icedTeaActive) {
    speedMultiplier *= 0.85; // -15% speed
    rhythmToleranceMs *= 1.1;
  }

  if (modifiers.debtPressure) {
    zoneWidth *= 0.8; // +20% harder
    speedMultiplier *= 1.2;
    rhythmToleranceMs *= 0.8;
    requiredBalanceRatio += 0.08;
  }

  if (modifiers.pressured) {
    zoneWidth *= 0.85; // +15% harder
    speedMultiplier *= 1.15;
    rhythmToleranceMs *= 0.85;
    requiredBalanceRatio += 0.05;
  }

  zoneWidth = Number(Math.max(0.08, Math.min(0.65, zoneWidth)).toFixed(4));
  speedMultiplier = Number(Math.max(0.45, Math.min(1.8, speedMultiplier)).toFixed(4));
  requiredBalanceRatio = Number(Math.max(0.45, Math.min(0.92, requiredBalanceRatio)).toFixed(4));
  rhythmToleranceMs = Math.round(Math.max(70, Math.min(350, rhythmToleranceMs)));

  // Center target zone randomly between 0.15 and 0.85 - zoneWidth
  const minStart = 0.12;
  const maxStart = Math.max(minStart, 0.88 - zoneWidth);
  const randomFraction = crypto.randomInt(0, 1000) / 1000;
  const targetStart = Number((minStart + randomFraction * (maxStart - minStart)).toFixed(4));
  const targetEnd = Number(Math.min(1, targetStart + zoneWidth).toFixed(4));

  // Rhythm beats for RHYTHM_TAP (3 beats scaled inversely by speedMultiplier)
  const baseBeats = [1000, 2100, 3200];
  const rhythmBeatsMs = baseBeats.map((ms) => Math.round(ms / speedMultiplier));

  // Composite difficulty score: higher = harder (useful for UI indicators & tests)
  const difficultyScore = Number(
    ((speedMultiplier / zoneWidth) * (skillType === 'SLEIGHT_OF_HAND' ? 1.05 : 1.0)).toFixed(3)
  );

  return {
    zoneWidth,
    targetStart,
    targetEnd,
    speedMultiplier,
    requiredBalanceRatio,
    rhythmBeatsMs,
    rhythmToleranceMs,
    difficultyScore,
  };
}

export function createMiniGameChallenge(params: {
  accountId: string;
  skillType: SkillType;
  modifiers: DifficultyModifiers;
  targetAccountId?: string;
  cardIndex?: 0 | 1;
  now?: number;
}): MiniGameChallenge {
  const def = SKILL_DEFINITIONS[params.skillType];
  const createdAt = params.now ?? Date.now();
  return {
    challengeId: crypto.randomUUID(),
    accountId: params.accountId,
    skillType: params.skillType,
    miniGameType: def.miniGameType,
    targetAccountId: params.targetAccountId,
    cardIndex: params.cardIndex,
    createdAt,
    expiresAt: createdAt + MINIGAME_TIMEOUT_MS,
    params: computeMiniGameParameters(params.skillType, params.modifiers),
  };
}

export function evaluateMiniGameSubmission(
  challenge: MiniGameChallenge,
  submission: MiniGameSubmissionPayload,
  now: number = Date.now()
): MiniGameEvaluationResult {
  if (submission.challengeId !== challenge.challengeId) {
    return {
      success: false,
      reason: 'Challenge ID mismatch',
      accuracy: 0,
      timedOut: false,
    };
  }

  if (now > challenge.expiresAt) {
    return {
      success: false,
      reason: 'Mini-game timed out (> 6s)',
      accuracy: 0,
      timedOut: true,
    };
  }

  const { params, miniGameType } = challenge;

  if (miniGameType === 'TIMING_BAR') {
    const pos = submission.cursorPosition;
    if (typeof pos !== 'number' || Number.isNaN(pos) || pos < 0 || pos > 1) {
      return { success: false, reason: 'Invalid cursorPosition', accuracy: 0, timedOut: false };
    }
    // Slight half-needle edge forgiveness (0.025) so touching the green border visually counts as a hit
    const edgeForgiveness = 0.025;
    const success =
      pos >= params.targetStart - edgeForgiveness && pos <= params.targetEnd + edgeForgiveness;
    const center = (params.targetStart + params.targetEnd) / 2;
    const dist = Math.abs(pos - center);
    const accuracy = Math.max(0, Number((1 - dist / (params.zoneWidth / 2 + edgeForgiveness)).toFixed(3)));
    return {
      success,
      reason: success ? 'Timing bar hit!' : 'Missed timing bar zone',
      accuracy: success ? accuracy : 0,
      timedOut: false,
    };
  }

  if (miniGameType === 'BALANCE_CIRCLE') {
    // Radius threshold derived from zoneWidth
    const maxAllowedRadius = Math.min(0.9, params.zoneWidth * 1.6);
    let ratio = 0;

    if (Array.isArray(submission.balanceSamples) && submission.balanceSamples.length >= 3) {
      const validSamples = submission.balanceSamples.filter(
        (v) => typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= 1
      );
      if (validSamples.length === 0) {
        return { success: false, reason: 'Invalid balance samples', accuracy: 0, timedOut: false };
      }
      const insideCount = validSamples.filter((d) => d <= maxAllowedRadius).length;
      ratio = insideCount / validSamples.length;
    } else if (
      typeof submission.balanceHoldRatio === 'number' &&
      !Number.isNaN(submission.balanceHoldRatio)
    ) {
      ratio = Math.max(0, Math.min(1, submission.balanceHoldRatio));
    } else {
      return { success: false, reason: 'Missing balance payload', accuracy: 0, timedOut: false };
    }

    const success = ratio >= params.requiredBalanceRatio;
    return {
      success,
      reason: success ? 'Balance maintained!' : 'Lost focus in balance circle',
      accuracy: Number(ratio.toFixed(3)),
      timedOut: false,
    };
  }

  // RHYTHM_TAP
  const taps = submission.tapTimestampsMs;
  if (!Array.isArray(taps) || taps.length !== params.rhythmBeatsMs.length) {
    return {
      success: false,
      reason: `Expected ${params.rhythmBeatsMs.length} rhythm taps`,
      accuracy: 0,
      timedOut: false,
    };
  }

  let totalAccuracy = 0;
  let hits = 0;
  for (let i = 0; i < params.rhythmBeatsMs.length; i++) {
    const tap = taps[i];
    if (typeof tap !== 'number' || Number.isNaN(tap) || tap < 0 || tap > MINIGAME_TIMEOUT_MS) {
      return { success: false, reason: 'Invalid tap timestamp', accuracy: 0, timedOut: false };
    }
    const diff = Math.abs(tap - params.rhythmBeatsMs[i]);
    if (diff <= params.rhythmToleranceMs) {
      hits += 1;
      totalAccuracy += 1 - diff / params.rhythmToleranceMs;
    }
  }

  const requiredHits = Math.ceil((params.rhythmBeatsMs.length * 2) / 3);
  const success = hits >= requiredHits;
  const accuracy = Number((totalAccuracy / params.rhythmBeatsMs.length).toFixed(3));
  return {
    success,
    reason: success
      ? `Rhythm matched (${hits}/${params.rhythmBeatsMs.length})!`
      : `Only ${hits}/${params.rhythmBeatsMs.length} beats matched (need ${requiredHits})`,
    accuracy,
    timedOut: false,
  };
}
