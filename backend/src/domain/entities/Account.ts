import { ALL_SKINS, ALL_WIN_EFFECTS, SkinId, WinEffectId } from '../value-objects/Cosmetic';
import { ItemType } from '../value-objects/Item';
import { DebtRecord } from '../value-objects/Loan';
import { SkillMasteryKey, SkillType } from '../value-objects/Skill';

export interface MasteryProgress {
  level: number;
  exp: number;
}

export interface SkillMastery {
  sleightOfHand: MasteryProgress;
  eagleEye: MasteryProgress;
  pressureAura: MasteryProgress;
  viaSiphon: MasteryProgress;
  timeFreeze: MasteryProgress;
  pokerFace: MasteryProgress;
}

export type SkillInventory = Record<SkillType, number>;

export interface AccountStats {
  wins: number;
  matchesPlayed: number;
  caughtCount: number;
}

export interface Account {
  id: string;
  username: string;
  displayName: string;
  passwordHash?: string;
  chips: number;
  loanBalance: number;
  ownedItems: ItemType[];
  skillInventory: SkillInventory;
  equippedSkills: SkillType[];
  ownedSkins: SkinId[];
  equippedSkin: SkinId;
  ownedWinEffects: WinEffectId[];
  equippedWinEffect: WinEffectId;
  skillMastery: SkillMastery;
  debtHistory: DebtRecord[];
  stats: AccountStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicAccount {
  id: string;
  username: string;
  displayName: string;
  chips: number;
  loanBalance: number;
  ownedItems: ItemType[];
  skillInventory: SkillInventory;
  equippedSkills: SkillType[];
  ownedSkins: SkinId[];
  equippedSkin: SkinId;
  ownedWinEffects: WinEffectId[];
  equippedWinEffect: WinEffectId;
  skillMastery: SkillMastery;
  debtHistory: DebtRecord[];
  stats: AccountStats;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicAccount(account: Account): PublicAccount {
  const { passwordHash: _omitted, ...publicAcc } = account;
  return publicAcc;
}

export const DEFAULT_STARTING_CHIPS = 10000;
export const MAX_MASTERY_LEVEL = 10;

export function expRequiredForNextLevel(level: number): number {
  return level * 100;
}

export function createDefaultSkillInventory(): SkillInventory {
  return {
    SLEIGHT_OF_HAND: 1,
    EAGLE_EYE: 1,
    PRESSURE_AURA: 1,
    VIA_SIPHON: 0,
    TIME_FREEZE: 0,
    POKER_FACE: 0,
  };
}

export function createDefaultEquippedSkills(): SkillType[] {
  return ['SLEIGHT_OF_HAND', 'EAGLE_EYE', 'PRESSURE_AURA'];
}

export function createDefaultSkillMastery(): SkillMastery {
  return {
    sleightOfHand: { level: 1, exp: 0 },
    eagleEye: { level: 1, exp: 0 },
    pressureAura: { level: 1, exp: 0 },
    viaSiphon: { level: 1, exp: 0 },
    timeFreeze: { level: 1, exp: 0 },
    pokerFace: { level: 1, exp: 0 },
  };
}

export function normalizeSkillInventory(inv?: Partial<SkillInventory>): SkillInventory {
  return {
    SLEIGHT_OF_HAND: inv?.SLEIGHT_OF_HAND ?? 1,
    EAGLE_EYE: inv?.EAGLE_EYE ?? 1,
    PRESSURE_AURA: inv?.PRESSURE_AURA ?? 1,
    VIA_SIPHON: inv?.VIA_SIPHON ?? 0,
    TIME_FREEZE: inv?.TIME_FREEZE ?? 0,
    POKER_FACE: inv?.POKER_FACE ?? 0,
  };
}

export function normalizeSkillMastery(m?: Partial<SkillMastery>): SkillMastery {
  const def = createDefaultSkillMastery();
  return {
    sleightOfHand: m?.sleightOfHand ? { ...m.sleightOfHand } : def.sleightOfHand,
    eagleEye: m?.eagleEye ? { ...m.eagleEye } : def.eagleEye,
    pressureAura: m?.pressureAura ? { ...m.pressureAura } : def.pressureAura,
    viaSiphon: m?.viaSiphon ? { ...m.viaSiphon } : def.viaSiphon,
    timeFreeze: m?.timeFreeze ? { ...m.timeFreeze } : def.timeFreeze,
    pokerFace: m?.pokerFace ? { ...m.pokerFace } : def.pokerFace,
  };
}

export function normalizeOwnedSkins(skins?: string[]): SkinId[] {
  const set = new Set<SkinId>(['DEFAULT']);
  if (Array.isArray(skins)) {
    for (const s of skins) {
      if (ALL_SKINS.includes(s as SkinId)) set.add(s as SkinId);
    }
  }
  return Array.from(set);
}

export function normalizeEquippedSkin(skin?: string, owned?: SkinId[]): SkinId {
  const ownedSet = new Set(owned ?? ['DEFAULT']);
  if (skin && ALL_SKINS.includes(skin as SkinId) && ownedSet.has(skin as SkinId)) {
    return skin as SkinId;
  }
  return 'DEFAULT';
}

export function normalizeOwnedWinEffects(effects?: string[]): WinEffectId[] {
  const set = new Set<WinEffectId>(['NONE']);
  if (Array.isArray(effects)) {
    for (const e of effects) {
      if (ALL_WIN_EFFECTS.includes(e as WinEffectId)) set.add(e as WinEffectId);
    }
  }
  return Array.from(set);
}

export function normalizeEquippedWinEffect(effect?: string, owned?: WinEffectId[]): WinEffectId {
  const ownedSet = new Set(owned ?? ['NONE']);
  if (effect && ALL_WIN_EFFECTS.includes(effect as WinEffectId) && ownedSet.has(effect as WinEffectId)) {
    return effect as WinEffectId;
  }
  return 'NONE';
}

export function applyMasteryExp(
  mastery: SkillMastery,
  key: SkillMasteryKey,
  expGain: number
): { updatedMastery: SkillMastery; leveledUp: boolean; newLevel: number } {
  const current = mastery[key] ?? { level: 1, exp: 0 };
  let level = current.level;
  let exp = current.exp + Math.max(0, expGain);
  let leveledUp = false;

  while (level < MAX_MASTERY_LEVEL && exp >= expRequiredForNextLevel(level)) {
    exp -= expRequiredForNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  if (level >= MAX_MASTERY_LEVEL) {
    level = MAX_MASTERY_LEVEL;
    exp = 0;
  }

  return {
    updatedMastery: {
      ...mastery,
      [key]: { level, exp },
    },
    leveledUp,
    newLevel: level,
  };
}
