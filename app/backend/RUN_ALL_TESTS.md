# TTS System - Complete Test Suite

## 🎯 Test Suite Overview

Three comprehensive test suites to validate the complete TTS integration:

1. **TTS Basic Test** - Verifies TTS service connection and audio synthesis
2. **Synchronization Test** - Validates timing, delays, and sequencing
3. **End-to-End Test** - Full flow from visual generation to audio emission

---

## ✅ Quick Start - Run All Tests

```bash
cd /home/komail/LEAF/Learn-X/app/backend

# Run ALL TTS tests (recommended)
npm run test:tts:all
```

This will run:
1. TTS basic test (~10s)
2. Synchronization test (~30s)  
3. End-to-end integration test (~60s)

**Total time**: ~2 minutes

---

## 📊 Individual Tests

### Test 1: TTS Basic Test

**Purpose**: Verify TTS service works correctly

**Run**:
```bash
npm run test:tts
```

**What it tests**:
- ✅ TTS service availability
- ✅ Simple text synthesis
- ✅ Educational content synthesis
- ✅ Audio file saving
- ✅ Batch synthesis (5 narrations)
- ✅ Configuration loading

**Expected output**:
```
TTS SERVICE CONNECTION TEST
══════════════════════════════════════════════════════════════════════
✅ TTS Service Available: YES
✅ Synthesis successful in 1234ms
✅ File saved successfully
✅ Batch synthesis successful
✅ ALL TTS TESTS PASSED
```

**Duration**: ~10 seconds

---

### Test 2: Synchronization Test

**Purpose**: Verify rendering waits for narration + animation + delay

**Run**:
```bash
npm run test:tts:sync
```

**What it tests**:
- ✅ Waits for animation to complete
- ✅ Waits for narration audio to complete  
- ✅ Takes longer of the two (max wait)
- ✅ Applies inter-visual delay (2 seconds)
- ✅ No early transitions between visuals
- ✅ Complete step sequencing

**Expected output**:
```
TTS SYNCHRONIZATION TESTS
══════════════════════════════════════════════════════════════════════

TEST 1: Synchronization Timing
✅ PASS: Animation (5s) > Narration (3s) → Wait 5s + 2s = 7s
✅ PASS: Animation (2s) < Narration (5s) → Wait 5s + 2s = 7s

TEST 2: No Early Transitions
✅ PASS: Proper wait enforced
✅ PASS: No early transition detected

TEST 3: Inter-Visual Delay
✅ PASS: All visuals have inter-visual delay

TEST 4: Complete Step Sequence
✅ PASS: Timing correct (5 visuals sequenced properly)

TEST 5: Real TTS Integration
✅ PASS: Playback respects audio durations

✅ ALL SYNCHRONIZATION TESTS PASSED
```

**Duration**: ~30 seconds

---

### Test 3: End-to-End Integration Test

**Purpose**: Test complete flow from visual generation to audio emission

**Run**:
```bash
npm run test:tts:e2e
```

**What it tests**:
- ✅ Visual generation (notes + 4 animations)
- ✅ Text narration generation (batch)
- ✅ TTS audio synthesis (5 narrations)
- ✅ Audio file creation
- ✅ Event data structure validation
- ✅ TTS configuration validation
- ✅ Complete orchestrator flow

**Expected output**:
```
TTS END-TO-END INTEGRATION TEST
══════════════════════════════════════════════════════════════════════

PHASE 1: Visual Generation
✅ Notes generated
✅ Animations 1-4 generated

PHASE 2: Narration + Audio Generation
✅ 5 narrations generated
✅ Audio files created
✅ Base64 audio embedded

VALIDATION:
✅ Event data structure: VALID
✅ TTS configuration: VALID
✅ Audio files: ALL EXIST

✅ E2E INTEGRATION: FULLY WORKING
✅ Ready for frontend integration
✅ No bugs detected
```

**Duration**: ~60 seconds (includes actual visual and audio generation)

---

## 🎯 What Gets Validated

### Core Functionality ✅
- [x] TTS service connects to Google Cloud TTS API
- [x] Text can be synthesized to audio (MP3)
- [x] Audio files are created and saved
- [x] Base64 audio embedding works
- [x] Batch synthesis processes multiple narrations

### Synchronization ✅
- [x] Waits for animation to complete
- [x] Waits for narration audio to complete
- [x] Takes the longer of the two (no early transitions)
- [x] Applies 2-second inter-visual delay after both complete
- [x] Sequences all visuals properly
- [x] No race conditions or timing bugs

### Integration ✅
- [x] Orchestrator generates visuals correctly
- [x] Narration generation works with real visuals
- [x] TTS synthesis creates audio for each narration
- [x] Event data structure is correct
- [x] TTS config is included in emitted events
- [x] Audio files are accessible via HTTP endpoint

### Data Structure ✅
- [x] `narration.narrations[]` array is populated
- [x] Each narration has `audioBase64`, `audioUrl`, `duration`
- [x] `ttsConfig` includes `interVisualDelay`, `waitForNarration`, `waitForAnimation`
- [x] Metadata includes audio size and duration
- [x] All required fields are present

---

## 📊 Expected Test Results Summary

```
Test Suite Results:

✅ TTS Basic Test
   - 6/6 tests passed
   - Duration: 10s
   - Audio synthesis: WORKING
   
✅ Synchronization Test
   - 5/5 tests passed
   - Duration: 30s
   - Timing logic: CORRECT
   - No early transitions: VERIFIED
   
✅ End-to-End Test
   - Integration: COMPLETE
   - Duration: 60s
   - Visual generation: WORKING
   - Audio generation: WORKING
   - Event emission: WORKING

OVERALL: ✅ ALL TESTS PASSED
```

---

## 🐛 If Tests Fail

### TTS Basic Test Fails

**Error**: "TTS service not available"
```bash
# Check .env configuration
cat .env | grep TTS_

# Should see:
# TTS_ENABLED=true
# GOOGLE_CLOUD_TTS_API_KEY=AQ.Ab8RN6J5qi3zpeJkLkQAHSn0iw0Y0EsrOacNS4-kFOkNmj6R8Q
```

**Error**: "Synthesis failed"
```bash
# Test API key manually
curl -H "x-goog-api-key: YOUR_KEY" \
  https://texttospeech.googleapis.com/v1/voices
```

### Synchronization Test Fails

**Error**: "Timing incorrect"
- Check that inter-visual delay is set correctly
- Verify `getInterVisualDelay()` returns expected value
- Review timing logic in test output

**Error**: "Early transition detected"
- This means the synchronization logic has a bug
- Review `simulateVisualPlayback()` function
- Ensure `Promise.all()` is used correctly

### End-to-End Test Fails

**Error**: "Generation unsuccessful"
- Check Gemini API key is valid
- Verify visual generation is working
- Check narration generation logs

**Error**: "Audio files missing"
- Check audio-output directory exists
- Verify TTS service is generating files
- Check file permissions

---

## 🎮 Manual Verification

After tests pass, manually verify:

```bash
# 1. Check audio files were created
ls -lh audio-output/
# Should see: step-1-visual-0-*.mp3, etc.

# 2. Play an audio file (if you have audio player)
mpg123 audio-output/step-1-visual-0-*.mp3

# 3. Check audio file size (should be 30-60 KB each)
du -h audio-output/*.mp3

# 4. Count total audio files (should be 5 per test run)
ls audio-output/*.mp3 | wc -l
```

---

## 📈 Performance Benchmarks

Expected performance (from tests):

```
Visual Generation:
├─ Notes: 3-5s
├─ Animation 1-4: 5-8s (parallel)
└─ Total: 8-10s

Narration + TTS:
├─ Text generation: 3-5s (batch)
├─ TTS synthesis: 5-10s (5 narrations)
└─ Total: 8-15s

Complete Step:
├─ Visuals: 8-10s
├─ Audio: 8-15s
└─ Total: 16-25s

Synchronization Overhead:
├─ Inter-visual delay: 2s × 5 = 10s
├─ Total playback: 60-100s
└─ (depends on narration audio duration)
```

---

## ✅ Success Criteria

All tests should pass with:

### TTS Basic Test
- ✅ Service available
- ✅ Audio synthesis working
- ✅ Files created successfully
- ✅ Batch processing working

### Synchronization Test
- ✅ All timing tests pass
- ✅ No early transitions
- ✅ Inter-visual delay applied
- ✅ Complete sequences work

### End-to-End Test
- ✅ Visuals generate correctly
- ✅ Narrations generate correctly
- ✅ Audio files created
- ✅ Event data structure valid
- ✅ No errors or exceptions

---

## 🚀 Next Steps After Tests Pass

1. **Start backend with TTS**:
   ```bash
   npm run dev
   ```

2. **Verify startup logs**:
   ```
   ✅ TTS service initialized
   ✅ TTS connection test successful
   ```

3. **Generate a learning session**:
   ```bash
   curl -X POST http://localhost:8000/api/query \
     -H "Content-Type: application/json" \
     -d '{"query": "Neural Networks", "sessionId": "test123"}'
   ```

4. **Check backend logs** for:
   ```
   [AudioNarration] Generated 5 narrations
   [stepVisuals] ✅ NARRATIONS generated: 5 narrations (95s total, with audio, 0.24MB)
   ```

5. **Integrate with frontend** using guides:
   - See `TTS_INTEGRATION_GUIDE.md`
   - Implement audio playback
   - Add synchronization logic

---

## 📞 Support

### Test Failures
- Check `.env` configuration
- Verify API keys are valid
- Review error messages in output
- Check test logs for details

### Integration Issues
- See `TTS_INTEGRATION_GUIDE.md`
- Review `TTS_IMPLEMENTATION_SUMMARY.md`
- Check backend logs
- Verify event data structure

---

## ✨ Summary

**Test Command**: `npm run test:tts:all`

**Duration**: ~2 minutes

**Coverage**:
- TTS service: ✅
- Audio synthesis: ✅
- Synchronization: ✅
- Integration: ✅
- Event structure: ✅

**Status**: All tests passing = System ready for production!

