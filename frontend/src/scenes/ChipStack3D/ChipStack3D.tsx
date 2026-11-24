import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { breakDownChips } from '../../utils/chipDenominations';

export interface ChipStack3DProps {
  amount: number;
  position: [number, number, number];
  scale?: number;
}

interface ChipInstanceSpec {
  x: number;
  y: number;
  z: number;
  color: string;
  isTop: boolean;
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

let sharedStripeGeo: THREE.BoxGeometry | null = null;
export function getStripeGeometry(): THREE.BoxGeometry {
  if (!sharedStripeGeo) {
    sharedStripeGeo = new THREE.BoxGeometry(0.13, 0.008, 0.13);
  }
  return sharedStripeGeo;
}

const STACK_OFFSETS: [number, number][] = [
  [-0.36, -0.14],
  [0.02, -0.16],
  [0.38, -0.06],
  [-0.18, 0.22],
  [0.2, 0.24],
  [-0.5, 0.18],
];

const MAX_CHIPS_PER_BANK = 60;
const MAX_TOP_STRIPES = 6;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * GPU-Instanced 3D Voxel Chip Bank.
 * Renders up to 60 stacked chips in ONLY 2 draw calls (1 instancedMesh for bodies + 1 for top stripes)
 * with identical visuals and zero per-frame CPU overhead once settled.
 */
export const ChipStack3D = memo(function ChipStack3D({
  amount,
  position,
  scale = 1,
}: ChipStack3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const chipsMeshRef = useRef<THREE.InstancedMesh>(null);
  const stripesMeshRef = useRef<THREE.InstancedMesh>(null);

  const currentPos = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const targetVec = useRef(new THREE.Vector3(position[0], position[1], position[2]));

  const chipGeo = useMemo(() => getVoxelChipGeometry(), []);
  const stripeGeo = useMemo(() => getStripeGeometry(), []);

  const instances = useMemo<ChipInstanceSpec[]>(() => {
    const breakdown = breakDownChips(amount);
    const list: ChipInstanceSpec[] = [];
    breakdown.forEach((item, idx) => {
      const [offsetX, offsetZ] = STACK_OFFSETS[idx % STACK_OFFSETS.length];
      const count = Math.min(10, item.count);
      for (let c = 0; c < count && list.length < MAX_CHIPS_PER_BANK; c++) {
        list.push({
          x: offsetX,
          y: c * 0.052,
          z: offsetZ,
          color: item.denom.hex3D,
          isTop: c === count - 1,
        });
      }
    });
    return list;
  }, [amount]);

  useEffect(() => {
    const chipsMesh = chipsMeshRef.current;
    const stripesMesh = stripesMeshRef.current;
    if (!chipsMesh || !stripesMesh) return;

    let stripeIdx = 0;
    instances.forEach((spec, i) => {
      _dummy.position.set(spec.x, spec.y, spec.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      chipsMesh.setMatrixAt(i, _dummy.matrix);
      _color.set(spec.color);
      chipsMesh.setColorAt(i, _color);

      if (spec.isTop && stripeIdx < MAX_TOP_STRIPES) {
        _dummy.position.set(spec.x, spec.y + 0.053, spec.z);
        _dummy.updateMatrix();
        stripesMesh.setMatrixAt(stripeIdx, _dummy.matrix);
        stripeIdx += 1;
      }
    });

    chipsMesh.count = instances.length;
    chipsMesh.instanceMatrix.needsUpdate = true;
    if (chipsMesh.instanceColor) chipsMesh.instanceColor.needsUpdate = true;

    stripesMesh.count = stripeIdx;
    stripesMesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    targetVec.current.set(position[0], position[1], position[2]);
    if (currentPos.current.distanceToSquared(targetVec.current) < 0.00005) {
      if (!group.position.equals(targetVec.current)) {
        group.position.copy(targetVec.current);
      }
      return;
    }
    currentPos.current.lerp(targetVec.current, Math.min(1, delta * 9));
    group.position.copy(currentPos.current);
  });

  if (instances.length === 0) return null;

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      <instancedMesh
        ref={chipsMeshRef}
        args={[chipGeo, undefined, MAX_CHIPS_PER_BANK]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.58} />
      </instancedMesh>
      <instancedMesh
        ref={stripesMeshRef}
        args={[stripeGeo, undefined, MAX_TOP_STRIPES]}
        frustumCulled={false}
      >
        <meshStandardMaterial color={SCENE_TOKENS.chips.stripe} roughness={0.6} />
      </instancedMesh>
    </group>
  );
});
