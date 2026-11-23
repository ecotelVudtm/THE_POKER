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
      className={`voxel-panel pointer-events-auto flex flex-col gap-1.5 px-3 py-2 transition-opacity ${
        !enabled ? 'opacity-45' : ''
      }`}
    >
      {canRaise && (
        <div className="flex items-center gap-2">
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
          <span className="min-w-[68px] text-right font-mono text-[11px] font-bold text-accent-gold">
            +{raiseBy.toLocaleString()}
          </span>
          <button
            type="button"
            disabled={!enabled}
            onClick={() => setQuickRaise(Math.max(minRaise, pot * 0.5))}
            className="voxel-btn border border-border-subtle bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] font-bold text-content-secondary hover:border-border-gold hover:text-accent-gold"
          >
            1/2
          </button>
          <button
            type="button"
            disabled={!enabled}
            onClick={() => setQuickRaise(Math.max(minRaise, pot))}
            className="voxel-btn border border-border-subtle bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] font-bold text-content-secondary hover:border-border-gold hover:text-accent-gold"
          >
            POT
          </button>
          <button
            type="button"
            disabled={!enabled}
            onClick={() => onPlaceBet('ALL_IN')}
            className="voxel-btn border border-status-warning bg-surface-panel px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-status-warning hover:bg-status-warning hover:text-content-inverse"
          >
            ALL-IN
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet('FOLD')}
          className="voxel-btn border-2 border-status-danger bg-status-danger/20 py-2 font-mono text-xs font-extrabold tracking-wider text-status-danger hover:bg-status-danger hover:text-content-primary disabled:opacity-40"
        >
          BỎ BÀI
        </button>

        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPlaceBet(canCheck ? 'CHECK' : 'CALL')}
          className="voxel-btn border-2 border-accent-jade bg-accent-jade py-2 font-mono text-xs font-extrabold tracking-wider text-content-inverse disabled:opacity-40"
        >
          {canCheck ? 'XEM' : `THEO ${Math.min(myChips, toCall).toLocaleString()}`}
        </button>

        <button
          type="button"
          disabled={!enabled || !canRaise}
          onClick={() => onPlaceBet('RAISE', raiseBy)}
          className="voxel-btn border-2 border-border-gold bg-accent-gold py-2 font-mono text-xs font-extrabold tracking-wider text-content-inverse disabled:opacity-40"
        >
          TỐ +{raiseBy.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
