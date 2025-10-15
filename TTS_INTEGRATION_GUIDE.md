# Text-to-Speech Integration Guide

## 🎯 Overview

The backend now generates **audio narration** for every visual (notes + animations) and sends it to the frontend with **synchronization requirements**.

**Key Principle**: The frontend **MUST NOT** render the next visual until:
1. ✅ Current animation has completely finished rendering
2. ✅ Current narration audio has completely finished playing
3. ✅ Inter-visual delay (2 seconds) has elapsed

## 📊 Architecture

```
Backend Flow:
┌───────────────────────────────────────────────────────┐
│ 1. Generate Visuals (Parallel)                        │
│    - Notes SVG                                         │
│    - Animation 1-4                                     │
└────────────┬──────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────────────────┐
│ 2. Generate Text Narrations (Batch - 1 API call)      │
│    - 5 narrations (1 notes + 4 animations)            │
└────────────┬──────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────────────────┐
│ 3. Generate Audio Files (TTS)                          │
│    - Convert each narration to MP3                     │
│    - Save to audio-output/ directory                   │
│    - Encode as base64 for embedding                    │
└────────────┬──────────────────────────────────────────┘
             │
             ▼
┌───────────────────────────────────────────────────────┐
│ 4. Emit to Frontend                                    │
│    - Actions (visual operations)                       │
│    - Narrations (text + audio + timing)                │
│    - TTS Config (synchronization rules)                │
└───────────────────────────────────────────────────────┘
```

## 📦 Data Structure

### Socket Event: `rendered`

```typescript
socket.on('rendered', (data) => {
  console.log(data);
  // {
  //   type: 'actions',
  //   stepId: 1,
  //   actions: [...visual operations...],
  //   narration: {
  //     stepId: 1,
  //     topic: "Deep Learning",
  //     subtopic: "Neural Networks",
  //     narrations: [
  //       {
  //         visualNumber: 0,
  //         type: 'notes',
  //         narration: "Let's explore neural networks...",
  //         duration: 18,
  //         audioBase64: "//uQx...", // MP3 audio as base64
  //         audioUrl: "/audio/step-1-visual-0-abc123.mp3",
  //         audioSize: 45231 // bytes
  //       },
  //       {
  //         visualNumber: 1,
  //         type: 'animation',
  //         narration: "Now watch as the input layer...",
  //         duration: 20,
  //         audioBase64: "//uQx...",
  //         audioUrl: "/audio/step-1-visual-1-abc123.mp3",
  //         audioSize: 52100
  //       },
  //       // ... visuals 2, 3, 4
  //     ],
  //     hasAudio: true,
  //     totalDuration: 95, // seconds
  //     totalAudioSize: 1243567 // bytes
  //   },
  //   ttsConfig: {
  //     enabled: true,
  //     interVisualDelay: 2000, // ms to wait AFTER narration ends
  //     waitForNarration: true, // MUST wait for narration to finish
  //     waitForAnimation: true // MUST wait for animation to finish
  //   }
  // }
});
```

## 🔧 Frontend Implementation

### Required Behavior

```typescript
class VisualPlayer {
  private currentVisualIndex = 0;
  private isAnimationComplete = false;
  private isNarrationComplete = false;
  private narrations: AudioNarration[];
  private ttsConfig: TTSConfig;
  
  async playStep(stepData) {
    this.narrations = stepData.narration?.narrations || [];
    this.ttsConfig = stepData.ttsConfig;
    
    // Play visuals sequentially
    for (let i = 0; i < stepData.actions.length; i++) {
      await this.playVisual(i, stepData.actions[i]);
    }
  }
  
  async playVisual(visualNumber: number, actions) {
    console.log(`Starting visual ${visualNumber}`);
    
    // Reset completion flags
    this.isAnimationComplete = false;
    this.isNarrationComplete = false;
    
    // Start animation (in parallel with narration)
    const animationPromise = this.renderAnimation(actions).then(() => {
      this.isAnimationComplete = true;
      console.log(`Animation ${visualNumber} complete`);
    });
    
    // Start narration audio (in parallel with animation)
    const narrationPromise = this.playNarration(visualNumber).then(() => {
      this.isNarrationComplete = true;
      console.log(`Narration ${visualNumber} complete`);
    });
    
    // CRITICAL: Wait for BOTH to complete
    await Promise.all([animationPromise, narrationPromise]);
    
    // CRITICAL: Wait inter-visual delay
    if (this.ttsConfig.interVisualDelay > 0) {
      console.log(`Waiting ${this.ttsConfig.interVisualDelay}ms before next visual`);
      await this.delay(this.ttsConfig.interVisualDelay);
    }
    
    console.log(`Visual ${visualNumber} fully complete, ready for next`);
  }
  
  async playNarration(visualNumber: number): Promise<void> {
    const narration = this.narrations.find(n => n.visualNumber === visualNumber);
    
    if (!narration || !narration.audioBase64) {
      console.log(`No audio for visual ${visualNumber}, skipping`);
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      // Decode base64 to blob
      const audioBlob = this.base64ToBlob(narration.audioBase64, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log(`Audio ${visualNumber} finished playing`);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error(`Audio ${visualNumber} error:`, error);
        reject(error);
      };
      
      // Play the audio
      audio.play().catch(reject);
    });
  }
  
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async renderAnimation(actions): Promise<void> {
    // Your existing animation rendering logic
    // Return promise that resolves when animation completes
  }
}
```

### Alternative: Stream Audio from URL

Instead of embedding base64, stream from backend:

```typescript
async playNarration(visualNumber: number): Promise<void> {
  const narration = this.narrations.find(n => n.visualNumber === visualNumber);
  
  if (!narration || !narration.audioUrl) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const audio = new Audio(`http://localhost:8000${narration.audioUrl}`);
    
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);
    
    audio.play().catch(reject);
  });
}
```

## ⚙️ Backend Configuration

### Environment Variables

```bash
# .env file

# Enable/disable TTS
TTS_ENABLED=true

# Google Cloud TTS API Key (for Gemini 2.5 Flash TTS)
GOOGLE_CLOUD_TTS_API_KEY=AQ.Ab8RN6J5qi3zpeJkLkQAHSn0iw0Y0EsrOacNS4-kFOkNmj6R8Q

# Voice configuration
TTS_VOICE_NAME=en-US-Journey-D
TTS_AUDIO_ENCODING=MP3
TTS_SPEAKING_RATE=1.0

# Synchronization
TTS_INTER_VISUAL_DELAY=2000  # ms (2 seconds)
```

### Voice Options

Available voices (Gemini 2.5 Flash TTS):
- `en-US-Journey-D` - Default male voice
- `en-US-Journey-F` - Female voice
- `Charon` - Custom voice (if available)

### Test TTS Service

```bash
cd app/backend

# Test TTS connection and synthesis
npm run test:tts
```

Expected output:
```
TTS SERVICE CONNECTION TEST
══════════════════════════════════════════════════════════════════════
✅ TTS Service Available: YES
✅ Synthesis successful in 1234ms
✅ Audio size: 45231 bytes
✅ Estimated duration: 18s
✅ File saved successfully
✅ Batch synthesis successful
✅ ALL TTS TESTS PASSED
```

## 🎮 User Controls (Frontend)

### Recommended UI

```typescript
// Narration controls
interface NarrationSettings {
  enabled: boolean;        // Enable/disable narration
  volume: number;          // 0.0 - 1.0
  rate: number;            // 0.5 - 2.0 (playback speed)
  autoPlay: boolean;       // Auto-play on visual start
  showSubtitles: boolean;  // Show text alongside audio
}

// UI Component
function NarrationControls() {
  const [settings, setSettings] = useState<NarrationSettings>({
    enabled: true,
    volume: 0.8,
    rate: 1.0,
    autoPlay: true,
    showSubtitles: false
  });
  
  return (
    <div className="narration-controls">
      <button onClick={() => setSettings({...settings, enabled: !settings.enabled})}>
        {settings.enabled ? '🔊' : '🔇'}
      </button>
      
      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.1"
        value={settings.volume}
        onChange={(e) => setSettings({...settings, volume: parseFloat(e.target.value)})}
      />
      
      <select 
        value={settings.rate}
        onChange={(e) => setSettings({...settings, rate: parseFloat(e.target.value)})}
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1.0">1.0x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2.0">2.0x</option>
      </select>
    </div>
  );
}
```

## 📏 Timing Breakdown

Example timing for a single visual:

```
Visual 1 Timeline:
│
├─ 0:00 - Visual starts rendering
├─ 0:00 - Narration audio starts playing
│
├─ 0:05 - Animation completes (5s)
│          ↓ Still waiting for narration...
│
├─ 0:20 - Narration completes (20s)
│          ↓ Both complete! Start inter-visual delay
│
├─ 0:20 - Inter-visual delay starts (2s)
│
├─ 0:22 - Next visual can now start
│
```

If animation takes longer than narration:
```
Visual 2 Timeline:
│
├─ 0:00 - Visual starts rendering
├─ 0:00 - Narration audio starts playing
│
├─ 0:15 - Narration completes (15s)
│          ↓ Still waiting for animation...
│
├─ 0:25 - Animation completes (25s)
│          ↓ Both complete! Start inter-visual delay
│
├─ 0:25 - Inter-visual delay starts (2s)
│
├─ 0:27 - Next visual can now start
│
```

## 🔍 Debugging

### Check if TTS is Working

1. **Backend logs** on startup:
   ```
   🎤 Initializing Text-to-Speech service...
   ✅ TTS service initialized
   ✅ TTS connection test successful
   ```

2. **Check narration data** in frontend:
   ```javascript
   socket.on('rendered', (data) => {
     console.log('Has audio?', data.narration?.hasAudio);
     console.log('Audio size:', data.narration?.totalAudioSize, 'bytes');
     console.log('Narrations:', data.narration?.narrations.length);
   });
   ```

3. **Test audio playback**:
   ```javascript
   const narration = data.narration.narrations[0];
   if (narration.audioBase64) {
     const blob = base64ToBlob(narration.audioBase64, 'audio/mpeg');
     const url = URL.createObjectURL(blob);
     new Audio(url).play();
   }
   ```

### Common Issues

**Issue**: No audio data in narration
- Check `TTS_ENABLED=true` in `.env`
- Check `GOOGLE_CLOUD_TTS_API_KEY` is set
- Check backend logs for TTS errors

**Issue**: Audio playback fails
- Check audio format is MP3
- Check base64 decoding is correct
- Try using `audioUrl` instead of `audioBase64`

**Issue**: Visuals not synchronized
- Ensure `waitForNarration` and `waitForAnimation` are both true
- Check both promises resolve before proceeding
- Verify inter-visual delay is applied

## 📊 Performance Metrics

Typical performance with TTS:

```
Step Generation Timeline:
├─ Visual generation:      5-8s
├─ Text narration:         3-5s
├─ Audio synthesis:        5-10s (5 narrations)
└─ Total:                  13-23s

Per-Visual Audio:
├─ Text length:            40-80 words
├─ Audio duration:         15-25s
├─ File size:              30-60 KB (MP3)
└─ Total for step:         150-300 KB
```

## ✅ Testing Checklist

Before deployment, verify:

- [ ] Backend starts with TTS enabled
- [ ] TTS connection test passes
- [ ] Narrations include audio data
- [ ] Audio files are generated
- [ ] Frontend receives audio data
- [ ] Audio playback works
- [ ] Animation waits for narration
- [ ] Narration waits for animation
- [ ] Inter-visual delay is applied
- [ ] User can control volume/speed
- [ ] Next visual doesn't start early

## 🚀 Production Deployment

1. **Set API key** in production environment
2. **Enable TTS**: `TTS_ENABLED=true`
3. **Configure voice**: Choose appropriate voice
4. **Tune delay**: Adjust `TTS_INTER_VISUAL_DELAY` based on UX
5. **Monitor**: Track audio generation times
6. **Fallback**: Handle TTS failures gracefully

---

## Summary

**Backend**: ✅ Complete
- Narration + audio generation working
- Synchronization config included
- Audio files generated and cached

**Frontend**: 📋 Needs Implementation
- Receive audio data from socket
- Play audio synchronized with animation
- Wait for both to complete
- Apply inter-visual delay
- Add user controls

**Integration Point**: The `rendered` socket event now includes everything needed - just implement the sequential playback logic with proper waiting!

