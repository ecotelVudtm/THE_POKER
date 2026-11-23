import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkinId } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { SKIN_CATALOG_BY_ID } from '../../utils/cosmeticCatalog';
import { getVoxelFaceTexture } from '../ProceduralTextures';

export interface VoxelAvatar3DProps {
  skinId?: SkinId;
  seatIndex?: number;
  dimmed?: boolean;
  /** Optional slow turntable spin for Shop 3D preview */
  turntable?: boolean;
}

const DEFAULT_SHIRT_COLORS = ['#2563eb', '#b45309', '#7c3aed', '#0f766e', '#be123c'];
const NEON_PALETTE = ['#22d3ee', '#f472b6', '#facc15', '#4ade80', '#a855f7'];

/** Small flapping 3D voxel white dove used by GRAND_MAGICIAN idle conjure animation */
function MiniConjuredDove({ index, seed }: { index: number; seed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + seed;
    // Conjure cycle every 5.2 seconds; doves appear during window [0.4s .. 2.7s]
    const cycle = t % 5.2;
    const localT = cycle - (0.45 + index * 0.16);
    const g = groupRef.current;
    if (!g) return;

    if (localT < 0 || localT > 2.1) {
      g.visible = false;
      return;
    }

    g.visible = true;
    const p = localT / 2.1; // 0..1
    const angle = index * ((Math.PI * 2) / 3) + p * 3.8;
    const radius = 0.18 + p * 0.92;
    g.position.set(
      Math.cos(angle) * radius,
      1.38 + p * 1.15 + Math.sin(p * Math.PI * 3) * 0.08,
      0.15 + Math.sin(angle) * radius
    );
    g.rotation.y = -angle + Math.PI / 2;
    const scale = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1;
    g.scale.setScalar(Math.max(0.01, scale));

    const flap = Math.sin(t * 24 + index * 2) * 0.65;
    if (leftWingRef.current) leftWingRef.current.rotation.z = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Dove body */}
      <mesh>
        <boxGeometry args={[0.1, 0.07, 0.16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {/* Tiny gold beak */}
      <mesh position={[0, 0.01, 0.095]}>
        <boxGeometry args={[0.04, 0.03, 0.04]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} />
      </mesh>
      {/* Flapping wings */}
      <mesh ref={leftWingRef} position={[-0.1, 0.02, 0]}>
        <boxGeometry args={[0.14, 0.025, 0.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
      <mesh ref={rightWingRef} position={[0.1, 0.02, 0]}>
        <boxGeometry args={[0.14, 0.025, 0.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Orbiting glowing voxel fireflies (Tier 3 FIREFLY_SAGE & Tier 4 GRAND_MAGICIAN) */
function OrbitingFireflies({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const a = t * (1.25 + (i % 2) * 0.35) + (i * Math.PI * 2) / 6;
      const r = 0.56 + Math.sin(t * 2.1 + i) * 0.08;
      m.position.set(
        Math.cos(a) * r,
        0.72 + ((i % 3) * 0.28) + Math.sin(t * 3.1 + i * 1.4) * 0.12,
        Math.sin(a) * r
      );
      const pulse = 0.75 + Math.sin(t * 6 + i * 2.1) * 0.35;
      m.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.6}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Reusable 3D Minecraft-style Voxel Player Model supporting all 11 Skins across 4 Price Tiers.
 */
export function VoxelAvatar3D({
  skinId = 'DEFAULT',
  seatIndex = 0,
  dimmed = false,
  turntable = false,
}: VoxelAvatar3DProps) {
  const skin = SKIN_CATALOG_BY_ID[skinId] ?? SKIN_CATALOG_BY_ID.DEFAULT;
  const faceTex = useMemo(() => getVoxelFaceTexture(seatIndex), [seatIndex]);

  const rootRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftArmPivotRef = useRef<THREE.Group>(null);
  const rightArmPivotRef = useRef<THREE.Group>(null);
  const discoHatMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const discoBandMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const watchSparkleRef = useRef<THREE.Mesh>(null);

  const baseShirt =
    skin.id === 'DEFAULT'
      ? DEFAULT_SHIRT_COLORS[seatIndex % DEFAULT_SHIRT_COLORS.length]
      : skin.shirtColor;
  const shirtColor = dimmed ? SCENE_TOKENS.seats.foldedTint : baseShirt;
  const sleeveColor = dimmed
    ? SCENE_TOKENS.seats.foldedTint
    : skin.id === 'DEFAULT'
      ? baseShirt
      : skin.sleeveColor;

  const animSeed = seatIndex * 1.37;

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime() + animSeed;

    if (turntable && rootRef.current) {
      rootRef.current.rotation.y += delta * 0.75;
    }

    // Tier 3: Blinking / color-cycling neon hat
    if (skin.auraEffect === 'neon_blink') {
      const idx = Math.floor(t * 4.5) % NEON_PALETTE.length;
      const nextIdx = (idx + 2) % NEON_PALETTE.length;
      if (discoHatMatRef.current) {
        discoHatMatRef.current.color.set(NEON_PALETTE[idx]);
        discoHatMatRef.current.emissive.set(NEON_PALETTE[idx]);
      }
      if (discoBandMatRef.current) {
        discoBandMatRef.current.color.set(NEON_PALETTE[nextIdx]);
        discoBandMatRef.current.emissive.set(NEON_PALETTE[nextIdx]);
      }
    }

    // Reset arm & head defaults
    let leftArmX = 0;
    let leftArmZ = 0;
    let rightArmX = 0;
    let rightArmZ = 0;
    let headPitch = 0;

    // Tier 4A: TYCOON_WATCH — raises BOTH hands up to check golden watch on wrist
    if (skin.specialAnim === 'check_watch') {
      const cycle = t % 4.6;
      let raise = 0;
      if (cycle > 0.8 && cycle < 3.0) {
        const p = (cycle - 0.8) / 2.2;
        raise = p < 0.25 ? p / 0.25 : p > 0.75 ? (1 - p) / 0.25 : 1;
      }
      leftArmX = -1.32 * raise;
      leftArmZ = 0.42 * raise;
      rightArmX = -1.18 * raise;
      rightArmZ = -0.35 * raise;
      headPitch = 0.26 * raise;

      if (watchSparkleRef.current) {
        watchSparkleRef.current.visible = raise > 0.65;
        watchSparkleRef.current.rotation.y = t * 6;
        watchSparkleRef.current.scale.setScalar(0.8 + Math.sin(t * 14) * 0.35);
      }
    }

    // Tier 4B: GRAND_MAGICIAN — raises both arms in grand flourish when conjuring doves
    if (skin.specialAnim === 'conjure_doves') {
      const cycle = t % 5.2;
      let flourish = 0;
      if (cycle > 0.15 && cycle < 1.5) {
        const p = (cycle - 0.15) / 1.35;
        flourish = Math.sin(p * Math.PI);
      }
      leftArmX = -2.15 * flourish;
      leftArmZ = -0.45 * flourish;
      rightArmX = -2.15 * flourish;
      rightArmZ = 0.45 * flourish;
      headPitch = -0.14 * flourish;
    }

    if (leftArmPivotRef.current) {
      leftArmPivotRef.current.rotation.set(leftArmX, 0, leftArmZ);
    }
    if (rightArmPivotRef.current) {
      rightArmPivotRef.current.rotation.set(rightArmX, 0, rightArmZ);
    }
    if (headGroupRef.current) {
      headGroupRef.current.rotation.x = headPitch;
    }
  });

  return (
    <group ref={rootRef}>
      {/* Torso */}
      <mesh castShadow position={[0, 0.52, 0]}>
        <boxGeometry args={[0.54, 0.62, 0.34]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>

      {/* Optional Tie / Lapel Accent */}
      {skin.accentColor && (
        <mesh position={[0, 0.58, 0.176]}>
          <boxGeometry args={[0.1, 0.36, 0.02]} />
          <meshStandardMaterial color={skin.accentColor} roughness={0.45} metalness={0.3} />
        </mesh>
      )}

      {/* Left Arm (pivoted at shoulder y = 0.76) */}
      <group ref={leftArmPivotRef} position={[-0.37, 0.76, 0.04]}>
        <mesh castShadow position={[0, -0.24, 0]}>
          <boxGeometry args={[0.18, 0.54, 0.22]} />
          <meshStandardMaterial color={sleeveColor} roughness={0.7} />
        </mesh>
        {/* Golden Watch Block on Left Wrist for TYCOON_WATCH */}
        {skin.specialAnim === 'check_watch' && (
          <group position={[0, -0.42, 0]}>
            <mesh>
              <boxGeometry args={[0.21, 0.07, 0.25]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#eab308"
                emissiveIntensity={0.45}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
            <mesh ref={watchSparkleRef} position={[0, 0.08, 0.15]} visible={false}>
              <boxGeometry args={[0.06, 0.06, 0.06]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#facc15"
                emissiveIntensity={2.0}
              />
            </mesh>
          </group>
        )}
        {/* White Magician Glove */}
        {skin.specialAnim === 'conjure_doves' && (
          <mesh position={[0, -0.47, 0]}>
            <boxGeometry args={[0.19, 0.12, 0.23]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        )}
      </group>

      {/* Right Arm (pivoted at shoulder y = 0.76) */}
      <group ref={rightArmPivotRef} position={[0.37, 0.76, 0.04]}>
        <mesh castShadow position={[0, -0.24, 0]}>
          <boxGeometry args={[0.18, 0.54, 0.22]} />
          <meshStandardMaterial color={sleeveColor} roughness={0.7} />
        </mesh>
        {skin.specialAnim === 'conjure_doves' && (
          <mesh position={[0, -0.47, 0]}>
            <boxGeometry args={[0.19, 0.12, 0.23]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        )}
      </group>

      {/* Head Group (pivoted at neck y = 0.84) */}
      <group ref={headGroupRef} position={[0, 0.84, 0]}>
        {/* Cube Head */}
        <mesh castShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[0.48, 0.48, 0.48]} />
          <meshStandardMaterial color="#e5b88d" roughness={0.65} />
        </mesh>
        {/* Crisp Pixel Face */}
        <mesh position={[0, 0.22, 0.242]}>
          <planeGeometry args={[0.48, 0.48]} />
          <meshStandardMaterial map={faceTex} roughness={0.65} />
        </mesh>
        {/* Blocky Hair Cap */}
        <mesh position={[0, 0.47, 0]}>
          <boxGeometry args={[0.52, 0.08, 0.52]} />
          <meshStandardMaterial color={skin.hairColor} roughness={0.8} />
        </mesh>

        {/* Tier 1+ 3D Voxel Glasses / Shades */}
        {skin.glassesColor && (
          <group position={[0, 0.25, 0.255]}>
            {/* Left lens */}
            <mesh position={[-0.12, 0, 0]}>
              <boxGeometry args={[0.16, 0.09, 0.03]} />
              <meshStandardMaterial
                color={skin.glassesColor}
                emissive={skin.auraEffect === 'neon_blink' ? skin.glassesColor : '#000000'}
                emissiveIntensity={skin.auraEffect === 'neon_blink' ? 0.9 : 0}
                metalness={0.6}
                roughness={0.2}
              />
            </mesh>
            {/* Right lens */}
            <mesh position={[0.12, 0, 0]}>
              <boxGeometry args={[0.16, 0.09, 0.03]} />
              <meshStandardMaterial
                color={skin.glassesColor}
                emissive={skin.auraEffect === 'neon_blink' ? skin.glassesColor : '#000000'}
                emissiveIntensity={skin.auraEffect === 'neon_blink' ? 0.9 : 0}
                metalness={0.6}
                roughness={0.2}
              />
            </mesh>
            {/* Nose bridge */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.08, 0.03, 0.03]} />
              <meshStandardMaterial color={skin.glassesColor} metalness={0.7} roughness={0.25} />
            </mesh>
          </group>
        )}

        {/* Tier 2+: Extra 3D Block Hats / Headgear */}
        {skin.hatStyle === 'fedora' && (
          <group position={[0, 0.53, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.74, 0.05, 0.74]} />
              <meshStandardMaterial color="#18181b" roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, 0.12, 0]}>
              <boxGeometry args={[0.5, 0.2, 0.5]} />
              <meshStandardMaterial color="#18181b" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <boxGeometry args={[0.52, 0.05, 0.52]} />
              <meshStandardMaterial color={skin.accentColor ?? '#eab308'} roughness={0.35} />
            </mesh>
          </group>
        )}

        {skin.hatStyle === 'cowboy' && (
          <group position={[0, 0.53, 0]}>
            {/* Wide brim */}
            <mesh castShadow>
              <boxGeometry args={[0.88, 0.05, 0.72]} />
              <meshStandardMaterial color="#92400e" roughness={0.75} />
            </mesh>
            {/* Curled side wings */}
            <mesh position={[-0.44, 0.05, 0]}>
              <boxGeometry args={[0.08, 0.08, 0.68]} />
              <meshStandardMaterial color="#78350f" roughness={0.75} />
            </mesh>
            <mesh position={[0.44, 0.05, 0]}>
              <boxGeometry args={[0.08, 0.08, 0.68]} />
              <meshStandardMaterial color="#78350f" roughness={0.75} />
            </mesh>
            {/* Tall crown */}
            <mesh castShadow position={[0, 0.16, 0]}>
              <boxGeometry args={[0.48, 0.26, 0.48]} />
              <meshStandardMaterial color="#92400e" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.5, 0.05, 0.5]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
          </group>
        )}

        {skin.hatStyle === 'crown' && (
          <group position={[0, 0.53, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.54, 0.11, 0.54]} />
              <meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.2} />
            </mesh>
            {[
              [-0.2, 0.1, 0.2],
              [0.2, 0.1, 0.2],
              [-0.2, 0.1, -0.2],
              [0.2, 0.1, -0.2],
              [0, 0.13, 0.22],
            ].map(([x, y, z], i) => (
              <mesh key={i} position={[x, y, z]}>
                <boxGeometry args={[0.1, 0.12, 0.1]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
              </mesh>
            ))}
            {/* Front Ruby Gem */}
            <mesh position={[0, 0.03, 0.28]}>
              <boxGeometry args={[0.09, 0.09, 0.04]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )}

        {skin.hatStyle === 'sage' && (
          <group position={[0, 0.52, 0]}>
            {/* Stepped Voxel Conical Hat (Nón lá trúc) */}
            <mesh castShadow>
              <boxGeometry args={[0.88, 0.06, 0.88]} />
              <meshStandardMaterial color="#065f46" roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, 0.07, 0]}>
              <boxGeometry args={[0.64, 0.08, 0.64]} />
              <meshStandardMaterial color="#047857" roughness={0.65} />
            </mesh>
            <mesh castShadow position={[0, 0.15, 0]}>
              <boxGeometry args={[0.38, 0.08, 0.38]} />
              <meshStandardMaterial color="#10b981" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.23, 0]}>
              <boxGeometry args={[0.14, 0.08, 0.14]} />
              <meshStandardMaterial
                color="#a3e635"
                emissive="#84cc16"
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        )}

        {skin.hatStyle === 'disco' && (
          <group position={[0, 0.53, 0]}>
            {/* Blinking Neon Party Hat */}
            <mesh castShadow>
              <boxGeometry args={[0.66, 0.06, 0.66]} />
              <meshStandardMaterial
                ref={discoBandMatRef}
                color="#f472b6"
                emissive="#f472b6"
                emissiveIntensity={1.1}
                roughness={0.25}
              />
            </mesh>
            <mesh castShadow position={[0, 0.14, 0]}>
              <boxGeometry args={[0.46, 0.22, 0.46]} />
              <meshStandardMaterial
                ref={discoHatMatRef}
                color="#22d3ee"
                emissive="#22d3ee"
                emissiveIntensity={1.1}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 0.29, 0]}>
              <boxGeometry args={[0.16, 0.1, 0.16]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#facc15"
                emissiveIntensity={1.5}
              />
            </mesh>
          </group>
        )}

        {skin.hatStyle === 'tophat' && (
          <group position={[0, 0.53, 0]}>
            {/* Grand Magician Tall Top Hat */}
            <mesh castShadow>
              <boxGeometry args={[0.76, 0.05, 0.76]} />
              <meshStandardMaterial color="#09090b" roughness={0.55} />
            </mesh>
            <mesh castShadow position={[0, 0.22, 0]}>
              <boxGeometry args={[0.48, 0.4, 0.48]} />
              <meshStandardMaterial color="#09090b" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[0.51, 0.07, 0.51]} />
              <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>
          </group>
        )}
      </group>

      {/* Tier 3: Orbiting Fireflies or Neon Sparks */}
      {skin.auraEffect === 'fireflies' && (
        <OrbitingFireflies color={skin.accentColor ?? '#bef264'} />
      )}
      {skin.auraEffect === 'neon_blink' && <OrbitingFireflies color="#38bdf8" />}

      {/* Tier 4: Grand Magician Conjured Flapping Voxel Doves */}
      {skin.specialAnim === 'conjure_doves' && (
        <>
          <MiniConjuredDove index={0} seed={animSeed} />
          <MiniConjuredDove index={1} seed={animSeed} />
          <MiniConjuredDove index={2} seed={animSeed} />
        </>
      )}
    </group>
  );
}
