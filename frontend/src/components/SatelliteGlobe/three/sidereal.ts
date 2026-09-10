import * as THREE from 'three'

// 360 degrees per sidereal day, in radians per millisecond.
const SIDEREAL_RATE_RAD_PER_MS = (2 * Math.PI) / 86164.0905

let anchorGmstRad = 0
let anchorTimeMs = 0
let hasAnchor = false

export const setSiderealAnchor = (gmstRad: number, timeMs: number): void => {
  if (!Number.isFinite(gmstRad) || !Number.isFinite(timeMs)) return
  anchorGmstRad = ((gmstRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  anchorTimeMs = timeMs
  hasAnchor = true
}

export const nowSiderealRad = (): number => {
  if (!hasAnchor) return 0
  return anchorGmstRad + (Date.now() - anchorTimeMs) * SIDEREAL_RATE_RAD_PER_MS
}

export const anchorSiderealDeg = (): number =>
  hasAnchor ? THREE.MathUtils.radToDeg(anchorGmstRad) : 0