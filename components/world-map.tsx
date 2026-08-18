"use client"

import Script from "next/script"
import type { CSSProperties } from "react"

interface WorldMapProps {
  projection?: "naturalEarth" | "mercator"
  land?: string
  edge?: string
  accent?: string
  graticule?: boolean
  dots?: boolean
  dotStep?: number
  dotSize?: number
  markers?: string
  routes?: string
  draw?: boolean
  /** Send a glowing light travelling along each route. */
  spark?: boolean
  style?: CSSProperties
  className?: string
}

/**
 * Wraps the `<world-map>` custom element (public/world-map.js, ported
 * verbatim from the Nocturne design canvas) — real Natural Earth geometry
 * via d3-geo + TopoJSON, loaded lazily from CDN on first use so it never
 * blocks first paint.
 */
export function WorldMap({
  projection = "naturalEarth",
  land,
  edge,
  accent,
  graticule,
  dots,
  dotStep,
  dotSize,
  markers,
  routes,
  draw,
  spark,
  style,
  className,
}: WorldMapProps) {
  return (
    <>
      <Script src="/world-map.js" strategy="afterInteractive" />
      <world-map
        projection={projection}
        land={land}
        edge={edge}
        accent={accent}
        graticule={graticule ? "on" : undefined}
        dots={dots ? "on" : undefined}
        dot-step={dotStep?.toString()}
        dot-size={dotSize?.toString()}
        markers={markers}
        routes={routes}
        draw={draw ? "on" : undefined}
        spark={spark ? "on" : undefined}
        style={style}
        className={className}
      />
    </>
  )
}
