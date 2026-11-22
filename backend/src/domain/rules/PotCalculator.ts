import { SidePot } from '../entities/Room';
import { EvaluatedHand } from './HandEvaluator';

export interface PlayerContribution {
  accountId: string;
  totalBetInHand: number;
  folded: boolean;
}

export interface PotPayout {
  accountId: string;
  amount: number;
}

/**
 * Builds Main Pot and Side Pots based on each player's total bet in the hand.
 * Folded players' chips remain in the pots, but only non-folded players are eligible to win them.
 */
export function calculateSidePots(contributions: PlayerContribution[]): SidePot[] {
  const activeContribs = contributions.filter((c) => c.totalBetInHand > 0);
  if (activeContribs.length === 0) return [];

  // Unique ascending bet thresholds from non-folded (or all-in) contributors
  const levels = Array.from(
    new Set(activeContribs.map((c) => c.totalBetInHand))
  ).sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (const level of levels) {
    const slice = level - prevLevel;
    if (slice <= 0) continue;

    let sliceAmount = 0;
    const eligibleAccountIds: string[] = [];

    for (const c of activeContribs) {
      if (c.totalBetInHand >= level) {
        sliceAmount += slice;
        if (!c.folded) {
          eligibleAccountIds.push(c.accountId);
        }
      } else if (c.totalBetInHand > prevLevel) {
        sliceAmount += c.totalBetInHand - prevLevel;
      }
    }

    if (sliceAmount > 0) {
      // Merge with previous pot if eligible set is identical
      const prevPot = pots[pots.length - 1];
      if (
        prevPot &&
        prevPot.eligibleAccountIds.length === eligibleAccountIds.length &&
        prevPot.eligibleAccountIds.every((id, i) => id === eligibleAccountIds[i])
      ) {
        prevPot.amount += sliceAmount;
      } else {
        pots.push({ amount: sliceAmount, eligibleAccountIds });
      }
    }

    prevLevel = level;
  }

  return pots;
}

/**
 * Distributes main pot & side pots among winners, handling Split Pots cleanly.
 * Odd chips from uneven splits are awarded 1-by-1 in order of eligible winners.
 */
export function distributePots(
  pots: SidePot[],
  evaluatedHands: Map<string, EvaluatedHand>
): PotPayout[] {
  const payoutMap = new Map<string, number>();

  for (const pot of pots) {
    const contenders = pot.eligibleAccountIds.filter((id) => evaluatedHands.has(id));
    if (contenders.length === 0) continue;

    let highestScore = -1;
    let winners: string[] = [];

    for (const accountId of contenders) {
      const hand = evaluatedHands.get(accountId)!;
      if (hand.score > highestScore) {
        highestScore = hand.score;
        winners = [accountId];
      } else if (hand.score === highestScore) {
        winners.push(accountId);
      }
    }

    const baseShare = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - baseShare * winners.length;

    for (const winnerId of winners) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      payoutMap.set(winnerId, (payoutMap.get(winnerId) ?? 0) + baseShare + extra);
    }
  }

  return Array.from(payoutMap.entries()).map(([accountId, amount]) => ({
    accountId,
    amount,
  }));
}
