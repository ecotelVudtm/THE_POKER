import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { FilteredRoomState, ItemType, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { getFeltTexture, getFloorTexture, getVnd500kTexture, getWoodTexture } from '../ProceduralTextures';
import { PlayingCard3D } from '../PlayingCard3D';
import { ChipStack3D } from '../ChipStack3D';
import { ChipEffects3D, SeatPositionMap } from '../ChipEffects3D';
import { TableItems3D } from '../TableItems3D';
import { OpponentSeat3D } from '../OpponentSeat3D';

export interface RendererStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  dpr: number;
}

export const liveRendererStats: RendererStats = {
  fps: 60,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  dpr: 1,
};

function PerformanceMonitor() {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastSample = useRef(performance.now());

  useFrame(() => {
    frameCount.current += 1;
    const now = performance.now();
    if (now - lastSample.current >= 500) {
      liveRendererStats.fps = Math.round(
        (frameCount.current * 1000) / (now - lastSample.current)
      );
      liveRendererStats.drawCalls = gl.info.render.calls;
      liveRendererStats.triangles = gl.info.render.triangles;
      liveRendererStats.geometries = gl.info.memory.geometries;
      liveRendererStats.dpr = gl.getPixelRatio();
      frameCount.current = 0;
      lastSample.current = now;
    }
  });

  return null;
}

/**
 * Builds a SINGLE unified stepped-zigzag voxel polygon extruded cleanly in Y.
 * Eliminates 100% of Z-fighting because there are zero overlapping coplanar boxes!
 */
function createSteppedVoxelShape(halfW: number, halfH: number, step: number): THREE.Shape {
  const s = new THREE.Shape();
  // Clockwise 90-degree zigzag stepped oval outline (2 steps per corner)
  const w0 = halfW - step * 2;
  const w1 = halfW - step;
  const w2 = halfW;
  const h0 = halfH - step * 2;
  const h1 = halfH - step;
  const h2 = halfH;

  s.moveTo(-w0, -h2);
  s.lineTo(w0, -h2);
  s.lineTo(w0, -h1);
  s.lineTo(w1, -h1);
  s.lineTo(w1, -h0);
  s.lineTo(w2, -h0);

  s.lineTo(w2, h0);
  s.lineTo(w1, h0);
  s.lineTo(w1, h1);
  s.lineTo(w0, h1);
  s.lineTo(w0, h2);

  s.lineTo(-w0, h2);
  s.lineTo(-w0, h1);
  s.lineTo(-w1, h1);
  s.lineTo(-w1, h0);
  s.lineTo(-w2, h0);

  s.lineTo(-w2, -h0);
  s.lineTo(-w1, -h0);
  s.lineTo(-w1, -h1);
  s.lineTo(-w0, -h1);
  s.closePath();
  return s;
}

function buildTableGeometries() {
  // 1. Larger, more spacious unified wood base apron
  const woodShape = createSteppedVoxelShape(6.2, 3.85, 0.85);
  const woodGeo = new THREE.ExtrudeGeometry(woodShape, {
    depth: 0.3,
    bevelEnabled: false,
  });
  woodGeo.rotateX(Math.PI / 2);

  // 2. Larger unified green felt play surface (normalized UVs, zero overlap!)
  const feltShape = createSteppedVoxelShape(5.85, 3.5, 0.8);
  const feltGeo = new THREE.ExtrudeGeometry(feltShape, {
    depth: 0.04,
    bevelEnabled: false,
  });
  feltGeo.rotateX(Math.PI / 2);
  const pos = feltGeo.attributes.position;
  const uv = feltGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, (x + 5.85) / 11.7, (z + 3.5) / 7.0);
  }
  uv.needsUpdate = true;

  // 3. Larger unified stepped-zigzag armrest rail with inner hole
  const outerRail = createSteppedVoxelShape(6.55, 4.18, 0.9);
  const innerHole = createSteppedVoxelShape(5.82, 3.46, 0.78);
  outerRail.holes.push(innerHole);
  const railGeo = new THREE.ExtrudeGeometry(outerRail, {
    depth: 0.3,
    bevelEnabled: false,
  });
  railGeo.rotateX(Math.PI / 2);

  return { woodGeo, feltGeo, railGeo };
}

let cachedTableGeos: ReturnType<typeof buildTableGeometries> | null = null;
function getTableGeometries() {
  if (!cachedTableGeos) cachedTableGeos = buildTableGeometries();
  return cachedTableGeos;
}

export interface PokerTableSceneProps {
  room: FilteredRoomState | null;
  me: PublicPlayerView | null;
  onUseItem: (item: ItemType) => void;
  onDiscardItem: (item: ItemType) => void;
  idleShowcase?: boolean;
  /** Pauses the WebGL render loop when covered by a full-screen overlay (e.g. Shop) */
  paused?: boolean;
}

const OPPONENT_SLOTS: {
  pos: [number, number, number];
  cardOffset: [number, number, number];
  chipBankOffset: [number, number, number];
  itemOffsets: [number, number, number][];
}[] = [
  {
    pos: [-5.75, 0, -0.35],
    cardOffset: [1.35, 0.04, 0.2],
    chipBankOffset: [1.35, 0.068, 1.35],
    itemOffsets: [
      [1.15, 0.07, -1.0],
      [1.95, 0.07, -1.0],
      [2.15, 0.07, 1.35],
    ],
  },
  {
    pos: [-3.0, 0, -3.95],
    cardOffset: [0.5, 0.04, 1.35],
    chipBankOffset: [-0.85, 0.068, 1.35],
    itemOffsets: [
      [-1.55, 0.07, 1.35],
      [-0.85, 0.07, 2.15],
      [0.0, 0.07, 2.2],
    ],
  },
  {
    pos: [0, 0, -4.35],
    cardOffset: [0, 0.04, 1.4],
    chipBankOffset: [1.35, 0.068, 1.35],
    itemOffsets: [
      [-1.2, 0.07, 1.4],
      [-1.95, 0.07, 1.4],
      [2.15, 0.07, 1.4],
    ],
  },
  {
    pos: [3.0, 0, -3.95],
    cardOffset: [-0.5, 0.04, 1.35],
    chipBankOffset: [0.85, 0.068, 1.35],
    itemOffsets: [
      [1.55, 0.07, 1.35],
      [0.85, 0.07, 2.15],
      [0.0, 0.07, 2.2],
    ],
  },
  {
    pos: [5.75, 0, -0.35],
    cardOffset: [-1.35, 0.04, 0.2],
    chipBankOffset: [-1.35, 0.068, 1.35],
    itemOffsets: [
      [-1.15, 0.07, -1.0],
      [-1.95, 0.07, -1.0],
      [-2.15, 0.07, 1.35],
    ],
  },
];

function CameraRig({ idleShowcase }: { idleShowcase?: boolean }) {
  const targetPos = useRef(new THREE.Vector3(0, 7.1, 8.35));
  useFrame(({ camera, clock }, delta) => {
    if (idleShowcase) {
      const t = clock.getElapsedTime() * 0.14;
      camera.position.set(Math.sin(t) * 2.1, 8.2, 9.6 + Math.cos(t) * 0.5);
      camera.lookAt(0, 0.1, 0.35);
    } else {
      // Closer, richer seated perspective so cards, avatars, chips & table items look large and crisp!
      targetPos.current.set(0, 7.1, 8.35);
      camera.position.lerp(targetPos.current, Math.min(1, delta * 5));
      camera.lookAt(0, 0.05, 0.5);
    }
  });
  return null;
}

const VoxelPokerTable = memo(function VoxelPokerTable() {
  const { woodGeo, feltGeo, railGeo } = useMemo(() => getTableGeometries(), []);
  const woodTex = useMemo(() => getWoodTexture(), []);
  const feltTex = useMemo(() => getFeltTexture(), []);
  const floorTex = useMemo(() => getFloorTexture(), []);

  return (
    <group>
      {/* Rich Parquet Voxel Hardwood Floor */}
      <mesh receiveShadow position={[0, -0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial map={floorTex} roughness={0.9} />
      </mesh>

      {/* Cozy Handcrafted Voxel Wooden Tavern Back-Wall & Wainscoting + Warm Lantern Sconces */}
      <group position={[0, 0, -9.2]}>
        {/* Lower oak wainscot panel */}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[28, 4.6, 0.4]} />
          <meshStandardMaterial map={woodTex} roughness={0.82} />
        </mesh>
        {/* Brass trim rail across wainscot */}
        <mesh position={[0, 3.78, 0.24]}>
          <boxGeometry args={[28, 0.14, 0.12]} />
          <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* 4 Vertical oak wall pillars */}
        {[-7.5, -2.5, 2.5, 7.5].map((px) => (
          <mesh key={px} position={[px, 2.2, 0.25]}>
            <boxGeometry args={[0.55, 6.4, 0.35]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.78} />
          </mesh>
        ))}
        {/* 2 Warm Glowing Voxel Wall Lantern Sconces */}
        {[-5.0, 5.0].map((lx) => (
          <group key={lx} position={[lx, 2.8, 0.48]}>
            <mesh position={[0, -0.35, -0.1]}>
              <boxGeometry args={[0.18, 0.45, 0.22]} />
              <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.42, 0.52, 0.42]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={1.4}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.54, 0.1, 0.54]} />
              <meshStandardMaterial color={SCENE_TOKENS.table.railLeather} roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Non-overlapping Blocky Pedestal Legs with Brass Foot Trim */}
      <mesh castShadow receiveShadow position={[-2.2, -0.56, 0]}>
        <boxGeometry args={[1.1, 0.56, 1.8]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.2, -0.56, 0]}>
        <boxGeometry args={[1.1, 0.56, 1.8]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>
      <mesh position={[-2.2, -0.8, 0]}>
        <boxGeometry args={[1.22, 0.08, 1.92]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[2.2, -0.8, 0]}>
        <boxGeometry args={[1.22, 0.08, 1.92]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Connecting crossbeam strictly between the 2 legs */}
      <mesh castShadow receiveShadow position={[0, -0.62, 0]}>
        <boxGeometry args={[3.3, 0.28, 0.84]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>

      {/* Unified Stepped-Zigzag Wood Base (y = -0.28..0.0) */}
      <mesh geometry={woodGeo} position={[0, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={woodTex} roughness={0.72} />
      </mesh>

      {/* Unified Stepped-Zigzag Green Felt (y = 0.02..0.06) */}
      <mesh geometry={feltGeo} position={[0, 0.06, 0]} receiveShadow>
        <meshStandardMaterial map={feltTex} roughness={0.92} />
      </mesh>

      {/* Unified Stepped-Zigzag Dark Leather Rail (y = 0.04..0.32) */}
      <mesh geometry={railGeo} position={[0, 0.32, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={SCENE_TOKENS.table.railLeather} roughness={0.68} />
      </mesh>

      {/* 4 Crafted Square Brass Cup Holders with recessed interior */}
      {[
        [-5.0, 0.35, 2.85],
        [5.0, 0.35, 2.85],
        [-5.0, 0.35, -2.85],
        [5.0, 0.35, -2.85],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x, y, z]}>
          <mesh>
            <boxGeometry args={[0.38, 0.06, 0.38]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.032, 0]}>
            <boxGeometry args={[0.24, 0.01, 0.24]} />
            <meshStandardMaterial color="#1a120d" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Brass Decorative Rail Rivets along front & back rail */}
      {[-3.4, -1.7, 0, 1.7, 3.4].map((rx) => (
        <group key={rx}>
          <mesh position={[rx, 0.335, 3.82]}>
            <boxGeometry args={[0.14, 0.03, 0.14]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[rx, 0.335, -3.82]}>
            <boxGeometry args={[0.14, 0.03, 0.14]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.75} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Handcrafted Wooden Card Shoe & Voxel Deck Stack (positioned cleanly clear of all seats & items) */}
      <group position={[-1.12, 0.06, -1.72]} rotation={[0, 0.14, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.035, 0]}>
          <boxGeometry args={[0.74, 0.07, 0.98]} />
          <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.08, -0.44]}>
          <boxGeometry args={[0.74, 0.15, 0.08]} />
          <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Cream card edges stacked inside shoe */}
        <mesh castShadow receiveShadow position={[0, 0.125, 0.02]}>
          <boxGeometry args={[0.62, 0.13, 0.84]} />
          <meshStandardMaterial color={SCENE_TOKENS.cards.paperEdge} roughness={0.65} />
        </mesh>
        {/* Top crimson card back + gold emblem so it clearly reads as the Deck */}
        <mesh position={[0, 0.194, 0.02]}>
          <boxGeometry args={[0.56, 0.012, 0.78]} />
          <meshStandardMaterial color={SCENE_TOKENS.cards.backBase} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.203, 0.02]}>
          <boxGeometry args={[0.22, 0.008, 0.22]} />
          <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
});

function ArenaBillsStack3D({ count, position }: { count: number; position: [number, number, number] }) {
  const billTex = useMemo(() => getVnd500kTexture(), []);
  const visible = Math.min(12, count);
  if (visible <= 0) return null;

  return (
    <group position={position}>
      {Array.from({ length: visible }).map((_, i) => (
        <mesh
          key={i}
          castShadow
          position={[0, 0.012 + i * 0.018, 0]}
          rotation={[0, (i % 3 - 1) * 0.05, 0]}
        >
          <boxGeometry args={[0.92, 0.014, 0.44]} />
          <meshStandardMaterial map={billTex} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

export function PokerTableScene({
  room,
  me,
  onUseItem,
  onDiscardItem,
  idleShowcase = false,
  paused = false,
}: PokerTableSceneProps) {
  const opponents = useMemo(() => {
    if (!room) return [];
    const others = room.players.filter((p) => p.accountId !== me?.accountId);
    if (others.length === 1) return [{ player: others[0], slot: OPPONENT_SLOTS[2] }];
    if (others.length === 2) {
      return [
        { player: others[0], slot: OPPONENT_SLOTS[1] },
        { player: others[1], slot: OPPONENT_SLOTS[3] },
      ];
    }
    if (others.length === 3) {
      return [
        { player: others[0], slot: OPPONENT_SLOTS[0] },
        { player: others[1], slot: OPPONENT_SLOTS[2] },
        { player: others[2], slot: OPPONENT_SLOTS[4] },
      ];
    }
    return others.slice(0, 5).map((player, idx) => ({
      player,
      slot: OPPONENT_SLOTS[idx],
    }));
  }, [me?.accountId, room]);

  // Map every player's seat origin & front bet spot for flying chip trajectories
  const seatMap = useMemo<SeatPositionMap>(() => {
    const map: SeatPositionMap = {};
    if (me) {
      map[me.accountId] = {
        origin: [0, 0.35, 3.8],
        betSpot: [0, 0.068, 1.95],
      };
    }
    for (const { player, slot } of opponents) {
      map[player.accountId] = {
        origin: [slot.pos[0], 0.35, slot.pos[2]],
        betSpot: [
          slot.pos[0] + slot.cardOffset[0] * 1.9,
          0.068,
          slot.pos[2] + slot.cardOffset[2] * 1.9,
        ],
      };
    }
    return map;
  }, [me, opponents]);

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        frameloop={paused ? 'never' : 'always'}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [0, 7.5, 8.85], fov: 42, near: 0.5, far: 65 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0.55);
        }}
      >
        <color attach="background" args={[SCENE_TOKENS.environment.backdrop]} />
        <fog attach="fog" args={[SCENE_TOKENS.environment.fog, 18, 34]} />

        <ambientLight intensity={0.66} color={SCENE_TOKENS.environment.ambientWarm} />
        <hemisphereLight
          args={[SCENE_TOKENS.environment.lampWarm, SCENE_TOKENS.environment.backdrop, 0.48]}
        />
        <spotLight
          position={[0, 11.5, 2.2]}
          angle={0.68}
          penumbra={0.6}
          intensity={2.6}
          color={SCENE_TOKENS.environment.lampWarm}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        <pointLight position={[-5.5, 4.2, 4.8]} intensity={0.58} color={SCENE_TOKENS.environment.rimWarm} />
        <pointLight position={[5.5, 4.2, 4.8]} intensity={0.58} color={SCENE_TOKENS.environment.rimWarm} />

        <PerformanceMonitor />
        <CameraRig idleShowcase={idleShowcase} />
        <VoxelPokerTable />

        {room && (
          <>
            {/* Larger, Clearer Community Cards */}
            <group position={[0, 0.08, -0.35]}>
              {room.communityCards.map((card, idx) => (
                <PlayingCard3D
                  key={card.code}
                  card={card}
                  targetPosition={[(idx - 2) * 1.04, 0.02, 0]}
                  faceUp={true}
                  scale={1.12}
                />
              ))}
            </group>

            {/* Center Pot Label (the actual physical tossed chips swept to center ARE the pot!) */}
            {room.pot > 0 && (
              <Html position={[0, 0.52, 0.72]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
                <div
                  className="font-mono text-xs font-extrabold text-accent-gold"
                  style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.92)' }}
                >
                  POT {room.pot.toLocaleString()}
                </div>
              </Html>
            )}

            {/* Opponents */}
            {opponents.map(({ player, slot }) => {
              const playerIndex = room.players.findIndex((p) => p.accountId === player.accountId);
              return (
                <OpponentSeat3D
                  key={player.accountId}
                  player={player}
                  position={slot.pos}
                  cardOffset={slot.cardOffset}
                  chipBankOffset={slot.chipBankOffset}
                  itemOffsets={slot.itemOffsets}
                  isCurrentTurn={room.currentTurnAccountId === player.accountId}
                  isDealer={room.dealerIndex === playerIndex}
                  phase={room.phase}
                />
              );
            })}

            {/* Local Player's Personal 3D Chip Bank Stacks (clear of hole cards & items!) */}
            {me && me.chips > 0 && !me.eliminated && (
              <ChipStack3D amount={me.chips} position={[-2.05, 0.068, 2.42]} scale={0.92} />
            )}

            {/* Real PvP Arena: 3D Stack of Earned 500,000 VND Polymer Bills on the Felt! */}
            {room.mode === 'ARENA' && me && me.arenaBillsEarned > 0 && !me.eliminated && (
              <ArenaBillsStack3D count={me.arenaBillsEarned} position={[-1.08, 0.068, 2.52]} />
            )}

            {/* Physics Bet/Raise Chips (stay resting on felt!), Pot Sweeps & Rising Winner Name */}
            <ChipEffects3D room={room} seatMap={seatMap} />

            {/* Larger, Clearer Local Player's Hole Cards */}
            {me && me.holeCards.length > 0 && !me.eliminated && (
              <group position={[0, 0.16, 3.0]}>
                {me.holeCards.map((card, idx) => (
                  <PlayingCard3D
                    key={card ? `${card.code}_${idx}` : idx}
                    card={card}
                    targetPosition={[(idx - 0.5) * 1.14, 0.04, 0]}
                    targetRotation={[0.24, (idx - 0.5) * -0.08, 0]}
                    faceUp={Boolean(card)}
                    scale={1.28}
                    exposedHighlight={me.exposedCardIndices.includes(idx)}
                  />
                ))}
              </group>
            )}
          </>
        )}

        {/* Render player's earned items ONLY during an active match (never hoverable in Lobby!) */}
        {!idleShowcase && (
          <TableItems3D me={me} onUseItem={onUseItem} onDiscardItem={onDiscardItem} />
        )}
      </Canvas>
    </div>
  );
}
