# Interactive Canvas UI - Test Plan

## Manual Testing Checklist

### ✅ Phase 1: Basic Functionality

#### Hand Raise Button
- [ ] Button visible at bottom-right (70x70px green circle)
- [ ] Click toggles to orange with pulse animation
- [ ] Playback pauses when activated
- [ ] Screenshot captured automatically
- [ ] Cursor changes to crosshair
- [ ] Toolbar becomes disabled
- [ ] Click again cancels question mode

#### Pen Drawing
- [ ] Mouse draws orange strokes
- [ ] Multiple strokes supported
- [ ] Strokes visible and smooth
- [ ] Works with touch on mobile
- [ ] Drawings persist until submission/cancel
- [ ] Crosshair cursor active throughout

#### Input Field Appearance
- [ ] **CRITICAL**: Input appears IMMEDIATELY after drawing
- [ ] Positioned near drawing (above by default)
- [ ] Stays within canvas bounds
- [ ] Auto-focuses for typing
- [ ] Shows "Ask about this visual" prompt
- [ ] Has "Cancel", "Mark More", and "Ask" buttons

#### Continue Marking
- [ ] "Mark More" button visible
- [ ] Click hides input but keeps pen active
- [ ] Can draw additional marks
- [ ] Input reappears after new drawing
- [ ] Previous marks remain visible

### ✅ Phase 2: Submission Flow

#### Question Submission
- [ ] Type question in input field
- [ ] Press Enter OR click "Ask" button
- [ ] Loading spinner appears
- [ ] "Ask" button disabled during loading
- [ ] Screenshot captured with all drawings
- [ ] Request sent to `/api/clarify`
- [ ] Payload includes: question, screenshot, stepContext

#### Backend Processing
- [ ] Request received at backend
- [ ] Step context correctly extracted
- [ ] Gemini API called with multimodal input
- [ ] Clarification generated (10-15 SVG ops)
- [ ] Socket event emitted to frontend

#### Clarification Display
- [ ] Frontend receives clarification event
- [ ] SVG visual inserted at correct location
- [ ] Drawings cleared automatically
- [ ] Question mode exits
- [ ] Playback resumes
- [ ] No visual artifacts

### ✅ Phase 3: Toolbar & Controls

#### Sticky Toolbar
- [ ] **CRITICAL**: Toolbar ALWAYS visible at top
- [ ] Does NOT scroll away with canvas
- [ ] Remains during question mode (disabled)
- [ ] Zoom buttons functional
- [ ] AUTO/MANUAL/NEXT buttons work
- [ ] Tool selection works (pan, select)

#### Zoom Controls
- [ ] Zoom In button increases scale
- [ ] Zoom Out button decreases scale
- [ ] Ctrl+Wheel also zooms
- [ ] Zoom persists during question mode
- [ ] Canvas content scales properly

### ✅ Phase 4: Edge Cases

#### Error Handling
- [ ] Backend error shows alert message
- [ ] Network timeout handled gracefully
- [ ] Invalid screenshot doesn't crash
- [ ] Empty question shows appropriate feedback
- [ ] Missing session ID handled

#### State Management
- [ ] Step context preserved during question
- [ ] Multiple questions in same session work
- [ ] Question during step transition handled
- [ ] Cancel clears all state properly
- [ ] Resume works after clarification

#### UI Consistency
- [ ] Hand button always visible (not hidden by scroll)
- [ ] Input position correct at all scroll positions
- [ ] Drawings don't interfere with rendering
- [ ] No memory leaks after multiple uses
- [ ] Event listeners cleaned up properly

### ✅ Phase 5: Performance

#### Rendering Performance
- [ ] Drawing maintains 60fps
- [ ] No lag during pen strokes
- [ ] Screenshot capture < 500ms
- [ ] Clarification renders smoothly
- [ ] No janky animations

#### Memory Usage
- [ ] Drawing layers destroyed on exit
- [ ] Screenshots garbage collected
- [ ] No growing memory over time
- [ ] Konva layers properly managed

## Automated Test Plan

### Unit Tests (`interactive-ui.test.ts`)
```bash
cd app/frontend
npm test -- interactive-ui.test.ts
```

**Coverage**:
- Hand raise toggle logic
- Pen drawing bounds calculation
- Input field positioning
- Submission payload generation
- State cleanup on cancel

### Stress Tests (`interactive-stress.test.ts`)
```bash
cd app/frontend
npm test -- interactive-stress.test.ts
```

**Coverage**:
- Rapid hand raise toggles (10x in 1s)
- Large canvas with 100+ strokes
- Multiple concurrent operations
- Memory leak detection
- Event listener cleanup verification

## Integration Test Scenarios

### Scenario 1: Happy Path
1. Start lecture on "Quantum Mechanics"
2. Wait for first step to render
3. Click hand raise button
4. Draw circle around confusing diagram
5. Input appears → Type "Why is this wave function complex?"
6. Submit question
7. Wait for clarification
8. Verify SVG visual appears contextually
9. Verify playback resumes

### Scenario 2: Multiple Marks
1. Click hand raise
2. Draw first mark
3. Input appears
4. Click "Mark More"
5. Draw second mark
6. Input reappears
7. Type question
8. Submit
9. Verify both marks visible in screenshot

### Scenario 3: Cancel Flow
1. Click hand raise
2. Draw marks
3. Input appears
4. Click "Cancel"
5. Verify all cleaned up
6. Verify playback resumes
7. No visual artifacts

### Scenario 4: Scroll Test
1. Start long lecture (5 steps)
2. Scroll down to step 3
3. Click hand raise
4. Verify toolbar still at top
5. Draw mark
6. Verify input appears correctly positioned
7. Submit question
8. Verify clarification at correct location

## Performance Benchmarks

### Target Metrics
- **Drawing FPS**: ≥ 55 fps
- **Screenshot Capture**: < 500ms
- **Input Appearance**: < 100ms after drawing
- **Clarification Time**: < 5s (backend processing)
- **Memory Growth**: < 50MB over 10 questions

### Measurement Tools
```javascript
// FPS measurement
performance.mark('draw-start');
// ... drawing code ...
performance.mark('draw-end');
performance.measure('drawing', 'draw-start', 'draw-end');

// Memory measurement
console.log(performance.memory.usedJSHeapSize);
```

## Browser Compatibility

Test on:
- [ ] Chrome 120+ (primary)
- [ ] Firefox 120+
- [ ] Safari 17+
- [ ] Edge 120+
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

## Known Issues to Monitor

1. **Sticky positioning**: May behave differently in Safari
2. **Touch events**: Need separate handling for mobile
3. **High DPI screenshots**: Large memory footprint
4. **Rapid toggles**: Potential race conditions

## Success Criteria

### Must Pass
✅ Toolbar always visible (sticky)
✅ Input appears immediately after drawing
✅ Question submitted with correct context
✅ Clarification renders without errors
✅ No memory leaks over 10 questions
✅ All cleanup on cancel/submit

### Nice to Have
- Sub-100ms input appearance
- < 3s clarification response
- Touch gesture support
- Undo/redo for drawings

## Test Execution Log

```
Date: _______
Tester: _______

Phase 1 (Basic): ___/28 passed
Phase 2 (Submission): ___/11 passed
Phase 3 (Toolbar): ___/10 passed
Phase 4 (Edge Cases): ___/13 passed
Phase 5 (Performance): ___/5 passed

TOTAL: ___/67 passed

Critical Issues: _______
Minor Issues: _______
Blockers: _______
```

## Debug Checklist

If something doesn't work:

1. **Input not appearing?**
   - Check console for "Drawing complete, triggering callback"
   - Verify `questionInputVisible` state is true
   - Check bounds calculation in console
   - Inspect position calculation

2. **Toolbar scrolling away?**
   - Verify `position: sticky` in styles
   - Check `marginTop: -${size.h}px` applied
   - Test with different canvas heights

3. **Clarification not showing?**
   - Check socket connection
   - Verify `/api/clarify` response
   - Look for 'clarification' event in console
   - Check stepContext is correct

4. **Memory growing?**
   - Verify drawing layer destruction
   - Check event listener cleanup
   - Monitor Konva layer count
   - Use Chrome DevTools memory profiler
