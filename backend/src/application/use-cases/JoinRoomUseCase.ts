import crypto from 'crypto';
import { normalizeSkillMastery } from '../../domain/entities/Account';
import { createPlayer } from '../../domain/entities/Player';
import {
  appendRoomLog,
  createRoom,
  resolveRoomStakeTier,
  Room,
  RoomMode,
} from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { SkinId, WinEffectId } from '../../domain/value-objects/Cosmetic';

const BOT_NAMES = ['Chú Bảy Trà Đá', 'Cô Tư Xoài Lắc', 'Anh Ba Thần Bài'];
const BOT_SKINS: SkinId[] = ['SUNGLASSES_COOL', 'FEDORA_BOSS', 'COWBOY_ACE'];
const BOT_WIN_EFFECTS: WinEffectId[] = ['CONFETTI', 'DOVES', 'FIRE_BURST'];

export interface CreateOrJoinRoomInput {
  roomId?: string;
  roomName?: string;
  accountId: string;
  socketId: string;
  mode?: RoomMode;
  quickArenaMatch?: boolean;
  botCount?: number;
  maxBuyIn?: number;
  smallBlind?: number;
  bigBlind?: number;
}

export class JoinRoomUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(input: CreateOrJoinRoomInput): Promise<Room> {
    const account = await this.accountRepo.findById(input.accountId);
    if (!account) {
      throw new Error('Account not found. Please authenticate first.');
    }

    // Create (or quick-match) a new room if roomId is not provided
    if (!input.roomId) {
      const mode: RoomMode = input.mode === 'ARENA' ? 'ARENA' : 'STANDARD';
      const tier = resolveRoomStakeTier(input.maxBuyIn);
      if (account.chips < tier.bigBlind) {
        throw new Error(
          `Không đủ chip cho sới ${tier.label}! Cần tối thiểu ${tier.bigBlind.toLocaleString()} chip (BB).`
        );
      }

      // Quick-match: if joining Arena without a code, join an open waiting Arena room of the same stake tier if available
      if (mode === 'ARENA' && input.quickArenaMatch) {
        const allRooms = await this.roomRepo.findAll();
        const openArena = allRooms.find(
          (r) =>
            r.mode === 'ARENA' &&
            r.status === 'WAITING' &&
            r.maxBuyIn === tier.maxBuyIn &&
            r.players.length < r.maxPlayers &&
            !r.players.some((p) => p.accountId === account.id)
        );
        if (openArena) {
          return this.execute({
            roomId: openArena.id,
            accountId: input.accountId,
            socketId: input.socketId,
          });
        }
      }

      const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
      const sanitizedRoomName = input.roomName
        ? input.roomName.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 48)
        : '';
      const room = createRoom({
        id: roomId,
        name:
          sanitizedRoomName ||
          (mode === 'ARENA'
            ? `Đấu Trường ${tier.label} · ${account.displayName}`
            : `Sới ${tier.label} · ${account.displayName}`),
        hostAccountId: account.id,
        mode,
        maxBuyIn: tier.maxBuyIn,
        // Always derive blinds authoritatively from the stake tier (never trust client-forged blinds!)
        smallBlind: tier.smallBlind,
        bigBlind: tier.bigBlind,
      });

      // Cap table chips to room.maxBuyIn; excess remains safe in Account reserve
      const hostChips = Math.min(account.chips, room.maxBuyIn);
      const hostPlayer = createPlayer({
        accountId: account.id,
        socketId: input.socketId,
        displayName: account.displayName,
        isBot: false,
        seatIndex: 0,
        chips: hostChips,
        ownedItems: [],
        equippedSkin: account.equippedSkin,
        equippedWinEffect: account.equippedWinEffect,
        skillMastery: normalizeSkillMastery(account.skillMastery),
      });
      if (account.loanBalance > 0) {
        hostPlayer.activeLoan = {
          loanId: `carry_${account.id}`,
          packageType: 'CHIPS_2000',
          principal: account.loanBalance,
          currentOwed: account.loanBalance,
          interestRate: 0.15,
          handsElapsed: 0,
          takenAtHand: 0,
        };
      }
      room.players.push(hostPlayer);

      // Arena mode is strictly Real Players ONLY (0 bots!)
      const botsToAdd =
        mode === 'ARENA' ? 0 : Math.max(0, Math.min(3, Math.floor(input.botCount ?? 0)));
      for (let i = 0; i < botsToAdd; i++) {
        room.players.push(
          createPlayer({
            accountId: `bot_${roomId}_${i + 1}`,
            socketId: null,
            displayName: BOT_NAMES[i % BOT_NAMES.length],
            isBot: true,
            seatIndex: i + 1,
            chips: room.maxBuyIn,
            ownedItems: [],
            equippedSkin: BOT_SKINS[i % BOT_SKINS.length],
            equippedWinEffect: BOT_WIN_EFFECTS[i % BOT_WIN_EFFECTS.length],
          })
        );
      }

      appendRoomLog(
        room,
        mode === 'ARENA'
          ? `${account.displayName} mở phòng Đấu Trường Thật ${tier.label} (người thật đấu chip lấy tờ 500K VNĐ).`
          : `${account.displayName} mở sới ${tier.label} (SB ${room.smallBlind.toLocaleString()} / BB ${room.bigBlind.toLocaleString()})${botsToAdd > 0 ? ` với ${botsToAdd} Bot` : ''}.`
      );
      await this.roomRepo.save(room);
      return room;
    }

    // Join existing room
    const room = await this.roomRepo.findById(input.roomId.trim().toUpperCase());
    if (!room) {
      throw new Error(`Room "${input.roomId}" not found.`);
    }

    const existingPlayer = room.players.find((p) => p.accountId === account.id);
    if (existingPlayer) {
      existingPlayer.socketId = input.socketId;
      await this.roomRepo.save(room);
      return room;
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full.');
    }

    if (room.status === 'PLAYING') {
      throw new Error('Cannot join a match already in progress.');
    }

    const usedSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (usedSeats.has(seatIndex)) seatIndex++;

    if (account.chips < room.bigBlind) {
      throw new Error(
        `Không đủ chip vào bàn này! Cần tối thiểu ${room.bigBlind.toLocaleString()} chip (BB).`
      );
    }

    const startingChips = Math.min(account.chips, room.maxBuyIn);
    room.players.push(
      createPlayer({
        accountId: account.id,
        socketId: input.socketId,
        displayName: account.displayName,
        isBot: false,
        seatIndex,
        chips: startingChips,
        ownedItems: [],
        equippedSkin: account.equippedSkin,
        equippedWinEffect: account.equippedWinEffect,
        skillMastery: normalizeSkillMastery(account.skillMastery),
      })
    );

    appendRoomLog(room, `${account.displayName} đã vào bàn.`);
    await this.roomRepo.save(room);
    return room;
  }
}
