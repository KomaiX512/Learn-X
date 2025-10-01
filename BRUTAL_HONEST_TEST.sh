#!/bin/bash

# BRUTAL HONEST TESTING SCRIPT
# Tests the sequential rendering implementation with full monitoring

echo "=============================================="
echo "🔬 BRUTAL HONEST TESTING - Sequential Render"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_QUERY="teach me about neural networks"
BACKEND_URL="http://localhost:3001"
SESSION_ID="test-$(date +%s)"

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "  Query: $TEST_QUERY"
echo "  Session ID: $SESSION_ID"
echo "  Backend: $BACKEND_URL"
echo ""

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Clear Redis cache for fresh test
echo -e "${BLUE}🧹 Clearing Redis cache...${NC}"
redis-cli FLUSHDB > /dev/null 2>&1
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Start monitoring backend logs
echo -e "${BLUE}📡 Starting log monitoring...${NC}"
echo ""

# Create log file
LOG_FILE="/tmp/leaf_test_$(date +%Y%m%d_%H%M%S).log"
touch "$LOG_FILE"

# Function to monitor logs
monitor_logs() {
    tail -f /tmp/backend_test.log 2>/dev/null | while read -r line; do
        # Highlight key events
        if [[ "$line" =~ "parallel worker called" ]]; then
            echo -e "${GREEN}🔥 PARALLEL WORKER STARTED${NC}" | tee -a "$LOG_FILE"
        elif [[ "$line" =~ "Emitted FIRST step" ]]; then
            echo -e "${GREEN}✅ STEP 1 EMITTED${NC}" | tee -a "$LOG_FILE"
        elif [[ "$line" =~ "Emitted step" ]]; then
            step_num=$(echo "$line" | grep -oP 'step \K\d+')
            echo -e "${GREEN}✅ STEP $step_num EMITTED${NC}" | tee -a "$LOG_FILE"
        elif [[ "$line" =~ "Generated .* actions" ]]; then
            actions=$(echo "$line" | grep -oP '\d+(?= actions)')
            echo -e "${BLUE}📊 Generated $actions actions${NC}" | tee -a "$LOG_FILE"
        elif [[ "$line" =~ "ERROR" ]] || [[ "$line" =~ "FAILED" ]]; then
            echo -e "${RED}❌ ERROR: $line${NC}" | tee -a "$LOG_FILE"
        elif [[ "$line" =~ "WARNING" ]]; then
            echo -e "${YELLOW}⚠️  WARNING: $line${NC}" | tee -a "$LOG_FILE"
        fi
    done
}

# Start background monitoring
monitor_logs &
MONITOR_PID=$!

# Send test query
echo -e "${YELLOW}🚀 Sending test query...${NC}"
START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/query" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$TEST_QUERY\", \"sessionId\": \"$SESSION_ID\"}")

echo ""
echo -e "${BLUE}📥 Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Monitor for completion (5 minutes max)
echo -e "${YELLOW}⏱️  Monitoring generation (max 5 minutes)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait and show progress
for i in {1..300}; do
    # Check if all steps completed
    STEPS_COMPLETED=$(redis-cli KEYS "session:$SESSION_ID:step:*:chunk" 2>/dev/null | wc -l)
    
    if [ "$STEPS_COMPLETED" -ge 5 ]; then
        END_TIME=$(date +%s)
        TOTAL_TIME=$((END_TIME - START_TIME))
        echo ""
        echo -e "${GREEN}🎉 ALL STEPS COMPLETED!${NC}"
        echo -e "${GREEN}⏱️  Total time: ${TOTAL_TIME}s${NC}"
        break
    fi
    
    # Show progress every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
        echo -e "${BLUE}[$i/300s] Steps completed: $STEPS_COMPLETED/5${NC}"
    fi
    
    sleep 1
done

# Kill monitor
kill $MONITOR_PID 2>/dev/null

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ANALYSIS
echo -e "${BLUE}📊 BRUTAL HONEST ANALYSIS:${NC}"
echo ""

# Check each step
for step_id in {0..4}; do
    STEP_KEY="session:$SESSION_ID:step:$step_id:chunk"
    STEP_DATA=$(redis-cli GET "$STEP_KEY" 2>/dev/null)
    
    if [ -n "$STEP_DATA" ]; then
        ACTION_COUNT=$(echo "$STEP_DATA" | jq '.actions | length' 2>/dev/null)
        echo -e "${GREEN}✅ Step $step_id: $ACTION_COUNT actions${NC}"
        
        # Count action types
        LABEL_COUNT=$(echo "$STEP_DATA" | jq '[.actions[] | select(.op == "drawLabel")] | length' 2>/dev/null)
        VISUAL_COUNT=$(echo "$STEP_DATA" | jq '[.actions[] | select(.op != "drawLabel" and .op != "delay" and .op != "drawTitle")] | length' 2>/dev/null)
        DELAY_COUNT=$(echo "$STEP_DATA" | jq '[.actions[] | select(.op == "delay")] | length' 2>/dev/null)
        
        echo "   └─ Labels: $LABEL_COUNT | Visuals: $VISUAL_COUNT | Delays: $DELAY_COUNT"
        
        # Check for fallback indicators
        if echo "$STEP_DATA" | grep -q "fallback" 2>/dev/null; then
            echo -e "   ${RED}⚠️  FALLBACK DETECTED!${NC}"
        fi
    else
        echo -e "${RED}❌ Step $step_id: NOT GENERATED${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔍 Architecture Check:${NC}"

# Check for hardcoding
echo -e "${YELLOW}Scanning for hardcoded content...${NC}"
HARDCODE_CHECK=$(grep -r "hardcoded\|dummy\|placeholder\|TODO" /home/komail/LeaF/app/backend/src/agents/*.ts 2>/dev/null | wc -l)
if [ "$HARDCODE_CHECK" -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious hardcoding detected${NC}"
else
    echo -e "${YELLOW}⚠️  Found $HARDCODE_CHECK potential hardcoded references${NC}"
fi

# Check for fallbacks
echo -e "${YELLOW}Scanning for fallback implementations...${NC}"
FALLBACK_CHECK=$(grep -r "fallback" /home/komail/LeaF/app/backend/src/agents/*.ts 2>/dev/null | grep -v "comment" | wc -l)
if [ "$FALLBACK_CHECK" -eq 0 ]; then
    echo -e "${GREEN}✅ No fallback code found${NC}"
else
    echo -e "${RED}❌ Found $FALLBACK_CHECK fallback references${NC}"
fi

echo ""
echo -e "${BLUE}📝 Full logs saved to: $LOG_FILE${NC}"
echo ""
echo "=============================================="
echo "🏁 TEST COMPLETE"
echo "=============================================="
