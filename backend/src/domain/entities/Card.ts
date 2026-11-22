export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
  code: string;
}

export const SUITS: readonly Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_TO_CHAR: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const CHAR_TO_RANK: Record<string, Rank> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const SUIT_TO_CHAR: Record<Suit, string> = {
  SPADES: 'S',
  HEARTS: 'H',
  DIAMONDS: 'D',
  CLUBS: 'C',
};

const CHAR_TO_SUIT: Record<string, Suit> = {
  S: 'SPADES',
  H: 'HEARTS',
  D: 'DIAMONDS',
  C: 'CLUBS',
};

export function createCard(rank: Rank, suit: Suit): Card {
  return {
    rank,
    suit,
    code: `${RANK_TO_CHAR[rank]}${SUIT_TO_CHAR[suit]}`,
  };
}

export function parseCard(code: string): Card {
  const normalized = code.trim().toUpperCase();
  const suitChar = normalized.slice(-1);
  const rankPart = normalized.slice(0, -1);
  const rank = CHAR_TO_RANK[rankPart];
  const suit = CHAR_TO_SUIT[suitChar];
  if (!rank || !suit) {
    throw new Error(`Invalid card code: "${code}"`);
  }
  return createCard(rank, suit);
}
