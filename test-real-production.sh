#!/bin/bash

echo "████████████████████████████████████████████████████████████████████████████████"
echo "🔥 REAL PRODUCTION TEST - NO CACHE - BRUTAL HONESTY"
echo "████████████████████████████████████████████████████████████████████████████████"
echo ""

# Kill existing processes
echo "🧹 Cleaning environment..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend
echo "🚀 Starting backend (fresh, no cache)..."
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev > /tmp/real-production-test.log 2>&1 &
BACKEND_PID=$!

sleep 8

# Check health
if curl -s http://localhost:8000/health | grep -q '"ok":true'; then
    echo "✅ Backend ready"
else
    echo "❌ Backend failed"
    exit 1
fi

# New query (different from cache)
SESSION_ID="real-test-$(date +%s)"
QUERY="explain how solar panels convert sunlight into electricity"

echo ""
echo "📋 TEST QUERY: $QUERY"
echo "Session: $SESSION_ID"
echo ""
echo "⏳ This will take 60-90 seconds for REAL generation..."
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Submit query
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$QUERY\",\"sessionId\":\"$SESSION_ID\"}" \
  > /dev/null 2>&1 &

# Monitor for 120 seconds
echo "📊 REAL-TIME MONITORING..."
echo ""

timeout 120 tail -f /tmp/real-production-test.log 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📈 TEST COMPLETE"
echo "════════════════════════════════════════════════════════════════════════════════"

# Save log
cp /tmp/real-production-test.log /home/komail/LEAF/Learn-X/REAL_PRODUCTION_LOG.txt
echo "📄 Log saved: REAL_PRODUCTION_LOG.txt"

# Kill backend
kill $BACKEND_PID 2>/dev/null || true

echo "✅ Test complete - analyze with: node analyze-real-production.js"
