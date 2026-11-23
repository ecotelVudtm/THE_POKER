import { FormEvent, useState } from 'react';
import { Account, SkillType, SkinId, WinEffectId } from '../../types/game';
import { MAX_EQUIPPED_SKILLS, SKILL_CATALOG_BY_TYPE } from '../../utils/skillCatalog';
import { soundEngine } from '../../services/soundEngine';
import { VoxelIcon3D } from '../VoxelIcon3D';
import { GuideBookModal } from '../GuideBookModal';
import { SkillShopModal } from '../SkillShopModal';

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
  onJoinRoom: (roomId: string) => void;
}

export function LobbyView({
  account,
  onLogin,
  onRegister,
  onLogout,
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
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between bg-surface-canvas/40 p-8">
      {/* Top Bar: Left = Player & Chips ONLY | Center = Title | Right = Guide Book */}
      <div className="relative flex items-start justify-center">
        {account && (
          <div className="voxel-panel pointer-events-auto absolute left-0 top-0 flex items-center gap-3 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <VoxelIcon3D kind="player" size={20} title="Hồ sơ người chơi" />
              <span className="font-mono font-extrabold text-content-primary">
                {account.displayName}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <VoxelIcon3D kind="chip" size={20} title="Búng Chip 3D" />
              <span className="font-mono font-extrabold text-accent-gold">
                {account.chips.toLocaleString()} CHIP
              </span>
            </div>

            {/* Persistent Loan Balance Column (carries outside the table!) */}
            <div className="flex items-center gap-1.5 border-l-2 border-border-subtle pl-3">
              <VoxelIcon3D kind="phone" size={18} title="Khoản vay hiện tại" />
              <span
                className={`font-mono font-extrabold ${(account.loanBalance ?? 0) > 0
                  ? 'text-status-warning'
                  : 'text-content-muted'
                  }`}
              >
                VAY: {(account.loanBalance ?? 0).toLocaleString()}
              </span>
              {(account.loanBalance ?? 0) > 0 && account.chips >= account.loanBalance && (
                <button
                  type="button"
                  onClick={() => void onRepayLoan()}
                  className="voxel-btn ml-1 border border-accent-jade bg-accent-jade px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-content-inverse"
                >
                  TRẢ NỢ
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="voxel-btn border border-status-danger/70 bg-surface-panel px-2 py-0.5 font-mono text-[10px] font-bold text-status-danger"
            >
              ĐĂNG XUẤT
            </button>
          </div>
        )}

        <div className="text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-[0.2em] text-accent-gold drop-shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
            THE POKER
          </h1>
          <p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.3em] text-content-secondary">
            Thần Bài Đời Thường
          </p>
        </div>

        {/* Standalone 3D Voxel Guide Book: hover swings open the cover, click opens popup! */}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          title="Sổ Tay Thần Bài"
          aria-label="Mở Sổ Tay Thần Bài"
          className="pointer-events-auto absolute right-1 top-0 bg-transparent p-1 transition-transform hover:-translate-y-1"
        >
          <VoxelIcon3D kind="book" size={44} title="Sổ Tay Thần Bài" openOnHover />
        </button>
      </div>

      {/* Center Menu / Auth Box (100% Square Voxel UI) */}
      <div className="pointer-events-auto mx-auto w-full max-w-sm">
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
          <div className="flex flex-col gap-3">
            {/* Room Stake Tier Selector (500 -> 1TR, proportional SB/BB) */}
            <div className="voxel-panel-gold p-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px]">
                <span className="font-extrabold tracking-wider text-accent-gold">
                  MỨC SỚI (MANG TỐI ĐA)
                </span>
                <span className="font-bold text-content-secondary">
                  SB {activeTier.smallBlind.toLocaleString()} / BB{' '}
                  {activeTier.bigBlind.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
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
                      className={`voxel-btn border py-1.5 font-mono text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35 ${
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

            <button
              type="button"
              onClick={() => onCreateBotRoom(activeTier.maxBuyIn)}
              className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-3.5 font-mono text-sm font-extrabold tracking-widest text-content-inverse"
            >
              CHƠI NGAY VỚI 3 BOT ({activeTier.label})
            </button>

            <button
              type="button"
              onClick={() => onCreateOnlineRoom(activeTier.maxBuyIn)}
              className="voxel-btn w-full border-2 border-border-gold bg-surface-panel py-3 font-mono text-xs font-extrabold tracking-widest text-accent-gold"
            >
              TẠO BÀN ONLINE ({activeTier.label})
            </button>

            {!joinOpen ? (
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="voxel-btn w-full border-2 border-border-subtle bg-surface-canvas/90 py-3 font-mono text-xs font-bold tracking-widest text-content-primary"
              >
                VÀO BÀN BẰNG MÃ
              </button>
            ) : (
              <form onSubmit={handleJoinSubmit} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="MÃ PHÒNG"
                  maxLength={8}
                  className="voxel-input flex-1 px-3 py-2.5 font-mono text-sm uppercase tracking-widest text-content-primary"
                />
                <button
                  type="submit"
                  className="voxel-btn border-2 border-accent-jade bg-accent-jade px-5 font-mono text-xs font-extrabold tracking-wider text-content-inverse"
                >
                  VÀO
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => toggleShop(true)}
              className="voxel-btn flex w-full items-center justify-center gap-2 border-2 border-border-gold bg-surface-panel py-3 font-mono text-xs font-extrabold tracking-widest text-accent-gold"
            >
              <span>CỬA HÀNG &amp; TRANG BỊ</span>
              <span className="border border-border-gold/60 bg-surface-canvas px-1.5 py-0.5 text-[10px] text-accent-gold">
                {(account.equippedSkills ?? []).length}/{MAX_EQUIPPED_SKILLS}
              </span>
            </button>

            {(account.equippedSkills ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 font-mono text-[10px]">
                {account.equippedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="border border-border-gold/50 bg-surface-canvas/85 px-2 py-0.5 font-bold text-content-secondary"
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
