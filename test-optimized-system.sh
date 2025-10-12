#!/bin/bash

# Test Script for Optimized Learn-X System
# Tests the 3-step, 4-visual architecture with progressive emission

echo "========================================"
echo "Learn-X V3 Optimized System Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1. Checking backend status..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is NOT running${NC}"
    echo "Start backend with: cd app/backend && npm run dev"
    exit 1
fi

echo ""
echo "2. Configuration Check..."
cd app/backend

# Check for key environment variables
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    if grep -q "GEMINI_API_KEY" .env; then
        echo -e "${GREEN}✓ GEMINI_API_KEY is set${NC}"
    else
        echo -e "${RED}✗ GEMINI_API_KEY missing${NC}"
    fi
    
    if grep -q "USE_VISUAL_VERSION=v3" .env; then
        echo -e "${GREEN}✓ Using V3 pipeline${NC}"
    else
        echo -e "${YELLOW}⚠ USE_VISUAL_VERSION not set to v3${NC}"
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

echo ""
echo "3. Code Validation..."

# Check if critical files have the fixes
if grep -q "maxOutputTokens: 4000" src/agents/svgAnimationGenerator.ts; then
    echo -e "${GREEN}✓ Animation generator token limit fixed (4000)${NC}"
else
    echo -e "${RED}✗ Animation generator still using old token limit${NC}"
fi

if grep -q "steps.length !== 3" src/agents/planner.ts; then
    echo -e "${GREEN}✓ Planner expects 3 steps${NC}"
else
    echo -e "${RED}✗ Planner not updated to 3 steps${NC}"
fi

if grep -q "Create 4 FOCUSED visual specifications" src/agents/codegenV3.ts; then
    echo -e "${GREEN}✓ CodegenV3 generates 4 visuals${NC}"
else
    echo -e "${RED}✗ CodegenV3 not updated to 4 visuals${NC}"
fi

if grep -q "IMMEDIATE EMISSION" src/orchestrator.ts; then
    echo -e "${GREEN}✓ Progressive emission implemented${NC}"
else
    echo -e "${RED}✗ Progressive emission not found${NC}"
fi

echo ""
echo "4. Expected Performance:"
echo "   - Plan generation: 5-10 seconds"
echo "   - Step 1 emission: ~45 seconds"
echo "   - Step 2 emission: ~90 seconds"
echo "   - Step 3 emission: ~135 seconds"
echo "   - Total time: 2-3 minutes"
echo ""
echo "5. Expected Output Per Step:"
echo "   - 2 static SVG visuals (150 lines each)"
echo "   - 2 animated SVG visuals (120 lines each)"
echo "   - Total: 4 visuals per step, 12 visuals total"
echo ""
echo "6. Quality Thresholds:"
echo "   - Animation score: ≥50/100"
echo "   - Static SVG score: ≥60/100"
echo "   - Visual spec success: ≥60% (3 of 4)"
echo ""
echo "========================================"
echo "Test Complete - Manual Verification"
echo "========================================"
echo ""
echo "To test the system:"
echo "1. Open frontend: http://localhost:5173"
echo "2. Enter query: 'teach me about photosynthesis'"
echo "3. Watch for:"
echo "   - Plan appears in ~10 seconds"
echo "   - Step 1 appears in ~45 seconds"
echo "   - Step 2 appears in ~90 seconds"
echo "   - Step 3 appears in ~135 seconds"
echo ""
echo "Check terminal logs for:"
echo "   ✓ '[planVisualsEnhanced] ✅ Strategy 1 success: 4 specs'"
echo "   ✓ '[SVG-ANIMATION] ✅ VALID! Score: 70/100'"
echo "   ✓ '[parallel] 🚀 IMMEDIATELY EMITTED step 1'"
echo "   ✗ 'MAX_TOKENS' (should NOT appear)"
echo ""
echo "If you see MAX_TOKENS errors, the fix did not apply."
echo "If steps don't appear progressively, emission fix failed."
echo ""
