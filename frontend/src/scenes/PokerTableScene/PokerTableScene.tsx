import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { FilteredRoomState, ItemType, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { getFeltTexture, getFloorTexture, getWoodTexture } from '../ProceduralTextures';
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
  idleShowcase?: boolean;
}

const OPPONENT_SLOTS: {
  pos: [number, number, number];
  cardOffset: [number, number, number];
  chipBankOffset: [number, number, number];
}[] = [
  { pos: [-5.75, 0, -0.35], cardOffset: [1.35, 0.04, 0.2], chipBankOffset: [1.35, 0.068, 1.35] },
  { pos: [-3.0, 0, -3.95], cardOffset: [0.5, 0.04, 1.35], chipBankOffset: [-0.85, 0.068, 1.35] },
  { pos: [0, 0, -4.35], cardOffset: [0, 0.04, 1.4], chipBankOffset: [1.35, 0.068, 1.35] },
  { pos: [3.0, 0, -3.95], cardOffset: [-0.5, 0.04, 1.35], chipBankOffset: [0.85, 0.068, 1.35] },
  { pos: [5.75, 0, -0.35], cardOffset: [-1.35, 0.04, 0.2], chipBankOffset: [-1.35, 0.068, 1.35] },
];

function CameraRig({ idleShowcase }: { idleShowcase?: boolean }) {
  const targetPos = useRef(new THREE.Vector3(0, 7.6, 8.9));
  useFrame(({ camera, clock }, delta) => {
    if (idleShowcase) {
      const t = clock.getElapsedTime() * 0.14;
      camera.position.set(Math.sin(t) * 2.0, 8.8, 10.2 + Math.cos(t) * 0.5);
      camera.lookAt(0, 0, 0.35);
    } else {
      // Zoomed-in seated perspective: right up close to the felt so cards, chips & items feel big & tactile!
      targetPos.current.set(0, 7.5, 8.85);
      camera.position.lerp(targetPos.current, Math.min(1, delta * 5));
      camera.lookAt(0, 0, 0.55);
    }
  });
  return null;
}

function VoxelPokerTable() {
  const { woodGeo, feltGeo, railGeo } = useMemo(() => getTableGeometries(), []);
  const woodTex = useMemo(() => getWoodTexture(), []);
  const feltTex = useMemo(() => getFeltTexture(), []);
  const floorTex = useMemo(() => getFloorTexture(), []);

  return (
    <group>
      {/* Pixel Hardwood Floor (strictly below table legs) */}
      <mesh receiveShadow position={[0, -0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial map={floorTex} roughness={0.92} />
      </mesh>

      {/* Non-overlapping Blocky Pedestal Legs */}
      <mesh castShadow receiveShadow position={[-2.2, -0.56, 0]}>
        <boxGeometry args={[1.1, 0.56, 1.8]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.2, -0.56, 0]}>
        <boxGeometry args={[1.1, 0.56, 1.8]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>
      {/* Connecting crossbeam strictly between the 2 legs (width 3.3 -> never overlaps legs!) */}
      <mesh castShadow receiveShadow position={[0, -0.62, 0]}>
        <boxGeometry args={[3.3, 0.28, 0.84]} />
        <meshStandardMaterial map={woodTex} roughness={0.78} />
      </mesh>

      {/* Unified Stepped-Zigzag Wood Base (y = -0.28..0.0) */}
      <mesh geometry={woodGeo} position={[0, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={woodTex} roughness={0.72} />
      </mesh>

      {/* Unified Stepped-Zigzag Green Felt (y = 0.02..0.06, cleanly above wood base!) */}
      <mesh geometry={feltGeo} position={[0, 0.06, 0]} receiveShadow>
        <meshStandardMaterial map={feltTex} roughness={0.94} />
      </mesh>

      {/* Unified Stepped-Zigzag Dark Leather Rail (y = 0.04..0.32, cleanly frames felt!) */}
      <mesh geometry={railGeo} position={[0, 0.32, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={SCENE_TOKENS.table.railLeather} roughness={0.7} />
      </mesh>

      {/* 4 Square Brass Cup Holders sitting cleanly ON TOP of rail */}
      {[
        [-5.0, 0.35, 2.85],
        [5.0, 0.35, 2.85],
        [-5.0, 0.35, -2.85],
        [5.0, 0.35, -2.85],
      ].map(([x, y, z], idx) => (
        <mesh key={idx} position={[x, y, z]}>
          <boxGeometry args={[0.32, 0.06, 0.32]} />
          <meshStandardMaterial color={SCENE_TOKENS.table.woodGoldInlay} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Voxel Deck Stack in dedicated clear corner (never collides with chips or cards!) */}
      <mesh castShadow receiveShadow position={[-3.75, 0.15, -1.7]}>
        <boxGeometry args={[0.78, 0.18, 1.1]} />
        <meshStandardMaterial color={SCENE_TOKENS.cards.backBase} roughness={0.65} />
      </mesh>
    </group>
  );
}

export function PokerTableScene({
  room,
  me,
  onUseItem,
  idleShowcase = false,
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
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
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
            {/* Community Cards */}
            <group position={[0, 0.08, -0.35]}>
              {room.communityCards.map((card, idx) => (
                <PlayingCard3D
                  key={card.code}
                  card={card}
                  targetPosition={[(idx - 2) * 0.94, 0.02, 0]}
                  faceUp={true}
                  scale={1.02}
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

            {/* Physics Bet/Raise Chips (stay resting on felt!), Pot Sweeps & Rising Winner Name */}
            <ChipEffects3D room={room} seatMap={seatMap} />

            {/* Local Player's Hole Cards */}
            {me && me.holeCards.length > 0 && !me.eliminated && (
              <group position={[0, 0.16, 3.05]}>
                {me.holeCards.map((card, idx) => (
                  <PlayingCard3D
                    key={card ? `${card.code}_${idx}` : idx}
                    card={card}
                    targetPosition={[(idx - 0.5) * 1.05, 0.04, 0]}
                    targetRotation={[0.22, (idx - 0.5) * -0.08, 0]}
                    faceUp={Boolean(card)}
                    scale={1.18}
                    exposedHighlight={me.exposedCardIndices.includes(idx)}
                  />
                ))}
              </group>
            )}
          </>
        )}

        {/* Render player's earned items ONLY during an active match (never hoverable in Lobby!) */}
        {!idleShowcase && <TableItems3D me={me} onUseItem={onUseItem} />}
      </Canvas>
    </div>
  );
}
