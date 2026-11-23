import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { getCardBackTexture, getCardFrontTexture } from '../CardTextureFactory';

export interface PlayingCard3DProps {
  card: Card | null;
  targetPosition: [number, number, number];
  targetRotation?: [number, number, number];
  faceUp: boolean;
  scale?: number;
  exposedHighlight?: boolean;
  onClick?: () => void;
}

const DECK_ORIGIN = new THREE.Vector3(-2.6, 0.28, -0.35);

export const PlayingCard3D = memo(function PlayingCard3D({
  card,
  targetPosition,
  targetRotation = [0, 0, 0],
  faceUp,
  scale = 1,
  exposedHighlight = false,
  onClick,
}: PlayingCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(DECK_ORIGIN.clone());
  const targetVec = useRef(new THREE.Vector3());
  const currentFlip = useRef(faceUp ? 0 : Math.PI);

  const frontTexture = useMemo(() => (card ? getCardFrontTexture(card) : null), [card]);
  const backTexture = useMemo(() => getCardBackTexture(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const lerpFactor = Math.min(1, delta * 9);
    targetVec.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    currentPos.current.lerp(targetVec.current, lerpFactor);
    group.position.copy(currentPos.current);

    const desiredFlip = faceUp && card ? 0 : Math.PI;
    currentFlip.current = THREE.MathUtils.lerp(currentFlip.current, desiredFlip, lerpFactor);

    group.rotation.set(
      targetRotation[0],
      targetRotation[1],
      targetRotation[2] + currentFlip.current
    );
  });

  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Crisp rectangular voxel card slab */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.032, 1.1]} />
        <meshStandardMaterial
          color={exposedHighlight ? SCENE_TOKENS.cards.exposedGlow : SCENE_TOKENS.cards.paperEdge}
          emissive={exposedHighlight ? SCENE_TOKENS.cards.exposedGlow : '#000000'}
          emissiveIntensity={exposedHighlight ? 0.55 : 0}
          roughness={0.65}
        />
      </mesh>

      {/* Top face (+Y): pixel-sharp card front */}
      {frontTexture && (
        <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.76, 1.08]} />
          <meshStandardMaterial map={frontTexture} roughness={0.6} />
        </mesh>
      )}

      {/* Bottom face (-Y): pixel-art Đông Sơn card back */}
      <mesh position={[0, -0.017, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.76, 1.08]} />
        <meshStandardMaterial map={backTexture} roughness={0.6} />
      </mesh>
    </group>
  );
});
