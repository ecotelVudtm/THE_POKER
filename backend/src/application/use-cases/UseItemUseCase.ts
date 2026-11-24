import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import {
  getNextIncenseViaCost,
  ITEM_CONFIG,
  ItemType,
  MAX_TABLE_ITEMS,
} from '../../domain/value-objects/Item';

export interface UseItemInput {
  roomId: string;
  accountId: string;
  itemType: ItemType;
  action?: 'USE' | 'DISCARD';
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
    if (player.eliminated) {
      throw new Error('Eliminated players cannot interact with items.');
    }

    if (!player.ownedItems.includes(input.itemType)) {
      throw new Error('Bạn chưa sở hữu đồ vật này! Hãy thắng mỗi 3 ván để nhận đồ ngẫu nhiên.');
    }

    // Toss item into the trash bin to free 1 of the 3 table slots
    if (input.action === 'DISCARD') {
      player.ownedItems = player.ownedItems.filter((it) => it !== input.itemType);
      if (input.itemType === 'INSTANT_NOODLES') {
        player.via = Math.min(player.via, 100);
        player.itemsState.noodleBitesLeft = 0;
      } else if (input.itemType === 'INCENSE_BOWL') {
        player.itemsState.incenseSticks = 0;
        player.itemsState.incenseHandsIdle = 0;
      } else if (input.itemType === 'PHONE') {
        player.phoneOpen = false;
      }
      appendRoomLog(
        room,
        `${player.displayName} đã bỏ 1 đồ vật vào thùng rác (còn ${player.ownedItems.length}/${MAX_TABLE_ITEMS} món trên bàn).`
      );
      await this.roomRepo.save(room);
      return room;
    }

    if (player.folded) {
      throw new Error('Folded players cannot use items.');
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

      case 'LUCKY_MANGO':
        throw new Error('Quả Xoài May Mắn là đồ bị động — tự động đỡ Lộ Tẩy khi trượt Mini-game (2 lần).');

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
