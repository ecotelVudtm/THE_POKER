import crypto from 'crypto';
import { Account } from '../../domain/entities/Account';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';

export class InMemoryAccountRepository implements IAccountRepository {
  private readonly store = new Map<string, Account>();

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
    return structuredClone(created);
  }

  public async update(account: Account): Promise<Account> {
    if (!this.store.has(account.id)) {
      throw new Error(`Account "${account.id}" not found in InMemory store.`);
    }
    const updated: Account = {
      ...structuredClone(account),
      updatedAt: new Date(),
    };
    this.store.set(updated.id, updated);
    return structuredClone(updated);
  }

  public async findTopByChips(limit: number): Promise<Account[]> {
    return Array.from(this.store.values())
      .sort((a, b) => b.chips - a.chips)
      .slice(0, limit)
      .map((a) => structuredClone(a));
  }
}
