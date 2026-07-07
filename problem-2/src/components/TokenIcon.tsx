import { useState } from 'react';
import type { Token } from '../lib/tokens';

/**
 * Token logo with a graceful fallback: if the SVG 404s (not every token has
 * an icon), render a deterministic two-letter monogram instead of a broken
 * image.
 */
export function TokenIcon({ token, size = 28 }: { token: Token; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="token-icon token-icon--fallback"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden="true"
      >
        {token.display.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="token-icon"
      src={token.iconUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
