import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FilteredRoomState, HandWinner } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { breakDownChips, CHIP_DENOMINATIONS } from '../../utils/chipDenominations';
import { getStripeGeometry, getVoxelChipGeometry } from '../ChipStack3D';
import { WinEffects3D } from '../WinEffects3D';

export interface SeatPositionMap {
  [accountId: string]: {
    origin: [number, number, number];
    betSpot: [number, number, number];
  };
}

export interface ChipEffects3DProps {
  room: FilteredRoomState;
  seatMap: SeatPositionMap;
}

type ChipMotionPhase = 'toss' | 'resting' | 'slide_to_pot' | 'slide_to_winner';

interface TableChipEntity {
  id: number;
  color: string;
  phase: ChipMotionPhase;
  from: [number, number, number];
  to: [number, number, number];
  delayMs: number;
  /** Monotonic counter incremented whenever this chip gets a new destination (pot sweep / winner collect) */
  motionVersion: number;
}

const FELT_FLOOR_Y = 0.068;
const CENTER_POT_BASE: [number, number, number] = [0, FELT_FLOOR_Y, 0.72];

/**
 * A single REAL physical voxel chip on the table.
 * Lives through the entire hand:
 *   1. Tossed with a silky analytic parabolic arc + gentle damped micro-bounce (ZERO sudden rotation snap or teleport!).
 *   2. Stays resting right there on the green felt.
 *   3. At round end, THIS EXACT CHIP slides smoothly into the center pot pile.
 *   4. At Showdown, ALL THESE EXACT CHIPS sweep smoothly across the felt straight into the winner's chip bank!
 */
function PhysicalTableChip({
  chip,
  onCollected,
}: {
  chip: TableChipEntity;
  onCollected: (id: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geo = useMemo(() => getVoxelChipGeometry(), []);
  const stripeGeo = useMemo(() => getStripeGeometry(), []);

  // Hide only on initial mount before first animation frame so delayed chips never flash at origin
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = false;
    }
  }, []);

  const stRef = useRef({
    motionVersion: -1,
    started: false,
    clinked: false,
    settled: false,
    collected: false,
    startAt: 0,
    fromPos: new THREE.Vector3(chip.from[0], Math.max(FELT_FLOOR_Y + 0.12, chip.from[1]), chip.from[2]),
    pos: new THREE.Vector3(chip.from[0], Math.max(FELT_FLOOR_Y + 0.12, chip.from[1]), chip.from[2]),
    rotY: (chip.id * 1.17) % (Math.PI * 2),
    spinDir: chip.id % 2 === 0 ? 1 : -1,
    arcPeak: 0.36 + (chip.id % 3) * 0.05,
  });

  // Re-arm motion cleanly whenever chip gets a new motionVersion (toss -> slide_to_pot -> slide_to_winner)
  if (stRef.current.motionVersion !== chip.motionVersion) {
    const st = stRef.current;
    st.motionVersion = chip.motionVersion;
    st.settled = false;
    st.clinked = false;

    if (chip.phase === 'toss') {
      const startY = Math.max(FELT_FLOOR_Y + 0.14, chip.from[1]);
      st.started = false;
      st.startAt = performance.now() + chip.delayMs;
      st.fromPos.set(chip.from[0], startY, chip.from[2]);
      st.pos.copy(st.fromPos);
    } else if (chip.phase === 'slide_to_pot' || chip.phase === 'slide_to_winner') {
      // Slide seamlessly from the chip's EXACT current rendered position (never teleport!)
      st.started = true;
      st.startAt = performance.now() + chip.delayMs;
      st.fromPos.copy(st.pos);
    }
  }

  useFrame((_, delta) => {
    const mesh = groupRef.current;
    const st = stRef.current;
    if (!mesh || st.collected) return;

    const now = performance.now();

    // 1. Silky Analytic Parabolic Toss + Soft Damped Felt Landing (ZERO snap / ZERO overshoot!)
    if (chip.phase === 'toss') {
      if (now < st.startAt) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      if (st.settled) return;

      const elapsedSec = (now - st.startAt) / 1000;
      const flightSec = 0.34;
      const settleSec = 0.16;
      const targetY = Math.max(FELT_FLOOR_Y, chip.to[1]);

      if (elapsedSec < flightSec) {
        const u = elapsedSec / flightSec; // 0..1
        // Smooth horizontal deceleration toward exact target spot
        const horizEase = 1 - Math.pow(1 - u, 1.5);
        st.pos.x = THREE.MathUtils.lerp(st.fromPos.x, chip.to[0], horizEase);
        st.pos.z = THREE.MathUtils.lerp(st.fromPos.z, chip.to[2], horizEase);
        // Clean parabolic vertical arc landing precisely at targetY when u -> 1
        const baseY = THREE.MathUtils.lerp(st.fromPos.y, targetY, u);
        st.pos.y = baseY + 4 * st.arcPeak * u * (1 - u);

        // Smooth pitch/roll tilt that returns naturally to 0° BEFORE touching the felt!
        const tiltEnv = Math.sin(u * Math.PI);
        st.rotY += delta * 5.2 * st.spinDir * (1 - u * 0.45);
        mesh.position.copy(st.pos);
        mesh.rotation.set(tiltEnv * 0.38, st.rotY, tiltEnv * 0.2 * st.spinDir);
        mesh.scale.setScalar(1);
      } else {
        if (!st.clinked) {
          st.clinked = true;
          soundEngine.playChipClink();
        }
        const b = Math.min(1, (elapsedSec - flightSec) / settleSec);
        // Gentle damped micro-hop directly on the landing spot
        const hop = Math.sin(b * Math.PI) * 0.042 * (1 - b);
        const wobble = Math.sin(b * Math.PI) * 0.08 * (1 - b);
        st.pos.set(chip.to[0], targetY + hop, chip.to[2]);
        st.rotY += delta * 0.9 * st.spinDir * (1 - b);
        mesh.position.copy(st.pos);
        mesh.rotation.set(wobble, st.rotY, wobble * 0.5 * st.spinDir);
        mesh.scale.setScalar(1);

        if (b >= 1) {
          st.pos.set(chip.to[0], targetY, chip.to[2]);
          mesh.position.copy(st.pos);
          mesh.rotation.set(0, st.rotY, 0);
          st.settled = true;
        }
      }
      return;
    }

    // 2. Smooth physical sweep across the green felt (to center Pot OR to Winner's stack)
    if (chip.phase === 'slide_to_pot' || chip.phase === 'slide_to_winner') {
      mesh.visible = true;
      if (now < st.startAt || st.settled) return;

      const durationMs = chip.phase === 'slide_to_winner' ? 580 : 420;
      const t = Math.min(1, (now - st.startAt) / durationMs);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      st.pos.x = THREE.MathUtils.lerp(st.fromPos.x, chip.to[0], ease);
      st.pos.z = THREE.MathUtils.lerp(st.fromPos.z, chip.to[2], ease);
      const lift = Math.sin(t * Math.PI) * (chip.phase === 'slide_to_winner' ? 0.24 : 0.07);
      st.pos.y = Math.max(
        FELT_FLOOR_Y,
        THREE.MathUtils.lerp(st.fromPos.y, chip.to[1], ease) + lift
      );
      st.rotY += delta * 3.0 * st.spinDir;

      mesh.position.copy(st.pos);
      mesh.rotation.set(0, st.rotY, 0);

      // Gentle fade-shrink right at the end when merging into the winner's chip bank
      if (chip.phase === 'slide_to_winner' && t > 0.82) {
        const mergeScale = Math.max(0.15, 1 - ((t - 0.82) / 0.18) * 0.85);
        mesh.scale.setScalar(mergeScale);
      } else {
        mesh.scale.setScalar(1);
      }

      if (t >= 1) {
        st.settled = true;
        if (chip.phase === 'slide_to_winner') {
          st.collected = true;
          onCollected(chip.id);
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={chip.color} roughness={0.55} />
      </mesh>
      {/* White center inlay square on top & bottom so tossed chips match ChipStack3D 100%! */}
      <mesh geometry={stripeGeo} position={[0, 0.052, 0]}>
        <meshStandardMaterial color={SCENE_TOKENS.chips.stripe} roughness={0.6} />
      </mesh>
      <mesh geometry={stripeGeo} position={[0, -0.004, 0]}>
        <meshStandardMaterial color={SCENE_TOKENS.chips.stripe} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Unboxed bold floating winner name rising from the center of the table */
function RisingWinnerBanner3D({ winners, handKey }: { winners: HandWinner[]; handKey: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    startRef.current = performance.now();
  }, [handKey]);

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsedSec = (performance.now() - startRef.current) / 1000;
    const rise = Math.min(1, elapsedSec / 0.85);
    const easeOut = 1 - Math.pow(1 - rise, 3);
    const floatY = Math.sin(elapsedSec * 3.2) * 0.06;
    groupRef.current.position.y = 0.35 + easeOut * 1.55 + (rise >= 1 ? floatY : 0);
  });

  if (winners.length === 0) return null;

  return (
    <group ref={groupRef} position={[0, 0.35, 0.15]}>
      <Html center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap text-center"
          style={{
            textShadow:
              '3px 3px 0 rgba(0,0,0,0.95), -1px -1px 0 rgba(0,0,0,0.85), 0 0 18px rgba(235,186,84,0.45)',
          }}
        >
          {winners.map((w) => (
            <div key={w.accountId}>
              <div className="font-display text-2xl font-extrabold tracking-widest text-accent-gold">
                {w.displayName}
              </div>
              <div className="mt-0.5 font-mono text-xs font-extrabold text-content-primary">
                +{w.amount.toLocaleString()} CHIP ·{' '}
                <span className="text-accent-jade">{w.handName}</span>
              </div>
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}

export function ChipEffects3D({ room, seatMap }: ChipEffects3DProps) {
  const [tableChips, setTableChips] = useState<TableChipEntity[]>([]);
  const prevBetsRef = useRef<Map<string, number>>(new Map());
  const seatBetStackCountRef = useRef<Map<string, number>>(new Map());
  const potStackCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>(room.phase);
  const prevHandRef = useRef<number>(room.handNumber);
  const lastWinHandRef = useRef<number>(-1);
  const nextIdRef = useRef<number>(1);

  const removeCollectedChip = (id: number) => {
    setTableChips((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    const handChanged = prevHandRef.current !== room.handNumber;
    const phaseChanged = prevPhaseRef.current !== room.phase;

    if (handChanged) {
      prevHandRef.current = room.handNumber;
      prevBetsRef.current.clear();
      seatBetStackCountRef.current.clear();
      potStackCountRef.current = 0;
      setTableChips([]);
    }

    // 1. New Bet / Call / Raise / Blinds -> toss real physical chips onto the player's betting spot
    const newlyTossed: TableChipEntity[] = [];
    for (const player of room.players) {
      const prevBet = prevBetsRef.current.get(player.accountId) ?? 0;
      const diff = player.currentBet - prevBet;

      if (diff > 0) {
        const seat = seatMap[player.accountId];
        if (seat) {
          const breakdown = breakDownChips(diff);
          const colors: string[] = [];
          for (const item of breakdown) {
            const c = Math.min(2, item.count);
            for (let k = 0; k < c && colors.length < 4; k++) {
              colors.push(item.denom.hex3D);
            }
          }
          if (colors.length === 0) colors.push(CHIP_DENOMINATIONS[4].hex3D);

          let stackIdx = seatBetStackCountRef.current.get(player.accountId) ?? 0;
          colors.forEach((color, i) => {
            const colOffset = stackIdx % 2 === 0 ? -0.11 : 0.11;
            const layer = Math.floor(stackIdx / 2);
            stackIdx += 1;
            newlyTossed.push({
              id: nextIdRef.current++,
              color,
              phase: 'toss',
              from: [seat.origin[0], 0.48, seat.origin[2]],
              to: [
                seat.betSpot[0] + colOffset,
                FELT_FLOOR_Y + layer * 0.052,
                seat.betSpot[2],
              ],
              delayMs: i * 65,
              motionVersion: 1,
            });
          });
          seatBetStackCountRef.current.set(player.accountId, stackIdx);
        }
      }
      prevBetsRef.current.set(player.accountId, player.currentBet);
    }

    // 2. Betting round ended (FLOP / TURN / RIVER) -> slide ALL resting bet chips smoothly to center pot pile!
    if (
      phaseChanged &&
      !handChanged &&
      (room.phase === 'FLOP' || room.phase === 'TURN' || room.phase === 'RIVER')
    ) {
      seatBetStackCountRef.current.clear();
      prevBetsRef.current.clear();
      soundEngine.playPotSweep();
      setTableChips((prev) => {
        const combined = [...prev, ...newlyTossed];
        return combined.map((c, idx) => {
          if (c.phase === 'slide_to_pot' || c.phase === 'slide_to_winner') return c;
          const potIdx = potStackCountRef.current++;
          const col = potIdx % 5;
          const row = Math.floor(potIdx / 5) % 2;
          const layer = Math.floor(potIdx / 10);
          return {
            ...c,
            phase: 'slide_to_pot' as const,
            to: [
              CENTER_POT_BASE[0] + (col - 2) * 0.24,
              FELT_FLOOR_Y + layer * 0.052,
              CENTER_POT_BASE[2] + (row - 0.5) * 0.24,
            ] as [number, number, number],
            delayMs: (idx % 6) * 35,
            motionVersion: c.motionVersion + 1,
          };
        });
      });
      prevPhaseRef.current = room.phase;
      return;
    }

    // 3. SHOWDOWN -> sweep EVERY physical chip currently on the table straight to the winner(s)!
    if (
      room.phase === 'SHOWDOWN' &&
      room.lastWinners.length > 0 &&
      lastWinHandRef.current !== room.handNumber
    ) {
      lastWinHandRef.current = room.handNumber;
      soundEngine.playPotSweep();
      const winners = room.lastWinners;
      const firstWinnerPlayer = room.players.find((p) => p.accountId === winners[0]?.accountId);
      if (firstWinnerPlayer?.equippedWinEffect && firstWinnerPlayer.equippedWinEffect !== 'NONE') {
        soundEngine.playWinEffectSound(firstWinnerPlayer.equippedWinEffect);
      }

      setTableChips((prev) => {
        const allOnTable = [...prev, ...newlyTossed];
        return allOnTable.map((c, idx) => {
          const winner = winners[idx % winners.length];
          const seat = seatMap[winner.accountId];
          const target = seat ? seat.origin : CENTER_POT_BASE;
          return {
            ...c,
            phase: 'slide_to_winner' as const,
            to: [target[0], FELT_FLOOR_Y + 0.05, target[2]] as [number, number, number],
            delayMs: 220 + idx * 38,
            motionVersion: c.motionVersion + 1,
          };
        });
      });
      prevPhaseRef.current = room.phase;
      return;
    }

    prevPhaseRef.current = room.phase;

    if (newlyTossed.length > 0) {
      setTableChips((prev) => [...prev.slice(-48), ...newlyTossed]);
    }
  }, [room.handNumber, room.lastWinners, room.phase, room.players, seatMap]);

  const primaryWinnerEffect = useMemo(() => {
    if (room.phase !== 'SHOWDOWN' || room.lastWinners.length === 0) return 'NONE' as const;
    const firstWinner = room.lastWinners[0];
    const winnerPlayer = room.players.find((p) => p.accountId === firstWinner.accountId);
    return winnerPlayer?.equippedWinEffect ?? 'NONE';
  }, [room.lastWinners, room.phase, room.players]);

  return (
    <group>
      {tableChips.map((chip) => (
        <PhysicalTableChip key={chip.id} chip={chip} onCollected={removeCollectedChip} />
      ))}

      {room.phase === 'SHOWDOWN' && room.lastWinners.length > 0 && (
        <>
          <WinEffects3D
            effectId={primaryWinnerEffect}
            handKey={`${room.id}_${room.handNumber}`}
          />
          <RisingWinnerBanner3D
            winners={room.lastWinners}
            handKey={`${room.id}_${room.handNumber}`}
          />
        </>
      )}
    </group>
  );
}
