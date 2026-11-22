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

    const loan = player.activeLoan;
    if (!loan) {
      throw new Error('Bạn không có khoản nợ nào đang mở.');
    }

    if (player.chips < loan.currentOwed) {
      throw new Error(
        `Không đủ chip để trả nợ. Cần ${loan.currentOwed}, hiện có ${player.chips}.`
      );
    }

    player.chips -= loan.currentOwed;
    const repaidAmount = loan.currentOwed;
    const loanId = loan.loanId;

    player.activeLoan = null;
    player.statusEffects.debtPressure = false;
    player.statusEffects.debtPressureSuppressedThisHand = false;

    if (!player.isBot) {
      const account = await this.accountRepo.findById(player.accountId);
      if (account) {
        account.chips = player.chips;
        const record = account.debtHistory.find((d) => d.loanId === loanId);
        if (record) {
          record.repaidAmount = repaidAmount;
          record.status = 'REPAID';
          record.resolvedAt = new Date().toISOString();
        }
        await this.accountRepo.update(account);
      }
    }

    appendRoomLog(
      room,
      `💸 ${player.displayName} đã trả xong nợ (${repaidAmount} chip), hết áp lực chủ nợ!`
    );

    await this.roomRepo.save(room);
    return room;
  }
}
