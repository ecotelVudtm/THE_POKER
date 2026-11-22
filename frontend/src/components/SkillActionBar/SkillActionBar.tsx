import { useState } from 'react';
import { Eye, Flame, Shuffle, Sparkles } from 'lucide-react';
import { GamePhase, PublicPlayerView, SkillMastery, SkillType } from '../../types/game';

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

  const skills: {
    type: SkillType;
    name: string;
    cost: number;
    level: number;
    icon: React.ReactNode;
    disabled: boolean;
  }[] = [
    {
      type: 'SLEIGHT_OF_HAND',
      name: 'Tráo Bài',
      cost: 30,
      level: mastery.sleightOfHand.level,
      icon: <Shuffle className="h-3.5 w-3.5" />,
      disabled: !inActiveHand || me.via < 30,
    },
    {
      type: 'EAGLE_EYE',
      name: 'Tâm Nhãn',
      cost: 25,
      level: mastery.eagleEye.level,
      icon: <Eye className="h-3.5 w-3.5" />,
      disabled: !inActiveHand || me.via < 25 || phase === 'RIVER',
    },
    {
      type: 'PRESSURE_AURA',
      name: 'Tỏa Khí Thế',
      cost: 25,
      level: mastery.pressureAura.level,
      icon: <Flame className="h-3.5 w-3.5" />,
      disabled: !inActiveHand || me.via < 25 || activeOpponents.length === 0,
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
    <div className="pointer-events-auto relative flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-panel/95 p-3 shadow-warm backdrop-blur-md">
      {/* Sub-picker popover for card slot or opponent target */}
      {pickingSkill === 'SLEIGHT_OF_HAND' && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 rounded-xl border border-border-gold/60 bg-surface-elevated p-2 shadow-warm">
          <span className="text-[11px] font-semibold text-content-secondary">Chọn lá muốn tráo:</span>
          {([0, 1] as const).map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPickingSkill(null);
                onTriggerSkill('SLEIGHT_OF_HAND', { cardIndex: idx });
              }}
              className="rounded-lg bg-accent-gold px-2.5 py-1 font-mono text-xs font-bold text-content-inverse hover:brightness-110"
            >
              Lá {idx + 1} ({me.holeCards[idx]?.code ?? '?'})
            </button>
          ))}
        </div>
      )}

      {pickingSkill === 'PRESSURE_AURA' && (
        <div className="absolute bottom-full left-0 mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-border-gold/60 bg-surface-elevated p-2 shadow-warm">
          <span className="text-[11px] font-semibold text-content-secondary">Chọn đối thủ (-10s):</span>
          {activeOpponents.map((opp) => (
            <button
              key={opp.accountId}
              type="button"
              onClick={() => {
                setPickingSkill(null);
                onTriggerSkill('PRESSURE_AURA', { targetAccountId: opp.accountId });
              }}
              className="rounded-lg bg-status-warning px-2.5 py-1 text-xs font-bold text-content-inverse hover:brightness-110"
            >
              {opp.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Glowing Vía Energy Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-accent-via">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Năng lượng Vía</span>
        </div>
        <span className="font-mono font-extrabold text-accent-via">{me.via} / 100</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-canvas">
        <div
          className="h-full rounded-full bg-accent-via shadow-viaGlow transition-all duration-300"
          style={{ width: `${Math.min(100, me.via)}%` }}
        />
      </div>

      {/* 3 Skill Buttons */}
      <div className="mt-0.5 grid grid-cols-3 gap-2">
        {skills.map((s) => (
          <button
            key={s.type}
            type="button"
            disabled={s.disabled}
            onClick={() => handleSkillClick(s.type)}
            className="flex flex-col items-start rounded-xl border border-border-subtle bg-surface-elevated px-2.5 py-2 text-left transition hover:border-border-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex w-full items-center justify-between text-accent-gold">
              {s.icon}
              <span className="font-mono text-[10px] font-bold text-content-muted">
                Lv.{s.level}
              </span>
            </div>
            <span className="mt-1 text-xs font-bold text-content-primary">{s.name}</span>
            <span className="font-mono text-[10px] font-semibold text-accent-via">
              {s.cost} Vía
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
