import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

export type ServeStaticOptions = {
  frontendDir: string
  reqUrl: string | undefined
  res: ServerResponse
}

export const serveStatic = ({
  frontendDir,
  reqUrl,
  res,
}: ServeStaticOptions): void => {
  const urlPath =
    reqUrl === '/' ? 'index.html' : (reqUrl ?? '').replace(/^\/+/, '')
  const filePath = path.resolve(frontendDir, urlPath)

  if (!filePath.startsWith(path.resolve(frontendDir))) {
    res.writeHead(403)
    res.end()
    return
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' })
    res.end(content)
  })
}
