# 🔍 Live System Monitoring - Step by Step

## Quick Start: Test in 5 Minutes

### Step 1: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd app/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd app/frontend
npm run dev
```

---

## ✅ Backend Log Monitoring (Terminal 1)

### What You SHOULD See:

```
✓ Expected Backend Startup:
═══════════════════════════════════════
✅ SERVER READY
═══════════════════════════════════════
🌐 Backend URL: http://localhost:3000
🔗 Health Check: http://localhost:3000/health
📡 WebSocket Ready: ws://localhost:3000
```

### When User Starts Lecture:

```
✓ Expected Flow:

[orchestrator] New generation request: "explain binary search"
[planner] Generating plan...
[planner] ✓ Plan generated: 3 steps

[orchestrator] Processing step 1/3: Introduction
[subPlanner] Generating 4 visual scripts...
[subPlanner] ✓ Script 1: diagram (concept visualization)
[subPlanner] ✓ Script 2: animation (step-by-step process)
[subPlanner] ✓ Script 3: simulation (interactive demo)
[subPlanner] ✓ Script 4: workflow (algorithm flow)

[visualGenerator] Generating visuals for script 1...
[visualGenerator] ✓ Generated 18 operations
[visualGenerator] Generating visuals for script 2...
[visualGenerator] ✓ Generated 15 operations
[visualGenerator] Generating visuals for script 3...
[visualGenerator] ✓ Generated 12 operations
[visualGenerator] Generating visuals for script 4...
[visualGenerator] ✓ Generated 8 operations

[codegen] ✓ Step 1 complete: 53 total operations
[orchestrator] Emitting step 1 to client
```

### ⚠️ Warning Signs:

```
✗ Problems to Watch For:

[planner] Error: Gemini API failed
[planner] Timeout after 45s
[codegen] Only 15 operations generated  (too few!)
[visualGenerator] Using fallback generation  (means quality loss!)
[orchestrator] No clients connected  (frontend not listening!)
```

---

## 🖥️ Frontend Log Monitoring (Browser Console)

### Open Browser Console:
1. Open http://localhost:5174
2. Press F12 or right-click → Inspect
3. Go to Console tab

### What You SHOULD See:

```javascript
✓ Expected Startup:

[App] Socket connected
[App] Session created: abc-123-xyz
[App] Ready to receive content
```

### When You Start Lecture:

```javascript
✓ Expected Flow:

[App] Received step 1/3
[CanvasStage] Processing chunk with 53 operations
[SequentialRenderer] Rendering step 1
[AnimationQueue] Queued 53 operations
[AnimationQueue] Executing: drawRect
[AnimationQueue] Executing: drawCircle
[AnimationQueue] Executing: graph
[AnimationQueue] Executing: drawLabel
[AnimationQueue] Step 1 complete (2.1s)

[App] Received step 2/3
[CanvasStage] Processing chunk with 47 operations
...
```

### ⚠️ Warning Signs:

```javascript
✗ Problems to Watch For:

[App] Socket connection failed
[App] No steps received after 30s
[SequentialRenderer] Error: Stage reference null
[AnimationQueue] Unknown operation type: xyz
```

---

## 🎨 Interactive UI Testing

### Test 1: Hand Raise Button (30 seconds)

**Steps:**
1. Click ✋ button (bottom-right)

**Expected Console:**
```javascript
[CanvasStage] Hand raise activated
[CanvasStage] Screenshot captured for question mode
[CanvasStage] Frozen context: {stepId: 1, stepDesc: "Introduction"}
```

**Expected Visual:**
- Button turns ORANGE
- Button has pulse animation
- Cursor changes to crosshair

**❌ If Fails:**
- Button doesn't change color → Component not updating
- No console logs → Event handler not attached
- Cursor doesn't change → PenDrawingLayer not activating

---

### Test 2: Drawing (30 seconds)

**Steps:**
1. Click and drag on canvas

**Expected Console:**
```javascript
[PenDrawingLayer] Drawing complete, triggering callback with bounds: {x: 150, y: 200, width: 80, height: 60}
```

**Expected Visual:**
- Orange pen strokes follow mouse
- Strokes smooth and responsive
- Multiple strokes supported

**❌ If Fails:**
- No strokes visible → Drawing layer not created
- Strokes lag → Performance issue
- Only one stroke → Layer destroyed too early

---

### Test 3: Input Field (30 seconds)

**Steps:**
1. Release mouse after drawing

**Expected Console:**
```javascript
[CanvasStage] Drawing complete callback received: {x: 150, y: 200, ...}
[CanvasStage] Setting input position (scroll-aware): {x: 190, y: 80, scrollTop: 0}
[CanvasStage] ✅ Input field should now be visible
```

**Expected Visual:**
- Input field appears IMMEDIATELY
- Positioned near your drawing
- Auto-focused (blinking cursor)
- Has 3 buttons: Cancel, Mark More, Ask

**❌ If Fails:**
- Input doesn't appear → Callback not triggering
- Input off-screen → Scroll offset bug
- Input wrong position → Coordinate calculation wrong
- No auto-focus → Focus logic missing

---

### Test 4: Question Submission (60 seconds)

**Steps:**
1. Type: "Why does this work?"
2. Click "Ask"

**Expected Console:**
```javascript
[CanvasStage] Submitting with frozen context: {stepId: 1, stepDesc: "Introduction", stepTag: "Introduction"}
[App] Canvas question submitted: "Why does this work?"
[App] Context: {stepId: 1, stepDesc: "Introduction"}
```

**Expected Network Tab:**
- Open Network tab (F12 → Network)
- See: POST /api/clarify
- Status: 200 OK
- Response: {success: true}

**Expected Backend Console:**
```
[api] Clarification request for session abc-123: "Why does this work?"
[clarifier] Generating clarification...
[clarifier] ✓ Generated 12 operations
[socket] Emitting clarification to client
```

**Expected Frontend:**
```javascript
[App] Canvas clarification response: {success: true}
Socket event 'clarification' received
[CanvasStage] Clarification visual appearing...
```

**❌ If Fails:**
- No network request → Validation failed or bug
- 400 Bad Request → Missing sessionId
- 500 Server Error → Backend crashed
- No clarification appears → Socket not receiving

---

## 🔴 Critical Fixes Verification

### Fix 1: Sticky Toolbar Test

**Steps:**
1. Start lecture
2. Click hand raise
3. Resize browser window (make smaller, then larger)

**✓ Expected:**
- Toolbar STAYS at top (doesn't disappear)
- Hand button STAYS at bottom-right

**❌ If Fails:**
Console error: "Cannot read marginTop of undefined"
→ useMemo fix not applied

---

### Fix 2: Error Feedback Test

**Steps:**
1. WITHOUT starting lecture, click hand raise
2. Draw and try to submit

**✓ Expected:**
- Red error banner appears
- Message: "Please start a lecture before asking questions"
- Has "Dismiss" button

**❌ If Fails:**
- No error shown → Error state not working
- Console error only → UI not rendering error

---

### Fix 3: Scroll Position Test

**Steps:**
1. Start long lecture (3+ steps)
2. Scroll canvas down 500px
3. Click hand raise
4. Draw at bottom of viewport

**✓ Expected:**
- Input appears in VISIBLE area
- No need to scroll to see it

**❌ If Fails:**
Console shows: `inputY: 600` (off-screen)
→ Missing scrollTop offset fix

---

### Fix 4: Context Freeze Test

**Steps:**
1. Start lecture
2. Wait for Step 1 to complete
3. Click hand raise (should freeze at Step 1)
4. Wait 30 seconds (let Step 2 auto-advance)
5. Submit question
6. Check Network tab payload

**✓ Expected:**
```json
{
  "stepContext": {
    "stepId": 1,  // Still Step 1!
    "stepDesc": "Introduction"
  }
}
```

**❌ If Fails:**
Payload shows stepId: 2 → Context not frozen

---

## 📊 Quality Checklist

Fill this out while testing:

### Backend Quality
- [ ] Plan generates 3-5 steps
- [ ] Each step has 50+ operations
- [ ] Operations include graph/latex/path (not just drawRect)
- [ ] All steps complete without errors
- [ ] Socket emissions successful

### Frontend Rendering
- [ ] All steps render on canvas
- [ ] Visuals appear sequentially
- [ ] No overlapping steps
- [ ] Labels readable
- [ ] Graphs/equations visible

### Interactive UI
- [ ] Hand button visible and clickable
- [ ] Toolbar visible at top
- [ ] Drawing creates orange strokes
- [ ] Input appears after drawing
- [ ] Can submit questions
- [ ] Clarification appears

### Critical Fixes
- [ ] Toolbar survives window resize
- [ ] Error messages show to user
- [ ] Input visible after scroll
- [ ] Context frozen correctly
- [ ] Screenshot includes drawings
- [ ] Validation rejects empty/short questions

---

## 🎯 Score Your System

Count checkmarks above:

- **20-24**: 🟢 EXCELLENT - Ship it!
- **16-19**: 🟢 GOOD - Minor issues only
- **12-15**: 🟡 FAIR - Some fixes needed
- **8-11**: 🟡 NEEDS WORK - Multiple problems
- **< 8**: 🔴 CRITICAL - Major failures

---

## 📝 Quick Troubleshooting

### "Nothing renders on canvas"
→ Check: Socket connected? Steps received? Console errors?

### "Hand button doesn't work"
→ Check: Button visible? Console logs on click? Event attached?

### "Input doesn't appear"
→ Check: Drawing callback logs? Input visible state? Position calculated?

### "Questions don't submit"
→ Check: Session ID exists? Network request sent? Backend response?

### "Clarification doesn't show"
→ Check: Socket event received? Clarification format correct? Rendering errors?

---

## ✅ Success Criteria

**System is ready when:**
1. Backend generates 3-5 steps with 50+ operations each
2. All steps render correctly on frontend
3. Hand raise pauses and enables drawing
4. Input appears immediately after drawing
5. Questions submit successfully
6. Clarifications appear contextually
7. No critical errors in console
8. All 6 critical fixes verified

**Time to complete full flow:** ~60-90 seconds per topic
