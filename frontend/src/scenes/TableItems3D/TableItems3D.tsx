import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ItemType, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';

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
    title: 'Chiếc Điện Thoại',
    desc: 'Vay nóng Chip (2000/5000) hoặc mua +60s thời gian. Lãi 15%/ván.',
    position: [-3.55, 0.08, 2.35],
  },
  {
    type: 'INCENSE_BOWL',
    title: 'Bát Hương Mini',
    desc: '20 Vía • Hồi 2 ván. Nới rộng vùng Mini-game +20% & tăng nhẹ vận may.',
    position: [-2.45, 0.08, 2.7],
  },
  {
    type: 'LUCKY_MANGO',
    title: 'Quả Xoài May Mắn',
    desc: '2 lần/trận. Xóa debuff & tạo Khiên chặn 1 lần bị Lộ Tẩy.',
    position: [2.45, 0.08, 2.7],
  },
  {
    type: 'ICED_TEA',
    title: 'Ly Trà Đá',
    desc: 'Hồi 2 ván. Cộng +20s quỹ thời gian & làm chậm Mini-game 15%.',
    position: [3.45, 0.08, 2.42],
  },
  {
    type: 'LUCKY_COIN',
    title: 'Đồng Xu Hộ Mệnh (Bị động)',
    desc: 'Tự hoàn 15% chip cược khi thua All-in với tỉ lệ thắng ban đầu < 25%.',
    position: [4.25, 0.08, 1.95],
  },
];

function IncenseSmokeParticles({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !active) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, idx) => {
      const cycle = (t * 0.65 + idx * 0.27) % 1;
      child.position.y = 0.42 + cycle * 1.15;
      child.position.x = Math.sin(t * 2 + idx * 1.4) * 0.09 * cycle;
      child.position.z = Math.cos(t * 1.7 + idx) * 0.06 * cycle;
      const s = 0.4 + cycle * 0.9;
      child.scale.set(s, s, s);
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - cycle) * 0.55;
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial
            color={SCENE_TOKENS.items.incenseSmoke}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface InteractiveItemWrapperProps {
  meta: ItemMeta;
  statusNote: string;
  isLocked: boolean;
  isDisabled: boolean;
  onClick: () => void;
  children: (hovered: boolean) => React.ReactNode;
}

function InteractiveItemWrapper({
  meta,
  statusNote,
  isLocked,
  isDisabled,
  onClick,
  children,
}: InteractiveItemWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = meta.position[1] + (hovered ? 0.14 : 0);
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      Math.min(1, delta * 10)
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

      {/* Hover glow ring under item */}
      {hovered && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.42, 24]} />
          <meshBasicMaterial
            color={SCENE_TOKENS.items.hoverEmissive}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Vietnamese Tooltip */}
      {hovered && (
        <Html position={[0, 0.95, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
          <div className="w-56 rounded-xl border border-border-gold/60 bg-surface-panel/95 p-2.5 text-left shadow-warm backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-accent-gold">{meta.title}</span>
              {isLocked && (
                <span className="rounded bg-status-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-danger">
                  BỊ KHÓA
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-content-secondary">{meta.desc}</p>
            <div
              className={`mt-1.5 text-[10px] font-semibold ${
                isLocked || isDisabled ? 'text-status-warning' : 'text-accent-jade'
              }`}
            >
              {statusNote}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function TableItems3D({ me, onUseItem }: TableItems3DProps) {
  const phoneScreenRef = useRef<THREE.MeshStandardMaterial>(null);

  const hasDebt = Boolean(me?.activeLoan);
  const hasDebtPressure = Boolean(me?.statusEffects.debtPressure);
  const isBlessed = Boolean(me?.statusEffects.blessed);
  const lockedItem = me?.itemsState.lockedItem ?? null;
  const lockedHands = me?.itemsState.lockedItemHandsLeft ?? 0;

  useFrame(({ clock }) => {
    if (!phoneScreenRef.current) return;
    if (hasDebt || hasDebtPressure) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 6);
      phoneScreenRef.current.emissiveIntensity = 0.5 + pulse * 0.9;
    } else {
      phoneScreenRef.current.emissiveIntensity = 0.45;
    }
  });

  const getStatusNote = (type: ItemType): { note: string; locked: boolean; disabled: boolean } => {
    if (!me) return { note: 'Vào trận để sử dụng', locked: false, disabled: true };
    if (lockedItem === type && lockedHands > 0) {
      return { note: `Bị chủ nợ khóa (${lockedHands} ván nữa)`, locked: true, disabled: true };
    }
    switch (type) {
      case 'PHONE':
        return {
          note: me.activeLoan
            ? `Đang nợ ${me.activeLoan.currentOwed.toLocaleString()} chip — Bấm để trả nợ`
            : 'Sẵn sàng — Bấm để mở máy vay nóng',
          locked: false,
          disabled: false,
        };
      case 'INCENSE_BOWL':
        if (me.itemsState.incenseCooldownHands > 0) {
          return {
            note: `Đang hồi (${me.itemsState.incenseCooldownHands} ván nữa)`,
            locked: false,
            disabled: true,
          };
        }
        return {
          note: me.via >= 20 ? 'Sẵn sàng (20 Vía) — Bấm để thắp hương' : 'Cần tối thiểu 20 Vía',
          locked: false,
          disabled: me.via < 20,
        };
      case 'LUCKY_MANGO':
        return {
          note:
            me.itemsState.luckyMangoUsesLeft > 0
              ? `Còn ${me.itemsState.luckyMangoUsesLeft}/2 quả — Bấm để ăn`
              : 'Đã dùng hết trong trận này',
          locked: false,
          disabled: me.itemsState.luckyMangoUsesLeft <= 0,
        };
      case 'ICED_TEA':
        return {
          note:
            me.itemsState.icedTeaCooldownHands > 0
              ? `Đang hồi (${me.itemsState.icedTeaCooldownHands} ván nữa)`
              : 'Sẵn sàng — Bấm để uống (+20s)',
          locked: false,
          disabled: me.itemsState.icedTeaCooldownHands > 0,
        };
      case 'LUCKY_COIN':
        return {
          note: 'Đang bảo hộ bị động (tự động kích hoạt)',
          locked: false,
          disabled: false,
        };
    }
  };

  return (
    <group>
      {/* 1. PHONE */}
      {(() => {
        const meta = ITEMS_LAYOUT[0];
        const status = getStatusNote('PHONE');
        return (
          <InteractiveItemWrapper
            meta={meta}
            statusNote={status.note}
            isLocked={status.locked}
            isDisabled={status.disabled}
            onClick={() => onUseItem('PHONE')}
          >
            {(hovered) => (
              <group rotation={[0, 0.35, 0]}>
                <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.36, 0.05, 0.64]} />
                  <meshStandardMaterial
                    color={SCENE_TOKENS.items.phoneBody}
                    roughness={0.35}
                    metalness={0.4}
                  />
                </mesh>
                <mesh position={[0, 0.068, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.3, 0.54]} />
                  <meshStandardMaterial
                    ref={phoneScreenRef}
                    color={
                      hasDebt || hasDebtPressure
                        ? SCENE_TOKENS.items.phoneScreenDebt
                        : SCENE_TOKENS.items.phoneScreenIdle
                    }
                    emissive={
                      hasDebt || hasDebtPressure
                        ? SCENE_TOKENS.items.phoneScreenDebt
                        : hovered
                          ? SCENE_TOKENS.items.hoverEmissive
                          : SCENE_TOKENS.items.phoneScreenIdle
                    }
                    emissiveIntensity={0.5}
                  />
                </mesh>
              </group>
            )}
          </InteractiveItemWrapper>
        );
      })()}

      {/* 2. INCENSE BOWL */}
      {(() => {
        const meta = ITEMS_LAYOUT[1];
        const status = getStatusNote('INCENSE_BOWL');
        return (
          <InteractiveItemWrapper
            meta={meta}
            statusNote={status.note}
            isLocked={status.locked}
            isDisabled={status.disabled}
            onClick={() => onUseItem('INCENSE_BOWL')}
          >
            {(hovered) => (
              <group>
                {/* Ceramic bowl */}
                <mesh castShadow receiveShadow position={[0, 0.14, 0]}>
                  <cylinderGeometry args={[0.26, 0.19, 0.26, 20]} />
                  <meshStandardMaterial
                    color={SCENE_TOKENS.items.ceramicBowl}
                    emissive={hovered || isBlessed ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                    emissiveIntensity={isBlessed ? 0.25 : hovered ? 0.2 : 0}
                    roughness={0.55}
                  />
                </mesh>
                <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.2, 0.26, 20]} />
                  <meshStandardMaterial color={SCENE_TOKENS.items.ceramicRim} />
                </mesh>
                {/* 3 cute short incense sticks */}
                {[-0.07, 0, 0.07].map((x, idx) => (
                  <group key={idx} position={[x, 0.34, 0]} rotation={[0, 0, x * -1.4]}>
                    <mesh castShadow>
                      <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
                      <meshStandardMaterial color={SCENE_TOKENS.items.incenseStick} />
                    </mesh>
                    <mesh position={[0, 0.145, 0]}>
                      <sphereGeometry args={[0.018, 8, 8]} />
                      <meshStandardMaterial
                        color={SCENE_TOKENS.items.incenseEmber}
                        emissive={SCENE_TOKENS.items.incenseEmber}
                        emissiveIntensity={isBlessed ? 1.8 : 0.6}
                      />
                    </mesh>
                  </group>
                ))}
                <IncenseSmokeParticles active={isBlessed} />
              </group>
            )}
          </InteractiveItemWrapper>
        );
      })()}

      {/* 3. LUCKY MANGO */}
      {(() => {
        const meta = ITEMS_LAYOUT[2];
        const status = getStatusNote('LUCKY_MANGO');
        const usesLeft = me?.itemsState.luckyMangoUsesLeft ?? 2;
        return (
          <InteractiveItemWrapper
            meta={meta}
            statusNote={status.note}
            isLocked={status.locked}
            isDisabled={status.disabled}
            onClick={() => onUseItem('LUCKY_MANGO')}
          >
            {(hovered) => (
              <group>
                {/* Small ceramic saucer */}
                <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
                  <cylinderGeometry args={[0.3, 0.22, 0.05, 20]} />
                  <meshStandardMaterial color={SCENE_TOKENS.items.ceramicBowl} roughness={0.4} />
                </mesh>
                {usesLeft > 0 && (
                  <group position={[0, 0.16, 0]} rotation={[0.2, 0.5, 0.4]}>
                    <mesh castShadow scale={[1.3, 0.9, 0.92]}>
                      <sphereGeometry args={[0.16, 18, 18]} />
                      <meshStandardMaterial
                        color={SCENE_TOKENS.items.mangoSkin}
                        emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                        emissiveIntensity={hovered ? 0.3 : 0}
                        roughness={0.35}
                      />
                    </mesh>
                    {/* Tiny green leaf */}
                    <mesh position={[0.18, 0.06, 0]} rotation={[0, 0, -0.5]}>
                      <boxGeometry args={[0.12, 0.02, 0.06]} />
                      <meshStandardMaterial color={SCENE_TOKENS.items.mangoLeaf} />
                    </mesh>
                  </group>
                )}
              </group>
            )}
          </InteractiveItemWrapper>
        );
      })()}

      {/* 4. ICED TEA */}
      {(() => {
        const meta = ITEMS_LAYOUT[3];
        const status = getStatusNote('ICED_TEA');
        return (
          <InteractiveItemWrapper
            meta={meta}
            statusNote={status.note}
            isLocked={status.locked}
            isDisabled={status.disabled}
            onClick={() => onUseItem('ICED_TEA')}
          >
            {(hovered) => (
              <group>
                {/* Glass cup */}
                <mesh castShadow receiveShadow position={[0, 0.24, 0]}>
                  <cylinderGeometry args={[0.2, 0.15, 0.46, 18]} />
                  <meshStandardMaterial
                    color={SCENE_TOKENS.items.teaGlass}
                    transparent
                    opacity={0.45}
                    roughness={0.12}
                    metalness={0.1}
                  />
                </mesh>
                {/* Amber tea liquid */}
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.175, 0.135, 0.34, 16]} />
                  <meshStandardMaterial
                    color={SCENE_TOKENS.items.teaLiquid}
                    emissive={hovered ? SCENE_TOKENS.items.hoverEmissive : '#000000'}
                    emissiveIntensity={hovered ? 0.25 : 0}
                    transparent
                    opacity={0.85}
                    roughness={0.2}
                  />
                </mesh>
                {/* Ice cubes */}
                {[
                  [-0.05, 0.37, 0.03],
                  [0.06, 0.36, -0.04],
                ].map(([ix, iy, iz], idx) => (
                  <mesh key={idx} position={[ix, iy, iz]} rotation={[0.4, 0.6, 0.2]}>
                    <boxGeometry args={[0.08, 0.08, 0.08]} />
                    <meshStandardMaterial
                      color={SCENE_TOKENS.items.teaIce}
                      transparent
                      opacity={0.78}
                      roughness={0.1}
                    />
                  </mesh>
                ))}
              </group>
            )}
          </InteractiveItemWrapper>
        );
      })()}

      {/* 5. LUCKY COIN */}
      {(() => {
        const meta = ITEMS_LAYOUT[4];
        const status = getStatusNote('LUCKY_COIN');
        const isReady = lockedItem !== 'LUCKY_COIN';
        return (
          <InteractiveItemWrapper
            meta={meta}
            statusNote={status.note}
            isLocked={status.locked}
            isDisabled={status.disabled}
            onClick={() => onUseItem('LUCKY_COIN')}
          >
            {(hovered) => (
              <group>
                {/* Ancient coin */}
                <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.21, 0.21, 0.04, 24]} />
                  <meshStandardMaterial
                    color={SCENE_TOKENS.items.coinGold}
                    emissive={isReady ? SCENE_TOKENS.items.coinGold : '#000000'}
                    emissiveIntensity={hovered ? 0.55 : isReady ? 0.22 : 0}
                    metalness={0.75}
                    roughness={0.25}
                  />
                </mesh>
                {/* Red lucky thread ring */}
                <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.23, 0.02, 8, 24]} />
                  <meshStandardMaterial color={SCENE_TOKENS.items.coinThread} roughness={0.6} />
                </mesh>
              </group>
            )}
          </InteractiveItemWrapper>
        );
      })()}
    </group>
  );
}
