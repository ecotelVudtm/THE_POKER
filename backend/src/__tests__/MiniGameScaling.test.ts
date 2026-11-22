import { describe, expect, it } from 'vitest';
import { applyMasteryExp, createDefaultSkillMastery } from '../domain/entities/Account';
import {
  computeMiniGameParameters,
  createMiniGameChallenge,
  evaluateMiniGameSubmission,
} from '../domain/rules/MiniGameEngine';
import { MINIGAME_TIMEOUT_MS } from '../domain/value-objects/Skill';

describe('Mini-Game Mastery Scaling & Server Verification', () => {
  it('reduces difficulty as skillMastery.level increases', () => {
    const baseModifiers = {
      blessed: false,
      icedTeaActive: false,
      debtPressure: false,
      pressured: false,
    };

    const lv1 = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      ...baseModifiers,
      masteryLevel: 1,
    });
    const lv5 = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      ...baseModifiers,
      masteryLevel: 5,
    });
    const lv10 = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      ...baseModifiers,
      masteryLevel: 10,
    });

    expect(lv5.zoneWidth).toBeGreaterThan(lv1.zoneWidth);
    expect(lv10.zoneWidth).toBeGreaterThan(lv5.zoneWidth);

    expect(lv5.speedMultiplier).toBeLessThan(lv1.speedMultiplier);
    expect(lv10.speedMultiplier).toBeLessThan(lv5.speedMultiplier);

    expect(lv5.difficultyScore).toBeLessThan(lv1.difficultyScore);
    expect(lv10.difficultyScore).toBeLessThan(lv5.difficultyScore);
  });

  it('applies blessed (+20% zone), icedTea (-15% speed), and debtPressure (+20% difficulty)', () => {
    const baseline = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      masteryLevel: 1,
      blessed: false,
      icedTeaActive: false,
      debtPressure: false,
      pressured: false,
    });

    const blessed = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      masteryLevel: 1,
      blessed: true,
      icedTeaActive: false,
      debtPressure: false,
      pressured: false,
    });
    expect(blessed.zoneWidth).toBeCloseTo(baseline.zoneWidth * 1.2, 3);

    const icedTea = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      masteryLevel: 1,
      blessed: false,
      icedTeaActive: true,
      debtPressure: false,
      pressured: false,
    });
    expect(icedTea.speedMultiplier).toBeCloseTo(baseline.speedMultiplier * 0.85, 3);

    const debt = computeMiniGameParameters('SLEIGHT_OF_HAND', {
      masteryLevel: 1,
      blessed: false,
      icedTeaActive: false,
      debtPressure: true,
      pressured: false,
    });
    expect(debt.zoneWidth).toBeLessThan(baseline.zoneWidth);
    expect(debt.speedMultiplier).toBeGreaterThan(baseline.speedMultiplier);
    expect(debt.difficultyScore).toBeGreaterThan(baseline.difficultyScore);
  });

  it('verifies TIMING_BAR submissions authoritatively and rejects expired (>6s) payloads', () => {
    const startTime = 1_700_000_000_000;
    const challenge = createMiniGameChallenge({
      accountId: 'acc_1',
      skillType: 'SLEIGHT_OF_HAND',
      cardIndex: 0,
      now: startTime,
      modifiers: {
        masteryLevel: 3,
        blessed: false,
        icedTeaActive: false,
        debtPressure: false,
        pressured: false,
      },
    });

    const midPoint = (challenge.params.targetStart + challenge.params.targetEnd) / 2;

    // Valid hit within 6 seconds
    const passRes = evaluateMiniGameSubmission(
      challenge,
      { challengeId: challenge.challengeId, cursorPosition: midPoint },
      startTime + 2500
    );
    expect(passRes.success).toBe(true);
    expect(passRes.timedOut).toBe(false);

    // Miss outside zone
    const outsidePos = challenge.params.targetStart > 0.05 ? 0.01 : 0.99;
    const failRes = evaluateMiniGameSubmission(
      challenge,
      { challengeId: challenge.challengeId, cursorPosition: outsidePos },
      startTime + 2500
    );
    expect(failRes.success).toBe(false);

    // Expired after 6 seconds even with perfect cursorPosition
    const timeoutRes = evaluateMiniGameSubmission(
      challenge,
      { challengeId: challenge.challengeId, cursorPosition: midPoint },
      startTime + MINIGAME_TIMEOUT_MS + 1
    );
    expect(timeoutRes.success).toBe(false);
    expect(timeoutRes.timedOut).toBe(true);
  });

  it('levels up skillMastery EXP properly', () => {
    const mastery = createDefaultSkillMastery();
    const res1 = applyMasteryExp(mastery, 'sleightOfHand', 120);
    expect(res1.leveledUp).toBe(true);
    expect(res1.newLevel).toBe(2);
    expect(res1.updatedMastery.sleightOfHand.exp).toBe(20);
  });

  it('passes RHYTHM_TAP when at least 2 of 3 beats match within tolerance', () => {
    const startTime = 1_700_000_000_000;
    const challenge = createMiniGameChallenge({
      accountId: 'acc_2',
      skillType: 'PRESSURE_AURA',
      targetAccountId: 'acc_3',
      now: startTime,
      modifiers: {
        masteryLevel: 2,
        blessed: false,
        icedTeaActive: false,
        debtPressure: false,
        pressured: false,
      },
    });

    const [b1, b2, b3] = challenge.params.rhythmBeatsMs;
    const twoOfThree = evaluateMiniGameSubmission(
      challenge,
      {
        challengeId: challenge.challengeId,
        tapTimestampsMs: [b1 + 20, b2 - 15, b3 + 900],
      },
      startTime + 4200
    );
    expect(twoOfThree.success).toBe(true);

    const oneOfThree = evaluateMiniGameSubmission(
      challenge,
      {
        challengeId: challenge.challengeId,
        tapTimestampsMs: [b1 + 20, b2 + 900, b3 + 900],
      },
      startTime + 4200
    );
    expect(oneOfThree.success).toBe(false);
  });
});
