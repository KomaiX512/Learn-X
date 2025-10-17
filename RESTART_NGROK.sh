#!/bin/bash
# Script to restart ngrok on the correct port (backend)

echo "🔴 Stopping current ngrok..."
pkill ngrok
sleep 1

echo "✅ Backend is running on port 8000:"
curl -s http://localhost:8000/ | jq -r '.name' 2>/dev/null || echo "⚠️  Backend not responding"

echo ""
echo "🚀 Starting ngrok on port 8000 (backend)..."
echo "   This will expose your API, not the frontend."
echo ""
echo "   After ngrok starts, you'll see a URL like:"
echo "   https://xxxxx.ngrok-free.app"
echo ""
echo "   Test it with:"
echo "   curl https://YOUR-NGROK-URL/health"
echo ""

ngrok http 8000
