import { ToastMessage } from '../../types/game';

export interface EventToastFeedProps {
  toasts: ToastMessage[];
}

/**
 * Strips emojis/icons and softens noisy ALL-CAPS phrases into clean, calm plain text.
 */
function formatPlainNotification(raw: string): string {
  const cleaned = raw
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  // Convert any all-caps shouting words (4+ uppercase chars) to natural lowercase except short codes
  const softened = cleaned.replace(
    /[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]{4,}/g,
    (word) => word.toLowerCase()
  );
  return softened.charAt(0).toUpperCase() + softened.slice(1);
}

/**
 * Ultra-minimal plain-text table notifications anchored low above the left dock:
 * No bright colors, no icons, no bold, no ALL-CAPS — just soft, clean text.
 */
export function EventToastFeed({ toasts }: EventToastFeedProps) {
  if (toasts.length === 0) return null;

  const visible = toasts.slice(-4);

  return (
    <div className="pointer-events-none flex max-w-xs flex-col gap-0.5">
      {visible.map((toast, idx) => {
        const text = formatPlainNotification(toast.text);
        if (!text) return null;

        const ageOpacity =
          idx === visible.length - 1
            ? 'opacity-70'
            : idx === visible.length - 2
              ? 'opacity-50'
              : 'opacity-35';

        return (
          <div
            key={toast.id}
            className={`w-fit bg-surface-canvas/30 px-2 py-0.5 font-sans text-[11px] font-normal leading-snug text-content-secondary ${ageOpacity}`}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}
