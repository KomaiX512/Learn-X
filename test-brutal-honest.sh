#!/bin/bash

echo "🔥 BRUTAL HONEST TEST OF LEARN-X SYSTEM"
echo "========================================="
echo ""

# Kill all processes
echo "1️⃣ Cleaning environment..."
pkill -f "ts-node-dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
sleep 2

# Start backend
echo "2️⃣ Starting backend..."
cd app/backend
npm run build
npm run dev &
BACKEND_PID=$!
sleep 8

# Test backend health
echo "3️⃣ Testing backend health..."
curl -s http://localhost:8000/health | jq '.ok' || echo "Backend not ready"

# Create a test session for Biology topic
echo "4️⃣ Testing Biology Topic (should use drawCellStructure, drawMembrane, etc.)..."
SESSION_ID=$(curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "DNA Replication in Cells"}' \
  -s | jq -r '.sessionId')

echo "Session ID: $SESSION_ID"

# Wait for generation
echo "5️⃣ Waiting for generation (max 3 minutes)..."
for i in {1..36}; do
  sleep 5
  echo -n "."
done
echo ""

# Analyze results
echo "6️⃣ ANALYZING RESULTS:"
echo "====================="

for STEP in 1 2 3 4 5; do
  echo ""
  echo "📊 STEP $STEP Analysis:"
  echo "------------------------"
  
  # Get operations count
  OPS=$(redis-cli get "session:$SESSION_ID:step:$STEP:chunk" 2>/dev/null | jq '.actions | length' 2>/dev/null)
  echo "Total operations: $OPS"
  
  if [ ! -z "$OPS" ] && [ "$OPS" != "null" ]; then
    # Count operation types
    echo "Operation breakdown:"
    redis-cli get "session:$SESSION_ID:step:$STEP:chunk" | jq -r '
      [.actions[].op] | 
      group_by(.) | 
      map({op: .[0], count: length}) | 
      sort_by(.count) | 
      reverse | 
      .[] | 
      "  - \(.op): \(.count)"'
    
    # Count domain-specific vs basic operations
    DOMAIN_OPS=$(redis-cli get "session:$SESSION_ID:step:$STEP:chunk" | jq '
      [.actions[].op | select(
        . == "drawCellStructure" or
        . == "drawMembrane" or 
        . == "drawMolecule" or
        . == "drawAtom" or
        . == "drawOrganSystem" or
        . == "drawMolecularStructure" or
        . == "drawReaction" or
        . == "drawBond" or
        . == "drawPhysicsObject" or
        . == "drawForceVector" or
        . == "drawCircuitElement"
      )] | length')
    
    CUSTOM_PATH=$(redis-cli get "session:$SESSION_ID:step:$STEP:chunk" | jq '[.actions[].op | select(. == "customPath")] | length')
    BASIC_SHAPES=$(redis-cli get "session:$SESSION_ID:step:$STEP:chunk" | jq '[.actions[].op | select(. == "drawCircle" or . == "drawRect" or . == "drawLine")] | length')
    
    echo ""
    echo "🎯 Quality Metrics:"
    echo "  Domain-specific operations: $DOMAIN_OPS"
    echo "  CustomPath operations: $CUSTOM_PATH"  
    echo "  Basic shapes: $BASIC_SHAPES"
    
    if [ "$DOMAIN_OPS" -gt 0 ]; then
      echo "  ✅ USING DOMAIN OPERATIONS!"
    else
      echo "  ❌ NO DOMAIN OPERATIONS - STILL USING FALLBACK!"
    fi
  else
    echo "  ⚠️ No data generated for this step"
  fi
done

# Performance metrics
echo ""
echo "7️⃣ PERFORMANCE METRICS:"
echo "========================"
curl -s http://localhost:8000/api/performance | grep -E "Avg|Cache|Success"

# Final verdict
echo ""
echo "8️⃣ BRUTAL HONEST VERDICT:"
echo "=========================="
TOTAL_DOMAIN=$(redis-cli --scan --pattern "session:$SESSION_ID:step:*:chunk" | xargs -I {} redis-cli get {} | jq -s '
  [.[].actions[].op | select(
    . == "drawCellStructure" or
    . == "drawMembrane" or 
    . == "drawMolecule" or
    . == "drawAtom" or
    . == "drawOrganSystem" or
    . == "drawMolecularStructure"
  )] | length' 2>/dev/null)

TOTAL_CUSTOM=$(redis-cli --scan --pattern "session:$SESSION_ID:step:*:chunk" | xargs -I {} redis-cli get {} | jq -s '[.[].actions[].op | select(. == "customPath")] | length' 2>/dev/null)

echo "Total domain-specific operations across all steps: $TOTAL_DOMAIN"
echo "Total customPath operations across all steps: $TOTAL_CUSTOM"

if [ "$TOTAL_DOMAIN" -gt 10 ]; then
  echo "✅ SUCCESS: System is generating domain-specific operations!"
else
  echo "❌ FAILURE: System is still using fallback/generic operations!"
fi

# Cleanup
echo ""
echo "9️⃣ Cleaning up..."
kill $BACKEND_PID 2>/dev/null

echo ""
echo "Test complete!"
