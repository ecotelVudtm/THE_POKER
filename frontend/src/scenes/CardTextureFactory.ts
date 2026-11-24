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
 * High-detail pixel-styled playing card front texture:
 * Oversized legible rank & suit, vintage inner frame, and golden court medallion for J/Q/K/A.
 */
export function getCardFrontTexture(card: Card): THREE.CanvasTexture {
  const existing = frontTextureCache.get(card.code);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 268;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const isCourt = card.rank >= 11;
  const ink = isRed ? SCENE_TOKENS.cards.suitRed : SCENE_TOKENS.cards.suitBlack;

  // Warm parchment ivory card stock
  ctx.fillStyle = '#fcf8ef';
  ctx.fillRect(0, 0, 192, 268);

  // Outer stepped border
  ctx.fillStyle = '#d9ccb2';
  ctx.fillRect(0, 0, 192, 6);
  ctx.fillRect(0, 262, 192, 6);
  ctx.fillRect(0, 0, 6, 268);
  ctx.fillRect(186, 0, 6, 268);

  // Inner fine border frame (gold for J/Q/K/A, warm tan for number cards)
  ctx.fillStyle = isCourt ? '#d4a138' : '#e6dcc8';
  ctx.fillRect(12, 12, 168, 3);
  ctx.fillRect(12, 253, 168, 3);
  ctx.fillRect(12, 12, 3, 244);
  ctx.fillRect(177, 12, 3, 244);

  // Court card ornamental center frame & pixel crown
  if (isCourt) {
    ctx.fillStyle = 'rgba(212, 161, 56, 0.14)';
    ctx.fillRect(38, 66, 116, 136);
    ctx.fillStyle = '#d4a138';
    ctx.fillRect(38, 66, 116, 3);
    ctx.fillRect(38, 199, 116, 3);
    ctx.fillRect(38, 66, 3, 136);
    ctx.fillRect(151, 66, 3, 136);

    // Small pixel crown above center emblem for J/Q/K/A
    ctx.fillStyle = '#eab308';
    ctx.fillRect(78, 76, 36, 8);
    ctx.fillRect(78, 70, 6, 6);
    ctx.fillRect(93, 68, 6, 8);
    ctx.fillRect(108, 70, 6, 6);
  }

  const rankLabel = RANK_LABELS[card.rank];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  // Oversized top-left rank & suit
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 40px "JetBrains Mono", monospace';
  ctx.fillText(rankLabel, 18, 16);
  ctx.font = '34px serif';
  ctx.fillText(suitSymbol, 20, 56);

  // Bold center suit emblem
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = isCourt ? '92px serif' : '96px serif';
  ctx.fillText(suitSymbol, 96, isCourt ? 142 : 134);

  // Mirrored bottom-right rank & suit
  ctx.save();
  ctx.translate(192, 268);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 40px "JetBrains Mono", monospace';
  ctx.fillText(rankLabel, 18, 16);
  ctx.font = '34px serif';
  ctx.fillText(suitSymbol, 20, 56);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  frontTextureCache.set(card.code, texture);
  return texture;
}

/** High-detail Đông Sơn geometric voxel card back */
export function getCardBackTexture(): THREE.CanvasTexture {
  if (cachedBackTexture) return cachedBackTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 132;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#fcf6e8';
  ctx.fillRect(0, 0, 96, 132);

  // Deep crimson lacquer field
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(6, 6, 84, 120);

  // Outer & inner gold frames
  ctx.fillStyle = '#eab308';
  ctx.fillRect(10, 10, 76, 3);
  ctx.fillRect(10, 119, 76, 3);
  ctx.fillRect(10, 10, 3, 112);
  ctx.fillRect(83, 10, 3, 112);

  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(16, 16, 64, 2);
  ctx.fillRect(16, 114, 64, 2);
  ctx.fillRect(16, 16, 2, 100);
  ctx.fillRect(78, 16, 2, 100);

  // Ornate stepped Đông Sơn sun medallion
  const cx = 48;
  const cy = 66;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - 5, cy - 26, 10, 52);
  ctx.fillRect(cx - 26, cy - 5, 52, 10);
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(cx - 10, cy - 10, 20, 20);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - 4, cy - 4, 8, 8);

  // Corner gold ornaments
  for (const [x, y] of [
    [22, 22],
    [68, 22],
    [22, 104],
    [68, 104],
  ]) {
    ctx.fillRect(x, y, 6, 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  cachedBackTexture = texture;
  return texture;
}
