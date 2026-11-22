import { FormEvent, useState } from 'react';
import { Bot, Copy, Check, LogIn, Sparkles, Trophy, Users, Coins } from 'lucide-react';
import { Account } from '../../types/game';

export interface LobbyViewProps {
  connected: boolean;
  account: Account | null;
  onLogin: (username: string, displayName?: string) => Promise<Account>;
  onCreateBotRoom: () => void;
  onCreateOnlineRoom: (roomName?: string) => void;
  onJoinRoom: (roomId: string) => void;
}

const MASTERY_META = [
  { key: 'sleightOfHand' as const, label: 'Tráo Bài Tay Áo', desc: 'Đổi 1 lá bài tẩy (Timing Bar)' },
  { key: 'eagleEye' as const, label: 'Tâm Nhãn Đọc Vị', desc: 'Soi lá bài sắp lật (Balance Circle)' },
  { key: 'pressureAura' as const, label: 'Tỏa Khí Thế', desc: 'Trừ 10s đối thủ (Rhythm Tap)' },
];

export function LobbyView({
  connected,
  account,
  onLogin,
  onCreateBotRoom,
  onCreateOnlineRoom,
  onJoinRoom,
}: LobbyViewProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(username.trim(), displayName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    onJoinRoom(roomCodeInput.trim());
  };

  const copyUsername = () => {
    if (!account) return;
    void navigator.clipboard.writeText(account.username);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-surface-canvas p-6">
      {/* Subtle warm radial glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgb(var(--surface-felt) / 0.35), transparent 65%)',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header Brand */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-gold/40 bg-surface-panel/80 px-3 py-1 text-xs font-semibold text-accent-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Texas Hold&apos;em 2.5D • Thần Bài Đời Thường
            </div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-content-primary">
              THE_POKER
            </h1>
            <p className="mt-1 text-sm text-content-secondary">
              Sới bài trà đá ấm cúng — đấu trí Poker, giữ Vía, dùng 5 bảo bối &amp; 3 tuyệt kỹ.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-panel px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-status-success' : 'bg-status-warning animate-pulse'
              }`}
            />
            <span className="text-content-secondary">
              {connected ? 'Đã kết nối máy chủ' : 'Đang kết nối...'}
            </span>
          </div>
        </div>

        {!account ? (
          /* Quick Login Card */
          <form
            onSubmit={handleLoginSubmit}
            className="mx-auto max-w-md rounded-2xl border border-border-gold/35 bg-surface-panel/95 p-6 shadow-warm backdrop-blur-md"
          >
            <h2 className="text-lg font-bold text-content-primary">Vào sới nhanh</h2>
            <p className="mt-1 text-xs text-content-muted">
              Nhập tên tài khoản để lưu Chip, Thành thạo tuyệt kỹ &amp; lịch sử nợ (collection{' '}
              <code className="font-mono text-accent-gold">accounts</code>).
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-content-secondary">
                  Tên đăng nhập (username) *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: thanbai_quan1"
                  className="w-full rounded-xl border border-border-subtle bg-surface-canvas px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-content-secondary">
                  Biệt danh hiển thị (tuỳ chọn)
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="vd: Anh Hai Trà Đá"
                  className="w-full rounded-xl border border-border-subtle bg-surface-canvas px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-border-gold focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gold px-4 py-3 text-sm font-bold text-content-inverse shadow-goldGlow transition hover:brightness-110 disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Đang vào sới...' : 'Đăng nhập & Nhận 10.000 Chip'}
              </button>
            </div>
          </form>
        ) : (
          /* Authenticated Lobby Dashboard */
          <div className="grid gap-5 md:grid-cols-12">
            {/* Left: Profile & Skill Mastery */}
            <div className="space-y-4 md:col-span-5">
              <div className="rounded-2xl border border-border-gold/35 bg-surface-panel/95 p-5 shadow-warm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-content-muted">Hồ sơ Thần Bài</div>
                    <h2 className="mt-0.5 text-xl font-extrabold text-content-primary">
                      {account.displayName}
                    </h2>
                    <button
                      type="button"
                      onClick={copyUsername}
                      className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-content-muted hover:text-accent-gold"
                    >
                      @{account.username}
                      {copiedId ? (
                        <Check className="h-3 w-3 text-status-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="rounded-xl border border-border-gold/40 bg-surface-elevated px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 text-[11px] text-content-muted">
                      <Coins className="h-3.5 w-3.5 text-accent-gold" />
                      Chip hiện có
                    </div>
                    <div className="font-mono text-lg font-extrabold text-accent-gold">
                      {account.chips.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-canvas/70 p-2.5 text-center">
                  <div>
                    <div className="text-[10px] text-content-muted">Thắng</div>
                    <div className="font-mono text-sm font-bold text-accent-jade">
                      {account.stats.wins}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-content-muted">Trận đấu</div>
                    <div className="font-mono text-sm font-bold text-content-primary">
                      {account.stats.matchesPlayed}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-content-muted">Lộ tẩy</div>
                    <div className="font-mono text-sm font-bold text-status-danger">
                      {account.stats.caughtCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Mastery Card */}
              <div className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-5 shadow-warm">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-content-primary">
                  <Trophy className="h-4 w-4 text-accent-gold" />
                  Thành thạo 3 Tuyệt Kỹ
                </div>
                <div className="space-y-3">
                  {MASTERY_META.map((item) => {
                    const prog = account.skillMastery[item.key];
                    const expNeeded = prog.level * 100;
                    const pct = Math.min(100, Math.round((prog.exp / expNeeded) * 100));
                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-content-primary">{item.label}</span>
                          <span className="font-mono font-bold text-accent-gold">
                            Lv.{prog.level}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-canvas">
                          <div
                            className="h-full rounded-full bg-accent-via transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[10px] text-content-muted">
                          <span>{item.desc}</span>
                          <span className="font-mono">
                            {prog.exp}/{expNeeded} EXP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Play Modes */}
            <div className="space-y-4 md:col-span-7">
              {/* Instant Solo vs 3 Bots */}
              <div className="rounded-2xl border border-border-gold/50 bg-surface-elevated/90 p-5 shadow-warm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-accent-jade/20 px-2.5 py-0.5 text-[11px] font-bold text-accent-jade">
                      Khuyên dùng để trải nghiệm ngay
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-content-primary">
                      Chơi ngay với 3 Bot Đời Thường
                    </h3>
                    <p className="mt-1 text-xs text-content-secondary">
                      Đấu cùng Chú Bảy Trà Đá, Cô Tư Xoài Lắc và Anh Ba Thần Bài. Đầy đủ quỹ thời
                      gian 5 phút, Vía, 5 bảo bối &amp; 3 tuyệt kỹ.
                    </p>
                  </div>
                  <Bot className="h-10 w-10 shrink-0 text-accent-gold" />
                </div>
                <button
                  type="button"
                  onClick={onCreateBotRoom}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gold px-4 py-3 text-sm font-extrabold text-content-inverse shadow-goldGlow transition hover:brightness-110"
                >
                  <Bot className="h-4 w-4" />
                  Chơi ngay với Bot (1 vs 3)
                </button>
              </div>

              {/* Create Online Room */}
              <div className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-5 shadow-warm">
                <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                  <Users className="h-4 w-4 text-accent-via" />
                  Tạo phòng Online (Sinh mã 6 ký tự)
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder={`Sới của ${account.displayName}`}
                    className="flex-1 rounded-xl border border-border-subtle bg-surface-canvas px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onCreateOnlineRoom(roomNameInput.trim() || undefined)}
                    className="rounded-xl border border-border-gold/60 bg-surface-elevated px-4 py-2.5 text-sm font-bold text-accent-gold transition hover:bg-accent-gold hover:text-content-inverse"
                  >
                    Tạo phòng Online
                  </button>
                </div>
              </div>

              {/* Join Room by Code */}
              <form
                onSubmit={handleJoinSubmit}
                className="rounded-2xl border border-border-subtle bg-surface-panel/95 p-5 shadow-warm"
              >
                <div className="text-sm font-bold text-content-primary">Vào phòng bằng mã</div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã phòng (vd: A1B2C3)"
                    maxLength={8}
                    className="flex-1 rounded-xl border border-border-subtle bg-surface-canvas px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-content-primary placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-content-muted focus:border-border-gold focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!roomCodeInput.trim()}
                    className="rounded-xl bg-accent-jade px-5 py-2.5 text-sm font-bold text-content-inverse transition hover:brightness-110 disabled:opacity-45"
                  >
                    Vào bàn
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
