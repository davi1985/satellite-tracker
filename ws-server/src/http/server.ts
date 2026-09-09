import http from 'node:http'
import type { Config } from '../config'
import { serveStatic } from './static'

type CreateServerOptions = {
  cfg: Config
  healthHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void
}

export const createServer = ({
  cfg,
  healthHandler,
}: CreateServerOptions): http.Server => {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      healthHandler(req, res)
      return
    }
    serveStatic({ frontendDir: cfg.frontendDir, reqUrl: req.url, res })
  })
}
