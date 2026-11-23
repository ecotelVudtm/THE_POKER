import crypto from 'crypto';
import { appendRoomLog, Room } from '../../domain/entities/Room';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import {
  LOAN_INTEREST_RATE_PER_HAND,
  LOAN_PACKAGES,
  LoanPackage,
} from '../../domain/value-objects/Loan';

export interface TakeLoanInput {
  roomId: string;
  accountId: string;
  packageType: LoanPackage;
}

export class TakeLoanUseCase {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  public async execute(input: TakeLoanInput): Promise<Room> {
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new Error('Room not found.');

    const player = room.players.find((p) => p.accountId === input.accountId);
    if (!player) throw new Error('Player not found in room.');
    if (player.eliminated) throw new Error('Eliminated players cannot take loans.');

    if (!player.ownedItems.includes('PHONE')) {
      throw new Error('Bạn chưa sở hữu Chiếc Điện Thoại! Hãy thắng mỗi 3 ván để nhận đồ ngẫu nhiên.');
    }

    if (player.itemsState.lockedItem === 'PHONE' && player.itemsState.lockedItemHandsLeft > 0) {
      throw new Error('Chiếc điện thoại đang bị khóa.');
    }

    if (player.activeLoan) {
      throw new Error('Bạn đang có khoản vay chưa trả. Hãy trả nợ cũ trước khi vay tiếp.');
    }

    const pkg = LOAN_PACKAGES[input.packageType];
    if (!pkg) {
      throw new Error(`Invalid loan package: ${input.packageType}`);
    }

    const loanId = crypto.randomUUID();
    player.activeLoan = {
      loanId,
      packageType: input.packageType,
      principal: pkg.principalCost,
      currentOwed: pkg.principalCost,
      interestRate: LOAN_INTEREST_RATE_PER_HAND,
      handsElapsed: 0,
      takenAtHand: room.handNumber,
    };

    if (pkg.chipsGranted > 0) {
      player.chips += pkg.chipsGranted;
    }
    if (pkg.timeSecondsGranted > 0) {
      player.timeBankSeconds += pkg.timeSecondsGranted;
    }

    if (!player.isBot) {
      const account = await this.accountRepo.findById(player.accountId);
      if (account) {
        account.chips = player.chips;
        account.debtHistory.push({
          loanId,
          packageType: input.packageType,
          principal: pkg.principalCost,
          repaidAmount: 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        });
        await this.accountRepo.update(account);
      }
    }

    const desc =
      pkg.chipsGranted > 0
        ? `vay nóng ${pkg.chipsGranted} chip`
        : `mua thêm +${pkg.timeSecondsGranted}s thời gian`;
    appendRoomLog(room, `📱 ${player.displayName} nhấc điện thoại ${desc} (lãi 15%/ván)!`);

    await this.roomRepo.save(room);
    return room;
  }
}
