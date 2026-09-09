# Live Satellite Tracker

Real-time satellite tracker using CelesTrak TLE data with SGP4 orbital propagation.

## Architecture

```
┌─────────────────┐     ┌─────────┐     ┌──────────────────┐     ┌────────────┐
│  Celestrak API  │────▶│ Go      │────▶│ Redis (pub/sub)  │────▶│ Node.js    │
│  (TLE JSON)     │     │ Worker  │     │                  │     │ WS Server  │
└─────────────────┘     └─────────┘     └──────────────────┘     └──────┬─────┘
                                                                        │ WebSocket
                                                                        ▼
                                                                 ┌────────────┐
                                                                 │ Frontend   │
                                                                 │ Cesium.js  │
                                                                 │ 3D Globe   │
                                                                 └────────────┘
```

## Components

| Component  | Directory            | Stack                          |
|------------|----------------------|--------------------------------|
| Worker     | `satellite-worker/`  | Go + SGP4 + go-redis           |
| WS Server  | `ws-server/`         | Node.js + ws + node-redis      |
| Frontend   | `frontend/`          | Vite + Tailwind + Cesium.js    |

## How it works

1. The **Go Worker** fetches TLEs from CelesTrak (groups: stations, visual, gnss, weather, science)
2. Converts OMM → TLE and propagates orbits with **SGP4** every 1 second
3. Publishes positions (lat, lon, alt) to Redis via **pub/sub** on the `satellite:positions` channel
4. **Node.js** subscribes to the channel and **broadcasts** to every WebSocket client
5. The **Frontend** renders satellites as moving dots on a 3D globe with **real satellite imagery** (Esri World Imagery)

## Prerequisites

- Go 1.22+
- Node.js 20+
- Redis (local or Docker)

## Run everything at once

```bash
./start.sh
```

The script:
1. Checks/starts **Redis** (`brew services`)
2. Installs Node dependencies (if needed) and **builds the frontend** with Vite
3. Compiles and starts the **Go worker** in the background
4. Starts the **WS server** in the background
5. Opens the browser at **http://localhost:8080**
6. Stops all processes with **Ctrl+C**

Logs: `/tmp/satellite-worker.log` and `/tmp/satellite-ws.log`

Options:

| Variable                 | Meaning                                    |
|--------------------------|--------------------------------------------|
| `OPEN_BROWSER=0`         | Don't open the browser                     |
| `PORT=9000`              | Change the server port                     |
| `SKIP_FRONTEND_BUILD=1`  | Skip the Vite build (use existing `dist/`) |

## Development mode (frontend with HMR)

While services are running on port 8080, run Vite with hot reload:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. Vite proxies the `/ws` WebSocket to the WS server on 8080, so no extra config is needed.

## Run manually, step by step

### 1. Redis

```bash
brew install redis
brew services start redis
```

### 2. Go Worker

```bash
cd satellite-worker
go build -o satellite-worker ./cmd/satellite-worker/
./satellite-worker
```

### 3. WebSocket Server (serves the pre-built frontend)

```bash
cd frontend && npm install && npm run build
cd ../ws-server
npm install
npm start
```

### 4. Frontend

Open **http://localhost:8080**

The WS server serves both the static frontend (`frontend/dist`) and the WebSocket on the same port.

## Quick test

```bash
# Check the worker is publishing
redis-cli --json pubsub numsub satellite:positions
# Should show 1 subscriber (the WS server)

# Health check
curl http://localhost:8080/health
# {"status":"ok","clients":0}
```

## Supported satellite groups

The worker pulls the following CelesTrak groups:

- `stations` — ISS and space stations
- `visual` — 100+ brightest satellites
- `gnss` — GPS, GLONASS, Galileo, Beidou
- `weather` — weather satellites
- `science` — scientific satellites

Note: the full `active` group (16k+ objects) requires frequent updates and stricter CelesTrak usage; the groups above give a good real-time view while staying well within CelesTrak's usage policy.

## Customization

- **Port/Redis**: env vars `PORT`, `REDIS_URL` (WS server), `REDIS_ADDR`, `REDIS_CHANNEL` (worker). See `ws-server/.env.example` and `satellite-worker/.env.example`
- **Update frequency**: adjust `time.NewTicker(1 * time.Second)` in the worker
- **Groups**: edit the `Groups` list in `satellite-worker/internal/config/config.go`
- **Earth imagery**: swap the `imageryProvider` in `frontend/src/components/SatelliteGlobe/utils/viewer.ts`