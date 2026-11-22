import { Clock, AlertTriangle } from 'lucide-react';

export interface TimeBankWidgetProps {
  timeBankSeconds: number;
  turnRemainingSeconds: number;
  isMyTurn: boolean;
  clockRunning: boolean;
}

function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TimeBankWidget({
  timeBankSeconds,
  turnRemainingSeconds,
  isMyTurn,
  clockRunning,
}: TimeBankWidgetProps) {
  const isCritical = timeBankSeconds < 45;
  const turnPct = Math.max(0, Math.min(100, (turnRemainingSeconds / 20) * 100));

  return (
    <div
      className={`pointer-events-auto rounded-2xl border px-4 py-2.5 shadow-warm backdrop-blur-md transition-all ${
        isCritical
          ? 'animate-heartbeat border-status-danger bg-status-danger/20'
          : isMyTurn
            ? 'border-border-gold bg-surface-panel/95 shadow-goldGlow'
            : 'border-border-subtle bg-surface-panel/85'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-content-secondary">
          {isCritical ? (
            <AlertTriangle className="h-3.5 w-3.5 text-status-danger" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-accent-gold" />
          )}
          <span>Quỹ Thời Gian</span>
        </div>
        {clockRunning && (
          <span className="rounded-full bg-status-warning/20 px-2 py-0.5 text-[10px] font-bold text-status-warning">
            ĐANG CHẠY
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-4">
        <span
          className={`font-mono text-2xl font-extrabold tracking-tight ${
            isCritical ? 'text-status-danger' : 'text-content-primary'
          }`}
        >
          {formatMMSS(timeBankSeconds)}
        </span>
        {isMyTurn && (
          <span className="font-mono text-xs font-bold text-accent-gold">
            Lượt: {turnRemainingSeconds}s
          </span>
        )}
      </div>

      {/* 20s Turn Progress Bar */}
      <div className="mt-1.5 h-1.5 w-44 overflow-hidden rounded-full bg-surface-canvas">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            turnRemainingSeconds <= 5
              ? 'bg-status-danger'
              : isMyTurn
                ? 'bg-accent-gold'
                : 'bg-border-subtle'
          }`}
          style={{ width: `${isMyTurn ? turnPct : 0}%` }}
        />
      </div>
    </div>
  );
}
