import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';

export function createAccountRoutes(controller: AccountController): Router {
  const router = Router();
  router.post('/auth', controller.authenticate);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.get('/leaderboard', controller.getLeaderboard);

  // All account-specific endpoints strictly require a valid signed Bearer token owned by :id
  const guard = controller.requireAccountOwner;
  router.post('/:id/take-loan', guard, controller.takeAccountLoan);
  router.post('/:id/repay-loan', guard, controller.repayAccountLoan);
  router.post('/:id/shop/buy-skill', guard, controller.buySkill);
  router.post('/:id/loadout', guard, controller.updateLoadout);
  router.post('/:id/shop/buy-skin', guard, controller.buySkin);
  router.post('/:id/shop/equip-skin', guard, controller.equipSkin);
  router.post('/:id/shop/buy-win-effect', guard, controller.buyWinEffect);
  router.post('/:id/shop/equip-win-effect', guard, controller.equipWinEffect);
  router.get('/:id', guard, controller.getById);
  return router;
}
