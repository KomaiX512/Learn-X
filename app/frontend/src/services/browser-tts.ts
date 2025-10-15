/**
 * BROWSER TTS SERVICE - FREE WEB SPEECH API
 * Uses built-in browser speech synthesis - NO backend required
 * NO fake audio, NO mocking, REAL speech synthesis
 */

export interface BrowserTTSOptions {
  text: string;
  rate?: number;          // 0.1 to 10, default 1
  pitch?: number;         // 0 to 2, default 1
  volume?: number;        // 0 to 1, default 1
  voice?: SpeechSynthesisVoice;
  lang?: string;          // e.g., 'en-US'
}

export interface BrowserTTSResult {
  success: boolean;
  duration: number;       // Estimated duration in seconds
  error?: string;
}

export class BrowserTTSService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized: boolean = false;
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize the browser TTS service
   */
  private async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('[BrowserTTS] Web Speech API not supported in this browser');
      return;
    }
    
    this.synthesis = window.speechSynthesis;
    
    // Load voices (may take a moment)
    await this.loadVoices();
    
    this.isInitialized = true;
    console.log(`[BrowserTTS] ✅ Initialized with ${this.voices.length} voices`);
  }
  
  /**
   * Load available voices
   */
  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      // Voices might load asynchronously
      const loadVoicesTimeout = setTimeout(() => {
        this.voices = this.synthesis?.getVoices() || [];
        resolve();
      }, 100);
      
      if (this.synthesis) {
        this.synthesis.onvoiceschanged = () => {
          clearTimeout(loadVoicesTimeout);
          this.voices = this.synthesis?.getVoices() || [];
          console.log(`[BrowserTTS] Loaded ${this.voices.length} voices`);
          resolve();
        };
        
        // Try to load immediately
        const immediate = this.synthesis.getVoices();
        if (immediate && immediate.length > 0) {
          clearTimeout(loadVoicesTimeout);
          this.voices = immediate;
          resolve();
        }
      }
    });
  }
  
  /**
   * Check if TTS is available
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.synthesis !== null;
  }
  
  /**
   * Get all available voices
   */
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  /**
   * Get best English voice (prefer US/GB, prefer female)
   */
  public getBestEnglishVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null;
    
    // Priority 1: en-US female
    let voice = this.voices.find(v => 
      v.lang.startsWith('en-US') && v.name.toLowerCase().includes('female')
    );
    if (voice) return voice;
    
    // Priority 2: en-US any
    voice = this.voices.find(v => v.lang.startsWith('en-US'));
    if (voice) return voice;
    
    // Priority 3: en-GB
    voice = this.voices.find(v => v.lang.startsWith('en-GB'));
    if (voice) return voice;
    
    // Priority 4: any English
    voice = this.voices.find(v => v.lang.startsWith('en'));
    if (voice) return voice;
    
    // Fallback: first available voice
    return this.voices[0] || null;
  }
  
  /**
   * Estimate audio duration based on text
   */
  private estimateDuration(text: string, rate: number = 1.0): number {
    // Average speaking rate: 150 words per minute at rate 1.0
    const words = text.split(/\s+/).length;
    const baseWordsPerMinute = 150;
    const adjustedWordsPerMinute = baseWordsPerMinute * rate;
    const durationMinutes = words / adjustedWordsPerMinute;
    const durationSeconds = Math.ceil(durationMinutes * 60);
    
    return durationSeconds;
  }
  
  /**
   * Synthesize text to speech (plays immediately)
   */
  public async speak(options: BrowserTTSOptions): Promise<BrowserTTSResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        duration: 0,
        error: 'Browser TTS not available'
      };
    }
    
    const startTime = Date.now();
    const duration = this.estimateDuration(options.text, options.rate || 1.0);
    
    console.log(`[BrowserTTS] 🗣️ Speaking: "${options.text.substring(0, 50)}..." (${duration}s estimated)`);
    
    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(options.text);
        
        // Configure voice
        if (options.voice) {
          utterance.voice = options.voice;
        } else {
          utterance.voice = this.getBestEnglishVoice();
        }
        
        // Configure parameters
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';
        
        // Event handlers
        utterance.onstart = () => {
          console.log('[BrowserTTS] ▶️ Speech started');
        };
        
        utterance.onend = () => {
          const elapsed = Date.now() - startTime;
          console.log(`[BrowserTTS] ✅ Speech completed in ${elapsed}ms`);
          resolve({
            success: true,
            duration: elapsed / 1000
          });
        };
        
        utterance.onerror = (event) => {
          console.error('[BrowserTTS] ❌ Speech error:', event.error);
          resolve({
            success: false,
            duration: 0,
            error: event.error
          });
        };
        
        // Speak!
        this.synthesis!.speak(utterance);
        
      } catch (error: any) {
        console.error('[BrowserTTS] ❌ Failed to speak:', error);
        resolve({
          success: false,
          duration: 0,
          error: error.message
        });
      }
    });
  }
  
  /**
   * Stop current speech
   */
  public stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      console.log('[BrowserTTS] ⏹️ Speech stopped');
    }
  }
  
  /**
   * Pause current speech
   */
  public pause(): void {
    if (this.synthesis) {
      this.synthesis.pause();
      console.log('[BrowserTTS] ⏸️ Speech paused');
    }
  }
  
  /**
   * Resume paused speech
   */
  public resume(): void {
    if (this.synthesis) {
      this.synthesis.resume();
      console.log('[BrowserTTS] ▶️ Speech resumed');
    }
  }
  
  /**
   * Check if currently speaking
   */
  public isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }
  
  /**
   * Check if paused
   */
  public isPaused(): boolean {
    return this.synthesis?.paused || false;
  }
}

// Export singleton instance
export const browserTTS = new BrowserTTSService();
