import { Request, Response } from 'express';
import { AuthenticateAccountUseCase } from '../../../application/use-cases/AuthenticateAccountUseCase';
import { toPublicAccount } from '../../../domain/entities/Account';
import { IAccountRepository } from '../../../domain/repositories/IAccountRepository';
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

export class AccountController {
  constructor(
    private readonly authUseCase: AuthenticateAccountUseCase,
    private readonly accountRepo: IAccountRepository
  ) {}

  public authenticate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, displayName, password } = req.body ?? {};
      if (typeof username !== 'string') {
        res.status(400).json({ error: 'username is required' });
        return;
      }
      const account = await this.authUseCase.execute({
        username,
        displayName,
        password,
        mode: 'quick',
      });
      res.status(200).json({ account: toPublicAccount(account) });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
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
      res.status(201).json({ account: toPublicAccount(account) });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
        return;
      }
      const account = await this.authUseCase.execute({
        username,
        password,
        mode: 'login',
      });
      res.status(200).json({ account: toPublicAccount(account) });
    } catch (err) {
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

  public repayAccountLoan = async (req: Request, res: Response): Promise<void> => {
    try {
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
      const qty = Math.max(1, Math.min(20, Math.floor(Number(quantity) || 1)));
      const def = SKILL_DEFINITIONS[skillType as SkillType];
      const totalCost = def.shopPrice * qty;

      if (account.chips < totalCost) {
        res.status(400).json({
          error: `Không đủ chip! Cần ${totalCost.toLocaleString()} chip (hiện có ${account.chips.toLocaleString()}).`,
        });
        return;
      }

      account.chips -= totalCost;
      account.skillInventory[skillType as SkillType] =
        (account.skillInventory[skillType as SkillType] ?? 0) + qty;
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
