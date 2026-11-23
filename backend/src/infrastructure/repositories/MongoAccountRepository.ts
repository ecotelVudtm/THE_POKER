import {
  Account,
  createDefaultEquippedSkills,
  normalizeEquippedSkin,
  normalizeEquippedWinEffect,
  normalizeOwnedSkins,
  normalizeOwnedWinEffects,
  normalizeSkillInventory,
  normalizeSkillMastery,
} from '../../domain/entities/Account';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { AccountDocument, AccountModel } from '../database/models/AccountModel';

export class MongoAccountRepository implements IAccountRepository {
  private toDomain(doc: AccountDocument): Account {
    return {
      id: doc._id.toString(),
      username: doc.username,
      displayName: doc.displayName,
      passwordHash: doc.passwordHash,
      chips: doc.chips,
      loanBalance: doc.loanBalance ?? 0,
      ownedItems: Array.isArray(doc.ownedItems) ? [...doc.ownedItems] : [],
      skillInventory: normalizeSkillInventory(doc.skillInventory),
      equippedSkills: Array.isArray(doc.equippedSkills)
        ? [...doc.equippedSkills]
        : createDefaultEquippedSkills(),
      ownedSkins: normalizeOwnedSkins(doc.ownedSkins),
      equippedSkin: normalizeEquippedSkin(doc.equippedSkin, normalizeOwnedSkins(doc.ownedSkins)),
      ownedWinEffects: normalizeOwnedWinEffects(doc.ownedWinEffects),
      equippedWinEffect: normalizeEquippedWinEffect(
        doc.equippedWinEffect,
        normalizeOwnedWinEffects(doc.ownedWinEffects)
      ),
      skillMastery: normalizeSkillMastery(doc.skillMastery),
      debtHistory: doc.debtHistory.map((d) => ({
        loanId: d.loanId,
        packageType: d.packageType,
        principal: d.principal,
        repaidAmount: d.repaidAmount,
        status: d.status,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
      })),
      stats: {
        wins: doc.stats.wins,
        matchesPlayed: doc.stats.matchesPlayed,
        caughtCount: doc.stats.caughtCount,
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  public async findById(id: string): Promise<Account | null> {
    const doc = await AccountModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  public async findByUsername(username: string): Promise<Account | null> {
    const doc = await AccountModel.findOne({ username: username.toLowerCase() }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  public async create(
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    const doc = await AccountModel.create(account);
    return this.toDomain(doc);
  }

  public async update(account: Account): Promise<Account> {
    const doc = await AccountModel.findByIdAndUpdate(
      account.id,
      {
        displayName: account.displayName,
        chips: account.chips,
        loanBalance: account.loanBalance,
        ownedItems: account.ownedItems,
        skillInventory: account.skillInventory,
        equippedSkills: account.equippedSkills,
        ownedSkins: account.ownedSkins,
        equippedSkin: account.equippedSkin,
        ownedWinEffects: account.ownedWinEffects,
        equippedWinEffect: account.equippedWinEffect,
        skillMastery: account.skillMastery,
        debtHistory: account.debtHistory,
        stats: account.stats,
      },
      { new: true }
    ).exec();

    if (!doc) {
      throw new Error(`Account "${account.id}" not found in MongoDB.`);
    }
    return this.toDomain(doc);
  }

  public async findTopByChips(limit: number): Promise<Account[]> {
    const docs = await AccountModel.find().sort({ chips: -1 }).limit(limit).exec();
    return docs.map((d) => this.toDomain(d));
  }
}
