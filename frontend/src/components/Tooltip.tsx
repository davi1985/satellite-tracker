import { useLayoutEffect, useRef } from 'react'
import type { SatellitePos } from '../@types/types'

export interface TooltipData {
  x: number
  y: number
  sat: SatellitePos
}

type ClampArgs = {
  value: number
  min: number
  max: number
}

const clamp = ({ value, min, max }: ClampArgs): number =>
  Math.max(min, Math.min(value, max))

export const Tooltip = ({ tooltip }: { tooltip: TooltipData }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const margin = 8
    const maxX = window.innerWidth - el.offsetWidth - margin
    const maxY = window.innerHeight - el.offsetHeight - margin
    el.style.left = `${clamp({ value: tooltip.x, min: margin, max: maxX })}px`
    el.style.top = `${clamp({ value: tooltip.y, min: margin, max: maxY })}px`
  }, [tooltip])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-20 min-w-48 rounded-lg border border-white/20 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-1.5 text-sm font-semibold text-white">
        {tooltip.sat.name}
      </div>
      <div className="space-y-0.5">
        <div>
          <span className="text-slate-500">NORAD ID:</span> {tooltip.sat.id}
        </div>
        <div>
          <span className="text-slate-500">Group:</span> {tooltip.sat.group}
        </div>
        <div>
          <span className="text-slate-500">Lat:</span>{' '}
          {tooltip.sat.lat.toFixed(4)}°
        </div>
        <div>
          <span className="text-slate-500">Lon:</span>{' '}
          {tooltip.sat.lon.toFixed(4)}°
        </div>
        <div>
          <span className="text-slate-500">Alt:</span>{' '}
          {Math.round(tooltip.sat.alt)} km
        </div>
      </div>
    </div>
  )
}
