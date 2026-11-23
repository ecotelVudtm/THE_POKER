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

/**
 * Physical Voxel Desk / Chess Clock sitting at the player's left corner (NOT a plain text box!).
 * Features a top plunger button, wooden casing, digital LED dial, and rotating second hand indicator.
 */
export function TimeBankWidget({
  timeBankSeconds,
  turnRemainingSeconds,
  isMyTurn,
  clockRunning,
}: TimeBankWidgetProps) {
  const isCritical = timeBankSeconds < 45;
  const turnPct = Math.max(0, Math.min(100, (turnRemainingSeconds / 20) * 100));
  // Rotating pixel clock hand angle based on remaining seconds
  const handAngle = ((60 - (timeBankSeconds % 60)) % 60) * 6;

  return (
    <div
      className={`pointer-events-auto inline-flex flex-col items-start select-none ${
        isCritical ? 'animate-heartbeat' : ''
      }`}
    >
      {/* Top Chess-Clock Plunger Button (depressed when running!) */}
      <div className="ml-4 flex items-end gap-2">
        <div
          className={`w-10 border-x-2 border-t-2 border-border-gold transition-all ${
            clockRunning
              ? 'h-1.5 bg-status-warning'
              : 'h-3 bg-accent-gold'
          }`}
        />
        <span className="pb-0.5 font-mono text-[9px] font-extrabold tracking-widest text-content-muted">
          {isMyTurn ? `LƯỢT ${turnRemainingSeconds}S` : clockRunning ? 'ĐANG CHẠY' : 'ĐỒNG HỒ'}
        </span>
      </div>

      {/* Physical Wooden Voxel Clock Body */}
      <div
        className={`flex items-center gap-3 border-2 px-3 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.75)] ${
          isCritical
            ? 'border-status-danger bg-status-danger/25'
            : isMyTurn
              ? 'border-border-gold bg-surface-wood'
              : 'border-border-subtle bg-surface-wood/90'
        }`}
      >
        {/* Mini Pixel Analog Dial */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border-gold bg-surface-canvas">
          {/* 12/3/6/9 pixel ticks */}
          <span className="absolute top-0.5 h-1 w-0.5 bg-accent-gold" />
          <span className="absolute bottom-0.5 h-1 w-0.5 bg-accent-gold" />
          <span className="absolute left-0.5 h-0.5 w-1 bg-accent-gold" />
          <span className="absolute right-0.5 h-0.5 w-1 bg-accent-gold" />
          {/* Ticking hand */}
          <div
            className={`absolute bottom-1/2 left-1/2 h-3.5 w-0.5 origin-bottom -translate-x-1/2 ${
              isCritical ? 'bg-status-danger' : 'bg-accent-gold'
            }`}
            style={{ transform: `translateX(-50%) rotate(${handAngle}deg)` }}
          />
          <span className="h-1.5 w-1.5 bg-content-primary" />
        </div>

        {/* Recessed LED Time Readout + 20s Turn Bar */}
        <div className="border-2 border-surface-canvas bg-surface-canvas/95 px-2.5 py-1">
          <div
            className={`font-mono text-xl font-extrabold leading-none tracking-wider ${
              isCritical ? 'text-status-danger' : 'text-content-primary'
            }`}
          >
            {formatMMSS(timeBankSeconds)}
          </div>
          <div className="mt-1.5 h-1.5 w-20 bg-surface-elevated">
            <div
              className={`h-full transition-all duration-500 ${
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
      </div>

      {/* Tiny Wooden Clock Feet */}
      <div className="flex w-full justify-between px-3">
        <div className="h-1.5 w-4 bg-surface-canvas" />
        <div className="h-1.5 w-4 bg-surface-canvas" />
      </div>
    </div>
  );
}
