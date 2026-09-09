import { useEffect, useRef, useState } from 'react'
import type * as CesiumNS from 'cesium'
import type { SatelliteGroup, SatellitePos } from '../../@types/types.ts'
import { createViewer } from './utils/viewer.ts'
import { findSatAtPosition } from './utils/pick.ts'
import {
  createHighlightEntity,
  createSatelliteEntity,
  updateHighlightPosition,
  updateSatellitePosition,
} from './utils/satelliteMapUtils.ts'
import { Tooltip, type TooltipData } from '../Tooltip.tsx'

interface SatelliteGlobeProps {
  sats: SatellitePos[]
  activeGroups: ReadonlySet<SatelliteGroup>
  selectedSatId: number | null
  onSelectSat: (id: number | null) => void
}

export const SatelliteGlobe = ({
  sats,
  activeGroups,
  selectedSatId,
  onSelectSat,
}: SatelliteGlobeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<CesiumNS.Viewer | null>(null)
  const entitiesRef = useRef<Map<number, CesiumNS.Entity>>(new Map())
  const satsRef = useRef<Map<number, SatellitePos>>(new Map())
  const highlightEntityRef = useRef<CesiumNS.Entity | null>(null)
  const highlightSatIdRef = useRef<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const onSelectSatRef = useRef(onSelectSat)
  onSelectSatRef.current = onSelectSat

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = createViewer(container)
    viewerRef.current = viewer

    const onClick = (e: MouseEvent) => {
      const sat = findSatAtPosition({
        viewer,
        sats: satsRef.current,
        clientX: e.clientX,
        clientY: e.clientY,
      })
      if (sat) {
        setTooltip({ x: e.clientX + 15, y: e.clientY + 15, sat })
        onSelectSatRef.current(sat.id)
      } else {
        setTooltip(null)
        onSelectSatRef.current(null)
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const sat = findSatAtPosition({
        viewer,
        sats: satsRef.current,
        clientX: e.clientX,
        clientY: e.clientY,
      })
      container.style.cursor = sat ? 'pointer' : ''
    }

    container.addEventListener('click', onClick)
    container.addEventListener('mousemove', onMouseMove)

    return () => {
      container.removeEventListener('click', onClick)
      container.removeEventListener('mousemove', onMouseMove)
      setTooltip(null)
      viewer.destroy()
      viewerRef.current = null
      entitiesRef.current.clear()
      satsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const filtered = sats.filter((sat) =>
      activeGroups.has(sat.group as SatelliteGroup),
    )
    satsRef.current = new Map(filtered.map((sat) => [sat.id, sat]))

    const seen = new Set<number>()
    for (const sat of filtered) {
      seen.add(sat.id)

      let entity = entitiesRef.current.get(sat.id)
      if (!entity) {
        entity = createSatelliteEntity(viewer, sat)
        entitiesRef.current.set(sat.id, entity)
      } else {
        updateSatellitePosition(entity, sat)
      }

      if (highlightSatIdRef.current === sat.id && highlightEntityRef.current) {
        updateHighlightPosition(highlightEntityRef.current, sat)
      }
    }

    for (const [id, entity] of entitiesRef.current) {
      if (!seen.has(id)) {
        viewer.entities.remove(entity)
        entitiesRef.current.delete(id)
      }
    }
  }, [sats, activeGroups])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    if (highlightEntityRef.current) {
      viewer.entities.remove(highlightEntityRef.current)
      highlightEntityRef.current = null
      highlightSatIdRef.current = null
    }

    if (selectedSatId !== null) {
      const sat = satsRef.current.get(selectedSatId)
      if (sat) {
        highlightEntityRef.current = createHighlightEntity(viewer, sat)
        highlightSatIdRef.current = sat.id
      }
    }
  }, [selectedSatId])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {tooltip && <Tooltip tooltip={tooltip} />}
    </>
  )
}
