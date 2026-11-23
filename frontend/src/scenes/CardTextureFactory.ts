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

/**
 * Crisp pixel-styled playing card front texture (NearestFilter for sharp voxel look).
 */
export function getCardFrontTexture(card: Card): THREE.CanvasTexture {
  const existing = frontTextureCache.get(card.code);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const ink = isRed ? SCENE_TOKENS.cards.suitRed : SCENE_TOKENS.cards.suitBlack;

  // Warm cream card base
  ctx.fillStyle = '#fcf8ef';
  ctx.fillRect(0, 0, 160, 224);

  // Crisp blocky pixel border
  ctx.fillStyle = '#dfd4be';
  ctx.fillRect(0, 0, 160, 6);
  ctx.fillRect(0, 218, 160, 6);
  ctx.fillRect(0, 0, 6, 224);
  ctx.fillRect(154, 0, 6, 224);

  const rankLabel = RANK_LABELS[card.rank];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 34px "JetBrains Mono", monospace';
  ctx.fillText(rankLabel, 14, 12);
  ctx.font = '30px serif';
  ctx.fillText(suitSymbol, 16, 46);

  // Center bold suit
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '82px serif';
  ctx.fillText(suitSymbol, 80, 116);

  // Mirrored bottom-right
  ctx.save();
  ctx.translate(160, 224);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 34px "JetBrains Mono", monospace';
  ctx.fillText(rankLabel, 14, 12);
  ctx.font = '30px serif';
  ctx.fillText(suitSymbol, 16, 46);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  frontTextureCache.set(card.code, texture);
  return texture;
}

/** Pixel-art Đông Sơn geometric voxel card back */
export function getCardBackTexture(): THREE.CanvasTexture {
  if (cachedBackTexture) return cachedBackTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 88;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Cream pixel border
  ctx.fillStyle = '#fcf6e8';
  ctx.fillRect(0, 0, 64, 88);

  // Crimson lacquer body
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(4, 4, 56, 80);

  // Gold pixel frame
  ctx.fillStyle = '#eab308';
  ctx.fillRect(8, 8, 48, 2);
  ctx.fillRect(8, 78, 48, 2);
  ctx.fillRect(8, 8, 2, 72);
  ctx.fillRect(54, 8, 2, 72);

  // Stepped pixel diamond / Đông Sơn sun center
  const cx = 32;
  const cy = 44;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - 4, cy - 16, 8, 32);
  ctx.fillRect(cx - 16, cy - 4, 32, 8);
  ctx.fillRect(cx - 10, cy - 10, 20, 20);
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(cx - 6, cy - 6, 12, 12);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);

  // Corner pixel diamonds
  for (const [x, y] of [
    [14, 14],
    [46, 14],
    [14, 70],
    [46, 70],
  ]) {
    ctx.fillRect(x, y, 4, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  cachedBackTexture = texture;
  return texture;
}
