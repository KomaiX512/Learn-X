#!/bin/bash
# FINAL STABILITY TEST - 3 Diverse Topics
echo "=========================================="
echo "FINAL STABILITY TEST"
echo "Testing 3 diverse topics to verify 100% success rate"
echo "=========================================="
echo ""

TOPICS=(
  "neural network backpropagation"
  "photosynthesis light reactions"
  "general relativity spacetime curvature"
)

RESULTS=()
SUCCESS_COUNT=0
TOTAL_TESTS=3

for topic in "${TOPICS[@]}"; do
  echo "===================="
  echo "Testing: $topic"
  echo "===================="
  
  node production-test-fixed.js "$topic" 2>&1 | tee "test-${topic// /-}.log" | tail -20
  
  # Check if test succeeded (all 3 steps)
  if grep -q "Steps: 3/3" "test-${topic// /-}.log"; then
    echo "✅ SUCCESS: $topic"
    RESULTS+=("✅ $topic: SUCCESS")
    ((SUCCESS_COUNT++))
  else
    echo "❌ FAILED: $topic"
    RESULTS+=("❌ $topic: FAILED")
  fi
  
  echo ""
  sleep 5  # Pause between tests
done

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo ""
echo "Success Rate: $SUCCESS_COUNT/$TOTAL_TESTS ($(( SUCCESS_COUNT * 100 / TOTAL_TESTS ))%)"
echo "=========================================="

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
  echo "🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY"
  exit 0
else
  echo "❌ SOME TESTS FAILED - NEEDS INVESTIGATION"
  exit 1
fi
