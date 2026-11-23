import { useCallback, useEffect, useRef, useState } from 'react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';

export interface RhythmTapMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

const APPROACH_WINDOW_MS = 900;
const INPUT_LATENCY_COMPENSATION_MS = 45;

/**
 * Low-latency 60fps Rhythm Tap (Tỏa Khí Thế):
 * - Uses `onPointerDown` & non-repeating `keydown` (zero mouse-up delay!)
 * - Applies calibrated -45ms compensation so tapping right as the shrinking frame hits the gold square registers as exact!
 */
export function RhythmTapMiniGame({ challenge, onSubmit }: RhythmTapMiniGameProps) {
  const beats = challenge.params.rhythmBeatsMs;
  const tolerance = challenge.params.rhythmToleranceMs;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [tapResults, setTapResults] = useState<('pending' | 'hit' | 'miss')[]>(
    beats.map(() => 'pending')
  );

  const startRef = useRef(performance.now());
  const tapsRef = useRef<number[]>([]);
  const submittedRef = useRef(false);

  const finalize = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const padded = [...tapsRef.current];
    while (padded.length < beats.length) {
      padded.push(0);
    }
    onSubmit({
      challengeId: challenge.challengeId,
      tapTimestampsMs: padded.slice(0, beats.length),
    });
  }, [beats.length, challenge.challengeId, onSubmit]);

  const registerTap = useCallback(() => {
    if (submittedRef.current) return;
    const idx = tapsRef.current.length;
    if (idx >= beats.length) return;

    const rawMs = performance.now() - startRef.current;
    const compensatedMs = Math.max(0, Math.round(rawMs - INPUT_LATENCY_COMPENSATION_MS));
    tapsRef.current.push(compensatedMs);
    const isHit = Math.abs(compensatedMs - beats[idx]) <= tolerance;
    soundEngine.playRhythmTap(isHit);

    setTapResults((prev) => {
      const copy = [...prev];
      copy[idx] = isHit ? 'hit' : 'miss';
      return copy;
    });

    if (tapsRef.current.length >= beats.length) {
      setTimeout(finalize, 120);
    }
  }, [beats, finalize, tolerance]);

  useEffect(() => {
    startRef.current = performance.now();
    let rafId = 0;
    const lastBeatDeadline = (beats[beats.length - 1] ?? 3200) + tolerance + 260;

    const loop = (now: number) => {
      if (submittedRef.current) return;
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= lastBeatDeadline || Date.now() >= challenge.expiresAt - 120) {
        finalize();
        return;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [beats, challenge.expiresAt, finalize, tolerance]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        registerTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [registerTap]);

  const activeBeatIndex = Math.min(beats.length - 1, tapsRef.current.length);

  return (
    <div className="voxel-panel w-full max-w-md border-status-warning p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-base font-extrabold text-status-warning">TỎA KHÍ THẾ</h3>
        <span className="font-mono text-xs font-bold text-content-secondary">
          Đạt tối thiểu 2/3 nhịp
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Bấm <kbd className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">Space</kbd> hoặc nhấn chuột ngay khi khung ngoài chạm khít khung vàng!
      </p>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          registerTap();
        }}
        className="relative mx-auto mt-5 flex h-44 w-44 cursor-pointer select-none items-center justify-center border-2 border-border-subtle bg-surface-canvas"
      >
        <div className="h-20 w-20 border-4 border-accent-gold bg-accent-gold/10" />

        {beats.map((beatMs, idx) => {
          const diff = beatMs - elapsedMs;
          if (diff > APPROACH_WINDOW_MS || diff < -tolerance || tapResults[idx] !== 'pending') {
            return null;
          }
          const progress = Math.max(0, Math.min(1, 1 - diff / APPROACH_WINDOW_MS));
          const sizePx = 172 - progress * 92;
          return (
            <div
              key={idx}
              className="pointer-events-none absolute border-2 border-status-warning"
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                opacity: 0.45 + progress * 0.55,
              }}
            />
          );
        })}

        <span className="pointer-events-none absolute font-mono text-xs font-extrabold text-accent-gold">
          NHỊP {activeBeatIndex + 1}/3
        </span>
      </div>

      <div className="mt-4 flex justify-center gap-3">
        {tapResults.map((res, idx) => (
          <div
            key={idx}
            className={`flex h-7 w-7 items-center justify-center border-2 font-mono text-xs font-bold ${
              res === 'hit'
                ? 'border-accent-jade bg-accent-jade text-content-inverse'
                : res === 'miss'
                  ? 'border-status-danger bg-status-danger/25 text-status-danger'
                  : 'border-border-subtle bg-surface-elevated text-content-muted'
            }`}
          >
            {idx + 1}
          </div>
        ))}
      </div>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          registerTap();
        }}
        className="voxel-btn mt-4 w-full border-2 border-status-warning bg-status-warning px-4 py-2.5 font-mono text-sm font-extrabold text-content-inverse"
      >
        BẤM ĐÚNG NHỊP! (SPACE)
      </button>
    </div>
  );
}
