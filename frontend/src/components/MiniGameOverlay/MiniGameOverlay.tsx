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
      {challenge && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-surface-canvas/70 p-4">
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

      {lastResult && !challenge && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
          <div
            className={`voxel-panel flex flex-col items-center gap-1.5 px-6 py-4 text-center ${
              lastResult.success
                ? 'border-accent-jade'
                : lastResult.mangoShieldBlocked
                  ? 'border-accent-gold'
                  : 'border-status-danger bg-status-danger/25'
            }`}
          >
            <div
              className={`font-mono text-base font-extrabold ${
                lastResult.success
                  ? 'text-accent-jade'
                  : lastResult.mangoShieldBlocked
                    ? 'text-accent-gold'
                    : 'text-status-danger'
              }`}
            >
              {lastResult.success
                ? lastResult.skillType === 'PRESSURE_AURA'
                  ? 'SÓNG KHÍ THẾ ĐÁNH TRÚNG! (-10S ĐỐI THỦ)'
                  : lastResult.skillType === 'VIA_SIPHON'
                    ? 'HÚT VÍA THÀNH CÔNG! (+VÍA CHO BẠN)'
                    : lastResult.skillType === 'TIME_FREEZE'
                      ? 'NGƯNG ĐỌNG THÀNH CÔNG! (+15S QUỸ · +10S LƯỢT)'
                      : lastResult.skillType === 'POKER_FACE'
                        ? 'MẶT LẠNH TĨNH TÂM! (GỠ ÁP LỰC & PHÒNG THỦ)'
                        : 'TUYỆT KỸ THÀNH CÔNG!'
                : lastResult.mangoShieldBlocked
                  ? 'QUẢ XOÀI ĐÃ ĐỠ HỘ! (CHẶN LỘ TẨY)'
                  : 'LỘ TẨY! 1 LÁ BÀI ĐÃ BỊ LẬT NGỬA'}
            </div>

            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              <span className="border border-accent-via bg-surface-elevated px-2 py-0.5 text-accent-via">
                +{lastResult.expGained} EXP
              </span>
              {lastResult.leveledUp && (
                <span className="border border-border-gold bg-accent-gold px-2 py-0.5 font-extrabold text-content-inverse">
                  LÊN CẤP LV.{lastResult.newLevel}!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {eagleEyeCard && !challenge && (
        <div className="pointer-events-none fixed inset-x-0 top-44 z-30 flex justify-center">
          <div className="voxel-panel border-accent-via px-5 py-3 text-center">
            <div className="font-mono text-[10px] font-bold text-accent-via">
              TÂM NHÃN · CHỈ MÌNH BẠN THẤY (4S)
            </div>
            <div className="mt-1 font-mono text-sm font-extrabold text-content-primary">
              LÁ SẮP LẬT:{' '}
              <span className="border border-border-gold bg-surface-elevated px-2 py-0.5 text-accent-gold">
                {eagleEyeCard.code}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
