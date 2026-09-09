import { useCallback, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { SatelliteGlobe } from './components/SatelliteGlobe'
import type { SatelliteGroup } from './@types/types'
import { GROUPS } from './@types/types'
import { useSatellites } from './hooks/useSatellites'
import { useSatelliteWebSocket } from './hooks/useSatelliteWebSocket'
import { useFullscreen } from './hooks/useFullscreen'

export const App = () => {
  const sats = useSatellites()
  const { status, lastUpdate } = useSatelliteWebSocket()
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const [activeGroups, setActiveGroups] = useState<ReadonlySet<SatelliteGroup>>(
    () => new Set(GROUPS),
  )
  const [selectedSatId, setSelectedSatId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  const toggleGroup = useCallback((group: SatelliteGroup) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  return (
    <div className="relative h-full w-full">
      <SatelliteGlobe
        sats={sats}
        activeGroups={activeGroups}
        selectedSatId={selectedSatId}
        onSelectSat={setSelectedSatId}
      />
      {panelOpen ? (
        <ControlPanel
          status={status}
          sats={sats}
          lastUpdate={lastUpdate}
          activeGroups={activeGroups}
          onToggleGroup={toggleGroup}
          onTogglePanel={() => setPanelOpen(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          title="Show panel"
          className="fixed left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 p-2.5 text-slate-200 shadow-2xl backdrop-blur transition-colors hover:bg-slate-800/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M13 7 9 3 5 7l4 4" />
            <path d="m17 11 4 4-4 4-4-4" />
            <path d="m8 12 4 4 6-6-4-4Z" />
            <path d="m16 8 3-3" />
            <path d="M9 21a6 6 0 0 0-6-6" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="fixed bottom-4 right-4 z-10 flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/90 p-2.5 text-slate-200 shadow-2xl backdrop-blur transition-colors hover:bg-slate-800/90"
      >
        {isFullscreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        )}
      </button>
    </div>
  )
}
