/**
 * TTS Playback Service
 * Uses FREE Browser Web Speech API - NO backend required
 * NO fake audio, REAL browser synthesis
 */

import { browserTTS } from './browser-tts';

export interface NarrationData {
  visualNumber: number;
  type: 'notes' | 'animation';
  narration: string;
  duration: number; // seconds (estimated)
  audioBase64?: string; // DEPRECATED: Not used with browser TTS
  audioUrl?: string;    // DEPRECATED: Not used with browser TTS
  audioSize?: number;   // DEPRECATED: Not used with browser TTS
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
    interVisualDelay: 5000, // 5 seconds as per requirement
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
   * Play narration for a specific visual using FREE Browser TTS
   * Returns a promise that resolves when speech is complete
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

    if (!narration.narration || narration.narration.trim().length === 0) {
      console.log(`[TTS] No narration text for visual ${visualNumber}`);
      return Promise.resolve();
    }

    console.log(`[TTS] 🎤 Starting Browser TTS for visual ${visualNumber}...`);
    console.log(`[TTS] Text: "${narration.narration.substring(0, 80)}..."`);

    try {
      // Stop any currently playing speech
      this.stopCurrent();

      // Use FREE Browser TTS (Web Speech API)
      const result = await browserTTS.speak({
        text: narration.narration,
        rate: 1.0,     // Normal speed
        pitch: 1.0,    // Normal pitch
        volume: 1.0,   // Full volume
        lang: 'en-US'
      });

      if (result.success) {
        console.log(`[TTS] ✅ Browser TTS complete for visual ${visualNumber} (${result.duration.toFixed(1)}s)`);
      } else {
        console.error(`[TTS] ❌ Browser TTS failed: ${result.error}`);
      }

      return Promise.resolve();

    } catch (error) {
      console.error(`[TTS] Error with Browser TTS:`, error);
      return Promise.resolve(); // Don't block rendering on TTS errors
    }
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
   * Stop currently playing Browser TTS
   */
  public stopCurrent() {
    if (browserTTS.isSpeaking()) {
      console.log('[TTS] Stopping current Browser TTS');
      browserTTS.stop();
    }
    this.currentAudio = null; // Keep for compatibility
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
