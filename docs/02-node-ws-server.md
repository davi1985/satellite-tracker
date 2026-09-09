# 02 — The Node WS server (`ws-server`)

> What this document teaches (Node.js + TypeScript concepts, in order):
> 1. Node's single-threaded event loop — why it fits a WebSocket server
> 2. `type` vs `interface` and TypeScript strict mode
> 3. One options object instead of many parameters (project rule)
> 4. WebSocket server (`ws`) + redis subscriber → the reactive hub pattern
> 5. Caching the last message for late joiners
> 6. HTTP server serving static files (with path-traversal protection)
> 7. `import type` for types only
> 8. Config from environment variables
> 9. Graceful shutdown (SIGINT/SIGTERM)
> 10. CommonJS vs ESM (why `"type": "commonjs"` + `module: CommonJS`)

## The shape of the project

```
ws-server/
├── src/
│   ├── index.ts              ← composition root
│   ├── config/index.ts       ← env config
│   ├── types.ts              ← shared types (HealthResponse)
│   ├── http/
│   │   ├── server.ts         ← HTTP server + routing
│   │   └── static.ts         ← static file serving
│   ├── redis/
│   │   └── subscriber.ts     ← Redis pub/sub → message queue
│   └── ws/
│       └── broadcaster.ts    ← WebSocket fan-out
├── package.json
└── tsconfig.json
```

This mirrors the Go worker: a thin entry point (`index.ts`) that composes
specialized modules. The pattern (`config` / `redis` / `ws` / `http`) is the
same you saw in Go — solved differently, but the *thinking* transfers.

## Node's event loop, and why this is "the right tool"

Node runs JavaScript on **one thread**. There is no parallelism, but that's not
a limitation here — the server's job is almost 100% I/O:

```ts
await client.subscribe(channel, (message) => onMessage(message))
```

`client.subscribe` -> Redis responds -> callback fires -> `broadcaster` sends
to sockets. **Nothing here computes anything**; it waits on the network, and
node-redis handles that asynchronously.

- The thread is free while waiting for: the WebSocket connection, Redis
  replies, HTTP requests for static files.
- Blocking code (e.g. `fs.readFileSync`, `JSON.parse` on a 5 MB buffer) would
  freeze *all* clients simultaneously. That's why everything here is
  async/callback-based.
- Realistic deal: this pattern scales to hundreds/thousands of idle
  connections — exactly what a realtime fan-out server needs.

## `type` vs `interface` — and strict mode

The convention in this project is **`type` aliases** for object shapes:

```ts
export type Broadcaster = {
  latestData: string | null
  broadcast: (message: string) => void
  clientCount: () => number
}
```

```ts
export type Config = {
  port: number
  redisUrl: string
  redisChannel: string
  frontendDir: string
}
```

- `type X = {...}` creates a **type alias**; `interface X {...}` declares a
  type that can be merged/extended. For simple object shapes they behave the
  same → pick one and be consistent. Here: `type` everywhere (except where the
  ecosystem needs `interface`, like `extends` in React props).
- Type-only imports use `import type`:

```ts
import type { ServerResponse } from 'node:http'
```

  `import type` is erased at compile time — zero runtime cost.

- `tsconfig.json` has `"strict": true`, `noUnusedLocals`, `noUnusedParameters`
  — so undefined variables, and imports no one uses, fail the build instead of
  silently staying in the code.

## One options object — the project rule

In `src/http/server.ts`:

```ts
type CreateServerOptions = {
  cfg: Config
  healthHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void
}

export const createServer = ({
  cfg,
  healthHandler,
}: CreateServerOptions): http.Server => { ... }
```

The rule ("more than 1 parameter → a destructured options object with a `type`")
has a real payoff: at the call site you see **what each argument means**:

```ts
const server = createServer({
  cfg,
  healthHandler: (_req, res) => { ... },
})
```

Remember `serveStatic` and `subscribeToPositions` use the same style. Compare
with `http.createServer((req, res) => ...)` — positional, and you must read the
docs to know what `req`/`res` are.

## WebSocket server + Redis subscriber = the reactive hub

`src/ws/broadcaster.ts` holds the fan-out logic:

```ts
wss.on('connection', (ws: WebSocket) => {
  console.log(`Client connected (total: ${wss.clients.size})`)

  if (latestData) {
    ws.send(latestData) // catch-up for late joiners
  }

  ws.on('close', () => { ... })
  ws.on('error', (err: Error) => { ... })
})
```

And `src/redis/subscriber.ts` bridges Redis → broadcaster:

```ts
export const subscribeToPositions = async ({
  redisUrl,
  channel,
  onMessage,
}: SubscribeOptions): Promise<Subscriber> => {
  const client: RedisClientType = createClient({ url: redisUrl })
  client.on('error', (err) => console.error('Redis subscriber error:', err))

  await client.connect()
  await client.subscribe(channel, (message) => onMessage(message))

  return { async disconnect() { await client.quit() } }
}
```

In `index.ts` they are glued:

```ts
const subscriber = await subscribeToPositions({
  redisUrl: cfg.redisUrl,
  channel: cfg.redisChannel,
  onMessage: broadcaster.broadcast,
})
```

**Notice the decoupling:** `subscriber` never knows about WebSockets;
`broadcaster` never knows about Redis. The link between them is the
`onMessage: broadcaster.broadcast` callback — a construction-time dependency
injection. This makes both files independently testable.

## Caching the last message for late joiners

Inside `createBroadcaster`, a closure variable keeps the newest payload:

```ts
let latestData: string | null = null

// in the connection handler:
if (latestData) {
  ws.send(latestData)
}

// in broadcast():
latestData = message
```

- When a browser connects at second 37, it doesn't have to wait up to 1s for
  the next tick — it gets the last snapshot immediately.
- This is the classic **reconnect-on-late-arrival** behavior of realtime apps.
- `latestData` is captured in the *closure* of `createBroadcaster`, so no other
  code can corrupt it. This is what a "private variable" looks like in JS.

## HTTP server + static files with path-traversal protection

`src/http/static.ts` serves the built frontend:

```ts
const filePath = path.resolve(frontendDir, urlPath)

if (!filePath.startsWith(path.resolve(frontendDir))) {
  res.writeHead(403)
  res.end()
  return
}
```

Why the check: a request for `/../../etc/passwd` could **escape the frontend
folder** if the URL were naively joined. `path.resolve` normalizes `..`, and
the `startsWith` check rejects anything outside `frontendDir`. This is the
"never trust user input" principle applied to a filesystem path.

## Config from environment variables

`src/config/index.ts`:

```ts
export const loadConfig = (): Config => ({
  port: Number(process.env.PORT || 8080),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisChannel: process.env.REDIS_CHANNEL || 'satellite:positions',
  frontendDir:
    process.env.FRONTEND_DIR || path.resolve(__dirname, '../../frontend/dist'),
})
```

- Same env-driven idea as the Go worker → `.env.example` documents each key
  (`PORT`, `REDIS_URL`, `REDIS_CHANNEL`, `FRONTEND_DIR`).
- `Number(...)` for the port is a reminder that env vars are always strings.
- `config/index.ts` leverages the Node resolution rule: `import { loadConfig }
  from './config'` resolves to `src/config/index.ts` inside its folder.

## Graceful shutdown

```ts
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`)
  await subscriber.disconnect()
  server.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
```

- `SIGINT` (Ctrl+C) and `SIGTERM` (container orchestrators) trigger the same
  cleanup: **disconnect Redis** (stop receiving) → **close HTTP/WS** (stop
  accepting). No half-broken connections, no zombie processes.

## CommonJS vs ESM — why `package.json` says `"type": "commonjs"`

```json
"type": "commonjs",
"main": "dist/index.js",
"scripts": { "start": "node dist/index.js", "dev": "tsx watch src/index.ts" }
```

and `tsconfig.json`:

```json
"module": "CommonJS",
"moduleResolution": "node"
```

- `"type": "commonjs"` makes `.js` files use `require/module.exports`
  semantics.
- TypeScript compiles the ESM-style `import` you write in `src/` down to
  `require()` calls in `dist/` where it runs.
- Switching to ESM would mean `"type": "module"`, outputting `.mjs`/ESM — both
  are fine; just know which module system your deployment uses. The `dist`
  folder must match `startCommand: node dist/index.js`.

## The full wiring, once more

```
loadConfig()                 ← PORT, REDIS_URL, REDIS_CHANNEL, FRONTEND_DIR
      │
      ├─► createServer({ cfg, healthHandler })   → HTTP + /health + static
      │        │
      │        └─ new WebSocketServer({ server, path: '/ws' })
      │                                        └─ createBroadcaster(wss)
      │                                               │ (latestData)
      └─► subscribeToPositions({
              redisUrl, channel, onMessage: broadcaster.broadcast
           })
                  │  ← Redis pushes a message every 1s
                  ▼
           broadcaster.broadcast(json)  →  every connected ws.send(json)
```

## Questions to test yourself

1. Why can `broadcaster.ts` be tested without Redis, and `subscriber.ts`
   without WebSockets?
2. What would break if you removed the `if (latestData)` catch-up in
   `broadcaster.ts`?
3. `subscribeToPositions` returns a `Subscriber` object that can `disconnect`.
   Why does the caller need this instead of the function leaking the client?
4. What happens to a WebSocket message if two browsers connect, then one
   closes? Trace it through `wss.clients`.
5. Why is `onMessage: broadcaster.broadcast` passed *without* `.bind()`? (Hint:
   `broadcast` is an arrow-function property — what does that guarantee about
   `this`?)

---
Next: [03-react-frontend.md](03-react-frontend.md)