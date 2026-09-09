#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$ROOT_DIR/satellite-worker"
WS_DIR="$ROOT_DIR/ws-server"
FRONTEND_DIR="$ROOT_DIR/frontend"

WORKER_PID=""
WS_PID=""
OPEN_BROWSER="${OPEN_BROWSER:-1}"
PORT="${PORT:-8080}"
SKIP_FRONTEND_BUILD="${SKIP_FRONTEND_BUILD:-0}"

log() { printf "\033[1;36m[sat-tracker]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; exit 1; }

cleanup() {
  log "Shutting down processes..."
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
  [ -n "$WS_PID" ] && kill "$WS_PID" 2>/dev/null || true
  log "Done. Goodbye!"
}
trap cleanup EXIT INT TERM

# --- 1. Redis ---------------------------------------------------------------
log "Checking Redis..."
if ! redis-cli ping >/dev/null 2>&1; then
  if command -v redis-server >/dev/null 2>&1; then
    log "Redis installed but not running. Starting via brew services..."
    brew services start redis >/dev/null
    for i in {1..10}; do
      redis-cli ping >/dev/null 2>&1 && break
      sleep 1
    done
  else
    fail "Redis not found. Install with: brew install redis"
  fi
fi
redis-cli ping >/dev/null 2>&1 || fail "Failed to start Redis."
log "Redis OK."

# --- 2. Node dependencies ---------------------------------------------------
if [ ! -d "$WS_DIR/node_modules" ]; then
  log "Installing Node.js dependencies (ws-server)..."
  (cd "$WS_DIR" && npm install >/dev/null 2>&1) || fail "Failed to install dependencies (ws-server)."
fi

# --- 3. WS Server build ------------------------------------------------------
log "Building WS server (TypeScript)..."
(cd "$WS_DIR" && npm run build >/dev/null 2>&1) || fail "Failed to build WS server."

# --- 4. Frontend build -------------------------------------------------------
if [ "$SKIP_FRONTEND_BUILD" != "1" ]; then
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Installing Node.js dependencies (frontend)..."
    (cd "$FRONTEND_DIR" && npm install >/dev/null 2>&1) || fail "Failed to install dependencies (frontend)."
  fi
  log "Building frontend (Vite)..."
  (cd "$FRONTEND_DIR" && npm run build >/dev/null 2>&1) || fail "Failed to build frontend."
fi
[ -d "$FRONTEND_DIR/dist" ] && [ "$(ls -A "$FRONTEND_DIR/dist")" ] || fail "Frontend dist not found. Run: cd frontend && npm run build"

# --- 5. Go Worker ------------------------------------------------------------
log "Building Go worker..."
(cd "$WORKER_DIR" && go build -o satellite-worker ./cmd/satellite-worker/) || fail "Failed to build worker."
log "Starting Go worker..."
(cd "$WORKER_DIR" && exec ./satellite-worker > /tmp/satellite-worker.log 2>&1) &
WORKER_PID=$!

# --- 6. WS Server ------------------------------------------------------------
log "Starting WebSocket server..."
(cd "$WS_DIR" && exec env PORT="$PORT" node dist/index.js > /tmp/satellite-ws.log 2>&1) &
WS_PID=$!

# --- 7. Verify startup -------------------------------------------------------
for i in {1..20}; do
  if curl -s -o /dev/null "http://localhost:$PORT/health" 2>/dev/null; then
    break
  fi
  sleep 1
done
curl -s -o /dev/null "http://localhost:$PORT/health" 2>/dev/null || fail "WS server failed to start. See /tmp/satellite-ws.log"

log "All services running!"
log "  Frontend: http://localhost:$PORT"
log "  Health:   http://localhost:$PORT/health"
log "  Worker:   /tmp/satellite-worker.log"
log "  WS:       /tmp/satellite-ws.log"
echo

if [ "$OPEN_BROWSER" = "1" ]; then
  log "Opening browser..."
  open "http://localhost:$PORT"
fi

log "Press Ctrl+C to stop."
echo

wait