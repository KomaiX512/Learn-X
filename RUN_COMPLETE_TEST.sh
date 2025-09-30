#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔬 COMPLETE PRODUCTION TEST WITH FRESH START"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -9 -f "ts-node-dev.*backend" 2>/dev/null
pkill -9 -f "vite.*5174" 2>/dev/null
sleep 2

# Start backend
echo "🚀 Starting backend..."
cd /home/komail/LeaF/app
npm run dev > /tmp/backend_test.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start (15 seconds)..."
sleep 15

# Check if backend is running
if ! curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo "❌ Backend failed to start!"
    tail -20 /tmp/backend_test.log
    exit 1
fi

echo "✅ Backend is running!"
echo ""

# Run the comprehensive test
echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧪 RUNNING COMPREHENSIVE TEST"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

cd /home/komail/LeaF
timeout 75 node COMPLETE_SYSTEM_TEST.js 2>&1 | tee /tmp/test_output.txt

# Show backend logs
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📋 BACKEND LOGS (Last 50 lines)"
echo "════════════════════════════════════════════════════════════════════════════════"
tail -50 /tmp/backend_test.log

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✅ TEST COMPLETE - Check complete_system_analysis.json for details"
echo "════════════════════════════════════════════════════════════════════════════════"
