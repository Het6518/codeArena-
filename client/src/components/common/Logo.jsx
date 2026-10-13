// CodeArena wordmark: a two-face chess clock glyph followed by the name, with
// "ARENA" set on the flag-yellow block.
export function Logo({ compact = false }) {
  return (
    <span className={compact ? 'wordmark wordmark-compact' : 'wordmark'} aria-label="CodeArena">
      <svg className="wordmark-glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect x="1" y="7" width="30" height="20" rx="3" className="glyph-body" />
        <rect x="4" y="10" width="11" height="14" rx="1.5" className="glyph-face-on" />
        <rect x="17" y="10" width="11" height="14" rx="1.5" className="glyph-face-off" />
        <rect x="7" y="3" width="5" height="4" rx="1" className="glyph-body" />
        <rect x="20" y="4" width="5" height="3" rx="1" className="glyph-body" />
      </svg>
      <span className="wordmark-text" aria-hidden="true">
        CODE<span className="wordmark-flag">ARENA</span>
      </span>
    </span>
  );
}
