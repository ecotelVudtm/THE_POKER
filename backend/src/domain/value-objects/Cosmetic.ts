export type SkinId =
  | 'DEFAULT'
  | 'SUNGLASSES_COOL'
  | 'RED_HOODIE'
  | 'GOLD_SHIRT'
  | 'FEDORA_BOSS'
  | 'COWBOY_ACE'
  | 'CAPTAIN_CROWN'
  | 'FIREFLY_SAGE'
  | 'NEON_DISCO'
  | 'TYCOON_WATCH'
  | 'GRAND_MAGICIAN';

export type WinEffectId =
  | 'NONE'
  | 'CONFETTI'
  | 'DOVES'
  | 'TORNADO'
  | 'FIRE_BURST'
  | 'LIGHTNING';

export const ALL_SKINS: SkinId[] = [
  'DEFAULT',
  'SUNGLASSES_COOL',
  'RED_HOODIE',
  'GOLD_SHIRT',
  'FEDORA_BOSS',
  'COWBOY_ACE',
  'CAPTAIN_CROWN',
  'FIREFLY_SAGE',
  'NEON_DISCO',
  'TYCOON_WATCH',
  'GRAND_MAGICIAN',
];

export const ALL_WIN_EFFECTS: WinEffectId[] = [
  'NONE',
  'CONFETTI',
  'DOVES',
  'TORNADO',
  'FIRE_BURST',
  'LIGHTNING',
];

export const SKIN_PRICES: Record<SkinId, number> = {
  DEFAULT: 0,
  // Tier 1 (1,000+): glasses, hair color, shirt color
  SUNGLASSES_COOL: 1000,
  RED_HOODIE: 2500,
  GOLD_SHIRT: 5000,
  // Tier 2 (10,000+): extra 3D blocks (hats / crown)
  FEDORA_BOSS: 10000,
  COWBOY_ACE: 20000,
  CAPTAIN_CROWN: 35000,
  // Tier 3 (50,000+): animated glowing extras (fireflies, blinking neon hat)
  FIREFLY_SAGE: 50000,
  NEON_DISCO: 75000,
  // Tier 4 (100,000+): special idle animations (checking gold watch, magician conjuring doves)
  TYCOON_WATCH: 100000,
  GRAND_MAGICIAN: 150000,
};

export const WIN_EFFECT_PRICES: Record<WinEffectId, number> = {
  NONE: 0,
  CONFETTI: 3000,
  DOVES: 8000,
  TORNADO: 15000,
  FIRE_BURST: 25000,
  LIGHTNING: 40000,
};
