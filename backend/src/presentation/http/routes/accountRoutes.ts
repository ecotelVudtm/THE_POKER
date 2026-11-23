import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';

export function createAccountRoutes(controller: AccountController): Router {
  const router = Router();
  router.post('/auth', controller.authenticate);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.get('/leaderboard', controller.getLeaderboard);
  router.post('/:id/repay-loan', controller.repayAccountLoan);
  router.post('/:id/shop/buy-skill', controller.buySkill);
  router.post('/:id/loadout', controller.updateLoadout);
  router.post('/:id/shop/buy-skin', controller.buySkin);
  router.post('/:id/shop/equip-skin', controller.equipSkin);
  router.post('/:id/shop/buy-win-effect', controller.buyWinEffect);
  router.post('/:id/shop/equip-win-effect', controller.equipWinEffect);
  router.get('/:id', controller.getById);
  return router;
}
