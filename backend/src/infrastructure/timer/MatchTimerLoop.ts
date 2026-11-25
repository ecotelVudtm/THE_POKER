import { GameDomainEvent } from '../../application/dtos/GameEvents';
import { PlaceBetUseCase } from '../../application/use-cases/PlaceBetUseCase';
import { StartMatchUseCase } from '../../application/use-cases/StartMatchUseCase';
import { SubmitMiniGameUseCase } from '../../application/use-cases/SubmitMiniGameUseCase';
import { UseItemUseCase } from '../../application/use-cases/UseItemUseCase';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { filterRoomStateForViewer } from '../../domain/rules/StateFilter';
import { BotAIEngine } from '../ai/BotAIEngine';

export interface TimerCallbacks {
  onRoomUpdated: (room: Room) => void;
  onDomainEvents: (room: Room, events: GameDomainEvent[]) => void;
}

export class MatchTimerLoop {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly botThinkTicks = new Map<string, number>();
  private readonly showdownPauseTicks = new Map<string, number>();
  private isTicking = false;

  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly submitMiniGameUseCase: SubmitMiniGameUseCase,
    private readonly useItemUseCase: UseItemUseCase,
    private readonly startMatchUseCase: StartMatchUseCase,
    private readonly botAI: BotAIEngine,
    private readonly callbacks: TimerCallbacks
  ) {}

  public start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      void this.tick();
    }, 1000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.isTicking) return;
    this.isTicking = true;

    try {
      const rooms = await this.roomRepo.findAll();
      const now = Date.now();

      for (const room of rooms) {
        if (room.status !== 'PLAYING') continue;

        // Auto-advance from SHOWDOWN to next hand after 4 seconds
        if (room.phase === 'SHOWDOWN') {
          const paused = (this.showdownPauseTicks.get(room.id) ?? 0) + 1;
          if (paused >= 4) {
            this.showdownPauseTicks.delete(room.id);
            const result = await this.startMatchUseCase.execute(room.id);
            this.botAI.updateAfterRound(result.room);
            this.callbacks.onRoomUpdated(result.room);
            if (result.events.length > 0) {
              this.callbacks.onDomainEvents(result.room, result.events);
            }
          } else {
            this.showdownPauseTicks.set(room.id, paused);
          }
          continue;
        }

        let dirty = false;
        const emittedEvents: GameDomainEvent[] = [];

        // 1. Check expired mini-game challenges (> 6s)
        for (const player of room.players) {
          if (player.activeChallenge && now > player.activeChallenge.expiresAt) {
            const res = await this.submitMiniGameUseCase.execute({
              roomId: room.id,
              accountId: player.accountId,
              payload: { challengeId: player.activeChallenge.challengeId },
              forceTimeout: true,
            });
            emittedEvents.push(...res.events);
            dirty = true;
          }
        }

        // 2. Tick timeBankSeconds ONLY for active turn player OR players with phone/minigame open
        const currentActor =
          room.currentTurnIndex >= 0 ? room.players[room.currentTurnIndex] : null;

        for (const player of room.players) {
          if (player.eliminated || player.timedOut) continue;

          const isCurrentTurn = currentActor?.accountId === player.accountId;
          const clockShouldRun =
            isCurrentTurn || player.phoneOpen || player.activeChallenge !== null;

          if (!clockShouldRun) continue;

          player.timeBankSeconds = Math.max(0, player.timeBankSeconds - 1);
          dirty = true;

          if (isCurrentTurn) {
            player.turnRemainingSeconds = Math.max(0, player.turnRemainingSeconds - 1);
          }

          // Out of 3-minute hand time bank:
          // If player owns ICED_TEA, auto-shatter it to save them (+30s)!
          if (player.timeBankSeconds <= 0) {
            if (
              player.ownedItems.includes('ICED_TEA') &&
              player.itemsState.icedTeaSipsLeft > 0
            ) {
              player.ownedItems = player.ownedItems.filter((item) => item !== 'ICED_TEA');
              player.itemsState.icedTeaSipsLeft = 0;
              player.timeBankSeconds = 30;
              player.turnRemainingSeconds = Math.max(player.turnRemainingSeconds, 15);
              appendRoomLog(
                room,
                `💥 Ly Trà Đá của ${player.displayName} tự vỡ cứu nguy (+30 giây)!`
              );
              continue;
            }

            player.timedOut = true;
            player.phoneOpen = false;
            appendRoomLog(
              room,
              `⏰ ${player.displayName} hết 3 phút trong ván này — tự động Bỏ bài!`
            );
            emittedEvents.push({
              type: 'PLAYER_TIMED_OUT',
              roomId: room.id,
              accountId: player.accountId,
              displayName: player.displayName,
            });

            if (isCurrentTurn && !player.folded) {
              const betRes = await this.placeBetUseCase.execute({
                roomId: room.id,
                accountId: player.accountId,
                action: 'FOLD',
              });
              emittedEvents.push(...betRes.events);
            } else {
              player.folded = true;
            }
          }
        }

        // 3. Handle current actor turn timeout or Bot AI action
        const actorAfterTick =
          room.currentTurnIndex >= 0 ? room.players[room.currentTurnIndex] : null;

        if (
          actorAfterTick &&
          !actorAfterTick.eliminated &&
          !actorAfterTick.folded &&
          !actorAfterTick.allIn &&
          (room.phase as string) !== 'SHOWDOWN'
        ) {
          if (actorAfterTick.isBot) {
            const botKey = `${room.id}:${actorAfterTick.accountId}:${room.handNumber}`;
            const ticks = (this.botThinkTicks.get(botKey) ?? 0) + 1;
            if (ticks >= 2) {
              this.botThinkTicks.delete(botKey);
              // Strict Fog-of-War: Bot ONLY receives the exact same filtered state a human player gets!
              const botViewState = filterRoomStateForViewer(room, actorAfterTick.accountId);
              const botSelfView = botViewState.players.find(
                (p) => p.accountId === actorAfterTick.accountId
              )!;
              const decision = this.botAI.decide(botViewState, botSelfView);
              if (decision.itemToUse) {
                try {
                  await this.useItemUseCase.execute({
                    roomId: room.id,
                    accountId: actorAfterTick.accountId,
                    itemType: decision.itemToUse,
                  });
                } catch {
                  // Ignore item failure for bot
                }
              }
              const betRes = await this.placeBetUseCase.execute({
                roomId: room.id,
                accountId: actorAfterTick.accountId,
                action: decision.action,
                raiseAmount: decision.raiseAmount,
              });
              this.botAI.updateAfterRound(betRes.room);
              emittedEvents.push(...betRes.events);
              dirty = true;
            } else {
              this.botThinkTicks.set(botKey, ticks);
            }
          } else if (actorAfterTick.turnRemainingSeconds <= 0) {
            const toCall = Math.max(0, room.currentBet - actorAfterTick.currentBet);
            const fallbackAction = toCall === 0 ? 'CHECK' : 'FOLD';
            const betRes = await this.placeBetUseCase.execute({
              roomId: room.id,
              accountId: actorAfterTick.accountId,
              action: fallbackAction,
            });
            this.botAI.observeAction(betRes.room, actorAfterTick.accountId, fallbackAction, toCall);
            this.botAI.updateAfterRound(betRes.room);
            emittedEvents.push(...betRes.events);
            dirty = true;
          }
        }

        if (dirty) {
          await this.roomRepo.save(room);
          this.callbacks.onRoomUpdated(room);
        }
        if (emittedEvents.length > 0) {
          this.callbacks.onDomainEvents(room, emittedEvents);
        }
      }
    } catch (err) {
      console.error('[MatchTimerLoop] Tick error:', err);
    } finally {
      this.isTicking = false;
    }
  }
}
