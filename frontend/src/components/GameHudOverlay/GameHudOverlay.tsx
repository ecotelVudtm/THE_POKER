import { useEffect, useState } from 'react';
import {
  Account,
  BetAction,
  Card,
  FilteredRoomState,
  PublicPlayerView,
  SkillType,
  ToastMessage,
} from '../../types/game';
import { soundEngine } from '../../services/soundEngine';
import { breakDownChips } from '../../utils/chipDenominations';
import { TimeBankWidget } from '../TimeBankWidget';
import { BetControlsBar } from '../BetControlsBar';
import { SkillActionBar } from '../SkillActionBar';
import { EventToastFeed } from '../EventToastFeed';
import { VoxelIcon3D } from '../VoxelIcon3D';

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
  WAITING: 'CHỜ CHIA BÀI',
  PRE_FLOP: 'PRE-FLOP',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  SHOWDOWN: 'SHOWDOWN',
};

const SUIT_SYMBOL: Record<Card['suit'], string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

function formatRank(rank: Card['rank']): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function GameHudOverlay({
  room,
  account,
  me,
  muted,
  toasts,
  onToggleMute,
  onOpenPhone: _onOpenPhone,
  onStartMatch,
  onLeaveRoom,
  onPlaceBet,
  onTriggerSkill,
}: GameHudOverlayProps) {
  const [copiedRoom, setCopiedRoom] = useState(false);

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

  useEffect(() => {
    if (clockRunning && me && me.timeBankSeconds > 0 && me.timeBankSeconds < 15) {
      soundEngine.playTick(me.timeBankSeconds % 2 === 0);
    }
  }, [clockRunning, me?.timeBankSeconds]);

  const copyRoomCode = () => {
    void navigator.clipboard.writeText(room.id);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 1200);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4">
      {/* CRAFTED SQUARE VOXEL TOP STRIP */}
      <div className="flex items-center justify-between gap-3">
        <div className="voxel-panel-gold pointer-events-auto flex items-center gap-3.5 px-4 py-2 font-mono text-xs">
          <button
            type="button"
            onClick={copyRoomCode}
            className="font-extrabold text-accent-gold hover:underline"
            title="Bấm để sao chép mã phòng"
          >
            {copiedRoom ? 'ĐÃ CHÉP' : `#${room.id}`}
          </button>
          <span className="text-border-subtle">|</span>
          <span className="font-extrabold text-content-primary">
            {PHASE_LABELS[room.phase]} · VÁN {room.handNumber}
          </span>
          <span className="text-border-subtle">|</span>
          <span className="font-bold text-content-secondary">
            BLIND {room.smallBlind.toLocaleString()}/{room.bigBlind.toLocaleString()}
          </span>
          <span className="text-border-subtle">|</span>
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-accent-gold">
            <VoxelIcon3D kind="chip" size={18} />
            POT {room.pot.toLocaleString()}
          </span>
          {room.mode === 'ARENA' && me && (
            <>
              <span className="text-border-subtle">|</span>
              <span
                className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-accent-via"
                title={`Đấu Trường Thật: mỗi lần lãi đủ +${me.arenaBuyIn.toLocaleString()} chip nhận +1 tờ 500.000 VNĐ`}
              >
                <VoxelIcon3D kind="vnd500k" size={18} />
                ĐẤU TRƯỜNG · 500K x{me.arenaBillsEarned} (
                {Math.max(0, me.chips - me.arenaBuyIn).toLocaleString()}/
                {((me.arenaBillsEarned + 1) * Math.max(1, me.arenaBuyIn)).toLocaleString()})
              </span>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {(room.status === 'WAITING' || room.status === 'FINISHED') && isHost && (
            <button
              type="button"
              disabled={room.players.length < 2}
              onClick={onStartMatch}
              className="voxel-btn border-2 border-border-gold bg-accent-gold px-5 py-2 font-mono text-xs font-extrabold tracking-widest text-content-inverse disabled:opacity-40"
            >
              {room.status === 'FINISHED'
                ? 'CHƠI TRẬN MỚI'
                : `CHIA BÀI (${room.players.length}/${room.maxPlayers})`}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            className="voxel-btn border-2 border-border-subtle bg-surface-panel px-3 py-2 font-mono text-xs font-extrabold text-content-secondary hover:border-border-gold hover:text-accent-gold"
          >
            {muted ? 'ÂM: TẮT' : 'ÂM: BẬT'}
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="voxel-btn border-2 border-status-danger/70 bg-surface-panel px-3 py-2 font-mono text-xs font-extrabold text-status-danger hover:bg-status-danger hover:text-content-primary"
          >
            RỜI BÀN
          </button>
        </div>
      </div>

      {/* LOWER-LEFT SUBTLE EVENT / CHAT FEED (positioned low, right above the board cards & clock!) */}
      <div className="mt-auto mb-2.5 flex items-end justify-between">
        <EventToastFeed toasts={toasts} />
      </div>

      {/* BOTTOM CRAFTED VOXEL DOCK */}
      {me && (
        <div className="grid items-end gap-3 lg:grid-cols-12">
          <div className="flex flex-col gap-2.5 lg:col-span-3">
            {/* Larger, Ultra-Clear 5-slot Community Cards Strip right above the Clock */}
            <div className="pointer-events-auto flex flex-col gap-1">
              <span className="font-mono text-[10px] font-extrabold tracking-widest text-content-secondary">
                BÀI TRÊN BÀN ({room.communityCards.length}/5)
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((slotIdx) => {
                  const card = room.communityCards[slotIdx];
                  if (!card) {
                    return (
                      <div
                        key={slotIdx}
                        className="flex h-14 w-10 items-center justify-center border-2 border-border-subtle bg-surface-canvas/80 font-mono text-sm font-bold text-content-muted/45"
                      >
                        ?
                      </div>
                    );
                  }
                  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
                  return (
                    <div
                      key={`${card.code}_${slotIdx}`}
                      className="flex h-14 w-10 flex-col items-center justify-between border-2 border-border-gold bg-content-primary px-1 py-0.5 font-mono leading-none shadow-[3px_3px_0_rgba(0,0,0,0.85)]"
                    >
                      <span
                        className={`self-start text-xs font-extrabold ${
                          isRed ? 'text-status-danger' : 'text-content-inverse'
                        }`}
                      >
                        {formatRank(card.rank)}
                      </span>
                      <span
                        className={`text-xl leading-none ${
                          isRed ? 'text-status-danger' : 'text-content-inverse'
                        }`}
                      >
                        {SUIT_SYMBOL[card.suit]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <TimeBankWidget
              timeBankSeconds={me.timeBankSeconds}
              turnRemainingSeconds={me.turnRemainingSeconds}
              isMyTurn={isMyTurn}
              clockRunning={clockRunning}
            />

            {/* Exact Visual Stacked Denomination Chip Bank (25K, 5K, 1K, 500, 100, 25) */}
            {(() => {
              const breakdown = breakDownChips(me.chips);
              return (
                <div className="pointer-events-auto flex items-end gap-3 px-1">
                  <div
                    className="flex items-end gap-1.5"
                    title="25K (Đen) · 5K (Tím) · 1K (Vàng) · 500 (Đỏ) · 100 (Xanh dương) · 25 (Xanh lá)"
                  >
                    {breakdown.map(({ denom, count }) => {
                      const visibleCount = Math.min(8, count);
                      return (
                        <div key={denom.label} className="flex flex-col items-center">
                          {count > 8 && (
                            <span className="mb-0.5 font-mono text-[8px] font-extrabold text-accent-gold">
                              x{count}
                            </span>
                          )}
                          <div className="flex flex-col-reverse gap-[1px]">
                            {Array.from({ length: visibleCount }).map((_, i) => (
                              <span
                                key={i}
                                className={`block h-1.5 w-6 border-x-2 border-t border-content-primary ${denom.tailwindBg}`}
                              />
                            ))}
                          </div>
                          <span className="mt-0.5 font-mono text-[8px] font-bold text-content-muted">
                            {denom.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="pb-1 font-mono text-sm font-extrabold text-accent-gold"
                    style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.9)' }}
                  >
                    {me.chips.toLocaleString()}
                    <span className="ml-1.5 text-[10px] text-accent-jade">
                      {[
                        me.winStreak >= 1 ? `CHUỖI x${me.winStreak}` : '',
                        me.statusEffects.mangoShield ? 'KHIÊN' : '',
                        me.statusEffects.blessed ? 'PHÚC' : '',
                        me.statusEffects.pressured ? 'ÁP LỰC' : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="lg:col-span-4">
            <SkillActionBar
              me={me}
              opponents={opponents}
              phase={room.phase}
              mastery={me.skillMastery ?? account.skillMastery}
              onTriggerSkill={onTriggerSkill}
            />
          </div>

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
    </div>
  );
}
