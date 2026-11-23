import { LoanPackage, PublicPlayerView } from '../../types/game';
import { VoxelIcon3D } from '../VoxelIcon3D';

export interface LoanPhoneModalProps {
  open: boolean;
  me: PublicPlayerView | null;
  debtAlert: { currentOwed: number; handsElapsed: number } | null;
  onOpen: () => void;
  onClose: () => void;
  onTakeLoan: (pkg: LoanPackage) => void;
  onRepayLoan: () => void;
}

/**
 * 1-Purpose Everyday Smartphone Loan App:
 * Borrow Chips (+2K / +5K / +10K) & Repay Persistent Account Debt.
 */
export function LoanPhoneModal({
  open,
  me,
  debtAlert,
  onOpen,
  onClose,
  onTakeLoan,
  onRepayLoan,
}: LoanPhoneModalProps) {
  if (!me) return null;

  const handsUntilOverdue = me.activeLoan
    ? Math.max(0, 3 - me.activeLoan.handsElapsed)
    : 3;

  return (
    <>
      {!open && debtAlert && (
        <div className="voxel-panel-gold pointer-events-auto fixed bottom-36 right-4 z-40 w-72 animate-phoneShake border-status-warning p-3.5">
          <div className="font-mono text-xs font-extrabold text-status-warning">
            ANH CHỦ NỢ ĐANG GỌI...
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-content-secondary">
            Nợ {debtAlert.currentOwed.toLocaleString()} chip (quá {debtAlert.handsElapsed} ván)
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="voxel-btn mt-2.5 w-full border-2 border-status-warning bg-status-warning px-3 py-1.5 font-mono text-xs font-extrabold text-content-inverse"
          >
            NGHE MÁY / MỞ APP
          </button>
        </div>
      )}

      {open && (
        <div className="voxel-panel-gold pointer-events-auto fixed bottom-4 right-4 z-50 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-border-subtle bg-surface-canvas px-4 py-2">
            <span className="font-mono text-[10px] font-bold text-content-muted">
              4G · VAY NHANH 24/7
            </span>
            <button
              type="button"
              onClick={onClose}
              className="voxel-btn border border-border-subtle bg-surface-panel px-2 py-0.5 font-mono text-[10px] font-bold text-content-primary"
            >
              ĐÓNG [X]
            </button>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-extrabold text-accent-gold">VAY CHIP NÓNG</h3>
              <span className="border border-status-warning bg-status-warning/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-status-warning">
                +15%/VÁN
              </span>
            </div>

            <div className="mt-2 border border-border-subtle bg-surface-panel px-2.5 py-1.5 font-mono text-[10px] text-content-muted">
              Khoản vay được lưu thẳng vào tài khoản kể cả khi rời bàn!
            </div>

            {me.activeLoan && (
              <div className="mt-3 border-2 border-status-warning bg-status-warning/10 p-3">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-status-warning">KHOẢN VAY HIỆN TẠI</span>
                  <span className="text-content-secondary">
                    {handsUntilOverdue > 0 ? `Còn ${handsUntilOverdue} ván` : 'QUÁ HẠN!'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-extrabold text-content-primary">
                  <VoxelIcon3D kind="chip" size={22} />
                  {me.activeLoan.currentOwed.toLocaleString()}
                </div>
                <button
                  type="button"
                  disabled={me.chips < me.activeLoan.currentOwed}
                  onClick={onRepayLoan}
                  className="voxel-btn mt-3 w-full border-2 border-accent-jade bg-accent-jade px-3 py-2 font-mono text-xs font-extrabold text-content-inverse disabled:opacity-40"
                >
                  {me.chips >= me.activeLoan.currentOwed
                    ? `TRẢ HẾT NỢ (${me.activeLoan.currentOwed.toLocaleString()})`
                    : `THIẾU ${(me.activeLoan.currentOwed - me.chips).toLocaleString()} CHIP`}
                </button>
              </div>
            )}

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => onTakeLoan('CHIPS_2000')}
                className="voxel-btn flex w-full items-center justify-between border-2 border-border-subtle bg-surface-panel px-3 py-2.5 text-left hover:border-border-gold"
              >
                <span className="font-mono text-xs font-bold text-content-primary">
                  Gói Cứu Nguy
                </span>
                <span className="font-mono text-xs font-extrabold text-accent-gold">
                  +2.000 CHIP
                </span>
              </button>
              <button
                type="button"
                onClick={() => onTakeLoan('CHIPS_5000')}
                className="voxel-btn flex w-full items-center justify-between border-2 border-border-subtle bg-surface-panel px-3 py-2.5 text-left hover:border-border-gold"
              >
                <span className="font-mono text-xs font-bold text-content-primary">
                  Gói Khô Máu
                </span>
                <span className="font-mono text-xs font-extrabold text-accent-gold">
                  +5.000 CHIP
                </span>
              </button>
              <button
                type="button"
                onClick={() => onTakeLoan('CHIPS_10000')}
                className="voxel-btn flex w-full items-center justify-between border-2 border-border-gold bg-surface-panel px-3 py-2.5 text-left"
              >
                <span className="font-mono text-xs font-bold text-accent-gold">
                  Gói Đại Gia Nóng
                </span>
                <span className="font-mono text-xs font-extrabold text-accent-gold">
                  +10.000 CHIP
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
