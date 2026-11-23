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

let sharedCardSlabGeo: THREE.BoxGeometry | null = null;
let sharedCardFaceGeo: THREE.PlaneGeometry | null = null;

function getCardGeometries() {
  if (!sharedCardSlabGeo) {
    sharedCardSlabGeo = new THREE.BoxGeometry(0.78, 0.032, 1.1);
  }
  if (!sharedCardFaceGeo) {
    sharedCardFaceGeo = new THREE.PlaneGeometry(0.76, 1.08);
  }
  return { slabGeo: sharedCardSlabGeo, faceGeo: sharedCardFaceGeo };
}

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

  const { slabGeo, faceGeo } = useMemo(() => getCardGeometries(), []);
  const frontTexture = useMemo(() => (card ? getCardFrontTexture(card) : null), [card]);
  const backTexture = useMemo(() => getCardBackTexture(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const desiredFlip = faceUp && card ? 0 : Math.PI;
    targetVec.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);

    const posDone = currentPos.current.distanceToSquared(targetVec.current) < 0.00005;
    const flipDone = Math.abs(currentFlip.current - desiredFlip) < 0.002;
    if (posDone && flipDone) {
      return;
    }

    const lerpFactor = Math.min(1, delta * 9);
    currentPos.current.lerp(targetVec.current, lerpFactor);
    if (currentPos.current.distanceToSquared(targetVec.current) < 0.00005) {
      currentPos.current.copy(targetVec.current);
    }
    group.position.copy(currentPos.current);

    currentFlip.current = THREE.MathUtils.lerp(currentFlip.current, desiredFlip, lerpFactor);
    if (Math.abs(currentFlip.current - desiredFlip) < 0.002) {
      currentFlip.current = desiredFlip;
    }

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
      {/* Crisp rectangular voxel card slab (shared geometry across all cards) */}
      <mesh geometry={slabGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={exposedHighlight ? SCENE_TOKENS.cards.exposedGlow : SCENE_TOKENS.cards.paperEdge}
          emissive={exposedHighlight ? SCENE_TOKENS.cards.exposedGlow : '#000000'}
          emissiveIntensity={exposedHighlight ? 0.55 : 0}
          roughness={0.65}
        />
      </mesh>

      {/* Top face (+Y): pixel-sharp card front */}
      {frontTexture && (
        <mesh geometry={faceGeo} position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={frontTexture} roughness={0.6} />
        </mesh>
      )}

      {/* Bottom face (-Y): pixel-art Đông Sơn card back */}
      <mesh geometry={faceGeo} position={[0, -0.017, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial map={backTexture} roughness={0.6} />
      </mesh>
    </group>
  );
});
