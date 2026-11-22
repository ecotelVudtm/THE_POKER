import { Html } from '@react-three/drei';
import { GamePhase, PublicPlayerView } from '../../types/game';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { PlayingCard3D } from '../PlayingCard3D';
import { ChipStack3D } from '../ChipStack3D';

export interface OpponentSeat3DProps {
  player: PublicPlayerView;
  position: [number, number, number];
  cardOffset: [number, number, number];
  isCurrentTurn: boolean;
  isDealer: boolean;
  phase: GamePhase;
}

function formatTimeBank(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function OpponentSeat3D({
  player,
  position,
  cardOffset,
  isCurrentTurn,
  isDealer,
  phase,
}: OpponentSeat3DProps) {
  const lowTime = player.timeBankSeconds < 45;
  const dimmed = player.folded || player.eliminated;

  return (
    <group position={position}>
      {/* Stylized 2.5D Avatar Pedestal & Bust */}
      <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.58, 0.66, 0.22, 24]} />
        <meshStandardMaterial
          color={dimmed ? SCENE_TOKENS.seats.foldedTint : SCENE_TOKENS.seats.pedestal}
          roughness={0.5}
        />
      </mesh>

      {/* Active Turn Glowing Ring */}
      {isCurrentTurn && (
        <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62, 0.78, 32]} />
          <meshBasicMaterial color={SCENE_TOKENS.seats.activeRing} />
        </mesh>
      )}

      {/* Avatar torso */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.26, 0.36, 0.52, 18]} />
        <meshStandardMaterial
          color={dimmed ? SCENE_TOKENS.seats.foldedTint : SCENE_TOKENS.seats.avatarBody}
          roughness={0.55}
        />
      </mesh>

      {/* Avatar head */}
      <mesh castShadow position={[0, 0.94, 0]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial color={SCENE_TOKENS.seats.avatarHead} roughness={0.45} />
      </mesh>

      {/* Opponent Hole Cards (auto-flip if exposed by Lộ Tẩy or Showdown) */}
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

      {/* Current round bet chip stack */}
      {player.currentBet > 0 && (
        <ChipStack3D
          amount={player.currentBet}
          position={[cardOffset[0] * 1.45, 0.02, cardOffset[2] * 1.45]}
          scale={0.75}
        />
      )}

      {/* Floating Opponent HUD Plate */}
      <Html position={[0, 1.55, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
        <div
          className={`w-40 rounded-xl border px-2.5 py-1.5 shadow-warm backdrop-blur-md transition-all ${
            isCurrentTurn
              ? 'border-border-gold bg-surface-elevated/95 shadow-goldGlow'
              : 'border-border-subtle/70 bg-surface-panel/90'
          } ${dimmed ? 'opacity-65' : ''}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-bold text-content-primary">
              {player.displayName}
            </span>
            {isDealer && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-gold text-[10px] font-extrabold text-content-inverse">
                D
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-accent-gold">
              {player.chips.toLocaleString()}
            </span>
            <span
              className={`font-semibold ${
                lowTime ? 'animate-pulse text-status-danger' : 'text-content-secondary'
              }`}
            >
              ⏱ {formatTimeBank(player.timeBankSeconds)}
            </span>
          </div>

          {/* Mini Vía Bar */}
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-canvas/80">
            <div
              className="h-full rounded-full bg-accent-via transition-all"
              style={{ width: `${Math.min(100, player.via)}%` }}
            />
          </div>

          {/* Status badges */}
          <div className="mt-1 flex flex-wrap gap-1">
            {player.timedOut && (
              <span className="rounded bg-status-danger/20 px-1 text-[9px] font-bold text-status-danger">
                TIME OUT
              </span>
            )}
            {player.folded && !player.timedOut && (
              <span className="rounded bg-surface-canvas/80 px-1 text-[9px] font-semibold text-content-muted">
                BỎ BÀI
              </span>
            )}
            {player.allIn && (
              <span className="rounded bg-status-warning/25 px-1 text-[9px] font-bold text-status-warning">
                ALL-IN
              </span>
            )}
            {player.exposedCardIndices.length > 0 && (
              <span className="rounded bg-status-danger/25 px-1 text-[9px] font-bold text-status-danger">
                LỘ TẨY!
              </span>
            )}
            {player.statusEffects.blessed && (
              <span className="rounded bg-accent-gold/20 px-1 text-[9px] font-semibold text-accent-gold">
                🪔 PHÚC
              </span>
            )}
            {player.statusEffects.pressured && (
              <span className="rounded bg-status-danger/20 px-1 text-[9px] font-semibold text-status-danger">
                ⚡ ÁP LỰC
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
