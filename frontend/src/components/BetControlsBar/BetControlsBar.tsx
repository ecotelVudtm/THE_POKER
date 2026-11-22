import { useEffect, useState } from 'react';
import { BetAction } from '../../types/game';

export interface BetControlsBarProps {
  enabled: boolean;
  myChips: number;
  toCall: number;
  minRaise: number;
  pot: number;
  onPlaceBet: (action: BetAction, raiseAmount?: number) => void;
}

export function BetControlsBar({
  enabled,
  myChips,
  toCall,
  minRaise,
  pot,
  onPlaceBet,
}: BetControlsBarProps) {
  const maxRaiseBy = Math.max(minRaise, myChips - toCall);
  const [raiseBy, setRaiseBy] = useState<number>(minRaise);

  useEffect(() => {
    setRaiseBy(Math.min(maxRaiseBy, Math.max(minRaise, minRaise)));
  }, [minRaise, maxRaiseBy]);

  const canCheck = toCall === 0;
  const canRaise = myChips > toCall;

  const setQuickRaise = (amount: number) => {
    setRaiseBy(Math.max(minRaise, Math.min(maxRaiseBy, Math.floor(amount))));
  };

  return (
    <div
      className={`pointer-events-auto flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-panel/95 p-3 shadow-warm backdrop-blur-md transition ${
        !enabled ? 'opacity-55' : ''
      }`}
    >
      {/* Quick Raise Slider & Presets */}
      {canRaise && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="range"
            min={minRaise}
            max={Math.max(minRaise, maxRaiseBy)}
            step={25}
            value={Math.min(Math.max(minRaise, raiseBy), Math.max(minRaise, maxRaiseBy))}
            disabled={!enabled}
            onChange={(e) => setRaiseBy(Number(e.target.value))}
            className="h-1.5 flex-1 accent-accent-gold"
          />
          <span className="min-w-[76px] text-right font-mono text-xs font-bold text-accent-gold">
            +{raiseBy.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setQuickRaise(Math.max(minRaise, pot * 0.5))}
              className="rounded-lg border border-border-subtle bg-surface-elevated px-2 py-1 text-[11px] font-semibold text-content-secondary hover:border-border-gold hover:text-accent-gold disabled:opacity-40"
            >
              1/2 Pot
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setQuickRaise(Math.max(minRaise, pot))}
              className="rounded-lg border border-border-subtle bg-surface-elevated px-2 py-1 text-[11px] font-semibold text-content-secondary hover:border-border-gold hover:text-accent-gold disabled:opacity-40"
            >
              Pot
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onPlaceBet('ALL_IN')}
              className="rounded-lg border border-status-warning/50 bg-status-warning/20 px-2 py-1 text-[11px] font-bold text-status-warning hover:bg-status-warning hover:text-content-inverse disabled:opacity-40"
            >
              All-in
            </button>
          </div>
        </div>
      )}

      {/* Primary Poker Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet('FOLD')}
          className="rounded-xl border border-status-danger/45 bg-status-danger/15 px-4 py-2.5 text-xs font-bold text-status-danger transition hover:bg-status-danger hover:text-content-primary disabled:opacity-40"
        >
          Bỏ bài (Fold)
        </button>

        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet(canCheck ? 'CHECK' : 'CALL')}
          className="rounded-xl bg-accent-jade px-4 py-2.5 text-xs font-extrabold text-content-inverse transition hover:brightness-110 disabled:opacity-40"
        >
          {canCheck ? 'Xem (Check)' : `Theo (${Math.min(myChips, toCall).toLocaleString()})`}
        </button>

        <button
          type="button"
          disabled={!enabled || !canRaise}
          onClick={() => onPlaceBet('RAISE', raiseBy)}
          className="rounded-xl bg-accent-gold px-4 py-2.5 text-xs font-extrabold text-content-inverse shadow-goldGlow transition hover:brightness-110 disabled:opacity-40"
        >
          Tố (+{raiseBy.toLocaleString()})
        </button>
      </div>
    </div>
  );
}
