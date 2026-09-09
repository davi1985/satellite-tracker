import { useQuery } from '@tanstack/react-query'
import type { SatellitePos } from '../@types/types'

export const SATELLITES_KEY = ['satellites'] as const

export const useSatellites = () => {
  const query = useQuery<SatellitePos[]>({
    queryKey: SATELLITES_KEY,
    initialData: [],
  })

  return query.data ?? []
}
