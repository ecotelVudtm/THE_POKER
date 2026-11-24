import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameDomainEvent } from '../../application/dtos/GameEvents';
import { JoinRoomUseCase } from '../../application/use-cases/JoinRoomUseCase';
import { PlaceBetUseCase } from '../../application/use-cases/PlaceBetUseCase';
import { RepayLoanUseCase } from '../../application/use-cases/RepayLoanUseCase';
import { StartMatchUseCase } from '../../application/use-cases/StartMatchUseCase';
import { SubmitMiniGameUseCase } from '../../application/use-cases/SubmitMiniGameUseCase';
import { TakeLoanUseCase } from '../../application/use-cases/TakeLoanUseCase';
import { TriggerSkillUseCase } from '../../application/use-cases/TriggerSkillUseCase';
import { UseItemUseCase } from '../../application/use-cases/UseItemUseCase';
import { toPublicAccount } from '../../domain/entities/Account';
import { BetAction, Room, RoomMode } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { filterRoomStateForViewer } from '../../domain/rules/StateFilter';
import { ItemType } from '../../domain/value-objects/Item';
import { LoanPackage } from '../../domain/value-objects/Loan';
import { MiniGameSubmissionPayload, SkillType } from '../../domain/value-objects/Skill';
import { RateLimiter } from '../../infrastructure/security/RateLimiter';
import { TokenService } from '../../infrastructure/security/TokenService';

export interface SocketGatewayDeps {
  accountRepo: IAccountRepository;
  roomRepo: IRoomRepository;
  tokenService: TokenService;
  rateLimiter: RateLimiter;
  joinRoomUseCase: JoinRoomUseCase;
  startMatchUseCase: StartMatchUseCase;
  placeBetUseCase: PlaceBetUseCase;
  triggerSkillUseCase: TriggerSkillUseCase;
  submitMiniGameUseCase: SubmitMiniGameUseCase;
  useItemUseCase: UseItemUseCase;
  takeLoanUseCase: TakeLoanUseCase;
  repayLoanUseCase: RepayLoanUseCase;
  corsOrigin: string;
}

export class SocketGateway {
  public readonly io: Server;
  /** Per-room async mutex queue preventing race-condition double bets / double payouts */
  private readonly roomLocks = new Map<string, Promise<void>>();

  constructor(httpServer: HttpServer, private readonly deps: SocketGatewayDeps) {
    this.io = new Server(httpServer, {
      cors: {
        origin: deps.corsOrigin === '*' ? true : deps.corsOrigin.split(','),
        credentials: true,
      },
      maxHttpBufferSize: 32 * 1024, // 32KB max packet size anti-DoS
    });

    this.registerHandlers();
  }

  private async runSerialized<T>(roomKey: string | undefined, task: () => Promise<T>): Promise<T> {
    const key = (roomKey || 'global').trim().toUpperCase();
    const prev = this.roomLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => current);
    this.roomLocks.set(key, chained);

    await prev;
    try {
      return await task();
    } finally {
      release();
      if (this.roomLocks.get(key) === chained) {
        this.roomLocks.delete(key);
      }
    }
  }

  private assertSocketRateLimit(socket: Socket, maxEvents = 35, windowMs = 5_000): void {
    const check = this.deps.rateLimiter.consume(`sock:${socket.id}`, maxEvents, windowMs);
    if (!check.allowed) {
      throw new Error('Thao tác quá nhanh. Hệ thống chống spam đang tạm chặn.');
    }
  }

  private registerHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      socket.on(
        'authenticate',
        async (payload: { token?: string }) => {
          try {
            this.assertSocketRateLimit(socket, 15, 10_000);
            const verified = this.deps.tokenService.verify(payload?.token);
            if (!verified) {
              socket.data.accountId = undefined;
              socket.emit('auth_error', {
                message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
              });
              return;
            }
            const account = await this.deps.accountRepo.findById(verified.accountId);
            if (!account) {
              socket.data.accountId = undefined;
              socket.emit('auth_error', {
                message: 'Tài khoản không tồn tại. Vui lòng đăng nhập lại.',
              });
              return;
            }
            socket.data.accountId = account.id;
            socket.emit('authenticated', { account: toPublicAccount(account) });
          } catch (err) {
            this.emitError(socket, 'authenticate', err);
          }
        }
      );

      socket.on('ping_check', (clientTs: number, ack?: (serverTs: number) => void) => {
        if (typeof ack === 'function') {
          ack(clientTs);
        }
      });

      socket.on(
        'create_room',
        async (payload: {
          roomName?: string;
          mode?: RoomMode;
          quickArenaMatch?: boolean;
          botCount?: number;
          maxBuyIn?: number;
        }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const room = await this.deps.joinRoomUseCase.execute({
              accountId,
              socketId: socket.id,
              roomName: payload?.roomName,
              mode: payload?.mode,
              quickArenaMatch: payload?.quickArenaMatch,
              botCount: payload?.botCount,
              maxBuyIn: payload?.maxBuyIn,
            });
            await socket.join(room.id);
            this.broadcastRoomState(room);
          } catch (err) {
            this.emitError(socket, 'create_room', err);
          }
        }
      );

      socket.on(
        'join_room',
        async (payload: { roomId: string }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const room = await this.runSerialized(payload?.roomId, () =>
              this.deps.joinRoomUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                socketId: socket.id,
              })
            );
            await socket.join(room.id);
            this.broadcastRoomState(room);
          } catch (err) {
            this.emitError(socket, 'join_room', err);
          }
        }
      );

      socket.on('leave_room', async (payload: { roomId: string }) => {
        try {
          this.assertSocketRateLimit(socket);
          const accountId = this.resolveAccountId(socket);
          await this.runSerialized(payload?.roomId, async () => {
            const room = await this.deps.roomRepo.findById(payload?.roomId);
            if (!room) return;
            if (room.status === 'WAITING') {
              room.players = room.players.filter((p) => p.accountId !== accountId);
              if (room.players.filter((p) => !p.isBot).length === 0) {
                await this.deps.roomRepo.delete(room.id);
              } else {
                await this.deps.roomRepo.save(room);
                this.broadcastRoomState(room);
              }
            } else {
              const player = room.players.find((p) => p.accountId === accountId);
              if (player) {
                player.socketId = null;
                player.phoneOpen = false;
                await this.deps.roomRepo.save(room);
                this.broadcastRoomState(room);
              }
            }
            await socket.leave(room.id);
          });
        } catch (err) {
          this.emitError(socket, 'leave_room', err);
        }
      });

      socket.on('start_match', async (payload: { roomId: string }) => {
        try {
          this.assertSocketRateLimit(socket);
          const accountId = this.resolveAccountId(socket);
          const result = await this.runSerialized(payload?.roomId, () =>
            this.deps.startMatchUseCase.execute(payload?.roomId, accountId)
          );
          this.broadcastRoomState(result.room);
          this.dispatchDomainEvents(result.room, result.events);
        } catch (err) {
          this.emitError(socket, 'start_match', err);
        }
      });

      socket.on(
        'place_bet',
        async (payload: { roomId: string; action: BetAction; raiseAmount?: number }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const result = await this.runSerialized(payload?.roomId, () =>
              this.deps.placeBetUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                action: payload?.action,
                raiseAmount: payload?.raiseAmount,
              })
            );
            this.broadcastRoomState(result.room);
            this.dispatchDomainEvents(result.room, result.events);
          } catch (err) {
            this.emitError(socket, 'place_bet', err);
          }
        }
      );

      socket.on(
        'trigger_skill',
        async (payload: {
          roomId: string;
          skillType: SkillType;
          targetAccountId?: string;
          cardIndex?: 0 | 1;
        }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const result = await this.runSerialized(payload?.roomId, () =>
              this.deps.triggerSkillUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                skillType: payload?.skillType,
                targetAccountId: payload?.targetAccountId,
                cardIndex: payload?.cardIndex,
              })
            );
            this.broadcastRoomState(result.room);
            this.dispatchDomainEvents(result.room, result.events);
          } catch (err) {
            this.emitError(socket, 'trigger_skill', err);
          }
        }
      );

      socket.on(
        'submit_minigame',
        async (payload: { roomId: string; payload: MiniGameSubmissionPayload }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const result = await this.runSerialized(payload?.roomId, () =>
              this.deps.submitMiniGameUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                payload: payload?.payload,
              })
            );
            this.broadcastRoomState(result.room);
            this.dispatchDomainEvents(result.room, result.events);
          } catch (err) {
            this.emitError(socket, 'submit_minigame', err);
          }
        }
      );

      socket.on(
        'use_item',
        async (payload: { roomId: string; itemType: ItemType }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const room = await this.runSerialized(payload?.roomId, () =>
              this.deps.useItemUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                itemType: payload?.itemType,
                action: 'USE',
              })
            );
            this.broadcastRoomState(room);
          } catch (err) {
            this.emitError(socket, 'use_item', err);
          }
        }
      );

      socket.on(
        'discard_item',
        async (payload: { roomId: string; itemType: ItemType }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const room = await this.runSerialized(payload?.roomId, () =>
              this.deps.useItemUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                itemType: payload?.itemType,
                action: 'DISCARD',
              })
            );
            this.broadcastRoomState(room);
          } catch (err) {
            this.emitError(socket, 'discard_item', err);
          }
        }
      );

      socket.on(
        'take_loan',
        async (payload: { roomId: string; packageType: LoanPackage }) => {
          try {
            this.assertSocketRateLimit(socket);
            const accountId = this.resolveAccountId(socket);
            const room = await this.runSerialized(payload?.roomId, () =>
              this.deps.takeLoanUseCase.execute({
                roomId: payload?.roomId,
                accountId,
                packageType: payload?.packageType,
              })
            );
            this.broadcastRoomState(room);
          } catch (err) {
            this.emitError(socket, 'take_loan', err);
          }
        }
      );

      socket.on('repay_loan', async (payload: { roomId: string }) => {
        try {
          this.assertSocketRateLimit(socket);
          const accountId = this.resolveAccountId(socket);
          const room = await this.runSerialized(payload?.roomId, () =>
            this.deps.repayLoanUseCase.execute({
              roomId: payload?.roomId,
              accountId,
            })
          );
          this.broadcastRoomState(room);
        } catch (err) {
          this.emitError(socket, 'repay_loan', err);
        }
      });

      socket.on('open_phone', async (payload: { roomId: string }) => {
        await this.setPhoneOpen(socket, payload?.roomId, true);
      });

      socket.on('close_phone', async (payload: { roomId: string }) => {
        await this.setPhoneOpen(socket, payload?.roomId, false);
      });

      socket.on('disconnect', async () => {
        try {
          this.deps.rateLimiter.clearKey(`sock:${socket.id}`);
          const room = await this.deps.roomRepo.findBySocketId(socket.id);
          if (!room) return;
          const player = room.players.find((p) => p.socketId === socket.id);
          if (player) {
            player.socketId = null;
            player.phoneOpen = false;
            await this.deps.roomRepo.save(room);
            this.broadcastRoomState(room);
          }
        } catch (err) {
          console.error('[SocketGateway] disconnect error:', err);
        }
      });
    });
  }

  private async setPhoneOpen(
    socket: Socket,
    roomId: string,
    open: boolean
  ): Promise<void> {
    try {
      this.assertSocketRateLimit(socket);
      const accountId = this.resolveAccountId(socket);
      const room = await this.deps.roomRepo.findById(roomId);
      if (!room) return;
      const player = room.players.find((p) => p.accountId === accountId);
      if (!player) return;
      player.phoneOpen = open;
      await this.deps.roomRepo.save(room);
      this.broadcastRoomState(room);
    } catch (err) {
      this.emitError(socket, open ? 'open_phone' : 'close_phone', err);
    }
  }

  /**
   * Sends a strictly per-socket filtered `room_state_update` to every connected player in the room.
   */
  public broadcastRoomState(room: Room): void {
    for (const player of room.players) {
      if (!player.socketId) continue;
      const filteredState = filterRoomStateForViewer(room, player.accountId);
      this.io.to(player.socketId).emit('room_state_update', filteredState);
    }
  }

  public dispatchDomainEvents(room: Room, events: GameDomainEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'MINIGAME_CHALLENGE': {
          const socketId = this.findSocketId(room, ev.targetAccountId);
          if (socketId) {
            this.io.to(socketId).emit('minigame_challenge', ev.challenge);
          }
          break;
        }
        case 'EAGLE_EYE_REVEAL': {
          const socketId = this.findSocketId(room, ev.targetAccountId);
          if (socketId) {
            this.io.to(socketId).emit('eagle_eye_reveal', {
              nextCommunityCard: ev.nextCommunityCard,
            });
          }
          break;
        }
        case 'DEBT_CALL_INCOMING': {
          const socketId = this.findSocketId(room, ev.targetAccountId);
          if (socketId) {
            this.io.to(socketId).emit('debt_call_incoming', {
              currentOwed: ev.currentOwed,
              handsElapsed: ev.handsElapsed,
            });
          }
          break;
        }
        case 'MINIGAME_RESULT': {
          this.io.to(room.id).emit('minigame_result', ev);
          break;
        }
        case 'ITEM_LOCKED': {
          this.io.to(room.id).emit('item_locked', ev);
          break;
        }
        case 'LUCKY_COIN_TRIGGERED': {
          this.io.to(room.id).emit('lucky_coin_triggered', ev);
          break;
        }
        case 'ITEM_UNLOCKED': {
          this.io.to(room.id).emit('item_unlocked', ev);
          break;
        }
        case 'WIN_STREAK_BONUS': {
          this.io.to(room.id).emit('win_streak_bonus', ev);
          break;
        }
        case 'ARENA_BILL_EARNED': {
          this.io.to(room.id).emit('arena_bill_earned', ev);
          break;
        }
        case 'PLAYER_TIMED_OUT': {
          this.io.to(room.id).emit('player_timed_out', ev);
          break;
        }
      }
    }
  }

  private findSocketId(room: Room, accountId: string): string | null {
    return room.players.find((p) => p.accountId === accountId)?.socketId ?? null;
  }

  /**
   * Strictly derives account identity from server-verified socket.data.accountId.
   * NEVER trusts client-supplied accountId fields in event payloads!
   */
  private resolveAccountId(socket: Socket): string {
    const id = socket.data.accountId as string | undefined;
    if (!id) {
      throw new Error('Chưa xác thực phiên đăng nhập. Vui lòng đăng nhập lại.');
    }
    return id;
  }

  private emitError(socket: Socket, event: string, err: unknown): void {
    socket.emit('error_event', {
      event,
      message: err instanceof Error ? err.message : 'Unexpected server error',
    });
  }
}
