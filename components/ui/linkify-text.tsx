'use client';

import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

export function LinkifyText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563EB', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
