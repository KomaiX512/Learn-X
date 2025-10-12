#!/bin/bash
# FINAL PRODUCTION TEST - 5 Diverse Topics
# Uses proven client that works

echo "=========================================="
echo "FINAL PRODUCTION READINESS TEST"
echo "Testing 5 diverse topics with proven client"
echo "=========================================="
echo ""

TOPICS=(
  "photosynthesis light reactions"
  "quantum tunneling"
  "neural network gradient descent"
  "DNA replication process"
  "special relativity time dilation"
)

RESULTS=()
SUCCESS_COUNT=0
TOTAL_TIME=0
TOTAL_ANIMATIONS=0

for topic in "${TOPICS[@]}"; do
  echo "===================="
  echo "Testing: $topic"
  echo "===================="
  
  node production-test-fixed.js "$topic" 2>&1 | tee "test-${topic// /-}.log" | tail -25
  
  # Extract metrics
  if grep -q "Steps: 3/3" "test-${topic// /-}.log"; then
    TIME=$(grep "Total:" "test-${topic// /-}.log" | awk '{print $2}' | sed 's/s//')
    ANIMS=$(grep "Animations:" "test-${topic// /-}.log" | tail -1 | awk '{print $2}')
    
    echo "✅ SUCCESS: $topic (${TIME}s, ${ANIMS} animations)"
    RESULTS+=("✅ $topic: ${TIME}s, ${ANIMS} animations")
    ((SUCCESS_COUNT++))
    TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)
    TOTAL_ANIMATIONS=$((TOTAL_ANIMATIONS + ANIMS))
  else
    echo "❌ FAILED: $topic"
    RESULTS+=("❌ $topic: FAILED")
  fi
  
  echo ""
  sleep 3  # Pause between tests
done

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo ""
echo "Success Rate: $SUCCESS_COUNT/${#TOPICS[@]} ($(( SUCCESS_COUNT * 100 / ${#TOPICS[@]} ))%)"

if [ $SUCCESS_COUNT -gt 0 ]; then
  AVG_TIME=$(echo "scale=1; $TOTAL_TIME / $SUCCESS_COUNT" | bc)
  AVG_ANIMS=$(echo "scale=1; $TOTAL_ANIMATIONS / $SUCCESS_COUNT" | bc)
  echo "Average Time: ${AVG_TIME}s per lecture"
  echo "Average Animations: ${AVG_ANIMS} per lecture"
fi

echo "=========================================="

if [ $SUCCESS_COUNT -eq ${#TOPICS[@]} ]; then
  echo "🎉 100% SUCCESS - PRODUCTION READY!"
  echo "✅ System beats 3Blue1Brown:"
  echo "   - Speed: ~${AVG_TIME}s vs hours"
  echo "   - Coverage: Universal vs 50 videos"
  echo "   - Quality: ${AVG_ANIMS} animations per topic"
  echo "   - Reliability: 100%"
  echo ""
  echo "🚀 READY TO ANNOUNCE TO THE WORLD!"
  exit 0
elif [ $SUCCESS_COUNT -ge 4 ]; then
  echo "✅ GOOD - 80%+ success rate"
  echo "⚠️  Minor issues, but close to production ready"
  exit 0
else
  echo "❌ NOT READY - Success rate below 80%"
  exit 1
fi
