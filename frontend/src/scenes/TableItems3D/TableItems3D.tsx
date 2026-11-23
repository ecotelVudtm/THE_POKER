import { memo, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ItemType, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { getCeramicBowlTexture, getPhoneScreenTexture } from '../ProceduralTextures';

export interface TableItems3DProps {
  me: PublicPlayerView | null;
  onUseItem: (item: ItemType) => void;
}

interface ItemMeta {
  type: ItemType;
  title: string;
  desc: string;
  position: [number, number, number];
}

const ITEMS_LAYOUT: ItemMeta[] = [
  {
    type: 'PHONE',
    title: 'Điện Thoại Vay Nóng',
    desc: 'Vay 2K/5K Chip hoặc +60s • Lãi 15%/ván',
    position: [-4.35, 0.07, 2.75],
  },
  {
    type: 'INCENSE_BOWL',
    title: 'Bát Hương Mini',
    desc: '20 Vía • Hồi 2 ván • +20% vùng Mini-game',
    position: [-3.0, 0.07, 3.1],
  },
  {
    type: 'LUCKY_MANGO',
    title: 'Quả Xoài May Mắn',
    desc: 'Xóa debuff • Khiên chặn 1 lần Lộ Tẩy',
    position: [3.0, 0.07, 3.1],
  },
  {
    type: 'ICED_TEA',
    title: 'Ly Trà Đá',
    desc: 'Hồi 2 ván • +20s thời gian • Chậm Mini-game 15%',
    position: [4.25, 0.07, 2.75],
  },
  {
    type: 'LUCKY_COIN',
    title: 'Đồng Xu Hộ Mệnh',
    desc: 'Bị động • Hoàn 15% cược khi thua All-in < 25%',
    position: [5.15, 0.07, 2.15],
  },
];

/** Single unified stepped-zigzag polygon extrusion — ZERO overlapping faces! */
function createSteppedDiscGeo(halfSize: number, step: number, height: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-halfSize + step, -halfSize);
  s.lineTo(halfSize - step, -halfSize);
  s.lineTo(halfSize - step, -halfSize + step);
  s.lineTo(halfSize, -halfSize + step);
  s.lineTo(halfSize, halfSize - step);
  s.lineTo(halfSize - step, halfSize - step);
  s.lineTo(halfSize - step, halfSize);
  s.lineTo(-halfSize + step, halfSize);
  s.lineTo(-halfSize + step, halfSize - step);
  s.lineTo(-halfSize, halfSize - step);
  s.lineTo(-halfSize, -halfSize + step);
  s.lineTo(-halfSize + step, -halfSize + step);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  return geo;
}

let cachedItemGeos: {
  bowlBelly: THREE.ExtrudeGeometry;
  saucer: THREE.ExtrudeGeometry;
} | null = null;

function getItemGeometries() {
  if (!cachedItemGeos) {
    cachedItemGeos = {
      bowlBelly: createSteppedDiscGeo(0.24, 0.07, 0.16),
      saucer: createSteppedDiscGeo(0.28, 0.08, 0.05),
    };
  }
  return cachedItemGeos;
}

function VoxelSmokeParticles({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !active) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, idx) => {
      const cycle = (t * 0.55 + idx * 0.24) % 1;
      child.position.y = 0.56 + cycle * 1.25;
      child.position.x = Math.round(Math.sin(t * 2 + idx) * 2) * 0.04;
      child.position.z = Math.round(Math.cos(t * 1.6 + idx) * 2) * 0.03;
      const s = 0.5 + cycle * 0.9;
      child.scale.set(s, s, s);
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.MeshStandardMaterial).opacity = (1 - cycle) * 0.6;
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.56, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial
            color={SCENE_TOKENS.items.incenseSmoke}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface InteractiveVoxelItemProps {
  meta: ItemMeta;
  statusNote: string;
  onClick: () => void;
  children: (hovered: boolean) => React.ReactNode;
}

function InteractiveVoxelItem({
  meta,
  statusNote,
  onClick,
  children,
}: InteractiveVoxelItemProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = meta.position[1] + (hovered ? 0.14 : 0);
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      Math.min(1, delta * 12)
    );
  });

  return (
    <group
      ref={groupRef}
      position={meta.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children(hovered)}

      {/* Non-overlapping square selection frame */}
      {hovered && (
        <group position={[0, 0.012, 0]}>
          <mesh position={[0, 0, -0.34]}>
            <boxGeometry args={[0.72, 0.02, 0.04]} />
            <meshBasicMaterial color={SCENE_TOKENS.items.hoverEmissive} />
          </mesh>
          <mesh position={[0, 0, 0.34]}>
            <boxGeometry args={[0.72, 0.02, 0.04]} />
            <meshBasicMaterial color={SCENE_TOKENS.items.hoverEmissive} />
          </mesh>
          <mesh position={[-0.34, 0, 0]}>
            <boxGeometry args={[0.04, 0.02, 0.64]} />
            <meshBasicMaterial color={SCENE_TOKENS.items.hoverEmissive} />
          </mesh>
          <mesh position={[0.34, 0, 0]}>
            <boxGeometry args={[0.04, 0.02, 0.64]} />
            <meshBasicMaterial color={SCENE_TOKENS.items.hoverEmissive} />
          </mesh>
        </group>
      )}

      {hovered && (
        <Html position={[0, 0.96, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
          <div className="voxel-panel w-52 px-3 py-2 text-left">
            <div className="text-xs font-extrabold text-accent-gold">{meta.title}</div>
            <div className="mt-0.5 text-[11px] text-content-secondary">{meta.desc}</div>
            <div className="mt-1 font-mono text-[10px] font-bold text-accent-jade">{statusNote}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

export const TableItems3D = memo(function TableItems3D({ me, onUseItem }: TableItems3DProps) {
  const { bowlBelly, saucer } = useMemo(() => getItemGeometries(), []);
  const bowlTex = useMemo(() => getCeramicBowlTexture(), []);
  const hasDebt = Boolean(me?.activeLoan || me?.statusEffects.debtPressure);
  const phoneScreenTex = useMemo(() => getPhoneScreenTexture(hasDebt), [hasDebt]);
  const phoneScreenMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const isBlessed = Boolean(me?.statusEffects.blessed);
  const lockedItem = me?.itemsState.lockedItem ?? null;
  const lockedHands = me?.itemsState.lockedItemHandsLeft ?? 0;

  useFrame(({ clock }) => {
    if (!phoneScreenMatRef.current) return;
    phoneScreenMatRef.current.emissiveIntensity = hasDebt
      ? 0.45 + 0.55 * Math.abs(Math.sin(clock.getElapsedTime() * 5))
      : 0.35;
  });

  const getStatus = (type: ItemType): string => {
    if (!me) return 'Sẵn sàng khi vào ván';
    if (lockedItem === type && lockedHands > 0) return `BỊ KHÓA (${lockedHands} ván)`;
    switch (type) {
      case 'PHONE':
        return me.activeLoan
          ? `Đang nợ ${me.activeLoan.currentOwed.toLocaleString()} — Bấm trả`
          : 'Bấm để mở App Vay Nhanh';
      case 'INCENSE_BOWL':
        return me.itemsState.incenseCooldownHands > 0
          ? `Hồi sau ${me.itemsState.incenseCooldownHands} ván`
          : me.via >= 20
            ? 'Sẵn sàng (20 Vía)'
            : 'Chưa đủ 20 Vía';
      case 'LUCKY_MANGO':
        return me.itemsState.luckyMangoUsesLeft > 0
          ? `Còn ${me.itemsState.luckyMangoUsesLeft}/2 quả`
          : 'Đã dùng hết';
      case 'ICED_TEA':
        return me.itemsState.icedTeaCooldownHands > 0
          ? `Hồi sau ${me.itemsState.icedTeaCooldownHands} ván`
          : 'Sẵn sàng (+20s)';
      case 'LUCKY_COIN':
        return 'Tự động bảo hộ';
    }
  };

  const ownedSet = useMemo(() => new Set(me?.ownedItems ?? []), [me?.ownedItems]);

  if (!me || ownedSet.size === 0) {
    return null;
  }

  return (
    <group>
      {/* 1. VOXEL SMARTPHONE */}
      {ownedSet.has('PHONE') && (
        <InteractiveVoxelItem
          meta={ITEMS_LAYOUT[0]}
          statusNote={getStatus('PHONE')}
          onClick={() => onUseItem('PHONE')}
        >
          {(hovered) => (
            <group rotation={[0, 0.34, 0]}>
              <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
                <boxGeometry args={[0.38, 0.06, 0.66]} />
                <meshStandardMaterial color={SCENE_TOKENS.items.phoneBody} roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.064, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.32, 0.58]} />
                <meshStandardMaterial
                  ref={phoneScreenMatRef}
                  map={phoneScreenTex}
                  emissive={
                    hasDebt
                      ? SCENE_TOKENS.items.phoneScreenDebt
                      : hovered
                        ? SCENE_TOKENS.items.hoverEmissive
                        : SCENE_TOKENS.items.phoneScreenIdle
                  }
                  emissiveMap={phoneScreenTex}
                  emissiveIntensity={0.45}
                />
              </mesh>
            </group>
          )}
        </InteractiveVoxelItem>
      )}

      {/* 2. VOXEL STEPPED BÁT HƯƠNG MINI */}
      {ownedSet.has('INCENSE_BOWL') && (
        <InteractiveVoxelItem
          meta={ITEMS_LAYOUT[1]}
          statusNote={getStatus('INCENSE_BOWL')}
          onClick={() => onUseItem('INCENSE_BOWL')}
        >
          {(hovered) => (
            <group>
              <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
                <boxGeometry args={[0.3, 0.08, 0.3]} />
                <meshStandardMaterial map={bowlTex} roughness={0.6} />
              </mesh>
              <mesh geometry={bowlBelly} castShadow receiveShadow position={[0, 0.24, 0]}>
                <meshStandardMaterial
                  map={bowlTex}
                  emissive={hovered || isBlessed ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                  emissiveIntensity={isBlessed ? 0.22 : hovered ? 0.16 : 0}
                  roughness={0.55}
                />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <boxGeometry args={[0.36, 0.04, 0.36]} />
                <meshStandardMaterial color="#b5a898" roughness={0.9} />
              </mesh>
              {[-0.08, 0, 0.08].map((x, idx) => (
                <group key={idx} position={[x, 0.42, 0]} rotation={[0, 0, x * -1.2]}>
                  <mesh>
                    <boxGeometry args={[0.025, 0.28, 0.025]} />
                    <meshStandardMaterial color={SCENE_TOKENS.items.incenseStick} />
                  </mesh>
                  <mesh position={[0, 0.155, 0]}>
                    <boxGeometry args={[0.035, 0.035, 0.035]} />
                    <meshStandardMaterial
                      color={SCENE_TOKENS.items.incenseEmber}
                      emissive={SCENE_TOKENS.items.incenseEmber}
                      emissiveIntensity={isBlessed ? 2.2 : 0.7}
                    />
                  </mesh>
                </group>
              ))}
              <VoxelSmokeParticles active={isBlessed} />
            </group>
          )}
        </InteractiveVoxelItem>
      )}

      {/* 3. VOXEL STEPPED LUCKY MANGO */}
      {ownedSet.has('LUCKY_MANGO') && (
        <InteractiveVoxelItem
          meta={ITEMS_LAYOUT[2]}
          statusNote={getStatus('LUCKY_MANGO')}
          onClick={() => onUseItem('LUCKY_MANGO')}
        >
          {(hovered) => (
            <group>
              <mesh geometry={saucer} castShadow receiveShadow position={[0, 0.05, 0]}>
                <meshStandardMaterial color="#ece3d2" roughness={0.6} />
              </mesh>
              {(me?.itemsState.luckyMangoUsesLeft ?? 2) > 0 && (
                <group position={[0, 0.15, 0]} rotation={[0, 0.45, 0]}>
                  <mesh castShadow position={[0, 0, 0]}>
                    <boxGeometry args={[0.24, 0.18, 0.22]} />
                    <meshStandardMaterial
                      color={SCENE_TOKENS.items.mangoSkin}
                      emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                      emissiveIntensity={hovered ? 0.25 : 0}
                      roughness={0.6}
                    />
                  </mesh>
                  <mesh position={[-0.17, -0.02, 0]}>
                    <boxGeometry args={[0.1, 0.14, 0.16]} />
                    <meshStandardMaterial color={SCENE_TOKENS.items.mangoBlush} roughness={0.6} />
                  </mesh>
                  <mesh position={[0.17, 0.02, 0]}>
                    <boxGeometry args={[0.1, 0.14, 0.16]} />
                    <meshStandardMaterial color="#facc15" roughness={0.6} />
                  </mesh>
                  <mesh position={[0.25, 0.05, 0]}>
                    <boxGeometry args={[0.06, 0.04, 0.04]} />
                    <meshStandardMaterial color="#5c3a1e" />
                  </mesh>
                  <mesh position={[0.2, 0.12, 0.06]}>
                    <boxGeometry args={[0.12, 0.03, 0.08]} />
                    <meshStandardMaterial color={SCENE_TOKENS.items.mangoLeaf} />
                  </mesh>
                </group>
              )}
            </group>
          )}
        </InteractiveVoxelItem>
      )}

      {/* 4. VOXEL TRÀ ĐÁ GLASS */}
      {ownedSet.has('ICED_TEA') && (
        <InteractiveVoxelItem
          meta={ITEMS_LAYOUT[3]}
          statusNote={getStatus('ICED_TEA')}
          onClick={() => onUseItem('ICED_TEA')}
        >
          {(hovered) => (
            <group>
              <mesh castShadow position={[0, 0.23, 0]}>
                <boxGeometry args={[0.34, 0.46, 0.34]} />
                <meshStandardMaterial
                  color={SCENE_TOKENS.items.teaGlass}
                  transparent
                  opacity={0.42}
                  roughness={0.25}
                />
              </mesh>
              <mesh position={[0, 0.19, 0]}>
                <boxGeometry args={[0.27, 0.32, 0.27]} />
                <meshStandardMaterial
                  color={SCENE_TOKENS.items.teaLiquid}
                  emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                  emissiveIntensity={hovered ? 0.25 : 0}
                  transparent
                  opacity={0.86}
                  roughness={0.35}
                />
              </mesh>
              {[
                [-0.06, 0.38, 0.05],
                [0.06, 0.37, -0.05],
              ].map(([ix, iy, iz], idx) => (
                <mesh key={idx} position={[ix, iy, iz]} rotation={[0.2, 0.4 * idx, 0.1]}>
                  <boxGeometry args={[0.09, 0.09, 0.09]} />
                  <meshStandardMaterial color={SCENE_TOKENS.items.teaIce} transparent opacity={0.85} />
                </mesh>
              ))}
              <mesh position={[0.21, 0.45, 0.14]}>
                <boxGeometry args={[0.1, 0.1, 0.04]} />
                <meshStandardMaterial color="#84cc16" />
              </mesh>
            </group>
          )}
        </InteractiveVoxelItem>
      )}

      {/* 5. VOXEL HOLLOW SQUARE-HOLE ANCIENT COIN */}
      {ownedSet.has('LUCKY_COIN') && (
        <InteractiveVoxelItem
          meta={ITEMS_LAYOUT[4]}
          statusNote={getStatus('LUCKY_COIN')}
          onClick={() => onUseItem('LUCKY_COIN')}
        >
          {(hovered) => {
            const ready = lockedItem !== 'LUCKY_COIN';
            const emissiveInt = hovered ? 0.5 : ready ? 0.2 : 0;
            return (
              <group position={[0, 0.03, 0]}>
                {[
                  [0, 0, -0.14, 0.38, 0.06, 0.1],
                  [0, 0, 0.14, 0.38, 0.06, 0.1],
                  [-0.14, 0, 0, 0.1, 0.06, 0.18],
                  [0.14, 0, 0, 0.1, 0.06, 0.18],
                ].map(([x, y, z, w, h, d], idx) => (
                  <mesh key={idx} position={[x, y, z]} castShadow>
                    <boxGeometry args={[w, h, d]} />
                    <meshStandardMaterial
                      color={SCENE_TOKENS.items.coinGold}
                      emissive={ready ? SCENE_TOKENS.items.coinGold : '#000000'}
                      emissiveIntensity={emissiveInt}
                      metalness={0.65}
                      roughness={0.35}
                    />
                  </mesh>
                ))}
                <mesh position={[0.26, 0, 0.14]}>
                  <boxGeometry args={[0.14, 0.04, 0.06]} />
                  <meshStandardMaterial color={SCENE_TOKENS.items.coinThread} />
                </mesh>
              </group>
            );
          }}
        </InteractiveVoxelItem>
      )}
    </group>
  );
});
