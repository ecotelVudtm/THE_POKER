import crypto from 'crypto';
import {
  addVia,
  Player,
  TURN_TIME_LIMIT_SECONDS,
  VIA_GAIN_ON_WIN,
  VIA_GAIN_PER_ROUND,
} from '../../domain/entities/Player';
import { appendRoomLog, BetAction, GamePhase, HandWinner, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import {
  estimateHandStrength,
  EvaluatedHand,
  evaluateBestHand,
} from '../../domain/rules/HandEvaluator';
import { calculateSidePots, distributePots } from '../../domain/rules/PotCalculator';
import { ALL_ITEMS, ITEM_CONFIG } from '../../domain/value-objects/Item';
import { GameDomainEvent } from '../dtos/GameEvents';

export interface PlaceBetInput {
  roomId: string;
  accountId: string;
  action: BetAction;
  raiseAmount?: number;
}

export interface PlaceBetResult {
  room: Room;
  events: GameDomainEvent[];
  handFinished: boolean;
}

export class PlaceBetUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(input: PlaceBetInput): Promise<PlaceBetResult> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');
    if (room.status !== 'PLAYING' || room.phase === 'WAITING' || room.phase === 'SHOWDOWN') {
      throw new Error('No active betting round.');
    }

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.accountId !== input.accountId) {
      throw new Error('It is not your turn.');
    }
    if (currentPlayer.folded || currentPlayer.allIn || currentPlayer.eliminated) {
      throw new Error('Player cannot act in this state.');
    }

    const events: GameDomainEvent[] = [];
    const toCall = Math.max(0, room.currentBet - currentPlayer.currentBet);

    switch (input.action) {
      case 'FOLD': {
        currentPlayer.folded = true;
        currentPlayer.hasActedThisRound = true;
        appendRoomLog(room, `${currentPlayer.displayName} bỏ bài (Fold).`);
        break;
      }
      case 'CHECK': {
        if (toCall > 0) {
          throw new Error(`Cannot check when ${toCall} chips are required to call.`);
        }
        currentPlayer.hasActedThisRound = true;
        appendRoomLog(room, `${currentPlayer.displayName} xem bài (Check).`);
        break;
      }
      case 'CALL': {
        const contribution = Math.min(currentPlayer.chips, toCall);
        this.commitChips(room, currentPlayer, contribution);
        currentPlayer.hasActedThisRound = true;
        if (currentPlayer.allIn) {
          this.snapshotAllInProbability(currentPlayer, room);
        }
        appendRoomLog(
          room,
          `${currentPlayer.displayName} theo ${contribution} chip${currentPlayer.allIn ? ' (All-In)' : ''}.`
        );
        break;
      }
      case 'RAISE': {
        const desiredRaiseBy = input.raiseAmount ?? room.minRaise;
        const minTotalBet = room.currentBet + room.minRaise;
        const targetTotalBet = Math.max(minTotalBet, room.currentBet + desiredRaiseBy);
        const needed = targetTotalBet - currentPlayer.currentBet;

        if (needed <= 0) {
          throw new Error('Invalid raise amount.');
        }

        const contribution = Math.min(currentPlayer.chips, needed);
        const previousRoomBet = room.currentBet;
        this.commitChips(room, currentPlayer, contribution);

        if (currentPlayer.currentBet > previousRoomBet) {
          const raiseDelta = currentPlayer.currentBet - previousRoomBet;
          room.minRaise = Math.max(room.minRaise, raiseDelta);
          room.currentBet = currentPlayer.currentBet;
          // Everyone else must act again
          for (const p of room.players) {
            if (p.accountId !== currentPlayer.accountId && !p.folded && !p.allIn && !p.eliminated) {
              p.hasActedThisRound = false;
            }
          }
        }
        currentPlayer.hasActedThisRound = true;
        if (currentPlayer.allIn) {
          this.snapshotAllInProbability(currentPlayer, room);
        }
        appendRoomLog(
          room,
          `${currentPlayer.displayName} tố lên ${currentPlayer.currentBet}${currentPlayer.allIn ? ' (All-In!)' : ''}.`
        );
        break;
      }
      case 'ALL_IN': {
        const contribution = currentPlayer.chips;
        const previousRoomBet = room.currentBet;
        this.commitChips(room, currentPlayer, contribution);
        this.snapshotAllInProbability(currentPlayer, room);

        if (currentPlayer.currentBet > previousRoomBet) {
          const raiseDelta = currentPlayer.currentBet - previousRoomBet;
          if (raiseDelta >= room.minRaise) {
            room.minRaise = raiseDelta;
          }
          room.currentBet = currentPlayer.currentBet;
          for (const p of room.players) {
            if (p.accountId !== currentPlayer.accountId && !p.folded && !p.allIn && !p.eliminated) {
              p.hasActedThisRound = false;
            }
          }
        }
        currentPlayer.hasActedThisRound = true;
        appendRoomLog(
          room,
          `🔥 ${currentPlayer.displayName} TẤT TAY (All-In ${contribution} chip)!`
        );
        break;
      }
    }

    // Clear turn-specific icedTeaActive once the player finishes their turn
    currentPlayer.statusEffects.icedTeaActive = false;

    // Check if only one non-folded player remains
    const remainingPlayers = room.players.filter((p) => !p.eliminated && !p.folded);
    if (remainingPlayers.length === 1) {
      await this.resolveSingleSurvivor(room, remainingPlayers[0], events);
      await this.roomRepo.save(room);
      return { room, events, handFinished: true };
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete(room)) {
      const handFinished = await this.advancePhase(room, events);
      await this.roomRepo.save(room);
      return { room, events, handFinished };
    }

    // Move to next actionable player
    const nextIdx = this.findNextActionableIndex(room, room.currentTurnIndex);
    room.currentTurnIndex = nextIdx;
    if (nextIdx >= 0) {
      room.players[nextIdx].turnRemainingSeconds = TURN_TIME_LIMIT_SECONDS;
    }

    await this.roomRepo.save(room);
    return { room, events, handFinished: false };
  }

  private commitChips(room: Room, player: Player, amount: number): void {
    player.chips -= amount;
    player.currentBet += amount;
    player.totalBetInHand += amount;
    room.pot += amount;
    if (player.chips === 0) {
      player.allIn = true;
    }
  }

  private snapshotAllInProbability(player: Player, room: Room): void {
    if (player.allInWinProbability === null && player.holeCards.length === 2) {
      player.allInWinProbability = estimateHandStrength(
        player.holeCards,
        room.communityCards
      );
    }
  }

  private isBettingRoundComplete(room: Room): boolean {
    const actionable = room.players.filter(
      (p) => !p.eliminated && !p.folded && !p.allIn
    );
    if (actionable.length === 0) return true;
    return actionable.every(
      (p) => p.hasActedThisRound && p.currentBet === room.currentBet
    );
  }

  private async advancePhase(room: Room, events: GameDomainEvent[]): Promise<boolean> {
    // Award +10 Vía to all active non-folded players at the end of each betting round
    // Also reset per-round iced tea sip flag (max 1 sip per betting round)
    for (const p of room.players) {
      if (!p.eliminated && !p.folded) {
        addVia(p, VIA_GAIN_PER_ROUND);
      }
      p.currentBet = 0;
      p.hasActedThisRound = false;
      p.itemsState.icedTeaUsedThisRound = false;
    }
    room.currentBet = 0;
    room.minRaise = room.bigBlind;

    const nextPhaseMap: Record<GamePhase, GamePhase> = {
      WAITING: 'PRE_FLOP',
      PRE_FLOP: 'FLOP',
      FLOP: 'TURN',
      TURN: 'RIVER',
      RIVER: 'SHOWDOWN',
      SHOWDOWN: 'SHOWDOWN',
    };

    const nextPhase = nextPhaseMap[room.phase];
    room.phase = nextPhase;

    if (nextPhase === 'FLOP') {
      room.communityCards.push(room.deck.draw(), room.deck.draw(), room.deck.draw());
      appendRoomLog(room, 'Lật bài FLOP (3 lá chung).');
    } else if (nextPhase === 'TURN') {
      room.communityCards.push(room.deck.draw());
      appendRoomLog(room, 'Lật bài TURN (lá chung thứ 4).');
    } else if (nextPhase === 'RIVER') {
      room.communityCards.push(room.deck.draw());
      appendRoomLog(room, 'Lật bài RIVER (lá chung thứ 5).');
    } else if (nextPhase === 'SHOWDOWN') {
      await this.resolveShowdown(room, events);
      return true;
    }

    // If fewer than 2 players can still make bets (everyone else is all-in), run out remaining board
    const canStillBet = room.players.filter(
      (p) => !p.eliminated && !p.folded && !p.allIn
    );
    if (canStillBet.length < 2) {
      return this.advancePhase(room, events);
    }

    const firstIdx = this.findNextActionableIndex(room, room.dealerIndex);
    room.currentTurnIndex = firstIdx;
    if (firstIdx >= 0) {
      room.players[firstIdx].turnRemainingSeconds = TURN_TIME_LIMIT_SECONDS;
    }
    return false;
  }

  private async resolveSingleSurvivor(
    room: Room,
    winner: Player,
    events: GameDomainEvent[]
  ): Promise<void> {
    room.phase = 'SHOWDOWN';
    room.currentTurnIndex = -1;

    const wonAmount = room.pot;
    winner.chips += wonAmount;
    addVia(winner, VIA_GAIN_ON_WIN);

    room.lastWinners = [
      {
        accountId: winner.accountId,
        displayName: winner.displayName,
        amount: wonAmount,
        handName: 'Đối thủ bỏ bài',
        bestCards: [],
      },
    ];
    appendRoomLog(room, `🏆 ${winner.displayName} thắng ${wonAmount} chip!`);

    await this.syncAccountsAfterHand(room, new Set([winner.accountId]), events);
  }

  private async resolveShowdown(room: Room, events: GameDomainEvent[]): Promise<void> {
    room.currentTurnIndex = -1;

    const contenders = room.players.filter((p) => !p.eliminated && !p.folded);
    const evaluatedMap = new Map<string, EvaluatedHand>();
    for (const p of contenders) {
      const hand = evaluateBestHand([...p.holeCards, ...room.communityCards]);
      evaluatedMap.set(p.accountId, hand);
    }

    const contributions = room.players.map((p) => ({
      accountId: p.accountId,
      totalBetInHand: p.totalBetInHand,
      folded: p.folded,
    }));

    room.sidePots = calculateSidePots(contributions);
    const payouts = distributePots(room.sidePots, evaluatedMap);

    const winnerIds = new Set<string>();
    const winners: HandWinner[] = [];

    for (const payout of payouts) {
      const player = room.players.find((p) => p.accountId === payout.accountId);
      const hand = evaluatedMap.get(payout.accountId);
      if (!player || !hand) continue;

      player.chips += payout.amount;
      addVia(player, VIA_GAIN_ON_WIN);
      winnerIds.add(player.accountId);

      winners.push({
        accountId: player.accountId,
        displayName: player.displayName,
        amount: payout.amount,
        handName: hand.name,
        bestCards: hand.bestCards,
      });

      appendRoomLog(
        room,
        `🏆 ${player.displayName} thắng ${payout.amount} chip với ${hand.name}!`
      );
    }

    room.lastWinners = winners;

    // LUCKY_COIN passive: refund 15% of bet if player owns LUCKY_COIN and lost an All-In with initial win prob < 25%
    for (const player of room.players) {
      const ownsCoin = player.ownedItems.includes('LUCKY_COIN');
      const isCoinLocked = player.itemsState.lockedItem === 'LUCKY_COIN';
      if (
        ownsCoin &&
        !isCoinLocked &&
        player.allIn &&
        !winnerIds.has(player.accountId) &&
        player.allInWinProbability !== null &&
        player.allInWinProbability < ITEM_CONFIG.LUCKY_COIN.maxWinProbabilityThreshold &&
        player.totalBetInHand > 0
      ) {
        const refund = Math.floor(
          player.totalBetInHand * ITEM_CONFIG.LUCKY_COIN.refundRatio
        );
        if (refund > 0) {
          player.chips += refund;
          events.push({
            type: 'LUCKY_COIN_TRIGGERED',
            roomId: room.id,
            accountId: player.accountId,
            refundAmount: refund,
            winProbability: Number(player.allInWinProbability.toFixed(3)),
          });
          appendRoomLog(
            room,
            `🪙 Đồng xu hộ mệnh cứu ${player.displayName}, hoàn lại ${refund} chip!`
          );
        }
      }
    }

    await this.syncAccountsAfterHand(room, winnerIds, events);
  }

  private async syncAccountsAfterHand(
    room: Room,
    winnerIds: Set<string>,
    events: GameDomainEvent[]
  ): Promise<void> {
    for (const player of room.players) {
      const won = winnerIds.has(player.accountId);

      // Track consecutive win streak for every player
      if (won) {
        player.winStreak += 1;
        if (player.winStreak % 3 === 0) {
          const chipBonus = Math.floor(player.chips * 0.5);
          const viaBonus = 30;
          player.chips += chipBonus;
          addVia(player, viaBonus);
          events.push({
            type: 'WIN_STREAK_BONUS',
            roomId: room.id,
            accountId: player.accountId,
            displayName: player.displayName,
            streak: player.winStreak,
            chipBonus,
            viaBonus,
          });
          appendRoomLog(
            room,
            `🔥 CHUỖI ${player.winStreak} THẮNG LIÊN TIẾP! ${player.displayName} nhận thưởng +${chipBonus.toLocaleString()} chip (+50%) & +${viaBonus} Vía!`
          );
        }
      } else {
        player.winStreak = 0;
      }

      if (player.isBot) continue;
      const account = await this.accountRepo.findById(player.accountId);
      if (!account) continue;
      // Apply exact net table delta so reserve chips above room.maxBuyIn are never overwritten!
      const chipDelta = player.chips - player.lastSyncedChips;
      account.chips = Math.max(0, account.chips + chipDelta);
      player.lastSyncedChips = player.chips;
      if (won) {
        account.stats.wins += 1;
        player.matchWins += 1;

        // Instant Noodles: eat 1 bite per win (3 bites total -> bowl disappears, max Vía returns to 100)
        if (
          player.ownedItems.includes('INSTANT_NOODLES') &&
          player.itemsState.noodleBitesLeft > 0
        ) {
          player.itemsState.noodleBitesLeft -= 1;
          if (player.itemsState.noodleBitesLeft <= 0) {
            player.ownedItems = player.ownedItems.filter((it) => it !== 'INSTANT_NOODLES');
            player.via = Math.min(player.via, 100);
            appendRoomLog(
              room,
              `🍜 ${player.displayName} đã ăn hết Bát Mì Tôm (Max Vía trở về 100)!`
            );
          } else {
            appendRoomLog(
              room,
              `🍜 ${player.displayName} húp 1 miếng Mì Tôm mừng chiến thắng (còn ${player.itemsState.noodleBitesLeft}/3 miếng)!`
            );
          }
        }

        // Every 3 wins in THIS match -> gift 1 random unowned item for this match!
        if (player.matchWins % 3 === 0) {
          const unowned = ALL_ITEMS.filter((item) => !player.ownedItems.includes(item));
          if (unowned.length > 0) {
            const gifted = unowned[crypto.randomInt(0, unowned.length)];
            player.ownedItems.push(gifted);
            if (gifted === 'INSTANT_NOODLES') {
              player.itemsState.noodleBitesLeft = ITEM_CONFIG.INSTANT_NOODLES.maxBites;
            }
            events.push({
              type: 'ITEM_UNLOCKED',
              roomId: room.id,
              accountId: player.accountId,
              displayName: player.displayName,
              item: gifted,
              totalWins: player.matchWins,
            });
            appendRoomLog(
              room,
              `🎁 ${player.displayName} thắng ${player.matchWins} ván trong bàn — được tặng ${gifted}!`
            );
          } else {
            player.chips += 500;
            player.lastSyncedChips = player.chips;
            account.chips += 500;
            appendRoomLog(
              room,
              `🎁 ${player.displayName} đạt mốc ${player.matchWins} thắng — thưởng +500 chip!`
            );
          }
        }
      }
      await this.accountRepo.update(account);
    }
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
