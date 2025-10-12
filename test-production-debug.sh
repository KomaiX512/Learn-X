#!/bin/bash

# PRODUCTION DEBUG TEST
# Brutally honest analysis of the system

echo "████████████████████████████████████████████████████████████████████████████████"
echo "🔍 PRODUCTION DEBUG TEST - BRUTALLY HONEST ANALYSIS"
echo "████████████████████████████████████████████████████████████████████████████████"
echo ""

# Clean environment
echo "🧹 Cleaning environment..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend with logging
echo "🚀 Starting backend server..."
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev > /tmp/backend-debug.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend
echo "⏳ Waiting for backend to be ready..."
sleep 8

# Check backend health
HEALTH=$(curl -s http://localhost:8000/health 2>&1)
if [[ $HEALTH == *'"ok":true'* ]]; then
    echo "✅ Backend is READY"
else
    echo "❌ Backend FAILED to start"
    cat /tmp/backend-debug.log | tail -20
    exit 1
fi

# Submit test query
echo ""
echo "📋 TEST QUERY: Photosynthesis in Plants"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

SESSION_ID="debug-test-$(date +%s)"
echo "Session ID: $SESSION_ID"

# Submit query and monitor
echo "⏳ Submitting query and monitoring generation..."
echo ""

curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"teach me how photosynthesis works in plants\",\"sessionId\":\"$SESSION_ID\"}" \
  2>&1 &

# Monitor backend logs in real-time
echo "📊 MONITORING BACKEND LOGS (90 seconds)..."
echo "════════════════════════════════════════════════════════════════════════════════"

# Tail logs for 90 seconds
timeout 90 tail -f /tmp/backend-debug.log 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📈 ANALYSIS COMPLETE"
echo "════════════════════════════════════════════════════════════════════════════════"

# Extract key metrics from logs
echo ""
echo "🔍 EXTRACTING KEY METRICS..."
echo ""

# Count steps generated
STEPS_COUNT=$(grep -c "🚀 ABOUT TO EMIT STEP" /tmp/backend-debug.log || echo "0")
echo "Steps Generated: $STEPS_COUNT"

# Count actions per step
echo ""
echo "Actions per step:"
grep "Actions:" /tmp/backend-debug.log | head -10

# Check for animations
echo ""
echo "Animation counts:"
grep "ANIMATIONS:" /tmp/backend-debug.log | head -10

# Check for failures
echo ""
echo "❌ Errors/Failures:"
grep -i "error\|fail\|❌" /tmp/backend-debug.log | tail -20 || echo "No errors found"

# Save full log
cp /tmp/backend-debug.log /home/komail/LEAF/Learn-X/PRODUCTION_DEBUG_LOG.txt
echo ""
echo "📄 Full log saved to: PRODUCTION_DEBUG_LOG.txt"

# Cleanup
kill $BACKEND_PID 2>/dev/null || true

echo ""
echo "✅ Debug test complete"
