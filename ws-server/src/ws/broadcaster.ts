import { WebSocketServer, type WebSocket } from 'ws'

export type Broadcaster = {
  latestData: string | null
  broadcast: (message: string) => void
  clientCount: () => number
}

export const createBroadcaster = (wss: WebSocketServer): Broadcaster => {
  let latestData: string | null = null

  wss.on('connection', (ws: WebSocket) => {
    console.log(`Client connected (total: ${wss.clients.size})`)

    if (latestData) {
      ws.send(latestData)
    }

    ws.on('close', () => {
      console.log(`Client disconnected (total: ${wss.clients.size})`)
    })

    ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err.message)
    })
  })

  return {
    get latestData() {
      return latestData
    },
    broadcast(message: string) {
      latestData = message
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send(message)
        }
      }
    },
    clientCount() {
      return wss.clients.size
    },
  }
}
