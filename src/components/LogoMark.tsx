// FitLog mark: a pulse line on a blue rounded square.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="fitlog-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#fitlog-bg)" />
      <path
        d="M10 35 H21 L26 26 L32 45 L39 15 L44 35 H51"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52.5" cy="35" r="4" fill="#a5f3fc" />
    </svg>
  );
}
