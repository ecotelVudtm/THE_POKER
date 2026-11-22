import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { MiniGameChallenge, MiniGameSubmissionPayload } from '../../types/game';

export interface BalanceCircleMiniGameProps {
  challenge: MiniGameChallenge;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

const HOLD_DURATION_MS = 2500;

export function BalanceCircleMiniGame({
  challenge,
  onSubmit,
}: BalanceCircleMiniGameProps) {
  const [dotPos, setDotPos] = useState({ x: 0, y: 0 }); // normalized -1..1
  const [holding, setHolding] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [inside, setInside] = useState(true);

  const holdingRef = useRef(false);
  const submittedRef = useRef(false);
  const samplesRef = useRef<number[]>([]);

  const maxAllowedRadius = Math.min(0.9, challenge.params.zoneWidth * 1.6);

  const finishAndSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const samples = samplesRef.current;
    onSubmit({
      challengeId: challenge.challengeId,
      balanceSamples: samples.length >= 3 ? samples : [0.95, 0.95, 0.95],
    });
  }, [challenge.challengeId, onSubmit]);

  useEffect(() => {
    let rafId = 0;
    const startTs = performance.now();
    let x = 0.05;
    let y = 0.05;
    let vx = 0.2;
    let vy = -0.15;
    let lastTs = startTs;
    let lastSampleTs = startTs;
    const driftStrength = 1.15 * challenge.params.speedMultiplier;

    const loop = (now: number) => {
      if (submittedRef.current) return;
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const elapsed = now - startTs;

      // Smooth pseudo-random turbulence pushing the dot outward
      const angle = elapsed * 0.0032 * challenge.params.speedMultiplier;
      const fx = Math.cos(angle * 1.7) * driftStrength + Math.sin(angle * 0.9) * 0.55;
      const fy = Math.sin(angle * 1.3) * driftStrength + Math.cos(angle * 1.1) * 0.55;

      // When holding mouse/Space, apply strong centering focus pull
      const pull = holdingRef.current ? 4.4 : 0.35;
      vx += (fx - x * pull) * dt;
      vy += (fy - y * pull) * dt;

      // Damping
      vx *= 0.92;
      vy *= 0.92;

      x = Math.max(-0.98, Math.min(0.98, x + vx * dt));
      y = Math.max(-0.98, Math.min(0.98, y + vy * dt));

      const dist = Math.min(1, Math.hypot(x, y));
      setDotPos({ x, y });
      setInside(dist <= maxAllowedRadius);
      setProgressPct(Math.min(100, (elapsed / HOLD_DURATION_MS) * 100));

      if (now - lastSampleTs >= 100) {
        lastSampleTs = now;
        samplesRef.current.push(Number(dist.toFixed(3)));
      }

      if (elapsed >= HOLD_DURATION_MS || Date.now() >= challenge.expiresAt - 150) {
        finishAndSubmit();
        return;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [challenge.expiresAt, challenge.params.speedMultiplier, finishAndSubmit, maxAllowedRadius]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        holdingRef.current = true;
        setHolding(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        holdingRef.current = false;
        setHolding(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const ringRadiusPx = Math.round(maxAllowedRadius * 82);

  return (
    <div className="w-full max-w-md rounded-2xl border border-accent-via/70 bg-surface-panel/95 p-6 shadow-warm backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent-via">
          <Eye className="h-5 w-5" />
          <h3 className="text-base font-extrabold">Tâm Nhãn Đọc Vị</h3>
        </div>
        <span className="font-mono text-xs font-bold text-accent-via">
          {Math.round(progressPct)}%
        </span>
      </div>

      <p className="mt-1 text-xs text-content-secondary">
        Giữ chuột hoặc phím{' '}
        <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-accent-gold">
          Space
        </kbd>{' '}
        để kéo chấm sáng nằm trong vòng chuẩn suốt 2.5 giây!
      </p>

      {/* Balance Arena */}
      <div
        onMouseDown={() => {
          holdingRef.current = true;
          setHolding(true);
        }}
        onMouseUp={() => {
          holdingRef.current = false;
          setHolding(false);
        }}
        onMouseLeave={() => {
          holdingRef.current = false;
          setHolding(false);
        }}
        onTouchStart={() => {
          holdingRef.current = true;
          setHolding(true);
        }}
        onTouchEnd={() => {
          holdingRef.current = false;
          setHolding(false);
        }}
        className="relative mx-auto mt-5 flex h-44 w-44 cursor-pointer select-none items-center justify-center rounded-full border border-border-subtle bg-surface-canvas"
      >
        {/* Target Safe Circle */}
        <div
          className={`rounded-full border-2 transition-colors ${
            inside
              ? 'border-accent-jade bg-accent-jade/15'
              : 'border-status-danger bg-status-danger/15'
          }`}
          style={{
            width: `${ringRadiusPx * 2}px`,
            height: `${ringRadiusPx * 2}px`,
          }}
        />

        {/* Drifting Focus Dot */}
        <div
          className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow ${
            inside
              ? 'bg-accent-via shadow-viaGlow'
              : 'bg-status-danger'
          }`}
          style={{
            left: `${50 + dotPos.x * 46}%`,
            top: `${50 + dotPos.y * 46}%`,
          }}
        />
      </div>

      {/* Hold Progress Bar */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-canvas">
        <div
          className="h-full rounded-full bg-accent-via transition-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-3 text-center text-xs font-semibold text-content-secondary">
        {holding ? 'Đang tụ thần giữ tâm...' : 'Nhấn giữ chuột vào vòng tròn hoặc giữ Space'}
      </div>
    </div>
  );
}
