import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { ITEM_CONFIG, ItemType } from '../../domain/value-objects/Item';

export interface UseItemInput {
  roomId: string;
  accountId: string;
  itemType: ItemType;
}

export class UseItemUseCase {
  constructor(private readonly roomRepo: IRoomRepository) {}

  public async execute(input: UseItemInput): Promise<Room> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');
    if (room.status !== 'PLAYING') {
      throw new Error('Items can only be used during an active match.');
    }

    const player = room.players.find((p) => p.accountId === input.accountId);
    if (!player) throw new Error('Player not found in room.');
    if (player.eliminated || player.folded) {
      throw new Error('Folded or eliminated players cannot use items.');
    }

    if (player.itemsState.lockedItem === input.itemType && player.itemsState.lockedItemHandsLeft > 0) {
      throw new Error(
        `Item ${input.itemType} is locked for ${player.itemsState.lockedItemHandsLeft} more hand(s) due to debt default.`
      );
    }

    switch (input.itemType) {
      case 'INCENSE_BOWL': {
        if (player.itemsState.incenseCooldownHands > 0) {
          throw new Error(
            `Bát hương đang hồi (${player.itemsState.incenseCooldownHands} ván nữa).`
          );
        }
        if (player.via < ITEM_CONFIG.INCENSE_BOWL.viaCost) {
          throw new Error(`Cần ${ITEM_CONFIG.INCENSE_BOWL.viaCost} Vía để thắp hương.`);
        }
        player.via -= ITEM_CONFIG.INCENSE_BOWL.viaCost;
        player.statusEffects.blessed = true;
        player.itemsState.incenseCooldownHands = ITEM_CONFIG.INCENSE_BOWL.cooldownHands;
        appendRoomLog(room, `🪔 ${player.displayName} thắp Bát Hương Mini — nhận buff Phúc Lộc!`);
        break;
      }

      case 'LUCKY_MANGO': {
        if (player.itemsState.luckyMangoUsesLeft <= 0) {
          throw new Error('Đã hết lượt dùng Quả Xoài May Mắn trong trận này.');
        }
        player.itemsState.luckyMangoUsesLeft -= 1;
        player.statusEffects.pressured = false;
        player.statusEffects.debtPressureSuppressedThisHand = true;
        player.statusEffects.mangoShield = true;
        appendRoomLog(
          room,
          `🥭 ${player.displayName} ăn Quả Xoài May Mắn — xóa debuff & bật khiên chống Lộ Tẩy!`
        );
        break;
      }

      case 'ICED_TEA': {
        if (player.itemsState.icedTeaCooldownHands > 0) {
          throw new Error(
            `Ly trà đá đang hồi (${player.itemsState.icedTeaCooldownHands} ván nữa).`
          );
        }
        player.timeBankSeconds += ITEM_CONFIG.ICED_TEA.bonusTimeSeconds;
        player.statusEffects.icedTeaActive = true;
        player.itemsState.icedTeaCooldownHands = ITEM_CONFIG.ICED_TEA.cooldownHands;
        appendRoomLog(
          room,
          `🧊 ${player.displayName} làm ngụm Trà Đá (+${ITEM_CONFIG.ICED_TEA.bonusTimeSeconds}s thời gian, làm chậm mini-game 15%)!`
        );
        break;
      }

      case 'PHONE':
        throw new Error('Use take_loan / repay_loan actions to interact with the PHONE item.');

      case 'LUCKY_COIN':
        throw new Error('LUCKY_COIN is a passive item and triggers automatically on All-In loss.');

      default:
        throw new Error(`Unknown item: ${input.itemType}`);
    }

    await this.roomRepo.save(room);
    return room;
  }
}
