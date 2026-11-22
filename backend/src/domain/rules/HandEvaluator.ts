import { Card, Rank } from '../entities/Card';

export enum HandCategory {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export const HAND_CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HIGH_CARD]: 'High Card',
  [HandCategory.ONE_PAIR]: 'One Pair',
  [HandCategory.TWO_PAIR]: 'Two Pair',
  [HandCategory.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandCategory.STRAIGHT]: 'Straight',
  [HandCategory.FLUSH]: 'Flush',
  [HandCategory.FULL_HOUSE]: 'Full House',
  [HandCategory.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandCategory.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandCategory.ROYAL_FLUSH]: 'Royal Flush',
};

export interface EvaluatedHand {
  category: HandCategory;
  name: string;
  score: number;
  tieBreakers: number[];
  bestCards: Card[];
}

const BASE = 15;

function encodeScore(category: HandCategory, tieBreakers: number[]): number {
  const padded = [
    tieBreakers[0] ?? 0,
    tieBreakers[1] ?? 0,
    tieBreakers[2] ?? 0,
    tieBreakers[3] ?? 0,
    tieBreakers[4] ?? 0,
  ];
  return (
    category * BASE ** 5 +
    padded[0] * BASE ** 4 +
    padded[1] * BASE ** 3 +
    padded[2] * BASE ** 2 +
    padded[3] * BASE +
    padded[4]
  );
}

function getStraightHighCard(sortedRanksDesc: number[]): number | null {
  const unique = Array.from(new Set(sortedRanksDesc));
  if (unique.length !== 5) return null;

  // Normal straight: e.g. [14, 13, 12, 11, 10]
  if (unique[0] - unique[4] === 4) {
    return unique[0];
  }

  // Wheel straight: A-5-4-3-2 -> [14, 5, 4, 3, 2], high card is 5
  if (
    unique[0] === 14 &&
    unique[1] === 5 &&
    unique[2] === 4 &&
    unique[3] === 3 &&
    unique[4] === 2
  ) {
    return 5;
  }

  return null;
}

export function evaluateFiveCards(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error(`evaluateFiveCards requires exactly 5 cards, received ${cards.length}`);
  }

  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);

  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);
  const straightHigh = getStraightHighCard(ranks);
  const isStraight = straightHigh !== null;

  if (isFlush && isStraight) {
    const category =
      straightHigh === 14 ? HandCategory.ROYAL_FLUSH : HandCategory.STRAIGHT_FLUSH;
    const tieBreakers = [straightHigh];
    return {
      category,
      name: HAND_CATEGORY_NAMES[category],
      score: encodeScore(category, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  // Count rank frequencies
  const freqMap = new Map<Rank, number>();
  for (const r of ranks) {
    freqMap.set(r, (freqMap.get(r) ?? 0) + 1);
  }

  // Sort groups by frequency desc, then rank desc
  const groups = Array.from(freqMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const counts = groups.map((g) => g[1]);
  const groupRanks = groups.map((g) => g[0]);

  if (counts[0] === 4) {
    const tieBreakers = [groupRanks[0], groupRanks[1]];
    return {
      category: HandCategory.FOUR_OF_A_KIND,
      name: HAND_CATEGORY_NAMES[HandCategory.FOUR_OF_A_KIND],
      score: encodeScore(HandCategory.FOUR_OF_A_KIND, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const tieBreakers = [groupRanks[0], groupRanks[1]];
    return {
      category: HandCategory.FULL_HOUSE,
      name: HAND_CATEGORY_NAMES[HandCategory.FULL_HOUSE],
      score: encodeScore(HandCategory.FULL_HOUSE, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  if (isFlush) {
    return {
      category: HandCategory.FLUSH,
      name: HAND_CATEGORY_NAMES[HandCategory.FLUSH],
      score: encodeScore(HandCategory.FLUSH, ranks),
      tieBreakers: ranks,
      bestCards: sorted,
    };
  }

  if (isStraight) {
    const tieBreakers = [straightHigh!];
    return {
      category: HandCategory.STRAIGHT,
      name: HAND_CATEGORY_NAMES[HandCategory.STRAIGHT],
      score: encodeScore(HandCategory.STRAIGHT, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  if (counts[0] === 3) {
    const tieBreakers = [groupRanks[0], groupRanks[1], groupRanks[2]];
    return {
      category: HandCategory.THREE_OF_A_KIND,
      name: HAND_CATEGORY_NAMES[HandCategory.THREE_OF_A_KIND],
      score: encodeScore(HandCategory.THREE_OF_A_KIND, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    const tieBreakers = [groupRanks[0], groupRanks[1], groupRanks[2]];
    return {
      category: HandCategory.TWO_PAIR,
      name: HAND_CATEGORY_NAMES[HandCategory.TWO_PAIR],
      score: encodeScore(HandCategory.TWO_PAIR, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  if (counts[0] === 2) {
    const tieBreakers = [groupRanks[0], groupRanks[1], groupRanks[2], groupRanks[3]];
    return {
      category: HandCategory.ONE_PAIR,
      name: HAND_CATEGORY_NAMES[HandCategory.ONE_PAIR],
      score: encodeScore(HandCategory.ONE_PAIR, tieBreakers),
      tieBreakers,
      bestCards: sorted,
    };
  }

  return {
    category: HandCategory.HIGH_CARD,
    name: HAND_CATEGORY_NAMES[HandCategory.HIGH_CARD],
    score: encodeScore(HandCategory.HIGH_CARD, ranks),
    tieBreakers: ranks,
    bestCards: sorted,
  };
}

/**
 * Evaluates the best 5-card Texas Hold'em hand from 5, 6, or 7 cards.
 */
export function evaluateBestHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`evaluateBestHand requires at least 5 cards, received ${cards.length}`);
  }
  if (cards.length === 5) {
    return evaluateFiveCards(cards);
  }

  let best: EvaluatedHand | null = null;
  const n = cards.length;

  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            const evaluated = evaluateFiveCards([
              cards[i],
              cards[j],
              cards[k],
              cards[l],
              cards[m],
            ]);
            if (!best || evaluated.score > best.score) {
              best = evaluated;
            }
          }
        }
      }
    }
  }

  return best!;
}

/**
 * Estimates a player's current win probability (0..1) against active opponents.
 * Used for LUCKY_COIN passive check when going All-In and for Bot AI decisions.
 */
export function estimateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (holeCards.length < 2) return 0.1;

  if (communityCards.length >= 3) {
    const evaluated = evaluateBestHand([...holeCards, ...communityCards]);
    // Map category (0..9) + high rank kicker to approximate equity (0.12 .. 0.98)
    const categoryBase: Record<HandCategory, number> = {
      [HandCategory.HIGH_CARD]: 0.15,
      [HandCategory.ONE_PAIR]: 0.42,
      [HandCategory.TWO_PAIR]: 0.65,
      [HandCategory.THREE_OF_A_KIND]: 0.76,
      [HandCategory.STRAIGHT]: 0.83,
      [HandCategory.FLUSH]: 0.88,
      [HandCategory.FULL_HOUSE]: 0.93,
      [HandCategory.FOUR_OF_A_KIND]: 0.97,
      [HandCategory.STRAIGHT_FLUSH]: 0.99,
      [HandCategory.ROYAL_FLUSH]: 1.0,
    };
    const highKickerBonus = ((evaluated.tieBreakers[0] ?? 7) - 2) / 12 * 0.1;
    return Math.min(1, Math.max(0.05, categoryBase[evaluated.category] + highKickerBonus));
  }

  // Pre-flop Chen-inspired strength estimate (0.10 .. 0.85)
  const [c1, c2] = [...holeCards].sort((a, b) => b.rank - a.rank);
  const isPair = c1.rank === c2.rank;
  const isSuited = c1.suit === c2.suit;
  const gap = c1.rank - c2.rank;

  let score = (c1.rank / 14) * 0.35 + (c2.rank / 14) * 0.15;
  if (isPair) score += 0.28 + (c1.rank / 14) * 0.12;
  if (isSuited) score += 0.06;
  if (gap === 1) score += 0.05;
  else if (gap === 2) score += 0.02;
  else if (gap >= 5 && !isPair) score -= 0.1;

  return Math.min(0.88, Math.max(0.08, score));
}
