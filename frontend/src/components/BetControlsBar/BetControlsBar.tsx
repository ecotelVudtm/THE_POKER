import { useEffect, useState } from 'react';
import { BetAction } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';

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
    soundEngine.playUiClick();
    setRaiseBy(Math.max(minRaise, Math.min(maxRaiseBy, Math.floor(amount))));
  };

  return (
    <div
      className={`voxel-panel-gold pointer-events-auto relative flex flex-col gap-2.5 px-4 py-3 transition-opacity ${
        !enabled ? 'opacity-45' : ''
      }`}
    >
      {/* Corner Brass Rivets */}
      <span className="pointer-events-none absolute left-1.5 top-1.5 h-1.5 w-1.5 bg-accent-gold/80" />
      <span className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-accent-gold/80" />

      {canRaise && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Raise Presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setQuickRaise(Math.max(minRaise, pot * 0.5))}
              className="voxel-btn border-2 border-border-subtle bg-surface-panel px-2.5 py-1 font-mono text-[11px] font-extrabold text-content-secondary hover:border-border-gold hover:text-accent-gold"
            >
              1/2 POT
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setQuickRaise(Math.max(minRaise, pot))}
              className="voxel-btn border-2 border-border-subtle bg-surface-panel px-2.5 py-1 font-mono text-[11px] font-extrabold text-content-secondary hover:border-border-gold hover:text-accent-gold"
            >
              POT
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onPlaceBet('ALL_IN')}
              className="voxel-btn border-2 border-status-warning bg-status-warning/20 px-2.5 py-1 font-mono text-[11px] font-extrabold text-status-warning hover:bg-status-warning hover:text-content-inverse"
            >
              ALL-IN
            </button>
          </div>

          {/* Tactile Raise Slider + Numeric Plate */}
          <input
            type="range"
            min={minRaise}
            max={Math.max(minRaise, maxRaiseBy)}
            step={Math.max(10, Math.floor(minRaise / 2))}
            value={Math.min(Math.max(minRaise, raiseBy), Math.max(minRaise, maxRaiseBy))}
            disabled={!enabled}
            onChange={(e) => setRaiseBy(Number(e.target.value))}
            className="h-2 min-w-[90px] flex-1 accent-accent-gold"
          />

          <span className="min-w-[82px] border-2 border-border-gold/70 bg-surface-canvas px-2.5 py-1 text-right font-mono text-xs font-extrabold text-accent-gold">
            +{raiseBy.toLocaleString()}
          </span>
        </div>
      )}

      {/* Main 3 Large Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet('FOLD')}
          className="voxel-btn border-2 border-status-danger bg-status-danger/20 py-3 font-mono text-sm font-extrabold tracking-wider text-status-danger hover:bg-status-danger hover:text-content-primary disabled:opacity-40"
        >
          BỎ BÀI
        </button>

        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet(canCheck ? 'CHECK' : 'CALL')}
          className="voxel-btn border-2 border-accent-jade bg-accent-jade py-3 font-mono text-sm font-extrabold tracking-wider text-content-inverse disabled:opacity-40"
        >
          {canCheck ? 'XEM' : `THEO ${Math.min(myChips, toCall).toLocaleString()}`}
        </button>

        <button
          type="button"
          disabled={!enabled || !canRaise}
          onClick={() => onPlaceBet('RAISE', raiseBy)}
          className="voxel-btn border-2 border-border-gold bg-accent-gold py-3 font-mono text-sm font-extrabold tracking-wider text-content-inverse disabled:opacity-40"
        >
          TỐ +{raiseBy.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
