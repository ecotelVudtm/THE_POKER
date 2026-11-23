export type LoanPackage = 'CHIPS_2000' | 'CHIPS_5000' | 'CHIPS_10000';

export const LOAN_PACKAGES: Record<
  LoanPackage,
  { chipsGranted: number; principalCost: number }
> = {
  CHIPS_2000: { chipsGranted: 2000, principalCost: 2000 },
  CHIPS_5000: { chipsGranted: 5000, principalCost: 5000 },
  CHIPS_10000: { chipsGranted: 10000, principalCost: 10000 },
};

export const LOAN_INTEREST_RATE_PER_HAND = 0.15;
export const LOAN_OVERDUE_HANDS_THRESHOLD = 3;
export const LOAN_DEFAULT_ITEM_LOCK_HANDS = 2;

export interface ActiveLoan {
  loanId: string;
  packageType: LoanPackage;
  principal: number;
  currentOwed: number;
  interestRate: number;
  handsElapsed: number;
  takenAtHand: number;
}

export interface DebtRecord {
  loanId: string;
  packageType: LoanPackage;
  principal: number;
  repaidAmount: number;
  status: 'ACTIVE' | 'REPAID' | 'DEFAULTED';
  createdAt: string;
  resolvedAt?: string;
}

export function accrueLoanForNextHand(loan: ActiveLoan): {
  updatedLoan: ActiveLoan;
  isOverdue: boolean;
} {
  const handsElapsed = loan.handsElapsed + 1;
  const currentOwed = Math.ceil(loan.currentOwed * (1 + loan.interestRate));
  return {
    updatedLoan: {
      ...loan,
      handsElapsed,
      currentOwed,
    },
    isOverdue: handsElapsed > LOAN_OVERDUE_HANDS_THRESHOLD,
  };
}
