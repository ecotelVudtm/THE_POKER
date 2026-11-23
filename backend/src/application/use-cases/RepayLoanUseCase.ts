import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';

export interface RepayLoanInput {
  roomId: string;
  accountId: string;
}

export class RepayLoanUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(input: RepayLoanInput): Promise<Room> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');

    const player = room.players.find((p) => p.accountId === input.accountId);
    if (!player) throw new Error('Player not found in room.');

    const account = !player.isBot ? await this.accountRepo.findById(player.accountId) : null;
    const owed = Math.max(player.activeLoan?.currentOwed ?? 0, account?.loanBalance ?? 0);

    if (owed <= 0) {
      throw new Error('Bạn không có khoản nợ nào đang mở.');
    }

    if (player.chips < owed) {
      throw new Error(
        `Không đủ chip để trả nợ. Cần ${owed.toLocaleString()}, hiện có ${player.chips.toLocaleString()}.`
      );
    }

    player.chips -= owed;
    const loanId = player.activeLoan?.loanId;
    player.activeLoan = null;
    player.statusEffects.debtPressure = false;
    player.statusEffects.debtPressureSuppressedThisHand = false;

    if (account) {
      account.chips = player.chips;
      account.loanBalance = 0;
      for (const rec of account.debtHistory) {
        if (rec.status === 'ACTIVE' || rec.loanId === loanId) {
          rec.repaidAmount = rec.principal;
          rec.status = 'REPAID';
          rec.resolvedAt = new Date().toISOString();
        }
      }
      await this.accountRepo.update(account);
    }

    appendRoomLog(
      room,
      `💸 ${player.displayName} đã trả dứt điểm ${owed.toLocaleString()} chip nợ!`
    );

    await this.roomRepo.save(room);
    return room;
  }
}
