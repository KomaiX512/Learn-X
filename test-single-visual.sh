#!/bin/bash

# Quick test script to generate and validate a single SVG visual
# Usage: ./test-single-visual.sh

echo "=================================="
echo "QUICK SVG QUALITY TEST"
echo "=================================="
echo ""

# Source API key
if [ -f "app/backend/.env" ]; then
    export $(grep -v '^#' app/backend/.env | xargs)
    echo "✅ Loaded environment from app/backend/.env"
else
    echo "❌ app/backend/.env not found"
    exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set"
    exit 1
fi

echo "🚀 Running SVG quality test..."
echo ""

npx tsx test-svg-quality.ts

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ TEST PASSED"
    echo ""
    echo "📁 Output files:"
    echo "   - test-output/test-svg-output.svg (view in browser)"
    echo "   - test-output/quality-report.json (detailed analysis)"
    echo ""
    echo "💡 To view the SVG: open test-output/test-svg-output.svg in your browser"
else
    echo ""
    echo "❌ TEST FAILED"
    echo ""
    echo "Check the output above for details"
fi

exit $EXIT_CODE
