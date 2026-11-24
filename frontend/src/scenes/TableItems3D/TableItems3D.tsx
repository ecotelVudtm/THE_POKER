import { memo, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ItemType, PlayerItemsState, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { getCeramicBowlTexture, getPhoneScreenTexture } from '../ProceduralTextures';

export interface TableItems3DProps {
  me: PublicPlayerView | null;
  onUseItem: (item: ItemType) => void;
  onDiscardItem: (item: ItemType) => void;
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
    desc: 'Vay nóng 2K / 5K / 10K Chip • Khoản vay lưu vĩnh viễn (+15%/ván)',
    position: [-4.35, 0.07, 2.75],
  },
  {
    type: 'INCENSE_BOWL',
    title: 'Bát Hương Mini',
    desc: 'Tăng vận may Tráo Bài (1–5 nén • 100 Vía/nén • 4 lượt không thắp tự cháy hết)',
    position: [-3.35, 0.07, 1.85],
  },
  {
    type: 'LUCKY_MANGO',
    title: 'Quả Xoài May Mắn',
    desc: 'Bị động • 2 lần/trận — Tự động đỡ hộ mỗi khi bị Lộ Tẩy',
    position: [2.85, 0.07, 1.95],
  },
  {
    type: 'ICED_TEA',
    title: 'Ly Trà Đá',
    desc: '3 ngụm/trận (1 lần/vòng) • +20s thời gian lượt (tự vỡ cứu +30s khi cạn giờ)',
    position: [3.95, 0.07, 1.75],
  },
  {
    type: 'LUCKY_COIN',
    title: 'Đồng Xu Hộ Mệnh',
    desc: 'Bị động • Hoàn 15% cược khi thua All-in < 25%',
    position: [4.85, 0.07, 1.15],
  },
  {
    type: 'INSTANT_NOODLES',
    title: 'Bát Mì Tôm Trứng',
    desc: 'Bị động • Nâng Max Vía lên 120! Mỗi lần thắng ăn 1 miếng (3 lần ăn sẽ hết)',
    position: [-4.45, 0.07, 1.35],
  },
];

// Natural 3D radial cluster for up to 5 incense sticks (NOT a flat horizontal row!)
const INCENSE_CLUSTER_OFFSETS: [number, number, number, number][] = [
  [0, 0, 0, 0], // stick 1: center upright
  [-0.07, 0.06, 0.1, 0.12], // stick 2: front-left
  [0.07, 0.06, 0.1, -0.12], // stick 3: front-right
  [-0.06, -0.07, -0.1, 0.12], // stick 4: back-left
  [0.06, -0.07, -0.1, -0.12], // stick 5: back-right
];

const INCENSE_VIA_COST = 100;

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
  incenseDish: THREE.ExtrudeGeometry;
  saucer: THREE.ExtrudeGeometry;
} | null = null;

function getItemGeometries() {
  if (!cachedItemGeos) {
    cachedItemGeos = {
      bowlBelly: createSteppedDiscGeo(0.24, 0.07, 0.16),
      incenseDish: createSteppedDiscGeo(0.28, 0.08, 0.08),
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
  selected: boolean;
  isPassive: boolean;
  onToggleSelect: () => void;
  onUse: () => void;
  onDiscard: () => void;
  onClose: () => void;
  children: (hovered: boolean) => React.ReactNode;
}

function InteractiveVoxelItem({
  meta,
  statusNote,
  selected,
  isPassive,
  onToggleSelect,
  onUse,
  onDiscard,
  onClose,
  children,
}: InteractiveVoxelItemProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = meta.position[1] + (hovered || selected ? 0.14 : 0);
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
      scale={[1.18, 1.18, 1.18]}
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
        onToggleSelect();
      }}
    >
      {/* Generous invisible 3D collider hitbox so hovering/clicking ANY part of the item feels snappy and accurate */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.84, 0.68, 0.84]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {children(hovered || selected)}

      {/* Non-overlapping square selection frame */}
      {(hovered || selected) && (
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

      {/* Hover Tooltip (when not clicked open) */}
      {hovered && !selected && (
        <Html position={[0, 0.96, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
          <div className="voxel-panel w-52 px-3 py-2 text-left">
            <div className="text-xs font-extrabold text-accent-gold">{meta.title}</div>
            <div className="mt-0.5 text-[11px] text-content-secondary">{meta.desc}</div>
            <div className="mt-1 font-mono text-[10px] font-bold text-accent-jade">{statusNote}</div>
            <div className="mt-1 font-mono text-[9px] text-content-muted">
              Bấm để Sử dụng hoặc Ném thùng rác
            </div>
          </div>
        </Html>
      )}

      {/* Click Action Popover: Use or Throw into Trash Bin */}
      {selected && (
        <Html position={[0, 1.12, 0]} center distanceFactor={10.5} style={{ pointerEvents: 'auto' }}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="voxel-panel-gold w-52 px-3 py-2.5 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-extrabold text-accent-gold">
                {meta.title}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[10px] font-bold text-content-muted hover:text-content-primary"
              >
                [X]
              </button>
            </div>
            <div className="mt-1 font-mono text-[10px] text-content-secondary">{statusNote}</div>

            <div className="mt-2.5 flex flex-col gap-1.5">
              {!isPassive ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUse();
                  }}
                  className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-1.5 font-mono text-[11px] font-extrabold text-content-inverse"
                >
                  SỬ DỤNG
                </button>
              ) : (
                <div className="border border-border-subtle bg-surface-panel py-1 text-center font-mono text-[10px] font-bold text-content-muted">
                  TỰ ĐỘNG KÍCH HOẠT
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDiscard();
                }}
                className="voxel-btn w-full border-2 border-status-danger bg-status-danger/20 py-1.5 font-mono text-[11px] font-extrabold text-status-danger hover:bg-status-danger hover:text-content-primary"
              >
                NÉM VÀO THÙNG RÁC
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export const TableItems3D = memo(function TableItems3D({
  me,
  onUseItem,
  onDiscardItem,
}: TableItems3DProps) {
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const { bowlBelly, incenseDish, saucer } = useMemo(() => getItemGeometries(), []);
  const bowlTex = useMemo(() => getCeramicBowlTexture(), []);

  const incenseSticks = me?.itemsState.incenseSticks ?? 0;
  const icedTeaSipsLeft = me?.itemsState.icedTeaSipsLeft ?? 0;
  const noodleBitesLeft = me?.itemsState.noodleBitesLeft ?? 3;
  const lockedItem = me?.itemsState.lockedItem ?? null;
  const lockedHands = me?.itemsState.lockedItemHandsLeft ?? 0;

  const getStatus = (type: ItemType): string => {
    if (!me) return 'Sẵn sàng khi vào ván';
    if (lockedItem === type && lockedHands > 0) return `BỊ KHÓA (${lockedHands} ván)`;
    switch (type) {
      case 'PHONE':
        return me.activeLoan
          ? `Đang nợ ${me.activeLoan.currentOwed.toLocaleString()} — Bấm vay/trả`
          : 'Bấm để mở App Vay Nhanh';
      case 'INCENSE_BOWL': {
        if (incenseSticks >= 5) return 'Đang cháy tối đa 5/5 nén!';
        const leftBeforeBurnout = Math.max(0, 4 - (me.itemsState.incenseHandsIdle ?? 0));
        return `Đang cháy ${incenseSticks}/5 nén (còn ${leftBeforeBurnout} lượt) · Thắp thêm (${INCENSE_VIA_COST} Vía)`;
      }
      case 'LUCKY_MANGO':
        return me.itemsState.luckyMangoUsesLeft > 0
          ? `Bị động · Còn ${me.itemsState.luckyMangoUsesLeft}/2 lần đỡ Lộ Tẩy`
          : 'Đã dùng hết';
      case 'ICED_TEA':
        if (icedTeaSipsLeft <= 0) return 'Đã uống cạn (0/3 ngụm)';
        if (me.itemsState.icedTeaUsedThisRound) return `Còn ${icedTeaSipsLeft}/3 ngụm (đã uống vòng này)`;
        return `Còn ${icedTeaSipsLeft}/3 ngụm — Bấm uống (+20s)`;
      case 'LUCKY_COIN':
        return 'Tự động bảo hộ';
      case 'INSTANT_NOODLES':
        return noodleBitesLeft > 0
          ? `Còn ${noodleBitesLeft}/3 miếng · Max Vía = 120`
          : 'Đã ăn hết';
    }
  };

  const ownedSet = useMemo(
    () => new Set((me?.ownedItems ?? []).filter((it) => it !== 'PHONE').slice(0, 3)),
    [me?.ownedItems]
  );

  if (!me || ownedSet.size === 0) {
    return null;
  }

  const itemProps = (type: ItemType, layoutIdx: number) => ({
    meta: ITEMS_LAYOUT[layoutIdx],
    statusNote: getStatus(type),
    selected: selectedItem === type,
    isPassive: type === 'LUCKY_COIN' || type === 'INSTANT_NOODLES' || type === 'LUCKY_MANGO',
    onToggleSelect: () => setSelectedItem((prev) => (prev === type ? null : type)),
    onUse: () => onUseItem(type),
    onDiscard: () => onDiscardItem(type),
    onClose: () => setSelectedItem(null),
  });

  return (
    <group>
      {/* 2. VOXEL SHALLOW DISH-STYLE BÁT HƯƠNG MINI */}
      {ownedSet.has('INCENSE_BOWL') && (
        <InteractiveVoxelItem {...itemProps('INCENSE_BOWL', 1)}>
          {(hovered) => (
            <group>
                {/* Low ceramic foot */}
                <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
                  <boxGeometry args={[0.32, 0.03, 0.32]} />
                  <meshStandardMaterial map={bowlTex} roughness={0.6} />
                </mesh>
                  {/* Wide shallow ceramic dish */}
                  <mesh geometry={incenseDish} castShadow receiveShadow position={[0, 0.11, 0]}>
                    <meshStandardMaterial
                      map={bowlTex}
                      emissive={hovered || incenseSticks > 0 ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                      emissiveIntensity={incenseSticks > 0 ? 0.14 + incenseSticks * 0.04 : hovered ? 0.16 : 0}
                      roughness={0.55}
                    />
                  </mesh>
                    {/* Ash bed sitting cleanly inside the shallow dish */}
                    <mesh position={[0, 0.125, 0]}>
                      <boxGeometry args={[0.42, 0.03, 0.42]} />
                      <meshStandardMaterial color="#b5a898" roughness={0.9} />
                    </mesh>
                    {/* 0..5 incense sticks clustered naturally in 3D (NOT a flat row!) */}
                    {INCENSE_CLUSTER_OFFSETS.slice(0, incenseSticks).map(([sx, sz, rx, rz], idx) => (
                        <group key={idx} position={[sx, 0.28, sz]} rotation={[rx, 0, rz]}>
                          <mesh>
                            <boxGeometry args={[0.025, 0.28, 0.025]} />
                            <meshStandardMaterial color={SCENE_TOKENS.items.incenseStick} />
                          </mesh>
                          <mesh position={[0, 0.155, 0]}>
                            <boxGeometry args={[0.036, 0.036, 0.036]} />
                            <meshStandardMaterial
                              color={SCENE_TOKENS.items.incenseEmber}
                              emissive={SCENE_TOKENS.items.incenseEmber}
                              emissiveIntensity={1.6 + incenseSticks * 0.25}
                            />
                          </mesh>
                        </group>
              ))}
                        <VoxelSmokeParticles active={incenseSticks > 0} />
                      </group>
                    )}
                  </InteractiveVoxelItem>
      )}

                  {/* 3. VOXEL STEPPED LUCKY MANGO */}
                  {ownedSet.has('LUCKY_MANGO') && (
                    <InteractiveVoxelItem {...itemProps('LUCKY_MANGO', 2)}>
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
                    <InteractiveVoxelItem {...itemProps('ICED_TEA', 3)}>
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
                          {icedTeaSipsLeft > 0 && (
                            <mesh position={[0, 0.05 + (icedTeaSipsLeft / 3) * 0.16, 0]}>
                              <boxGeometry args={[0.27, (icedTeaSipsLeft / 3) * 0.32, 0.27]} />
                              <meshStandardMaterial
                                color={SCENE_TOKENS.items.teaLiquid}
                                emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                                emissiveIntensity={hovered ? 0.25 : 0}
                                transparent
                                opacity={0.86}
                                roughness={0.35}
                              />
                            </mesh>
                          )}
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
                          {/* Crisp angled voxel drinking straw */}
                          <mesh position={[-0.08, 0.44, -0.04]} rotation={[0.18, 0, 0.22]}>
                            <boxGeometry args={[0.04, 0.36, 0.04]} />
                            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
                          </mesh>
                        </group>
                      )}
                    </InteractiveVoxelItem>
                  )}

                  {/* 5. VOXEL HOLLOW SQUARE-HOLE ANCIENT COIN */}
                  {ownedSet.has('LUCKY_COIN') && (
                    <InteractiveVoxelItem {...itemProps('LUCKY_COIN', 4)}>
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

                  {/* 6. VOXEL BÁT MÌ TÔM (shrinks visually from 3/3 -> 2/3 -> 1/3 as player eats on each win!) */}
                  {ownedSet.has('INSTANT_NOODLES') && noodleBitesLeft > 0 && (
                    <InteractiveVoxelItem {...itemProps('INSTANT_NOODLES', 5)}>
                      {(hovered) => {
                        const fillRatio = noodleBitesLeft / 3;
                        const noodleH = 0.04 + fillRatio * 0.1;
                        const noodleY = 0.11 + noodleH * 0.5;
                        return (
                          <group>
                            {/* Ceramic bowl base */}
                            <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
                              <boxGeometry args={[0.32, 0.08, 0.32]} />
                              <meshStandardMaterial color="#f5f0e6" roughness={0.55} />
                            </mesh>
                            {/* Stepped crimson-trimmed ramen bowl */}
                            <mesh geometry={bowlBelly} castShadow receiveShadow position={[0, 0.24, 0]}>
                              <meshStandardMaterial
                                color="#b91c1c"
                                emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                                emissiveIntensity={hovered ? 0.22 : 0}
                                roughness={0.5}
                              />
                            </mesh>
                            {/* Golden noodle block (visibly lowers with each bite!) */}
                            <mesh position={[0, noodleY, 0]}>
                              <boxGeometry args={[0.36, noodleH, 0.36]} />
                              <meshStandardMaterial color="#facc15" roughness={0.65} />
                            </mesh>
                            {/* Egg & scallion toppings (visible while >= 2 bites left) */}
                            {noodleBitesLeft >= 2 && (
                              <>
                                <mesh position={[-0.06, noodleY + noodleH * 0.5 + 0.015, 0.04]}>
                                  <boxGeometry args={[0.13, 0.03, 0.13]} />
                                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                                </mesh>
                                <mesh position={[-0.06, noodleY + noodleH * 0.5 + 0.035, 0.04]}>
                                  <boxGeometry args={[0.07, 0.03, 0.07]} />
                                  <meshStandardMaterial color="#f97316" roughness={0.35} />
                                </mesh>
                                <mesh position={[0.09, noodleY + noodleH * 0.5 + 0.015, -0.06]}>
                                  <boxGeometry args={[0.06, 0.025, 0.06]} />
                                  <meshStandardMaterial color="#22c55e" roughness={0.6} />
                                </mesh>
                              </>
                            )}
                            {/* Resting bamboo chopsticks across bowl rim */}
                            <mesh position={[0.02, 0.275, -0.05]} rotation={[0, 0.35, 0]}>
                              <boxGeometry args={[0.62, 0.025, 0.025]} />
                              <meshStandardMaterial color="#d97706" roughness={0.7} />
                            </mesh>
                            <mesh position={[0.02, 0.275, 0.03]} rotation={[0, 0.22, 0]}>
                              <boxGeometry args={[0.62, 0.025, 0.025]} />
                              <meshStandardMaterial color="#d97706" roughness={0.7} />
                            </mesh>
                            <VoxelSmokeParticles active={true} />
                          </group>
                        );
                      }}
                    </InteractiveVoxelItem>
                  )}
                </group>
                );
});

export interface OpponentItemMesh3DProps {
  type: ItemType;
  itemsState: PlayerItemsState;
  hasDebt: boolean;
  position: [number, number, number];
}

/**
 * Lightweight 3D Voxel Item mesh rendered directly on the felt in front of opponents
 * so every player can visibly see what items opponents have placed on the table!
 */
export const OpponentItemMesh3D = memo(function OpponentItemMesh3D({
  type,
  itemsState,
  hasDebt,
  position,
}: OpponentItemMesh3DProps) {
  const { bowlBelly, incenseDish, saucer } = useMemo(() => getItemGeometries(), []);
  const bowlTex = useMemo(() => getCeramicBowlTexture(), []);
  const phoneScreenTex = useMemo(() => getPhoneScreenTexture(hasDebt), [hasDebt]);

  const incenseSticks = itemsState.incenseSticks ?? 0;
  const icedTeaSipsLeft = itemsState.icedTeaSipsLeft ?? 0;
  const noodleBitesLeft = itemsState.noodleBitesLeft ?? 3;

  if (type === 'INSTANT_NOODLES' && noodleBitesLeft <= 0) return null;

  return (
    <group position={position} scale={[0.88, 0.88, 0.88]}>
      {type === 'PHONE' && (
        <group rotation={[0, 0.25, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
            <boxGeometry args={[0.38, 0.06, 0.66]} />
            <meshStandardMaterial color={SCENE_TOKENS.items.phoneBody} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.064, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.32, 0.58]} />
            <meshStandardMaterial
              map={phoneScreenTex}
              emissive={hasDebt ? SCENE_TOKENS.items.phoneScreenDebt : SCENE_TOKENS.items.phoneScreenIdle}
              emissiveMap={phoneScreenTex}
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      )}

      {type === 'INCENSE_BOWL' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
            <boxGeometry args={[0.32, 0.03, 0.32]} />
            <meshStandardMaterial map={bowlTex} roughness={0.6} />
          </mesh>
          <mesh geometry={incenseDish} castShadow receiveShadow position={[0, 0.11, 0]}>
            <meshStandardMaterial map={bowlTex} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.125, 0]}>
            <boxGeometry args={[0.42, 0.03, 0.42]} />
            <meshStandardMaterial color="#b5a898" roughness={0.9} />
          </mesh>
          {INCENSE_CLUSTER_OFFSETS.slice(0, incenseSticks).map(([sx, sz, rx, rz], idx) => (
            <group key={idx} position={[sx, 0.28, sz]} rotation={[rx, 0, rz]}>
              <mesh>
                <boxGeometry args={[0.025, 0.28, 0.025]} />
                <meshStandardMaterial color={SCENE_TOKENS.items.incenseStick} />
              </mesh>
              <mesh position={[0, 0.155, 0]}>
                <boxGeometry args={[0.036, 0.036, 0.036]} />
                <meshStandardMaterial
                  color={SCENE_TOKENS.items.incenseEmber}
                  emissive={SCENE_TOKENS.items.incenseEmber}
                  emissiveIntensity={1.6}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {type === 'LUCKY_MANGO' && (
        <group>
          <mesh geometry={saucer} castShadow receiveShadow position={[0, 0.05, 0]}>
            <meshStandardMaterial color="#ece3d2" roughness={0.6} />
          </mesh>
          {(itemsState.luckyMangoUsesLeft ?? 2) > 0 && (
            <group position={[0, 0.15, 0]} rotation={[0, 0.45, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.24, 0.18, 0.22]} />
                <meshStandardMaterial color={SCENE_TOKENS.items.mangoSkin} roughness={0.6} />
              </mesh>
              <mesh position={[-0.17, -0.02, 0]}>
                <boxGeometry args={[0.1, 0.14, 0.16]} />
                <meshStandardMaterial color={SCENE_TOKENS.items.mangoBlush} roughness={0.6} />
              </mesh>
              <mesh position={[0.17, 0.02, 0]}>
                <boxGeometry args={[0.1, 0.14, 0.16]} />
                <meshStandardMaterial color="#facc15" roughness={0.6} />
              </mesh>
              <mesh position={[0.2, 0.12, 0.06]}>
                <boxGeometry args={[0.12, 0.03, 0.08]} />
                <meshStandardMaterial color={SCENE_TOKENS.items.mangoLeaf} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {type === 'ICED_TEA' && (
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
          {icedTeaSipsLeft > 0 && (
            <mesh position={[0, 0.05 + (icedTeaSipsLeft / 3) * 0.16, 0]}>
              <boxGeometry args={[0.27, (icedTeaSipsLeft / 3) * 0.32, 0.27]} />
              <meshStandardMaterial
                color={SCENE_TOKENS.items.teaLiquid}
                transparent
                opacity={0.86}
                roughness={0.35}
              />
            </mesh>
          )}
          <mesh position={[-0.08, 0.44, -0.04]} rotation={[0.18, 0, 0.22]}>
            <boxGeometry args={[0.04, 0.36, 0.04]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
        </group>
      )}

      {type === 'LUCKY_COIN' && (
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
                metalness={0.65}
                roughness={0.35}
              />
            </mesh>
          ))}
        </group>
      )}

      {type === 'INSTANT_NOODLES' && (() => {
        const fillRatio = noodleBitesLeft / 3;
        const noodleH = 0.04 + fillRatio * 0.1;
        const noodleY = 0.11 + noodleH * 0.5;
        return (
          <group>
            <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
              <boxGeometry args={[0.32, 0.08, 0.32]} />
              <meshStandardMaterial color="#f5f0e6" roughness={0.55} />
            </mesh>
            <mesh geometry={bowlBelly} castShadow receiveShadow position={[0, 0.24, 0]}>
              <meshStandardMaterial color="#b91c1c" roughness={0.5} />
            </mesh>
            <mesh position={[0, noodleY, 0]}>
              <boxGeometry args={[0.36, noodleH, 0.36]} />
              <meshStandardMaterial color="#facc15" roughness={0.65} />
            </mesh>
            <mesh position={[0.02, 0.275, -0.05]} rotation={[0, 0.35, 0]}>
              <boxGeometry args={[0.62, 0.025, 0.025]} />
              <meshStandardMaterial color="#d97706" roughness={0.7} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
});
