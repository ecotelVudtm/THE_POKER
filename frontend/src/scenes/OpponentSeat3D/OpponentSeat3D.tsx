import { memo } from 'react';
import { Html } from '@react-three/drei';
import { GamePhase, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { PlayingCard3D } from '../PlayingCard3D';
import { ChipStack3D } from '../ChipStack3D';
import { VoxelAvatar3D } from '../VoxelAvatar3D';
import { OpponentItemMesh3D } from '../TableItems3D';

export interface OpponentSeat3DProps {
  player: PublicPlayerView;
  position: [number, number, number];
  cardOffset: [number, number, number];
  chipBankOffset: [number, number, number];
  itemOffsets: [number, number, number][];
  isCurrentTurn: boolean;
  isDealer: boolean;
  phase: GamePhase;
}

function formatTimeBank(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Minecraft-style blocky seated player avatar with pixel face, blocky shoulders & square turn highlight.
 */
export const OpponentSeat3D = memo(function OpponentSeat3D({
  player,
  position,
  cardOffset,
  chipBankOffset,
  itemOffsets,
  isCurrentTurn,
  isDealer,
  phase,
}: OpponentSeat3DProps) {
  const lowTime = player.timeBankSeconds < 45;
  const dimmed = player.folded || player.eliminated;

  const statusTag = player.timedOut
    ? 'HẾT GIỜ'
    : player.allIn
      ? 'TẤT TAY'
      : player.folded
        ? 'BỎ BÀI'
        : player.exposedCardIndices.length > 0
          ? 'LỘ TẨY'
          : null;

  // Face towards table center (0, 0, 0)
  const lookAngleY = Math.atan2(-position[0], -position[2]);

  return (
    <group position={position}>
      <group rotation={[0, lookAngleY, 0]}>
        {/* Real 3D Voxel Tavern Poker Chair standing solidly on the floor (y = -0.84) OUTSIDE the table rail */}
        <group>
          {/* 4 Sturdy Wooden Chair Legs */}
          {[
            [-0.38, -0.53, -0.34],
            [0.38, -0.53, -0.34],
            [-0.38, -0.53, 0.34],
            [0.38, -0.53, 0.34],
          ].map(([lx, ly, lz], idx) => (
            <mesh key={idx} castShadow receiveShadow position={[lx, ly, lz]}>
              <boxGeometry args={[0.1, 0.62, 0.1]} />
              <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.78} />
            </mesh>
          ))}
          {/* Wooden Seat Frame + Padded Leather Cushion */}
          <mesh castShadow receiveShadow position={[0, -0.21, 0]}>
            <boxGeometry args={[0.92, 0.08, 0.86]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.74} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.145, 0.02]}>
            <boxGeometry args={[0.82, 0.07, 0.76]} />
            <meshStandardMaterial
              color={dimmed ? SCENE_TOKENS.seats.foldedTint : SCENE_TOKENS.table.railLeather}
              roughness={0.68}
            />
          </mesh>
          {/* Chair Backrest Posts + Padded Back Panel + Brass Top Rail */}
          <mesh castShadow position={[-0.38, 0.25, -0.38]}>
            <boxGeometry args={[0.1, 0.92, 0.1]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.74} />
          </mesh>
          <mesh castShadow position={[0.38, 0.25, -0.38]}>
            <boxGeometry args={[0.1, 0.92, 0.1]} />
            <meshStandardMaterial color={SCENE_TOKENS.table.woodOuter} roughness={0.74} />
          </mesh>
          <mesh castShadow position={[0, 0.28, -0.36]}>
            <boxGeometry args={[0.7, 0.68, 0.09]} />
            <meshStandardMaterial
              color={dimmed ? SCENE_TOKENS.seats.foldedTint : SCENE_TOKENS.seats.pedestal}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.72, -0.38]}>
            <boxGeometry args={[0.9, 0.08, 0.12]} />
            <meshStandardMaterial
              color={SCENE_TOKENS.table.woodGoldInlay}
              metalness={0.65}
              roughness={0.35}
            />
          </mesh>
        </group>

        {/* Active Turn Square Voxel Frame cleanly framing the chair base on the floor */}
        {isCurrentTurn && (
          <group position={[0, -0.81, 0]}>
            <mesh position={[0, 0, -0.64]}>
              <boxGeometry args={[1.36, 0.04, 0.08]} />
              <meshBasicMaterial color={SCENE_TOKENS.seats.activeRing} />
            </mesh>
            <mesh position={[0, 0, 0.64]}>
              <boxGeometry args={[1.36, 0.04, 0.08]} />
              <meshBasicMaterial color={SCENE_TOKENS.seats.activeRing} />
            </mesh>
            <mesh position={[-0.64, 0, 0]}>
              <boxGeometry args={[0.08, 0.04, 1.2]} />
              <meshBasicMaterial color={SCENE_TOKENS.seats.activeRing} />
            </mesh>
            <mesh position={[0.64, 0, 0]}>
              <boxGeometry args={[0.08, 0.04, 1.2]} />
              <meshBasicMaterial color={SCENE_TOKENS.seats.activeRing} />
            </mesh>
          </group>
        )}

        {/* Full-Body Seated 3D Voxel Player Avatar with Equipped Skin (Tiers 1–4) */}
        <VoxelAvatar3D
          skinId={player.equippedSkin}
          seatIndex={player.seatIndex}
          dimmed={dimmed}
          pose="seated"
        />
      </group>

      {/* Opponent's Owned 3D Table Items placed on dedicated collision-free felt spots */}
      {!player.eliminated &&
        player.ownedItems
          .filter((it) => it !== 'PHONE')
          .slice(0, 3)
          .map((itemType, idx) => (
            <OpponentItemMesh3D
              key={itemType}
              type={itemType}
              itemsState={player.itemsState}
              hasDebt={Boolean(player.activeLoan || player.statusEffects.debtPressure)}
              position={itemOffsets[idx % itemOffsets.length]}
            />
          ))}

      {/* Opponent Hole Cards */}
      {player.holeCards.length > 0 && !player.eliminated && (
        <group position={cardOffset}>
          {player.holeCards.map((card, idx) => {
            const isExposed = player.exposedCardIndices.includes(idx);
            const faceUp = Boolean(card) && (isExposed || phase === 'SHOWDOWN');
            return (
              <PlayingCard3D
                key={idx}
                card={card}
                targetPosition={[(idx - 0.5) * 0.62, 0.04, 0]}
                targetRotation={[0, (idx - 0.5) * -0.1, 0]}
                faceUp={faceUp}
                scale={0.76}
                exposedHighlight={isExposed}
              />
            );
          })}
        </group>
      )}

      {/* Opponent's Personal 3D Chip Bank Stacks (placed cleanly clear of cards & deck!) */}
      {player.chips > 0 && !player.eliminated && (
        <ChipStack3D
          amount={player.chips}
          position={[chipBankOffset[0], 0.068, chipBankOffset[2]]}
          scale={0.72}
        />
      )}

      {/* Clean Borderless Floating Nametag raised cleanly above larger 1.12x avatars & hats */}
      <Html position={[0, 1.88, 0]} center distanceFactor={12.5} style={{ pointerEvents: 'none' }}>
        <div
          className={`flex flex-col items-center whitespace-nowrap text-center transition-opacity ${dimmed ? 'opacity-50' : ''
            }`}
          style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.92), -1px -1px 0 rgba(0,0,0,0.75)' }}
        >
          <div className="flex items-center gap-1">
            <span
              className={`font-mono text-xs font-extrabold ${isCurrentTurn ? 'text-accent-gold' : 'text-content-primary'
                }`}
            >
              {player.displayName}
            </span>
            {isDealer && (
              <span className="bg-accent-gold px-1 font-mono text-[9px] font-extrabold text-content-inverse">
                D
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="font-extrabold text-accent-gold">{player.chips.toLocaleString()}</span>
            <span className={lowTime ? 'font-bold text-status-danger' : 'text-content-secondary'}>
              {formatTimeBank(player.timeBankSeconds)}
            </span>
          </div>

          {/* Slim 3px Vía bar */}
          <div className="mt-0.5 h-[3px] w-20 bg-surface-canvas/80">
            <div
              className="h-full bg-accent-via"
              style={{ width: `${Math.min(100, player.via)}%` }}
            />
          </div>

          {statusTag && (
            <div className="mt-0.5 font-mono text-[10px] font-extrabold tracking-wider text-status-warning">
              {statusTag}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
});
