import type { SVGProps } from "react"

/** Minimalist geometric passport mark used as the app logo. */
export function Passport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <circle cx="12" cy="9.5" r="3" />
      <path d="M9.2 15.5h5.6" />
      <path d="M10 18h4" />
    </svg>
  )
}
