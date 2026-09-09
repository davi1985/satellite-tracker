export interface SatellitePos {
  id: number
  name: string
  lat: number
  lon: number
  alt: number
  group: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export const GROUPS = [
  'stations',
  'visual',
  'gnss',
  'weather',
  'science',
] as const
export type SatelliteGroup = (typeof GROUPS)[number]

export const GROUP_COLORS: Record<SatelliteGroup, string> = {
  stations: '#ff4444',
  visual: '#4488ff',
  gnss: '#44ff88',
  weather: '#ffaa44',
  science: '#cc66ff',
}

export const GROUP_LABELS: Record<SatelliteGroup, string> = {
  stations: 'Space Stations',
  visual: 'Visual / Bright',
  gnss: 'GNSS Navigation',
  weather: 'Weather',
  science: 'Science',
}
