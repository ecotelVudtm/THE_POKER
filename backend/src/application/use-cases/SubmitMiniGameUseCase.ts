import { applyMasteryExp } from '../../domain/entities/Account';
import { addVia } from '../../domain/entities/Player';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { evaluateMiniGameSubmission } from '../../domain/rules/MiniGameEngine';
import {
  MiniGameSubmissionPayload,
  PRESSURE_AURA_TIME_PENALTY_SECONDS,
  SKILL_DEFINITIONS,
  TIME_FREEZE_BANK_BONUS,
  TIME_FREEZE_TURN_BONUS,
  VIA_SIPHON_AMOUNT,
} from '../../domain/value-objects/Skill';
import { GameDomainEvent } from '../dtos/GameEvents';

export interface SubmitMiniGameInput {
  roomId: string;
  accountId: string;
  payload: MiniGameSubmissionPayload;
  forceTimeout?: boolean;
}

export interface SubmitMiniGameResult {
  room: Room;
  success: boolean;
  events: GameDomainEvent[];
}

export class SubmitMiniGameUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(input: SubmitMiniGameInput): Promise<SubmitMiniGameResult> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');

    const player = room.players.find((p) => p.accountId === input.accountId);
    if (!player) throw new Error('Player not found in room.');

    const challenge = player.activeChallenge;
    if (!challenge) {
      throw new Error('No active mini-game challenge to submit.');
    }

    if (!input.forceTimeout && (!input.payload || typeof input.payload !== 'object')) {
      throw new Error('Invalid mini-game submission payload.');
    }

    const evaluation = input.forceTimeout
      ? {
          success: false,
          reason: 'Mini-game timed out (> 6s)',
          accuracy: 0,
          timedOut: true,
        }
      : evaluateMiniGameSubmission(challenge, input.payload);

    // Clear active challenge & turn iced-tea boost
    player.activeChallenge = null;
    player.statusEffects.icedTeaActive = false;

    const def = SKILL_DEFINITIONS[challenge.skillType];
    const expGained = evaluation.success ? def.expOnSuccess : def.expOnFail;
    const masteryResult = applyMasteryExp(player.skillMastery, def.masteryKey, expGained);
    player.skillMastery = masteryResult.updatedMastery;

    const events: GameDomainEvent[] = [];
    let exposedCardIndex: number | null = null;
    let mangoShieldBlocked = false;

    if (evaluation.success) {
      if (challenge.skillType === 'SLEIGHT_OF_HAND') {
        const idx = challenge.cardIndex ?? 0;
        const keptIdx = idx === 0 ? 1 : 0;
        const keptCard = player.holeCards[keptIdx];
        const activeSticks = player.ownedItems.includes('INCENSE_BOWL')
          ? player.itemsState.incenseSticks
          : 0;
        const replacement =
          activeSticks > 0 && keptCard
            ? room.deck.drawWithIncenseLuck(keptCard, room.communityCards, activeSticks)
            : room.deck.draw();
        player.holeCards[idx] = replacement;
        player.exposedCardIndices = player.exposedCardIndices.filter((i) => i !== idx);
        appendRoomLog(
          room,
          `🃏 ${player.displayName} tráo bài thành công${activeSticks > 0 ? ` (Bát hương ${activeSticks} nén phù hộ!)` : '!'}`
        );
      } else if (challenge.skillType === 'EAGLE_EYE') {
        const nextCard = room.deck.peekNext();
        events.push({
          type: 'EAGLE_EYE_REVEAL',
          targetAccountId: player.accountId,
          nextCommunityCard: nextCard,
        });
        appendRoomLog(room, `👁️ ${player.displayName} dùng Tâm Nhãn đọc vị bàn bài!`);
      } else if (challenge.skillType === 'PRESSURE_AURA' && challenge.targetAccountId) {
        const target = room.players.find((p) => p.accountId === challenge.targetAccountId);
        if (target && !target.eliminated) {
          target.timeBankSeconds = Math.max(
            0,
            target.timeBankSeconds - PRESSURE_AURA_TIME_PENALTY_SECONDS
          );
          target.statusEffects.pressured = true;
          appendRoomLog(
            room,
            `⚡ ${player.displayName} tỏa khí thế, trừ ${PRESSURE_AURA_TIME_PENALTY_SECONDS}s của ${target.displayName}!`
          );
        }
      } else if (challenge.skillType === 'VIA_SIPHON' && challenge.targetAccountId) {
        const target = room.players.find((p) => p.accountId === challenge.targetAccountId);
        if (target && !target.eliminated) {
          const drained = Math.min(target.via, VIA_SIPHON_AMOUNT);
          target.via = Math.max(0, target.via - drained);
          addVia(player, Math.max(15, drained));
          appendRoomLog(
            room,
            `🌀 ${player.displayName} hút ${Math.max(15, drained)} Vía từ ${target.displayName}!`
          );
        }
      } else if (challenge.skillType === 'TIME_FREEZE') {
        player.timeBankSeconds += TIME_FREEZE_BANK_BONUS;
        player.turnRemainingSeconds += TIME_FREEZE_TURN_BONUS;
        appendRoomLog(
          room,
          `❄️ ${player.displayName} thi triển Ngưng Đọng (+${TIME_FREEZE_BANK_BONUS}s quỹ giờ, +${TIME_FREEZE_TURN_BONUS}s lượt)!`
        );
      } else if (challenge.skillType === 'POKER_FACE') {
        player.statusEffects.pressured = false;
        if (player.exposedCardIndices.length > 0) {
          player.exposedCardIndices.pop();
          appendRoomLog(
            room,
            `🎭 ${player.displayName} dùng Mặt Lạnh — che kín lại 1 lá bài bị Lộ Tẩy!`
          );
        } else {
          player.statusEffects.mangoShield = true;
          appendRoomLog(
            room,
            `🎭 ${player.displayName} dùng Mặt Lạnh — xóa Áp Lực & bật Khiên chống Lộ Tẩy!`
          );
        }
      }
    } else {
      // Failed mini-game -> Lộ Tẩy (blocked by Poker Face shield OR passive Lucky Mango!)
      const hasPassiveMango =
        player.ownedItems.includes('LUCKY_MANGO') &&
        player.itemsState.luckyMangoUsesLeft > 0 &&
        !(
          player.itemsState.lockedItem === 'LUCKY_MANGO' &&
          player.itemsState.lockedItemHandsLeft > 0
        );

      if (player.statusEffects.mangoShield) {
        player.statusEffects.mangoShield = false;
        mangoShieldBlocked = true;
        appendRoomLog(
          room,
          `Khiên phòng thủ đã cứu ${player.displayName} khỏi một pha Lộ Tẩy.`
        );
      } else if (hasPassiveMango) {
        player.itemsState.luckyMangoUsesLeft -= 1;
        mangoShieldBlocked = true;
        if (player.itemsState.luckyMangoUsesLeft <= 0) {
          player.ownedItems = player.ownedItems.filter((it) => it !== 'LUCKY_MANGO');
          appendRoomLog(
            room,
            `Quả Xoài May Mắn tự động đỡ Lộ Tẩy cho ${player.displayName} (đã hết 2/2 lần).`
          );
        } else {
          appendRoomLog(
            room,
            `Quả Xoài May Mắn tự động đỡ Lộ Tẩy cho ${player.displayName} (còn ${player.itemsState.luckyMangoUsesLeft}/2 lần).`
          );
        }
      } else {
        const unexposedIndices = [0, 1].filter(
          (i) => i < player.holeCards.length && !player.exposedCardIndices.includes(i)
        );
        if (unexposedIndices.length > 0) {
          exposedCardIndex = unexposedIndices[0];
          player.exposedCardIndices.push(exposedCardIndex);
        }
        appendRoomLog(
          room,
          `🚨 ${player.displayName} thi triển thất bại — BỊ LỘ TẨY 1 lá bài!`
        );
      }
    }

    // Persist mastery & caughtCount to Account
    if (!player.isBot) {
      const acc = await this.accountRepo.findById(player.accountId);
      if (acc) {
        acc.skillMastery = player.skillMastery;
        if (!evaluation.success && !mangoShieldBlocked) {
          acc.stats.caughtCount += 1;
        }
        await this.accountRepo.update(acc);
      }
    }

    events.push({
      type: 'MINIGAME_RESULT',
      roomId: room.id,
      accountId: player.accountId,
      skillType: challenge.skillType,
      success: evaluation.success,
      reason: evaluation.reason,
      accuracy: evaluation.accuracy,
      exposedCardIndex,
      mangoShieldBlocked,
      expGained,
      leveledUp: masteryResult.leveledUp,
      newLevel: masteryResult.newLevel,
    });

    await this.roomRepo.save(room);
    return { room, success: evaluation.success, events };
  }
}
