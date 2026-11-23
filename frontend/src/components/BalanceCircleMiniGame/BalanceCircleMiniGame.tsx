import { useCallback, useEffect, useRef, useState } from 'react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';

export interface BalanceCircleMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

const TRACK_DURATION_MS = 2500;
const ARENA_SIZE = 220;

/**
 * Cursor-Tracking Moving Box Mini-Game (Tâm Nhãn Đọc Vị):
 * The glowing target square continuously glides around the arena;
 * the player holds & moves their mouse/finger to keep the cursor inside the moving box for 2.5s!
 */
export function BalanceCircleMiniGame({
  challenge,
  onSubmit,
}: BalanceCircleMiniGameProps) {
  const [progressPct, setProgressPct] = useState(0);
  const [inside, setInside] = useState(false);

  const arenaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  const pointerPosRef = useRef({ x: ARENA_SIZE / 2, y: ARENA_SIZE / 2, active: false });
  const submittedRef = useRef(false);
  const samplesRef = useRef<number[]>([]);

  const maxAllowedRadius = Math.min(0.9, challenge.params.zoneWidth * 1.6);
  const boxSizePx = Math.max(54, Math.min(96, Math.round(maxAllowedRadius * 115)));

  const finishAndSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const samples = samplesRef.current;
    onSubmit({
      challengeId: challenge.challengeId,
      balanceSamples: samples.length >= 3 ? samples : [1, 1, 1],
    });
  }, [challenge.challengeId, onSubmit]);

  const updatePointer = (clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(ARENA_SIZE, clientX - rect.left));
    const y = Math.max(0, Math.min(ARENA_SIZE, clientY - rect.top));
    pointerPosRef.current = { x, y, active: true };
    if (cursorDotRef.current) {
      cursorDotRef.current.style.left = `${x}px`;
      cursorDotRef.current.style.top = `${y}px`;
    }
  };

  useEffect(() => {
    let rafId = 0;
    const startTs = performance.now();
    let lastSampleTs = startTs;
    let lastUiTs = startTs;
    const speed = challenge.params.speedMultiplier * 1.15;
    const travelRadius = (ARENA_SIZE - boxSizePx) / 2 - 8;

    const loop = (now: number) => {
      if (submittedRef.current) return;
      const elapsed = now - startTs;
      const t = (elapsed / 1000) * speed;

      // Smooth figure-eight / Lissajous wandering path for the moving target box
      const bx = ARENA_SIZE / 2 + Math.sin(t * 1.5) * travelRadius;
      const by = ARENA_SIZE / 2 + Math.cos(t * 1.15) * travelRadius * 0.85;

      if (boxRef.current) {
        boxRef.current.style.left = `${bx}px`;
        boxRef.current.style.top = `${by}px`;
      }

      const ptr = pointerPosRef.current;
      const dx = Math.abs(ptr.x - bx);
      const dy = Math.abs(ptr.y - by);
      const halfBox = boxSizePx / 2;
      const isInsideBox = ptr.active && dx <= halfBox && dy <= halfBox;

      // Normalized distance: <= maxAllowedRadius when inside the moving box
      const normDist = isInsideBox
        ? Math.min(maxAllowedRadius * 0.8, (Math.hypot(dx, dy) / halfBox) * maxAllowedRadius)
        : 0.98;

      if (now - lastSampleTs >= 100) {
        lastSampleTs = now;
        samplesRef.current.push(Number(normDist.toFixed(3)));
      }

      if (now - lastUiTs >= 50) {
        lastUiTs = now;
        setInside(isInsideBox);
        setProgressPct(Math.min(100, (elapsed / TRACK_DURATION_MS) * 100));
      }

      if (elapsed >= TRACK_DURATION_MS || Date.now() >= challenge.expiresAt - 150) {
        finishAndSubmit();
        return;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [boxSizePx, challenge.expiresAt, challenge.params.speedMultiplier, finishAndSubmit, maxAllowedRadius]);

  return (
    <div className="voxel-panel w-full max-w-md border-accent-via p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-base font-extrabold text-accent-via">TÂM NHÃN ĐỌC VỊ</h3>
        <span className="font-mono text-xs font-bold text-accent-via">
          {Math.round(progressPct)}%
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Giữ và di chuột bám sát bên trong <strong>ô vuông đang di chuyển</strong> suốt 2.5 giây!
      </p>

      {/* Moving Target Box Arena */}
      <div
        ref={arenaRef}
        onPointerMove={(e) => updatePointer(e.clientX, e.clientY)}
        onPointerDown={(e) => updatePointer(e.clientX, e.clientY)}
        onPointerEnter={(e) => updatePointer(e.clientX, e.clientY)}
        className="relative mx-auto mt-5 cursor-crosshair select-none overflow-hidden border-2 border-border-subtle bg-surface-canvas"
        style={{ width: ARENA_SIZE, height: ARENA_SIZE }}
      >
        {/* Moving Target Box */}
        <div
          ref={boxRef}
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-2 transition-colors ${
            inside
              ? 'border-accent-jade bg-accent-jade/25'
              : 'border-accent-via bg-accent-via/15'
          }`}
          style={{
            width: boxSizePx,
            height: boxSizePx,
            left: ARENA_SIZE / 2,
            top: ARENA_SIZE / 2,
          }}
        />

        {/* Player Cursor Indicator */}
        <div
          ref={cursorDotRef}
          className={`pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-content-primary ${
            inside ? 'bg-accent-jade' : 'bg-status-warning'
          }`}
          style={{ left: ARENA_SIZE / 2, top: ARENA_SIZE / 2 }}
        />
      </div>

      <div className="mt-5 h-2 w-full border border-border-subtle bg-surface-canvas">
        <div
          className="h-full bg-accent-via transition-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-3 text-center font-mono text-xs font-semibold text-content-secondary">
        {inside ? 'ĐANG BÁM CHUẨN TÂM!' : 'DI CHUỘT VÀO Ô VUÔNG ĐANG CHẠY'}
      </div>
    </div>
  );
}
