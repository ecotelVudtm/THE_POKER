import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Account, SkillType, SkinId, WinEffectId } from '../../types/game';
import { soundEngine } from '../../services/soundEngine';
import { SCENE_TOKENS } from '../../styles/themeTokens';
import { MAX_EQUIPPED_SKILLS, SKILL_CATALOG } from '../../utils/skillCatalog';
import {
  SKIN_CATALOG,
  SKIN_CATALOG_BY_ID,
  SkinTier,
  WIN_EFFECT_BY_ID,
  WIN_EFFECT_CATALOG,
} from '../../utils/cosmeticCatalog';
import { VoxelAvatar3D } from '../../scenes/VoxelAvatar3D';
import { WinEffects3D } from '../../scenes/WinEffects3D';
import { VoxelIcon3D } from '../VoxelIcon3D';

export interface SkillShopModalProps {
  open: boolean;
  account: Account;
  onClose: () => void;
  onBuySkill: (skillType: SkillType, quantity?: number) => Promise<void>;
  onUpdateLoadout: (equippedSkills: SkillType[]) => Promise<void>;
  onBuySkin: (skinId: SkinId) => Promise<void>;
  onEquipSkin: (skinId: SkinId) => Promise<void>;
  onBuyWinEffect: (effectId: WinEffectId) => Promise<void>;
  onEquipWinEffect: (effectId: WinEffectId) => Promise<void>;
}

type ShopTab = 'skills' | 'skins' | 'win_effects';

const TIER_GROUPS: { tier: SkinTier; heading: string }[] = [
  { tier: 'FREE', heading: 'MẶC ĐỊNH' },
  { tier: 'BASIC', heading: 'HẠNG CƠ BẢN · TỪ 1,000 CHIP (KÍNH, TÓC, ÁO)' },
  { tier: 'HAT', heading: 'HẠNG SANG · TỪ 10,000 CHIP (MŨ & VƯƠNG MIỆN 3D)' },
  { tier: 'AURA', heading: 'HẠNG HUYỀN ẢO · TỪ 50,000 CHIP (ĐOM ĐÓM & NEON)' },
  { tier: 'LEGENDARY', heading: 'HẠNG HUYỀN THOẠI · TỪ 100,000 CHIP (HOẠT ẢNH ĐẶC BIỆT)' },
];

export function SkillShopModal({
  open,
  account,
  onClose,
  onBuySkill,
  onUpdateLoadout,
  onBuySkin,
  onEquipSkin,
  onBuyWinEffect,
  onEquipWinEffect,
}: SkillShopModalProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>('skills');
  const [previewSkin, setPreviewSkin] = useState<SkinId>(account.equippedSkin ?? 'DEFAULT');
  const [previewEffect, setPreviewEffect] = useState<WinEffectId>(
    account.equippedWinEffect && account.equippedWinEffect !== 'NONE'
      ? account.equippedWinEffect
      : 'CONFETTI'
  );
  const [effectReplayKey, setEffectReplayKey] = useState<number>(1);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const inventory = account.skillInventory ?? {
    SLEIGHT_OF_HAND: 0,
    EAGLE_EYE: 0,
    PRESSURE_AURA: 0,
    VIA_SIPHON: 0,
    TIME_FREEZE: 0,
    POKER_FACE: 0,
  };
  const equipped = account.equippedSkills ?? [];
  const ownedSkins = account.ownedSkins ?? ['DEFAULT'];
  const equippedSkin = account.equippedSkin ?? 'DEFAULT';
  const ownedEffects = account.ownedWinEffects ?? ['NONE'];
  const equippedEffect = account.equippedWinEffect ?? 'NONE';

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setError(null);
    setBusyKey(key);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleEquipSkill = async (skillType: SkillType) => {
    const isEquipped = equipped.includes(skillType);
    let next: SkillType[];
    if (isEquipped) {
      next = equipped.filter((s) => s !== skillType);
    } else {
      if (equipped.length >= MAX_EQUIPPED_SKILLS) {
        setError(`Chỉ được mang tối đa ${MAX_EQUIPPED_SKILLS} lá phép vào bàn!`);
        return;
      }
      if ((inventory[skillType] ?? 0) < 1) {
        setError('Bạn cần mua ít nhất 1 lượt tuyệt kỹ này trước khi trang bị!');
        return;
      }
      next = [...equipped, skillType];
    }
    await runAction(`equip_${skillType}`, () => onUpdateLoadout(next));
  };

  const currentSkinDef = SKIN_CATALOG_BY_ID[previewSkin] ?? SKIN_CATALOG_BY_ID.DEFAULT;
  const currentSkinOwned = ownedSkins.includes(currentSkinDef.id);
  const currentSkinEquipped = equippedSkin === currentSkinDef.id;
  const canAffordCurrentSkin = account.chips >= currentSkinDef.price;

  const currentEffectDef = WIN_EFFECT_BY_ID[previewEffect] ?? WIN_EFFECT_BY_ID.NONE;
  const currentEffectOwned = ownedEffects.includes(currentEffectDef.id);
  const currentEffectEquipped = equippedEffect === currentEffectDef.id;
  const canAffordCurrentEffect = account.chips >= currentEffectDef.price;

  const isBusy = busyKey !== null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-surface-canvas">
      {/* FULL-SCREEN SHOP TOP BAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border-gold bg-surface-panel px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn border-2 border-border-gold bg-surface-canvas px-4 py-2 font-mono text-xs font-extrabold tracking-wider text-accent-gold hover:bg-accent-gold hover:text-content-inverse"
          >
            &lt; QUAY LẠI SẢNH
          </button>

          <div className="hidden h-6 w-[2px] bg-border-subtle sm:block" />

          <div className="flex items-center gap-2.5">
            <VoxelIcon3D kind="chip" size={22} title="Cửa Hàng Thần Bài" />
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-[0.15em] text-accent-gold">
                CỬA HÀNG THẦN BÀI
              </h1>
              <div className="font-mono text-[10px] text-content-muted">
                TRANG BỊ LÁ PHÉP · SKIN 3D · HIỆU ỨNG CHIẾN THẮNG
              </div>
            </div>
          </div>
        </div>

        {/* Center Segmented Navigation Tabs */}
        <nav className="flex border-2 border-border-gold bg-surface-canvas font-mono text-xs font-extrabold">
          {[
            { id: 'skills' as const, label: `LÁ PHÉP (${equipped.length}/${MAX_EQUIPPED_SKILLS})` },
            { id: 'skins' as const, label: `SKIN 3D (${ownedSkins.length}/${SKIN_CATALOG.length})` },
            {
              id: 'win_effects' as const,
              label: `HIỆU ỨNG THẮNG (${ownedEffects.length}/${WIN_EFFECT_CATALOG.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`border-r border-border-subtle px-5 py-2 transition last:border-r-0 ${
                activeTab === tab.id
                  ? 'bg-accent-gold text-content-inverse'
                  : 'text-content-secondary hover:bg-surface-elevated hover:text-accent-gold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Chip Balance */}
        <div className="flex items-center gap-2 border-2 border-border-gold bg-surface-canvas px-4 py-1.5 font-mono text-sm font-extrabold text-accent-gold">
          <VoxelIcon3D kind="chip" size={18} />
          {account.chips.toLocaleString()} CHIP
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="border-b-2 border-status-danger bg-status-danger/20 px-6 py-2 font-mono text-xs font-bold text-status-danger">
          {error}
        </div>
      )}

      {/* TAB 1: FULL-SCREEN 6 SPELL CARDS */}
      {activeTab === 'skills' && (
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-border-gold/70 bg-surface-panel px-5 py-3 font-mono text-xs">
              <div className="text-content-secondary">
                <strong className="text-accent-gold">QUY TẮC:</strong> Mua cộng dồn lượt dùng để
                dành. Chọn mang tối đa{' '}
                <strong className="text-content-primary">{MAX_EQUIPPED_SKILLS} lá phép</strong> vào
                bàn (mỗi trận mới trừ 1 lượt/lá).
              </div>
              <div className="border border-accent-gold bg-surface-canvas px-3 py-1 font-extrabold text-accent-gold">
                ĐANG MANG: {equipped.length} / {MAX_EQUIPPED_SKILLS} LÁ
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SKILL_CATALOG.map((skill) => {
                const count = inventory[skill.type] ?? 0;
                const isEquipped = equipped.includes(skill.type);
                const canBuy1 = account.chips >= skill.shopPrice;
                const canBuy3 = account.chips >= skill.shopPrice * 3;
                const canEquip = isEquipped || (count > 0 && equipped.length < MAX_EQUIPPED_SKILLS);

                return (
                  <div
                    key={skill.type}
                    className={`flex flex-col justify-between border-2 p-4 transition ${
                      isEquipped
                        ? 'border-accent-gold bg-surface-elevated shadow-[4px_4px_0_rgba(0,0,0,0.8)]'
                        : 'border-border-subtle bg-surface-panel'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center border-2 ${skill.innerFrameCls}`}
                          >
                            <VoxelIcon3D kind={skill.iconKind} size={28} title={skill.fullName} />
                          </div>
                          <div>
                            <div className={`font-display text-base font-extrabold ${skill.titleCls}`}>
                              {skill.fullName}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                              <span className={`px-1.5 py-0.5 font-extrabold ${skill.costBgCls}`}>
                                {skill.viaCost} VÍA
                              </span>
                              <span className="border border-border-subtle bg-surface-canvas px-1.5 py-0.5 text-content-muted">
                                {skill.miniGameLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border border-border-subtle bg-surface-canvas px-2.5 py-1 text-right font-mono">
                          <div className="text-[9px] text-content-muted">TỒN KHO</div>
                          <div
                            className={`text-sm font-extrabold ${
                              count > 0 ? 'text-accent-jade' : 'text-status-danger'
                            }`}
                          >
                            x{count}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-content-secondary">
                        {skill.shortDesc}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-border-subtle pt-3">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-content-muted">GIÁ SHOP:</span>
                        <span className="font-extrabold text-accent-gold">
                          {skill.shopPrice.toLocaleString()} CHIP / TRẬN
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!canBuy1 || isBusy}
                          onClick={() =>
                            void runAction(`buy_${skill.type}_1`, () => onBuySkill(skill.type, 1))
                          }
                          className="voxel-btn border-2 border-border-gold bg-surface-canvas py-2 font-mono text-xs font-extrabold text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          MUA +1
                        </button>
                        <button
                          type="button"
                          disabled={!canBuy3 || isBusy}
                          onClick={() =>
                            void runAction(`buy_${skill.type}_3`, () => onBuySkill(skill.type, 3))
                          }
                          className="voxel-btn border-2 border-border-gold bg-accent-gold py-2 font-mono text-xs font-extrabold text-content-inverse disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          MUA +3 ({(skill.shopPrice * 3).toLocaleString()})
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={!canEquip || isBusy}
                        onClick={() => void handleToggleEquipSkill(skill.type)}
                        className={`voxel-btn w-full border-2 py-2 font-mono text-xs font-extrabold tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${
                          isEquipped
                            ? 'border-accent-jade bg-accent-jade text-content-inverse'
                            : 'border-border-gold bg-surface-canvas text-accent-gold hover:bg-accent-gold hover:text-content-inverse'
                        }`}
                      >
                        {isEquipped
                          ? 'ĐANG MANG VÀO BÀN [BỎ CHỌN]'
                          : count > 0
                            ? 'MANG VÀO BÀN'
                            : 'HẾT LƯỢT — CẦN MUA THÊM'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: FULL-SCREEN 3D SKIN SHOWCASE + TIERED CATALOG */}
      {activeTab === 'skins' && (
        <main className="grid flex-1 overflow-hidden lg:grid-cols-12">
          {/* LEFT: FULL-HEIGHT INTERACTIVE 3D CHARACTER STAGE */}
          <section className="relative flex flex-col border-b-2 border-border-gold bg-surface-canvas lg:col-span-5 lg:border-b-0 lg:border-r-2">
            {/* Stage Top Badge */}
            <div className="pointer-events-none absolute left-5 top-4 z-10 flex items-center gap-2 font-mono">
              <span className="border-2 border-border-gold bg-surface-panel/90 px-2.5 py-1 text-[10px] font-extrabold text-accent-gold">
                {currentSkinDef.tierLabel}
              </span>
              <span className="bg-surface-canvas/80 px-2 py-1 text-[10px] text-content-muted">
                KÉO CHUỘT ĐỂ XOAY 360°
              </span>
            </div>

            {/* Tall 3D Canvas — properly framed from pedestal to top hat & flying doves! */}
            <div className="min-h-[340px] flex-1">
              <Canvas camera={{ position: [0, 1.55, 3.85], fov: 36 }}>
                <color attach="background" args={[SCENE_TOKENS.environment.backdrop]} />
                <ambientLight intensity={0.9} color={SCENE_TOKENS.environment.ambientWarm} />
                <hemisphereLight
                  args={[SCENE_TOKENS.environment.lampWarm, SCENE_TOKENS.environment.backdrop, 0.55]}
                />
                <directionalLight
                  position={[2.5, 5, 3.5]}
                  intensity={2.0}
                  color={SCENE_TOKENS.environment.lampWarm}
                />
                <pointLight
                  position={[-2.8, 2.5, 2.2]}
                  intensity={0.9}
                  color={SCENE_TOKENS.environment.rimWarm}
                />
                <OrbitControls
                  target={[0, 1.05, 0]}
                  enablePan={false}
                  minDistance={2.6}
                  maxDistance={5.5}
                  minPolarAngle={0.6}
                  maxPolarAngle={1.65}
                />
                <group position={[0, 0, 0]}>
                  {/* Showcase Voxel Podium */}
                  <mesh position={[0, 0.08, 0]}>
                    <boxGeometry args={[1.35, 0.16, 1.35]} />
                    <meshStandardMaterial color={SCENE_TOKENS.seats.pedestal} roughness={0.7} />
                  </mesh>
                  <mesh position={[0, 0.17, 0]}>
                    <boxGeometry args={[1.15, 0.03, 1.15]} />
                    <meshStandardMaterial
                      color={SCENE_TOKENS.table.woodGoldInlay}
                      metalness={0.65}
                      roughness={0.35}
                    />
                  </mesh>
                  <VoxelAvatar3D skinId={previewSkin} seatIndex={0} turntable />
                </group>
              </Canvas>
            </div>

            {/* Stage Bottom Action Bar */}
            <div className="border-t-2 border-border-subtle bg-surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-accent-gold">
                    {currentSkinDef.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                    {currentSkinDef.desc}
                  </p>
                </div>
                <div className="shrink-0 font-mono text-sm font-extrabold text-accent-gold">
                  {currentSkinDef.price === 0
                    ? 'MIỄN PHÍ'
                    : `${currentSkinDef.price.toLocaleString()} CHIP`}
                </div>
              </div>

              <div className="mt-4">
                {currentSkinEquipped ? (
                  <div className="border-2 border-accent-jade bg-accent-jade/15 py-2.5 text-center font-mono text-xs font-extrabold tracking-widest text-accent-jade">
                    ĐANG MẶC SKIN NÀY
                  </div>
                ) : currentSkinOwned ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      void runAction(`equip_skin_${currentSkinDef.id}`, () =>
                        onEquipSkin(currentSkinDef.id)
                      )
                    }
                    className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-2.5 font-mono text-xs font-extrabold tracking-widest text-content-inverse"
                  >
                    MẶC SKIN NÀY
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAffordCurrentSkin || isBusy}
                    onClick={() =>
                      void runAction(`buy_skin_${currentSkinDef.id}`, () =>
                        onBuySkin(currentSkinDef.id)
                      )
                    }
                    className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-2.5 font-mono text-xs font-extrabold tracking-widest text-content-inverse disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canAffordCurrentSkin
                      ? `MUA VĨNH VIỄN (${currentSkinDef.price.toLocaleString()} CHIP)`
                      : `CHƯA ĐỦ CHIP (CẦN ${currentSkinDef.price.toLocaleString()})`}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: SPACIOUS TIERED SKIN CATALOG */}
          <section className="flex-1 overflow-y-auto bg-surface-panel/60 p-6 lg:col-span-7">
            <div className="space-y-6">
              {TIER_GROUPS.map(({ tier, heading }) => {
                const skinsInTier = SKIN_CATALOG.filter((s) => s.tier === tier);
                if (skinsInTier.length === 0) return null;
                return (
                  <div key={tier}>
                    <div className="mb-2.5 border-b border-border-gold/40 pb-1 font-mono text-[11px] font-extrabold tracking-wider text-accent-gold">
                      {heading}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {skinsInTier.map((skin) => {
                        const isOwned = ownedSkins.includes(skin.id);
                        const isEquipped = equippedSkin === skin.id;
                        const isSelected = previewSkin === skin.id;

                        return (
                          <button
                            key={skin.id}
                            type="button"
                            onClick={() => setPreviewSkin(skin.id)}
                            className={`flex flex-col justify-between border-2 p-3.5 text-left transition ${
                              isSelected
                                ? 'border-accent-gold bg-surface-elevated shadow-[3px_3px_0_rgba(0,0,0,0.8)]'
                                : 'border-border-subtle bg-surface-canvas/90 hover:border-border-gold/70'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                                <span
                                  className={`font-extrabold ${
                                    isEquipped
                                      ? 'text-accent-jade'
                                      : isOwned
                                        ? 'text-accent-via'
                                        : 'text-accent-gold'
                                  }`}
                                >
                                  {isEquipped
                                    ? 'ĐANG MẶC'
                                    : isOwned
                                      ? 'ĐÃ SỞ HỮU'
                                      : `${skin.price.toLocaleString()} CHIP`}
                                </span>
                              </div>
                              <div className="mt-1 font-display text-sm font-extrabold text-content-primary">
                                {skin.name}
                              </div>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-content-secondary">
                                {skin.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* TAB 3: FULL-SCREEN 3D WIN EFFECTS STAGE + CATALOG */}
      {activeTab === 'win_effects' && (
        <main className="grid flex-1 overflow-hidden lg:grid-cols-12">
          {/* LEFT: FULL-HEIGHT 3D TABLE CENTER EFFECT STAGE */}
          <section className="relative flex flex-col border-b-2 border-border-gold bg-surface-canvas lg:col-span-6 lg:border-b-0 lg:border-r-2">
            <div className="absolute left-5 top-4 z-10 flex items-center gap-2 font-mono">
              <span className="border-2 border-border-gold bg-surface-panel/90 px-2.5 py-1 text-[10px] font-extrabold text-accent-gold">
                MÔ PHỎNG GIỮA BÀN
              </span>
              <button
                type="button"
                onClick={() => {
                  setEffectReplayKey((k) => k + 1);
                  soundEngine.playWinEffectSound(previewEffect);
                }}
                className="voxel-btn border-2 border-border-gold bg-accent-gold px-3 py-1 text-[10px] font-extrabold text-content-inverse"
              >
                PHÁT LẠI HIỆU ỨNG
              </button>
            </div>

            <div className="min-h-[340px] flex-1">
              <Canvas camera={{ position: [0, 3.8, 5.8], fov: 42 }}>
                <color attach="background" args={[SCENE_TOKENS.environment.backdrop]} />
                <ambientLight intensity={0.8} color={SCENE_TOKENS.environment.ambientWarm} />
                <directionalLight
                  position={[2, 6, 4]}
                  intensity={1.7}
                  color={SCENE_TOKENS.environment.lampWarm}
                />
                <OrbitControls
                  target={[0, 1.1, 0.15]}
                  enablePan={false}
                  minDistance={4}
                  maxDistance={9}
                />
                <mesh position={[0, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[6.4, 4.6]} />
                  <meshStandardMaterial color={SCENE_TOKENS.table.feltBase} roughness={0.9} />
                </mesh>
                <WinEffects3D
                  effectId={previewEffect}
                  handKey={`preview_${previewEffect}_${effectReplayKey}`}
                />
              </Canvas>
            </div>

            <div className="border-t-2 border-border-subtle bg-surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-accent-gold">
                    {currentEffectDef.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                    {currentEffectDef.desc}
                  </p>
                </div>
                <div className="shrink-0 font-mono text-sm font-extrabold text-accent-gold">
                  {currentEffectDef.price === 0
                    ? 'MIỄN PHÍ'
                    : `${currentEffectDef.price.toLocaleString()} CHIP`}
                </div>
              </div>

              <div className="mt-4">
                {currentEffectEquipped ? (
                  <div className="border-2 border-accent-jade bg-accent-jade/15 py-2.5 text-center font-mono text-xs font-extrabold tracking-widest text-accent-jade">
                    ĐANG TRANG BỊ HIỆU ỨNG NÀY
                  </div>
                ) : currentEffectOwned ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      void runAction(`equip_fx_${currentEffectDef.id}`, () =>
                        onEquipWinEffect(currentEffectDef.id)
                      )
                    }
                    className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-2.5 font-mono text-xs font-extrabold tracking-widest text-content-inverse"
                  >
                    TRANG BỊ HIỆU ỨNG NÀY
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAffordCurrentEffect || isBusy}
                    onClick={() =>
                      void runAction(`buy_fx_${currentEffectDef.id}`, () =>
                        onBuyWinEffect(currentEffectDef.id)
                      )
                    }
                    className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-2.5 font-mono text-xs font-extrabold tracking-widest text-content-inverse disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canAffordCurrentEffect
                      ? `MUA VĨNH VIỄN (${currentEffectDef.price.toLocaleString()} CHIP)`
                      : `CHƯA ĐỦ CHIP (CẦN ${currentEffectDef.price.toLocaleString()})`}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: SPACIOUS WIN EFFECT CATALOG */}
          <section className="flex-1 overflow-y-auto bg-surface-panel/60 p-6 lg:col-span-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {WIN_EFFECT_CATALOG.map((fx) => {
                const isOwned = ownedEffects.includes(fx.id);
                const isEquipped = equippedEffect === fx.id;
                const isSelected = previewEffect === fx.id;

                return (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => {
                      setPreviewEffect(fx.id);
                      setEffectReplayKey((k) => k + 1);
                      soundEngine.playWinEffectSound(fx.id);
                    }}
                    className={`flex flex-col justify-between border-2 p-4 text-left transition ${
                      isSelected
                        ? 'border-accent-gold bg-surface-elevated shadow-[3px_3px_0_rgba(0,0,0,0.8)]'
                        : 'border-border-subtle bg-surface-canvas/90 hover:border-border-gold/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <span className={`border px-1.5 py-0.5 text-[9px] font-extrabold ${fx.badgeCls}`}>
                          {fx.tag}
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            isEquipped
                              ? 'text-accent-jade'
                              : isOwned
                                ? 'text-accent-via'
                                : 'text-accent-gold'
                          }`}
                        >
                          {isEquipped
                            ? 'ĐANG DÙNG'
                            : isOwned
                              ? 'ĐÃ SỞ HỮU'
                              : fx.price === 0
                                ? 'MIỄN PHÍ'
                                : `${fx.price.toLocaleString()} CHIP`}
                        </span>
                      </div>

                      <div className="mt-2 font-display text-base font-extrabold text-content-primary">
                        {fx.name}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                        {fx.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
