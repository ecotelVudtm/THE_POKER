export type ViaSourceKind = 'fold' | 'raise' | 'all_in' | 'siphon';

interface RecordedViaSource {
  x: number;
  y: number;
  kind: ViaSourceKind;
  timestamp: number;
}

let lastRecordedSource: RecordedViaSource | null = null;

/**
 * Records the exact viewport center of a UI button that triggers a Vía gain
 * (e.g., BỎ BÀI, TỐ, ALL-IN, HÚT VÍA) so flying green Vía orbs launch straight from that source.
 */
export function recordViaSourceFromElement(
  el: HTMLElement | null,
  kind: ViaSourceKind
): void {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return;
  lastRecordedSource = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    kind,
    timestamp: performance.now(),
  };
}

/**
 * Consumes a recently recorded Vía source (within maxAgeMs) or falls back to a contextual table position.
 */
export function consumeViaSource(
  fallback: { x: number; y: number },
  maxAgeMs = 1800
): { x: number; y: number } {
  const now = performance.now();
  if (lastRecordedSource && now - lastRecordedSource.timestamp <= maxAgeMs) {
    const picked = { x: lastRecordedSource.x, y: lastRecordedSource.y };
    lastRecordedSource = null;
    return picked;
  }
  return fallback;
}
