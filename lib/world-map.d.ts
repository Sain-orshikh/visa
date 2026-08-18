import type { DetailedHTMLProps, HTMLAttributes } from "react"

type WorldMapElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  projection?: string
  land?: string
  edge?: string
  accent?: string
  graticule?: string
  dots?: string
  "dot-step"?: string
  "dot-size"?: string
  markers?: string
  routes?: string
  draw?: string
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "world-map": WorldMapElementProps
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "world-map": WorldMapElementProps
    }
  }
}

export {}
