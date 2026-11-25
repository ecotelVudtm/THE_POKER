import { Fragment, ReactNode } from 'react';
import { Card, Suit } from '../../types/game';

export interface PixelSuitIconProps {
  suit: Suit;
  size?: number;
  className?: string;
}

/**
 * Crisp 9×9 pixel-art vector suit emblems (♠ ♥ ♦ ♣) rendered with `crispEdges`
 * so poker suits look authentically voxel/pixelated at every size.
 */
export function PixelSuitIcon({ suit, size = 14, className = '' }: PixelSuitIconProps) {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorCls = className || (isRed ? 'text-status-danger' : 'text-content-primary');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 9 9"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-label={suit}
      className={`inline-block shrink-0 align-middle ${colorCls}`}
    >
      {suit === 'HEARTS' && (
        <>
          <rect x="1" y="1" width="2" height="1" />
          <rect x="6" y="1" width="2" height="1" />
          <rect x="0" y="2" width="4" height="2" />
          <rect x="5" y="2" width="4" height="2" />
          <rect x="4" y="3" width="1" height="1" />
          <rect x="1" y="4" width="7" height="1" />
          <rect x="2" y="5" width="5" height="1" />
          <rect x="3" y="6" width="3" height="1" />
          <rect x="4" y="7" width="1" height="1" />
        </>
      )}

      {suit === 'DIAMONDS' && (
        <>
          <rect x="4" y="0" width="1" height="1" />
          <rect x="3" y="1" width="3" height="1" />
          <rect x="2" y="2" width="5" height="1" />
          <rect x="1" y="3" width="7" height="3" />
          <rect x="2" y="6" width="5" height="1" />
          <rect x="3" y="7" width="3" height="1" />
          <rect x="4" y="8" width="1" height="1" />
        </>
      )}

      {suit === 'SPADES' && (
        <>
          <rect x="4" y="0" width="1" height="1" />
          <rect x="3" y="1" width="3" height="1" />
          <rect x="2" y="2" width="5" height="1" />
          <rect x="1" y="3" width="7" height="2" />
          <rect x="0" y="4" width="9" height="2" />
          <rect x="1" y="6" width="2" height="1" />
          <rect x="6" y="6" width="2" height="1" />
          <rect x="4" y="6" width="1" height="2" />
          <rect x="3" y="8" width="3" height="1" />
        </>
      )}

      {suit === 'CLUBS' && (
        <>
          <rect x="3" y="0" width="3" height="3" />
          <rect x="0" y="3" width="3" height="3" />
          <rect x="6" y="3" width="3" height="3" />
          <rect x="3" y="3" width="3" height="3" />
          <rect x="4" y="6" width="1" height="2" />
          <rect x="3" y="8" width="3" height="1" />
        </>
      )}
    </svg>
  );
}

export function formatCardRankLabel(rank: Card['rank'] | string): string {
  if (rank === 14 || rank === 'A') return 'A';
  if (rank === 13 || rank === 'K') return 'K';
  if (rank === 12 || rank === 'Q') return 'Q';
  if (rank === 11 || rank === 'J') return 'J';
  if (rank === 10 || rank === 'T' || rank === '10') return '10';
  return String(rank);
}

export function suitCharToSuit(ch: string): Suit | null {
  switch (ch.toUpperCase()) {
    case 'S':
    case '♠':
      return 'SPADES';
    case 'H':
    case '♥':
      return 'HEARTS';
    case 'D':
    case '♦':
      return 'DIAMONDS';
    case 'C':
    case '♣':
      return 'CLUBS';
    default:
      return null;
  }
}

export interface CardLabelProps {
  card: Card;
  iconSize?: number;
  darkBg?: boolean;
  className?: string;
}

/**
 * Renders a card as crisp rank + pixel suit icon (e.g. `3` + ♥ pixel icon) instead of raw `3H`.
 */
export function CardLabel({
  card,
  iconSize = 14,
  darkBg = true,
  className = '',
}: CardLabelProps) {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const colorCls = isRed
    ? 'text-status-danger'
    : darkBg
      ? 'text-content-primary'
      : 'text-content-inverse';

  return (
    <span className={`inline-flex items-center gap-0.5 font-mono font-extrabold ${colorCls} ${className}`}>
      <span>{formatCardRankLabel(card.rank)}</span>
      <PixelSuitIcon suit={card.suit} size={iconSize} className={colorCls} />
    </span>
  );
}

const CARD_CODE_TOKEN_REGEX = /\b(10|[2-9TJQKA])([SHDC♠♥♦♣])\b/g;

/**
 * Replaces any raw card codes (like `3H`, `AS`, `TD`, `K♠`) inside chat/notification strings
 * with crisp inline rank + pixel suit icons!
 */
export function renderTextWithPixelCards(text: string, iconSize = 11): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CARD_CODE_TOKEN_REGEX.lastIndex = 0;

  while ((match = CARD_CODE_TOKEN_REGEX.exec(text)) !== null) {
    const [full, rawRank, rawSuit] = match;
    const suit = suitCharToSuit(rawSuit);
    if (!suit) continue;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
    const colorCls = isRed ? 'text-status-danger' : 'text-content-primary';
    parts.push(
      <span
        key={`${match.index}_${full}`}
        className={`mx-0.5 inline-flex items-center gap-0.5 font-mono font-bold ${colorCls}`}
      >
        <span>{formatCardRankLabel(rawRank)}</span>
        <PixelSuitIcon suit={suit} size={iconSize} className={colorCls} />
      </span>
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.map((node, i) => <Fragment key={i}>{node}</Fragment>);
}
