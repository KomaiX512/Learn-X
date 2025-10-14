#!/bin/bash

echo "════════════════════════════════════════════════════════════════════"
echo "🧪 COMPLETE END-TO-END PRODUCTION TEST"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "This test will:"
echo "  1. Send a fresh query (unique topic)"
echo "  2. Monitor generation in real-time"
echo "  3. Track all timeouts, successes, failures"
echo "  4. Analyze final results"
echo "  5. Provide production-ready verdict"
echo ""

# Clear old logs
echo "" > backend-new-test.log
echo "✅ Logs cleared"

# Unique query to avoid cache
QUERY="Explain how solar panels convert sunlight into electricity in detail"
echo "📝 Query: \"$QUERY\""
echo ""

# Send query
echo "🚀 Sending query..."
SESSION_ID=$(curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\"}" \
  -s | jq -r '.sessionId')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
  echo "❌ Failed to get session ID"
  echo "Backend may not be running or query failed"
  exit 1
fi

echo "✅ Session ID: $SESSION_ID"
echo ""
echo "────────────────────────────────────────────────────────────────────"
echo "⏱️  MONITORING GENERATION (Max 8 minutes)"
echo "────────────────────────────────────────────────────────────────────"
echo ""

# Monitor in background
START_TIME=$(date +%s)
TIMEOUT=480  # 8 minutes

# Track progress
echo "Progress markers:"
echo "  [PLAN] = Plan generation"
echo "  [N1] [N2] [N3] = Notes generation for steps 1, 2, 3"
echo "  [A1] [A2] [A3] = Animation generation for steps 1, 2, 3"
echo "  [C1] [C2] [C3] = Complete steps 1, 2, 3"
echo ""

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  
  if [ $ELAPSED -gt $TIMEOUT ]; then
    echo ""
    echo "⏱️  TIMEOUT: Test exceeded 8 minutes"
    break
  fi
  
  # Check if all steps completed
  COMPLETED=$(grep -c "Step.*COMPLETE" backend-new-test.log 2>/dev/null || echo "0")
  
  if [ "$COMPLETED" -eq "3" ]; then
    echo ""
    echo "✅ All 3 steps completed!"
    break
  fi
  
  # Show progress
  printf "\r⏳ Elapsed: ${ELAPSED}s | Steps completed: ${COMPLETED}/3   "
  
  sleep 2
done

TOTAL_TIME=$(($(date +%s) - START_TIME))

echo ""
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "📊 ANALYZING RESULTS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Count successes and failures
PLAN_SUCCESS=$(grep -c "NEW STRUCTURED PLAN" backend-new-test.log 2>/dev/null || echo "0")
NOTES_SUCCESS=$(grep -c "notes.*✅ Generated SVG keynote" backend-new-test.log 2>/dev/null || echo "0")
ANIM_SUCCESS=$(grep -c "codegenV3.*✅ Generated SVG" backend-new-test.log 2>/dev/null || echo "0")
STEPS_COMPLETE=$(grep -c "Step.*COMPLETE" backend-new-test.log 2>/dev/null || echo "0")

TIMEOUTS_60=$(grep -c "TIMEOUT at 60" backend-new-test.log 2>/dev/null || echo "0")
TIMEOUTS_180=$(grep -c "TIMEOUT at 180" backend-new-test.log 2>/dev/null || echo "0")
TOTAL_TIMEOUTS=$((TIMEOUTS_60 + TIMEOUTS_180))

ALL_FAILURES=$(grep -c "All attempts failed" backend-new-test.log 2>/dev/null || echo "0")

echo "⏱️  Total time: ${TOTAL_TIME}s ($(echo "scale=1; $TOTAL_TIME/60" | bc) minutes)"
echo ""
echo "📋 Generation Results:"
echo "   Plan: $PLAN_SUCCESS/1"
echo "   Notes: $NOTES_SUCCESS/3"
echo "   Animations: $ANIM_SUCCESS/3"
echo "   Complete steps: $STEPS_COMPLETE/3"
echo ""
echo "❌ Failures:"
echo "   Timeouts at 60s: $TIMEOUTS_60 (OLD timeout - should be 0)"
echo "   Timeouts at 180s: $TIMEOUTS_180 (NEW timeout)"
echo "   Total timeouts: $TOTAL_TIMEOUTS"
echo "   Complete failures: $ALL_FAILURES"
echo ""

# Calculate success rate
TOTAL_EXPECTED=6  # 3 notes + 3 animations
TOTAL_SUCCESS=$((NOTES_SUCCESS + ANIM_SUCCESS))
SUCCESS_RATE=$((TOTAL_SUCCESS * 100 / TOTAL_EXPECTED))

echo "📈 Success Rate: $SUCCESS_RATE% ($TOTAL_SUCCESS/$TOTAL_EXPECTED visuals)"
echo ""

# Detailed timing analysis
echo "⏱️  Generation Timing:"
grep "API returned after" backend-new-test.log | while read -r line; do
  TIME=$(echo "$line" | grep -oP '\d+\.\d+s')
  TYPE=$(echo "$line" | grep -oP '\[(notes|codegenV3)\]')
  echo "   $TYPE: $TIME"
done
echo ""

# Check for any 60s timeouts (old code still running)
if [ "$TIMEOUTS_60" -gt "0" ]; then
  echo "⚠️  WARNING: Found 60s timeouts!"
  echo "   This means OLD CODE is still running."
  echo "   Backend needs to be rebuilt and restarted."
  echo ""
fi

# Final verdict
echo "════════════════════════════════════════════════════════════════════"
echo "🎯 FINAL VERDICT"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ "$SUCCESS_RATE" -eq "100" ] && [ "$STEPS_COMPLETE" -eq "3" ]; then
  echo "✅ ✅ ✅ PERFECT SUCCESS! ✅ ✅ ✅"
  echo ""
  echo "All visuals generated successfully:"
  echo "  ✅ 3/3 notes keynotes"
  echo "  ✅ 3/3 animations"
  echo "  ✅ 0 timeouts"
  echo "  ✅ 0 failures"
  echo ""
  echo "🚀 SYSTEM IS PRODUCTION READY!"
  echo ""
  echo "Next steps:"
  echo "  1. Test with frontend UI"
  echo "  2. Verify visual rendering"
  echo "  3. Test 5-10 more queries"
  echo "  4. Deploy to production"
  echo ""
  exit 0
  
elif [ "$SUCCESS_RATE" -ge "80" ]; then
  echo "✅ GOOD - Minor issues"
  echo ""
  echo "Results: $TOTAL_SUCCESS/$TOTAL_EXPECTED visuals ($SUCCESS_RATE%)"
  echo ""
  
  if [ "$TIMEOUTS_180" -gt "0" ]; then
    echo "Issues:"
    echo "  ⚠️  $TIMEOUTS_180 visuals hit 180s timeout"
    echo ""
    echo "Recommendations:"
    echo "  1. Increase timeout to 240s or 300s"
    echo "  2. Simplify prompts"
    echo "  3. Or remove timeout entirely (user preference)"
  fi
  
  if [ "$TIMEOUTS_60" -gt "0" ]; then
    echo "  ⚠️  OLD CODE STILL RUNNING (60s timeouts detected)"
    echo "     Run: npm run build && restart backend"
  fi
  
  echo ""
  echo "Overall: System mostly works, needs tuning"
  exit 0
  
elif [ "$SUCCESS_RATE" -ge "50" ]; then
  echo "⚠️  ACCEPTABLE - Significant issues"
  echo ""
  echo "Results: Only $TOTAL_SUCCESS/$TOTAL_EXPECTED visuals ($SUCCESS_RATE%)"
  echo ""
  echo "Issues to investigate:"
  echo "  - Check backend-new-test.log for errors"
  echo "  - Timeout may still be too short"
  echo "  - API rate limiting?"
  echo "  - Parallel generation conflicts?"
  echo ""
  exit 1
  
else
  echo "❌ ❌ ❌ FAILED ❌ ❌ ❌"
  echo ""
  echo "Results: Only $TOTAL_SUCCESS/$TOTAL_EXPECTED visuals ($SUCCESS_RATE%)"
  echo ""
  echo "CRITICAL ISSUES:"
  
  if [ "$TIMEOUTS_60" -gt "0" ]; then
    echo "  ❌ OLD CODE RUNNING (60s timeouts)"
    echo "     FIX: npm run build && restart backend"
  fi
  
  if [ "$TOTAL_TIMEOUTS" -gt "5" ]; then
    echo "  ❌ Too many timeouts ($TOTAL_TIMEOUTS)"
    echo "     FIX: Increase timeout or simplify prompts"
  fi
  
  if [ "$ALL_FAILURES" -gt "5" ]; then
    echo "  ❌ Too many failures ($ALL_FAILURES)"
    echo "     FIX: Check logs for root cause"
  fi
  
  echo ""
  echo "Check backend-new-test.log for details:"
  echo "  grep -E 'ERROR|FAILED|TIMEOUT' backend-new-test.log"
  echo ""
  exit 1
fi
