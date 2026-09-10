import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ConnectionStatus, SatelliteFrame, SatellitePos } from '../@types/types'
import { setSiderealAnchor } from '../components/SatelliteGlobe/three/sidereal'
import { SATELLITES_KEY } from './useSatellites'

const RECONNECT_DELAY = 3000

const wsUrl = (): string => {
  const custom = import.meta.env.VITE_WS_URL as string | undefined
  if (custom) return `${custom.replace(/\/+$/, '')}/ws`
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

export const useSatelliteWebSocket = (): {
  status: ConnectionStatus
  lastUpdate: Date | null
} => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const retryTimer = useRef<number | null>(null)

  useEffect(() => {
    let disposed = false
    let socket: WebSocket | null = null

    const connect = () => {
      socket = new WebSocket(wsUrl())
      setStatus('connecting')

      socket.onopen = () => {
        if (!disposed) setStatus('connected')
      }

      socket.onmessage = (event) => {
        if (disposed) return
        try {
          const raw = JSON.parse(event.data) as unknown

          const frame = raw as SatelliteFrame
          if (Array.isArray(frame)) {
            queryClient.setQueryData(SATELLITES_KEY, raw as SatellitePos[])
            setLastUpdate(new Date())
            return
          }

          if (!Array.isArray(frame?.positions)) return
          if (Number.isFinite(frame.gmst) && Number.isFinite(frame.time)) {
            setSiderealAnchor(frame.gmst, frame.time)
          }
          queryClient.setQueryData(SATELLITES_KEY, frame.positions)
          setLastUpdate(new Date())
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }

      socket.onclose = () => {
        if (disposed) return
        setStatus('disconnected')
        retryTimer.current = window.setTimeout(connect, RECONNECT_DELAY)
      }

      socket.onerror = () => {
        if (!disposed) setStatus('disconnected')
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current)
      }
      socket?.close()
    }
  }, [queryClient])

  return { status, lastUpdate }
}
