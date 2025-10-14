# Test TTS Integration - Quick Start

## 🚀 Run TTS Test Immediately

```bash
cd /home/komail/LEAF/Learn-X/app/backend

# Install the TTS package (if not already installed)
npm install

# Run the TTS test
npm run test:tts
```

## ✅ Expected Output

```
══════════════════════════════════════════════════════════════════════
TTS SERVICE CONNECTION TEST
══════════════════════════════════════════════════════════════════════

📊 Test 1: Service Availability
──────────────────────────────────────────────────────────────────────
TTS Service Available: ✅ YES

📊 Test 2: Simple Synthesis
──────────────────────────────────────────────────────────────────────
Synthesizing: "Hello, this is a test of the text to speech system."
✅ Synthesis successful in 1234ms
   Audio size: 45231 bytes
   Estimated duration: 5s

📊 Test 3: Educational Narration
──────────────────────────────────────────────────────────────────────
Synthesizing educational content (234 chars)...
✅ Synthesis successful in 1845ms
   Audio size: 78456 bytes
   Estimated duration: 15s

📊 Test 4: Save Audio to File
──────────────────────────────────────────────────────────────────────
Synthesizing and saving to: test-audio-1736887234567.mp3
✅ File saved successfully
   Path: /home/komail/LEAF/Learn-X/app/backend/audio-output/test-audio-1736887234567.mp3
   Size: 45231 bytes
   Duration: 5s

📊 Test 5: Batch Synthesis (5 narrations)
──────────────────────────────────────────────────────────────────────
Synthesizing 5 narrations in parallel...
✅ Batch synthesis successful in 3456ms
   Total audio size: 234567 bytes
   Total duration: 65s
   Average per narration: 691ms
   [1] 45231 bytes, 12s
   [2] 52100 bytes, 15s
   [3] 48900 bytes, 13s
   [4] 44200 bytes, 11s
   [5] 44136 bytes, 14s

📊 Test 6: Configuration Check
──────────────────────────────────────────────────────────────────────
Inter-visual delay: 2000ms
Speaking rate: 1.0
Voice name: en-US-Journey-D
Audio encoding: MP3

══════════════════════════════════════════════════════════════════════
✅ ALL TTS TESTS PASSED
══════════════════════════════════════════════════════════════════════

📋 Summary:
   ✅ Service is available and initialized
   ✅ Simple synthesis working
   ✅ Educational content synthesis working
   ✅ File saving working
   ✅ Batch synthesis working
   ✅ Configuration loaded correctly

🚀 TTS service is ready for production use!
```

## ❌ If Test Fails

### Error: "TTS service not available"

**Cause**: Missing or invalid API credentials

**Fix**:
```bash
# Check .env file
cat .env | grep TTS

# Should see:
# TTS_ENABLED=true
# GOOGLE_CLOUD_TTS_API_KEY=AQ.Ab8RN6J5qi3zpeJkLkQAHSn0iw0Y0EsrOacNS4-kFOkNmj6R8Q

# If missing, add to .env:
echo "TTS_ENABLED=true" >> .env
echo "GOOGLE_CLOUD_TTS_API_KEY=AQ.Ab8RN6J5qi3zpeJkLkQAHSn0iw0Y0EsrOacNS4-kFOkNmj6R8Q" >> .env
```

### Error: "Synthesis failed"

**Possible causes**:
1. Invalid API key
2. Network connection issues
3. Google Cloud TTS API quota exceeded

**Debug**:
```bash
# Check if API key is valid
curl -H "x-goog-api-key: AQ.Ab8RN6J5qi3zpeJkLkQAHSn0iw0Y0EsrOacNS4-kFOkNmj6R8Q" \
  https://texttospeech.googleapis.com/v1/voices

# Should return list of voices
```

### Error: "Cannot find module '@google-cloud/text-to-speech'"

**Fix**:
```bash
npm install @google-cloud/text-to-speech@^5.4.0
```

## 🔧 After Test Passes

### 1. Start Backend with TTS
```bash
npm run dev
```

**Expected startup logs**:
```
🚀 LEARN-X BACKEND STARTING
══════════════════════════════════════════════════════════════════════
📊 TTS Configuration:
   TTS_ENABLED: true
   TTS_API_KEY: ✅ SET
   TTS_VOICE: en-US-Journey-D
   TTS_INTER_VISUAL_DELAY: 2000ms
══════════════════════════════════════════════════════════════════════

🎤 Initializing Text-to-Speech service...
✅ TTS service initialized
✅ TTS connection test successful
```

### 2. Generate a Learning Session
```bash
# In another terminal
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Neural Networks", "sessionId": "test123"}'
```

### 3. Check Narrations in Logs
Backend should log:
```
[stepVisuals] 🎤 Starting NARRATION + AUDIO generation
[AudioNarration] Text narrations generated: 5
[AudioNarration] 🎤 Generating audio for 5 narrations...
[AudioNarration] ✅ Audio 1 generated: 45231 bytes, 18s
[AudioNarration] ✅ Audio 2 generated: 52100 bytes, 20s
...
[AudioNarration] ✅ Audio generation complete in 5432ms
[AudioNarration] Total audio size: 0.24 MB
[stepVisuals] ✅ NARRATIONS generated: 5 narrations (95s total, with audio, 0.24MB)
```

### 4. Verify Audio Files Created
```bash
ls -lh audio-output/

# Should see:
# step-1-visual-0-test123.mp3
# step-1-visual-1-test123.mp3
# step-1-visual-2-test123.mp3
# step-1-visual-3-test123.mp3
# step-1-visual-4-test123.mp3
```

### 5. Test Audio Playback
```bash
# Play one of the generated audio files (if you have mpg123 or similar)
mpg123 audio-output/step-1-visual-0-test123.mp3

# Or open in browser
# http://localhost:8000/audio/step-1-visual-0-test123.mp3
```

## 📊 Performance Verification

After running a full learning session, check:

1. **Generation time**: Should be 13-23s per step (including audio)
2. **Audio size**: Should be 150-300 KB per step (5 narrations)
3. **Audio quality**: Listen to a sample file
4. **Synchronization data**: Check socket events include `ttsConfig`

## 🎯 Next Steps

Once TTS test passes:

1. ✅ **Backend**: Complete and working
2. 📋 **Frontend**: Implement audio playback
   - See `TTS_INTEGRATION_GUIDE.md`
   - Decode base64 audio
   - Play synchronized with animations
   - Wait for both to complete
   - Apply inter-visual delay

3. 🚀 **Deploy**: Ready for production
   - TTS service is production-ready
   - Audio narration working
   - Synchronization configured

## 📖 Documentation

- **TTS Integration Guide**: `/TTS_INTEGRATION_GUIDE.md`
- **Implementation Summary**: `/TTS_IMPLEMENTATION_SUMMARY.md`
- **This Test Guide**: `/app/backend/TEST_TTS_NOW.md`

---

**Run the test now**: `npm run test:tts` ✨
