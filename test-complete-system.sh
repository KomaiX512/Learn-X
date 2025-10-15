#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "COMPLETE SYSTEM TEST - BRUTAL HONEST ANALYSIS"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Test topic
TOPIC="How does photosynthesis work in plants?"
SESSION_ID="test-$(date +%s)"

echo "Topic: $TOPIC"
echo "Session ID: $SESSION_ID"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "Step 1: Testing Backend Health"
echo "─────────────────────────────────────────────────────────────────"
curl -s http://localhost:8000/health | jq '.' || echo "❌ Backend not responding"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "Step 2: Sending Generation Request"
echo "─────────────────────────────────────────────────────────────────"
START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$TOPIC\", \"sessionId\": \"$SESSION_ID\"}")

echo "Response: $RESPONSE"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo "Step 3: Waiting for generation (60 seconds)..."
echo "─────────────────────────────────────────────────────────────────"

# Wait and monitor
for i in {1..60}; do
  echo -n "."
  sleep 1
done
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "Step 4: Checking Redis for Generated Content"
echo "─────────────────────────────────────────────────────────────────"

# Check what was generated
redis-cli KEYS "*${SESSION_ID}*" | head -20

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "Step 5: Checking Plan"
echo "─────────────────────────────────────────────────────────────────"
redis-cli GET "session:${SESSION_ID}:plan" | jq '.' 2>/dev/null || echo "No plan found"

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "Step 6: Checking Generated Steps"
echo "─────────────────────────────────────────────────────────────────"

for step in 1 2 3; do
  echo ""
  echo "Checking Step $step..."
  STEP_DATA=$(redis-cli GET "session:${SESSION_ID}:step:${step}:chunk")
  
  if [ -n "$STEP_DATA" ] && [ "$STEP_DATA" != "(nil)" ]; then
    echo "✅ Step $step EXISTS"
    
    # Parse step data
    ACTION_COUNT=$(echo "$STEP_DATA" | jq '.actions | length' 2>/dev/null || echo "0")
    HAS_NARRATION=$(echo "$STEP_DATA" | jq '.narration != null' 2>/dev/null || echo "false")
    NARRATION_COUNT=$(echo "$STEP_DATA" | jq '.narration.narrations | length' 2>/dev/null || echo "0")
    
    echo "  Actions: $ACTION_COUNT"
    echo "  Has Narration: $HAS_NARRATION"
    echo "  Narration Count: $NARRATION_COUNT"
    
    # Check action types
    echo "  Action types:"
    echo "$STEP_DATA" | jq -r '.actions[] | .op' 2>/dev/null | sort | uniq -c | head -10
    
  else
    echo "❌ Step $step MISSING"
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo "Total time: ${DURATION}s"
echo ""
