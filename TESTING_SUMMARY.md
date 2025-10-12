# Testing Strategy & Results

## Test Structure

### 3-Level Testing Approach

```
LEVEL 1: Stage Tests (Individual Components)
  ├─ Stage 1: codegenV3 (Single Visual Generator)
  ├─ Stage 2: transcriptGenerator (Narration Generator)
  └─ Stage 3: codegenV3WithRetry (Retry Wrapper)

LEVEL 2: Integration Tests (Combined Components)
  ├─ Group 1: Multiple Visuals (4x parallel generation)
  └─ Group 2: Visuals + Transcript Integration

LEVEL 3: Full Step Test (Complete Production Flow)
  └─ Complete generateStepVisuals() as used in orchestrator
```

## Test Files Created

1. **test-unit-stages.js** - Individual component tests
   - Tests codegenV3 with real Gemini API
   - Tests transcriptGenerator with visual descriptions
   - Tests retry logic with exponential backoff
   - Verifies: Animations, labels, quality metrics

2. **test-integration.js** - Component integration tests
   - Tests 4 visuals generated in parallel
   - Tests transcript generated from visual descriptions
   - Verifies: Integration, timing, data flow

3. **test-full-step.js** - Complete production flow
   - Replicates exact orchestrator logic
   - Tests complete `generateStepVisuals()` function
   - Verifies: 4 visuals + transcript + metadata
   - Production readiness checks

4. **test-all.js** - Master test runner
   - Runs all tests in sequence
   - Only proceeds if each level passes
   - Provides comprehensive final report

## Running Tests

### Individual Test Levels

```bash
# Stage tests only (fastest, ~30s)
node test-unit-stages.js

# Integration tests only (~2-3 minutes)
node test-integration.js

# Full step test (~3-5 minutes)
node test-full-step.js
```

### Complete Test Suite

```bash
# Run all tests in sequence (~5-8 minutes)
node test-all.js
```

## Test Criteria

### Stage Tests

**Stage 1 (codegenV3)**:
- ✅ Generates valid SVG XML
- ✅ Contains animations (`<animate>`, `<animateMotion>`, `<animateTransform>`)
- ✅ Has labels (`<text>` elements)
- ✅ Proper XML structure (opening/closing tags)

**Stage 2 (transcriptGenerator)**:
- ✅ Generates text (>150 chars)
- ✅ Conversational tone (uses "you", "we")
- ✅ Educational content (uses "understand", "see", "learn")
- ✅ Based on visual descriptions

**Stage 3 (codegenV3WithRetry)**:
- ✅ Retries on failure (up to 3 attempts)
- ✅ Exponential backoff (2s, 4s, 8s)
- ✅ Returns non-null result on success
- ✅ Fails gracefully after max retries

### Integration Tests

**Group 1 (Multiple Visuals)**:
- ✅ Generates 4 visuals in parallel
- ✅ Success rate >75% (at least 3/4 succeed)
- ✅ All successful visuals have animations
- ✅ Reasonable duration (<90s total)

**Group 2 (Visuals + Transcript)**:
- ✅ Visuals generated first
- ✅ Transcript generated from visual descriptions
- ✅ Both components integrate correctly
- ✅ Combined result is emission-ready

### Full Step Test

**Production Flow**:
- ✅ Minimum 3 visuals generated
- ✅ All visuals have animations and labels
- ✅ Transcript generated (>150 chars)
- ✅ Transcript is conversational
- ✅ Duration <120s per step
- ✅ Emission data structure correct
- ✅ Metadata included (visualCount, transcriptLength)

## Quality Metrics

### Visual Quality

Each visual is checked for:
- **Size**: 2000-8000 characters (typical SVG)
- **Animations**: At least 1 animation element
- **Labels**: At least 1 text label
- **Structure**: Valid XML with proper tags

### Transcript Quality

Each transcript is checked for:
- **Length**: >150 characters (2-3 paragraphs)
- **Tone**: Conversational (second person)
- **Content**: Educational (explains concepts)
- **Hook**: First sentence grabs attention

### Performance Metrics

- **Per Visual**: 10-20 seconds (Gemini API call)
- **4 Visuals (parallel)**: 40-60 seconds
- **Transcript**: 5-10 seconds
- **Total per Step**: 50-70 seconds
- **Full Lecture (3 steps)**: 3-4 minutes

## Expected Test Results

### Successful Run

```
✅ STAGE TESTS: PASSED
   ✓ codegenV3: PASS
   ✓ transcriptGenerator: PASS
   ✓ codegenV3WithRetry: PASS

✅ INTEGRATION TESTS: PASSED
   ✓ Multiple Visuals (4/4): PASS
   ✓ Visuals + Transcript: PASS

✅ FULL STEP TEST: PASSED
   ✓ Production Flow: PASS
   ✓ Quality Score: 100%

🎉 ALL TESTS PASSED - PRODUCTION READY
```

### Partial Success

```
✅ STAGE TESTS: PASSED

✅ INTEGRATION TESTS: PASSED
   ⚠️  Multiple Visuals (3/4): PASS (acceptable)

✅ FULL STEP TEST: PASSED
   ✓ Quality Score: 75%

⚠️  SYSTEM READY WITH WARNINGS
   - 75% visual success rate (acceptable)
   - Consider increasing timeout or retries
```

### Failure Cases

**Common Issues**:
1. **API Key Invalid**: Check GEMINI_API_KEY in .env
2. **Network Timeout**: Increase LLM_TIMEOUT_MS
3. **Rate Limit**: Reduce parallel calls or add delays
4. **Empty Response**: Check Gemini API status
5. **No Animations**: Prompt issue (should not happen with v3)

## Debugging Failed Tests

### Stage Test Failures

```bash
# Check API key
cat app/backend/.env | grep GEMINI_API_KEY

# Test API directly
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_KEY"
```

### Integration Test Failures

```bash
# Run with verbose logging
LOG_LEVEL=debug node test-integration.js

# Check individual stage first
node test-unit-stages.js
```

### Full Step Test Failures

```bash
# Reduce visual count for debugging
# Edit test-full-step.js: VISUALS_PER_STEP = 2

# Check orchestrator logs
tail -f app/backend/logs/debug.log
```

## Test Output Artifacts

During testing, the following are generated:

1. **Console Logs**: Detailed progress and results
2. **Debug SVGs**: Saved to `/tmp/debug-step*.svg`
3. **Quality Metrics**: Animation counts, label counts
4. **Performance Data**: Duration, success rates

## Production Deployment Criteria

System is ready for production when:

- ✅ All stage tests pass
- ✅ All integration tests pass
- ✅ Full step test passes
- ✅ Success rate >75% (3/4 visuals)
- ✅ Duration <120s per step
- ✅ All visuals have animations
- ✅ Transcripts are conversational

## Continuous Testing

After deployment, run tests:
- **Daily**: Full step test (validates API connectivity)
- **Weekly**: Complete test suite (validates quality)
- **Before Deploy**: Always run test-all.js

## Test Maintenance

When updating system:
1. Run tests BEFORE making changes
2. Make changes incrementally
3. Run tests AFTER each change
4. Document any new test cases needed

---

## Quick Reference

```bash
# Full test suite
npm test  # or: node test-all.js

# Individual levels
node test-unit-stages.js      # ~30s
node test-integration.js      # ~2-3 min
node test-full-step.js        # ~3-5 min

# Production checklist
cat PRODUCTION_CHECKLIST.md
```
