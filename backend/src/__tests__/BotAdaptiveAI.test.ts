import { describe, expect, it } from 'vitest';
import { createCard } from '../domain/entities/Card';
import { createPlayer } from '../domain/entities/Player';
import { createRoom } from '../domain/entities/Room';
import { filterRoomStateForViewer } from '../domain/rules/StateFilter';
import { BotAIEngine } from '../infrastructure/ai/BotAIEngine';

describe('Micro Adaptive Bot AI (Opponent Modeling & Round-by-Round Learning)', () => {
  it('classifies a frequent folder as TIGHT_ROCK and increases bot bluff pressure', () => {
    const botAI = new BotAIEngine(null);
    const room = createRoom({
      id: 'AI_ROCK',
      name: 'AI Test Rock',
      hostAccountId: 'human_rock',
      maxBuyIn: 10_000,
      smallBlind: 200,
      bigBlind: 400,
    });
    room.status = 'PLAYING';
    room.phase = 'PRE_FLOP';
    room.handNumber = 1;

    const human = createPlayer({
      accountId: 'human_rock',
      socketId: 's1',
      displayName: 'Rock Player',
      isBot: false,
      seatIndex: 0,
      chips: 10_000,
    });
    const bot = createPlayer({
      accountId: 'bot_1',
      socketId: null,
      displayName: 'Bot 1',
      isBot: true,
      seatIndex: 1,
      chips: 10_000,
    });
    room.players.push(human, bot);
    botAI.updateAfterRound(room);

    // Simulate 5 betting rounds where human repeatedly folds facing bets
    const phases = ['FLOP', 'TURN', 'RIVER', 'SHOWDOWN'] as const;
    for (let h = 1; h <= 2; h++) {
      room.handNumber = h;
      room.phase = 'PRE_FLOP';
      botAI.updateAfterRound(room);
      for (const ph of phases) {
        botAI.observeAction(room, human.accountId, 'FOLD', 400);
        room.phase = ph;
        botAI.updateAfterRound(room);
      }
    }

    const profile = botAI.getOpponentProfile(human.accountId);
    expect(profile?.archetype).toBe('TIGHT_ROCK');
    expect(profile!.foldToBetRate).toBeGreaterThan(0.6);

    const weights = botAI.getBotWeights(bot.accountId);
    // Against a tight folder, bot learns to bluff/pressure more and respect big bets
    expect(weights.bluffFrequencyShift).toBeGreaterThan(0.05);
    expect(weights.callThresholdShift).toBeGreaterThan(0);
  });

  it('detects BLUFF_MANIAC via heavy aggression & weak showdowns and turns bots into bluff-catchers', () => {
    const botAI = new BotAIEngine(null);
    const room = createRoom({
      id: 'AI_MANIAC',
      name: 'AI Test Maniac',
      hostAccountId: 'human_maniac',
      maxBuyIn: 10_000,
      smallBlind: 200,
      bigBlind: 400,
    });
    room.status = 'PLAYING';
    room.handNumber = 1;
    room.phase = 'PRE_FLOP';

    const human = createPlayer({
      accountId: 'human_maniac',
      socketId: 's1',
      displayName: 'Maniac Player',
      isBot: false,
      seatIndex: 0,
      chips: 10_000,
    });
    const bot = createPlayer({
      accountId: 'bot_2',
      socketId: null,
      displayName: 'Bot 2',
      isBot: true,
      seatIndex: 2,
      chips: 10_000,
    });
    room.players.push(human, bot);

    // Simulate aggressive raises + weak 7-2 offsuit showdown bluffs
    for (let h = 1; h <= 3; h++) {
      room.handNumber = h;
      room.phase = 'PRE_FLOP';
      room.communityCards = [
        createCard('A', 'S'),
        createCard('K', 'D'),
        createCard('Q', 'C'),
        createCard('9', 'H'),
        createCard('4', 'S'),
      ];
      human.holeCards = [createCard('7', 'H'), createCard('2', 'C')];
      human.folded = false;
      human.totalBetInHand = 2400;
      botAI.updateAfterRound(room);

      botAI.observeAction(room, human.accountId, 'RAISE', 400);
      room.phase = 'FLOP';
      botAI.updateAfterRound(room);

      botAI.observeAction(room, human.accountId, 'ALL_IN', 800);
      room.phase = 'SHOWDOWN';
      botAI.updateAfterRound(room);
    }

    const profile = botAI.getOpponentProfile(human.accountId);
    expect(profile?.archetype).toBe('BLUFF_MANIAC');
    expect(profile!.aggressionRate).toBeGreaterThan(0.5);
    expect(profile!.bluffRate).toBeGreaterThan(0.35);

    const weights = botAI.getBotWeights(bot.accountId);
    // Against a bluff maniac, bot lowers call threshold (calls lighter) and sizes up value bets
    expect(weights.callThresholdShift).toBeLessThan(-0.04);
    expect(weights.valueBetSizeMultiplier).toBeGreaterThan(1.1);

    // Ensure decide() works strictly on Fog-of-War FilteredRoomState
    room.phase = 'FLOP';
    bot.holeCards = [createCard('K', 'H'), createCard('10', 'S')];
    const filtered = filterRoomStateForViewer(room, bot.accountId);
    const botView = filtered.players.find((p) => p.accountId === bot.accountId)!;
    const decision = botAI.decide(filtered, botView);
    expect(['FOLD', 'CHECK', 'CALL', 'RAISE', 'ALL_IN']).toContain(decision.action);
  });

  it('identifies CALLING_STATION and reduces bot bluffs while sizing up value bets', () => {
    const botAI = new BotAIEngine(null);
    const room = createRoom({
      id: 'AI_CALLER',
      name: 'AI Test Caller',
      hostAccountId: 'human_caller',
      maxBuyIn: 10_000,
      smallBlind: 200,
      bigBlind: 400,
    });
    room.status = 'PLAYING';
    room.handNumber = 1;
    room.phase = 'PRE_FLOP';

    const human = createPlayer({
      accountId: 'human_caller',
      socketId: 's1',
      displayName: 'Caller Player',
      isBot: false,
      seatIndex: 0,
      chips: 10_000,
    });
    const bot = createPlayer({
      accountId: 'bot_3',
      socketId: null,
      displayName: 'Bot 3',
      isBot: true,
      seatIndex: 3,
      chips: 10_000,
    });
    room.players.push(human, bot);

    for (let h = 1; h <= 2; h++) {
      room.handNumber = h;
      room.phase = 'PRE_FLOP';
      botAI.updateAfterRound(room);
      for (const ph of ['FLOP', 'TURN', 'RIVER', 'SHOWDOWN'] as const) {
        botAI.observeAction(room, human.accountId, 'CALL', 400);
        room.phase = ph;
        botAI.updateAfterRound(room);
      }
    }

    const profile = botAI.getOpponentProfile(human.accountId);
    expect(profile?.archetype).toBe('CALLING_STATION');
    const weights = botAI.getBotWeights(bot.accountId);
    expect(weights.bluffFrequencyShift).toBeLessThan(-0.04);
    expect(weights.valueBetSizeMultiplier).toBeGreaterThan(1.1);
  });
});
