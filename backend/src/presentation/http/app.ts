import cors from 'cors';
import express, { Express } from 'express';
import { AccountController } from './controllers/AccountController';
import { RoomController } from './controllers/RoomController';
import { createAccountRoutes } from './routes/accountRoutes';
import { createRoomRoutes } from './routes/roomRoutes';

export interface AppDependencies {
  accountController: AccountController;
  roomController: RoomController;
  corsOrigin: string;
  storageMode: 'mongodb' | 'in-memory';
}

export function createExpressApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
  });

  app.use(
    cors({
      origin: deps.corsOrigin === '*' ? true : deps.corsOrigin.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'THE_POKER Authoritative Game Server',
      storageMode: deps.storageMode,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/accounts', createAccountRoutes(deps.accountController));
  app.use('/api/rooms', createRoomRoutes(deps.roomController));

  return app;
}
