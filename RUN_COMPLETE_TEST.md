# 🚀 Complete System Test - Interactive Canvas UI

## Run This Test Right Now

### Step 1: Start Backend (Terminal 1)

```bash
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev
```

**Wait for this message:**
```
✅ SERVER READY
🌐 Backend URL: http://localhost:3000
```

---

### Step 2: Start Frontend (Terminal 2)

```bash
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev
```

**Wait for this message:**
```
➜  Local:   http://localhost:5174/
```

---

### Step 3: Open Browser

1. Open: **http://localhost:5174**
2. Press **F12** to open DevTools
3. Go to **Console** tab

---

### Step 4: Start a Lecture

1. Type in input field: **"Explain binary search algorithm"**
2. Select difficulty: **Medium**
3. Click **"Start Lecture"**

---

## 📊 WHAT TO MONITOR NOW

### Backend Terminal - Expected Logs (in order):

```
[orchestrator] Generation request received
[planner] Generating plan for: "Explain binary search algorithm"
[planner] ✓ Generated plan with 3 steps

[orchestrator] Processing step 1/3
[subPlanner] Generating 4 visual scripts for step 1
[subPlanner] ✓ Generated 4 scripts
[visualGenerator] Generating visuals...
[visualGenerator] ✓ Script 1: 18 operations
[visualGenerator] ✓ Script 2: 15 operations  
[visualGenerator] ✓ Script 3: 12 operations
[visualGenerator] ✓ Script 4: 8 operations
[codegen] ✓ Step 1 complete: 53 operations

[orchestrator] Emitting step 1 to session
[socket] Step sent to client

[orchestrator] Processing step 2/3
...
```

### Browser Console - Expected Logs:

```javascript
[App] Socket connected
[App] Session created: gen_1234567890
[App] Received step 1/3
[CanvasStage] Routing chunk: step
[SequentialRenderer] Processing step with 53 operations
[AnimationQueue] Queued 53 operations
[AnimationQueue] Rendering operation 1/53: drawRect
[AnimationQueue] Rendering operation 2/53: drawCircle
...
[AnimationQueue] Step 1 complete in 2.1s

[App] Received step 2/3
...
```

### Visual Canvas - Expected:

- White canvas appears
- Shapes start drawing sequentially
- Text labels appear
- Graphs/diagrams form
- Step transitions smoothly

---

## 🎨 TEST INTERACTIVE UI

### Once Step 1 is Rendering:

#### Test 1: Hand Raise (10 seconds)

1. **Click the ✋ button** (bottom-right corner)

**Expected:**
- ✓ Button turns **ORANGE**
- ✓ Pulse animation
- ✓ Playback **PAUSES**
- ✓ Cursor becomes **crosshair**

**Browser Console:**
```javascript
[CanvasStage] Hand raise activated
[CanvasStage] Screenshot captured for question mode
[CanvasStage] Frozen context: {stepId: 1, stepDesc: "..."}
```

---

#### Test 2: Drawing (10 seconds)

2. **Click and drag** on the canvas to draw

**Expected:**
- ✓ **Orange strokes** appear as you draw
- ✓ Strokes follow mouse smoothly
- ✓ Can draw multiple strokes

**Browser Console:**
```javascript
[PenDrawingLayer] Drawing complete, triggering callback with bounds: {x: 150, y: 200, ...}
```

---

#### Test 3: Input Field (5 seconds)

3. **Release mouse** after drawing

**Expected:**
- ✓ Input field appears **IMMEDIATELY**
- ✓ Positioned near your drawing
- ✓ Auto-focused (cursor blinking)
- ✓ Has buttons: **Cancel**, **Mark More**, **Ask**

**Browser Console:**
```javascript
[CanvasStage] Drawing complete callback received
[CanvasStage] Setting input position (scroll-aware): {x: 190, y: 80}
[CanvasStage] ✅ Input field should now be visible
```

---

#### Test 4: Submit Question (20 seconds)

4. **Type:** "Why do we divide by 2?"
5. **Click "Ask"** button

**Expected:**
- ✓ Loading spinner appears
- ✓ "Ask" button disabled

**Browser Console:**
```javascript
[CanvasStage] Submitting with frozen context: {stepId: 1, ...}
[App] Canvas question submitted: "Why do we divide by 2?"
[App] Context: {stepId: 1, stepDesc: "Introduction"}
```

**Browser Network Tab:**
- See: **POST /api/clarify**
- Status: **200 OK**

**Backend Terminal:**
```
[api] Clarification request: "Why do we divide by 2?"
[clarifier] Generating clarification...
[clarifier] ✓ Generated 12 operations
[socket] Emitting clarification
```

**Browser Console:**
```javascript
[App] Canvas clarification response: {success: true}
Socket event 'clarification' received
```

**Expected Visual:**
- ✓ New visual appears on canvas
- ✓ Contextual to your question
- ✓ Drawings cleared
- ✓ Input closed
- ✓ Playback **RESUMES**

---

## 🔴 CRITICAL TESTS

### Test 5: Window Resize (10 seconds)

1. **Resize browser window** (make smaller, then larger)

**Expected:**
- ✓ Toolbar **STAYS** at top (doesn't disappear)
- ✓ Hand button **STAYS** at bottom-right

**❌ FAILS if:**
- Toolbar disappears
- Hand button scrolls away

**Fix Status:** Should be working (useMemo applied)

---

### Test 6: Error Handling (10 seconds)

1. **Without starting a lecture**, click hand raise
2. Draw something
3. Try to submit a question

**Expected:**
- ✓ Red error banner appears
- ✓ Message: "Please start a lecture before asking questions"
- ✓ Has "Dismiss" button

**❌ FAILS if:**
- No error shown
- Silent failure
- Console error only

**Fix Status:** Should be working (error state added)

---

### Test 7: Scroll Position (15 seconds)

1. Start a **long lecture** (5+ steps, select "hard" difficulty)
2. **Scroll down** 500px on the canvas
3. Click hand raise
4. Draw at your current scroll position

**Expected:**
- ✓ Input appears in **VISIBLE** area
- ✓ No need to scroll to see it

**❌ FAILS if:**
- Input appears off-screen
- Have to scroll up/down to find it

**Fix Status:** Should be working (viewport-relative positioning)

---

### Test 8: Context Freeze (30 seconds)

1. Start lecture
2. Wait for Step 1 to complete
3. Click hand raise (context should freeze at Step 1)
4. **Wait 30 seconds** (let Step 2 auto-advance)
5. Submit your question
6. **Check Network tab** → Click on `/api/clarify` request → View payload

**Expected Payload:**
```json
{
  "sessionId": "gen_123",
  "question": "Your question",
  "stepContext": {
    "stepId": 1,        // ✓ Still Step 1!
    "stepDesc": "Introduction",
    "stepTag": "Introduction"
  }
}
```

**❌ FAILS if payload shows:**
```json
{
  "stepContext": {
    "stepId": 2,  // ✗ Changed to Step 2 (WRONG!)
  }
}
```

**Fix Status:** Should be working (frozen context added)

---

## 📋 SCORE YOUR RESULTS

Check off each item:

### Backend Quality
- [ ] Backend starts without errors
- [ ] Plan generates (3-5 steps)
- [ ] Each step has 50+ operations
- [ ] Operations include graph/latex/path (not just circles)
- [ ] Socket emissions successful

### Frontend Rendering  
- [ ] Frontend connects to backend
- [ ] Steps received via socket
- [ ] Canvas renders visuals
- [ ] No overlap between steps
- [ ] Text/labels visible

### Interactive UI
- [ ] Hand button visible and works
- [ ] Toolbar visible at top
- [ ] Drawing creates orange strokes
- [ ] Input appears after drawing
- [ ] Questions submit successfully
- [ ] Clarification appears

### Critical Fixes
- [ ] Toolbar survives resize ✓
- [ ] Error messages show ✓
- [ ] Input visible after scroll ✓
- [ ] Context frozen ✓
- [ ] Screenshot includes drawings ✓
- [ ] Input validation works ✓

**Total Score: ___/23**

---

## 🎯 Results Interpretation

### 21-23 checks: 🟢 PERFECT
**Status:** Production ready, all systems go!

### 18-20 checks: 🟢 EXCELLENT  
**Status:** Minor polish needed, ready for staging

### 15-17 checks: 🟡 GOOD
**Status:** Some issues, but functional

### 12-14 checks: 🟡 FAIR
**Status:** Multiple problems, needs fixes

### < 12 checks: 🔴 POOR
**Status:** Critical failures, debug required

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: "Backend won't start"
```
Error: Cannot find module 'dotenv'
```
**Fix:**
```bash
cd app/backend
npm install
```

### Issue 2: "No visuals on canvas"
**Check:**
- Browser console for errors
- Backend logs for generation failures
- Socket connection status

### Issue 3: "Hand button does nothing"
**Check:**
- Button visible on screen?
- Console logs when clicking?
- React DevTools component mounted?

### Issue 4: "Input doesn't appear"
**Check:**
- Drawing callback logs?
- `questionInputVisible` state = true?
- Position calculation correct?

### Issue 5: "Clarification fails"
**Check:**
- Session ID exists?
- Network request reaches backend?
- Backend response successful?
- Socket connection active?

---

## 📸 SCREENSHOT CHECKLIST

Take screenshots of:
1. Backend terminal showing successful generation
2. Browser console showing step reception
3. Canvas with rendered visuals
4. Hand button (orange when active)
5. Drawing strokes on canvas
6. Input field appearing
7. Network tab showing /api/clarify request
8. Clarification visual on canvas

---

## ✅ FINAL VERIFICATION

If you have:
- ✅ 20+ checks passing
- ✅ All 8 tests successful
- ✅ No critical console errors
- ✅ Smooth user experience

**THEN: System is PRODUCTION READY** 🚀

Report results with:
- Total score: __/23
- Test duration: __ minutes
- Critical failures: [list any]
- Screenshots: [attach]
