import { useState } from 'react';
import { GamePhase, PublicPlayerView, SkillMastery, SkillType } from '../../types/game';
import { VoxelIcon3D, VoxelIconKind } from '../VoxelIcon3D';

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

interface SpellCardDef {
  type: SkillType;
  title: string;
  subtitle: string;
  iconKind: VoxelIconKind;
  cost: number;
  level: number;
  disabled: boolean;
  borderCls: string;
  innerFrameCls: string;
  costBgCls: string;
  titleCls: string;
  tiltCls: string;
}

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

  const spellCards: SpellCardDef[] = [
    {
      type: 'SLEIGHT_OF_HAND',
      title: 'TRÁO BÀI',
      subtitle: 'TAY ÁO',
      iconKind: 'sleight',
      cost: 30,
      level: mastery.sleightOfHand.level,
      disabled: !inActiveHand || me.via < 30,
      borderCls: 'border-border-gold bg-surface-panel',
      innerFrameCls: 'border-accent-gold/55 bg-surface-wood/35',
      costBgCls: 'bg-accent-gold text-content-inverse',
      titleCls: 'text-accent-gold',
      tiltCls: '-rotate-2',
    },
    {
      type: 'EAGLE_EYE',
      title: 'TÂM NHÃN',
      subtitle: 'ĐỌC VỊ',
      iconKind: 'eagle',
      cost: 50,
      level: mastery.eagleEye.level,
      disabled: !inActiveHand || me.via < 50 || phase === 'RIVER',
      borderCls: 'border-accent-via bg-surface-panel',
      innerFrameCls: 'border-accent-via/55 bg-accent-via/10',
      costBgCls: 'bg-accent-via text-content-inverse',
      titleCls: 'text-accent-via',
      tiltCls: 'rotate-0',
    },
    {
      type: 'PRESSURE_AURA',
      title: 'KHÍ THẾ',
      subtitle: 'ÁP ĐẢO',
      iconKind: 'pressure',
      cost: 25,
      level: mastery.pressureAura.level,
      disabled: !inActiveHand || me.via < 25 || activeOpponents.length === 0,
      borderCls: 'border-status-warning bg-surface-panel',
      innerFrameCls: 'border-status-danger/60 bg-status-danger/15',
      costBgCls: 'bg-status-warning text-content-inverse',
      titleCls: 'text-status-warning',
      tiltCls: 'rotate-2',
    },
  ];

  const handleSkillClick = (type: SkillType) => {
    if (type === 'EAGLE_EYE') {
      setPickingSkill(null);
      onTriggerSkill('EAGLE_EYE');
      return;
    }
    setPickingSkill((prev) => (prev === type ? null : type));
  };

  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-2">
      {/* Sub-picker popover for card slot or opponent target */}
      {pickingSkill === 'SLEIGHT_OF_HAND' && (
        <div className="voxel-panel-gold absolute bottom-full mb-3 flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-xs font-bold text-content-secondary">CHỌN LÁ TRÁO:</span>
          {([0, 1] as const).map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPickingSkill(null);
                onTriggerSkill('SLEIGHT_OF_HAND', { cardIndex: idx });
              }}
              className="voxel-btn border-2 border-border-gold bg-accent-gold px-2.5 py-1 font-mono text-xs font-extrabold text-content-inverse"
            >
              {me.holeCards[idx]?.code ?? `#${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {pickingSkill === 'PRESSURE_AURA' && (
        <div className="voxel-panel-gold absolute bottom-full mb-3 flex flex-wrap items-center gap-1.5 px-3 py-2">
          <span className="font-mono text-xs font-bold text-content-secondary">MỤC TIÊU (-10S):</span>
          {activeOpponents.map((opp) => (
            <button
              key={opp.accountId}
              type="button"
              onClick={() => {
                setPickingSkill(null);
                onTriggerSkill('PRESSURE_AURA', { targetAccountId: opp.accountId });
              }}
              className="voxel-btn border-2 border-status-warning bg-status-warning px-2.5 py-1 font-mono text-xs font-extrabold text-content-inverse"
            >
              {opp.displayName}
            </button>
          ))}
        </div>
      )}

      {/* 3 Upright Magic Spell Cards (Tarot / Voxel Spell Card Style) */}
      <div className="flex items-end justify-center gap-3">
        {spellCards.map((card) => {
          const isSelected = pickingSkill === card.type;
          return (
            <button
              key={card.type}
              type="button"
              disabled={card.disabled}
              onClick={() => handleSkillClick(card.type)}
              className={`group relative flex h-[112px] w-[84px] flex-col justify-between border-2 p-1.5 text-center shadow-[4px_4px_0_rgba(0,0,0,0.75)] transition-transform duration-150 ${
                card.borderCls
              } ${card.tiltCls} ${
                isSelected
                  ? '-translate-y-3 scale-105'
                  : 'hover:-translate-y-2.5 hover:rotate-0 hover:scale-105'
              } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100`}
            >
              {/* Top Row: Mastery Level & Vía Cost Crystal */}
              <div className="flex w-full items-center justify-between font-mono text-[9px] font-extrabold leading-none">
                <span className="text-content-muted">LV.{card.level}</span>
                <span className={`px-1 py-0.5 ${card.costBgCls}`}>{card.cost}</span>
              </div>

              {/* Center Ornate Inner Spell Art Frame with 3D Voxel Emblem */}
              <div
                className={`my-1 flex flex-1 flex-col items-center justify-center border ${card.innerFrameCls}`}
              >
                <VoxelIcon3D kind={card.iconKind} size={22} />
                <span className="mt-1 font-mono text-[8px] font-bold tracking-widest text-content-muted">
                  {card.subtitle}
                </span>
              </div>

              {/* Bottom Spell Nameplate */}
              <div className={`font-display text-[11px] font-bold leading-tight tracking-wide ${card.titleCls}`}>
                {card.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Slim Glowing Vía Energy Bar right under the 3 Spell Cards */}
      <div className="voxel-panel flex w-full max-w-[286px] items-center gap-2 px-2.5 py-1">
        <VoxelIcon3D kind="via" size={14} />
        <span className="font-mono text-[10px] font-extrabold tracking-wider text-accent-via">
          VÍA {me.via}
        </span>
        <div className="h-2 flex-1 border border-border-subtle bg-surface-elevated">
          <div
            className="h-full bg-accent-via transition-all duration-300"
            style={{ width: `${Math.min(100, me.via)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
