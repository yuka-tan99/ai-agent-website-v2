'use client';

import type { ReactNode } from 'react';

export function renderHighlightedText(
  text: string | null | undefined,
  accentColor: string,
): ReactNode {
  if (!text) return null;
  const tokens = text.split(/(<<highlight>>|<<\/highlight>>)/g);
  let isHighlight = false;
  return tokens
    .map((token, index) => {
      if (!token) return null;
      if (token === '<<highlight>>') {
        isHighlight = true;
        return null;
      }
      if (token === '<</highlight>>') {
        isHighlight = false;
        return null;
      }
      if (isHighlight) {
        return (
          <span
            key={`hl-${index}`}
            className="font-semibold"
            style={{ color: accentColor }}
          >
            {token}
          </span>
        );
      }
      return <span key={`txt-${index}`}>{token}</span>;
    })
    .filter(Boolean);
}
