import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WinEffectId } from '../../types/game';

export interface WinEffects3DProps {
  effectId: WinEffectId;
  /** Changes on each new winning hand to restart the burst cleanly */
  handKey: string;
}

const CONFETTI_COLORS = ['#facc15', '#ef4444', '#22d3ee', '#4ade80', '#f472b6', '#fb923c'];

/** 1. CONFETTI: 36 colorful 3D voxel confetti blocks exploding upward & fluttering down */
function ConfettiBurst({ startTime }: { startTime: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (i % 5) * 0.23;
        const speed = 1.4 + ((i * 37) % 10) * 0.24;
        const up = 4.2 + ((i * 19) % 10) * 0.35;
        return {
          vx: Math.cos(angle) * speed,
          vy: up,
          vz: Math.sin(angle) * speed,
          rx: 4 + (i % 6),
          ry: 5 + (i % 5),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        };
      }),
    []
  );

  useFrame(() => {
    const t = Math.max(0, (performance.now() - startTime) / 1000);
    refs.current.forEach((m, i) => {
      if (!m) return;
      if (t > 3.6) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const p = particles[i];
      const drag = Math.exp(-t * 0.65);
      const x = p.vx * t * drag;
      const z = p.vz * t * drag;
      const y = Math.max(0.08, 0.25 + p.vy * t - 3.6 * t * t);
      m.position.set(x, y, z);
      m.rotation.set(p.rx * t, p.ry * t, (p.rx + p.ry) * 0.5 * t);
      const fade = t > 2.8 ? Math.max(0.01, (3.6 - t) / 0.8) : 1;
      m.scale.setScalar(fade);
    });
  });

  return (
    <group>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.14, 0.04, 0.14]} />
          <meshStandardMaterial color={p.color} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** 2. DOVES: 8 flapping 3D voxel white doves spiraling upward from table center */
function DovesBurst({ startTime }: { startTime: number }) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const leftWings = useRef<(THREE.Mesh | null)[]>([]);
  const rightWings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = Math.max(0, (performance.now() - startTime) / 1000);
    const now = clock.getElapsedTime();

    groupRefs.current.forEach((g, i) => {
      if (!g) return;
      const localT = t - i * 0.08;
      if (localT < 0 || localT > 3.2) {
        g.visible = false;
        return;
      }
      g.visible = true;
      const p = localT / 3.2;
      const angle = (i / 8) * Math.PI * 2 + p * 4.4;
      const radius = 0.25 + p * 3.4;
      const y = 0.28 + p * 3.8 + Math.sin(p * Math.PI * 4) * 0.16;
      g.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      g.rotation.y = -angle + Math.PI / 2;
      const sc = p < 0.12 ? p / 0.12 : p > 0.8 ? (1 - p) / 0.2 : 1;
      g.scale.setScalar(Math.max(0.01, sc * 1.15));

      const flap = Math.sin(now * 22 + i * 1.3) * 0.7;
      if (leftWings.current[i]) leftWings.current[i]!.rotation.z = flap;
      if (rightWings.current[i]) rightWings.current[i]!.rotation.z = -flap;
    });
  });

  return (
    <group>
      {Array.from({ length: 8 }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[0.14, 0.09, 0.24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.02, 0.14]}>
            <boxGeometry args={[0.05, 0.04, 0.06]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.4} />
          </mesh>
          <mesh
            ref={(el) => {
              leftWings.current[i] = el;
            }}
            position={[-0.16, 0.02, 0]}
          >
            <boxGeometry args={[0.22, 0.03, 0.14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
          <mesh
            ref={(el) => {
              rightWings.current[i] = el;
            }}
            position={[0.16, 0.02, 0]}
          >
            <boxGeometry args={[0.22, 0.03, 0.14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 3. TORNADO: Swirling funnel of 28 voxel wind & gold cubes rising from table center */
function TornadoBurst({ startTime }: { startTime: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const specs = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        basePhase: (i / 28) * Math.PI * 2,
        heightOffset: (i / 28) * 2.8,
        speed: 6.5 + (i % 4) * 1.1,
        color: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#e2e8f0' : '#38bdf8',
      })),
    []
  );

  useFrame(() => {
    const t = Math.max(0, (performance.now() - startTime) / 1000);
    refs.current.forEach((m, i) => {
      if (!m) return;
      if (t > 3.4) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const s = specs[i];
      const y = ((s.heightOffset + t * 2.2) % 3.1) + 0.15;
      const radius = 0.22 + y * 0.44;
      const angle = s.basePhase + t * s.speed;
      m.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      m.rotation.set(t * 4, angle, t * 3);
      const env = t < 0.25 ? t / 0.25 : t > 2.6 ? Math.max(0.01, (3.4 - t) / 0.8) : 1;
      m.scale.setScalar(env);
    });
  });

  return (
    <group>
      {specs.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial
            color={s.color}
            emissive={s.color}
            emissiveIntensity={0.45}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 4. FIRE_BURST: Roaring 3D voxel flame column & expanding fire ring from table center */
function FireBurst({ startTime }: { startTime: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);

  const flames = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => {
        const isRing = i >= 18;
        const angle = (i / (isRing ? 12 : 18)) * Math.PI * 2;
        return {
          isRing,
          angle,
          radiusSpeed: isRing ? 2.1 : 0.35 + (i % 4) * 0.15,
          upSpeed: isRing ? 0.55 : 2.8 + (i % 5) * 0.55,
          color: i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#f97316' : '#dc2626',
        };
      }),
    []
  );

  useFrame(() => {
    const t = Math.max(0, (performance.now() - startTime) / 1000);
    if (lightRef.current) {
      lightRef.current.intensity = t < 1.8 ? Math.max(0, (1 - t / 1.8) * 6.5) : 0;
    }

    refs.current.forEach((m, i) => {
      if (!m) return;
      if (t > 2.4) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const f = flames[i];
      const p = t / 2.4;
      const r = f.radiusSpeed * t;
      const y = f.isRing ? 0.14 + Math.sin(p * Math.PI) * 0.45 : 0.2 + f.upSpeed * t;
      m.position.set(Math.cos(f.angle) * r, y, Math.sin(f.angle) * r);
      m.rotation.set(t * 5, t * 4, 0);
      const sc = p < 0.15 ? (p / 0.15) * 1.4 : Math.max(0.01, (1 - p) * 1.4);
      m.scale.setScalar(sc);
    });
  });

  return (
    <group>
      <pointLight ref={lightRef} position={[0, 1.2, 0]} color="#f97316" distance={9} intensity={5} />
      {flames.map((f, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={1.6}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 5. LIGHTNING: Jagged 3D voxel electric bolts shooting skyward + sparks from table center */
function LightningBurst({ startTime }: { startTime: number }) {
  const boltGroupRef = useRef<THREE.Group>(null);
  const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);

  const boltSegments = useMemo(() => {
    const segs: { x: number; y: number; z: number; sx: number; sy: number }[] = [];
    // 3 jagged vertical bolts around center
    const offsets = [
      [0, 0],
      [-0.65, 0.35],
      [0.65, -0.3],
    ];
    offsets.forEach(([ox, oz], bIdx) => {
      let cx = ox;
      let cz = oz;
      for (let step = 0; step < 8; step++) {
        cx += ((step + bIdx) % 2 === 0 ? 1 : -1) * 0.16;
        cz += (step % 3 === 0 ? 1 : -1) * 0.12;
        segs.push({
          x: cx,
          y: 0.25 + step * 0.48,
          z: cz,
          sx: bIdx === 0 ? 0.16 : 0.11,
          sy: 0.52,
        });
      }
    });
    return segs;
  }, []);

  useFrame(() => {
    const t = Math.max(0, (performance.now() - startTime) / 1000);
    const strobe = t < 2.2 && Math.sin(t * 42) > -0.2;

    if (boltGroupRef.current) {
      boltGroupRef.current.visible = strobe;
      boltGroupRef.current.rotation.y = Math.floor(t * 14) * 0.9;
    }
    if (lightRef.current) {
      lightRef.current.intensity = strobe ? 7.5 : 0;
    }

    sparkRefs.current.forEach((m, i) => {
      if (!m) return;
      if (t > 2.4) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const angle = (i / 16) * Math.PI * 2;
      const dist = 0.25 + t * (1.8 + (i % 4) * 0.45);
      const y = 0.2 + Math.abs(Math.sin(t * 7 + i)) * 1.4;
      m.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      m.scale.setScalar(Math.max(0.01, 1 - t / 2.4));
    });
  });

  return (
    <group>
      <pointLight ref={lightRef} position={[0, 1.8, 0]} color="#38bdf8" distance={11} intensity={6} />
      <group ref={boltGroupRef}>
        {boltSegments.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]}>
            <boxGeometry args={[s.sx, s.sy, s.sx]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={2.6}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            sparkRefs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial
            color="#bae6fd"
            emissive="#22d3ee"
            emissiveIntensity={2.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Center-table 3D Showdown Victory Celebration VFX.
 */
export function WinEffects3D({ effectId, handKey }: WinEffects3DProps) {
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [handKey, effectId]);

  if (effectId === 'NONE') return null;

  return (
    <group position={[0, 0.1, 0.15]}>
      {effectId === 'CONFETTI' && <ConfettiBurst key={handKey} startTime={startTimeRef.current} />}
      {effectId === 'DOVES' && <DovesBurst key={handKey} startTime={startTimeRef.current} />}
      {effectId === 'TORNADO' && <TornadoBurst key={handKey} startTime={startTimeRef.current} />}
      {effectId === 'FIRE_BURST' && <FireBurst key={handKey} startTime={startTimeRef.current} />}
      {effectId === 'LIGHTNING' && <LightningBurst key={handKey} startTime={startTimeRef.current} />}
    </group>
  );
}
