import path from 'node:path'

export type Config = {
  port: number
  redisUrl: string
  redisChannel: string
  frontendDir: string
}

export const loadConfig = (): Config => ({
  port: Number(process.env.PORT || 8080),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisChannel: process.env.REDIS_CHANNEL || 'satellite:positions',
  frontendDir:
    process.env.FRONTEND_DIR || path.resolve(__dirname, '../../frontend/dist'),
})
