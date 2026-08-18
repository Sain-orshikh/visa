import Image from "next/image"

interface LogoProps {
  /** Rendered box in px — the mark is square. */
  size?: number
  className?: string
  priority?: boolean
}

/**
 * The product mark. Sourced from public/logo.webp so brand changes are a file
 * swap, not a code change.
 */
export function Logo({ size = 40, className = "", priority = false }: LogoProps) {
  return (
    <Image
      src="/logo.webp"
      alt="Visa Tracker"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-lg object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
