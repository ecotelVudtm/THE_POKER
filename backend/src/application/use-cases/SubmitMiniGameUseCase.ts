import { applyMasteryExp } from '../../domain/entities/Account';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { evaluateMiniGameSubmission } from '../../domain/rules/MiniGameEngine';
import {
  MiniGameSubmissionPayload,
  PRESSURE_AURA_TIME_PENALTY_SECONDS,
  SKILL_DEFINITIONS,
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
        const replacement = player.statusEffects.blessed
          ? room.deck.drawBiased(player.holeCards)
          : room.deck.draw();
        player.holeCards[idx] = replacement;
        // If that slot was previously exposed, hide the newly swapped card
        player.exposedCardIndices = player.exposedCardIndices.filter((i) => i !== idx);
        appendRoomLog(room, `🃏 ${player.displayName} tráo bài thành công!`);
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
      }
    } else {
      // Failed mini-game -> Lộ Tẩy (unless mangoShield blocks it)
      if (player.statusEffects.mangoShield) {
        player.statusEffects.mangoShield = false;
        mangoShieldBlocked = true;
        appendRoomLog(
          room,
          `🥭 Khiên Quả Xoài đã cứu ${player.displayName} khỏi một pha Lộ Tẩy!`
        );
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
