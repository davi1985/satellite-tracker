# 00 — System architecture (baby steps)

> Read this file first. It connects all the other parts.
> Then follow: `01-go-worker.md` → `02-node-ws-server.md` → `03-react-frontend.md`.

## The problem this project solves

We want to **watch satellites moving on screen, in real time**:

- we need to know **where each satellite is right now** (lat/lon/altitude);
- the position changes **every second** (orbits are fast);
- many users must see **the same thing at the same time** (broadcast);
- nobody wants to open one browser tab per satellite.

Satellites don't "talk" to the internet. They follow a mathematical orbital
prediction described in a file called a **TLE** (Two-Line Elements) — two fixed
text lines holding the orbit parameters. With an algorithm called **SGP4** you
can predict a satellite's position forward in time from its TLE.

So the whole system is: **fetch TLEs → compute positions → distribute them to
every browser**.

## Overview

```
                       ┌────────────────────────────────────────────┐
   ┌──────────┐        │           HIGH-LEVEL VIEW                │
   │CelesTrak │  TLE   │                                            │
   │   API    ├───────►│  GO WORKER (satellite-worker)             │
   └──────────┘        │  1. downloads TLEs for 5 groups            │
                       │  2. propagates with SGP4 every 1s          │
                       │  3. publishes positions on Redis           │
                       └──────────────┬─────────────────────────────┘
                                      │ POSITIONS (JSON)
                                      ▼
                       ┌─────────────────────────────┐
                       │        REDIS PUB/SUB        │  ← "mailbox"
                       │     channel: satellite:pos.  │     in the middle
                       └──────────────┬──────────────┘
                                      │ new message
                                      ▼
                       ┌─────────────────────────────┐
                       │  NODE WS-SERVER (ws-server) │
                       │  listens to Redis, forwards │
                       │  to ALL WebSockets          │
                       └──────────────┬──────────────┘
                                      │ WebSocket (push)
                                      ▼
                       ┌─────────────────────────────┐
                       │     FRONTEND (React)        │
                       │  Cesium.js renders on the   │
                       │  3D globe, once per second  │
                       └─────────────────────────────┘
```

## The data path, step by step

| Step | Service | What happens | Files |
|---|---|---|---|
| 1 | Go worker | Downloads TLEs for the 5 categories from CelesTrak | `internal/fetcher/fetcher.go` |
| 2 | Go worker | Converts OMM → TLE and keeps them in memory | `internal/fetcher/fetcher.go` |
| 3 | Go worker | Every 1 second runs SGP4 and computes lat/lon/alt | `internal/propagator/propagator.go` |
| 4 | Go worker | Serializes `[]SatellitePos` to JSON and publishes | `internal/publisher/redis.go` |
| 5 | Redis | Receives the message on channel `satellite:positions` and delivers it to subscribers | — (Redis, not our code) |
| 6 | Node | Subscribes to the Redis channel and, on every message, **broadcasts** | `src/redis/subscriber.ts` → `src/ws/broadcaster.ts` |
| 7 | Node | Caches the last message so late joiners get it instantly | `src/ws/broadcaster.ts` |
| 8 | React | Opens a WebSocket, receives the JSON and writes it into the React Query cache | `src/hooks/useSatelliteWebSocket.ts` |
| 9 | React | Creates/updates "dots" (billboards) on the Cesium globe | `src/components/SatelliteGlobe/` |
| 10 | User | Sees satellites moving, clicks one, a tooltip appears | `src/components/Tooltip.tsx` |

Read it top to bottom: it is exactly the order a data packet travels through the
system.

## Why three separate services?

Each service solves **a different kind of problem**, with the right language:

| Service | Type of problem | Why this language |
|---|---|---|
| **Go worker** | Heavy computation every 1s, networking, long-running daemons | Go is great for long-lived processes, has a mature SGP4 library and compiles to a single static binary (easy to run on a server) |
| **Node ws-server** | Network I/O: WebSockets and Redis, with hundreds of clients | Node is single-threaded + event loop, perfect for concurrent I/O ops that don't block |
| **React frontend** | Rich UI, state, rendering thousands of points | React keeps the interface declarative and easy to reason about |

They communicate **only** through standard, language-agnostic means:

- **Go → Redis**: pub/sub over the Redis protocol.
- **Redis → Node**: Node subscribes to the same channel.
- **Node → React**: WebSocket (`/ws`) on an HTTP server.
- **React**: pure client; it never talks to Go or Redis directly.

This separation keeps each piece testable and swappable in isolation.

## Cross-cutting concepts you need to know

### Publish/subscribe (pub/sub)

A channel where **publishers don't know who subscribes**. Go publishes to the
`satellite:positions` channel; Node subscribes to it. If a second subscriber
appears tomorrow (e.g., a logger), nobody changes code — it just subscribes to
the same channel.

### WebSocket

HTTP is "request-response": the client asks, the server answers, done.
WebSocket is a **continuous bidirectional channel** — the server can push
messages to the client **without the client asking**. It's the only practical
way to show 120 satellites moving without the browser doing polling.

### JSON as the contract between services

The Go `SatellitePos`:

```go
type SatellitePos struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Lat   float64 `json:"lat"`
	Lon   float64 `json:"lon"`
	Alt   float64 `json:"alt"`
	Group string  `json:"group"`
}
```

arrives identically in the React TypeScript:

```ts
export interface SatellitePos {
  id: number
  name: string
  lat: number
  lon: number
  alt: number
  group: string
}
```

It's literally the same JSON on both ends. **JSON is the contract** — any
service can read/write it, in any language.

## Consolidation exercises

1. Run the app and, with DevTools open, watch a WebSocket message arrive every 1s.
2. In the terminal: `redis-cli --json pubsub numsub satellite:positions` → should show 1 subscriber.
3. Kill the Go worker and watch the app "freeze" (data stops arriving).
4. Set a different `REDIS_CHANNEL` in the worker and ws-server → app breaks. Then align them again.

---
Next: [01-go-worker.md](01-go-worker.md)