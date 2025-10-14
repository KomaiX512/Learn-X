/**
 * TTS Playback Service
 * Handles playing narration audio synchronized with animations
 */

export interface NarrationData {
  visualNumber: number;
  type: 'notes' | 'animation';
  narration: string;
  duration: number; // seconds
  audioBase64?: string;
  audioUrl?: string;
  audioSize?: number;
}

export interface TTSConfig {
  enabled: boolean;
  interVisualDelay: number; // milliseconds
  waitForNarration: boolean;
  waitForAnimation: boolean;
}

export class TTSPlaybackService {
  private currentAudio: HTMLAudioElement | null = null;
  private narrations: Map<number, NarrationData> = new Map();
  private ttsConfig: TTSConfig = {
    enabled: false,
    interVisualDelay: 2000,
    waitForNarration: true,
    waitForAnimation: true
  };
  private audioEnabled: boolean = true; // User can toggle this

  /**
   * Load narration data from backend
   */
  public loadNarrations(narrationData: any, ttsConfig?: TTSConfig) {
    console.log('[TTS] Loading narrations:', narrationData);
    
    this.narrations.clear();
    
    if (!narrationData || !narrationData.narrations) {
      console.log('[TTS] No narration data provided');
      return;
    }

    // Store TTS config
    if (ttsConfig) {
      this.ttsConfig = ttsConfig;
      console.log('[TTS] TTS config loaded:', this.ttsConfig);
    }

    // Store each narration by visual number
    narrationData.narrations.forEach((n: NarrationData) => {
      this.narrations.set(n.visualNumber, n);
      console.log(`[TTS] Loaded narration for visual ${n.visualNumber}: ${n.duration}s`);
    });

    console.log(`[TTS] Total narrations loaded: ${this.narrations.size}`);
    console.log(`[TTS] Has audio: ${narrationData.hasAudio}`);
    console.log(`[TTS] Total duration: ${narrationData.totalDuration}s`);
  }

  /**
   * Play narration for a specific visual
   * Returns a promise that resolves when audio is complete
   */
  public async playNarration(visualNumber: number): Promise<void> {
    const narration = this.narrations.get(visualNumber);
    
    if (!narration) {
      console.log(`[TTS] No narration for visual ${visualNumber}`);
      return Promise.resolve();
    }

    if (!this.ttsConfig.enabled || !this.audioEnabled) {
      console.log(`[TTS] TTS disabled (enabled=${this.ttsConfig.enabled}, audio=${this.audioEnabled})`);
      return Promise.resolve();
    }

    if (!narration.audioBase64 && !narration.audioUrl) {
      console.log(`[TTS] No audio data for visual ${visualNumber}, showing text only`);
      // Could show text narration on screen here
      return Promise.resolve();
    }

    console.log(`[TTS] 🎤 Starting narration for visual ${visualNumber}...`);
    console.log(`[TTS] Duration: ${narration.duration}s`);
    console.log(`[TTS] Text: "${narration.narration.substring(0, 50)}..."`);

    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stopCurrent();

        // Create audio element
        const audio = new Audio();
        this.currentAudio = audio;

        // Set audio source (prefer base64 for zero latency)
        if (narration.audioBase64) {
          audio.src = `data:audio/mp3;base64,${narration.audioBase64}`;
          console.log(`[TTS] Using base64 audio (${(narration.audioSize || 0) / 1024}KB)`);
        } else if (narration.audioUrl) {
          audio.src = narration.audioUrl;
          console.log(`[TTS] Using audio URL: ${narration.audioUrl}`);
        }

        // Handle audio events
        audio.onended = () => {
          console.log(`[TTS] ✅ Narration complete for visual ${visualNumber}`);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`[TTS] ❌ Audio error for visual ${visualNumber}:`, e);
          this.currentAudio = null;
          // Don't reject - continue rendering even if audio fails
          resolve();
        };

        // Play audio
        const playPromise = audio.play();
        
        if (playPromise) {
          playPromise.catch(err => {
            console.error(`[TTS] Play error:`, err);
            this.currentAudio = null;
            resolve(); // Continue even if play fails
          });
        }

        console.log(`[TTS] 🔊 Audio playing...`);

      } catch (error) {
        console.error(`[TTS] Error setting up audio:`, error);
        this.currentAudio = null;
        resolve(); // Don't block rendering on audio errors
      }
    });
  }

  /**
   * Play narration synchronized with animation
   * Waits for BOTH to complete plus inter-visual delay
   */
  public async playWithAnimation(
    visualNumber: number,
    animationPromise: Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    
    console.log(`[TTS] 🎬 Visual ${visualNumber}: Starting synchronized playback`);
    
    // Start both in parallel
    const narrationPromise = this.playNarration(visualNumber);
    
    // CRITICAL: Wait for BOTH to complete
    console.log(`[TTS] ⏳ Waiting for animation AND narration...`);
    await Promise.all([animationPromise, narrationPromise]);
    
    const bothCompleteTime = Date.now() - startTime;
    console.log(`[TTS] ✅ Both complete after ${bothCompleteTime}ms`);
    
    // CRITICAL: Apply inter-visual delay
    if (this.ttsConfig.interVisualDelay > 0) {
      console.log(`[TTS] ⏸️  Applying inter-visual delay (${this.ttsConfig.interVisualDelay}ms)...`);
      await new Promise(resolve => setTimeout(resolve, this.ttsConfig.interVisualDelay));
      console.log(`[TTS] ✅ Delay complete`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[TTS] 🏁 Visual ${visualNumber} COMPLETE after ${totalTime}ms total`);
  }

  /**
   * Stop currently playing audio
   */
  public stopCurrent() {
    if (this.currentAudio) {
      console.log('[TTS] Stopping current audio');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Toggle audio on/off (user control)
   */
  public setAudioEnabled(enabled: boolean) {
    console.log(`[TTS] Audio ${enabled ? 'enabled' : 'disabled'}`);
    this.audioEnabled = enabled;
    if (!enabled) {
      this.stopCurrent();
    }
  }

  /**
   * Check if narration exists for visual
   */
  public hasNarration(visualNumber: number): boolean {
    return this.narrations.has(visualNumber);
  }

  /**
   * Get narration text (for display)
   */
  public getNarrationText(visualNumber: number): string | null {
    return this.narrations.get(visualNumber)?.narration || null;
  }

  /**
   * Clear all loaded narrations
   */
  public clear() {
    this.stopCurrent();
    this.narrations.clear();
    console.log('[TTS] Cleared all narrations');
  }
}

// Export singleton instance
export const ttsPlayback = new TTSPlaybackService();
