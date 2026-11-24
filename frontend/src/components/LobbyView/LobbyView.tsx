import { FormEvent, useState } from 'react';
import { Account, LoanPackage, SkillType, SkinId, WinEffectId } from '../../types/game';
import { MAX_EQUIPPED_SKILLS, SKILL_CATALOG_BY_TYPE } from '../../utils/skillCatalog';
import { soundEngine } from '../../services/soundEngine';
import { VoxelIcon3D } from '../VoxelIcon3D';
import { GuideBookModal } from '../GuideBookModal';
import { SkillShopModal } from '../SkillShopModal';

const LOBBY_LOAN_PACKAGES: { type: LoanPackage; label: string; amount: string }[] = [
  { type: 'CHIPS_2000', label: 'Vay Nhanh 2K', amount: '+2,000 CHIP' },
  { type: 'CHIPS_5000', label: 'Gói Vay 5K', amount: '+5,000 CHIP' },
  { type: 'CHIPS_10000', label: 'Gói Vay 10K', amount: '+10,000 CHIP' },
];

const ROOM_STAKE_TIERS = [
  { maxBuyIn: 500, label: '500', smallBlind: 10, bigBlind: 20 },
  { maxBuyIn: 1000, label: '1K', smallBlind: 20, bigBlind: 40 },
  { maxBuyIn: 5000, label: '5K', smallBlind: 100, bigBlind: 200 },
  { maxBuyIn: 10000, label: '10K', smallBlind: 200, bigBlind: 400 },
  { maxBuyIn: 50000, label: '50K', smallBlind: 1000, bigBlind: 2000 },
  { maxBuyIn: 100000, label: '100K', smallBlind: 2000, bigBlind: 4000 },
  { maxBuyIn: 500000, label: '500K', smallBlind: 10000, bigBlind: 20000 },
  { maxBuyIn: 1000000, label: '1TR', smallBlind: 20000, bigBlind: 40000 },
] as const;

export interface LobbyViewProps {
  account: Account | null;
  onLogin: (username: string, password: string) => Promise<Account>;
  onRegister: (username: string, password: string, displayName?: string) => Promise<Account>;
  onLogout: () => void;
  onTakeLoan: (packageType: LoanPackage) => Promise<void>;
  onRepayLoan: () => Promise<void>;
  onBuySkill: (skillType: SkillType, quantity?: number) => Promise<void>;
  onUpdateLoadout: (equippedSkills: SkillType[]) => Promise<void>;
  onBuySkin: (skinId: SkinId) => Promise<void>;
  onEquipSkin: (skinId: SkinId) => Promise<void>;
  onBuyWinEffect: (effectId: WinEffectId) => Promise<void>;
  onEquipWinEffect: (effectId: WinEffectId) => Promise<void>;
  onShopOpenChange?: (open: boolean) => void;
  onCreateBotRoom: (maxBuyIn: number) => void;
  onCreateOnlineRoom: (maxBuyIn: number) => void;
  onEnterArena: (maxBuyIn: number) => void;
  onJoinRoom: (roomId: string) => void;
}

export function LobbyView({
  account,
  onLogin,
  onRegister,
  onLogout,
  onTakeLoan,
  onRepayLoan,
  onBuySkill,
  onUpdateLoadout,
  onBuySkin,
  onEquipSkin,
  onBuyWinEffect,
  onEquipWinEffect,
  onShopOpenChange,
  onCreateBotRoom,
  onCreateOnlineRoom,
  onEnterArena,
  onJoinRoom,
}: LobbyViewProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [loanBusy, setLoanBusy] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [selectedMaxBuyIn, setSelectedMaxBuyIn] = useState<number>(10000);

  const activeTier =
    ROOM_STAKE_TIERS.find((t) => t.maxBuyIn === selectedMaxBuyIn) ?? ROOM_STAKE_TIERS[3];

  const toggleShop = (next: boolean) => {
    setShopOpen(next);
    onShopOpenChange?.(next);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (authTab === 'register') {
        await onRegister(username.trim(), password, displayName.trim() || undefined);
      } else {
        await onLogin(username.trim(), password);
      }
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    onJoinRoom(roomCode.trim());
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between bg-surface-canvas/40 px-8 py-6">
      {/* 2-Row Clean Header: Row 1 = Borderless Player Info (Left) + 3D Opening Book (Right); Row 2 = Centered Title (zero overlap!) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          {account ? (
            <div
              className="pointer-events-auto flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.92)' }}
            >
              <div className="flex items-center gap-1.5">
                <VoxelIcon3D kind="player" size={22} title="Hồ sơ người chơi" />
                <span className="font-mono text-sm font-extrabold text-content-primary">
                  {account.displayName}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <VoxelIcon3D kind="chip" size={20} title="Búng Chip 3D" />
                <span className="font-mono text-sm font-extrabold text-accent-gold">
                  {account.chips.toLocaleString()} CHIP
                </span>
              </div>

              <div
                className="flex items-center gap-1.5"
                title="Tờ 500.000 VNĐ — Chỉ nhận được trong Chế Độ Đấu Trường Thật (PvP)"
              >
                <VoxelIcon3D kind="vnd500k" size={20} title="Tờ 500.000 VNĐ" />
                <span className="font-mono text-sm font-extrabold text-accent-via">
                  {(account.vnd500kBills ?? 0).toLocaleString()} TỜ 500K
                </span>
              </div>

              {/* Lobby Loan Phone Trigger (borderless inline trigger) */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setLoanError(null);
                  setPhoneOpen(true);
                }}
                title="Mở Điện Thoại Vay Nóng / Trả Nợ ngoài sảnh"
                className="flex items-center gap-1.5 bg-transparent hover:brightness-125"
              >
                <VoxelIcon3D kind="phone" size={18} title="Điện thoại vay nóng" />
                <span
                  className={`font-mono text-xs font-extrabold underline decoration-dotted underline-offset-4 ${
                    (account.loanBalance ?? 0) > 0 ? 'text-status-warning' : 'text-content-secondary'
                  }`}
                >
                  {(account.loanBalance ?? 0) > 0
                    ? `VAY: ${account.loanBalance.toLocaleString()}`
                    : 'VAY NÓNG'}
                </span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="bg-transparent font-mono text-[11px] font-bold text-status-danger/90 hover:text-status-danger hover:underline"
              >
                [ĐĂNG XUẤT]
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Standalone Large 3D Voxel Guide Book: hover swings open the cover, click opens popup! */}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            title="Sổ Tay Thần Bài"
            aria-label="Mở Sổ Tay Thần Bài"
            className="pointer-events-auto shrink-0 bg-transparent p-1 transition-transform hover:-translate-y-1"
          >
            <VoxelIcon3D kind="book" size={48} title="Sổ Tay Thần Bài" openOnHover />
          </button>
        </div>

        {/* Row 2: Cleanly Centered Title (never collided with player info!) */}
        <div className="text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-[0.2em] text-accent-gold drop-shadow-[5px_5px_0_rgba(0,0,0,0.9)] sm:text-6xl">
            THE POKER
          </h1>
          <div className="mx-auto mt-1 inline-block border-y-2 border-border-gold/55 bg-surface-canvas/70 px-4 py-0.5 font-mono text-xs font-extrabold uppercase tracking-[0.34em] text-content-secondary">
            Thần Bài Đời Thường
          </div>
        </div>
      </div>

      {/* Center Menu / Auth Box (Larger, cleaner layout & better button hierarchy) */}
      <div className="pointer-events-auto mx-auto w-full max-w-md">
        {!account ? (
          <form onSubmit={handleAuthSubmit} className="voxel-panel-gold p-6">
            <div className="mb-5 grid grid-cols-2 border-b-2 border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setError(null);
                }}
                className={`pb-2.5 font-mono text-xs font-extrabold tracking-widest transition ${authTab === 'login'
                  ? 'border-b-4 border-accent-gold text-accent-gold'
                  : 'text-content-muted hover:text-content-primary'
                  }`}
              >
                ĐĂNG NHẬP
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setError(null);
                }}
                className={`pb-2.5 font-mono text-xs font-extrabold tracking-widest transition ${authTab === 'register'
                  ? 'border-b-4 border-accent-gold text-accent-gold'
                  : 'text-content-muted hover:text-content-primary'
                  }`}
              >
                ĐĂNG KÝ
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                minLength={2}
                maxLength={32}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                className="voxel-input w-full px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted"
              />

              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="voxel-input w-full px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted"
              />

              {authTab === 'register' && (
                <input
                  type="text"
                  maxLength={32}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Biệt danh trong sới (tuỳ chọn)"
                  className="voxel-input w-full px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted"
                />
              )}

              {error && (
                <div className="font-mono text-xs font-bold text-status-danger">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="voxel-btn mt-2 w-full border-2 border-border-gold bg-accent-gold py-3 font-mono text-xs font-extrabold tracking-widest text-content-inverse disabled:opacity-50"
              >
                {loading
                  ? 'ĐANG XỬ LÝ...'
                  : authTab === 'register'
                    ? 'TẠO TÀI KHOẢN & VÀO SỚI'
                    : 'VÀO SỚI'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Room Stake Tier Selector (500 -> 1TR, proportional SB/BB) */}
            <div className="voxel-panel-gold relative p-4">
              <span className="pointer-events-none absolute left-1.5 top-1.5 h-1.5 w-1.5 bg-accent-gold" />
              <span className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-accent-gold" />
              <div className="mb-2.5 flex items-center justify-between font-mono text-[11px]">
                <span className="font-extrabold tracking-wider text-accent-gold">
                  MỨC SỚI (MANG TỐI ĐA)
                </span>
                <span className="border border-border-subtle bg-surface-panel px-2 py-0.5 font-extrabold text-content-primary">
                  SB {activeTier.smallBlind.toLocaleString()} / BB{' '}
                  {activeTier.bigBlind.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ROOM_STAKE_TIERS.map((tier) => {
                  const isSelected = selectedMaxBuyIn === tier.maxBuyIn;
                  const canEnter = account.chips >= tier.bigBlind;
                  return (
                    <button
                      key={tier.maxBuyIn}
                      type="button"
                      disabled={!canEnter}
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSelectedMaxBuyIn(tier.maxBuyIn);
                      }}
                      className={`voxel-btn border-2 py-2 font-mono text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        isSelected
                          ? 'border-border-gold bg-accent-gold text-content-inverse'
                          : 'border-border-subtle bg-surface-canvas text-content-primary hover:border-border-gold hover:text-accent-gold'
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => onCreateBotRoom(activeTier.maxBuyIn)}
              className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-4 font-mono text-base font-extrabold tracking-widest text-content-inverse"
            >
              CHƠI NGAY VỚI 3 BOT ({activeTier.label})
            </button>

            {/* Real PvP Arena Mode (Earn 500,000 VND Polymer Bills!) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onEnterArena(activeTier.maxBuyIn);
              }}
              className="voxel-btn flex w-full flex-col items-center border-2 border-border-gold bg-surface-elevated px-4 py-3 text-center"
            >
              <span className="flex items-center gap-2 font-mono text-sm font-extrabold tracking-widest text-accent-gold">
                <VoxelIcon3D kind="vnd500k" size={20} title="Tờ 500.000 VNĐ" />
                ĐẤU TRƯỜNG THẬT · PvP ({activeTier.label})
              </span>
              <span className="mt-0.5 font-mono text-[10px] font-bold text-content-secondary">
                Chỉ người thật · Cứ lãi đủ +{activeTier.label} chip nhận +1 tờ 500.000 VNĐ
              </span>
            </button>

            {/* Secondary Multiplayer Row (2 clean side-by-side buttons) */}
            {!joinOpen ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onCreateOnlineRoom(activeTier.maxBuyIn)}
                  className="voxel-btn border-2 border-border-gold bg-surface-panel py-3.5 font-mono text-xs font-extrabold tracking-wider text-accent-gold"
                >
                  TẠO BÀN ONLINE ({activeTier.label})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setJoinOpen(true);
                  }}
                  className="voxel-btn border-2 border-border-gold/75 bg-surface-panel py-3.5 font-mono text-xs font-extrabold tracking-wider text-content-primary hover:border-border-gold hover:text-accent-gold"
                >
                  VÀO BÀN BẰNG MÃ
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="NHẬP MÃ PHÒNG..."
                  maxLength={8}
                  className="voxel-input flex-1 px-3.5 py-3 font-mono text-sm font-bold uppercase tracking-widest text-content-primary"
                />
                <button
                  type="submit"
                  className="voxel-btn border-2 border-accent-jade bg-accent-jade px-6 font-mono text-xs font-extrabold tracking-wider text-content-inverse"
                >
                  VÀO
                </button>
                <button
                  type="button"
                  onClick={() => setJoinOpen(false)}
                  className="voxel-btn border-2 border-border-subtle bg-surface-panel px-3 font-mono text-xs font-extrabold text-content-secondary"
                >
                  HỦY
                </button>
              </form>
            )}

            {/* Unified Shop & Loadout Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                toggleShop(true);
              }}
              className="voxel-btn flex w-full items-center justify-center gap-2.5 border-2 border-border-gold bg-surface-panel py-3.5 font-mono text-xs font-extrabold tracking-widest text-accent-gold"
            >
              <VoxelIcon3D kind="chip" size={18} />
              <span>CỬA HÀNG &amp; TRANG BỊ</span>
              <span className="border border-border-gold/70 bg-surface-canvas px-2 py-0.5 text-[10px] text-accent-gold">
                {(account.equippedSkills ?? []).length}/{MAX_EQUIPPED_SKILLS} LÁ PHÉP
              </span>
            </button>

            {(account.equippedSkills ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 font-mono text-[11px]">
                {account.equippedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="border border-border-gold/55 bg-surface-canvas/90 px-2.5 py-0.5 font-bold text-content-secondary"
                  >
                    {SKILL_CATALOG_BY_TYPE[sk]?.title ?? sk} (x{account.skillInventory?.[sk] ?? 0})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom clean corner hint */}
      <div className="flex items-end justify-end">
        <span className="font-mono text-[10px] text-content-muted">F3: Thông số hệ thống</span>
      </div>

      <GuideBookModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {account && phoneOpen && (
        <div
          onClick={() => setPhoneOpen(false)}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-surface-canvas/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="voxel-panel-gold w-full max-w-sm p-5"
          >
            <div className="flex items-center justify-between border-b-2 border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <VoxelIcon3D kind="phone" size={22} />
                <div>
                  <h3 className="font-display text-sm font-extrabold tracking-widest text-accent-gold">
                    ĐIỆN THOẠI VAY NÓNG
                  </h3>
                  <div className="font-mono text-[10px] text-content-muted">
                    Hạn mức tối đa 50,000 Chip · Lưu vĩnh viễn ngoài sảnh
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhoneOpen(false)}
                className="font-mono text-xs font-extrabold text-content-muted hover:text-accent-gold"
              >
                [X]
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between border border-border-subtle bg-surface-panel px-3 py-2 font-mono text-xs">
              <span className="text-content-secondary">KHOẢN NỢ HIỆN TẠI:</span>
              <span
                className={`font-extrabold ${
                  (account.loanBalance ?? 0) > 0 ? 'text-status-warning' : 'text-accent-jade'
                }`}
              >
                {(account.loanBalance ?? 0).toLocaleString()} CHIP
              </span>
            </div>

            {loanError && (
              <div className="mt-2 font-mono text-[11px] font-bold text-status-danger">
                {loanError}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {LOBBY_LOAN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.type}
                  type="button"
                  disabled={loanBusy}
                  onClick={async () => {
                    setLoanBusy(true);
                    setLoanError(null);
                    try {
                      await onTakeLoan(pkg.type);
                    } catch (err) {
                      setLoanError(err instanceof Error ? err.message : 'Vay thất bại.');
                    } finally {
                      setLoanBusy(false);
                    }
                  }}
                  className="voxel-btn flex w-full items-center justify-between border-2 border-border-gold bg-surface-panel px-3.5 py-2.5 font-mono text-xs font-extrabold text-content-primary hover:bg-surface-elevated disabled:opacity-40"
                >
                  <span>{pkg.label}</span>
                  <span className="text-accent-gold">{pkg.amount}</span>
                </button>
              ))}
            </div>

            {(account.loanBalance ?? 0) > 0 && (
              <button
                type="button"
                disabled={loanBusy || account.chips < account.loanBalance}
                onClick={async () => {
                  setLoanBusy(true);
                  setLoanError(null);
                  try {
                    await onRepayLoan();
                  } catch (err) {
                    setLoanError(err instanceof Error ? err.message : 'Trả nợ thất bại.');
                  } finally {
                    setLoanBusy(false);
                  }
                }}
                className="voxel-btn mt-3 w-full border-2 border-accent-jade bg-accent-jade py-2.5 font-mono text-xs font-extrabold tracking-widest text-content-inverse disabled:opacity-40"
              >
                TRẢ HẾT NỢ ({account.loanBalance.toLocaleString()} CHIP)
              </button>
            )}
          </div>
        </div>
      )}

      {account && (
        <SkillShopModal
          open={shopOpen}
          account={account}
          onClose={() => toggleShop(false)}
          onBuySkill={onBuySkill}
          onUpdateLoadout={onUpdateLoadout}
          onBuySkin={onBuySkin}
          onEquipSkin={onEquipSkin}
          onBuyWinEffect={onBuyWinEffect}
          onEquipWinEffect={onEquipWinEffect}
        />
      )}
    </div>
  );
}
