import { ItemType } from '../value-objects/Item';
import { DebtRecord } from '../value-objects/Loan';
import { SkillMasteryKey } from '../value-objects/Skill';

export interface MasteryProgress {
  level: number;
  exp: number;
}

export interface SkillMastery {
  sleightOfHand: MasteryProgress;
  eagleEye: MasteryProgress;
  pressureAura: MasteryProgress;
}

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
  ownedItems: ItemType[];
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
  ownedItems: ItemType[];
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

export function createDefaultSkillMastery(): SkillMastery {
  return {
    sleightOfHand: { level: 1, exp: 0 },
    eagleEye: { level: 1, exp: 0 },
    pressureAura: { level: 1, exp: 0 },
  };
}

export function applyMasteryExp(
  mastery: SkillMastery,
  key: SkillMasteryKey,
  expGain: number
): { updatedMastery: SkillMastery; leveledUp: boolean; newLevel: number } {
  const current = mastery[key];
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
