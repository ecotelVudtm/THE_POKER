/**
 * Semantic 3D / Canvas2D Material Tokens
 * Keeps Three.js scenes aligned with the CSS semantic theme palette.
 */
export const SCENE_TOKENS = {
  environment: {
    backdrop: '#231912',
    fog: '#261b14',
    lampWarm: '#ffdfb0',
    rimWarm: '#f6c27a',
    ambientWarm: '#fff2de',
  },
  table: {
    woodOuter: '#6e4226',
    woodTrim: '#8b5632',
    woodGoldInlay: '#d9a441',
    feltBase: '#186344',
    feltInnerLine: '#23825a',
    railLeather: '#4a2b19',
  },
  cards: {
    paperFront: '#fcf8ef',
    paperEdge: '#e6dcc8',
    suitRed: '#c92a2a',
    suitBlack: '#1f2328',
    backBase: '#7c2d12',
    backPattern: '#eab308',
    backBorder: '#fef3c7',
    exposedGlow: '#ef4444',
  },
  chips: {
    low: '#16a34a',
    mid: '#2563eb',
    high: '#dc2626',
    premium: '#eab308',
    stripe: '#fdf8ee',
  },
  items: {
    phoneBody: '#2b2623',
    phoneScreenIdle: '#38bdf8',
    phoneScreenDebt: '#f97316',
    ceramicBowl: '#d6c3a5',
    ceramicRim: '#8c5a3c',
    incenseStick: '#92400e',
    incenseEmber: '#fb7185',
    incenseSmoke: '#f8fafc',
    mangoSkin: '#f59e0b',
    mangoBlush: '#fb923c',
    mangoLeaf: '#16a34a',
    teaGlass: '#e0f2fe',
    teaLiquid: '#d97706',
    teaIce: '#f0f9ff',
    coinGold: '#eab308',
    coinThread: '#dc2626',
    hoverEmissive: '#fbbf24',
  },
  seats: {
    pedestal: '#3a2a20',
    avatarBody: '#5b4333',
    avatarHead: '#e9c7a6',
    activeRing: '#facc15',
    foldedTint: '#574c45',
  },
} as const;
