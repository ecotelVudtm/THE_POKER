import crypto from 'crypto';
import { Card, createCard, RANKS, SUITS } from './Card';
import { evaluateBestHand, HandCategory } from '../rules/HandEvaluator';

export class Deck {
  private cards: Card[] = [];

  constructor(initialCards?: Card[]) {
    if (initialCards) {
      this.cards = [...initialCards];
    } else {
      this.reset();
    }
  }

  public reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(createCard(rank, suit));
      }
    }
    this.shuffle();
  }

  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const tmp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = tmp;
    }
  }

  public draw(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new Error('Deck is empty');
    }
    return card;
  }

  /**
   * Slight blessing boost used when INCENSE_BOWL (`blessed: true`) is active.
   * Inspects up to 3 top cards and slightly favors a card that connects by rank or suit
   * with the player's existing cards (35% chance to pick the best-connected candidate).
   */
  public drawBiased(referenceCards: Card[]): Card {
    if (this.cards.length < 3 || referenceCards.length === 0) {
      return this.draw();
    }

    const roll = crypto.randomInt(0, 100);
    if (roll >= 35) {
      return this.draw();
    }

    const topIndices = [this.cards.length - 1, this.cards.length - 2, this.cards.length - 3];
    let bestIndex = topIndices[0];
    let bestScore = -1;

    for (const idx of topIndices) {
      const candidate = this.cards[idx];
      let score = 0;
      for (const ref of referenceCards) {
        if (candidate.rank === ref.rank) score += 3;
        if (candidate.suit === ref.suit) score += 1;
        if (Math.abs(candidate.rank - ref.rank) === 1) score += 1;
      }
      if (candidate.rank >= 11) score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    }

    const [chosen] = this.cards.splice(bestIndex, 1);
    return chosen;
  }

  /**
   * Incense Bowl luck draw for SLEIGHT_OF_HAND (1..5 burning sticks):
   * Base chances by stick tier:
   * - 1 stick:  80% ONE_PAIR
   * - 2 sticks: 70% TWO_PAIR        (ONE_PAIR +2% -> 82%)
   * - 3 sticks: 60% THREE_OF_A_KIND (TWO_PAIR 72%, ONE_PAIR 84%)
   * - 4 sticks: 50% STRAIGHT        (THREE_OF_A_KIND 62%, TWO_PAIR 74%, ONE_PAIR 86%)
   * - 5 sticks: 40% FLUSH           (STRAIGHT 52%, THREE_OF_A_KIND 64%, TWO_PAIR 76%, ONE_PAIR 88%)
   * Every lower tier gains +2% per upgrade above it, strictly clamped to <= 100% (no overflow).
   * Evaluated top-down from `sticks` to 1; unreachable tiers on the current board fall through naturally.
   */
  public drawWithIncenseLuck(
    keptCard: Card,
    communityCards: Card[],
    sticks: number
  ): Card {
    if (sticks <= 0 || this.cards.length === 0) {
      return this.draw();
    }

    const clampedSticks = Math.min(5, Math.max(1, sticks));
    const tiers: { level: number; category: HandCategory; baseChance: number }[] = [
      { level: 1, category: HandCategory.ONE_PAIR, baseChance: 80 },
      { level: 2, category: HandCategory.TWO_PAIR, baseChance: 70 },
      { level: 3, category: HandCategory.THREE_OF_A_KIND, baseChance: 60 },
      { level: 4, category: HandCategory.STRAIGHT, baseChance: 50 },
      { level: 5, category: HandCategory.FLUSH, baseChance: 40 },
    ];

    // Score every remaining card in the deck when paired with keptCard + communityCards
    const scored = this.cards.map((candidate, index) => {
      const combined = [keptCard, candidate, ...communityCards];
      let category = HandCategory.HIGH_CARD;
      let score: number = candidate.rank;

      if (combined.length >= 5) {
        const evaluated = evaluateBestHand(combined);
        category = evaluated.category;
        score = evaluated.score;
      } else {
        // Pre-flop (only 2 cards): check pair / suited high connector
        if (candidate.rank === keptCard.rank) {
          category = HandCategory.ONE_PAIR;
          score = 1000 + candidate.rank * 20;
        } else {
          score = candidate.rank * 10 + (candidate.suit === keptCard.suit ? 5 : 0);
        }
      }
      return { index, candidate, category, score };
    });

    // Cascade from current stick tier down to tier 1; each lower tier gains +2% per upgrade, capped at 100%
    for (let level = clampedSticks; level >= 1; level--) {
      const tier = tiers[level - 1];
      const upgradeBonus = (clampedSticks - level) * 2;
      const effectiveChance = Math.min(100, Math.max(0, tier.baseChance + upgradeBonus));

      const matches = scored.filter((s) => s.category >= tier.category);
      if (matches.length > 0 && crypto.randomInt(0, 100) < effectiveChance) {
        const chosen = matches[crypto.randomInt(0, matches.length)];
        return this.cards.splice(chosen.index, 1)[0];
      }
    }

    // If all luck rolls missed or no pair/combo is reachable on board, normal random draw
    return this.draw();
  }

  public peekNext(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards[this.cards.length - 1];
  }

  public remaining(): number {
    return this.cards.length;
  }
}
