# Sequential Renderer Testing Suite

## Overview

This directory contains comprehensive tests to verify the sequential rendering functionality, including:

- **Caption generation** - Ensures transcript is split into sentences and shown per-visual
- **Auto-start playback** - Verifies rendering starts automatically without manual play button
- **Sequential timing** - Tests that visuals appear one-by-one with proper gaps
- **Auto-scroll** - Confirms viewport scrolls to active visual
- **Step transitions** - Validates state resets between steps
- **Playback controls** - Tests pause/resume/next/previous functionality

## Test Files

### 1. `SequentialRenderer.test.ts`
Unit tests for SequentialRenderer class:
- Sentence splitting logic
- Caption element creation
- Transcript state management
- Visual index tracking
- Public API methods

### 2. `AnimationQueue.test.ts`
Unit tests for AnimationQueue class:
- Sequential playback
- Timing and delays
- Callbacks (onStepComplete, onProgress, onActionStart, onActionComplete)
- Pause/resume functionality
- Error handling
- Step transitions

### 3. `integration.test.ts`
Integration tests for complete flow:
- Auto-start verification
- Sequential timing (visuals should be 2+ seconds apart)
- Caption appearance before visuals
- Auto-scroll behavior
- Step state reset
- Multi-step rendering

### 4. `manual-debug.js`
Browser console debugging tools for real-time testing

## Setup

### Install Testing Dependencies

```bash
cd /home/komail/LEAF/Learn-X/app/frontend

# Install Jest and related packages
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jsdom canvas
```

### Create Jest Configuration

Create `jest.config.js` in the frontend directory:

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true
      }
    }
  }
};
```

### Update package.json

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:renderer": "jest SequentialRenderer.test.ts",
    "test:queue": "jest AnimationQueue.test.ts",
    "test:integration": "jest integration.test.ts"
  }
}
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suite
```bash
npm run test:renderer    # Only SequentialRenderer tests
npm run test:queue       # Only AnimationQueue tests
npm run test:integration # Only integration tests
```

### Watch Mode (re-run on file changes)
```bash
npm run test:watch
```

### With Coverage Report
```bash
npm run test:coverage
```

## Manual Browser Testing

For real-time debugging in the browser:

1. **Start the frontend**
   ```bash
   npm run dev
   ```

2. **Open browser DevTools** (F12)

3. **Load the debug script**
   - Copy content from `manual-debug.js`
   - Paste into browser console
   - Press Enter

4. **Run diagnostic**
   ```javascript
   debugSequentialRenderer.diagnose()
   ```

5. **Run specific tests**
   ```javascript
   debugSequentialRenderer.testAutoStart()
   debugSequentialRenderer.testSequentialTiming()
   debugSequentialRenderer.testCaptions()
   debugSequentialRenderer.testAutoScroll()
   debugSequentialRenderer.testStepTransitions()
   debugSequentialRenderer.testPlaybackControls()
   ```

6. **Run all tests**
   ```javascript
   debugSequentialRenderer.runAll()
   ```

## Expected Results

### ✅ PASSING Tests Should Show:

1. **Auto-start**: `isPlaying: true` after processChunk()
2. **Sequential timing**: Visuals appear ≥2000ms apart
3. **Captions**: Caption element exists before each visual
4. **Auto-scroll**: `scrollTop` increases when visual appears
5. **Step transitions**: `visualIndexInStep` resets to 0 on new step
6. **Playback controls**: Pause stops progression, resume continues

### ❌ FAILING Tests Indicate:

1. **"Auto-start not working"**
   - Fix: Check `AnimationQueue.enqueue()` calls `play()`
   - Check: `SequentialRenderer.enqueueActions()` triggers queue

2. **"Gap too short"**
   - Fix: Adjust `DELAYS` in `AnimationQueue.ts`:
     - `captionLead: 700ms`
     - `afterCustomSVG: 1500ms`

3. **"No caption element found"**
   - Fix: Check `showCaptionForVisual()` is called before `renderCompleteSVG()`
   - Check: `splitSentences()` returns non-empty array

4. **"No scroll detected"**
   - Fix: Check `showCaptionForVisual()` and `renderCompleteSVG()` both set `scrollTop`
   - Check: Container has `overflow: auto` and proper height

5. **"Visual index not reset"**
   - Fix: Check `processChunk()` resets `visualIndexInStep = 0` on step change

6. **"Pause not working"**
   - Fix: Check `AnimationQueue.pause()` sets `isPaused = true`
   - Check: Play loop respects `isPaused` flag

## Debugging Tips

### Enable Verbose Logging

In browser console:
```javascript
localStorage.setItem('DEBUG', 'true');
```

Then reload the page. All console.log statements will show timing and state info.

### Check AnimationQueue State

```javascript
window.sequentialRenderer.animationQueue.getStatus()
// Returns: { total, current, isPlaying }
```

### Inspect Internal State

```javascript
const r = window.sequentialRenderer;
console.log({
  stepId: r.currentStepId,
  visualIndex: r.visualIndexInStep,
  transcriptSentences: r.transcriptSentences.length,
  verticalOffset: r.verticalOffset,
  captionExists: !!r.captionEl
});
```

### Monitor Action Processing

```javascript
const original = window.sequentialRenderer.processAction.bind(window.sequentialRenderer);
window.sequentialRenderer.processAction = async function(action, section) {
  console.log(`⏱️ [${Date.now()}] Processing: ${action.op}`);
  const result = await original(action, section);
  console.log(`✅ [${Date.now()}] Completed: ${action.op}`);
  return result;
};
```

## Common Issues & Fixes

### Issue: Tests fail with "sequentialRenderer not found"
**Fix**: Ensure `CanvasStage.tsx` exposes renderer:
```typescript
(window as any).sequentialRenderer = sequentialRendererRef.current;
```

### Issue: Visuals still appear all at once
**Fix**: Check these in order:
1. `AnimationQueue` is playing sequentially (not parallel)
2. `captionLead` and `afterCustomSVG` delays are sufficient
3. `showCaptionForVisual()` is called before SVG render
4. Each action awaits completion before next starts

### Issue: Captions don't show
**Fix**: 
1. Verify transcript is passed in chunk
2. Check `splitSentences()` returns non-empty array
3. Ensure `showCaptionForVisual()` creates and appends DOM element
4. Check CSS - caption might be hidden or off-screen

### Issue: Auto-scroll doesn't work
**Fix**:
1. Verify scroll container exists and has `overflow: auto`
2. Check `scrollParent.scrollTop = ...` is being set
3. Ensure caption/visual positions are correct
4. Try manual scroll in console: `document.querySelector('.scroll-container').scrollTop = 500`

## Performance Benchmarks

Expected timings for a 4-visual step:

```
Caption 1 appears:     0ms
Visual 1 renders:      700ms (captionLead)
Caption 2 appears:     2200ms (700 + 1500 afterCustomSVG)
Visual 2 renders:      2900ms
Caption 3 appears:     4400ms
Visual 3 renders:      5100ms
Caption 4 appears:     6600ms
Visual 4 renders:      7300ms
Total step time:       ~9 seconds
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Run tests** to ensure they fail appropriately
3. **Implement feature**
4. **Run tests** to verify they pass
5. **Add browser test** in `manual-debug.js` for visual verification

## Support

If tests are failing and you can't identify the issue:

1. Run `debugSequentialRenderer.diagnose()` in browser console
2. Check browser DevTools Console for error messages
3. Review Network tab for failed requests
4. Inspect Elements tab to verify DOM structure
5. Use React DevTools to check component state

## Test Coverage Goals

- **SequentialRenderer**: >80% coverage
- **AnimationQueue**: >80% coverage
- **Integration**: All critical user flows tested

Current coverage: Run `npm run test:coverage` to see report.
