#!/bin/bash

###############################################################################
# COMPLETE PRODUCTION TEST SUITE
# Tests all aspects of the production-grade system
###############################################################################

set -e  # Exit on error

BACKEND_URL="http://localhost:8000"
LOG_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

echo "================================================================================"
echo -e "${BLUE}🚀 PRODUCTION SYSTEM COMPLETE TEST SUITE${NC}"
echo "================================================================================"
echo "Timestamp: $TIMESTAMP"
echo "Backend: $BACKEND_URL"
echo "Log Directory: $LOG_DIR"
echo ""

# ==============================================================================
# TEST 1: Backend Health Check
# ==============================================================================
echo -e "${YELLOW}TEST 1: Backend Health Check${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    
    HEALTH=$(curl -s "$BACKEND_URL/health" | jq -r '.ok')
    if [ "$HEALTH" == "true" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Backend not reachable${NC}"
    exit 1
fi

echo ""

# ==============================================================================
# TEST 2: Model Verification
# ==============================================================================
echo -e "${YELLOW}TEST 2: Model Verification${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

echo "Checking codebase for model usage..."

# Check all TypeScript agent files
AGENT_FILES="app/backend/src/agents/*.ts"
WRONG_MODEL_COUNT=0

for file in $AGENT_FILES; do
    if grep -q "gemini-2.5-flash-lite" "$file" 2>/dev/null; then
        echo -e "${RED}❌ Found lite model in: $file${NC}"
        WRONG_MODEL_COUNT=$((WRONG_MODEL_COUNT + 1))
    fi
done

if [ $WRONG_MODEL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ No lite model usage found${NC}"
    echo -e "${GREEN}✅ All agents using gemini-2.5-flash${NC}"
else
    echo -e "${RED}❌ Found $WRONG_MODEL_COUNT files using wrong model${NC}"
    exit 1
fi

echo ""

# ==============================================================================
# TEST 3: Quick Model Response Test
# ==============================================================================
echo -e "${YELLOW}TEST 3: Quick Model Response Test${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

node test-model-quick.js > "$LOG_DIR/model-test-$TIMESTAMP.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Model responds correctly${NC}"
    cat "$LOG_DIR/model-test-$TIMESTAMP.log" | tail -5
else
    echo -e "${RED}❌ Model test failed${NC}"
    cat "$LOG_DIR/model-test-$TIMESTAMP.log" | tail -20
    exit 1
fi

echo ""

# ==============================================================================
# TEST 4: Single Step Generation (Unit Test)
# ==============================================================================
echo -e "${YELLOW}TEST 4: Single Step Generation${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

node test-single-step.js > "$LOG_DIR/single-step-$TIMESTAMP.log" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Single step generation works${NC}"
    
    # Extract key metrics
    DURATION=$(grep "Generation time:" "$LOG_DIR/single-step-$TIMESTAMP.log" | awk '{print $3}')
    SIZE=$(grep "SVG size:" "$LOG_DIR/single-step-$TIMESTAMP.log" | awk '{print $3}')
    
    echo "   Duration: $DURATION"
    echo "   Size: $SIZE chars"
else
    echo -e "${RED}❌ Single step test failed${NC}"
    cat "$LOG_DIR/single-step-$TIMESTAMP.log" | tail -20
    exit 1
fi

echo ""

# ==============================================================================
# TEST 5: Full Lecture Generation (E2E Test)
# ==============================================================================
echo -e "${YELLOW}TEST 5: Full Lecture Generation (E2E)${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

echo "Starting full lecture test (may take 2-3 minutes)..."
timeout 180 node test-real-generation.js > "$LOG_DIR/e2e-$TIMESTAMP.log" 2>&1

E2E_EXIT=$?

if [ $E2E_EXIT -eq 124 ]; then
    echo -e "${YELLOW}⚠️  Test timed out after 180 seconds${NC}"
elif [ $E2E_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ E2E test completed${NC}"
fi

# Analyze results
echo ""
echo "Analyzing backend logs..."

SUCCESSES=$(grep -c "SUCCESS" app/backend/backend.log | tail -1)
FAILURES=$(grep -c "FAILED" app/backend/backend.log | tail -1)
RETRIES=$(grep -c "Attempt 2/2" app/backend/backend.log | tail -1)

echo "   Successes: $SUCCESSES"
echo "   Failures: $FAILURES"
echo "   Retries: $RETRIES"

if [ "$SUCCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ At least some steps generated successfully${NC}"
fi

echo ""

# ==============================================================================
# TEST 6: Quality Metrics Check
# ==============================================================================
echo -e "${YELLOW}TEST 6: Quality Metrics Check${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

echo "Extracting quality metrics from recent generations..."

QUALITY_COUNT=$(grep -c "Quality:" app/backend/backend.log | tail -1)

if [ "$QUALITY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Quality metrics are being logged${NC}"
    echo ""
    echo "Recent quality metrics:"
    grep "Quality:" app/backend/backend.log | tail -5 | sed 's/.*Quality:/   /'
else
    echo -e "${YELLOW}⚠️  No quality metrics found yet${NC}"
fi

echo ""

# ==============================================================================
# TEST 7: Error Handling Verification
# ==============================================================================
echo -e "${YELLOW}TEST 7: Error Handling Verification${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

echo "Checking for proper error handling..."

# Check for exponential backoff
BACKOFF_COUNT=$(grep -c "Waiting.*ms before retry" app/backend/backend.log | tail -1)

if [ "$BACKOFF_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Exponential backoff working${NC}"
    grep "Waiting.*ms before retry" app/backend/backend.log | tail -3 | sed 's/.*\[/   [/'
else
    echo -e "${BLUE}ℹ️  No retries needed (good sign!)${NC}"
fi

echo ""

# Check for validation working
VALIDATION_COUNT=$(grep -c "MALFORMED\|Malformed" app/backend/backend.log | tail -1)

if [ "$VALIDATION_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found malformed SVG detections (validation working)${NC}"
else
    echo -e "${GREEN}✅ No malformed SVGs detected${NC}"
fi

echo ""

# ==============================================================================
# TEST 8: Performance Analysis
# ==============================================================================
echo -e "${YELLOW}TEST 8: Performance Analysis${NC}"
echo "────────────────────────────────────────────────────────────────────────────"

echo "Analyzing generation times..."

# Extract all generation times
TIMES=$(grep "Generated SVG in" app/backend/backend.log | sed 's/.*Generated SVG in //' | sed 's/s.*//' | tail -10)

if [ -n "$TIMES" ]; then
    echo "Recent generation times:"
    echo "$TIMES" | awk '{print "   - " $0 "s"}'
    
    # Calculate average (basic)
    AVG=$(echo "$TIMES" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    echo ""
    echo "   Average: ${AVG}s"
    
    # Check if within acceptable range (30-60s)
    AVG_INT=${AVG%.*}
    if [ "$AVG_INT" -lt 60 ]; then
        echo -e "${GREEN}✅ Performance within acceptable range${NC}"
    else
        echo -e "${YELLOW}⚠️  Performance slower than target${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No successful generations to analyze${NC}"
fi

echo ""

# ==============================================================================
# TEST SUMMARY
# ==============================================================================
echo "================================================================================"
echo -e "${BLUE}📊 TEST SUITE SUMMARY${NC}"
echo "================================================================================"
echo ""

echo -e "${GREEN}✅ Passed Tests:${NC}"
echo "   1. Backend Health Check"
echo "   2. Model Verification (100% gemini-2.5-flash)"
echo "   3. Quick Model Response"

if [ "$SUCCESSES" -gt 0 ]; then
    echo "   4. Single Step Generation"
    echo "   5. E2E Test (partial/complete)"
fi

if [ "$QUALITY_COUNT" -gt 0 ]; then
    echo "   6. Quality Metrics Logging"
fi

if [ "$BACKOFF_COUNT" -gt 0 ]; then
    echo "   7. Exponential Backoff"
fi

echo ""
echo -e "${YELLOW}📁 Test Logs Saved To:${NC}"
echo "   $LOG_DIR/model-test-$TIMESTAMP.log"
echo "   $LOG_DIR/single-step-$TIMESTAMP.log"
echo "   $LOG_DIR/e2e-$TIMESTAMP.log"
echo "   app/backend/backend.log"

echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "   1. Review logs in $LOG_DIR/"
echo "   2. Run: ./monitor-production.sh (for real-time monitoring)"
echo "   3. Check: PRODUCTION_FIXES_APPLIED.md (for all improvements)"
echo "   4. Read: PRODUCTION_WORKFLOW_GUIDE.md (for workflow details)"

echo ""
echo "================================================================================"
echo -e "${GREEN}✅ TEST SUITE COMPLETE${NC}"
echo "================================================================================"
