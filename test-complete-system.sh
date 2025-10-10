#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "🧪 COMPLETE SYSTEM TEST - Dynamic Generation Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Configuration
TOPIC="Human Cell Mitochondria - Structure and ATP Production"
EXPECTED_STEPS=5
MIN_OPS_PER_STEP=30
MAX_TIME_SECONDS=600  # 10 minutes

echo "Test Configuration:"
echo "  Topic: $TOPIC"
echo "  Expected Steps: $EXPECTED_STEPS"
echo "  Min Operations/Step: $MIN_OPS_PER_STEP"
echo "  Max Time: ${MAX_TIME_SECONDS}s"
echo ""

# Start test
START_TIME=$(date +%s)
echo "🚀 Starting test at $(date)"
echo ""

# Create session
echo "1️⃣ Creating session..."
RESPONSE=$(curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$TOPIC\"}" \
  -s)

SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
  echo "❌ FAILED: Could not create session"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Session created: $SESSION_ID"
echo ""

# Monitor generation
echo "2️⃣ Monitoring generation progress..."
echo ""

LAST_STEP=0
for i in {1..120}; do  # 10 minutes max (120 * 5 seconds)
  CURRENT_STEP=$(redis-cli get "session:$SESSION_ID:current_step" 2>/dev/null | tr -d '"')
  CHUNKS=$(redis-cli keys "session:$SESSION_ID:step:*:chunk" 2>/dev/null | wc -l)
  
  if [ "$CHUNKS" != "$LAST_STEP" ]; then
    echo "[$i] Steps completed: $CHUNKS/$EXPECTED_STEPS"
    LAST_STEP=$CHUNKS
  fi
  
  if [ "$CHUNKS" -ge "$EXPECTED_STEPS" ]; then
    echo "✅ All steps completed!"
    break
  fi
  
  sleep 5
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "3️⃣ Analyzing results..."
echo ""

# Check each step
TOTAL_OPS=0
FAILED_STEPS=0
QUALITY_SCORES=()

for STEP in $(seq 1 $EXPECTED_STEPS); do
  CHUNK=$(redis-cli get "session:$SESSION_ID:step:$STEP:chunk" 2>/dev/null)
  
  if [ -z "$CHUNK" ] || [ "$CHUNK" == "(nil)" ]; then
    echo "Step $STEP: ❌ NOT GENERATED"
    ((FAILED_STEPS++))
    continue
  fi
  
  OPS_COUNT=$(echo "$CHUNK" | jq '.actions | length' 2>/dev/null)
  OP_TYPES=$(echo "$CHUNK" | jq -r '[.actions[].op] | group_by(.) | map({op: .[0], count: length}) | sort_by(.count) | reverse | .[] | "    \(.op): \(.count)"' 2>/dev/null)
  
  if [ "$OPS_COUNT" -ge "$MIN_OPS_PER_STEP" ]; then
    echo "Step $STEP: ✅ $OPS_COUNT operations"
  else
    echo "Step $STEP: ⚠️  $OPS_COUNT operations (below minimum)"
  fi
  
  echo "$OP_TYPES"
  
  TOTAL_OPS=$((TOTAL_OPS + OPS_COUNT))
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 TEST RESULTS"
echo "═══════════════════════════════════════════════════════"
echo ""

# Calculate success rate
SUCCESS_STEPS=$((EXPECTED_STEPS - FAILED_STEPS))
SUCCESS_RATE=$((SUCCESS_STEPS * 100 / EXPECTED_STEPS))

echo "Performance:"
echo "  Total Time: ${ELAPSED}s (limit: ${MAX_TIME_SECONDS}s)"
echo "  Steps Completed: $SUCCESS_STEPS/$EXPECTED_STEPS ($SUCCESS_RATE%)"
echo "  Total Operations: $TOTAL_OPS"
echo "  Avg Ops/Step: $((TOTAL_OPS / EXPECTED_STEPS))"
echo ""

echo "Quality Metrics:"
if [ "$SUCCESS_RATE" -ge 80 ]; then
  echo "  ✅ Success Rate: $SUCCESS_RATE% (PASS)"
else
  echo "  ❌ Success Rate: $SUCCESS_RATE% (FAIL - need 80%+)"
fi

if [ "$ELAPSED" -le "$MAX_TIME_SECONDS" ]; then
  echo "  ✅ Time: ${ELAPSED}s (PASS)"
else
  echo "  ❌ Time: ${ELAPSED}s (FAIL - exceeds ${MAX_TIME_SECONDS}s)"
fi

AVG_OPS=$((TOTAL_OPS / EXPECTED_STEPS))
if [ "$AVG_OPS" -ge "$MIN_OPS_PER_STEP" ]; then
  echo "  ✅ Avg Operations: $AVG_OPS (PASS)"
else
  echo "  ❌ Avg Operations: $AVG_OPS (FAIL - need ${MIN_OPS_PER_STEP}+)"
fi

echo ""

# Final verdict
if [ "$SUCCESS_RATE" -ge 80 ] && [ "$ELAPSED" -le "$MAX_TIME_SECONDS" ] && [ "$AVG_OPS" -ge "$MIN_OPS_PER_STEP" ]; then
  echo "🎉 OVERALL: PASS - System is production ready!"
  echo ""
  echo "✅ Dynamic generation working"
  echo "✅ All quality thresholds met"
  echo "✅ Performance acceptable"
  exit 0
else
  echo "❌ OVERALL: FAIL - System needs improvement"
  echo ""
  echo "Issues found:"
  if [ "$SUCCESS_RATE" -lt 80 ]; then
    echo "  - Success rate too low ($SUCCESS_RATE% < 80%)"
  fi
  if [ "$ELAPSED" -gt "$MAX_TIME_SECONDS" ]; then
    echo "  - Too slow (${ELAPSED}s > ${MAX_TIME_SECONDS}s)"
  fi
  if [ "$AVG_OPS" -lt "$MIN_OPS_PER_STEP" ]; then
    echo "  - Insufficient operations ($AVG_OPS < $MIN_OPS_PER_STEP)"
  fi
  exit 1
fi
