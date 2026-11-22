import { Request, Response } from 'express';
import { AuthenticateAccountUseCase } from '../../../application/use-cases/AuthenticateAccountUseCase';
import { IAccountRepository } from '../../../domain/repositories/IAccountRepository';

export class AccountController {
  constructor(
    private readonly authUseCase: AuthenticateAccountUseCase,
    private readonly accountRepo: IAccountRepository
  ) {}

  public authenticate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, displayName } = req.body ?? {};
      if (typeof username !== 'string') {
        res.status(400).json({ error: 'username is required' });
        return;
      }
      const account = await this.authUseCase.execute({ username, displayName });
      res.status(200).json({ account });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await this.accountRepo.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      res.status(200).json({ account });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
      const accounts = await this.accountRepo.findTopByChips(limit);
      res.status(200).json({ accounts });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
