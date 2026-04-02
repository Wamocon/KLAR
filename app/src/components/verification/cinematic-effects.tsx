"use client";

/**
 * Trust Score Ring — Animated circular progress indicator with depth effects.
 * Uses SVG with CSS animations for smooth, GPU-accelerated rendering.
 */
export function TrustScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  animated = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.3)" };
    if (s >= 40) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" };
    return { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" };
  };

  const color = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={animated ? "trust-ring" : ""}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-800"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          className="trust-ring-progress"
          style={
            animated
              ? {
                  strokeDashoffset: offset,
                  filter: `drop-shadow(0 0 6px ${color.glow})`,
                }
              : { strokeDashoffset: circumference }
          }
        />
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: color.stroke }}
        >
          {score}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          Trust
        </span>
      </div>
    </div>
  );
}

/**
 * Particle Burst — decorative celebration effect.
 */
export function ParticleBurst({ color = "#10b981", count = 12 }: { color?: string; count?: number }) {
  // Use deterministic pseudo-random values based on index for render purity
  const seed = (i: number) => ((i * 2654435761) % 100) / 100; // Knuth multiplicative hash
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    const distance = 40 + seed(i) * 30;
    const px = Math.cos((angle * Math.PI) / 180) * distance;
    const py = Math.sin((angle * Math.PI) / 180) * distance;
    const size = 3 + seed(i + count) * 4;

    return (
      <span
        key={i}
        className="particle"
        style={{
          "--px": `${px}px`,
          "--py": `${py}px`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          left: "50%",
          top: "50%",
          animationDelay: `${i * 30}ms`,
        } as React.CSSProperties}
      />
    );
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles}
    </div>
  );
}

/**
 * Scanning Overlay — displayed during verification processing.
 */
export function ScanningOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      <div className="scan-line" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
    </div>
  );
}

/**
 * Verification Stage Indicator — shows current processing stage with animations.
 */
export function StageIndicator({
  stage,
  message,
}: {
  stage: string;
  message: string;
}) {
  const stageIcons: Record<string, string> = {
    extracting: "🔍",
    analyzing: "🧠",
    searching: "🌐",
    judging: "⚖️",
  };

  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="animate-pulse-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <span className="text-lg">{stageIcons[stage] || "⏳"}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-300 typewriter-cursor">
          {message}
        </p>
        <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full animate-shimmer bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
        </div>
      </div>
    </div>
  );
}
