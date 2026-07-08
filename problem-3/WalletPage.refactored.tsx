import { useMemo } from 'react';

// --- Domain types -----------------------------------------------------------

/** Known chains. Adding a chain here forces PRIORITY to be updated too. */
type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain; // was missing in the original, yet accessed everywhere
}

/** Extends instead of duplicating, so the two types can never drift apart. */
interface FormattedWalletBalance extends WalletBalance {
  priority: number;
  formatted: string;
}

// --- Pure helpers (module scope: created once, not per render) --------------

const PRIORITY: Record<Blockchain, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

const UNKNOWN_PRIORITY = -99;

const getPriority = (blockchain: Blockchain): number =>
  PRIORITY[blockchain] ?? UNKNOWN_PRIORITY;

const formatAmount = (amount: number): string =>
  amount.toLocaleString('en-US', { maximumFractionDigits: 6 }); // toFixed() rounded to 0 decimals (0.95 → "1")

// --- Component ---------------------------------------------------------------

type Props = BoxProps; // empty `interface Props extends BoxProps {}` added nothing

const WalletPage = ({ children, ...rest }: Props) => {
  const balances = useWalletBalances();
  const prices = usePrices();

  // Decorate -> filter -> sort: getPriority runs exactly once per item (the
  // original ran it O(n log n) times inside the comparator). Depends on
  // `balances` ONLY — a price tick must not re-filter/re-sort/re-format the
  // list (that was §3.2, the biggest real-world perf issue in the original),
  // and nothing in this pipeline reads prices.
  const sortedBalances = useMemo(() => {
    return balances
      .map(
        (balance: WalletBalance): FormattedWalletBalance => ({
          ...balance,
          priority: getPriority(balance.blockchain),
          formatted: formatAmount(balance.amount),
        }),
      )
      .filter(
        (balance) =>
          balance.priority > UNKNOWN_PRIORITY &&
          balance.amount > 0, // original kept empty wallets and dropped funded ones
      )
      .sort(
        (lhs, rhs) =>
          rhs.priority - lhs.priority || // always returns a number (original returned undefined on ties)
          lhs.currency.localeCompare(rhs.currency), // deterministic tie-breaker (Zilliqa & Neo share 20)
      );
  }, [balances]);

  return (
    <Box {...rest}>
      {sortedBalances.map((balance) => (
        <WalletRow
          // Stable identity — index keys mis-reconcile a sorted/filtered list.
          key={`${balance.blockchain}-${balance.currency}`}
          amount={balance.amount}
          // usdValue is the only price-dependent value, and it's O(n) cheap —
          // computed at render instead of inside the memo, so price ticks
          // re-multiply n numbers without touching the sorted pipeline.
          // Guard: a token without a quote renders $0.00, not NaN.
          usdValue={(prices[balance.currency] ?? 0) * balance.amount}
          formattedAmount={balance.formatted}
        />
      ))}
      {children}
    </Box>
  );
};

export default WalletPage;
