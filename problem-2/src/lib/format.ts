/**
 * Sanitize free text into a valid decimal-in-progress ("12.", ".5", "0.05").
 *
 * Commas are ambiguous: "1,234.56" (US thousands) vs "1,5" (European decimal).
 * Naively mapping comma → dot corrupts a US paste by ~1000×, so decide first:
 * - a dot is present            → commas are thousand separators, strip them
 * - several commas, or exactly
 *   one comma before a final
 *   3-digit group ("1,234")     → thousand separators, strip them
 * - otherwise ("1,5", "0,05")   → European decimal, comma becomes the dot
 */
export function sanitizeAmountInput(value: string): string {
  let cleaned = value.replace(/[^\d.,]/g, '');
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const commasAreThousands =
    cleaned.includes('.') || commaCount > 1 || /,\d{3}$/.test(cleaned);
  cleaned = commasAreThousands ? cleaned.replace(/,/g, '') : cleaned.replace(/,/g, '.');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

export function parseAmount(value: string): number {
  if (value === '' || value === '.') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Token amounts: enough precision to be honest, no scientific notation. */
export function formatTokenAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  if (amount >= 1) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  // For sub-1 amounts keep 6 significant digits (dust-level prices need it).
  return Number(amount.toPrecision(6)).toLocaleString('en-US', {
    maximumFractionDigits: 10,
  });
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 4,
  });
}

export function formatRelativeTime(from: number, to: number): string {
  const seconds = Math.max(0, Math.round((to - from) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
