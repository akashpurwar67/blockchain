#!/usr/bin/env bash
# Lightweight runner to start blockchain, backend and frontend in background (no kills).
# Usage: bash run_all.sh

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGDIR="$ROOT_DIR/logs"
mkdir -p "$LOGDIR"

echo "Starting services from: $ROOT_DIR"

# 1) Start blockchain (if helper exists)
if [ -x "$ROOT_DIR/start-blockchain.sh" ]; then
  echo "Starting blockchain via start-blockchain.sh -> $LOGDIR/blockchain.log"
  nohup bash "$ROOT_DIR/start-blockchain.sh" > "$LOGDIR/blockchain.log" 2>&1 &
else
  echo "start-blockchain.sh not found or not executable in $ROOT_DIR."
  echo "If you have a docker-compose file, run: docker-compose -f network/docker-compose-dev.yaml up -d"
fi

# 2) Start backend (application-typescript)
if [ -d "$ROOT_DIR/application-typescript" ]; then
  echo "Starting backend (application-typescript) -> $LOGDIR/backend.log"
  (cd "$ROOT_DIR/application-typescript" && nohup npm run dev > "$LOGDIR/backend.log" 2>&1 &) 
else
  echo "Backend folder not found: $ROOT_DIR/application-typescript"
fi

# 3) Start frontend (frontend)
if [ -d "$ROOT_DIR/frontend" ]; then
  echo "Starting frontend (frontend) -> $LOGDIR/frontend.log"
  (cd "$ROOT_DIR/frontend" && nohup npm start > "$LOGDIR/frontend.log" 2>&1 &)
else
  echo "Frontend folder not found: $ROOT_DIR/frontend"
fi

sleep 1

echo "Logs: $LOGDIR"
echo "To watch logs: tail -f $LOGDIR/backend.log $LOGDIR/frontend.log $LOGDIR/blockchain.log"

echo "Run 'bash run_all.sh' to start services (no processes will be killed)."