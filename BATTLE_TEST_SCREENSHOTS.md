# 🧪 Battle Test - Screenshot Payload Size

## Quick Test (2 Minutes)

### Step 1: Restart Servers

**Terminal 1:**
```bash
cd app/backend
npm run dev
```

Wait for: `✅ SERVER READY`

**Terminal 2:**
```bash
cd app/frontend
npm run dev
```

Wait for: `[vite] connected.`

---

### Step 2: Test Small Canvas

1. Open http://localhost:5174
2. Start lecture: **"Explain recursion"**
3. Wait for Step 1 to render
4. Click ✋ (hand raise)
5. Draw a circle
6. Type: "Why does this work?"
7. Click "Ask"

**Expected Console Output:**
```
[canvasScreenshot] Capturing visible viewport: {scrollTop: 0, width: 800, height: 500}
[canvasScreenshot] Screenshot size: 180KB  ✅ Good!
[CanvasStage] Submitting with frozen context...
```

**Expected Network:**
```
POST /api/clarify
Status: 200 OK  ✅ (NOT 413!)
```

**✅ PASS if**:
- Screenshot < 500KB
- Request succeeds (HTTP 200)
- Clarification appears

---

### Step 3: Test Scrolled Canvas

1. Start new lecture: **"Binary search algorithm"** (Hard difficulty = 5 steps)
2. **Scroll down to Step 3** (middle of canvas)
3. Click ✋ (hand raise)
4. Draw marks
5. Type: "How does the midpoint work?"
6. Click "Ask"

**Expected Console Output:**
```
[canvasScreenshot] Capturing visible viewport: {scrollTop: 1200, width: 800, height: 500}
[canvasScreenshot] Screenshot size: 220KB  ✅ Good!
```

**✅ PASS if**:
- Screenshot < 500KB (even with 5 steps!)
- Request succeeds
- AI references the MIDDLE step (not top/bottom)

---

### Step 4: Test Large Canvas with Drawings

1. Continue previous lecture or start new one
2. **Scroll to bottom** (Step 5)
3. Click ✋
4. **Draw multiple strokes** (5-10 pen marks)
5. Type: "What's happening here?"
6. Click "Ask"

**Expected Console Output:**
```
[canvasScreenshot] Viewport screenshot captured: 800x500
[CanvasStage] Final screenshot captured: 800x500
[canvasScreenshot] Screenshot size: 240KB  ✅ Still good!
```

**✅ PASS if**:
- Screenshot < 500KB (even with drawings!)
- All pen marks visible in screenshot
- AI references the drawn marks
- Request succeeds

---

### Step 5: Rapid Fire Test

1. Start lecture
2. Submit 5 questions rapidly:
   - Question 1: Click hand → Draw → Ask
   - Question 2: Click hand → Draw → Ask
   - Question 3: Click hand → Draw → Ask
   - Question 4: Click hand → Draw → Ask
   - Question 5: Click hand → Draw → Ask

**Expected:**
```
All 5 requests: HTTP 200 OK ✅
All screenshots: < 500KB ✅
No 413 errors ✅
Backend memory stable ✅
```

**✅ PASS if**:
- All 5 questions succeed
- No server crashes
- No 413 errors

---

## Detailed Verification

### Check Screenshot Size

**Browser Console:**
```javascript
// After raising hand
[canvasScreenshot] Capturing visible viewport: {
  scrollTop: 500,
  scrollLeft: 0,
  viewportWidth: 800,
  viewportHeight: 500
}
[canvasScreenshot] Screenshot size: 215KB  ✅

// Should be 100-300KB range
// Should NOT be > 1MB
```

### Check Network Payload

**DevTools → Network Tab:**
```
Name: clarify
Method: POST
Status: 200 OK  ✅ (NOT 413!)
Type: fetch
Size: ~250KB   ✅
Time: 0.5-2s   ✅
```

**Click on request → Preview payload:**
```json
{
  "sessionId": "gen_1234567890",
  "question": "Why does this work?",
  "screenshot": "data:image/jpeg;base64,/9j/4AAQ..." ✅ JPEG!
  "stepContext": {
    "stepId": 1,
    "stepDesc": "Introduction",
    "stepTag": "Introduction"
  }
}
```

### Check Backend Logs

**Backend Terminal:**
```
[api] Clarification request for session gen_123: "Why does this work?"
[api] Step context: { stepId: 1, stepDesc: '...', stepTag: '...' }
[clarifier] Generating clarification...
[clarifier] ✓ Generated 12 operations
[socket] Emitting clarification to client

✅ NO "PayloadTooLargeError"
✅ NO "request entity too large"
```

---

## Failure Scenarios to Test

### ❌ Test 1: What if backend limit not increased?

**Simulate:**
1. Edit backend/src/index.ts
2. Change: `express.json({ limit: '10mb' })` → `express.json()`
3. Restart backend
4. Try to submit question

**Expected:**
```
Error: HTTP 413: Payload Too Large
```

**Action:** Revert change, restart backend

---

### ❌ Test 2: What if viewport capture not used?

**Simulate:**
1. In CanvasStage.tsx, change:
```typescript
// Change captureVisibleViewport → captureCanvasScreenshot
const screenshot = await captureCanvasScreenshot(stageRef.current);
```
2. Reload frontend
3. Try with large canvas (5 steps)

**Expected:**
```
[canvasScreenshot] Screenshot size: 8500KB  ❌ TOO BIG!
Possibly: HTTP 413 error
```

**Action:** Revert change

---

### ❌ Test 3: What if PNG is used instead of JPEG?

**Simulate:**
1. In canvasScreenshot.ts, change:
```typescript
mimeType: 'image/png'  // Change from 'image/jpeg'
```
2. Test screenshot

**Expected:**
```
[canvasScreenshot] Screenshot size: 2100KB  ❌ 10x larger!
```

**Action:** Revert change

---

## Performance Benchmarks

### Target Metrics:
```
Screenshot capture time: < 300ms ✅
Screenshot size: 100-300KB ✅
Upload time: 0.5-1.5s ✅
Total question flow: 2-5s ✅
Backend memory: Stable ✅
```

### Measure in Browser:
```javascript
// In console, time the flow
console.time('questionFlow');
// Raise hand → Draw → Submit
console.timeEnd('questionFlow');
// Should be: 2000-5000ms
```

---

## Size Comparison Table

Fill this out during testing:

| Test Case | Canvas Size | Viewport | Screenshot Size | Status |
|-----------|-------------|----------|-----------------|--------|
| Small (1 step) | 800x600 | 800x500 | ___ KB | ✅/❌ |
| Medium (3 steps) | 800x1800 | 800x500 | ___ KB | ✅/❌ |
| Large (5 steps) | 800x3000 | 800x500 | ___ KB | ✅/❌ |
| With drawings | 800x500 | 800x500 | ___ KB | ✅/❌ |
| Scrolled middle | 800x3000 | 800x500 | ___ KB | ✅/❌ |
| Scrolled bottom | 800x3000 | 800x500 | ___ KB | ✅/❌ |

**All should be < 500KB!**

---

## Edge Cases

### Edge Case 1: Very Small Viewport
```
Viewport: 400x300 (small window)
Expected: ~80-120KB screenshot
Status: ✅/❌
```

### Edge Case 2: Very Large Viewport
```
Viewport: 1600x900 (large monitor)
Expected: ~300-500KB screenshot
Status: ✅/❌
```

### Edge Case 3: High DPI Display (Retina)
```
Physical: 800x500
Pixel ratio: 1.5
Actual pixels: 1200x750
Expected: ~250-400KB screenshot
Status: ✅/❌
```

### Edge Case 4: Minimal Content
```
Blank canvas with 1 circle
Expected: ~50-100KB screenshot (high compression)
Status: ✅/❌
```

### Edge Case 5: Complex Content
```
Multiple graphs, LaTeX, paths, particles
Expected: ~200-350KB screenshot
Status: ✅/❌
```

---

## Automated Test Script

Copy-paste into browser console after starting lecture:

```javascript
// Test screenshot size
async function testScreenshotSize() {
  console.group('Screenshot Size Test');
  
  // Get stage and container
  const stage = window.__konvaStage; // Assuming stage is exposed
  const container = document.querySelector('.canvas-container');
  
  if (!stage || !container) {
    console.error('Stage or container not found');
    return;
  }
  
  // Import capture function
  const { captureVisibleViewport } = await import('./utils/canvasScreenshot.ts');
  
  // Capture screenshot
  console.time('capture');
  const screenshot = await captureVisibleViewport(stage, container);
  console.timeEnd('capture');
  
  // Calculate size
  const sizeKB = (screenshot.dataUrl.length * 0.75 / 1024).toFixed(2);
  
  console.log(`Screenshot dimensions: ${screenshot.width}x${screenshot.height}`);
  console.log(`Screenshot size: ${sizeKB}KB`);
  console.log(`Timestamp: ${screenshot.timestamp}`);
  
  if (parseFloat(sizeKB) < 500) {
    console.log('✅ PASS: Size under 500KB limit');
  } else {
    console.error('❌ FAIL: Size exceeds 500KB limit!');
  }
  
  console.groupEnd();
}

// Run test
testScreenshotSize();
```

---

## Success Criteria

### Must Pass (Critical):
- [x] Screenshot < 500KB in all cases
- [x] HTTP 200 (not 413) on all requests
- [x] Clarification appears correctly
- [x] AI references correct context
- [x] Drawings visible in screenshot

### Should Pass (Important):
- [x] Screenshot capture < 300ms
- [x] Total flow < 5 seconds
- [x] Works at any scroll position
- [x] Works with any number of steps
- [x] Backend memory stable

### Nice to Have:
- [ ] Screenshot < 300KB average
- [ ] Capture < 200ms
- [ ] Works on mobile

---

## Rollback Checklist

If tests fail:

1. **Check backend restarted** with new limits
2. **Check frontend restarted** with new viewport code
3. **Clear browser cache** (Ctrl+Shift+R)
4. **Check console logs** for actual errors
5. **Verify code changes** applied correctly

---

## Final Verification

After all tests pass:

```bash
✅ All 5 battle tests passed
✅ Screenshot sizes: 100-300KB range
✅ No 413 errors
✅ All clarifications successful
✅ Performance acceptable
✅ Memory stable

Status: PRODUCTION READY
```

---

## Report Results

Fill out after testing:

```
Date: _______
Tester: _______
Browser: _______

Test 1 (Small Canvas): PASS / FAIL - Screenshot: ___ KB
Test 2 (Scrolled): PASS / FAIL - Screenshot: ___ KB
Test 3 (With Drawings): PASS / FAIL - Screenshot: ___ KB
Test 4 (Rapid Fire): PASS / FAIL - All succeeded: Y / N
Test 5 (Edge Cases): PASS / FAIL - Notes: _______

Overall: PASS / FAIL
Ready for production: YES / NO
```
