import crypto from 'crypto';
import { Card, createCard, RANKS, SUITS } from './Card';

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

  public peekNext(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards[this.cards.length - 1];
  }

  public remaining(): number {
    return this.cards.length;
  }
}
