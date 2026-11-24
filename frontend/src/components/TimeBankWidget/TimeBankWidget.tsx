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
 * High-detail Physical Voxel Wooden Chess Clock with brass rivets, top plunger,
 * pixel analog dial, bold recessed LED timer & segmented 20s turn gauge.
 */
export function TimeBankWidget({
  timeBankSeconds,
  turnRemainingSeconds,
  isMyTurn,
  clockRunning,
}: TimeBankWidgetProps) {
  const isCritical = timeBankSeconds < 45;
  const turnPct = Math.max(0, Math.min(100, (turnRemainingSeconds / 20) * 100));
  const handAngle = ((60 - (timeBankSeconds % 60)) % 60) * 6;

  return (
    <div
      className={`pointer-events-auto inline-flex flex-col items-start select-none ${
        isCritical ? 'animate-heartbeat' : ''
      }`}
    >
      {/* Top Chess-Clock Brass Plunger + Status Plate */}
      <div className="ml-4 flex items-end gap-2.5">
        <div
          className={`w-12 border-x-2 border-t-2 border-border-gold transition-all ${
            clockRunning ? 'h-2 bg-status-warning' : 'h-3.5 bg-accent-gold'
          }`}
        />
        <span className="border-x border-t border-border-subtle bg-surface-canvas/90 px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-widest text-content-secondary">
          {isMyTurn ? `LƯỢT ${turnRemainingSeconds}S` : clockRunning ? 'ĐANG CHẠY' : 'ĐỒNG HỒ'}
        </span>
      </div>

      {/* Carved Wooden Voxel Clock Casing with 4 Brass Corner Rivets */}
      <div
        className={`relative flex items-center gap-3.5 border-2 px-4 py-2.5 shadow-[5px_5px_0_rgba(0,0,0,0.82)] ${
          isCritical
            ? 'border-status-danger bg-status-danger/25'
            : isMyTurn
              ? 'border-border-gold bg-surface-wood'
              : 'border-border-subtle bg-surface-wood/95'
        }`}
      >
        {/* 4 Brass Corner Pixel Rivets */}
        <span className="absolute left-1 top-1 h-1.5 w-1.5 bg-accent-gold" />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-accent-gold" />
        <span className="absolute bottom-1 left-1 h-1.5 w-1.5 bg-accent-gold" />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-accent-gold" />

        {/* Larger Pixel Analog Dial */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border-gold bg-surface-canvas shadow-[inset_2px_2px_0_rgba(0,0,0,0.7)]">
          <span className="absolute top-0.5 h-1.5 w-0.5 bg-accent-gold" />
          <span className="absolute bottom-0.5 h-1.5 w-0.5 bg-accent-gold" />
          <span className="absolute left-0.5 h-0.5 w-1.5 bg-accent-gold" />
          <span className="absolute right-0.5 h-0.5 w-1.5 bg-accent-gold" />
          <div
            className={`absolute bottom-1/2 left-1/2 h-4 w-0.5 origin-bottom -translate-x-1/2 ${
              isCritical ? 'bg-status-danger' : 'bg-accent-gold'
            }`}
            style={{ transform: `translateX(-50%) rotate(${handAngle}deg)` }}
          />
          <span className="z-10 h-2 w-2 bg-content-primary" />
        </div>

        {/* Bold Recessed LED Readout + 20s Turn Bar */}
        <div className="border-2 border-surface-canvas bg-surface-canvas px-3 py-1.5 shadow-[inset_2px_2px_0_rgba(0,0,0,0.85)]">
          <div
            className={`font-mono text-2xl font-extrabold leading-none tracking-wider ${
              isCritical ? 'text-status-danger' : 'text-content-primary'
            }`}
          >
            {formatMMSS(timeBankSeconds)}
          </div>
          <div className="mt-2 h-2 w-24 border border-border-subtle bg-surface-elevated">
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

      {/* Carved Wooden Clock Feet */}
      <div className="flex w-full justify-between px-4">
        <div className="h-2 w-5 border-x border-b border-border-subtle bg-surface-canvas" />
        <div className="h-2 w-5 border-x border-b border-border-subtle bg-surface-canvas" />
      </div>
    </div>
  );
}
