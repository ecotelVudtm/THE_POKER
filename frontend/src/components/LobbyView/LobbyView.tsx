import { FormEvent, useState } from 'react';
import { Account } from '../../types/game';
import { VoxelIcon3D } from '../VoxelIcon3D';
import { GuideBookModal } from '../GuideBookModal';

export interface LobbyViewProps {
  account: Account | null;
  onLogin: (username: string, password: string) => Promise<Account>;
  onRegister: (username: string, password: string, displayName?: string) => Promise<Account>;
  onLogout: () => void;
  onCreateBotRoom: () => void;
  onCreateOnlineRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function LobbyView({
  account,
  onLogin,
  onRegister,
  onLogout,
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

        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="voxel-btn pointer-events-auto absolute right-0 top-0 flex items-center gap-2 border-2 border-border-gold bg-surface-panel px-3.5 py-2 font-mono text-xs font-extrabold text-accent-gold"
        >
          <VoxelIcon3D kind="book" size={18} title="Mở Sổ Tay Thần Bài" />
          SỔ TAY HƯỚNG DẪN
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
                className={`pb-2.5 font-mono text-xs font-extrabold tracking-widest transition ${
                  authTab === 'login'
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
                className={`pb-2.5 font-mono text-xs font-extrabold tracking-widest transition ${
                  authTab === 'register'
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
            <button
              type="button"
              onClick={onCreateBotRoom}
              className="voxel-btn w-full border-2 border-border-gold bg-accent-gold py-3.5 font-mono text-sm font-extrabold tracking-widest text-content-inverse"
            >
              CHƠI NGAY VỚI 3 BOT
            </button>

            <button
              type="button"
              onClick={onCreateOnlineRoom}
              className="voxel-btn w-full border-2 border-border-gold bg-surface-panel py-3 font-mono text-xs font-extrabold tracking-widest text-accent-gold"
            >
              TẠO BÀN ONLINE
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
          </div>
        )}
      </div>

      {/* Bottom clean corner hint */}
      <div className="flex items-end justify-end">
        <span className="font-mono text-[10px] text-content-muted">F3: Thông số hệ thống</span>
      </div>

      <GuideBookModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
