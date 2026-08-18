import Image from "next/image"

interface LogoProps {
  /** Rendered box in px — the mark is square. */
  size?: number
  className?: string
}

/**
 * The Passage mark, from public/logo.webp. Square source, so width and height
 * track `size` together; decorative everywhere it appears next to the wordmark,
 * hence the empty alt.
 */
export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <Image
      src="/logo.webp"
      alt=""
      width={size}
      height={size}
      priority
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
