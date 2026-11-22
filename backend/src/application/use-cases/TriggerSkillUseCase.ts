import { isEffectiveDebtPressure } from '../../domain/entities/Player';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { createMiniGameChallenge } from '../../domain/rules/MiniGameEngine';
import {
  MiniGameChallenge,
  SKILL_DEFINITIONS,
  SkillType,
} from '../../domain/value-objects/Skill';
import { GameDomainEvent } from '../dtos/GameEvents';

export interface TriggerSkillInput {
  roomId: string;
  accountId: string;
  skillType: SkillType;
  targetAccountId?: string;
  cardIndex?: 0 | 1;
}

export interface TriggerSkillResult {
  room: Room;
  challenge: MiniGameChallenge;
  events: GameDomainEvent[];
}

export class TriggerSkillUseCase {
  constructor(private readonly roomRepo: IRoomRepository) {}

  public async execute(input: TriggerSkillInput): Promise<TriggerSkillResult> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');
    if (room.status !== 'PLAYING' || room.phase === 'WAITING' || room.phase === 'SHOWDOWN') {
      throw new Error('Skills can only be triggered during an active hand.');
    }

    const player = room.players.find((p) => p.accountId === input.accountId);
    if (!player) throw new Error('Player not found in room.');
    if (player.folded || player.eliminated) {
      throw new Error('Folded or eliminated players cannot trigger skills.');
    }
    if (player.activeChallenge) {
      throw new Error('You already have an active mini-game challenge.');
    }

    const def = SKILL_DEFINITIONS[input.skillType];
    if (!def) throw new Error(`Unknown skill type: ${input.skillType}`);

    if (player.via < def.viaCost) {
      throw new Error(`Not enough Vía. Need ${def.viaCost}, have ${player.via}.`);
    }

    if (input.skillType === 'SLEIGHT_OF_HAND') {
      const idx = input.cardIndex ?? 0;
      if (idx !== 0 && idx !== 1) {
        throw new Error('cardIndex must be 0 or 1 for SLEIGHT_OF_HAND.');
      }
      if (player.holeCards.length < 2) {
        throw new Error('No hole cards to swap.');
      }
    }

    if (input.skillType === 'PRESSURE_AURA') {
      if (!input.targetAccountId) {
        throw new Error('targetAccountId is required for PRESSURE_AURA.');
      }
      if (input.targetAccountId === player.accountId) {
        throw new Error('Cannot target yourself with PRESSURE_AURA.');
      }
      const target = room.players.find(
        (p) => p.accountId === input.targetAccountId && !p.eliminated && !p.folded
      );
      if (!target) {
        throw new Error('Target opponent is not active in this hand.');
      }
    }

    if (input.skillType === 'EAGLE_EYE' && room.phase === 'RIVER') {
      throw new Error('No more community cards left to reveal on the River.');
    }

    // Deduct Vía upfront
    player.via -= def.viaCost;

    const masteryLevel = player.skillMastery[def.masteryKey].level;
    const challenge = createMiniGameChallenge({
      accountId: player.accountId,
      skillType: input.skillType,
      targetAccountId: input.targetAccountId,
      cardIndex: input.skillType === 'SLEIGHT_OF_HAND' ? (input.cardIndex ?? 0) : undefined,
      modifiers: {
        masteryLevel,
        blessed: player.statusEffects.blessed,
        icedTeaActive: player.statusEffects.icedTeaActive,
        debtPressure: isEffectiveDebtPressure(player),
        pressured: player.statusEffects.pressured,
      },
    });

    player.activeChallenge = challenge;
    appendRoomLog(room, `✨ ${player.displayName} đang thi triển tuyệt kỹ...`);

    const events: GameDomainEvent[] = [
      {
        type: 'MINIGAME_CHALLENGE',
        targetAccountId: player.accountId,
        challenge,
      },
    ];

    await this.roomRepo.save(room);
    return { room, challenge, events };
  }
}
