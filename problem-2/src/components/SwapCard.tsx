import { useEffect, useMemo, useState } from 'react';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { mockBalance, type Token } from '../lib/tokens';
import {
  formatRelativeTime,
  formatTokenAmount,
  formatUsd,
  parseAmount,
  sanitizeAmountInput,
} from '../lib/format';
import { TokenField } from './TokenField';
import { TokenSelectModal } from './TokenSelectModal';
import { TokenIcon } from './TokenIcon';

/** Mocked venue parameters — in production these come from the quote API. */
const FEE_RATE = 0.0025; // 0.25% swap fee
const SLIPPAGE = 0.005; // 0.5% slippage tolerance
const DEFAULT_FROM = 'ETH';
const DEFAULT_TO = 'USDC';

type Side = 'from' | 'to';
type Phase = 'idle' | 'submitting' | 'success';

interface CompletedSwap {
  from: Token;
  to: Token;
  amountFrom: number;
  amountTo: number;
}

export function SwapCard() {
  const { tokens, status, error, fetchedAt, refresh } = useTokenPrices();

  const [fromSymbol, setFromSymbol] = useState<string>();
  const [toSymbol, setToSymbol] = useState<string>();
  const [amounts, setAmounts] = useState({ from: '', to: '' });
  const [lastEdited, setLastEdited] = useState<Side>('from');
  const [modalFor, setModalFor] = useState<Side | null>(null);
  const [rateInverted, setRateInverted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [completed, setCompleted] = useState<CompletedSwap | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticker for the "updated Xs ago" label.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  // Pick sensible defaults once prices land.
  useEffect(() => {
    if (tokens.length && !fromSymbol && !toSymbol) {
      setFromSymbol(tokens.find((t) => t.symbol === DEFAULT_FROM)?.symbol ?? tokens[0].symbol);
      setToSymbol(tokens.find((t) => t.symbol === DEFAULT_TO)?.symbol ?? tokens[1]?.symbol);
    }
  }, [tokens, fromSymbol, toSymbol]);

  const fromToken = tokens.find((t) => t.symbol === fromSymbol);
  const toToken = tokens.find((t) => t.symbol === toSymbol);

  const rate = fromToken && toToken ? fromToken.price / toToken.price : undefined;

  const fromBalance = fromToken ? mockBalance(fromToken) : undefined;
  const toBalance = toToken ? mockBalance(toToken) : undefined;

  // Derive the passive side from the actively edited one.
  const derived = useMemo(() => {
    if (!rate) return amounts;
    if (lastEdited === 'from') {
      const n = parseAmount(amounts.from);
      return {
        from: amounts.from,
        to: n > 0 ? formatDerived(n * rate * (1 - FEE_RATE)) : '',
      };
    }
    const n = parseAmount(amounts.to);
    return {
      from: n > 0 ? formatDerived(n / rate / (1 - FEE_RATE)) : '',
      to: amounts.to,
    };
  }, [amounts, lastEdited, rate]);

  const fromAmountNum = parseAmount(derived.from);
  const toAmountNum = parseAmount(derived.to);

  const insufficient =
    fromBalance !== undefined && fromAmountNum > fromBalance + 1e-12;

  const canSubmit =
    phase !== 'submitting' &&
    !!fromToken &&
    !!toToken &&
    fromAmountNum > 0 &&
    toAmountNum > 0 &&
    !insufficient;

  const buttonLabel = !fromToken || !toToken
    ? 'Select tokens'
    : fromAmountNum <= 0
      ? 'Enter an amount'
      : insufficient
        ? `Insufficient ${fromToken.display} balance`
        : phase === 'submitting'
          ? 'Swapping…'
          : 'Swap';

  const setAmount = (side: Side, raw: string) => {
    const clean = sanitizeAmountInput(raw);
    setLastEdited(side);
    setAmounts((a) => ({ ...a, [side]: clean }));
  };

  const quickFill = (fraction: number) => {
    if (fromBalance === undefined) return;
    setLastEdited('from');
    setAmounts((a) => ({ ...a, from: String(Number((fromBalance * fraction).toPrecision(8))) }));
  };

  const flip = () => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    // Carry the numbers across so the quote stays visually continuous.
    setAmounts({ from: derived.to, to: derived.from });
    setLastEdited(lastEdited === 'from' ? 'to' : 'from');
  };

  const selectToken = (side: Side, token: Token) => {
    const other = side === 'from' ? toSymbol : fromSymbol;
    if (token.symbol === other) {
      // Picking the counterpart token means "swap sides".
      flip();
    } else if (side === 'from') {
      setFromSymbol(token.symbol);
    } else {
      setToSymbol(token.symbol);
    }
    setModalFor(null);
  };

  const submit = () => {
    if (!canSubmit || !fromToken || !toToken) return;
    setPhase('submitting');
    // Simulated backend confirmation (per the task hint).
    setTimeout(() => {
      setCompleted({
        from: fromToken,
        to: toToken,
        amountFrom: fromAmountNum,
        amountTo: toAmountNum,
      });
      setPhase('success');
    }, 1400);
  };

  const reset = () => {
    setPhase('idle');
    setCompleted(null);
    setAmounts({ from: '', to: '' });
    setLastEdited('from');
  };

  // --- Render states ---------------------------------------------------------

  if (status === 'loading') {
    return (
      <div className="card" aria-busy="true">
        <div className="card__header"><h1>Swap</h1></div>
        <div className="skeleton skeleton--field" />
        <div className="skeleton skeleton--divider" />
        <div className="skeleton skeleton--field" />
        <div className="skeleton skeleton--button" />
        <p className="muted center">Loading live prices…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="card">
        <div className="card__header"><h1>Swap</h1></div>
        <div className="error-state" role="alert">
          <p><strong>Couldn't load prices.</strong></p>
          <p className="muted">{error}</p>
          <button type="button" className="submit-btn" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'success' && completed) {
    return (
      <div className="card card--success">
        <div className="success-check" aria-hidden="true">
          <svg viewBox="0 0 52 52" width="56" height="56">
            <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" className="success-check__circle" />
            <path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="success-check__mark" />
          </svg>
        </div>
        <h1>Swap complete</h1>
        <p className="success-summary" role="status">
          <span className="success-summary__leg">
            <TokenIcon token={completed.from} size={20} />
            {formatTokenAmount(completed.amountFrom)} {completed.from.display}
          </span>
          <span className="success-summary__arrow" aria-hidden="true">→</span>
          <span className="success-summary__leg">
            <TokenIcon token={completed.to} size={20} />
            {formatTokenAmount(completed.amountTo)} {completed.to.display}
          </span>
        </p>
        <p className="muted center">
          ≈ {formatUsd(completed.amountFrom * completed.from.price)} at market rate
        </p>
        <button type="button" className="submit-btn" onClick={reset}>
          Make another swap
        </button>
      </div>
    );
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="card__header">
        <h1>Swap</h1>
        {fetchedAt && (
          <button
            type="button"
            className="refresh-btn"
            onClick={refresh}
            title="Refresh prices"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.34 6.06M20 5v6h-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {formatRelativeTime(fetchedAt, now)}
          </button>
        )}
      </div>

      <TokenField
        label="You pay"
        inputId="amount-from"
        amount={derived.from}
        onAmountChange={(v) => setAmount('from', v)}
        token={fromToken}
        onTokenClick={() => setModalFor('from')}
        usdValue={fromToken ? fromAmountNum * fromToken.price : 0}
        balance={fromBalance}
        onQuickFill={quickFill}
        invalid={insufficient}
        isQuote={lastEdited === 'to'}
      />

      <div className="flip-row">
        <button
          type="button"
          className="flip-btn"
          onClick={flip}
          aria-label="Swap the pay and receive tokens"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v16m0 0l-5-5m5 5l5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <TokenField
        label="You receive"
        inputId="amount-to"
        amount={derived.to}
        onAmountChange={(v) => setAmount('to', v)}
        token={toToken}
        onTokenClick={() => setModalFor('to')}
        usdValue={toToken ? toAmountNum * toToken.price : 0}
        balance={toBalance}
        isQuote={lastEdited === 'from'}
      />

      {insufficient && fromToken && (
        <p className="field-error" role="alert">
          You only have {formatTokenAmount(fromBalance ?? 0)} {fromToken.display}. Try “Max”.
        </p>
      )}

      {rate && fromToken && toToken && (
        <dl className="details" aria-live="polite">
          <div className="details__row">
            <dt>Rate</dt>
            <dd>
              <button
                type="button"
                className="rate-toggle"
                onClick={() => setRateInverted((v) => !v)}
                title="Invert rate"
              >
                {rateInverted
                  ? `1 ${toToken.display} = ${formatTokenAmount(1 / rate)} ${fromToken.display}`
                  : `1 ${fromToken.display} = ${formatTokenAmount(rate)} ${toToken.display}`}
                <span aria-hidden="true"> ⇄</span>
              </button>
            </dd>
          </div>
          <div className="details__row">
            <dt>Swap fee ({(FEE_RATE * 100).toFixed(2)}%)</dt>
            <dd>{formatUsd(fromAmountNum * fromToken.price * FEE_RATE)}</dd>
          </div>
          <div className="details__row">
            <dt>Minimum received</dt>
            <dd>
              {toAmountNum > 0
                ? `${formatTokenAmount(toAmountNum * (1 - SLIPPAGE))} ${toToken.display}`
                : '—'}
            </dd>
          </div>
        </dl>
      )}

      <button type="submit" className="submit-btn" disabled={!canSubmit}>
        {phase === 'submitting' && <span className="spinner" aria-hidden="true" />}
        {buttonLabel}
      </button>

      {modalFor && (
        <TokenSelectModal
          tokens={tokens}
          selected={modalFor === 'from' ? fromSymbol : toSymbol}
          counterpart={modalFor === 'from' ? toSymbol : fromSymbol}
          onSelect={(t) => selectToken(modalFor, t)}
          onClose={() => setModalFor(null)}
        />
      )}
    </form>
  );
}

/** Derived amounts get trimmed precision so they read like a quote, not float noise. */
function formatDerived(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Number(n.toPrecision(8));
  const plain = String(rounded);
  if (!plain.includes('e')) return plain;
  // Tiny cross-rates (e.g. SWTH → WBTC) serialize as "1.5e-7"; keep the input
  // plain-decimal so it stays editable and re-parseable.
  return rounded.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}
