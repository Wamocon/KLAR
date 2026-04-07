/**
 * KLAR Logo — Evidence Scale (Scales of Truth)
 * Used in header, footer, and favicon.
 */
export function KlarLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="klar-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#008c50" />
          <stop offset="100%" stopColor="#00e88a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#klar-bg)" />
      {/* Scale beam (tilted — truth rises) */}
      <line x1="128" y1="230" x2="384" y2="180" stroke="white" strokeWidth="16" strokeLinecap="round" />
      {/* Center pillar */}
      <line x1="256" y1="205" x2="256" y2="384" stroke="white" strokeWidth="20" strokeLinecap="round" />
      {/* Base */}
      <line x1="192" y1="384" x2="320" y2="384" stroke="white" strokeWidth="16" strokeLinecap="round" />
      {/* Fulcrum */}
      <polygon points="237,195 275,195 256,168" fill="white" />
      {/* Left pan (claims side — heavier) */}
      <path d="M96 230 Q128 296 160 230" stroke="white" strokeWidth="12" fill="rgba(255,255,255,0.1)" strokeLinecap="round" />
      <circle cx="128" cy="270" r="10" fill="rgba(255,255,255,0.4)" />
      {/* Right pan (verified — lighter, truth rises) with checkmark */}
      <path d="M352 180 Q384 246 416 180" stroke="white" strokeWidth="12" fill="rgba(255,255,255,0.1)" strokeLinecap="round" />
      <polyline points="360,200 376,218 404,186" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
