#!/bin/bash

# BRUTAL HONESTY TEST - Full System E2E
# No sugar coating, monitor everything

echo "════════════════════════════════════════════════"
echo "FULL SYSTEM TEST - BRUTAL HONESTY MODE"
echo "════════════════════════════════════════════════"
echo ""

# Kill existing processes
echo "🧹 Killing existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
sleep 2

# Start backend with full logging
echo "🚀 Starting backend..."
cd /home/komail/LEAF/Learn-X/app/backend
npm start > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend..."
sleep 10

# Check if backend is running
if ! lsof -ti:8000 > /dev/null 2>&1; then
    echo "❌ Backend failed to start!"
    cat /tmp/backend-test.log | tail -50
    exit 1
fi

echo "✅ Backend running on port 8000"

# Start frontend
echo "🚀 Starting frontend..."
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev > /tmp/frontend-test.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend
echo "⏳ Waiting for frontend..."
sleep 10

# Check if frontend is running
if ! lsof -ti:5174 > /dev/null 2>&1; then
    echo "❌ Frontend failed to start!"
    cat /tmp/frontend-test.log | tail -50
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Frontend running on port 5174"
echo ""
echo "════════════════════════════════════════════════"
echo "SYSTEM READY FOR TESTING"
echo "════════════════════════════════════════════════"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5174"
echo ""
echo "Backend log:  tail -f /tmp/backend-test.log"
echo "Frontend log: tail -f /tmp/frontend-test.log"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop monitoring..."
echo "════════════════════════════════════════════════"

# Monitor logs
tail -f /tmp/backend-test.log
