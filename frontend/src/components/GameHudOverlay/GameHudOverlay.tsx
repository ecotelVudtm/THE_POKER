import { useEffect, useState } from 'react';
import {
  Check,
  Coins,
  Copy,
  HelpCircle,
  LogOut,
  Phone,
  Play,
  Shield,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Account,
  BetAction,
  FilteredRoomState,
  PublicPlayerView,
  SkillType,
  ToastMessage,
} from '../../types/game';
import { soundEngine } from '../../services/soundEngine';
import { TimeBankWidget } from '../TimeBankWidget';
import { BetControlsBar } from '../BetControlsBar';
import { SkillActionBar } from '../SkillActionBar';
import { EventToastFeed } from '../EventToastFeed';

export interface GameHudOverlayProps {
  room: FilteredRoomState;
  account: Account;
  me: PublicPlayerView | null;
  muted: boolean;
  toasts: ToastMessage[];
  onToggleMute: () => void;
  onOpenPhone: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onPlaceBet: (action: BetAction, raiseAmount?: number) => void;
  onTriggerSkill: (
    skillType: SkillType,
    options?: { targetAccountId?: string; cardIndex?: 0 | 1 }
  ) => void;
}

const PHASE_LABELS: Record<FilteredRoomState['phase'], string> = {
  WAITING: 'CHỜ BẮT ĐẦU',
  PRE_FLOP: 'PRE-FLOP',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  SHOWDOWN: 'SHOWDOWN',
};

export function GameHudOverlay({
  room,
  account,
  me,
  muted,
  toasts,
  onToggleMute,
  onOpenPhone,
  onStartMatch,
  onLeaveRoom,
  onPlaceBet,
  onTriggerSkill,
}: GameHudOverlayProps) {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isHost = room.hostAccountId === account.id;
  const isMyTurn = Boolean(me && room.currentTurnAccountId === me.accountId);
  const toCall = me ? Math.max(0, room.currentBet - me.currentBet) : 0;
  const opponents = room.players.filter((p) => p.accountId !== account.id);
  const clockRunning = Boolean(
    me &&
      room.status === 'PLAYING' &&
      room.phase !== 'SHOWDOWN' &&
      (isMyTurn || me.phoneOpen || me.hasActiveChallenge)
  );

  // Synthesize subtle clock tick-tock when time bank drops below 15 seconds
  useEffect(() => {
    if (clockRunning && me && me.timeBankSeconds > 0 && me.timeBankSeconds < 15) {
      soundEngine.playTick(me.timeBankSeconds % 2 === 0);
    }
  }, [clockRunning, me?.timeBankSeconds]);

  const copyRoomCode = () => {
    void navigator.clipboard.writeText(room.id);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 1500);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Room Info & Phase */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border-subtle bg-surface-panel/90 px-3.5 py-2 shadow-warm backdrop-blur-md">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
              Mã phòng
            </div>
            <button
              type="button"
              onClick={copyRoomCode}
              className="flex items-center gap-1.5 font-mono text-sm font-extrabold text-accent-gold hover:brightness-110"
            >
              {room.id}
              {copiedRoom ? (
                <Check className="h-3.5 w-3.5 text-status-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="h-7 w-px bg-border-subtle" />

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
              Vòng cược • Ván #{room.handNumber}
            </div>
            <div className="text-xs font-extrabold text-content-primary">
              {PHASE_LABELS[room.phase]}
            </div>
          </div>

          <div className="h-7 w-px bg-border-subtle" />

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
              Pot hiện tại
            </div>
            <div className="font-mono text-sm font-extrabold text-accent-gold">
              {room.pot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Right Top Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {room.status === 'WAITING' && isHost && (
            <button
              type="button"
              disabled={room.players.length < 2}
              onClick={onStartMatch}
              className="flex items-center gap-1.5 rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-content-inverse shadow-goldGlow transition hover:brightness-110 disabled:opacity-45"
            >
              <Play className="h-3.5 w-3.5" />
              Bắt đầu chia bài ({room.players.length}/{room.maxPlayers})
            </button>
          )}

          {me && (
            <button
              type="button"
              onClick={onOpenPhone}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                me.activeLoan
                  ? 'border-status-warning bg-status-warning/20 text-status-warning'
                  : 'border-border-subtle bg-surface-panel/90 text-content-secondary hover:border-border-gold hover:text-accent-gold'
              }`}
            >
              <Phone className="h-4 w-4" />
              {me.activeLoan ? 'Trả nợ' : 'Vay nóng'}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            className="flex items-center justify-center rounded-xl border border-border-subtle bg-surface-panel/90 p-2 text-content-secondary hover:border-border-gold hover:text-accent-gold"
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-panel/90 px-3 py-2 text-xs font-semibold text-content-secondary hover:border-border-gold hover:text-accent-gold"
          >
            <HelpCircle className="h-4 w-4" />
            Hướng dẫn
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 rounded-xl border border-status-danger/40 bg-surface-panel/90 px-3 py-2 text-xs font-semibold text-status-danger hover:bg-status-danger hover:text-content-primary"
          >
            <LogOut className="h-4 w-4" />
            Rời bàn
          </button>
        </div>
      </div>

      {/* MIDDLE AREA: Left Toast Feed + Showdown Banner */}
      <div className="my-auto flex items-start justify-between gap-4">
        <EventToastFeed toasts={toasts} />

        {room.phase === 'SHOWDOWN' && room.lastWinners.length > 0 && (
          <div className="pointer-events-auto mx-auto rounded-2xl border border-border-gold bg-surface-panel/95 px-6 py-3 text-center shadow-goldGlow backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent-gold">
              Kết quả ván #{room.handNumber}
            </div>
            {room.lastWinners.map((w) => (
              <div key={w.accountId} className="mt-1 text-sm font-extrabold text-content-primary">
                🏆 {w.displayName} thắng{' '}
                <span className="font-mono text-accent-gold">+{w.amount.toLocaleString()}</span> (
                {w.handName})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CLUSTER */}
      {me && (
        <div className="grid items-end gap-3 lg:grid-cols-12">
          {/* Left: Personal Time Bank & Chips/Status */}
          <div className="flex flex-col gap-2 lg:col-span-3">
            <TimeBankWidget
              timeBankSeconds={me.timeBankSeconds}
              turnRemainingSeconds={me.turnRemainingSeconds}
              isMyTurn={isMyTurn}
              clockRunning={clockRunning}
            />
            <div className="pointer-events-auto flex items-center justify-between rounded-xl border border-border-subtle bg-surface-panel/90 px-3.5 py-2 shadow-warm backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-content-primary">
                <Coins className="h-4 w-4 text-accent-gold" />
                <span className="font-mono text-sm text-accent-gold">
                  {me.chips.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {me.statusEffects.mangoShield && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-accent-jade/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-jade">
                    <Shield className="h-3 w-3" /> Khiên
                  </span>
                )}
                {me.statusEffects.blessed && (
                  <span className="rounded bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-gold">
                    🪔 Phúc
                  </span>
                )}
                {me.activeLoan && (
                  <span className="rounded bg-status-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-status-warning">
                    📞 Nợ {me.activeLoan.currentOwed.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Vía Energy + 3 Skills */}
          <div className="lg:col-span-4">
            <SkillActionBar
              me={me}
              opponents={opponents}
              phase={room.phase}
              mastery={me.skillMastery ?? account.skillMastery}
              onTriggerSkill={onTriggerSkill}
            />
          </div>

          {/* Right: Poker Betting Controls */}
          <div className="lg:col-span-5">
            <BetControlsBar
              enabled={
                isMyTurn &&
                room.status === 'PLAYING' &&
                room.phase !== 'SHOWDOWN' &&
                !me.folded &&
                !me.allIn &&
                !me.eliminated
              }
              myChips={me.chips}
              toCall={toCall}
              minRaise={room.minRaise}
              pot={room.pot}
              onPlaceBet={onPlaceBet}
            />
          </div>
        </div>
      )}

      {/* Quick Guide Drawer */}
      {showGuide && (
        <div className="pointer-events-auto fixed right-4 top-20 z-30 w-80 rounded-2xl border border-border-gold/50 bg-surface-panel/95 p-4 text-xs shadow-warm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-accent-gold">Mẹo Thần Bài Đời Thường</h4>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="rounded p-1 text-content-muted hover:text-content-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-2.5 space-y-1.5 text-content-secondary">
            <li>• Bấm trực tiếp vào 5 đồ vật 3D ở góc bàn (Điện thoại, Bát hương, Xoài, Trà đá, Đồng xu) để kích hoạt.</li>
            <li>• Quỹ thời gian 05:00 chỉ đếm ngược khi đến lượt bạn hoặc khi mở điện thoại / mini-game.</li>
            <li>• Hồi +10 Vía sau mỗi vòng cược và +20 Vía khi thắng ván.</li>
            <li>• Dùng Space hoặc chuột để hoàn thành 3 Mini-game Tuyệt kỹ (cấp Thành thạo càng cao càng dễ!).</li>
          </ul>
        </div>
      )}
    </div>
  );
}
