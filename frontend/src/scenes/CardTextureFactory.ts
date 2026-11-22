import * as THREE from 'three';
import { Card, Rank, Suit } from '../types/game';
import { SCENE_TOKENS } from '../styles/themeTokens';

const frontTextureCache = new Map<string, THREE.CanvasTexture>();
let cachedBackTexture: THREE.CanvasTexture | null = null;

const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

export function getCardFrontTexture(card: Card): THREE.CanvasTexture {
  const existing = frontTextureCache.get(card.code);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const ink = isRed ? SCENE_TOKENS.cards.suitRed : SCENE_TOKENS.cards.suitBlack;

  // Paper background with subtle warm card border
  ctx.fillStyle = SCENE_TOKENS.cards.paperFront;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = SCENE_TOKENS.cards.paperEdge;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  // Inner thin ornamental frame
  ctx.strokeStyle = isRed ? 'rgba(201, 42, 42, 0.16)' : 'rgba(31, 35, 40, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  const rankLabel = RANK_LABELS[card.rank];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 50px "Be Vietnam Pro", sans-serif';
  ctx.fillText(rankLabel, 26, 22);
  ctx.font = '44px serif';
  ctx.fillText(suitSymbol, 28, 72);

  // Center emblem
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '122px serif';
  ctx.fillText(suitSymbol, canvas.width / 2, canvas.height / 2 + 4);

  // Bottom-right rotated corner
  ctx.save();
  ctx.translate(canvas.width, canvas.height);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 50px "Be Vietnam Pro", sans-serif';
  ctx.fillText(rankLabel, 26, 22);
  ctx.font = '44px serif';
  ctx.fillText(suitSymbol, 28, 72);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  frontTextureCache.set(card.code, texture);
  return texture;
}

/**
 * Vietnamese Đông Sơn bronze-drum inspired ornamental back texture.
 */
export function getCardBackTexture(): THREE.CanvasTexture {
  if (cachedBackTexture) return cachedBackTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  // Warm lacquer crimson-brown base
  ctx.fillStyle = SCENE_TOKENS.cards.backBase;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer cream border
  ctx.strokeStyle = SCENE_TOKENS.cards.backBorder;
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

  // Inner gold double frame
  ctx.strokeStyle = SCENE_TOKENS.cards.backPattern;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Concentric bronze-drum rings
  ctx.strokeStyle = SCENE_TOKENS.cards.backPattern;
  for (const r of [24, 52, 76, 92]) {
    ctx.lineWidth = r === 76 ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 12-ray central Đông Sơn sun star
  ctx.fillStyle = SCENE_TOKENS.cards.backPattern;
  const rays = 12;
  ctx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const radius = i % 2 === 0 ? 48 : 20;
    const angle = (i * Math.PI) / rays - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Corner lotus dots
  const corners: [number, number][] = [
    [42, 42],
    [canvas.width - 42, 42],
    [42, canvas.height - 42],
    [canvas.width - 42, canvas.height - 42],
  ];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cachedBackTexture = texture;
  return texture;
}
