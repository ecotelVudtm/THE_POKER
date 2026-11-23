import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';

export function createAccountRoutes(controller: AccountController): Router {
  const router = Router();
  router.post('/auth', controller.authenticate);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.get('/leaderboard', controller.getLeaderboard);
  router.get('/:id', controller.getById);
  return router;
}
