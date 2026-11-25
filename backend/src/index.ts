import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { AuthenticateAccountUseCase } from './application/use-cases/AuthenticateAccountUseCase';
import { JoinRoomUseCase } from './application/use-cases/JoinRoomUseCase';
import { PlaceBetUseCase } from './application/use-cases/PlaceBetUseCase';
import { RepayLoanUseCase } from './application/use-cases/RepayLoanUseCase';
import { StartMatchUseCase } from './application/use-cases/StartMatchUseCase';
import { SubmitMiniGameUseCase } from './application/use-cases/SubmitMiniGameUseCase';
import { TakeLoanUseCase } from './application/use-cases/TakeLoanUseCase';
import { TriggerSkillUseCase } from './application/use-cases/TriggerSkillUseCase';
import { UseItemUseCase } from './application/use-cases/UseItemUseCase';
import { IAccountRepository } from './domain/repositories/IAccountRepository';
import { BotAIEngine } from './infrastructure/ai/BotAIEngine';
import { connectDatabase } from './infrastructure/database/mongooseConnection';
import { InMemoryAccountRepository } from './infrastructure/repositories/InMemoryAccountRepository';
import { InMemoryRoomRepository } from './infrastructure/repositories/InMemoryRoomRepository';
import { MongoAccountRepository } from './infrastructure/repositories/MongoAccountRepository';
import { RateLimiter } from './infrastructure/security/RateLimiter';
import { TokenService } from './infrastructure/security/TokenService';
import { MatchTimerLoop } from './infrastructure/timer/MatchTimerLoop';
import { createExpressApp } from './presentation/http/app';
import { AccountController } from './presentation/http/controllers/AccountController';
import { RoomController } from './presentation/http/controllers/RoomController';
import { SocketGateway } from './presentation/socket/SocketGateway';

// Load both monorepo root .env and local backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT) || 4000;
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const isMongoConnected = await connectDatabase(process.env.MONGO_URI);

  // Infrastructure Repositories
  const accountRepo: IAccountRepository = isMongoConnected
    ? new MongoAccountRepository()
    : new InMemoryAccountRepository();
  const roomRepo = new InMemoryRoomRepository();

  // Application Use Cases
  const authUseCase = new AuthenticateAccountUseCase(accountRepo);
  const joinRoomUseCase = new JoinRoomUseCase(roomRepo, accountRepo);
  const startMatchUseCase = new StartMatchUseCase(roomRepo, accountRepo);
  const placeBetUseCase = new PlaceBetUseCase(roomRepo, accountRepo);
  const triggerSkillUseCase = new TriggerSkillUseCase(roomRepo);
  const submitMiniGameUseCase = new SubmitMiniGameUseCase(roomRepo, accountRepo);
  const useItemUseCase = new UseItemUseCase(roomRepo);
  const takeLoanUseCase = new TakeLoanUseCase(roomRepo, accountRepo);
  const repayLoanUseCase = new RepayLoanUseCase(roomRepo, accountRepo);

  // Infrastructure Security & Adaptive Micro-AI Services
  const tokenService = new TokenService(process.env.AUTH_SECRET);
  const rateLimiter = new RateLimiter();
  const botAI = new BotAIEngine();

  // Presentation HTTP
  const accountController = new AccountController(
    authUseCase,
    accountRepo,
    roomRepo,
    tokenService,
    rateLimiter
  );
  const roomController = new RoomController(roomRepo);
  const app = createExpressApp({
    accountController,
    roomController,
    corsOrigin,
    storageMode: isMongoConnected ? 'mongodb' : 'in-memory',
  });

  const httpServer = http.createServer(app);

  // Presentation Socket.IO
  const socketGateway = new SocketGateway(httpServer, {
    accountRepo,
    roomRepo,
    tokenService,
    rateLimiter,
    botAI,
    joinRoomUseCase,
    startMatchUseCase,
    placeBetUseCase,
    triggerSkillUseCase,
    submitMiniGameUseCase,
    useItemUseCase,
    takeLoanUseCase,
    repayLoanUseCase,
    corsOrigin,
  });

  // Infrastructure Timer Loop
  const timerLoop = new MatchTimerLoop(
    roomRepo,
    placeBetUseCase,
    submitMiniGameUseCase,
    useItemUseCase,
    startMatchUseCase,
    botAI,
    {
      onRoomUpdated: (room) => socketGateway.broadcastRoomState(room),
      onDomainEvents: (room, events) => socketGateway.dispatchDomainEvents(room, events),
    }
  );
  timerLoop.start();

  httpServer.listen(port, () => {
    console.log(
      `[THE_POKER] Authoritative Game Server listening on http://localhost:${port} (storage: ${
        isMongoConnected ? 'MongoDB [accounts]' : 'In-Memory fallback'
      })`
    );
  });
}

void bootstrap();
