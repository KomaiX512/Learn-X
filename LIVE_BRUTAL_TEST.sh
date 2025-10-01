#!/bin/bash

# LIVE BRUTAL HONEST TEST
# Tests actual implementation with real query and monitors everything

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo "=============================================="
echo "🔬 LIVE BRUTAL HONEST TEST"
echo "=============================================="
echo ""

# Test configuration
TEST_QUERY="teach me about binary search trees"
SESSION_ID="test-$(date +%s)"
BACKEND_LOG="/tmp/backend_live.log"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Query: $TEST_QUERY"
echo "  Session: $SESSION_ID"
echo "  Backend Log: $BACKEND_LOG"
echo ""

# Function to extract and analyze logs
analyze_logs() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 LOG ANALYSIS:${NC}"
    echo ""
    
    # Check for visual agent usage
    echo -e "${YELLOW}1. Visual Agent Selection:${NC}"
    grep -i "Using.*visual" "$BACKEND_LOG" | tail -5 | while read line; do
        if echo "$line" | grep -q "visualAgent (GENERIC)"; then
            echo -e "   ✅ ${GREEN}Using V1 (Enhanced Narrative)${NC}"
        elif echo "$line" | grep -q "visualAgentV2 (INTELLIGENT)"; then
            echo -e "   ⚠️  ${YELLOW}Using V2 (Domain-Specific)${NC}"
        fi
    done
    echo ""
    
    # Check for fallbacks
    echo -e "${YELLOW}2. Fallback Detection:${NC}"
    FALLBACK_COUNT=$(grep -i "fallback\|dummy\|placeholder" "$BACKEND_LOG" 2>/dev/null | grep -v "NO FALLBACK" | wc -l)
    if [ "$FALLBACK_COUNT" -eq 0 ]; then
        echo -e "   ✅ ${GREEN}NO FALLBACKS DETECTED${NC}"
    else
        echo -e "   ❌ ${RED}FOUND $FALLBACK_COUNT FALLBACK REFERENCES${NC}"
        grep -i "fallback\|dummy\|placeholder" "$BACKEND_LOG" | grep -v "NO FALLBACK" | tail -3
    fi
    echo ""
    
    # Check step emissions
    echo -e "${YELLOW}3. Sequential Step Delivery:${NC}"
    grep "Emitted.*step" "$BACKEND_LOG" 2>/dev/null | tail -10 | while read line; do
        if echo "$line" | grep -q "FIRST step"; then
            echo -e "   ✅ ${GREEN}Step 1: Emitted IMMEDIATELY${NC}"
        elif echo "$line" | grep -q "Emitted step"; then
            STEP_NUM=$(echo "$line" | grep -oP 'step \K\d+' | head -1)
            DELAY=$(echo "$line" | grep -oP 'after \K\d+')
            echo -e "   ✅ ${GREEN}Step $STEP_NUM: Emitted after ${DELAY}ms${NC}"
        fi
    done
    echo ""
    
    # Check action counts
    echo -e "${YELLOW}4. Generated Content:${NC}"
    grep "Generated.*actions" "$BACKEND_LOG" 2>/dev/null | tail -5 | while read line; do
        COUNT=$(echo "$line" | grep -oP '\d+(?= actions)')
        if [ "$COUNT" -ge 50 ]; then
            echo -e "   ✅ ${GREEN}Rich content: $COUNT actions${NC}"
        elif [ "$COUNT" -ge 30 ]; then
            echo -e "   ⚠️  ${YELLOW}Moderate: $COUNT actions${NC}"
        else
            echo -e "   ❌ ${RED}Sparse: $COUNT actions${NC}"
        fi
    done
    echo ""
    
    # Check for errors
    echo -e "${YELLOW}5. Error Analysis:${NC}"
    ERROR_COUNT=$(grep -i "ERROR\|FAILED" "$BACKEND_LOG" 2>/dev/null | grep -v "NO FALLBACK" | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "   ✅ ${GREEN}NO ERRORS${NC}"
    else
        echo -e "   ❌ ${RED}FOUND $ERROR_COUNT ERRORS${NC}"
        grep -i "ERROR\|FAILED" "$BACKEND_LOG" | grep -v "NO FALLBACK" | tail -3
    fi
    echo ""
    
    # Check generation timing
    echo -e "${YELLOW}6. Performance Timing:${NC}"
    grep "Parallel generation complete" "$BACKEND_LOG" 2>/dev/null | tail -1 | while read line; do
        TOTAL_TIME=$(echo "$line" | grep -oP '\d+(?=ms)')
        if [ -n "$TOTAL_TIME" ]; then
            SECONDS=$((TOTAL_TIME / 1000))
            echo -e "   ⏱️  Total generation: ${CYAN}${SECONDS}s${NC}"
            
            if [ "$SECONDS" -lt 60 ]; then
                echo -e "   ✅ ${GREEN}Fast generation (<60s)${NC}"
            elif [ "$SECONDS" -lt 120 ]; then
                echo -e "   ⚠️  ${YELLOW}Acceptable (60-120s)${NC}"
            else
                echo -e "   ❌ ${RED}Slow (>120s)${NC}"
            fi
        fi
    done
    echo ""
}

# Send test query
echo -e "${YELLOW}🚀 Sending test query...${NC}"

# Clear previous logs
> "$BACKEND_LOG.filtered"

# Start log monitoring in background
tail -f "$BACKEND_LOG" | grep --line-buffered -E "visual|step|action|error|ERROR|parallel|Emitted|Generated" > "$BACKEND_LOG.filtered" &
TAIL_PID=$!

# Send query using curl
curl -s -X POST http://localhost:3001/api/query \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$TEST_QUERY\", \"sessionId\": \"$SESSION_ID\"}" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Query sent successfully${NC}"
else
    echo -e "${RED}❌ Failed to send query${NC}"
    kill $TAIL_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${CYAN}⏳ Monitoring generation (30 seconds)...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Monitor for 30 seconds
for i in {1..30}; do
    # Show recent relevant logs
    if [ -f "$BACKEND_LOG.filtered" ]; then
        tail -5 "$BACKEND_LOG.filtered" 2>/dev/null | while read line; do
            # Color code important events
            if echo "$line" | grep -q "visualAgent"; then
                echo -e "${MAGENTA}🤖 $line${NC}"
            elif echo "$line" | grep -q "Emitted"; then
                echo -e "${GREEN}📤 $line${NC}"
            elif echo "$line" | grep -q "Generated"; then
                echo -e "${BLUE}✨ $line${NC}"
            elif echo "$line" | grep -q "ERROR"; then
                echo -e "${RED}❌ $line${NC}"
            fi
        done
    fi
    
    sleep 1
    
    # Clear screen and show progress
    if [ $((i % 5)) -eq 0 ]; then
        echo ""
        echo -e "${CYAN}[${i}/30s] Still monitoring...${NC}"
        echo ""
    fi
done

# Stop monitoring
kill $TAIL_PID 2>/dev/null

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Analyze collected logs
analyze_logs

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎯 BRUTAL HONEST VERDICT:${NC}"
echo ""

# Final assessment
FALLBACK_COUNT=$(grep -i "fallback\|dummy" "$BACKEND_LOG" 2>/dev/null | grep -v "NO FALLBACK" | wc -l)
ERROR_COUNT=$(grep -i "ERROR\|FAILED" "$BACKEND_LOG" 2>/dev/null | grep -v "NO FALLBACK" | wc -l)
STEP_COUNT=$(grep "Emitted.*step" "$BACKEND_LOG" 2>/dev/null | wc -l)

if [ "$FALLBACK_COUNT" -eq 0 ] && [ "$ERROR_COUNT" -eq 0 ] && [ "$STEP_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✅ SYSTEM WORKING AS EXPECTED${NC}"
    echo -e "   • No fallbacks detected"
    echo -e "   • No errors"
    echo -e "   • All steps emitted sequentially"
else
    echo -e "${RED}⚠️  ISSUES DETECTED${NC}"
    [ "$FALLBACK_COUNT" -gt 0 ] && echo -e "   • ${RED}Fallbacks found: $FALLBACK_COUNT${NC}"
    [ "$ERROR_COUNT" -gt 0 ] && echo -e "   • ${RED}Errors found: $ERROR_COUNT${NC}"
    [ "$STEP_COUNT" -lt 5 ] && echo -e "   • ${RED}Only $STEP_COUNT steps emitted${NC}"
fi

echo ""
echo "=============================================="
echo "🏁 TEST COMPLETE"
echo "=============================================="
echo ""
echo -e "${CYAN}Full logs: $BACKEND_LOG${NC}"
echo -e "${CYAN}Filtered logs: $BACKEND_LOG.filtered${NC}"

# Cleanup
rm -f "$BACKEND_LOG.filtered"
