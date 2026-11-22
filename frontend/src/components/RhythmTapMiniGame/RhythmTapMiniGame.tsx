import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';

export interface RhythmTapMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

const APPROACH_WINDOW_MS = 900;

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
      padded.push(0); // missed beat
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

    const nowMs = Math.round(performance.now() - startRef.current);
    tapsRef.current.push(nowMs);
    const isHit = Math.abs(nowMs - beats[idx]) <= tolerance;

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
    let rafId = 0;
    const lastBeatDeadline = (beats[beats.length - 1] ?? 3200) + tolerance + 250;

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
      if (e.code === 'Space') {
        e.preventDefault();
        registerTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [registerTap]);

  const activeBeatIndex = Math.min(beats.length - 1, tapsRef.current.length);

  return (
    <div className="w-full max-w-md rounded-2xl border border-status-warning/70 bg-surface-panel/95 p-6 shadow-warm backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-status-warning">
          <Flame className="h-5 w-5" />
          <h3 className="text-base font-extrabold">Tỏa Khí Thế</h3>
        </div>
        <span className="font-mono text-xs font-bold text-content-secondary">
          Đạt tối thiểu 2/3 nhịp
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Bấm <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">Space</kbd> hoặc chạm nút khi vòng ngoài thu khít vào vòng vàng!
      </p>

      {/* Concentric Shrinking Rhythm Rings */}
      <div
        onClick={registerTap}
        className="relative mx-auto mt-5 flex h-44 w-44 cursor-pointer select-none items-center justify-center rounded-full bg-surface-canvas"
      >
        {/* Target Inner Ring */}
        <div className="h-20 w-20 rounded-full border-4 border-accent-gold bg-accent-gold/10 shadow-goldGlow" />

        {/* Approaching Rings for all 3 beats */}
        {beats.map((beatMs, idx) => {
          const diff = beatMs - elapsedMs;
          if (diff > APPROACH_WINDOW_MS || diff < -tolerance || tapResults[idx] !== 'pending') {
            return null;
          }
          const progress = Math.max(0, Math.min(1, 1 - diff / APPROACH_WINDOW_MS));
          const sizePx = 172 - progress * 92; // shrinks from 172px -> 80px
          return (
            <div
              key={idx}
              className="pointer-events-none absolute rounded-full border-2 border-status-warning"
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                opacity: 0.4 + progress * 0.6,
              }}
            />
          );
        })}

        <span className="pointer-events-none absolute font-mono text-xs font-extrabold text-accent-gold">
          NHỊP {activeBeatIndex + 1}/3
        </span>
      </div>

      {/* Beat Hit Indicators */}
      <div className="mt-4 flex justify-center gap-3">
        {tapResults.map((res, idx) => (
          <div
            key={idx}
            className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs font-bold ${
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
        onClick={registerTap}
        className="mt-4 w-full rounded-xl bg-status-warning px-4 py-2.5 text-sm font-extrabold text-content-inverse transition hover:brightness-110 active:scale-[0.99]"
      >
        Bấm đúng nhịp! (Space)
      </button>
    </div>
  );
}
