import { useCallback, useEffect, useRef, useState } from 'react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';

export interface TimingBarMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

export function TimingBarMiniGame({ challenge, onSubmit }: TimingBarMiniGameProps) {
  const [cursor, setCursor] = useState(0);
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, challenge.expiresAt - Date.now())
  );
  const lockedRef = useRef(false);
  const cursorRef = useRef(0);

  const lockCursor = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    onSubmit({
      challengeId: challenge.challengeId,
      cursorPosition: Number(cursorRef.current.toFixed(4)),
    });
  }, [challenge.challengeId, onSubmit]);

  useEffect(() => {
    let rafId = 0;
    const startTs = performance.now();
    const speed = challenge.params.speedMultiplier * 1.45; // sweeps per second

    const loop = (now: number) => {
      if (lockedRef.current) return;
      const elapsedSec = (now - startTs) / 1000;
      // Smooth triangle wave oscillating between 0 and 1
      const phase = (elapsedSec * speed) % 2;
      const pos = phase <= 1 ? phase : 2 - phase;
      cursorRef.current = pos;
      setCursor(pos);

      const left = Math.max(0, challenge.expiresAt - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        lockCursor();
        return;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [challenge.expiresAt, challenge.params.speedMultiplier, lockCursor]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        lockCursor();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lockCursor]);

  const { targetStart, targetEnd, zoneWidth } = challenge.params;
  const timePct = Math.min(100, (remainingMs / 6000) * 100);

  return (
    <div className="voxel-panel-gold w-full max-w-md p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-base font-extrabold text-accent-gold">TRÁO BÀI TAY ÁO</h3>
        <span className="font-mono text-xs font-bold text-status-warning">
          {(remainingMs / 1000).toFixed(1)}s
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Bấm <kbd className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">Space</kbd> hoặc nút bên dưới khi kim chạy vào vùng xanh!
      </p>

      {/* Remaining time bar */}
      <div className="mt-3 h-1.5 w-full bg-surface-canvas">
        <div
          className="h-full bg-status-warning transition-none"
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Timing Bar Track */}
      <div className="relative mt-6 h-12 w-full overflow-hidden border-2 border-border-subtle bg-surface-canvas">
        {/* Success Green Zone */}
        <div
          className="absolute inset-y-0 border-x-2 border-accent-jade bg-accent-jade/30"
          style={{
            left: `${targetStart * 100}%`,
            width: `${zoneWidth * 100}%`,
          }}
        />
        {/* Target Center Guide */}
        <div
          className="absolute inset-y-1 w-0.5 bg-accent-jade/80"
          style={{ left: `${((targetStart + targetEnd) / 2) * 100}%` }}
        />
        {/* Moving Needle */}
        <div
          className="absolute inset-y-0 w-2 -translate-x-1/2 bg-accent-gold"
          style={{ left: `${cursor * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={lockCursor}
        className="voxel-btn mt-5 w-full border-2 border-border-gold bg-accent-gold px-4 py-3 font-mono text-sm font-extrabold text-content-inverse"
      >
        TRÁO NGAY! (SPACE)
      </button>
    </div>
  );
}
