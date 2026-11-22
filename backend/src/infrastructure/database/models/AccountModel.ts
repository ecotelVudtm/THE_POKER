import mongoose, { Document, Schema } from 'mongoose';
import { AccountStats, SkillMastery } from '../../../domain/entities/Account';
import { DebtRecord } from '../../../domain/value-objects/Loan';

export interface AccountDocument extends Document {
  username: string;
  displayName: string;
  chips: number;
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
      enum: ['CHIPS_2000', 'CHIPS_5000', 'TIME_60S'],
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
    chips: {
      type: Number,
      default: 10000,
      min: 0,
    },
    skillMastery: {
      sleightOfHand: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      eagleEye: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
      pressureAura: { type: MasteryProgressSchema, default: () => ({ level: 1, exp: 0 }) },
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
