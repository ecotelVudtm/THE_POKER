import { useState } from 'react';
import { GamePhase, PublicPlayerView, SkillMastery, SkillType } from '../../types/game';
import { SKILL_CATALOG_BY_TYPE } from '../../utils/skillCatalog';
import { VoxelIcon3D } from '../VoxelIcon3D';

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
    const level = mastery[def.masteryKey]?.level ?? 1;
    const disabled =
      !inActiveHand ||
      me.via < def.viaCost ||
      (skillType === 'SLEIGHT_OF_HAND' && unexposedCardIndices.length === 0) ||
      (skillType === 'EAGLE_EYE' && phase === 'RIVER') ||
      (def.requiresTarget && activeOpponents.length === 0);

    return {
      ...def,
      level,
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
                className="voxel-btn border-2 border-border-gold bg-accent-gold px-2.5 py-1 font-mono text-xs font-extrabold text-content-inverse disabled:cursor-not-allowed disabled:border-status-danger/60 disabled:bg-surface-canvas disabled:text-status-danger disabled:opacity-60"
              >
                {me.holeCards[idx]?.code ?? `#${idx + 1}`}
                {isExposed ? ' (ĐÃ LỘ)' : ''}
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
              onClick={() => {
                const selectedType = pickingTargetDef.type;
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
                title={`${card.fullName} — ${card.shortDesc}`}
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

                {/* Center Ornate Inner Spell Art Frame with 3D Voxel Emblem */}
                <div
                  className={`my-1.5 flex flex-1 flex-col items-center justify-center border-2 ${card.innerFrameCls}`}
                >
                  <VoxelIcon3D kind={card.iconKind} size={30} />
                  <span className="mt-1 font-mono text-[9px] font-bold tracking-widest text-content-muted">
                    {card.subtitle}
                  </span>
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
        const hasNoodles =
          me.ownedItems.includes('INSTANT_NOODLES') && (me.itemsState.noodleBitesLeft ?? 0) > 0;
        const maxVia = hasNoodles ? 120 : 100;
        return (
          <div className="voxel-panel-gold pointer-events-auto relative z-20 flex w-full max-w-[376px] items-center gap-3 px-3.5 py-2">
            <VoxelIcon3D kind="via" size={18} />
            <span className="font-mono text-xs font-extrabold tracking-wider text-accent-via">
              VÍA {me.via}/{maxVia}
            </span>
            <div className="relative h-3 flex-1 border-2 border-border-subtle bg-surface-elevated">
              <div
                className="h-full bg-accent-via transition-all duration-300"
                style={{ width: `${Math.min(100, (me.via / maxVia) * 100)}%` }}
              />
              {/* Crisp pixel gauge ticks every 25% */}
              <span className="pointer-events-none absolute inset-y-0 left-1/4 w-[1px] bg-surface-canvas/55" />
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-[1px] bg-surface-canvas/55" />
              <span className="pointer-events-none absolute inset-y-0 left-3/4 w-[1px] bg-surface-canvas/55" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
