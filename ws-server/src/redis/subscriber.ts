import { createClient, type RedisClientType } from 'redis'

export type Subscriber = {
  disconnect: () => Promise<void>
}

export type SubscribeOptions = {
  redisUrl: string
  channel: string
  onMessage: (message: string) => void
}

export const subscribeToPositions = async ({
  redisUrl,
  channel,
  onMessage,
}: SubscribeOptions): Promise<Subscriber> => {
  const client: RedisClientType = createClient({ url: redisUrl })
  client.on('error', (err) => console.error('Redis subscriber error:', err))

  await client.connect()
  console.log('Subscribed to Redis channel:', channel)
  await client.subscribe(channel, (message) => onMessage(message))

  return {
    async disconnect() {
      await client.quit()
    },
  }
}
