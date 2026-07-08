import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTokens, type Token } from '../lib/tokens';

interface State {
  tokens: Token[];
  status: 'loading' | 'ready' | 'error';
  error?: string;
  /** Epoch ms of the last successful fetch (client-side, for "updated Xs ago"). */
  fetchedAt?: number;
}

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Loads the price feed, refreshes it every 60s in the background, and
 * exposes a manual refresh. Failed background refreshes keep the last good
 * data on screen instead of nuking the form.
 */
export function useTokenPrices() {
  const [state, setState] = useState<State>({ tokens: [], status: 'loading' });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (background = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!background) {
      setState((s) => ({ ...s, status: s.tokens.length ? 'ready' : 'loading' }));
    }
    try {
      const tokens = await fetchTokens(controller.signal);
      setState({ tokens, status: 'ready', fetchedAt: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) =>
        s.tokens.length
          ? s // keep stale-but-usable prices on background failure
          : {
              tokens: [],
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to load prices',
            },
      );
    }
  }, []);

  useEffect(() => {
    load();
    // Skip refreshes while the tab is hidden; catch up as soon as it returns,
    // so a user coming back never quotes against minutes-old prices.
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) load(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [load]);

  return { ...state, refresh: () => load() };
}
