import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Account } from '../../domain/entities/Account';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';

/**
 * Fallback Account Repository with automatic local JSON persistence (`backend/data/accounts.json`).
 * Ensures registered accounts, chips, items, and skill mastery survive server restarts even without MongoDB.
 */
export class InMemoryAccountRepository implements IAccountRepository {
  private readonly store = new Map<string, Account>();
  private readonly filePath: string;

  constructor(persistPath?: string) {
    this.filePath = persistPath ?? path.resolve(__dirname, '../../../data/accounts.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Account[];
      if (!Array.isArray(parsed)) return;
      for (const acc of parsed) {
        this.store.set(acc.id, {
          ...acc,
          ownedItems: Array.isArray(acc.ownedItems) ? acc.ownedItems : [],
          createdAt: new Date(acc.createdAt),
          updatedAt: new Date(acc.updatedAt),
        });
      }
      if (this.store.size > 0) {
        console.log(
          `[InMemoryAccountRepository] Restored ${this.store.size} persisted account(s) from ${this.filePath}`
        );
      }
    } catch (err) {
      console.warn('[InMemoryAccountRepository] Could not load persisted accounts:', (err as Error).message);
    }
  }

  private saveToDisk(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const data = Array.from(this.store.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[InMemoryAccountRepository] Could not save accounts:', (err as Error).message);
    }
  }

  public async findById(id: string): Promise<Account | null> {
    const acc = this.store.get(id);
    return acc ? structuredClone(acc) : null;
  }

  public async findByUsername(username: string): Promise<Account | null> {
    const normalized = username.toLowerCase();
    for (const acc of this.store.values()) {
      if (acc.username === normalized) {
        return structuredClone(acc);
      }
    }
    return null;
  }

  public async create(
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    const now = new Date();
    const created: Account = {
      ...structuredClone(account),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(created.id, created);
    this.saveToDisk();
    return structuredClone(created);
  }

  public async update(account: Account): Promise<Account> {
    if (!this.store.has(account.id)) {
      throw new Error(`Account "${account.id}" not found in store.`);
    }
    const updated: Account = {
      ...structuredClone(account),
      updatedAt: new Date(),
    };
    this.store.set(updated.id, updated);
    this.saveToDisk();
    return structuredClone(updated);
  }

  public async findTopByChips(limit: number): Promise<Account[]> {
    return Array.from(this.store.values())
      .sort((a, b) => b.chips - a.chips)
      .slice(0, limit)
      .map((a) => structuredClone(a));
  }
}
