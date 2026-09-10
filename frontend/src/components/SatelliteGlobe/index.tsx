import { useEffect, useRef, useState } from 'react'
import type { SatelliteGroup, SatellitePos } from '../../@types/types.ts'
import { createViewer, type ThreeViewer } from './three/viewer.ts'
import { SatelliteManager } from './three/satellites.ts'
import { Tooltip, type TooltipData } from '../Tooltip.tsx'

interface SatelliteGlobeProps {
  sats: SatellitePos[]
  activeGroups: ReadonlySet<SatelliteGroup>
  selectedSatId: number | null
  onSelectSat: (id: number | null) => void
}

const DRAG_THRESHOLD_PX = 4

export const SatelliteGlobe = ({
  sats,
  activeGroups,
  selectedSatId,
  onSelectSat,
}: SatelliteGlobeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ThreeViewer | null>(null)
  const managerRef = useRef<SatelliteManager | null>(null)
  const satsRef = useRef<Map<number, SatellitePos>>(new Map())
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [webglError, setWebglError] = useState(false)
  const onSelectSatRef = useRef(onSelectSat)
  onSelectSatRef.current = onSelectSat

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let viewer: ThreeViewer | null = null
    try {
      viewer = createViewer(container)
    } catch {
      setWebglError(true)
      return
    }

    viewerRef.current = viewer
    const manager = new SatelliteManager(viewer.globeRoot, viewer.camera)
    managerRef.current = manager

    const pickAt = (e: MouseEvent): SatellitePos | null =>
      manager.pick(e.clientX, e.clientY, container.getBoundingClientRect())

    const onPointerDown = (e: PointerEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY }
    }

    const onClick = (e: MouseEvent) => {
      const down = pointerDownRef.current
      if (
        down &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD_PX
      ) {
        return
      }
      pointerDownRef.current = null

      const sat = pickAt(e)
      if (sat) {
        setTooltip({ x: e.clientX + 15, y: e.clientY + 15, sat })
        onSelectSatRef.current(sat.id)
      } else {
        setTooltip(null)
        onSelectSatRef.current(null)
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const sat = pickAt(e)
      container.style.cursor = sat ? 'pointer' : ''
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('click', onClick)
    container.addEventListener('mousemove', onMouseMove)

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('click', onClick)
      container.removeEventListener('mousemove', onMouseMove)
      setTooltip(null)
      manager.dispose()
      viewer.dispose()
      managerRef.current = null
      viewerRef.current = null
      satsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    const filtered = sats.filter((sat) =>
      activeGroups.has(sat.group as SatelliteGroup),
    )
    satsRef.current = new Map(filtered.map((sat) => [sat.id, sat]))
    manager.sync(filtered)
  }, [sats, activeGroups])

  useEffect(() => {
    managerRef.current?.setSelected(selectedSatId)
  }, [selectedSatId])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0">
        {webglError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-950 p-6 text-center text-slate-300">
            <p className="text-lg font-semibold text-white">
              WebGL indisponível
            </p>
            <p className="text-sm">
              O globo 3D precisa de WebGL. Habilite a aceleração de hardware no
              seu navegador e recarregue a página.
            </p>
          </div>
        )}
      </div>
      {tooltip && <Tooltip tooltip={tooltip} />}
    </>
  )
}