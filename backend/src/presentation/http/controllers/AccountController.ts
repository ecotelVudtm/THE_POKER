import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AuthenticateAccountUseCase } from '../../../application/use-cases/AuthenticateAccountUseCase';
import { toPublicAccount } from '../../../domain/entities/Account';
import { IAccountRepository } from '../../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../../domain/repositories/IRoomRepository';
import { LOAN_PACKAGES, LoanPackage } from '../../../domain/value-objects/Loan';
import {
  ALL_SKILLS,
  MAX_EQUIPPED_SKILLS,
  SKILL_DEFINITIONS,
  SkillType,
} from '../../../domain/value-objects/Skill';
import {
  ALL_SKINS,
  ALL_WIN_EFFECTS,
  SKIN_PRICES,
  SkinId,
  WIN_EFFECT_PRICES,
  WinEffectId,
} from '../../../domain/value-objects/Cosmetic';
import { RateLimiter } from '../../../infrastructure/security/RateLimiter';
import { TokenService } from '../../../infrastructure/security/TokenService';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export class AccountController {
  constructor(
    private readonly authUseCase: AuthenticateAccountUseCase,
    private readonly accountRepo: IAccountRepository,
    private readonly roomRepo: IRoomRepository,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: RateLimiter
  ) {}

  /**
   * Express middleware enforcing valid signed Bearer token AND strict account ownership (token.accountId === :id).
   * Prevents IDOR / account takeover across all account read & mutation endpoints.
   */
  public requireAccountOwner = (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const rate = this.rateLimiter.consume(`http:acct:${ip}`, 90, 60_000);
    if (!rate.allowed) {
      res.status(429).json({
        error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    const payload = this.tokenService.verify(token);
    if (!payload) {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
      return;
    }

    if (req.params.id && payload.accountId !== req.params.id) {
      res.status(403).json({ error: 'Không có quyền truy cập tài khoản của người khác.' });
      return;
    }

    next();
  };

  /**
   * Anti-cheat double-spend guard: blocks chip-mutating Lobby transactions while seated in an active match.
   */
  private async isSeatedInActiveMatch(accountId: string): Promise<boolean> {
    const rooms = await this.roomRepo.findAll();
    return rooms.some(
      (r) =>
        r.status === 'PLAYING' &&
        r.players.some((p) => p.accountId === accountId && !p.eliminated)
    );
  }

  public authenticate = async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = getClientIp(req);
      const rate = this.rateLimiter.consume(`http:login:${ip}`, 20, 5 * 60_000);
      if (!rate.allowed) {
        res.status(429).json({
          error: `Quá nhiều yêu cầu đăng nhập. Vui lòng chờ ${rate.retryAfterSeconds} giây.`,
        });
        return;
      }

      const { username, displayName, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
        return;
      }

      const lock = this.rateLimiter.checkLoginLockout(username);
      if (!lock.allowed) {
        res.status(429).json({
          error: `Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ${lock.retryAfterSeconds} giây.`,
        });
        return;
      }

      const account = await this.authUseCase.execute({
        username,
        displayName,
        password,
        mode: 'quick',
      });
      this.rateLimiter.clearLoginFailures(username);
      const token = this.tokenService.sign(account.id, account.username);
      res.status(200).json({ account: toPublicAccount(account), token });
    } catch (err) {
      const username = typeof req.body?.username === 'string' ? req.body.username : '';
      if (username) this.rateLimiter.recordLoginFailure(username);
      res.status(401).json({ error: (err as Error).message });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = getClientIp(req);
      const rate = this.rateLimiter.consume(`http:register:${ip}`, 10, 10 * 60_000);
      if (!rate.allowed) {
        res.status(429).json({
          error: `Quá nhiều lượt đăng ký từ thiết bị này. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
        });
        return;
      }

      const { username, password, displayName } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
        return;
      }
      const account = await this.authUseCase.execute({
        username,
        password,
        displayName,
        mode: 'register',
      });
      const token = this.tokenService.sign(account.id, account.username);
      res.status(201).json({ account: toPublicAccount(account), token });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = getClientIp(req);
      const rate = this.rateLimiter.consume(`http:login:${ip}`, 20, 5 * 60_000);
      if (!rate.allowed) {
        res.status(429).json({
          error: `Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
        });
        return;
      }

      const { username, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
        return;
      }

      const lock = this.rateLimiter.checkLoginLockout(username);
      if (!lock.allowed) {
        res.status(429).json({
          error: `Tài khoản tạm khóa bảo vệ chống dò mật khẩu. Thử lại sau ${lock.retryAfterSeconds} giây.`,
        });
        return;
      }

      const account = await this.authUseCase.execute({
        username,
        password,
        mode: 'login',
      });
      this.rateLimiter.clearLoginFailures(username);
      const token = this.tokenService.sign(account.id, account.username);
      res.status(200).json({ account: toPublicAccount(account), token });
    } catch (err) {
      const username = typeof req.body?.username === 'string' ? req.body.username : '';
      if (username) this.rateLimiter.recordLoginFailure(username);
      res.status(401).json({ error: (err as Error).message });
    }
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      res.status(200).json({ account: toPublicAccount(account) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public takeAccountLoan = async (req: Request, res: Response): Promise<void> => {
    try {
      if (await this.isSeatedInActiveMatch(req.params.id)) {
        res.status(409).json({ error: 'Không thể vay ngoài sảnh khi đang trong ván đấu.' });
        return;
      }
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { packageType } = req.body ?? {};
      const pkg = LOAN_PACKAGES[packageType as LoanPackage];
      if (!pkg) {
        res.status(400).json({ error: 'Gói vay không hợp lệ.' });
        return;
      }
      const maxLoanCap = 50000;
      if (account.loanBalance + pkg.principalCost > maxLoanCap) {
        res.status(400).json({
          error: `Hạn mức vay tối đa là ${maxLoanCap.toLocaleString()} chip! Hãy trả bớt nợ trước.`,
        });
        return;
      }

      account.chips += pkg.chipsGranted;
      account.loanBalance += pkg.principalCost;
      account.debtHistory.push({
        loanId: crypto.randomUUID(),
        packageType: packageType as LoanPackage,
        principal: pkg.principalCost,
        repaidAmount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });

      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public repayAccountLoan = async (req: Request, res: Response): Promise<void> => {
    try {
      if (await this.isSeatedInActiveMatch(req.params.id)) {
        res.status(409).json({ error: 'Không thể trả nợ ngoài sảnh khi đang trong ván đấu.' });
        return;
      }
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      if (account.loanBalance <= 0) {
        res.status(400).json({ error: 'Bạn không có khoản nợ nào cần trả.' });
        return;
      }
      if (account.chips < account.loanBalance) {
        res.status(400).json({
          error: `Không đủ chip để trả nợ (cần ${account.loanBalance.toLocaleString()} chip).`,
        });
        return;
      }

      account.chips -= account.loanBalance;
      account.loanBalance = 0;
      for (const rec of account.debtHistory) {
        if (rec.status === 'ACTIVE') {
          rec.repaidAmount = rec.principal;
          rec.status = 'REPAID';
          rec.resolvedAt = new Date().toISOString();
        }
      }
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public buySkill = async (req: Request, res: Response): Promise<void> => {
    try {
      if (await this.isSeatedInActiveMatch(req.params.id)) {
        res.status(409).json({ error: 'Không thể mua vật phẩm ngoài sảnh khi đang trong ván đấu.' });
        return;
      }
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { skillType, quantity = 1 } = req.body ?? {};
      if (!ALL_SKILLS.includes(skillType as SkillType)) {
        res.status(400).json({ error: 'Loại lá phép không hợp lệ.' });
        return;
      }
      const parsedQty = Number(quantity);
      if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 20) {
        res.status(400).json({ error: 'Số lượng mua không hợp lệ (1–20).' });
        return;
      }
      const def = SKILL_DEFINITIONS[skillType as SkillType];
      const totalCost = def.shopPrice * parsedQty;

      if (account.chips < totalCost) {
        res.status(400).json({
          error: `Không đủ chip! Cần ${totalCost.toLocaleString()} chip (hiện có ${account.chips.toLocaleString()}).`,
        });
        return;
      }

      account.chips -= totalCost;
      account.skillInventory[skillType as SkillType] =
        (account.skillInventory[skillType as SkillType] ?? 0) + parsedQty;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public updateLoadout = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { equippedSkills } = req.body ?? {};
      if (!Array.isArray(equippedSkills)) {
        res.status(400).json({ error: 'equippedSkills must be an array.' });
        return;
      }

      const uniqueValid = Array.from(
        new Set(equippedSkills.filter((s): s is SkillType => ALL_SKILLS.includes(s as SkillType)))
      );

      if (uniqueValid.length > MAX_EQUIPPED_SKILLS) {
        res.status(400).json({
          error: `Chỉ được mang tối đa ${MAX_EQUIPPED_SKILLS} khả năng vào trận!`,
        });
        return;
      }

      for (const s of uniqueValid) {
        if ((account.skillInventory[s] ?? 0) <= 0) {
          res.status(400).json({
            error: `Bạn đã hết lượt của lá phép ${s}. Hãy mua thêm trong Tiệm Phép!`,
          });
          return;
        }
      }

      account.equippedSkills = uniqueValid;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public buySkin = async (req: Request, res: Response): Promise<void> => {
    try {
      if (await this.isSeatedInActiveMatch(req.params.id)) {
        res.status(409).json({ error: 'Không thể mua skin ngoài sảnh khi đang trong ván đấu.' });
        return;
      }
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { skinId } = req.body ?? {};
      if (!ALL_SKINS.includes(skinId as SkinId)) {
        res.status(400).json({ error: 'Skin không hợp lệ.' });
        return;
      }
      const id = skinId as SkinId;
      if (account.ownedSkins.includes(id)) {
        account.equippedSkin = id;
        const updated = await this.accountRepo.update(account);
        res.status(200).json({ account: toPublicAccount(updated) });
        return;
      }
      const price = SKIN_PRICES[id];
      if (account.chips < price) {
        res.status(400).json({
          error: `Không đủ chip để mua skin! Cần ${price.toLocaleString()} chip.`,
        });
        return;
      }
      account.chips -= price;
      account.ownedSkins = [...account.ownedSkins, id];
      account.equippedSkin = id;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public equipSkin = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { skinId } = req.body ?? {};
      if (!ALL_SKINS.includes(skinId as SkinId)) {
        res.status(400).json({ error: 'Skin không hợp lệ.' });
        return;
      }
      const id = skinId as SkinId;
      if (!account.ownedSkins.includes(id)) {
        res.status(400).json({ error: 'Bạn chưa sở hữu skin này!' });
        return;
      }
      account.equippedSkin = id;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public buyWinEffect = async (req: Request, res: Response): Promise<void> => {
    try {
      if (await this.isSeatedInActiveMatch(req.params.id)) {
        res.status(409).json({ error: 'Không thể mua hiệu ứng ngoài sảnh khi đang trong ván đấu.' });
        return;
      }
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { effectId } = req.body ?? {};
      if (!ALL_WIN_EFFECTS.includes(effectId as WinEffectId)) {
        res.status(400).json({ error: 'Hiệu ứng thắng không hợp lệ.' });
        return;
      }
      const id = effectId as WinEffectId;
      if (account.ownedWinEffects.includes(id)) {
        account.equippedWinEffect = id;
        const updated = await this.accountRepo.update(account);
        res.status(200).json({ account: toPublicAccount(updated) });
        return;
      }
      const price = WIN_EFFECT_PRICES[id];
      if (account.chips < price) {
        res.status(400).json({
          error: `Không đủ chip để mua hiệu ứng! Cần ${price.toLocaleString()} chip.`,
        });
        return;
      }
      account.chips -= price;
      account.ownedWinEffects = [...account.ownedWinEffects, id];
      account.equippedWinEffect = id;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public equipWinEffect = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      const { effectId } = req.body ?? {};
      if (!ALL_WIN_EFFECTS.includes(effectId as WinEffectId)) {
        res.status(400).json({ error: 'Hiệu ứng thắng không hợp lệ.' });
        return;
      }
      const id = effectId as WinEffectId;
      if (!account.ownedWinEffects.includes(id)) {
        res.status(400).json({ error: 'Bạn chưa sở hữu hiệu ứng này!' });
        return;
      }
      account.equippedWinEffect = id;
      const updated = await this.accountRepo.update(account);
      res.status(200).json({ account: toPublicAccount(updated) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
      const accounts = await this.accountRepo.findTopByChips(limit);
      res.status(200).json({ accounts: accounts.map(toPublicAccount) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
