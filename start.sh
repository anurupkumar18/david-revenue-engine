#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend (ICP profiles, contacts, revenue state)
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt -q
fi
export SCHEDULER_ENABLED="${SCHEDULER_ENABLED:-1}"
.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend (Next.js — unified UI)
cd "$ROOT"
if [ ! -d node_modules ]; then
  npm install -q
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "David Revenue Engine + ICP Studio running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
