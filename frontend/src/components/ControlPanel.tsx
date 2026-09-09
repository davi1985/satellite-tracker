import { useMemo } from 'react'
import type {
  ConnectionStatus,
  SatelliteGroup,
  SatellitePos,
} from '../@types/types'
import { GROUP_COLORS, GROUP_LABELS, GROUPS } from '../@types/types'

interface ControlPanelProps {
  status: ConnectionStatus
  sats: SatellitePos[]
  lastUpdate: Date | null
  activeGroups: ReadonlySet<SatelliteGroup>
  onToggleGroup: (group: SatelliteGroup) => void
  onTogglePanel: () => void
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected - retrying...',
}

export const ControlPanel = ({
  status,
  sats,
  lastUpdate,
  activeGroups,
  onToggleGroup,
  onTogglePanel,
}: ControlPanelProps) => {
  const connected = status === 'connected'

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sat of sats) {
      counts[sat.group] = (counts[sat.group] ?? 0) + 1
    }

    return counts
  }, [sats])

  return (
    <div className="fixed left-4 top-4 z-10 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-white/10 bg-slate-900/90 p-4 text-slate-200 shadow-2xl backdrop-blur">
      <h1 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M13 7 9 3 5 7l4 4" />
          <path d="m17 11 4 4-4 4-4-4" />
          <path d="m8 12 4 4 6-6-4-4Z" />
          <path d="m16 8 3-3" />
          <path d="M9 21a6 6 0 0 0-6-6" />
        </svg>
        Live Satellite Tracker
      </h1>
      <button
        type="button"
        onClick={onTogglePanel}
        title="Hide panel"
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
        <span>{STATUS_LABEL[status]}</span>
      </div>

      <div className="mb-3 space-y-1 text-xs text-slate-400">
        <div>
          Satellites: <strong className="text-slate-100">{sats.length}</strong>
        </div>
        <div>
          Last update:{' '}
          <strong className="text-slate-100">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
          </strong>
        </div>
      </div>

      <p className="mb-3 text-[11px] text-slate-500">
        Click on a satellite to see details.
      </p>

      <div className="space-y-1 border-t border-white/10 pt-3">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Groups
        </div>
        {GROUPS.map((group) => (
          <label
            key={group}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-300 hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={activeGroups.has(group)}
              onChange={() => onToggleGroup(group)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-slate-700 text-emerald-500 accent-emerald-500"
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: GROUP_COLORS[group] }}
            />
            <span className="flex-1">{GROUP_LABELS[group]}</span>
            <span className="text-[10px] text-slate-500">
              {groupCounts[group] ?? 0}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
