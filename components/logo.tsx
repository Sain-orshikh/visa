interface LogoProps {
  /** Rendered box in px — the mark is square. */
  size?: number
  className?: string
}

/**
 * The Passage mark — a ring with a gap: a border you pass through. The gap
 * sits at the top-left so the mark still resolves at 16px (favicon size).
 */
export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle
        cx="15"
        cy="15"
        r="12"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.6"
        strokeDasharray="56 19"
        transform="rotate(-58 15 15)"
      />
    </svg>
  )
}
