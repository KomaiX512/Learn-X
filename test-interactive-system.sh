#!/bin/bash

# Complete System Test with Full Monitoring
# Tests: Backend generation → Frontend rendering → Interactive UI

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  INTERACTIVE CANVAS UI - END-TO-END TEST WITH MONITORING      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_TOPIC="Explain how binary search works"
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5174"

echo -e "${BLUE}[1/7] Checking Backend Status...${NC}"
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running. Start with: cd app/backend && npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/7] Checking Frontend Status...${NC}"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may not be running. Start with: cd app/frontend && npm run dev${NC}"
fi

echo ""
echo -e "${BLUE}[3/7] Starting Test Lecture Generation...${NC}"
echo "Topic: $TEST_TOPIC"
echo ""

# Create session and start generation
SESSION_ID="test-$(date +%s)"
echo -e "${YELLOW}Session ID: $SESSION_ID${NC}"

# Test API endpoint
echo ""
echo -e "${BLUE}[4/7] Testing /api/generate endpoint...${NC}"

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$TEST_TOPIC\",
    \"difficulty\": \"medium\",
    \"sessionId\": \"$SESSION_ID\"
  }")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Generation request sent${NC}"
    echo "Response preview:"
    echo "$RESPONSE" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Failed to send request${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[5/7] Monitoring Backend Logs (30 seconds)...${NC}"
echo "Looking for key indicators:"
echo "  - Plan generation"
echo "  - Step processing"
echo "  - Visual generation"
echo "  - Socket emissions"
echo ""

# Wait and show what to monitor
echo -e "${YELLOW}Check backend console for:${NC}"
echo "  ✓ [orchestrator] Plan generated with X steps"
echo "  ✓ [codegen] Processing step X"
echo "  ✓ [subPlanner] Generated 4 scripts"
echo "  ✓ [visualGenerator] Generated visuals"
echo "  ✓ Socket emit: 'step'"
echo ""

echo -e "${BLUE}[6/7] Testing Interactive UI Components...${NC}"
echo ""

# Check if interactive components built correctly
if [ -f "app/frontend/dist/assets/index-BEgxhDNn.js" ]; then
    echo -e "${GREEN}✓ Frontend build includes interactive components${NC}"
    
    # Check for key functions in bundle
    BUNDLE_FILE=$(ls -t app/frontend/dist/assets/index-*.js | head -1)
    
    if grep -q "handleHandRaise" "$BUNDLE_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ handleHandRaise function present${NC}"
    else
        echo -e "${RED}✗ handleHandRaise function missing${NC}"
    fi
    
    if grep -q "PenDrawingLayer" "$BUNDLE_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ PenDrawingLayer component present${NC}"
    else
        echo -e "${RED}✗ PenDrawingLayer component missing${NC}"
    fi
    
    if grep -q "CanvasQuestionInput" "$BUNDLE_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ CanvasQuestionInput component present${NC}"
    else
        echo -e "${RED}✗ CanvasQuestionInput component missing${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Build files not found. Run: cd app/frontend && npm run build${NC}"
fi

echo ""
echo -e "${BLUE}[7/7] Manual Test Checklist${NC}"
echo ""
echo "Open browser to $FRONTEND_URL and verify:"
echo ""
echo "Backend Quality:"
echo "  [ ] Plan generated with 3-5 steps"
echo "  [ ] Each step has SVG operations"
echo "  [ ] Operations include drawRect, drawCircle, graph, etc."
echo "  [ ] Socket events received on frontend"
echo "  [ ] Steps render sequentially on canvas"
echo ""
echo "Interactive UI:"
echo "  [ ] Toolbar visible at top (AUTO/MANUAL/NEXT)"
echo "  [ ] Hand raise button visible at bottom-right"
echo "  [ ] Click hand → Button turns orange"
echo "  [ ] Click hand → Playback pauses"
echo "  [ ] Draw on canvas → Orange pen strokes appear"
echo "  [ ] Release mouse → Input field appears IMMEDIATELY"
echo "  [ ] Input field positioned near drawing"
echo "  [ ] Type question → Validation works"
echo "  [ ] Submit question → Loading spinner shows"
echo "  [ ] Error shown if network fails"
echo "  [ ] Clarification appears on canvas"
echo "  [ ] Drawings clear after submission"
echo "  [ ] Playback resumes automatically"
echo ""
echo "Scroll Test:"
echo "  [ ] Scroll canvas down"
echo "  [ ] Toolbar STILL visible (sticky)"
echo "  [ ] Hand button STILL visible"
echo "  [ ] Draw mark → Input appears in viewport"
echo ""
echo "Error Test:"
echo "  [ ] Raise hand without starting lecture"
echo "  [ ] Try to submit → Error banner appears"
echo "  [ ] Error message clear and actionable"
echo "  [ ] Can dismiss error"
echo ""
echo "Context Test:"
echo "  [ ] Raise hand on Step 1"
echo "  [ ] Wait for Step 2 to auto-advance"
echo "  [ ] Submit question"
echo "  [ ] Check network tab → Context is Step 1 (frozen)"
echo ""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}Test script complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor backend console for 30-60 seconds"
echo "2. Open $FRONTEND_URL in browser"
echo "3. Complete manual checklist above"
echo "4. Report any failures"
echo ""
echo "Log monitoring commands:"
echo "  Backend: cd app/backend && npm run dev"
echo "  Frontend: cd app/frontend && npm run dev"
echo "═══════════════════════════════════════════════════════════════"
