#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🏆 FINAL PRODUCTION TEST - BEAT 3BLUE1BROWN"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Start backend
echo "🚀 Starting backend..."
cd /home/komail/LeaF/app
npm run dev > /tmp/final_test_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend
echo "⏳ Waiting for backend (15 seconds)..."
sleep 15

# Check backend
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo "✅ Backend running!"
else
    echo "❌ Backend failed to start!"
    tail -20 /tmp/final_test_backend.log
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧪 RUNNING FINAL VALIDATION TEST"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

cd /home/komail/LeaF
timeout 75 node FINAL_PRODUCTION_VALIDATION.js 2>&1 | tee /tmp/final_test_output.txt

TEST_RESULT=$?

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📋 BACKEND LOGS (Last 60 lines)"
echo "════════════════════════════════════════════════════════════════════════════════"
tail -60 /tmp/final_test_backend.log

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 WE BEAT 3BLUE1BROWN! READY TO ANNOUNCE!"
else
    echo "⚠️  Test completed - Check results for details"
fi

echo "════════════════════════════════════════════════════════════════════════════════"

exit $TEST_RESULT
