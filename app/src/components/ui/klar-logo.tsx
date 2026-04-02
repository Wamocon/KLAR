/**
 * KLAR Logo — magnifying glass with checkmark
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
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#klar-bg)" />
      {/* Magnifying glass */}
      <circle cx="228" cy="218" r="108" stroke="white" strokeWidth="32" opacity="0.95" />
      <line x1="310" y1="300" x2="400" y2="390" stroke="white" strokeWidth="36" strokeLinecap="round" opacity="0.95" />
      {/* Checkmark */}
      <polyline points="180,218 215,253 280,178" stroke="white" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
