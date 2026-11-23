import { ToastMessage } from '../../types/game';

export interface EventToastFeedProps {
  toasts: ToastMessage[];
}

const TONE_TEXT: Record<ToastMessage['tone'], string> = {
  info: 'text-content-secondary',
  success: 'text-accent-jade',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
};

export function EventToastFeed({ toasts }: EventToastFeedProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none flex max-w-xs flex-col gap-1">
      {toasts.slice(-4).map((toast) => (
        <div
          key={toast.id}
          className={`w-fit border-l-2 border-border-gold bg-surface-canvas/80 px-2.5 py-1 font-mono text-[11px] font-semibold ${TONE_TEXT[toast.tone]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
