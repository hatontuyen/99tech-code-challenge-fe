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
  usdValue: number;
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
  amount.toLocaleString('en-US', { maximumFractionDigits: 6 }); // toFixed() truncated to 0 decimals

// --- Component ---------------------------------------------------------------

type Props = BoxProps; // empty `interface Props extends BoxProps {}` added nothing

const WalletPage = ({ children, ...rest }: Props) => {
  const balances = useWalletBalances();
  const prices = usePrices();

  // One pass: filter -> decorate with priority (computed ONCE per item,
  // not O(n log n) times inside the comparator) -> sort -> format.
  const rows = useMemo(() => {
    return balances
      .filter(
        (balance: WalletBalance) =>
          getPriority(balance.blockchain) > UNKNOWN_PRIORITY &&
          balance.amount > 0, // original kept empty wallets and dropped funded ones
      )
      .map(
        (balance: WalletBalance): FormattedWalletBalance => ({
          ...balance,
          priority: getPriority(balance.blockchain),
          formatted: formatAmount(balance.amount),
          // Guard: a token without a quote renders $0.00, not NaN.
          usdValue: (prices[balance.currency] ?? 0) * balance.amount,
        }),
      )
      .sort(
        (lhs, rhs) =>
          rhs.priority - lhs.priority || // always returns a number (original returned undefined on ties)
          lhs.currency.localeCompare(rhs.currency), // deterministic tie-breaker (Zilliqa & Neo share 20)
      );
  }, [balances, prices]); // `prices` is genuinely used now (usdValue); no phantom deps

  return (
    <Box {...rest}>
      {rows.map((balance) => (
        <WalletRow
          // Stable identity — index keys mis-reconcile a sorted/filtered list.
          key={`${balance.blockchain}-${balance.currency}`}
          amount={balance.amount}
          usdValue={balance.usdValue}
          formattedAmount={balance.formatted}
        />
      ))}
      {children}
    </Box>
  );
};

export default WalletPage;
