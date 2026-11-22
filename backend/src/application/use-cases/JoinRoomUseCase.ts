import crypto from 'crypto';
import { createPlayer } from '../../domain/entities/Player';
import { appendRoomLog, createRoom, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { DEFAULT_STARTING_CHIPS } from '../../domain/entities/Account';

const BOT_NAMES = ['Chú Bảy Trà Đá', 'Cô Tư Xoài Lắc', 'Anh Ba Thần Bài'];

export interface CreateOrJoinRoomInput {
  roomId?: string;
  roomName?: string;
  accountId: string;
  socketId: string;
  botCount?: number;
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

    // Create a new room if roomId is not provided
    if (!input.roomId) {
      const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
      const room = createRoom({
        id: roomId,
        name: input.roomName?.trim() || `Sới của ${account.displayName}`,
        hostAccountId: account.id,
        smallBlind: input.smallBlind ?? 50,
        bigBlind: input.bigBlind ?? 100,
      });

      const hostChips = account.chips > 0 ? account.chips : DEFAULT_STARTING_CHIPS;
      room.players.push(
        createPlayer({
          accountId: account.id,
          socketId: input.socketId,
          displayName: account.displayName,
          isBot: false,
          seatIndex: 0,
          chips: hostChips,
          skillMastery: account.skillMastery,
        })
      );

      const botsToAdd = Math.max(0, Math.min(3, Math.floor(input.botCount ?? 0)));
      for (let i = 0; i < botsToAdd; i++) {
        room.players.push(
          createPlayer({
            accountId: `bot_${roomId}_${i + 1}`,
            socketId: null,
            displayName: BOT_NAMES[i % BOT_NAMES.length],
            isBot: true,
            seatIndex: i + 1,
            chips: DEFAULT_STARTING_CHIPS,
          })
        );
      }

      appendRoomLog(
        room,
        `${account.displayName} đã mở bàn${botsToAdd > 0 ? ` với ${botsToAdd} Bot` : ''}.`
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
      existingPlayer.skillMastery = account.skillMastery;
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

    const startingChips = account.chips > 0 ? account.chips : DEFAULT_STARTING_CHIPS;
    room.players.push(
      createPlayer({
        accountId: account.id,
        socketId: input.socketId,
        displayName: account.displayName,
        isBot: false,
        seatIndex,
        chips: startingChips,
        skillMastery: account.skillMastery,
      })
    );

    appendRoomLog(room, `${account.displayName} đã vào bàn.`);
    await this.roomRepo.save(room);
    return room;
  }
}
