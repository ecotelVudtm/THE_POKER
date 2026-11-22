import { Account } from '../entities/Account';

export interface IAccountRepository {
  findById(id: string): Promise<Account | null>;
  findByUsername(username: string): Promise<Account | null>;
  create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account>;
  update(account: Account): Promise<Account>;
  findTopByChips(limit: number): Promise<Account[]>;
}
