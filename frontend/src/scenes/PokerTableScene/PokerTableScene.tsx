import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { FilteredRoomState, ItemType, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { PlayingCard3D } from '../PlayingCard3D';
import { ChipStack3D } from '../ChipStack3D';
import { TableItems3D } from '../TableItems3D';
import { OpponentSeat3D } from '../OpponentSeat3D';

export interface PokerTableSceneProps {
  room: FilteredRoomState;
  me: PublicPlayerView | null;
  onUseItem: (item: ItemType) => void;
}

const OPPONENT_SLOTS: {
  pos: [number, number, number];
  cardOffset: [number, number, number];
}[] = [
  { pos: [-4.6, 0, -0.5], cardOffset: [1.35, 0.04, 0.25] },
  { pos: [-2.4, 0, -2.9], cardOffset: [0.5, 0.04, 1.3] },
  { pos: [0, 0, -3.35], cardOffset: [0, 0.04, 1.35] },
  { pos: [2.4, 0, -2.9], cardOffset: [-0.5, 0.04, 1.3] },
  { pos: [4.6, 0, -0.5], cardOffset: [-1.35, 0.04, 0.25] },
];

function PokerTableGeometry() {
  return (
    <group>
      {/* Cozy dark wood floor backdrop */}
      <mesh receiveShadow position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={SCENE_TOKENS.environment.backdrop} roughness={0.9} />
      </mesh>

      {/* Table pedestal base */}
      <mesh castShadow receiveShadow position={[0, -0.36, 0]}>
        <cylinderGeometry args={[3.4, 3.8, 0.56, 36]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.railLeather} roughness={0.75} />
      </mesh>

      {/* Outer carved warm wooden oval table body */}
      <mesh castShadow receiveShadow position={[0, -0.08, 0]} scale={[1.48, 1, 0.96]}>
        <cylinderGeometry args={[3.95, 3.85, 0.24, 48]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.55} />
      </mesh>

      {/* Wood trim bevel & gold inlay */}
      <mesh receiveShadow position={[0, 0.045, 0]} scale={[1.46, 1, 0.94]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.42, 3.88, 48]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.woodTrim} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.052, 0]} scale={[1.45, 1, 0.93]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.46, 48]} />
        <meshStandardMaterial
          color={SCENE_TOKENS.table.woodGoldInlay}
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>

      {/* Classic warm green felt surface */}
      <mesh receiveShadow position={[0, 0.042, 0]} scale={[1.44, 1, 0.92]}>
        <cylinderGeometry args={[3.42, 3.42, 0.02, 48]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.feltBase} roughness={0.92} />
      </mesh>

      {/* Inner betting line ellipse */}
      <mesh position={[0, 0.056, 0]} scale={[1.42, 1, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 2.39, 48]} />
        <meshStandardMaterial color={SCENE_TOKENS.table.feltInnerLine} roughness={0.8} />
      </mesh>

      {/* Decorative Deck Stack in upper-left center */}
      <mesh castShadow receiveShadow position={[-2.65, 0.14, -0.35]}>
        <boxGeometry args={[0.78, 0.18, 1.1]} />
        <meshStandardMaterial color={SCENE_TOKENS.cards.backBase} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function PokerTableScene({ room, me, onUseItem }: PokerTableSceneProps) {
  const opponents = useMemo(() => {
    const others = room.players.filter((p) => p.accountId !== me?.accountId);
    // Distribute nicely across the 5 top/side slots
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
  }, [me?.accountId, room.players]);

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 9.8, 10.8], fov: 38, near: 0.5, far: 60 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0.45);
        }}
      >
        <color attach="background" args={[SCENE_TOKENS.environment.backdrop]} />
        <fog attach="fog" args={[SCENE_TOKENS.environment.fog, 18, 34]} />

        {/* Cozy tabletop warm lighting */}
        <ambientLight intensity={0.62} color={SCENE_TOKENS.environment.ambientWarm} />
        <spotLight
          position={[0, 11, 2.5]}
          angle={0.68}
          penumbra={0.65}
          intensity={2.4}
          color={SCENE_TOKENS.environment.lampWarm}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
        />
        <pointLight
          position={[-5, 4, 5]}
          intensity={0.55}
          color={SCENE_TOKENS.environment.rimWarm}
        />
        <pointLight
          position={[5, 4, 5]}
          intensity={0.55}
          color={SCENE_TOKENS.environment.rimWarm}
        />

        <PokerTableGeometry />

        {/* Community Cards (Flop, Turn, River) */}
        <group position={[0, 0.06, -0.35]}>
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

        {/* Center Pot Chips & Label */}
        {room.pot > 0 && (
          <group position={[0, 0.06, 0.85]}>
            <ChipStack3D amount={room.pot} position={[0, 0, 0]} scale={1.15} />
            <Html position={[0, 0.65, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
              <div className="rounded-full border border-border-gold/70 bg-surface-panel/90 px-3 py-0.5 font-mono text-xs font-bold text-accent-gold shadow-warm">
                POT: {room.pot.toLocaleString()}
              </div>
            </Html>
          </group>
        )}

        {/* Opponent Seats around the table */}
        {opponents.map(({ player, slot }) => {
          const playerIndex = room.players.findIndex(
            (p) => p.accountId === player.accountId
          );
          return (
            <OpponentSeat3D
              key={player.accountId}
              player={player}
              position={slot.pos}
              cardOffset={slot.cardOffset}
              isCurrentTurn={room.currentTurnAccountId === player.accountId}
              isDealer={room.dealerIndex === playerIndex}
              phase={room.phase}
            />
          );
        })}

        {/* Local Player's Own Hole Cards in Foreground Center */}
        {me && me.holeCards.length > 0 && !me.eliminated && (
          <group position={[0, 0.14, 2.58]}>
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

        {/* 5 Familiar Everyday Items on Player's Table Corners */}
        <TableItems3D me={me} onUseItem={onUseItem} />
      </Canvas>
    </div>
  );
}
