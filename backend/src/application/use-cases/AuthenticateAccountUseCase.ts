import {
  Account,
  createDefaultSkillMastery,
  DEFAULT_STARTING_CHIPS,
} from '../../domain/entities/Account';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';

export interface AuthenticateAccountInput {
  username: string;
  displayName?: string;
}

export class AuthenticateAccountUseCase {
  constructor(private readonly accountRepo: IAccountRepository) {}

  public async execute(input: AuthenticateAccountInput): Promise<Account> {
    const normalizedUsername = input.username.trim().toLowerCase();
    if (!normalizedUsername || normalizedUsername.length < 2 || normalizedUsername.length > 32) {
      throw new Error('Username must be between 2 and 32 characters');
    }

    const existing = await this.accountRepo.findByUsername(normalizedUsername);
    if (existing) {
      if (input.displayName && input.displayName.trim() && input.displayName.trim() !== existing.displayName) {
        existing.displayName = input.displayName.trim().slice(0, 32);
        return this.accountRepo.update(existing);
      }
      return existing;
    }

    const displayName = (input.displayName?.trim() || input.username.trim()).slice(0, 32);
    return this.accountRepo.create({
      username: normalizedUsername,
      displayName,
      chips: DEFAULT_STARTING_CHIPS,
      skillMastery: createDefaultSkillMastery(),
      debtHistory: [],
      stats: {
        wins: 0,
        matchesPlayed: 0,
        caughtCount: 0,
      },
    });
  }
}
