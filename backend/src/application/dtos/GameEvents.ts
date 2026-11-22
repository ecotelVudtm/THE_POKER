import { Card } from '../../domain/entities/Card';
import { ItemType } from '../../domain/value-objects/Item';
import { MiniGameChallenge, SkillType } from '../../domain/value-objects/Skill';

export type GameDomainEvent =
  | {
      type: 'MINIGAME_CHALLENGE';
      targetAccountId: string;
      challenge: MiniGameChallenge;
    }
  | {
      type: 'MINIGAME_RESULT';
      roomId: string;
      accountId: string;
      skillType: SkillType;
      success: boolean;
      reason: string;
      accuracy: number;
      exposedCardIndex: number | null;
      mangoShieldBlocked: boolean;
      expGained: number;
      leveledUp: boolean;
      newLevel: number;
    }
  | {
      type: 'EAGLE_EYE_REVEAL';
      targetAccountId: string;
      nextCommunityCard: Card | null;
    }
  | {
      type: 'DEBT_CALL_INCOMING';
      targetAccountId: string;
      currentOwed: number;
      handsElapsed: number;
    }
  | {
      type: 'ITEM_LOCKED';
      roomId: string;
      accountId: string;
      item: ItemType;
      handsLeft: number;
    }
  | {
      type: 'LUCKY_COIN_TRIGGERED';
      roomId: string;
      accountId: string;
      refundAmount: number;
      winProbability: number;
    }
  | {
      type: 'PLAYER_TIMED_OUT';
      roomId: string;
      accountId: string;
      displayName: string;
    };
