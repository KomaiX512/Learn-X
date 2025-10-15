# Frontend Narration Integration Guide

## Quick Start

The backend now sends structured narrations with each step. Here's how to integrate text-to-speech:

## 1. Receive Narration Data

Update your socket listener:

```typescript
socket.on('rendered', (data) => {
  const { actions, narration, stepId, meta } = data;
  
  console.log('Step narration:', narration);
  // {
  //   stepId: 1,
  //   topic: "Deep Learning",
  //   subtopic: "Neural Networks",
  //   narrations: [
  //     { visualNumber: 0, type: 'notes', narration: "...", duration: 18 },
  //     { visualNumber: 1, type: 'animation', narration: "...", duration: 20 },
  //     ...
  //   ],
  //   totalDuration: 95
  // }
  
  if (narration) {
    processNarrations(narration);
  }
});
```

## 2. Map Narrations to Visuals

Each visual has a `visualNumber`:
- **0** = Notes keynote (first visual)
- **1-4** = Animation visuals

```typescript
function processNarrations(stepNarration: StepNarration) {
  stepNarration.narrations.forEach((n) => {
    if (n.visualNumber === 0) {
      // This is the notes keynote narration
      notesNarration = n.narration;
    } else {
      // This is an animation narration (1-4)
      animationNarrations[n.visualNumber] = n.narration;
    }
  });
}
```

## 3. Play Audio When Visual Starts

### Option A: Browser Web Speech API (No Dependencies)

```typescript
function playNarration(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0; // Adjust speed (0.1 to 10)
  utterance.pitch = 1.0; // Adjust pitch (0 to 2)
  utterance.volume = 1.0; // Adjust volume (0 to 1)
  utterance.lang = 'en-US';
  
  window.speechSynthesis.speak(utterance);
}

// Play when visual starts rendering
onVisualStart(visualNumber: number) {
  const narration = currentStepNarrations.find(
    n => n.visualNumber === visualNumber
  );
  
  if (narration) {
    playNarration(narration.narration);
  }
}
```

### Option B: Pre-generate All Audio (Better Quality)

```typescript
import axios from 'axios';

// Convert all narrations to audio when step loads
async function preloadStepAudio(stepNarration: StepNarration) {
  const audioPromises = stepNarration.narrations.map(async (n) => {
    // Use your TTS API (Google, ElevenLabs, etc.)
    const audioBlob = await convertTextToSpeech(n.narration);
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return {
      visualNumber: n.visualNumber,
      audioUrl,
      duration: n.duration
    };
  });
  
  const audioCache = await Promise.all(audioPromises);
  return audioCache;
}

// Play from cache when visual starts
function playPreloadedAudio(visualNumber: number) {
  const audio = audioCache.find(a => a.visualNumber === visualNumber);
  if (audio) {
    const audioElement = new Audio(audio.audioUrl);
    audioElement.play();
  }
}
```

## 4. Synchronization Patterns

### Pattern 1: Play Immediately on Visual Start
```typescript
renderVisual(visualNumber: number) {
  // Render visual
  this.renderActions(actions);
  
  // Play narration immediately
  const narration = this.getNarration(visualNumber);
  if (narration) {
    this.playAudio(narration);
  }
}
```

### Pattern 2: Delay Narration Slightly
```typescript
renderVisual(visualNumber: number) {
  // Render visual
  this.renderActions(actions);
  
  // Wait for initial animation (1-2s)
  setTimeout(() => {
    const narration = this.getNarration(visualNumber);
    if (narration) {
      this.playAudio(narration);
    }
  }, 1500); // Delay 1.5s
}
```

### Pattern 3: Queue for Sequential Playback
```typescript
class NarrationQueue {
  private queue: NarrationOutput[] = [];
  private isPlaying = false;
  
  add(narration: NarrationOutput) {
    this.queue.push(narration);
    if (!this.isPlaying) {
      this.playNext();
    }
  }
  
  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    const next = this.queue.shift();
    
    await this.playAudio(next.narration);
    
    // Small pause between narrations
    await this.delay(500);
    
    this.playNext();
  }
  
  private playAudio(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const narrationQueue = new NarrationQueue();

onStepReceived(narration: StepNarration) {
  narration.narrations.forEach(n => {
    narrationQueue.add(n);
  });
}
```

## 5. User Controls

Add UI controls for narration:

```typescript
interface NarrationControls {
  enabled: boolean; // Enable/disable narration
  rate: number; // Speech rate (0.5 - 2.0)
  volume: number; // Volume (0.0 - 1.0)
  autoPlay: boolean; // Auto-play on visual start
}

function applyNarrationSettings(utterance: SpeechSynthesisUtterance, controls: NarrationControls) {
  utterance.rate = controls.rate;
  utterance.volume = controls.volume;
}

// UI Component
function NarrationControlPanel() {
  const [enabled, setEnabled] = useState(true);
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  
  return (
    <div className="narration-controls">
      <button onClick={() => setEnabled(!enabled)}>
        {enabled ? '🔊 Narration On' : '🔇 Narration Off'}
      </button>
      
      <label>
        Speed: {rate.toFixed(1)}x
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1" 
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
        />
      </label>
      
      <label>
        Volume: {Math.round(volume * 100)}%
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
}
```

## 6. TTS API Integration

### Google Cloud TTS (High Quality)

```typescript
async function googleTextToSpeech(text: string): Promise<Blob> {
  const response = await fetch('/api/tts/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: 'en-US-Neural2-J', // Male voice
      // or 'en-US-Neural2-F' for female
      audioEncoding: 'MP3'
    })
  });
  
  return await response.blob();
}
```

### ElevenLabs (Best Quality, Realistic Voice)

```typescript
async function elevenLabsTextToSpeech(text: string): Promise<Blob> {
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceId: 'YOUR_VOICE_ID', // Get from ElevenLabs dashboard
      modelId: 'eleven_monolingual_v1',
      stability: 0.5,
      similarityBoost: 0.75
    })
  });
  
  return await response.blob();
}
```

### Browser Native (Free, Works Offline)

```typescript
function browserTextToSpeech(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);
    
    // Select best voice (optional)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang === 'en-US' && v.name.includes('Google')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  });
}
```

## 7. Complete Example Component

```typescript
import React, { useState, useEffect } from 'react';
import { StepNarration, NarrationOutput } from './types';

export function NarrationPlayer({ stepNarration }: { stepNarration: StepNarration }) {
  const [currentVisual, setCurrentVisual] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    rate: 1.0,
    volume: 0.8
  });
  
  // Play narration for current visual
  const playNarration = async (visualNumber: number) => {
    if (!settings.enabled) return;
    
    const narration = stepNarration.narrations.find(
      n => n.visualNumber === visualNumber
    );
    
    if (!narration) return;
    
    setIsPlaying(true);
    
    try {
      // Use browser TTS (replace with API call for better quality)
      await browserTTS(narration.narration, settings);
    } catch (error) {
      console.error('Narration playback failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };
  
  // Auto-play when visual changes
  useEffect(() => {
    playNarration(currentVisual);
  }, [currentVisual]);
  
  return (
    <div className="narration-player">
      <div className="narration-text">
        {stepNarration.narrations[currentVisual]?.narration}
      </div>
      
      <div className="controls">
        <button 
          onClick={() => playNarration(currentVisual)}
          disabled={isPlaying}
        >
          {isPlaying ? '⏸ Playing...' : '▶️ Play Narration'}
        </button>
        
        <button onClick={() => window.speechSynthesis.cancel()}>
          ⏹ Stop
        </button>
      </div>
      
      <div className="settings">
        <label>
          <input 
            type="checkbox" 
            checked={settings.enabled}
            onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
          />
          Enable narration
        </label>
        
        <label>
          Speed: {settings.rate}x
          <input 
            type="range" 
            min="0.5" 
            max="2" 
            step="0.1"
            value={settings.rate}
            onChange={(e) => setSettings({...settings, rate: parseFloat(e.target.value)})}
          />
        </label>
      </div>
    </div>
  );
}

// Helper function
async function browserTTS(text: string, settings: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}
```

## 8. Performance Tips

### Cache Audio Files
```typescript
const audioCache = new Map<string, string>(); // text -> audioUrl

async function getCachedAudio(text: string): Promise<string> {
  if (audioCache.has(text)) {
    return audioCache.get(text)!;
  }
  
  const audioBlob = await textToSpeech(text);
  const audioUrl = URL.createObjectURL(audioBlob);
  audioCache.set(text, audioUrl);
  
  return audioUrl;
}
```

### Preload Next Step Audio
```typescript
socket.on('rendered', async (data) => {
  // Render current step
  renderStep(data);
  
  // Preload audio for next step in background
  if (data.nextStepNarration) {
    preloadStepAudio(data.nextStepNarration);
  }
});
```

## 9. Accessibility

Make narrations accessible:

```typescript
// Add ARIA labels
<button 
  aria-label="Play narration for current visual"
  onClick={() => playNarration(currentVisual)}
>
  ▶️ Play
</button>

// Keyboard shortcuts
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === ' ' && e.ctrlKey) {
      playNarration(currentVisual);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [currentVisual]);
```

## 10. Testing

Test narration integration:

```typescript
describe('Narration Player', () => {
  it('plays narration for current visual', async () => {
    const mockNarration: StepNarration = {
      stepId: 1,
      narrations: [
        { visualNumber: 0, type: 'notes', narration: 'Test', duration: 5 }
      ]
    };
    
    const { getByText } = render(<NarrationPlayer stepNarration={mockNarration} />);
    const playButton = getByText('▶️ Play Narration');
    
    fireEvent.click(playButton);
    
    // Verify audio started playing
    expect(window.speechSynthesis.speaking).toBe(true);
  });
});
```

---

## Summary

1. **Receive** narration data from backend in `rendered` event
2. **Map** narrations to visuals by `visualNumber` (0 = notes, 1-4 = animations)
3. **Play** narration when each visual starts rendering
4. **Use** browser TTS for quick start, or TTS API for better quality
5. **Add** user controls for volume, speed, and enable/disable
6. **Cache** audio to avoid regenerating same narrations

**Ready to go!** The backend is already sending narrations - just add the frontend playback logic.
