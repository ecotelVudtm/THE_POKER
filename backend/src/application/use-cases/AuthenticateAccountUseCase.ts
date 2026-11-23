import crypto from 'crypto';
import {
  Account,
  createDefaultEquippedSkills,
  createDefaultSkillInventory,
  createDefaultSkillMastery,
  DEFAULT_STARTING_CHIPS,
} from '../../domain/entities/Account';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';

export interface AuthenticateAccountInput {
  username: string;
  displayName?: string;
  password?: string;
  mode?: 'login' | 'register' | 'quick';
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export class AuthenticateAccountUseCase {
  constructor(private readonly accountRepo: IAccountRepository) {}

  public async execute(input: AuthenticateAccountInput): Promise<Account> {
    const normalizedUsername = input.username.trim().toLowerCase();
    if (!normalizedUsername || normalizedUsername.length < 2 || normalizedUsername.length > 32) {
      throw new Error('Tên đăng nhập phải từ 2 đến 32 ký tự.');
    }

    const mode = input.mode ?? 'quick';
    const existing = await this.accountRepo.findByUsername(normalizedUsername);

    if (mode === 'register') {
      if (existing) {
        throw new Error('Tên đăng nhập này đã tồn tại.');
      }
      if (!input.password || input.password.length < 4) {
        throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
      }
      const displayName = (input.displayName?.trim() || input.username.trim()).slice(0, 32);
      return this.accountRepo.create({
        username: normalizedUsername,
        displayName,
        passwordHash: hashPassword(input.password),
        chips: DEFAULT_STARTING_CHIPS,
        loanBalance: 0,
        ownedItems: [],
        skillInventory: createDefaultSkillInventory(),
        equippedSkills: createDefaultEquippedSkills(),
        ownedSkins: ['DEFAULT'],
        equippedSkin: 'DEFAULT',
        ownedWinEffects: ['NONE'],
        equippedWinEffect: 'NONE',
        skillMastery: createDefaultSkillMastery(),
        debtHistory: [],
        stats: {
          wins: 0,
          matchesPlayed: 0,
          caughtCount: 0,
        },
      });
    }

    if (mode === 'login') {
      if (!existing) {
        throw new Error('Tài khoản không tồn tại. Hãy chuyển sang tab Đăng ký.');
      }
      if (!input.password) {
        throw new Error('Vui lòng nhập mật khẩu.');
      }
      if (existing.passwordHash && !verifyPassword(input.password, existing.passwordHash)) {
        throw new Error('Sai mật khẩu.');
      }
      return existing;
    }

    // Backward-compatible quick/socket auth
    if (existing) {
      if (
        input.displayName &&
        input.displayName.trim() &&
        input.displayName.trim() !== existing.displayName
      ) {
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
      loanBalance: 0,
      ownedItems: [],
      skillInventory: createDefaultSkillInventory(),
      equippedSkills: createDefaultEquippedSkills(),
      ownedSkins: ['DEFAULT'],
      equippedSkin: 'DEFAULT',
      ownedWinEffects: ['NONE'],
      equippedWinEffect: 'NONE',
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
