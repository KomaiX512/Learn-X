#!/bin/bash

echo "🔍 ANALYZING BACKEND PERFORMANCE..."
echo "=================================="

# Create temp file
LOGFILE="/tmp/backend_analysis.log"

# Capture recent logs (if running)
curl -s http://localhost:3001/health 2>/dev/null || echo "Backend may be down"

echo -e "\n📊 ATTEMPT STATISTICS:"
echo "First attempts: $(grep -c "Attempt 1/3" $LOGFILE 2>/dev/null || echo 0)"
echo "Second attempts: $(grep -c "Attempt 2/3" $LOGFILE 2>/dev/null || echo 0)"  
echo "Third attempts: $(grep -c "Attempt 3/3" $LOGFILE 2>/dev/null || echo 0)"

echo -e "\n❌ FAILURE PATTERNS:"
grep "Attempt.*failed:" $LOGFILE 2>/dev/null | head -5 || echo "No recent failures found"

echo -e "\n⏱️ TIMEOUTS:"
grep -c "timeout after 120000ms" $LOGFILE 2>/dev/null || echo "0"

echo -e "\n🔢 ARITHMETIC ERRORS:"
grep -E "0\.[0-9]+ \+ 0\.[0-9]+|Math\." $LOGFILE 2>/dev/null | head -3 || echo "None found"

echo -e "\n✅ SUCCESS RATES:"
TOTAL=$(grep -c "codegen] START" $LOGFILE 2>/dev/null || echo 1)
SUCCESS=$(grep -c "SUCCESS: Generated" $LOGFILE 2>/dev/null || echo 0)
echo "Total: $TOTAL, Success: $SUCCESS"
if [ $TOTAL -gt 0 ]; then
  echo "Success rate: $(( SUCCESS * 100 / TOTAL ))%"
fi
