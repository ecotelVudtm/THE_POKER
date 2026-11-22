import { ToastMessage } from '../../types/game';

export interface EventToastFeedProps {
  toasts: ToastMessage[];
}

const TONE_CLASSES: Record<ToastMessage['tone'], string> = {
  info: 'border-border-subtle bg-surface-panel/90 text-content-primary',
  success: 'border-status-success/50 bg-surface-panel/95 text-status-success',
  warning: 'border-status-warning/50 bg-surface-panel/95 text-status-warning',
  danger: 'border-status-danger/60 bg-status-danger/20 text-content-primary',
};

export function EventToastFeed({ toasts }: EventToastFeedProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none flex max-w-sm flex-col gap-1.5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-3 py-2 text-xs font-medium shadow-warm backdrop-blur-md ${TONE_CLASSES[toast.tone]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
