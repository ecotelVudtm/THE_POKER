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

const USERNAME_REGEX = /^[a-z0-9_.-]{2,32}$/;

function sanitizeDisplayName(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

export class AuthenticateAccountUseCase {
  constructor(private readonly accountRepo: IAccountRepository) {}

  public async execute(input: AuthenticateAccountInput): Promise<Account> {
    if (typeof input.username !== 'string') {
      throw new Error('Tên đăng nhập không hợp lệ.');
    }
    const normalizedUsername = input.username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      throw new Error('Tên đăng nhập 2–32 ký tự, chỉ gồm chữ thường, số và _, ., -.');
    }

    const mode = input.mode ?? 'login';
    const existing = await this.accountRepo.findByUsername(normalizedUsername);

    if (mode === 'register') {
      if (existing) {
        throw new Error('Tên đăng nhập này đã tồn tại.');
      }
      if (!input.password || input.password.length < 4 || input.password.length > 128) {
        throw new Error('Mật khẩu phải từ 4 đến 128 ký tự.');
      }
      const displayName = sanitizeDisplayName(
        input.displayName ?? input.username,
        normalizedUsername
      );
      return this.accountRepo.create({
        username: normalizedUsername,
        displayName,
        passwordHash: hashPassword(input.password),
        chips: DEFAULT_STARTING_CHIPS,
        vnd500kBills: 0,
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
        throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
      }
      if (!input.password || input.password.length > 128) {
        throw new Error('Vui lòng nhập mật khẩu hợp lệ.');
      }
      if (!existing.passwordHash) {
        // Legacy passwordless account: set password on first login only if length >= 4
        if (input.password.length < 4) {
          throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
        }
        existing.passwordHash = hashPassword(input.password);
        return this.accountRepo.update(existing);
      }
      if (!verifyPassword(input.password, existing.passwordHash)) {
        throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
      }
      return existing;
    }

    // Legacy quick mode: NEVER allow bypassing password on protected accounts!
    if (existing) {
      if (existing.passwordHash) {
        throw new Error('Tài khoản này yêu cầu đăng nhập bằng mật khẩu.');
      }
      return existing;
    }

    if (!input.password || input.password.length < 4 || input.password.length > 128) {
      throw new Error('Tạo tài khoản mới yêu cầu mật khẩu từ 4 ký tự trở lên.');
    }

    const displayName = sanitizeDisplayName(
      input.displayName ?? input.username,
      normalizedUsername
    );
    return this.accountRepo.create({
      username: normalizedUsername,
      displayName,
      passwordHash: hashPassword(input.password),
      chips: DEFAULT_STARTING_CHIPS,
      vnd500kBills: 0,
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
