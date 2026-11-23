import crypto from 'crypto';
import { createDefaultSkillMastery } from '../../domain/entities/Account';
import {
  addVia,
  INITIAL_TIME_BANK_SECONDS,
  TURN_TIME_LIMIT_SECONDS,
} from '../../domain/entities/Player';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { createInitialItemsState, LOCKABLE_ITEMS } from '../../domain/value-objects/Item';
import {
  accrueLoanForNextHand,
  LOAN_DEFAULT_ITEM_LOCK_HANDS,
} from '../../domain/value-objects/Loan';
import { GameDomainEvent } from '../dtos/GameEvents';

export interface StartMatchResult {
  room: Room;
  events: GameDomainEvent[];
}

export class StartMatchUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(roomId: string, requesterAccountId?: string): Promise<StartMatchResult> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new Error('Room not found.');
    }

    if (
      requesterAccountId &&
      room.status === 'WAITING' &&
      room.hostAccountId !== requesterAccountId
    ) {
      throw new Error('Only the room host can start the match.');
    }

    const events: GameDomainEvent[] = [];

    // Full match reset when starting from WAITING or restarting after FINISHED
    // Items & Skill Mastery are per-match only; only Chips persist permanently!
    const isFreshMatch = room.status === 'WAITING' || room.status === 'FINISHED';
    if (isFreshMatch) {
      room.handNumber = 0;
      for (const player of room.players) {
        player.timeBankSeconds = INITIAL_TIME_BANK_SECONDS;
        player.turnRemainingSeconds = TURN_TIME_LIMIT_SECONDS;
        player.timedOut = false;
        player.eliminated = false;
        player.folded = false;
        player.matchWins = 0;
        player.winStreak = 0;
        player.ownedItems = player.isBot ? ['ICED_TEA', 'INCENSE_BOWL'] : [];
        player.skillMastery = createDefaultSkillMastery();
        player.itemsState = createInitialItemsState();
        if (player.chips <= 0) {
          player.chips = 10000;
        }
      }
    }

    // Update elimination status, cooldowns, and loan interest for the new hand
    for (const player of room.players) {
      // Tick item cooldowns & lock timers
      if (player.itemsState.incenseCooldownHands > 0) {
        player.itemsState.incenseCooldownHands -= 1;
      }
      if (player.itemsState.icedTeaCooldownHands > 0) {
        player.itemsState.icedTeaCooldownHands -= 1;
      }
      if (player.itemsState.lockedItemHandsLeft > 0) {
        player.itemsState.lockedItemHandsLeft -= 1;
        if (player.itemsState.lockedItemHandsLeft === 0) {
          player.itemsState.lockedItem = null;
        }
      }

      // Accrue interest on active loan
      if (player.activeLoan && room.handNumber > 0) {
        const { updatedLoan, isOverdue } = accrueLoanForNextHand(player.activeLoan);
        player.activeLoan = updatedLoan;

        if (isOverdue) {
          player.statusEffects.debtPressure = true;
          events.push({
            type: 'DEBT_CALL_INCOMING',
            targetAccountId: player.accountId,
            currentOwed: updatedLoan.currentOwed,
            handsElapsed: updatedLoan.handsElapsed,
          });
          appendRoomLog(
            room,
            `📞 ${player.displayName} bị chủ nợ réo đòi ${updatedLoan.currentOwed} chip!`
          );
        }

        // Cannot repay when out of chips -> default & lock 1 random item for 2 hands
        if (player.chips <= 0) {
          const lockedItem =
            LOCKABLE_ITEMS[crypto.randomInt(0, LOCKABLE_ITEMS.length)];
          player.itemsState.lockedItem = lockedItem;
          player.itemsState.lockedItemHandsLeft = LOAN_DEFAULT_ITEM_LOCK_HANDS;
          player.statusEffects.debtPressure = false;

          if (!player.isBot) {
            const acc = await this.accountRepo.findById(player.accountId);
            if (acc) {
              const rec = acc.debtHistory.find((d) => d.loanId === updatedLoan.loanId);
              if (rec) {
                rec.status = 'DEFAULTED';
                rec.resolvedAt = new Date().toISOString();
                await this.accountRepo.update(acc);
              }
            }
          }
          player.activeLoan = null;
          events.push({
            type: 'ITEM_LOCKED',
            roomId: room.id,
            accountId: player.accountId,
            item: lockedItem,
            handsLeft: LOAN_DEFAULT_ITEM_LOCK_HANDS,
          });
          appendRoomLog(
            room,
            `🔒 ${player.displayName} vỡ nợ, bị khóa vật phẩm ${lockedItem} trong ${LOAN_DEFAULT_ITEM_LOCK_HANDS} ván!`
          );
        }
      }

      if (player.chips <= 0 || player.timedOut || player.timeBankSeconds <= 0) {
        player.eliminated = true;
      }
    }

    const activePlayers = room.players.filter((p) => !p.eliminated);
    const activeHumans = activePlayers.filter((p) => !p.isBot);
    if (activePlayers.length < 2 || activeHumans.length === 0) {
      room.status = 'FINISHED';
      room.phase = 'WAITING';
      room.currentTurnIndex = -1;
      appendRoomLog(room, 'Trận đấu kết thúc — bấm "CHƠI TRẬN MỚI" để reset thời gian 05:00!');
      await this.roomRepo.save(room);
      return { room, events };
    }

    // Grant +15s time-bank recovery (up to 300s) for surviving players on each new hand
    if (!isFreshMatch && room.handNumber > 0) {
      for (const p of activePlayers) {
        p.timeBankSeconds = Math.min(INITIAL_TIME_BANK_SECONDS, p.timeBankSeconds + 15);
      }
    }

    // Increment match counter on first hand
    if (room.handNumber === 0) {
      for (const player of activePlayers) {
        if (!player.isBot) {
          const acc = await this.accountRepo.findById(player.accountId);
          if (acc) {
            acc.stats.matchesPlayed += 1;
            await this.accountRepo.update(acc);
          }
        }
      }
    }

    // Setup new hand
    room.status = 'PLAYING';
    room.phase = 'PRE_FLOP';
    room.handNumber += 1;
    room.pot = 0;
    room.sidePots = [];
    room.communityCards = [];
    room.lastWinners = [];
    room.currentBet = room.bigBlind;
    room.minRaise = room.bigBlind;
    room.deck.reset();

    // Reset per-hand player states
    for (const player of room.players) {
      player.currentBet = 0;
      player.totalBetInHand = 0;
      player.holeCards = [];
      player.exposedCardIndices = [];
      player.folded = player.eliminated;
      player.allIn = false;
      player.hasActedThisRound = false;
      player.turnRemainingSeconds = TURN_TIME_LIMIT_SECONDS;
      player.activeChallenge = null;
      player.allInWinProbability = null;
      // Per-hand buffs/debuffs reset
      player.statusEffects.blessed = false;
      player.statusEffects.pressured = false;
      player.statusEffects.debtPressureSuppressedThisHand = false;
      player.statusEffects.icedTeaActive = false;
    }

    // Advance dealer button to next non-eliminated player
    room.dealerIndex = this.findNextActiveIndex(room, room.dealerIndex);

    // Determine Small Blind & Big Blind seats (heads-up rule: dealer is SB)
    const sbIndex =
      activePlayers.length === 2
        ? room.dealerIndex
        : this.findNextActiveIndex(room, room.dealerIndex);
    const bbIndex = this.findNextActiveIndex(room, sbIndex);

    this.postBlind(room, room.players[sbIndex], room.smallBlind);
    this.postBlind(room, room.players[bbIndex], room.bigBlind);

    // Deal 2 hole cards to each active player
    for (let round = 0; round < 2; round++) {
      for (const player of room.players) {
        if (!player.eliminated) {
          const card = player.statusEffects.blessed
            ? room.deck.drawBiased(player.holeCards)
            : room.deck.draw();
          player.holeCards.push(card);
        }
      }
    }

    // First to act pre-flop is after Big Blind
    const firstTurnIndex = this.findNextActionableIndex(room, bbIndex);
    room.currentTurnIndex = firstTurnIndex;
    if (firstTurnIndex >= 0) {
      room.players[firstTurnIndex].turnRemainingSeconds = TURN_TIME_LIMIT_SECONDS;
    }

    // Ensure players have at least a small Vía trickle if brand new
    for (const p of activePlayers) {
      addVia(p, 0);
    }

    appendRoomLog(
      room,
      `--- Ván #${room.handNumber} bắt đầu (Blinds ${room.smallBlind}/${room.bigBlind}) ---`
    );

    await this.roomRepo.save(room);
    return { room, events };
  }

  private postBlind(room: Room, player: Room['players'][number], amount: number): void {
    const actual = Math.min(player.chips, amount);
    player.chips -= actual;
    player.currentBet += actual;
    player.totalBetInHand += actual;
    room.pot += actual;
    if (player.chips === 0) {
      player.allIn = true;
    }
  }

  private findNextActiveIndex(room: Room, fromIndex: number): number {
    const n = room.players.length;
    for (let offset = 1; offset <= n; offset++) {
      const idx = (fromIndex + offset + n) % n;
      if (!room.players[idx].eliminated) {
        return idx;
      }
    }
    return -1;
  }

  private findNextActionableIndex(room: Room, fromIndex: number): number {
    const n = room.players.length;
    for (let offset = 1; offset <= n; offset++) {
      const idx = (fromIndex + offset + n) % n;
      const p = room.players[idx];
      if (!p.eliminated && !p.folded && !p.allIn) {
        return idx;
      }
    }
    return -1;
  }
}
