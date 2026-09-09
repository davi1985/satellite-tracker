import { WebSocketServer } from 'ws'
import { loadConfig } from './config'
import { createServer } from './http/server'
import { createBroadcaster } from './ws/broadcaster'
import { subscribeToPositions } from './redis/subscriber'
import type { HealthResponse } from './types'

const createApp = async (): Promise<void> => {
  const cfg = loadConfig()

  const server = createServer({
    cfg,
    healthHandler: (_req, res) => {
      const clients = wss.clients.size
      const body: HealthResponse = { status: 'ok', clients }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    },
  })

  const wss = new WebSocketServer({ server, path: '/ws' })
  const broadcaster = createBroadcaster(wss)

  const subscriber = await subscribeToPositions({
    redisUrl: cfg.redisUrl,
    channel: cfg.redisChannel,
    onMessage: broadcaster.broadcast,
  })

  server.listen(cfg.port, () => {
    console.log(`Satellite Tracker running on http://localhost:${cfg.port}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`)
    await subscriber.disconnect()
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

createApp().catch(console.error)
