export interface ChipDenomination {
  value: number;
  label: string;
  nameVi: string;
  hex3D: string;
  tailwindBg: string;
}

/**
 * Canonical 6-tier Poker Chip Denominations (high -> low).
 * Example: 17,800 = 3×5K + 2×1K + 1×500 + 3×100 (exact visual representation!).
 */
export const CHIP_DENOMINATIONS: readonly ChipDenomination[] = [
  { value: 25000, label: '25K', nameVi: 'Đen Vàng', hex3D: '#1c1917', tailwindBg: 'bg-surface-canvas' },
  { value: 5000, label: '5K', nameVi: 'Tím', hex3D: '#9333ea', tailwindBg: 'bg-purple-600' },
  { value: 1000, label: '1K', nameVi: 'Vàng', hex3D: '#eab308', tailwindBg: 'bg-accent-gold' },
  { value: 500, label: '500', nameVi: 'Đỏ', hex3D: '#dc2626', tailwindBg: 'bg-status-danger' },
  { value: 100, label: '100', nameVi: 'Xanh dương', hex3D: '#2563eb', tailwindBg: 'bg-accent-via' },
  { value: 25, label: '25', nameVi: 'Xanh lá', hex3D: '#16a34a', tailwindBg: 'bg-accent-jade' },
];

export interface ChipBreakdownItem {
  denom: ChipDenomination;
  count: number;
}

/**
 * Breaks any chip amount into exact denomination stacks (no misleading truncation!).
 */
export function breakDownChips(amount: number): ChipBreakdownItem[] {
  let remaining = Math.max(0, Math.floor(amount));
  if (remaining === 0) return [];

  const result: ChipBreakdownItem[] = [];
  for (const denom of CHIP_DENOMINATIONS) {
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      result.push({ denom, count });
      remaining -= count * denom.value;
    }
  }

  // Fallback for tiny amounts (< 25)
  if (result.length === 0 && amount > 0) {
    result.push({ denom: CHIP_DENOMINATIONS[CHIP_DENOMINATIONS.length - 1], count: 1 });
  }
  return result;
}
