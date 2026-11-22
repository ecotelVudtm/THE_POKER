import { Eye, Shield, Sparkles, Trophy, AlertOctagon, Flame } from 'lucide-react';
import {
  Card,
  MiniGameChallenge,
  MiniGameResultEvent,
  MiniGameSubmissionPayload,
} from '../../types/game';
import { TimingBarMiniGame } from '../TimingBarMiniGame';
import { BalanceCircleMiniGame } from '../BalanceCircleMiniGame';
import { RhythmTapMiniGame } from '../RhythmTapMiniGame';

export interface MiniGameOverlayProps {
  challenge: MiniGameChallenge | null;
  lastResult: MiniGameResultEvent | null;
  eagleEyeCard: Card | null;
  onSubmit: (payload: MiniGameSubmissionPayload) => void;
}

export function MiniGameOverlay({
  challenge,
  lastResult,
  eagleEyeCard,
  onSubmit,
}: MiniGameOverlayProps) {
  return (
    <>
      {/* Active 60fps Mini-Game Modal */}
      {challenge && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-surface-canvas/70 p-4 backdrop-blur-sm">
          {challenge.miniGameType === 'TIMING_BAR' && (
            <TimingBarMiniGame challenge={challenge} onSubmit={onSubmit} />
          )}
          {challenge.miniGameType === 'BALANCE_CIRCLE' && (
            <BalanceCircleMiniGame challenge={challenge} onSubmit={onSubmit} />
          )}
          {challenge.miniGameType === 'RHYTHM_TAP' && (
            <RhythmTapMiniGame challenge={challenge} onSubmit={onSubmit} />
          )}
        </div>
      )}

      {/* Dramatic Result & Mastery EXP / Level Up Banner */}
      {lastResult && !challenge && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
          <div
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-6 py-4 text-center shadow-warm backdrop-blur-md ${
              lastResult.success
                ? 'border-accent-jade bg-surface-panel/95'
                : lastResult.mangoShieldBlocked
                  ? 'border-accent-gold bg-surface-panel/95'
                  : 'border-status-danger bg-status-danger/25'
            }`}
          >
            {lastResult.success ? (
              <div className="flex items-center gap-2 text-base font-extrabold text-accent-jade">
                {lastResult.skillType === 'PRESSURE_AURA' ? (
                  <Flame className="h-5 w-5 text-status-warning" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>
                  {lastResult.skillType === 'PRESSURE_AURA'
                    ? 'SÓNG KHÍ THẾ ĐÁNH TRÚNG! (-10s đối thủ)'
                    : 'TUYỆT KỸ THÀNH CÔNG!'}
                </span>
              </div>
            ) : lastResult.mangoShieldBlocked ? (
              <div className="flex items-center gap-2 text-base font-extrabold text-accent-gold">
                <Shield className="h-5 w-5" />
                <span>QUẢ XOÀI ĐÃ ĐỠ HỘ! (Chặn Lộ Tẩy)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-base font-extrabold text-status-danger">
                <AlertOctagon className="h-5 w-5" />
                <span>LỘ TẨY! 1 lá bài đã bị lật ngửa</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-semibold text-content-secondary">
              <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 font-mono text-accent-via">
                +{lastResult.expGained} EXP Thành thạo
              </span>
              {lastResult.leveledUp && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-gold px-2.5 py-0.5 font-extrabold text-content-inverse shadow-goldGlow">
                  <Trophy className="h-3.5 w-3.5" />
                  LÊN CẤP Lv.{lastResult.newLevel}!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private 4-Second Eagle Eye Peek Frame */}
      {eagleEyeCard && !challenge && (
        <div className="pointer-events-none fixed inset-x-0 top-44 z-30 flex justify-center">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-accent-via bg-surface-panel/95 px-5 py-3 shadow-viaGlow backdrop-blur-md">
            <Eye className="h-5 w-5 text-accent-via" />
            <div>
              <div className="text-[11px] font-semibold text-accent-via">
                Tâm Nhãn (chỉ mình bạn thấy • tự ẩn sau 4s)
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-content-primary">
                Lá bài sắp lật:{' '}
                <span className="rounded-lg bg-surface-elevated px-2 py-0.5 font-mono text-base text-accent-gold">
                  {eagleEyeCard.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
