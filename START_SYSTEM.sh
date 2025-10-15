#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "LEARN-X SYSTEM STARTUP"
echo "═══════════════════════════════════════════════════════════"

# Kill existing processes
echo "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
pkill -f "ts-node-dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

echo "✅ Ports cleared"
echo ""

# Start backend
echo "Starting backend..."
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev > /tmp/learn-x-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend
echo "Waiting for backend to start..."
for i in {1..10}; do
  sleep 1
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend ready"
    break
  fi
  echo -n "."
done
echo ""

# Start frontend
echo "Starting frontend..."
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev > /tmp/learn-x-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ SYSTEM STARTED"
echo "═══════════════════════════════════════════════════════════"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Backend logs:  tail -f /tmp/learn-x-backend.log"
echo "Frontend logs: tail -f /tmp/learn-x-frontend.log"
echo ""
echo "To stop: pkill -f 'ts-node-dev' && pkill -f 'vite'"
echo "═══════════════════════════════════════════════════════════"
