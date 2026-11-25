import { useCallback, useEffect, useRef, useState } from 'react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';

export interface TimingBarMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

/**
 * High-responsiveness 60fps Timing Bar:
 * - Drives needle directly via DOM ref (zero React re-render frame lag!)
 * - Triggers on `onPointerDown` & `keydown` (zero mouse-up latency!)
 * - Applies -35ms visual-motor latency compensation so pressing right when touching green hits cleanly!
 */
export function TimingBarMiniGame({ challenge, onSubmit }: TimingBarMiniGameProps) {
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, challenge.expiresAt - Date.now())
  );
  const needleRef = useRef<HTMLDivElement>(null);
  const startTsRef = useRef<number>(performance.now());
  const lockedRef = useRef(false);

  const speed = challenge.params.speedMultiplier * 1.62;
  const heading =
    challenge.skillType === 'VIA_SIPHON' ? 'HÚT VÍA ĐỐI THỦ' : 'TRÁO BÀI TAY ÁO';

  const computePosAt = useCallback(
    (perfNow: number) => {
      // Compensate -35ms for human visual-motor + display latency
      const elapsedSec = Math.max(0, (perfNow - startTsRef.current - 35) / 1000);
      const phase = (elapsedSec * speed) % 2;
      return phase <= 1 ? phase : 2 - phase;
    },
    [speed]
  );

  const lockCursor = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    soundEngine.playTimingLock();
    const exactPos = computePosAt(performance.now());
    if (needleRef.current) {
      needleRef.current.style.left = `${exactPos * 100}%`;
    }
    onSubmit({
      challengeId: challenge.challengeId,
      cursorPosition: Number(exactPos.toFixed(4)),
    });
  }, [challenge.challengeId, computePosAt, onSubmit]);

  useEffect(() => {
    startTsRef.current = performance.now();
    let rafId = 0;
    let lastTimerUiUpdate = 0;

    const loop = (now: number) => {
      if (lockedRef.current) return;
      const elapsedSec = (now - startTsRef.current) / 1000;
      const phase = (elapsedSec * speed) % 2;
      const pos = phase <= 1 ? phase : 2 - phase;

      if (needleRef.current) {
        needleRef.current.style.left = `${pos * 100}%`;
      }

      if (now - lastTimerUiUpdate >= 60) {
        lastTimerUiUpdate = now;
        const left = Math.max(0, challenge.expiresAt - Date.now());
        setRemainingMs(left);
        if (left <= 0) {
          lockCursor();
          return;
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [challenge.expiresAt, lockCursor, speed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
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
        <h3 className="font-mono text-base font-extrabold text-accent-gold">{heading}</h3>
        <span className="font-mono text-xs font-bold text-status-warning">
          {(remainingMs / 1000).toFixed(1)}s
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Bấm <kbd className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">Space</kbd> hoặc nhấn chuột ngay khi kim chạm vùng xanh!
      </p>

      <div className="mt-3 h-1.5 w-full bg-surface-canvas">
        <div
          className="h-full bg-status-warning transition-none"
          style={{ width: `${timePct}%` }}
        />
      </div>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          lockCursor();
        }}
        className="relative mt-6 h-12 w-full cursor-pointer select-none overflow-hidden border-2 border-border-subtle bg-surface-canvas"
      >
        <div
          className="absolute inset-y-0 border-x-2 border-accent-jade bg-accent-jade/30"
          style={{
            left: `${targetStart * 100}%`,
            width: `${zoneWidth * 100}%`,
          }}
        />
        <div
          className="absolute inset-y-1 w-0.5 bg-accent-jade/80"
          style={{ left: `${((targetStart + targetEnd) / 2) * 100}%` }}
        />
        <div
          ref={needleRef}
          className="absolute inset-y-0 w-2 -translate-x-1/2 bg-accent-gold"
          style={{ left: '0%' }}
        />
      </div>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          lockCursor();
        }}
        className="voxel-btn mt-5 w-full border-2 border-border-gold bg-accent-gold px-4 py-3 font-mono text-sm font-extrabold text-content-inverse"
      >
        TRÁO NGAY! (SPACE)
      </button>
    </div>
  );
}
