import { useState } from 'react';
import type { Token } from '../lib/tokens';

/**
 * Token logo with a graceful fallback: if the SVG fails to load (missing icon,
 * or a transient GitHub-raw 429), render a deterministic two-letter monogram
 * instead of a broken image.
 *
 * The failure is remembered *per URL*, not as a boolean: this component
 * instance survives token changes (React keeps it — same type, same position),
 * so a plain `failed` flag would freeze the monogram forever even after
 * switching to a token whose icon loads fine.
 */
export function TokenIcon({ token, size = 28 }: { token: Token; size?: number }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const failed = failedUrl === token.iconUrl;

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
      onError={() => setFailedUrl(token.iconUrl)}
    />
  );
}
