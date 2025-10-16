# Canvas Controls - Testing Guide

## Quick Visual Test

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd app/backend
npm run dev

# Terminal 2 - Frontend  
cd app/frontend
npm run dev
```

### 2. Visual Checks (Before Starting Lecture)

**Canvas Container:**
- [ ] Canvas has green border (#00ff41)
- [ ] Canvas background is pure black
- [ ] Green glow effect around canvas
- [ ] Canvas is centered on page

**No Controls Visible Yet** (This is correct - controls appear when lecture starts)

### 3. Start a Lecture

**Input a topic** (e.g., "Quantum mechanics basics") and click **>>> START LECTURE**

### 4. Canvas Controls Appear

**Top-Left Toolbar:**
- [ ] AUTO button visible (green if active)
- [ ] MANUAL button visible
- [ ] NEXT button NOT visible (because AUTO is default)
- [ ] All buttons have green terminal styling
- [ ] Buttons are clickable

**Top-Right Tool Buttons:**
- [ ] Zoom Out button visible (magnifying glass with minus icon)
- [ ] Zoom In button visible (magnifying glass with plus icon)
- [ ] Pan button visible (arrows icon)
- [ ] Select button visible (cursor icon)
- [ ] All use SVG icons (NO EMOJIS)

**Bottom-Right:**
- [ ] Hand-raise button visible (raised hand icon)
- [ ] Green color with glow
- [ ] Circular shape
- [ ] No emoji, only SVG icon

### 5. Test Auto Mode (Default)

**Current State:**
- [ ] AUTO button is highlighted (green background)
- [ ] MANUAL button is not highlighted
- [ ] NEXT button is HIDDEN

**Behavior:**
- [ ] Lecture advances automatically after ~5 seconds
- [ ] Visuals render progressively
- [ ] No manual intervention needed

### 6. Switch to Manual Mode

**Click the MANUAL button**

**Visual Change:**
- [ ] MANUAL button becomes highlighted (green background)
- [ ] AUTO button loses highlight
- [ ] **NEXT → button APPEARS** to the right
- [ ] NEXT button has green terminal styling

**Behavior:**
- [ ] Lecture pauses after current step
- [ ] Nothing happens automatically
- [ ] Click NEXT → to see next visual
- [ ] Each click advances one step

### 7. Test Zoom Controls

**Click Zoom In (+):**
- [ ] Canvas content gets larger
- [ ] Can click multiple times
- [ ] Max zoom is 5x

**Click Zoom Out (-):**
- [ ] Canvas content gets smaller
- [ ] Can click multiple times
- [ ] Min zoom is 0.3x

**Use Ctrl+Wheel:**
- [ ] Scrolling up zooms in
- [ ] Scrolling down zooms out
- [ ] Zoom centers on mouse position

### 8. Test Tool Selection

**Click Pan Tool:**
- [ ] Button highlights (green background)
- [ ] Mouse cursor changes
- [ ] Can drag canvas around

**Click Select Tool:**
- [ ] Button highlights
- [ ] Returns to default selection mode

### 9. Test Hand Raise (Question Mode)

**Click Hand-Raise Button:**
- [ ] Button color changes to orange
- [ ] Button glows orange
- [ ] Pulsing animation starts
- [ ] Lecture pauses
- [ ] Pen drawing is enabled

**Draw on Canvas:**
- [ ] Can draw with mouse
- [ ] Lines appear in red
- [ ] Can circle/highlight areas

**Question Input:**
- [ ] Input box appears after drawing
- [ ] Can type question
- [ ] Submit button works

**Cancel/Exit:**
- [ ] Can cancel question mode
- [ ] Button returns to green
- [ ] Lecture can resume

### 10. Visual Quality Check

**All Icons:**
- [ ] Sharp and clear (SVG, not emoji)
- [ ] Consistent size
- [ ] Proper stroke width
- [ ] Inherit button color

**Terminal Theme:**
- [ ] All controls use #00ff41 green
- [ ] Black backgrounds
- [ ] Glow effects present
- [ ] Courier New font
- [ ] No purple/blue colors

**Positioning:**
- [ ] Controls stay in place during scrolling
- [ ] No overlapping elements
- [ ] Proper z-index layering
- [ ] Buttons are always clickable

## Common Issues & Solutions

### Controls Not Visible
**Check:**
- Canvas has started (submitted a query)
- Browser console for errors
- Z-index is 150 for controls

### NEXT Button Always Showing
**Fix:**
- Should only show in Manual mode
- Check mode state in toolbar

### Emojis Still Showing
**Clear cache:**
```bash
# In frontend directory
rm -rf dist node_modules/.vite
npm run dev
```

### Zoom Not Working
**Check:**
- Console for stage errors
- Stage ref is initialized
- Scale limits (0.3x to 5x)

### Hand Raise Not Working
**Check:**
- Lecture is playing
- Not already in question mode
- Canvas is rendered

## Success Criteria

✅ **All controls visible and positioned correctly**
✅ **All icons are SVG (no emojis)**
✅ **NEXT button conditional on Manual mode**
✅ **Zoom in/out works (buttons and Ctrl+Wheel)**
✅ **Auto/Manual mode switching works**
✅ **Hand-raise enables question mode**
✅ **Terminal green theme throughout**
✅ **No visual glitches or overlaps**

## Screenshots to Verify

Take screenshots of:
1. **Auto Mode**: Toolbar showing AUTO/MANUAL only
2. **Manual Mode**: Toolbar showing AUTO/MANUAL/NEXT
3. **All Icons**: Close-up of toolbar icons (should be crisp SVG)
4. **Hand Raise**: Green state and orange active state
5. **Zoomed Canvas**: Verify zoom works both directions

## Performance Check

- [ ] Controls respond immediately to clicks
- [ ] No lag when switching modes
- [ ] Smooth zoom animations
- [ ] Hand-raise activates instantly
- [ ] No console errors

---

**If all checks pass, the controls are working correctly! 🎉**
