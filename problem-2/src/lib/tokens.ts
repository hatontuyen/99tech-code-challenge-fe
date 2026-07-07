export interface Token {
  /** Symbol as it appears in the price feed, e.g. "STATOM" */
  symbol: string;
  /** Human-facing display symbol, e.g. "stATOM" */
  display: string;
  /** Latest USD price */
  price: number;
  /** ISO date of the latest quote */
  updatedAt: string;
  iconUrl: string;
}

interface RawPrice {
  currency: string;
  date: string;
  price: number;
}

export const PRICES_URL = 'https://interview.switcheo.com/prices.json';

const ICON_BASE =
  'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens';

/**
 * The price feed upper-cases some symbols ("STATOM") while the icon repo —
 * and the tokens' own branding — use mixed case ("stATOM"). GitHub raw URLs
 * are case-sensitive, so without this mapping those icons 404. Verified
 * against the token-icons repo.
 */
const DISPLAY_OVERRIDES: Record<string, string> = {
  STATOM: 'stATOM',
  STEVMOS: 'stEVMOS',
  STLUNA: 'stLUNA',
  STOSMO: 'stOSMO',
  RATOM: 'rATOM',
};

export function toDisplaySymbol(symbol: string): string {
  return DISPLAY_OVERRIDES[symbol] ?? symbol;
}

export function tokenIconUrl(symbol: string): string {
  return `${ICON_BASE}/${toDisplaySymbol(symbol)}.svg`;
}

/**
 * The feed contains duplicate rows per currency (and some tokens with no
 * usable price). Keep the most recent strictly-positive quote per symbol.
 */
export function normalizePrices(raw: RawPrice[]): Token[] {
  const latest = new Map<string, RawPrice>();
  for (const row of raw) {
    if (!row.currency || !Number.isFinite(row.price) || row.price <= 0) continue;
    const existing = latest.get(row.currency);
    if (!existing || new Date(row.date) > new Date(existing.date)) {
      latest.set(row.currency, row);
    }
  }
  return [...latest.values()]
    .map((row) => ({
      symbol: row.currency,
      display: toDisplaySymbol(row.currency),
      price: row.price,
      updatedAt: row.date,
      iconUrl: tokenIconUrl(row.currency),
    }))
    .sort((a, b) => a.display.localeCompare(b.display));
}

export async function fetchTokens(signal?: AbortSignal): Promise<Token[]> {
  const res = await fetch(PRICES_URL, { signal });
  if (!res.ok) {
    throw new Error(`Price feed responded with ${res.status}`);
  }
  const raw = (await res.json()) as RawPrice[];
  const tokens = normalizePrices(raw);
  if (tokens.length === 0) {
    throw new Error('Price feed returned no usable prices');
  }
  return tokens;
}

/**
 * Demo wallet balances (this challenge has no backend). Deterministic per
 * symbol so Max/50% behave consistently across reloads, and scaled by price
 * so every holding lands in a plausible $800–$5,800 range.
 */
export function mockBalance(token: Token): number {
  let hash = 0;
  for (let i = 0; i < token.symbol.length; i++) {
    hash = (hash * 31 + token.symbol.charCodeAt(i)) | 0;
  }
  const usdValue = 800 + (Math.abs(hash) % 5000);
  const amount = usdValue / token.price;
  return Number(amount.toPrecision(6));
}
