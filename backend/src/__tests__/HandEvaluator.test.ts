import { describe, expect, it } from 'vitest';
import { parseCard } from '../domain/entities/Card';
import {
  evaluateBestHand,
  evaluateFiveCards,
  HandCategory,
} from '../domain/rules/HandEvaluator';
import { calculateSidePots, distributePots } from '../domain/rules/PotCalculator';

const cards = (codes: string[]) => codes.map(parseCard);

describe('Texas Hold\'em HandEvaluator', () => {
  it('accurately identifies all 10 hand categories from High Card to Royal Flush', () => {
    expect(
      evaluateFiveCards(cards(['AS', 'KD', '9C', '5H', '2S'])).category
    ).toBe(HandCategory.HIGH_CARD);

    expect(
      evaluateFiveCards(cards(['AS', 'AD', '9C', '5H', '2S'])).category
    ).toBe(HandCategory.ONE_PAIR);

    expect(
      evaluateFiveCards(cards(['AS', 'AD', '9C', '9H', '2S'])).category
    ).toBe(HandCategory.TWO_PAIR);

    expect(
      evaluateFiveCards(cards(['KS', 'KD', 'KC', '5H', '2S'])).category
    ).toBe(HandCategory.THREE_OF_A_KIND);

    expect(
      evaluateFiveCards(cards(['9S', '8D', '7C', '6H', '5S'])).category
    ).toBe(HandCategory.STRAIGHT);

    expect(
      evaluateFiveCards(cards(['AS', 'JS', '8S', '5S', '2S'])).category
    ).toBe(HandCategory.FLUSH);

    expect(
      evaluateFiveCards(cards(['QS', 'QD', 'QC', '7H', '7S'])).category
    ).toBe(HandCategory.FULL_HOUSE);

    expect(
      evaluateFiveCards(cards(['TS', 'TD', 'TC', 'TH', '2S'])).category
    ).toBe(HandCategory.FOUR_OF_A_KIND);

    expect(
      evaluateFiveCards(cards(['9H', '8H', '7H', '6H', '5H'])).category
    ).toBe(HandCategory.STRAIGHT_FLUSH);

    expect(
      evaluateFiveCards(cards(['AS', 'KS', 'QS', 'JS', 'TS'])).category
    ).toBe(HandCategory.ROYAL_FLUSH);
  });

  it('handles Wheel Straight (A-2-3-4-5) with high card 5 losing to 6-high straight', () => {
    const wheel = evaluateFiveCards(cards(['AS', '2D', '3C', '4H', '5S']));
    const sixHigh = evaluateFiveCards(cards(['6S', '2D', '3C', '4H', '5S']));

    expect(wheel.category).toBe(HandCategory.STRAIGHT);
    expect(wheel.tieBreakers[0]).toBe(5);
    expect(sixHigh.score).toBeGreaterThan(wheel.score);
  });

  it('selects the optimal 5-card hand out of 7 cards and compares kickers accurately', () => {
    const board = cards(['KS', 'KH', '7D', '4C', '2S']);
    const handAceKicker = evaluateBestHand([...cards(['AS', '3D']), ...board]);
    const handQueenKicker = evaluateBestHand([...cards(['QD', 'JD']), ...board]);

    expect(handAceKicker.category).toBe(HandCategory.ONE_PAIR);
    expect(handQueenKicker.category).toBe(HandCategory.ONE_PAIR);
    expect(handAceKicker.score).toBeGreaterThan(handQueenKicker.score);
  });

  it('splits pots evenly when two players have identical 5-card hands', () => {
    const board = cards(['AS', 'KS', 'QS', 'JS', '2D']);
    const p1 = evaluateBestHand([...cards(['TS', '3C']), ...board]); // Royal Flush
    const p2 = evaluateBestHand([...cards(['9S', '8S']), ...board]); // Flush

    // Tie scenario: both play the board straight
    const tieBoard = cards(['TD', '9C', '8H', '7S', '6D']);
    const t1 = evaluateBestHand([...cards(['2S', '3S']), ...tieBoard]);
    const t2 = evaluateBestHand([...cards(['2H', '4H']), ...tieBoard]);
    expect(t1.score).toBe(t2.score);
    expect(p1.score).toBeGreaterThan(p2.score);

    const pots = calculateSidePots([
      { accountId: 'p1', totalBetInHand: 500, folded: false },
      { accountId: 'p2', totalBetInHand: 500, folded: false },
    ]);
    const payouts = distributePots(
      pots,
      new Map([
        ['p1', t1],
        ['p2', t2],
      ])
    );
    expect(payouts).toEqual([
      { accountId: 'p1', amount: 500 },
      { accountId: 'p2', amount: 500 },
    ]);
  });

  it('calculates Main Pot and Side Pot accurately when a short-stack goes All-In', () => {
    // P1 all-in 200 (strongest hand), P2 bets 600 (second), P3 bets 600 (weakest)
    const pots = calculateSidePots([
      { accountId: 'p1', totalBetInHand: 200, folded: false },
      { accountId: 'p2', totalBetInHand: 600, folded: false },
      { accountId: 'p3', totalBetInHand: 600, folded: false },
    ]);

    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({
      amount: 600, // 200 * 3
      eligibleAccountIds: ['p1', 'p2', 'p3'],
    });
    expect(pots[1]).toEqual({
      amount: 800, // 400 * 2
      eligibleAccountIds: ['p2', 'p3'],
    });

    const board = cards(['2C', '7D', '9H', 'JS', '3D']);
    const hands = new Map([
      ['p1', evaluateBestHand([...cards(['AS', 'AH']), ...board])], // Pair of Aces
      ['p2', evaluateBestHand([...cards(['KS', 'KH']), ...board])], // Pair of Kings
      ['p3', evaluateBestHand([...cards(['QS', 'QH']), ...board])], // Pair of Queens
    ]);

    const payouts = distributePots(pots, hands);
    const payoutMap = new Map(payouts.map((p) => [p.accountId, p.amount]));
    expect(payoutMap.get('p1')).toBe(600);
    expect(payoutMap.get('p2')).toBe(800);
    expect(payoutMap.get('p3')).toBeUndefined();
  });
});
