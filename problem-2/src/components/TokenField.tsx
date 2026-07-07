import { formatUsd } from '../lib/format';
import type { Token } from '../lib/tokens';
import { TokenIcon } from './TokenIcon';

interface Props {
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  token?: Token;
  onTokenClick: () => void;
  usdValue: number;
  balance?: number;
  onQuickFill?: (fraction: number) => void;
  invalid?: boolean;
  /** True while this side's value is being derived from the other side. */
  isQuote?: boolean;
  inputId: string;
}

export function TokenField({
  label,
  amount,
  onAmountChange,
  token,
  onTokenClick,
  usdValue,
  balance,
  onQuickFill,
  invalid,
  isQuote,
  inputId,
}: Props) {
  return (
    <div className={`field ${invalid ? 'field--invalid' : ''}`}>
      <div className="field__row field__row--top">
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
        {token && balance !== undefined && (
          <span className="field__balance">
            Balance: {balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
            {onQuickFill && (
              <>
                <button type="button" className="mini-btn" onClick={() => onQuickFill(0.5)}>
                  50%
                </button>
                <button type="button" className="mini-btn" onClick={() => onQuickFill(1)}>
                  Max
                </button>
              </>
            )}
          </span>
        )}
      </div>

      <div className="field__row">
        <input
          id={inputId}
          className={`field__input ${isQuote ? 'field__input--quote' : ''}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          aria-invalid={invalid || undefined}
        />
        <button type="button" className="token-btn" onClick={onTokenClick}>
          {token ? (
            <>
              <TokenIcon token={token} size={24} />
              <span>{token.display}</span>
            </>
          ) : (
            <span>Select token</span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="field__row field__row--bottom">
        <span className="field__usd">{usdValue > 0 ? `≈ ${formatUsd(usdValue)}` : ' '}</span>
      </div>
    </div>
  );
}
