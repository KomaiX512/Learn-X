# Quick Debugging Guide - Learn-X V3 Optimized

## Common Issues & Solutions

### Issue 1: MAX_TOKENS Error Still Appearing

**Symptom in logs:**
```
Finish reason: MAX_TOKENS
Received 0 chars
```

**Check:**
```bash
cd /home/komail/LEAF/Learn-X/app/backend
grep "maxOutputTokens" src/agents/svgAnimationGenerator.ts
# Should show: maxOutputTokens: 4000

grep "maxOutputTokens" src/agents/svgCompleteGenerator.ts
# Should show: maxOutputTokens: 5000
```

**Fix if wrong:**
- Backend may not have restarted
- Run: `npm run dev` to reload changes

---

### Issue 2: Still Generating 5 Steps

**Symptom:**
Plan shows 5 steps instead of 3

**Check:**
```bash
grep "steps.length !== " src/agents/planner.ts
# Should show: plan.steps.length !== 3
```

**Fix if wrong:**
- Cached plans may still be in Redis
- Clear cache: `redis-cli FLUSHDB`
- Restart backend

---

### Issue 3: Steps Not Appearing Progressively

**Symptom:**
All 3 steps appear at once after waiting

**Check logs for:**
```
[parallel] 🚀 IMMEDIATELY EMITTED step 1
[parallel] 🚀 IMMEDIATELY EMITTED step 2
[parallel] 🚀 IMMEDIATELY EMITTED step 3
```

**If missing, check:**
```bash
grep "IMMEDIATE EMISSION" src/orchestrator.ts
# Should exist in code
```

**Common cause:**
- Frontend may be batching renders
- Check browser console for WebSocket events

---

### Issue 4: Too Many Visuals Per Step

**Symptom:**
Seeing 5+ visuals per step

**Check:**
```bash
grep "Create 4 FOCUSED" src/agents/codegenV3.ts
# Should exist in prompt
```

**Verify:**
```bash
grep "TARGET_SPECS = 4" src/agents/codegenV3.ts
# Should show: const TARGET_SPECS = 4;
```

---

### Issue 5: High Failure Rate

**Symptom:**
Many steps failing with errors

**Check API key:**
```bash
cd /home/komail/LEAF/Learn-X/app/backend
cat .env | grep GEMINI_API_KEY
# Should show valid key
```

**Check rate limits:**
```bash
# In terminal logs, look for:
Rate limit hit, will retry...
# This is OK - system will retry

# But if you see:
❌ ALL 3 ATTEMPTS FAILED
# Then API might be rate-limited
```

**Solution:**
- Wait 1 minute for rate limits to reset
- Reduce concurrent requests in orchestrator

---

## Log Patterns

### ✅ SUCCESS Patterns (What You WANT to See):

```
[planner] JSON parsed successfully on first attempt
[planVisualsEnhanced] ✅ Strategy 1 success: 4 specs (2 static, 2 animations)
[SVG-ANIMATION] ✅ VALID! Score: 70/100
[SVG-COMPLETE] Quality Score: 65/100
[parallel] ✅ Step 1 COMPLETE in 42000ms with 5 actions
[parallel] 🚀 IMMEDIATELY EMITTED step 1 to frontend
[parallel] ✅ Step 2 COMPLETE in 48000ms with 5 actions
[parallel] 🚀 IMMEDIATELY EMITTED step 2 to frontend
[parallel] ✅ Step 3 COMPLETE in 45000ms with 5 actions
[parallel] 🚀 IMMEDIATELY EMITTED step 3 to frontend
```

### ❌ FAILURE Patterns (What You DON'T Want):

```
Finish reason: MAX_TOKENS
Received 0 chars
Quality Score: 0/100
❌ ALL 5 ATTEMPTS FAILED
❌ Step 1 codegen returned null after all retries
CRITICAL FAILURE
plan.steps.length !== 5  // Should be 3!
```

---

## Quick Validation Commands

### 1. Check Token Limits
```bash
cd /home/komail/LEAF/Learn-X/app/backend/src/agents
grep "maxOutputTokens:" svgAnimationGenerator.ts svgCompleteGenerator.ts
```

Expected output:
```
svgAnimationGenerator.ts:        maxOutputTokens: 4000,
svgCompleteGenerator.ts:        maxOutputTokens: 5000,
```

### 2. Check Step Count
```bash
cd /home/komail/LEAF/Learn-X/app/backend/src/agents
grep "!== 3" planner.ts
```

Expected output:
```
if (!Array.isArray(plan.steps) || plan.steps.length !== 3)
```

### 3. Check Visual Count
```bash
cd /home/komail/LEAF/Learn-X/app/backend/src/agents
grep "TARGET_SPECS" codegenV3.ts
```

Expected output:
```
const TARGET_SPECS = 4;
```

### 4. Check Immediate Emission
```bash
cd /home/komail/LEAF/Learn-X/app/backend/src
grep "IMMEDIATELY EMITTED" orchestrator.ts
```

Expected output:
```
logger.info(`[parallel] 🚀 IMMEDIATELY EMITTED step ${step.id} to frontend`);
```

---

## Performance Benchmarks

### Expected Timings:

| Stage | Time | Acceptable Range |
|-------|------|------------------|
| Plan generation | 8s | 5-15s |
| Visual specs | 4s | 3-8s |
| Static SVG | 12s | 8-20s |
| Animation SVG | 15s | 10-25s |
| Step 1 complete | 45s | 35-60s |
| Step 2 complete | 90s | 70-110s |
| Step 3 complete | 135s | 110-160s |
| **Total** | **2.5 min** | **2-3 min** |

### If Times Are Much Longer:

**Check API response times:**
- Gemini API might be slow
- Rate limits may be kicking in
- Network issues

**Check parallel concurrency:**
```bash
grep "concurrency:" orchestrator.ts
# Should show: concurrency: 2
```

---

## Environment Checklist

### Must Have in `.env`:
```bash
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-2.5-flash
USE_VISUAL_VERSION=v3
REDIS_URL=redis://localhost:6379
```

### Verify with:
```bash
cd /home/komail/LEAF/Learn-X/app/backend
cat .env
```

---

## Restart Everything

If all else fails, nuclear option:

```bash
# Stop backend
pkill -f "npm run dev"

# Clear Redis cache
redis-cli FLUSHDB

# Restart backend
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev

# Test
# Open http://localhost:5173
# Try query: "teach me about DNA replication"
```

---

## Monitor Real-Time

### Watch logs in real-time:
```bash
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev | grep -E "(✅|❌|🚀|MAX_TOKENS)"
```

This will show only:
- ✅ Success messages
- ❌ Failure messages
- 🚀 Emission events
- MAX_TOKENS errors (should be none!)

---

## Test Queries

Use these to test different scenarios:

### Simple (Fast):
- "teach me about water"
- "explain photosynthesis"
- "how do magnets work"

### Medium (Normal):
- "teach me about DNA replication"
- "explain quantum entanglement"
- "how does machine learning work"

### Complex (Stress Test):
- "teach me about general relativity and spacetime curvature"
- "explain CRISPR gene editing at the molecular level"
- "how do neural networks learn through backpropagation"

---

## Success Criteria

System is working correctly if:

1. ✅ Plan generates in 5-15 seconds
2. ✅ Shows exactly 3 steps (not 5)
3. ✅ Step 1 appears in 35-60 seconds
4. ✅ Step 2 appears 45 seconds after Step 1
5. ✅ Step 3 appears 45 seconds after Step 2
6. ✅ Each step has 4-5 actions (visuals)
7. ✅ No MAX_TOKENS errors in logs
8. ✅ At least 2 of 3 steps succeed
9. ✅ Total time under 3 minutes
10. ✅ User sees progressive delivery

If all 10 criteria met → **System is production-ready** ✅

---

## Get Help

If issues persist after checking above:

1. **Capture logs**: Save terminal output to file
2. **Check specific error**: Search for "❌" or "FAILED"
3. **Verify file changes**: Use `git diff` to see modifications
4. **Check Redis**: Ensure it's running (`redis-cli ping`)
5. **API status**: Verify Gemini API is accessible

Common external issues:
- Gemini API rate limits (wait 1 minute)
- Invalid API key (check .env)
- Redis not running (start with `redis-server`)
- Port conflicts (check 3001 and 5173 are free)
