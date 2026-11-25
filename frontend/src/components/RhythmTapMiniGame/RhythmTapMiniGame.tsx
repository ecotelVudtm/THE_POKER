import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';

export interface RhythmTapMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

const ARENA_WIDTH = 312;
const ARENA_HEIGHT = 204;
const TARGET_BOX_PX = 68;
const INPUT_LATENCY_COMPENSATION_MS = 45;

/** Generates well-separated random (x, y) target positions inside the arena for each beat */
function generateBeatPositions(count: number, seedStr: string): { x: number; y: number }[] {
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const marginX = 52;
  const marginY = 48;
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    let best = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
    for (let attempt = 0; attempt < 16; attempt++) {
      const cx = marginX + nextRand() * (ARENA_WIDTH - marginX * 2);
      const cy = marginY + nextRand() * (ARENA_HEIGHT - marginY * 2);
      const prev = positions[positions.length - 1];
      if (!prev || Math.hypot(cx - prev.x, cy - prev.y) >= 82) {
        best = { x: Math.round(cx), y: Math.round(cy) };
        break;
      }
      best = { x: Math.round(cx), y: Math.round(cy) };
    }
    positions.push(best);
  }
  return positions;
}

/**
 * Low-latency 60fps Rhythm Tap (Tỏa Khí Thế / Mặt Lạnh):
 * - Spawns each beat's target square at a DIFFERENT randomized position inside the arena!
 * - Faster initial approach shrink speed at low mastery levels (slows down smoothly as mastery grows).
 * - Uses `onPointerDown` & non-repeating `keydown` (zero mouse-up delay!).
 */
export function RhythmTapMiniGame({ challenge, onSubmit }: RhythmTapMiniGameProps) {
  const beats = challenge.params.rhythmBeatsMs;
  const tolerance = challenge.params.rhythmToleranceMs;
  // Faster initial shrink window at low level (e.g. ~540ms at Lv1 speed 1.38x -> ~860ms at Lv10)
  const approachWindowMs = Math.round(
    Math.max(460, Math.min(880, 740 / Math.max(0.5, challenge.params.speedMultiplier)))
  );

  const beatPositions = useMemo(
    () => generateBeatPositions(beats.length, challenge.challengeId),
    [beats.length, challenge.challengeId]
  );

  const heading =
    challenge.skillType === 'POKER_FACE' ? 'MẶT LẠNH TĨNH TÂM' : 'TỎA KHÍ THẾ';

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
  const activePos = beatPositions[activeBeatIndex] ?? { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };

  return (
    <div className="voxel-panel w-full max-w-md border-status-warning p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-base font-extrabold text-status-warning">{heading}</h3>
        <span className="font-mono text-xs font-bold text-content-secondary">
          Đạt tối thiểu 2/3 nhịp
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Bấm{' '}
        <kbd className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">
          Space
        </kbd>{' '}
        hoặc nhấn chuột ngay khi khung ngoài thu vào chạm khít ô vàng!
      </p>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          registerTap();
        }}
        className="relative mx-auto mt-5 cursor-pointer select-none overflow-hidden border-2 border-border-subtle bg-surface-canvas"
        style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}
      >
        {/* Active Randomized Target Square */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-4 border-accent-gold bg-accent-gold/10 transition-all duration-100"
          style={{
            width: TARGET_BOX_PX,
            height: TARGET_BOX_PX,
            left: `${activePos.x}px`,
            top: `${activePos.y}px`,
          }}
        >
          <span className="flex h-full w-full items-center justify-center font-mono text-xs font-extrabold text-accent-gold">
            {activeBeatIndex + 1}/3
          </span>
        </div>

        {/* Shrinking Approach Frames centered on each beat's unique random position */}
        {beats.map((beatMs, idx) => {
          const diff = beatMs - elapsedMs;
          if (diff > approachWindowMs || diff < -tolerance || tapResults[idx] !== 'pending') {
            return null;
          }
          const progress = Math.max(0, Math.min(1, 1 - diff / approachWindowMs));
          const sizePx = TARGET_BOX_PX + (1 - progress) * 98;
          const pos = beatPositions[idx] ?? activePos;
          return (
            <div
              key={idx}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-2 border-status-warning"
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                opacity: 0.45 + progress * 0.55,
              }}
            />
          );
        })}
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
