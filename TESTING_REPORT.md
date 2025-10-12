# Sequential Rendering Testing & Debugging Report

## 🎯 Objective

Verify that the sequential rendering system works as expected:
- ✅ Visuals appear one-by-one (not all at once)
- ✅ Captions show before each visual
- ✅ Auto-scroll keeps active content in view
- ✅ Playback auto-starts (no manual play button needed)
- ✅ Steps stack vertically in one long scroll

## 📊 Test Suite Created

### Location
`/home/komail/LEAF/Learn-X/app/frontend/src/__tests__/`

### Files Created

1. **SequentialRenderer.test.ts** (345 lines)
   - Tests caption/transcript functionality
   - Tests visual sequencing
   - Tests playback controls
   - Tests action callbacks

2. **AnimationQueue.test.ts** (440 lines)
   - Tests sequential playback
   - Tests timing/delays
   - Tests callbacks
   - Tests error handling
   - Tests step transitions

3. **integration.test.ts** (340 lines)
   - Tests complete flow end-to-end
   - Tests auto-start behavior
   - Tests sequential timing (2+ second gaps)
   - Tests caption appearance
   - Tests auto-scroll
   - Tests multi-step rendering

4. **manual-debug.js** (380 lines)
   - Browser console debugging tools
   - Real-time diagnostics
   - Interactive test runner
   - State inspection utilities

5. **quick-validate.ts** (420 lines)
   - No-dependency validation
   - Logic verification
   - Diagnostic reports

6. **README.md** (600 lines)
   - Setup instructions
   - Test running guide
   - Debugging tips
   - Troubleshooting guide

## 🔍 How to Test

### Option 1: Quick Validation (No Setup Required)

```bash
cd /home/komail/LEAF/Learn-X/app/frontend

# Run logic validation
npx tsx src/__tests__/quick-validate.ts

# Or diagnose configuration
npx tsx src/__tests__/quick-validate.ts --diagnose
```

This validates:
- Sentence splitting logic
- Delay configuration
- Caption structure
- Step transition logic
- Auto-start behavior
- Sequential timing

### Option 2: Full Unit Tests (Requires Setup)

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jsdom canvas

# Create jest.config.js (see README.md)

# Run tests
npm test

# Run specific suite
npm test SequentialRenderer.test.ts
npm test AnimationQueue.test.ts
npm test integration.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Option 3: Browser Console Testing (Most Realistic)

1. **Start the app**
   ```bash
   npm run dev
   ```

2. **Open browser** → http://localhost:5174

3. **Open DevTools** (F12) → Console tab

4. **Load debug tools**
   - Open `/home/komail/LEAF/Learn-X/app/frontend/src/__tests__/manual-debug.js`
   - Copy entire content
   - Paste into console
   - Press Enter

5. **Run diagnostic**
   ```javascript
   debugSequentialRenderer.diagnose()
   ```

6. **Run all tests**
   ```javascript
   debugSequentialRenderer.runAll()
   ```

7. **Run individual tests**
   ```javascript
   debugSequentialRenderer.testAutoStart()
   debugSequentialRenderer.testSequentialTiming()
   debugSequentialRenderer.testCaptions()
   debugSequentialRenderer.testAutoScroll()
   debugSequentialRenderer.testStepTransitions()
   debugSequentialRenderer.testPlaybackControls()
   ```

## 🎬 Expected Behavior

### Correct Flow (What Should Happen)

1. **User loads a topic** → Backend generates visuals

2. **First step arrives**
   - Transcript: "Visual one. Visual two. Visual three. Visual four."
   - Actions: [customSVG, customSVG, customSVG, customSVG]

3. **Rendering starts automatically** (no play button)

4. **Visual 1 sequence** (0ms - 2200ms)
   - 0ms: Caption appears: "🎙️ Narration: Visual one. Visual two."
   - 0ms: Auto-scroll to caption
   - 700ms: Visual 1 SVG renders below caption
   - 700ms: Auto-scroll to visual
   - 2200ms: Wait period for comprehension

5. **Visual 2 sequence** (2200ms - 4400ms)
   - 2200ms: Previous caption removed
   - 2200ms: New caption: "Visual three. Visual four."
   - 2900ms: Visual 2 renders
   - 4400ms: Wait period

6. **Visual 3, 4...** continue same pattern

7. **Step 2 arrives**
   - Queue resets
   - Visual index resets to 0
   - New layer created
   - Previous visuals remain on page (stacked vertically)

### Incorrect Behavior (What Might Be Happening)

❌ **All visuals appear at once**
- Cause: AnimationQueue not sequential
- Cause: Delays too short or missing
- Cause: Async/await not properly chained

❌ **No captions visible**
- Cause: showCaptionForVisual() not called
- Cause: Caption element created but not appended
- Cause: Caption z-index or positioning issue

❌ **Requires manual play button**
- Cause: Auto-start not triggering
- Cause: AnimationQueue.enqueue() not calling play()
- Cause: Play condition check failing

❌ **No auto-scroll**
- Cause: Scroll parent not found
- Cause: scrollTop not being set
- Cause: Container doesn't have overflow

## 🔧 Key Implementation Points

### SequentialRenderer.ts

```typescript
// ✅ CORRECT: Caption state
private currentTranscript: string = '';
private transcriptSentences: string[] = [];
private visualIndexInStep: number = 0;
private captionEl: HTMLDivElement | null = null;

// ✅ CORRECT: processChunk resets on new step
if (this.currentStepId !== chunk.stepId) {
  this.currentTranscript = chunk.transcript || '';
  this.transcriptSentences = this.splitSentences(this.currentTranscript);
  this.visualIndexInStep = 0;
  if (this.captionEl) {
    this.captionEl.remove();
    this.captionEl = null;
  }
}

// ✅ CORRECT: customSVG shows caption first
case 'customSVG':
  await this.showCaptionForVisual(this.visualIndexInStep);
  await this.renderCompleteSVG(action.svgCode, action.visualGroup);
  this.visualIndexInStep++;
  break;
```

### AnimationQueue.ts

```typescript
// ✅ CORRECT: Delays configured
private readonly DELAYS = {
  captionLead: 700,      // Before customSVG
  afterCustomSVG: 1500,  // After customSVG
  betweenSteps: 1000,    // Between steps
  // ...
};

// ✅ CORRECT: Auto-start in enqueue
enqueue(actions: any[], section: any): void {
  // ... add to queue ...
  if (!this.isPlaying && !this.isPaused) {
    this.play(); // AUTO-START
  }
}

// ✅ CORRECT: Caption lead before customSVG
if (this.onActionStart) this.onActionStart(item.action, this.currentIndex);
if (item.action?.op === 'customSVG') {
  await this.wait(this.DELAYS.captionLead); // WAIT 700ms
}
```

## 🐛 Debugging Checklist

### 1. Check Renderer Availability

```javascript
// In browser console
console.log('Renderer:', window.sequentialRenderer);
```

**Expected**: Object with methods
**If undefined**: Check CanvasStage.tsx line with `(window as any).sequentialRenderer = ...`

### 2. Check Queue Status

```javascript
window.sequentialRenderer.animationQueue.getStatus()
```

**Expected**: `{ total: N, current: N, isPlaying: true/false }`
**If empty**: No actions enqueued yet

### 3. Check Transcript State

```javascript
const r = window.sequentialRenderer;
console.log({
  transcript: r.currentTranscript,
  sentences: r.transcriptSentences,
  visualIndex: r.visualIndexInStep
});
```

**Expected**: Transcript populated, sentences array has items
**If empty**: Chunk.transcript not passed or processChunk not called

### 4. Check Caption Element

```javascript
console.log('Caption:', window.sequentialRenderer.captionEl);
```

**Expected**: HTMLDivElement with content
**If null**: Caption not created yet or was removed

### 5. Monitor Action Processing

```javascript
// Wrap processAction to log timing
const original = window.sequentialRenderer.processAction.bind(window.sequentialRenderer);
window.sequentialRenderer.processAction = async function(action, section) {
  const start = Date.now();
  console.log(`▶️ START ${action.op} at ${start}`);
  const result = await original(action, section);
  console.log(`✅ END ${action.op} at ${Date.now()} (took ${Date.now() - start}ms)`);
  return result;
};
```

**Expected**: Times show gaps of 2000+ ms between customSVG actions
**If no gaps**: Delays not working or not awaited

### 6. Check Auto-scroll

```javascript
// Log scroll events
const container = window.sequentialRenderer.stage.container();
const scrollParent = container.parentElement;
console.log('Scroll parent:', scrollParent);
console.log('Current scrollTop:', scrollParent?.scrollTop);
console.log('scrollHeight:', scrollParent?.scrollHeight);
```

**Expected**: scrollTop changes as visuals appear
**If not**: Scroll parent might not exist or has wrong overflow setting

## 📈 Success Metrics

### Test Coverage Goals
- SequentialRenderer: >80%
- AnimationQueue: >80%
- Integration: All critical flows covered

### Performance Targets
- Visual gap: ≥2000ms (2 seconds)
- Caption display: ≥500ms before visual
- Step transition: <500ms
- Auto-scroll: <100ms latency

### User Experience Goals
- ✅ No manual play button needed
- ✅ Reading time for each caption
- ✅ Smooth scroll transitions
- ✅ All steps visible in one scroll
- ✅ Pause/resume works mid-playback

## 🚀 Next Steps

1. **Run quick validation**
   ```bash
   npx tsx src/__tests__/quick-validate.ts
   ```

2. **If logic tests pass**, browser test:
   - Load manual-debug.js in console
   - Run `debugSequentialRenderer.runAll()`

3. **If browser tests fail**, check:
   - Console errors
   - Network tab (chunk received?)
   - Element inspector (caption visible?)
   - Renderer state (diagnose())

4. **If all tests pass**, install Jest and run full suite

5. **Document findings** and fix any failing tests

## 📝 Report Format

After running tests, report should include:

```
✅/❌ Auto-start: [PASS/FAIL] - [Details]
✅/❌ Sequential timing: [PASS/FAIL] - Gap: Xms
✅/❌ Captions: [PASS/FAIL] - [Details]
✅/❌ Auto-scroll: [PASS/FAIL] - [Details]
✅/❌ Step transitions: [PASS/FAIL] - [Details]
✅/❌ Playback controls: [PASS/FAIL] - [Details]

Overall: X/6 tests passed
```

## 🎓 Learning Resources

- Jest documentation: https://jestjs.io/
- Testing Library: https://testing-library.com/
- Konva testing: https://konvajs.org/docs/testing/

## 📞 Support

If stuck:
1. Run `debugSequentialRenderer.diagnose()` in browser
2. Check console for errors
3. Verify chunk structure in Network tab
4. Review this document's debugging checklist
5. Check test files for expected behavior examples

---

**Created**: 2025-10-12
**Purpose**: Verify sequential rendering implementation
**Status**: Ready for testing
