import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { breakDownChips } from '../../utils/chipDenominations';

export interface ChipStack3DProps {
  amount: number;
  position: [number, number, number];
  scale?: number;
}

interface ChipLayer {
  color: string;
  count: number;
  offsetX: number;
  offsetZ: number;
}

let sharedVoxelChipGeo: THREE.ExtrudeGeometry | null = null;
export function getVoxelChipGeometry(): THREE.ExtrudeGeometry {
  if (sharedVoxelChipGeo) return sharedVoxelChipGeo;
  const r = 0.16;
  const step = 0.055;
  const s = new THREE.Shape();
  s.moveTo(-r + step, -r);
  s.lineTo(r - step, -r);
  s.lineTo(r - step, -r + step);
  s.lineTo(r, -r + step);
  s.lineTo(r, r - step);
  s.lineTo(r - step, r - step);
  s.lineTo(r - step, r);
  s.lineTo(-r + step, r);
  s.lineTo(-r + step, r - step);
  s.lineTo(-r, r - step);
  s.lineTo(-r, -r + step);
  s.lineTo(-r + step, -r + step);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.048, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  // Shift upward so y=0 is the exact bottom of the chip
  geo.translate(0, 0.048, 0);
  sharedVoxelChipGeo = geo;
  return geo;
}

const STACK_OFFSETS: [number, number][] = [
  [-0.36, -0.14],
  [0.02, -0.16],
  [0.38, -0.06],
  [-0.18, 0.22],
  [0.2, 0.24],
  [-0.5, 0.18],
];

export const ChipStack3D = memo(function ChipStack3D({
  amount,
  position,
  scale = 1,
}: ChipStack3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const targetVec = useRef(new THREE.Vector3());
  const chipGeo = useMemo(() => getVoxelChipGeometry(), []);

  const stacks = useMemo<ChipLayer[]>(() => {
    const breakdown = breakDownChips(amount);
    return breakdown.map((item, idx) => {
      const [offsetX, offsetZ] = STACK_OFFSETS[idx % STACK_OFFSETS.length];
      return {
        color: item.denom.hex3D,
        count: Math.min(10, item.count),
        offsetX,
        offsetZ,
      };
    });
  }, [amount]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    targetVec.current.set(position[0], position[1], position[2]);
    currentPos.current.lerp(targetVec.current, Math.min(1, delta * 9));
    group.position.copy(currentPos.current);
  });

  if (stacks.length === 0) return null;

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {stacks.map((stack, sIdx) => (
        <group key={sIdx} position={[stack.offsetX, 0, stack.offsetZ]}>
          {Array.from({ length: stack.count }).map((_, cIdx) => {
            const bottomY = cIdx * 0.052;
            const isTop = cIdx === stack.count - 1;
            return (
              <group key={cIdx}>
                <mesh geometry={chipGeo} position={[0, bottomY, 0]} castShadow={isTop}>
                  <meshStandardMaterial color={stack.color} roughness={0.58} />
                </mesh>
                {isTop && (
                  <mesh position={[0, bottomY + 0.053, 0]}>
                    <boxGeometry args={[0.13, 0.008, 0.13]} />
                    <meshStandardMaterial color={SCENE_TOKENS.chips.stripe} roughness={0.6} />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
});
