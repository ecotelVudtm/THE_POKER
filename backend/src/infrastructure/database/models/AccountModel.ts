import mongoose, { Document, Schema } from 'mongoose';
import { AccountStats, SkillInventory, SkillMastery } from '../../../domain/entities/Account';
import { SkinId, WinEffectId } from '../../../domain/value-objects/Cosmetic';
import { ItemType } from '../../../domain/value-objects/Item';
import { DebtRecord } from '../../../domain/value-objects/Loan';
import { SkillType } from '../../../domain/value-objects/Skill';

export interface AccountDocument extends Document {
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

const MasteryProgressSchema = new Schema(
  {
    level: { type: Number, default: 1, min: 1, max: 10 },
    exp: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const DebtRecordSchema = new Schema(
  {
    loanId: { type: String, required: true },
    packageType: {
      type: String,
      enum: ['CHIPS_2000', 'CHIPS_5000', 'CHIPS_10000', 'TIME_60S'],
      required: true,
    },
    principal: { type: Number, required: true },
    repaidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'REPAID', 'DEFAULTED'],
      default: 'ACTIVE',
    },
    createdAt: { type: String, required: true },
    resolvedAt: { type: String },
  },
  { _id: false }
);

const AccountSchema = new Schema<AccountDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: undefined,
    },
    chips: {
      type: Number,
      default: 10000,
      min: 0,
    },
    loanBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    ownedItems: {
      type: [String],
      enum: ['PHONE', 'INCENSE_BOWL', 'LUCKY_MANGO', 'ICED_TEA', 'LUCKY_COIN', 'INSTANT_NOODLES'],
      default: [],
    },
    skillInventory: {
      SLEIGHT_OF_HAND: { type: Number, default: 1, min: 0 },
      EAGLE_EYE: { type: Number, default: 1, min: 0 },
      PRESSURE_AURA: { type: Number, default: 1, min: 0 },
      VIA_SIPHON: { type: Number, default: 0, min: 0 },
      TIME_FREEZE: { type: Number, default: 0, min: 0 },
      POKER_FACE: { type: Number, default: 0, min: 0 },
    },
    equippedSkills: {
      type: [String],
      default: ['SLEIGHT_OF_HAND', 'EAGLE_EYE', 'PRESSURE_AURA'],
    },
    ownedSkins: {
      type: [String],
      default: ['DEFAULT'],
    },
    equippedSkin: {
      type: String,
      default: 'DEFAULT',
    },
    ownedWinEffects: {
      type: [String],
      default: ['NONE'],
    },
    equippedWinEffect: {
      type: String,
      default: 'NONE',
    },
    skillMastery: {
      sleightOfHand: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      eagleEye: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      pressureAura: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      viaSiphon: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      timeFreeze: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      pokerFace: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
    },
    debtHistory: {
      type: [DebtRecordSchema],
      default: [],
    },
    stats: {
      wins: { type: Number, default: 0 },
      matchesPlayed: { type: Number, default: 0 },
      caughtCount: { type: Number, default: 0 },
    },
  },
  {
    collection: 'accounts',
    timestamps: true,
  }
);

export const AccountModel = mongoose.model<AccountDocument>('Account', AccountSchema);
