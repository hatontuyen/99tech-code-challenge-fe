import { useEffect, useMemo, useRef, useState } from 'react';
import { mockBalance, type Token } from '../lib/tokens';
import { formatTokenAmount, formatUsd } from '../lib/format';
import { TokenIcon } from './TokenIcon';

interface Props {
  tokens: Token[];
  /** Symbol currently selected on this side (shown as active). */
  selected?: string;
  /** Symbol selected on the *other* side (marked, still selectable = swaps sides). */
  counterpart?: string;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

const POPULAR = ['ETH', 'WBTC', 'USDC', 'ATOM', 'SWTH'];

export function TokenSelectModal({
  tokens,
  selected,
  counterpart,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    // Prefix matches first, then substring matches — cheap but feels right.
    const starts = tokens.filter((t) => t.display.toLowerCase().startsWith(q));
    const contains = tokens.filter(
      (t) => !t.display.toLowerCase().startsWith(q) && t.display.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [tokens, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      onSelect(filtered[activeIndex]);
    } else if (e.key === 'Tab') {
      // Focus trap: aria-modal="true" promises focus stays in the dialog.
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>('button, input');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const popularTokens = POPULAR.map((s) => tokens.find((t) => t.symbol === s)).filter(
    (t): t is Token => Boolean(t),
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select a token"
        onKeyDown={handleKeyDown}
      >
        <header className="modal__header">
          <h2>Select a token</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <input
          ref={inputRef}
          className="modal__search"
          type="text"
          placeholder="Search by token name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tokens"
        />

        {!query && popularTokens.length > 0 && (
          <div className="modal__popular" aria-label="Popular tokens">
            {popularTokens.map((t) => (
              <button
                key={t.symbol}
                type="button"
                className={`chip ${t.symbol === selected ? 'chip--active' : ''}`}
                onClick={() => onSelect(t)}
              >
                <TokenIcon token={t} size={18} />
                {t.display}
              </button>
            ))}
          </div>
        )}

        <ul className="modal__list" ref={listRef} role="listbox" aria-label="Token results">
          {filtered.map((token, i) => {
            const isSelected = token.symbol === selected;
            const isCounterpart = token.symbol === counterpart;
            const balance = mockBalance(token);
            return (
              <li key={token.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-active={i === activeIndex}
                  className={`token-row ${isSelected ? 'token-row--selected' : ''} ${
                    i === activeIndex ? 'token-row--focused' : ''
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => onSelect(token)}
                >
                  <TokenIcon token={token} size={32} />
                  <span className="token-row__names">
                    <span className="token-row__symbol">
                      {token.display}
                      {isCounterpart && <em className="token-row__note"> · other side</em>}
                    </span>
                    <span className="token-row__price">{formatUsd(token.price)}</span>
                  </span>
                  <span className="token-row__balance">
                    <span>{formatTokenAmount(balance)}</span>
                    <span className="token-row__balance-usd">
                      {formatUsd(balance * token.price)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="modal__empty">No tokens match “{query}”.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
