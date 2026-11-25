import { CSSProperties, useEffect, useRef, useState } from 'react';
import { GamePhase, PublicPlayerView, SkillMastery, SkillType } from '../../types/game';
import { SKILL_CATALOG_BY_TYPE } from '../../utils/skillCatalog';
import { consumeViaSource, recordViaSourceFromElement } from '../../utils/viaOrbSource';
import { VoxelIcon3D } from '../VoxelIcon3D';
import { CardLabel } from '../PixelSuitIcon';

interface ViaOrbParticle {
  id: number;
  sx: number;
  sy: number;
  bx: number;
  by: number;
  mx: number;
  my: number;
  dx: number;
  dy: number;
  delayMs: number;
  sizePx: number;
  tone: 'jade' | 'via';
}

interface ViaGainPopup {
  id: number;
  amount: number;
}

export interface SkillActionBarProps {
  me: PublicPlayerView;
  opponents: PublicPlayerView[];
  phase: GamePhase;
  mastery: SkillMastery;
  onTriggerSkill: (
    skillType: SkillType,
    options?: { targetAccountId?: string; cardIndex?: 0 | 1 }
  ) => void;
}

const TILT_BY_COUNT: Record<number, string[]> = {
  1: ['rotate-0'],
  2: ['-rotate-2', 'rotate-2'],
  3: ['-rotate-2', 'rotate-0', 'rotate-2'],
};

export function SkillActionBar({
  me,
  opponents,
  phase,
  mastery,
  onTriggerSkill,
}: SkillActionBarProps) {
  const [pickingSkill, setPickingSkill] = useState<SkillType | null>(null);
  const [displayedVia, setDisplayedVia] = useState<number>(me.via);
  const [orbs, setOrbs] = useState<ViaOrbParticle[]>([]);
  const [gainPopups, setGainPopups] = useState<ViaGainPopup[]>([]);
  const [isSurging, setIsSurging] = useState<boolean>(false);

  const prevViaRef = useRef<number>(me.via);
  const prevPhaseRef = useRef<GamePhase>(phase);
  const viaTrackRef = useRef<HTMLDivElement>(null);
  const orbIdRef = useRef<number>(1);
  const popupIdRef = useRef<number>(1);

  const hasNoodles =
    me.ownedItems.includes('INSTANT_NOODLES') && (me.itemsState.noodleBitesLeft ?? 0) > 0;
  const maxVia = hasNoodles ? 120 : 100;

  useEffect(() => {
    const prev = prevViaRef.current;
    const next = me.via;
    const prevPhase = prevPhaseRef.current;
    prevViaRef.current = next;
    prevPhaseRef.current = phase;

    if (next > prev) {
      const delta = next - prev;
      const orbCount = Math.min(14, Math.max(6, Math.round(delta / 2.5) + 4));
      const targetProgress = Math.min(1, next / maxVia);

      // Compute exact viewport coordinates of the filling tip on the Vía bar
      const trackRect = viaTrackRef.current?.getBoundingClientRect();
      const targetX = trackRect
        ? trackRect.left + trackRect.width * targetProgress
        : window.innerWidth * 0.5;
      const targetY = trackRect
        ? trackRect.top + trackRect.height / 2
        : window.innerHeight - 36;

      // Contextual fallback origin if gain came from table event rather than a direct button click:
      // - SHOWDOWN win / 3-win streak -> center winning pot
      // - Betting round advance (FLOP/TURN/RIVER) -> center community board
      // - VIA_SIPHON -> upper opponent seats area
      const phaseAdvanced = prevPhase !== phase;
      const fallbackOrigin =
        phase === 'SHOWDOWN'
          ? { x: window.innerWidth * 0.5, y: window.innerHeight * 0.44 }
          : phaseAdvanced
            ? { x: window.innerWidth * 0.5, y: window.innerHeight * 0.36 }
            : { x: window.innerWidth * 0.5, y: window.innerHeight * 0.24 };

      // Prefer the exact clicked button (BỎ BÀI, TỐ, ALL-IN, HÚT VÍA) when it triggered this gain!
      const source = consumeViaSource(fallbackOrigin, phase === 'SHOWDOWN' ? 900 : 1800);

      const batch: ViaOrbParticle[] = Array.from({ length: orbCount }, (_, idx) => {
        const spread = (idx / Math.max(1, orbCount - 1)) - 0.5; // -0.5 .. +0.5
        const startJitterX = Math.round(spread * 28);
        const startJitterY = Math.round(((idx % 3) - 1) * 10);
        const sx = source.x + startJitterX;
        const sy = source.y + startJitterY;
        const dx = Math.round(targetX - sx + ((idx % 3) - 1) * 8);
        const dy = Math.round(targetY - sy);
        // Gentle radial burst out of the button + smooth high arc flying toward the Vía bar
        const bx = Math.round(spread * 48 + Math.sign(dx || 1) * 10);
        const by = Math.round(-22 - Math.abs(spread) * 26);
        const arcLift = Math.min(135, Math.max(55, Math.abs(dx) * 0.24 + 48));
        const mx = Math.round(dx * 0.52 + spread * 34);
        const my = Math.round(dy * 0.45 - arcLift);

        return {
          id: orbIdRef.current++,
          sx,
          sy,
          bx,
          by,
          mx,
          my,
          dx,
          dy,
          delayMs: idx * 30,
          sizePx: idx % 3 === 0 ? 8 : 6,
          tone: idx % 3 === 0 ? 'via' : 'jade',
        };
      });

      const batchIds = new Set(batch.map((o) => o.id));
      setOrbs((existing) => [...existing.slice(-24), ...batch]);

      // Right as the flying green dots arrive at the Vía bar -> smoothly surge & grow the bar!
      let surgeEndTimer: number | undefined;
      const fillTimer = window.setTimeout(() => {
        setDisplayedVia(next);
        setIsSurging(true);
        surgeEndTimer = window.setTimeout(() => setIsSurging(false), 460);
        const popId = popupIdRef.current++;
        setGainPopups((existing) => [...existing.slice(-3), { id: popId, amount: delta }]);
        window.setTimeout(() => {
          setGainPopups((existing) => existing.filter((p) => p.id !== popId));
        }, 980);
      }, 340);

      const cleanupTimer = window.setTimeout(() => {
        setOrbs((existing) => existing.filter((o) => !batchIds.has(o.id)));
      }, 1050);

      return () => {
        window.clearTimeout(fillTimer);
        window.clearTimeout(cleanupTimer);
        if (surgeEndTimer !== undefined) window.clearTimeout(surgeEndTimer);
      };
    } else {
      setDisplayedVia(next);
    }
  }, [maxVia, me.via, phase]);

  const inActiveHand =
    phase !== 'WAITING' &&
    phase !== 'SHOWDOWN' &&
    !me.folded &&
    !me.eliminated &&
    !me.hasActiveChallenge;

  const activeOpponents = opponents.filter((o) => !o.folded && !o.eliminated);
  const unexposedCardIndices = ([0, 1] as const).filter(
    (idx) => idx < me.holeCards.length && !me.exposedCardIndices.includes(idx)
  );
  const equipped = (me.equippedSkills ?? []).slice(0, 3);
  const tilts = TILT_BY_COUNT[equipped.length] ?? ['rotate-0'];

  const spellCards = equipped.map((skillType, idx) => {
    const def = SKILL_CATALOG_BY_TYPE[skillType];
    const progress = mastery[def.masteryKey];
    const level = progress?.level ?? 1;
    const exp = progress?.exp ?? 0;
    const nextExp = level * 100;
    const expPct = level >= 10 ? 100 : Math.min(100, Math.round((exp / nextExp) * 100));
    const disabled =
      !inActiveHand ||
      me.via < def.viaCost ||
      (skillType === 'SLEIGHT_OF_HAND' && unexposedCardIndices.length === 0) ||
      (skillType === 'EAGLE_EYE' && phase === 'RIVER') ||
      (def.requiresTarget && activeOpponents.length === 0);

    return {
      ...def,
      level,
      exp,
      nextExp,
      expPct,
      disabled,
      tiltCls: tilts[idx] ?? 'rotate-0',
    };
  });

  const handleSkillClick = (type: SkillType) => {
    const def = SKILL_CATALOG_BY_TYPE[type];
    if (type === 'SLEIGHT_OF_HAND') {
      // If only 1 unexposed hole card remains, swap it directly without asking
      if (unexposedCardIndices.length === 1) {
        setPickingSkill(null);
        onTriggerSkill('SLEIGHT_OF_HAND', { cardIndex: unexposedCardIndices[0] });
        return;
      }
      setPickingSkill((prev) => (prev === type ? null : type));
      return;
    }
    if (def.requiresTarget) {
      setPickingSkill((prev) => (prev === type ? null : type));
      return;
    }
    setPickingSkill(null);
    onTriggerSkill(type);
  };

  const pickingTargetDef =
    pickingSkill && SKILL_CATALOG_BY_TYPE[pickingSkill]?.requiresTarget
      ? SKILL_CATALOG_BY_TYPE[pickingSkill]
      : null;

  return (
    <div className="pointer-events-none relative flex flex-col items-center gap-2">
      {/* Sub-picker popover for card slot (Sleight of Hand — unexposed cards only) */}
      {pickingSkill === 'SLEIGHT_OF_HAND' && (
        <div className="voxel-panel-gold pointer-events-auto absolute bottom-full mb-3 flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-xs font-bold text-content-secondary">CHỌN LÁ TRÁO:</span>
          {([0, 1] as const).map((idx) => {
            const isExposed = me.exposedCardIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                disabled={isExposed}
                onClick={() => {
                  setPickingSkill(null);
                  onTriggerSkill('SLEIGHT_OF_HAND', { cardIndex: idx });
                }}
                className="voxel-btn inline-flex items-center gap-1 border-2 border-border-gold bg-content-primary px-2.5 py-1 font-mono text-xs font-extrabold text-content-inverse disabled:cursor-not-allowed disabled:border-status-danger/60 disabled:bg-surface-canvas disabled:text-status-danger disabled:opacity-60"
              >
                {me.holeCards[idx] ? (
                  <CardLabel card={me.holeCards[idx]!} iconSize={12} darkBg={false} />
                ) : (
                  <span>#{idx + 1}</span>
                )}
                {isExposed ? <span className="text-[10px] text-status-danger">(ĐÃ LỘ)</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-picker popover for target opponent (Pressure Aura & Via Siphon) */}
      {pickingTargetDef && (
        <div className="voxel-panel-gold pointer-events-auto absolute bottom-full mb-3 flex flex-wrap items-center gap-1.5 px-3 py-2">
          <span className="font-mono text-xs font-bold text-content-secondary">
            {pickingTargetDef.targetLabel ?? 'CHỌN MỤC TIÊU:'}
          </span>
          {activeOpponents.map((opp) => (
            <button
              key={opp.accountId}
              type="button"
              onClick={(e) => {
                const selectedType = pickingTargetDef.type;
                if (selectedType === 'VIA_SIPHON') {
                  recordViaSourceFromElement(e.currentTarget, 'siphon');
                }
                setPickingSkill(null);
                onTriggerSkill(selectedType, { targetAccountId: opp.accountId });
              }}
              className="voxel-btn border-2 border-status-warning bg-status-warning px-2.5 py-1 font-mono text-xs font-extrabold text-content-inverse"
            >
              {opp.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Up to 3 Large Detailed Upright Magic Spell Cards tucked behind the raised Vía bar */}
      {spellCards.length > 0 ? (
        <div className="pointer-events-auto relative z-10 -mb-5 flex items-end justify-center gap-3">
          {spellCards.map((card) => {
            const isSelected = pickingSkill === card.type;
            return (
              <button
                key={card.type}
                type="button"
                disabled={card.disabled}
                onClick={() => handleSkillClick(card.type)}
                title={`${card.fullName} (LV.${card.level} · ${card.level >= 10 ? 'MAX' : `${card.exp}/${card.nextExp} EXP`}) — ${card.shortDesc}`}
                className={`group relative flex h-[150px] w-[114px] flex-col justify-between border-2 p-2.5 text-center shadow-[5px_5px_0_rgba(0,0,0,0.85)] transition-all duration-150 ${
                  card.borderCls
                } ${card.tiltCls} ${
                  isSelected
                    ? 'z-30 -translate-y-8 rotate-0 scale-105'
                    : 'z-10 hover:z-30 hover:-translate-y-8 hover:rotate-0 hover:scale-105'
                } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:z-10 disabled:hover:translate-y-0 disabled:hover:scale-100`}
              >
                {/* 4 Corner Pixel Studs */}
                <span className="pointer-events-none absolute left-1 top-1 h-1 w-1 bg-accent-gold/75" />
                <span className="pointer-events-none absolute right-1 top-1 h-1 w-1 bg-accent-gold/75" />

                {/* Top Row: Mastery Level & Vía Cost Crystal */}
                <div className="flex w-full items-center justify-between font-mono text-[10px] font-extrabold leading-none">
                  <span className="text-content-muted">LV.{card.level}</span>
                  <span className={`px-1.5 py-0.5 ${card.costBgCls}`}>{card.viaCost}</span>
                </div>

                {/* Simple Green EXP Progress Bar directly on the Spell Card */}
                <div className="mt-1 h-1 w-full bg-surface-canvas">
                  <div
                    className="h-full bg-accent-jade transition-all duration-300"
                    style={{ width: `${card.expPct}%` }}
                  />
                </div>

                {/* Center Spell Card Artwork Image */}
                <div
                  className={`relative my-1.5 flex-1 overflow-hidden border-2 ${card.innerFrameCls}`}
                >
                  <img
                    src={card.artImage}
                    alt={card.fullName}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Bottom Spell Nameplate */}
                <div
                  className={`pb-1 font-display text-xs font-extrabold leading-tight tracking-wide ${card.titleCls}`}
                >
                  {card.title}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="voxel-panel relative z-10 px-3 py-1.5 font-mono text-[10px] font-bold text-content-muted">
          KHÔNG MANG LÁ PHÉP (MUA &amp; TRANG BỊ Ở SẢNH)
        </div>
      )}

      {/* Raised Chunky Vía Energy Bar sitting IN FRONT of the bottom edge of the Spell Cards */}
      {(() => {
        const isFullPurple = displayedVia >= 100;
        const fillPercent = Math.min(100, (displayedVia / maxVia) * 100);
        return (
          <div className="relative z-20 flex w-full max-w-[376px] justify-center">
            {/* Viewport-wide overlay so green Vía dots fly straight from the EXACT source button (e.g., BỎ BÀI / TỐ / ALL-IN) into the Vía bar! */}
            {orbs.length > 0 && (
              <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
                {orbs.map((orb) => (
                  <span
                    key={orb.id}
                    className={`via-orb-particle fixed block border border-content-primary/80 ${
                      orb.tone === 'jade' ? 'bg-accent-jade' : 'bg-accent-via'
                    }`}
                    style={
                      {
                        left: `${orb.sx}px`,
                        top: `${orb.sy}px`,
                        width: orb.sizePx,
                        height: orb.sizePx,
                        animationDelay: `${orb.delayMs}ms`,
                        '--bx': `${orb.bx}px`,
                        '--by': `${orb.by}px`,
                        '--mx': `${orb.mx}px`,
                        '--my': `${orb.my}px`,
                        '--dx': `${orb.dx}px`,
                        '--dy': `${orb.dy}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            {/* Floating +N VÍA gain popups */}
            {gainPopups.map((pop) => (
              <span
                key={pop.id}
                className="via-gain-float pointer-events-none absolute -top-6 right-3 z-40 font-mono text-xs font-extrabold text-accent-jade"
                style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.9)' }}
              >
                +{pop.amount} VÍA
              </span>
            ))}

            <div
              className={`voxel-panel-gold pointer-events-auto relative flex w-full items-center gap-3 px-3.5 py-2 transition-colors duration-300 ${
                isSurging ? 'via-bar-surge' : ''
              } ${isFullPurple ? 'border-accent-purple via-full-purple' : ''}`}
            >
              <VoxelIcon3D kind="via" size={18} />
              <span
                className={`font-mono text-xs font-extrabold tracking-wider transition-colors duration-300 ${
                  isFullPurple ? 'text-accent-purple' : 'text-accent-via'
                }`}
              >
                VÍA {displayedVia}/{maxVia}
              </span>
              <div
                ref={viaTrackRef}
                className={`relative h-3.5 flex-1 overflow-hidden border-2 bg-surface-elevated transition-colors duration-300 ${
                  isFullPurple ? 'border-accent-purple' : 'border-border-subtle'
                }`}
              >
                <div
                  className={`relative h-full transition-all duration-500 ease-out ${
                    isFullPurple ? 'bg-accent-purple' : 'bg-accent-via'
                  }`}
                  style={{ width: `${fillPercent}%` }}
                >
                  {/* Crisp glowing leading pixel edge */}
                  {displayedVia > 0 && (
                    <span className="absolute inset-y-0 right-0 w-1 bg-content-primary/80" />
                  )}
                </div>
                {/* Crisp pixel gauge ticks every 25% */}
                <span className="pointer-events-none absolute inset-y-0 left-1/4 w-[1px] bg-surface-canvas/55" />
                <span className="pointer-events-none absolute inset-y-0 left-1/2 w-[1px] bg-surface-canvas/55" />
                <span className="pointer-events-none absolute inset-y-0 left-3/4 w-[1px] bg-surface-canvas/55" />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
