import { describe, expect, it } from 'vitest';
import { AuthenticateAccountUseCase } from '../application/use-cases/AuthenticateAccountUseCase';
import { PlaceBetUseCase } from '../application/use-cases/PlaceBetUseCase';
import { StartMatchUseCase } from '../application/use-cases/StartMatchUseCase';
import { createPlayer, VIA_GAIN_ON_FOLD, VIA_GAIN_ON_RAISE, VIA_GAIN_ON_WIN, VIA_GAIN_ON_WIN_STREAK } from '../domain/entities/Player';
import { createRoom } from '../domain/entities/Room';
import { createMiniGameChallenge, evaluateMiniGameSubmission } from '../domain/rules/MiniGameEngine';
import { InMemoryAccountRepository } from '../infrastructure/repositories/InMemoryAccountRepository';
import { InMemoryRoomRepository } from '../infrastructure/repositories/InMemoryRoomRepository';
import { RateLimiter } from '../infrastructure/security/RateLimiter';
import { TokenService } from '../infrastructure/security/TokenService';

describe('Vía Rules (Fold, Raise, 3-Win Streak) & Anti-Cheat Security', () => {
  it('grants +5 Vía on FOLD and +5 Vía on RAISE >= smallBlind', async () => {
    const accountRepo = new InMemoryAccountRepository(null);
    const roomRepo = new InMemoryRoomRepository();
    const placeBet = new PlaceBetUseCase(roomRepo, accountRepo);

    const room = createRoom({
      id: 'TESTVIA1',
      name: 'Test Room',
      hostAccountId: 'p1',
      maxBuyIn: 1000,
      smallBlind: 20,
      bigBlind: 40,
    });
    room.status = 'PLAYING';
    room.phase = 'PRE_FLOP';
    room.currentBet = 40;
    room.minRaise = 40;
    room.pot = 60;
    room.currentTurnIndex = 0;

    const p1 = createPlayer({
      accountId: 'p1',
      socketId: 's1',
      displayName: 'Player 1',
      isBot: true,
      seatIndex: 0,
      chips: 1000,
    });
    const p2 = createPlayer({
      accountId: 'p2',
      socketId: 's2',
      displayName: 'Player 2',
      isBot: true,
      seatIndex: 1,
      chips: 1000,
    });
    p1.via = 30;
    p2.via = 30;
    p1.currentBet = 20;
    p2.currentBet = 40;
    room.players.push(p1, p2);
    await roomRepo.save(room);

    // p1 raises by 40 (>= smallBlind 20) -> +5 Vía
    await placeBet.execute({
      roomId: room.id,
      accountId: 'p1',
      action: 'RAISE',
      raiseAmount: 40,
    });
    expect(p1.via).toBe(30 + VIA_GAIN_ON_RAISE);

    // p2 folds -> +5 Vía for p2, p1 wins -> +20 Vía for p1
    await placeBet.execute({
      roomId: room.id,
      accountId: 'p2',
      action: 'FOLD',
    });
    expect(p2.via).toBe(30 + VIA_GAIN_ON_FOLD);
    expect(p1.via).toBe(30 + VIA_GAIN_ON_RAISE + VIA_GAIN_ON_WIN);
  });

  it('awards +50 Vía ONLY (0 chip bonus) on 3-win streak', async () => {
    const accountRepo = new InMemoryAccountRepository(null);
    const roomRepo = new InMemoryRoomRepository();
    const placeBet = new PlaceBetUseCase(roomRepo, accountRepo);

    const room = createRoom({
      id: 'TESTSTK1',
      name: 'Streak Room',
      hostAccountId: 'p1',
      maxBuyIn: 1000,
      smallBlind: 20,
      bigBlind: 40,
    });
    room.status = 'PLAYING';
    room.phase = 'PRE_FLOP';
    room.currentBet = 40;
    room.pot = 60;
    room.currentTurnIndex = 1;

    const p1 = createPlayer({
      accountId: 'p1',
      socketId: 's1',
      displayName: 'Winner',
      isBot: true,
      seatIndex: 0,
      chips: 1000,
    });
    p1.winStreak = 2; // next win hits streak = 3
    p1.via = 10;

    const p2 = createPlayer({
      accountId: 'p2',
      socketId: 's2',
      displayName: 'Folder',
      isBot: true,
      seatIndex: 1,
      chips: 1000,
    });
    room.players.push(p1, p2);
    await roomRepo.save(room);

    const result = await placeBet.execute({
      roomId: room.id,
      accountId: 'p2',
      action: 'FOLD',
    });

    const streakEvent = result.events.find((e) => e.type === 'WIN_STREAK_BONUS');
    expect(streakEvent).toBeDefined();
    if (streakEvent && streakEvent.type === 'WIN_STREAK_BONUS') {
      expect(streakEvent.chipBonus).toBe(0);
      expect(streakEvent.viaBonus).toBe(VIA_GAIN_ON_WIN_STREAK);
    }
    // Chips should ONLY be starting 1000 + pot 60 (NO +50% chip bonus!)
    expect(p1.chips).toBe(1060);
    // Vía = 10 + 20 (win) + 50 (3-win streak) = 80
    expect(p1.via).toBe(10 + VIA_GAIN_ON_WIN + VIA_GAIN_ON_WIN_STREAK);
  });

  it('signs and verifies HMAC tokens and rejects tampered or expired tokens', () => {
    const tokenService = new TokenService('a'.repeat(64), 3600);
    const now = 1_700_000_000_000;
    const token = tokenService.sign('acc_42', 'pokerpro', now);

    const valid = tokenService.verify(token, now + 10_000);
    expect(valid?.accountId).toBe('acc_42');
    expect(valid?.username).toBe('pokerpro');

    // Tampered payload
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'acc_victim', usr: 'victim', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 }),
      'utf8'
    ).toString('base64url');
    expect(tokenService.verify(`${forgedPayload}.${sig}`, now + 10_000)).toBeNull();

    // Expired token
    expect(tokenService.verify(token, now + 3601 * 1000)).toBeNull();
  });

  it('locks username after 5 failed logins and blocks passwordless quick takeover', async () => {
    const limiter = new RateLimiter(5, 60_000);
    const now = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) {
      limiter.recordLoginFailure('victim_user', now + i * 1000);
    }
    expect(limiter.checkLoginLockout('victim_user', now + 5000).allowed).toBe(false);
    expect(limiter.checkLoginLockout('victim_user', now + 70_000).allowed).toBe(true);

    const accountRepo = new InMemoryAccountRepository(null);
    const auth = new AuthenticateAccountUseCase(accountRepo);
    await auth.execute({ username: 'victim_user', password: 'secret_password', mode: 'register' });

    // Reject quick login takeover without password
    await expect(
      auth.execute({ username: 'victim_user', mode: 'quick' })
    ).rejects.toThrow();

    // Reject NoSQL / XSS injection usernames
    await expect(
      auth.execute({ username: '{"$ne":""}', password: 'secret_password', mode: 'register' })
    ).rejects.toThrow();
  });

  it('rejects anti-cheat instant bot mini-game submissions and future-faked rhythm timestamps', () => {
    const startTime = 1_700_000_000_000;
    const timingChallenge = createMiniGameChallenge({
      accountId: 'acc_bot',
      skillType: 'SLEIGHT_OF_HAND',
      cardIndex: 0,
      now: startTime,
      modifiers: {
        masteryLevel: 1,
        blessed: false,
        icedTeaActive: false,
        debtPressure: false,
        pressured: false,
      },
    });
    const mid = (timingChallenge.params.targetStart + timingChallenge.params.targetEnd) / 2;

    // 10ms submission -> instant bot rejection
    const instantRes = evaluateMiniGameSubmission(
      timingChallenge,
      { challengeId: timingChallenge.challengeId, cursorPosition: mid },
      startTime + 10
    );
    expect(instantRes.success).toBe(false);

    // RHYTHM_TAP with timestamps far in the future of server elapsed time
    const rhythmChallenge = createMiniGameChallenge({
      accountId: 'acc_bot',
      skillType: 'PRESSURE_AURA',
      targetAccountId: 'acc_2',
      now: startTime,
      modifiers: {
        masteryLevel: 1,
        blessed: false,
        icedTeaActive: false,
        debtPressure: false,
        pressured: false,
      },
    });
    const [b1, b2, b3] = rhythmChallenge.params.rhythmBeatsMs;
    const forgedFuture = evaluateMiniGameSubmission(
      rhythmChallenge,
      { challengeId: rhythmChallenge.challengeId, tapTimestampsMs: [b1, b2, b3] },
      startTime + 200
    );
    expect(forgedFuture.success).toBe(false);
  });

  it('auto-rebuys busted bots & players up to room.maxBuyIn in STANDARD mode (not ARENA)', async () => {
    const accountRepo = new InMemoryAccountRepository(null);
    const roomRepo = new InMemoryRoomRepository();
    const auth = new AuthenticateAccountUseCase(accountRepo);
    const startMatch = new StartMatchUseCase(roomRepo, accountRepo);

    const humanAcc = await auth.execute({
      username: 'rebuy_tester',
      password: 'password123',
      mode: 'register',
    });
    humanAcc.chips = 50_000;
    await accountRepo.update(humanAcc);

    const room = createRoom({
      id: 'REBUY10K',
      name: 'Standard 10K',
      hostAccountId: humanAcc.id,
      mode: 'STANDARD',
      maxBuyIn: 10_000,
      smallBlind: 200,
      bigBlind: 400,
    });
    room.status = 'PLAYING';
    room.phase = 'SHOWDOWN';
    room.handNumber = 1;

    const human = createPlayer({
      accountId: humanAcc.id,
      socketId: 'sock_h',
      displayName: 'Human',
      isBot: false,
      seatIndex: 0,
      chips: 0,
    });
    const bot = createPlayer({
      accountId: 'bot_1',
      socketId: null,
      displayName: 'Bot',
      isBot: true,
      seatIndex: 1,
      chips: 0,
    });
    room.players.push(human, bot);
    await roomRepo.save(room);

    const res = await startMatch.execute(room.id);
    expect(res.room.status).toBe('PLAYING');
    expect(human.eliminated).toBe(false);
    expect(bot.eliminated).toBe(false);
    // Both rebought exact 10,000 maxBuyIn before posting SB/BB (200 / 400)
    expect(human.lastSyncedChips).toBe(10_000);
    expect(bot.lastSyncedChips).toBe(10_000);
    expect(human.chips + human.currentBet).toBe(10_000);
    expect(bot.chips + bot.currentBet).toBe(10_000);
  });
});
