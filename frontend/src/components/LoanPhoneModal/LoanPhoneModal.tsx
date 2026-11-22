import { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Coins,
  PhoneCall,
  PhoneIncoming,
  X,
} from 'lucide-react';
import { LoanPackage, PublicPlayerView } from '../../types/game';

export interface LoanPhoneModalProps {
  open: boolean;
  me: PublicPlayerView | null;
  debtAlert: { currentOwed: number; handsElapsed: number } | null;
  onOpen: () => void;
  onClose: () => void;
  onTakeLoan: (pkg: LoanPackage) => void;
  onRepayLoan: () => void;
}

export function LoanPhoneModal({
  open,
  me,
  debtAlert,
  onOpen,
  onClose,
  onTakeLoan,
  onRepayLoan,
}: LoanPhoneModalProps) {
  const [tab, setTab] = useState<'CHIPS' | 'TIME'>('CHIPS');

  if (!me) return null;

  const handsUntilOverdue = me.activeLoan
    ? Math.max(0, 3 - me.activeLoan.handsElapsed)
    : 3;

  return (
    <>
      {/* Vibrating Incoming Debt Call Toast in Bottom-Right when phone is closed */}
      {!open && debtAlert && (
        <div className="pointer-events-auto fixed bottom-36 right-4 z-40 w-72 animate-phoneShake rounded-2xl border-2 border-status-warning bg-surface-panel/95 p-3.5 shadow-warm backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-status-warning">
              <PhoneIncoming className="h-5 w-5 animate-pulse" />
              <div>
                <div className="text-xs font-extrabold">Anh Chủ Nợ ☎️ đang gọi...</div>
                <div className="font-mono text-[11px] text-content-secondary">
                  Nợ {debtAlert.currentOwed.toLocaleString()} chip (quá {debtAlert.handsElapsed} ván)
                </div>
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-content-muted">
            Trả nợ sớm kẻo bị tăng +20% độ khó mini-game!
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-2.5 w-full rounded-xl bg-status-warning px-3 py-1.5 text-xs font-extrabold text-content-inverse hover:brightness-110"
          >
            Nghe máy / Mở App Vay Nhanh
          </button>
        </div>
      )}

      {/* Slide-up Smartphone Drawer in Bottom-Right */}
      {open && (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-[2rem] border-4 border-border-subtle bg-surface-panel shadow-warm">
          {/* Phone Top Notch / Status Bar */}
          <div className="flex items-center justify-between bg-surface-canvas px-5 py-2.5">
            <span className="font-mono text-[10px] font-bold text-content-muted">
              4G • VAY NHANH 24/7
            </span>
            <div className="h-2.5 w-14 rounded-full bg-surface-elevated" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-0.5 text-content-muted hover:text-content-primary"
              aria-label="Đóng điện thoại"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* App Body */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-gold">
                <PhoneCall className="h-4 w-4" />
                <h3 className="text-sm font-extrabold">App Vay Nhanh 24/7</h3>
              </div>
              <span className="rounded-full bg-status-warning/20 px-2 py-0.5 font-mono text-[10px] font-bold text-status-warning">
                Lãi +15%/ván
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-canvas/80 px-2.5 py-1.5 text-[11px] text-content-muted">
              <Clock className="h-3.5 w-3.5 shrink-0 text-status-warning" />
              <span>Quỹ thời gian vẫn chạy khi đang mở điện thoại!</span>
            </div>

            {/* Active Debt Status */}
            {me.activeLoan ? (
              <div className="mt-3 rounded-xl border border-status-warning/50 bg-status-warning/10 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-status-warning">Dư nợ hiện tại</span>
                  <span className="font-mono text-[11px] text-content-secondary">
                    {handsUntilOverdue > 0
                      ? `Còn ${handsUntilOverdue} ván trước quá hạn`
                      : 'ĐÃ QUÁ HẠN!'}
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-content-primary">
                  {me.activeLoan.currentOwed.toLocaleString()} chip
                </div>
                {me.statusEffects.debtPressure && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-status-danger">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Áp lực nợ: +20% độ khó Mini-game
                  </div>
                )}
                <button
                  type="button"
                  disabled={me.chips < me.activeLoan.currentOwed}
                  onClick={onRepayLoan}
                  className="mt-3 w-full rounded-xl bg-accent-jade px-3 py-2.5 text-xs font-extrabold text-content-inverse transition hover:brightness-110 disabled:opacity-40"
                >
                  {me.chips >= me.activeLoan.currentOwed
                    ? `Trả hết nợ ngay (${me.activeLoan.currentOwed.toLocaleString()} chip)`
                    : `Thiếu ${(me.activeLoan.currentOwed - me.chips).toLocaleString()} chip để trả`}
                </button>
              </div>
            ) : (
              <>
                {/* 2 Service Tabs */}
                <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-surface-canvas p-1">
                  <button
                    type="button"
                    onClick={() => setTab('CHIPS')}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      tab === 'CHIPS'
                        ? 'bg-accent-gold text-content-inverse'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    Vay Chip gấp
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('TIME')}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      tab === 'TIME'
                        ? 'bg-accent-via text-content-inverse'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Mua thêm Giờ
                  </button>
                </div>

                {tab === 'CHIPS' ? (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => onTakeLoan('CHIPS_2000')}
                      className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-surface-elevated px-3.5 py-3 text-left transition hover:border-border-gold"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-content-primary">
                          Gói Cứu Nguy Nhanh
                        </div>
                        <div className="text-[11px] text-content-muted">
                          Gốc 2.000 • Quá 3 ván bị gọi đòi nợ
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-accent-gold">
                        +2.000
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onTakeLoan('CHIPS_5000')}
                      className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-surface-elevated px-3.5 py-3 text-left transition hover:border-border-gold"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-content-primary">
                          Gói Khô Máu Thần Bài
                        </div>
                        <div className="text-[11px] text-content-muted">
                          Gốc 5.000 • Lãi +15% mỗi ván
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-accent-gold">
                        +5.000
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onTakeLoan('TIME_60S')}
                      className="flex w-full items-center justify-between rounded-xl border border-accent-via/50 bg-surface-elevated px-3.5 py-3 text-left transition hover:border-accent-via"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-content-primary">
                          Gia hạn Quỹ Thời Gian
                        </div>
                        <div className="text-[11px] text-content-muted">
                          Ghi nợ 1.500 chip (lãi +15%/ván)
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-accent-via">
                        +60 giây
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
