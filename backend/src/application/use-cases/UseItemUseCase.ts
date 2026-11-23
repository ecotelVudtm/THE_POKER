import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import {
  getNextIncenseViaCost,
  ITEM_CONFIG,
  ItemType,
} from '../../domain/value-objects/Item';

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

    if (!player.ownedItems.includes(input.itemType)) {
      throw new Error('Bạn chưa sở hữu đồ vật này! Hãy thắng mỗi 3 ván để nhận đồ ngẫu nhiên.');
    }

    if (
      player.itemsState.lockedItem === input.itemType &&
      player.itemsState.lockedItemHandsLeft > 0
    ) {
      throw new Error(
        `Đồ vật ${input.itemType} đang bị khóa thêm ${player.itemsState.lockedItemHandsLeft} ván.`
      );
    }

    switch (input.itemType) {
      case 'INCENSE_BOWL': {
        // 1 pure role: Light 1..5 incense sticks with 100 Vía per stick
        // Boosts luck on SLEIGHT_OF_HAND card swap! Burns out after 4 hands without lighting.
        const viaCost = getNextIncenseViaCost(player.itemsState.incenseSticks);
        if (viaCost === null) {
          throw new Error('Bát hương đã cắm đủ tối đa 5 nén nhang!');
        }
        if (player.via < viaCost) {
          throw new Error(
            `Cần ${viaCost} Vía để thắp nén nhang thứ ${player.itemsState.incenseSticks + 1} (hiện có ${player.via} Vía).`
          );
        }

        player.via -= viaCost;
        player.itemsState.incenseSticks += 1;
        player.itemsState.incenseHandsIdle = 0;

        appendRoomLog(
          room,
          `🪔 ${player.displayName} thắp nén nhang thứ ${player.itemsState.incenseSticks}/5 (-${viaCost} Vía)!`
        );
        break;
      }

      case 'LUCKY_MANGO': {
        // 1 pure role: Shield blocking 1 Lộ Tẩy (2 uses/match)
        if (player.itemsState.luckyMangoUsesLeft <= 0) {
          throw new Error('Đã hết lượt dùng Quả Xoài May Mắn trong trận này.');
        }
        player.itemsState.luckyMangoUsesLeft -= 1;
        player.statusEffects.mangoShield = true;
        appendRoomLog(
          room,
          `🥭 ${player.displayName} ăn Quả Xoài May Mắn — bật Khiên chống Lộ Tẩy!`
        );
        break;
      }

      case 'ICED_TEA': {
        // 1 pure role: +20s turn & hand time (3 sips max, 1 sip per betting round)
        if (player.itemsState.icedTeaSipsLeft <= 0) {
          throw new Error('Ly trà đá đã cạn (hết 3 lần uống)!');
        }
        if (player.itemsState.icedTeaUsedThisRound) {
          throw new Error('Mỗi vòng cược chỉ uống Trà Đá được 1 lần!');
        }

        player.itemsState.icedTeaSipsLeft -= 1;
        player.itemsState.icedTeaUsedThisRound = true;
        player.timeBankSeconds += ITEM_CONFIG.ICED_TEA.bonusTimeSeconds;
        player.turnRemainingSeconds += ITEM_CONFIG.ICED_TEA.bonusTimeSeconds;

        appendRoomLog(
          room,
          `🧊 ${player.displayName} uống Trà Đá (+${ITEM_CONFIG.ICED_TEA.bonusTimeSeconds}s, còn ${player.itemsState.icedTeaSipsLeft}/3 ngụm)!`
        );
        break;
      }

      case 'PHONE':
        throw new Error('Dùng nút Điện Thoại để vay nóng hoặc trả nợ.');

      case 'LUCKY_COIN':
        throw new Error('Đồng xu hộ mệnh là vật phẩm bị động tự kích hoạt.');

      case 'INSTANT_NOODLES':
        throw new Error('Bát Mì Tôm tự động nâng Max Vía lên 120 (mỗi lần thắng ăn 1 miếng, 3 lần sẽ hết).');

      default:
        throw new Error(`Unknown item: ${input.itemType}`);
    }

    await this.roomRepo.save(room);
    return room;
  }
}
