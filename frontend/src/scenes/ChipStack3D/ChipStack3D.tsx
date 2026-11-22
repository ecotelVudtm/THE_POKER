import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_TOKENS } from '../../styles/themeTokens';

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

export function ChipStack3D({ amount, position, scale = 1 }: ChipStack3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(position[0], position[1] + 0.35, position[2]));

  const stacks = useMemo<ChipLayer[]>(() => {
    if (amount <= 0) return [];
    const goldCount = Math.min(8, Math.floor(amount / 1000));
    const redCount = Math.min(8, Math.floor((amount % 1000) / 250));
    const blueCount = Math.min(8, Math.floor((amount % 250) / 100));
    const greenCount = Math.min(6, Math.max(1, Math.floor((amount % 100) / 25)));

    const layers: ChipLayer[] = [];
    if (goldCount > 0) {
      layers.push({ color: SCENE_TOKENS.chips.premium, count: goldCount, offsetX: -0.26, offsetZ: -0.1 });
    }
    if (redCount > 0) {
      layers.push({ color: SCENE_TOKENS.chips.high, count: redCount, offsetX: 0.24, offsetZ: -0.1 });
    }
    if (blueCount > 0) {
      layers.push({ color: SCENE_TOKENS.chips.mid, count: blueCount, offsetX: -0.1, offsetZ: 0.22 });
    }
    if (greenCount > 0 && layers.length < 3) {
      layers.push({ color: SCENE_TOKENS.chips.low, count: greenCount, offsetX: 0.22, offsetZ: 0.22 });
    }
    return layers;
  }, [amount]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = Math.min(1, delta * 9);
    currentPos.current.lerp(new THREE.Vector3(position[0], position[1], position[2]), t);
    group.position.copy(currentPos.current);
  });

  if (stacks.length === 0) return null;

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {stacks.map((stack, sIdx) => (
        <group key={sIdx} position={[stack.offsetX, 0, stack.offsetZ]}>
          {Array.from({ length: stack.count }).map((_, cIdx) => (
            <group key={cIdx} position={[0, 0.03 + cIdx * 0.055, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.048, 20]} />
                <meshStandardMaterial color={stack.color} roughness={0.35} metalness={0.12} />
              </mesh>
              <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.1, 0.13, 16]} />
                <meshStandardMaterial color={SCENE_TOKENS.chips.stripe} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
