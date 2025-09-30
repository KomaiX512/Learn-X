/**
 * Animation Queue System
 * Plays animations at human-readable pace, independent of backend speed
 */

export interface QueuedAnimation {
  action: any;
  section: any;
  timestamp: number;
}

export class AnimationQueue {
  private queue: QueuedAnimation[] = [];
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentIndex: number = 0;
  private currentStepId: number | null = null;
  private renderer: any;
  private playbackSpeed: number = 1.0; // 1.0 = normal speed
  private onStepComplete?: (stepId: number) => void;
  private onProgress?: (progress: number) => void;
  
  // Enhanced timing for better student comprehension
  private readonly DELAYS = {
    afterTitle: 3000,      // 3 seconds after title for reading
    afterLabel: 2000,      // 2 seconds after label for comprehension
    afterVisual: 1500,     // 1.5 seconds after visual for observation
    betweenSteps: 5000,    // 5 seconds between steps for absorption
    afterClear: 1500,      // 1.5 seconds after clear
    afterOrbit: 2000,      // 2 seconds for orbit animation
    afterParticle: 1500,   // 1.5 seconds for particles
    afterWave: 1500,       // 1.5 seconds for wave
    afterDrawing: 2000,    // 2 seconds after drawing operations
    default: 1000          // 1 second default (increased from 400ms)
  };
  
  constructor(renderer: any) {
    this.renderer = renderer;
  }
  
  /**
   * Add animations to queue (from backend)
   */
  enqueue(actions: any[], section: any): void {
    console.log(`[AnimationQueue] Enqueueing ${actions.length} actions`);
    
    actions.forEach(action => {
      this.queue.push({
        action,
        section,
        timestamp: Date.now()
      });
    });
    
    // Start playing if not already
    if (!this.isPlaying) {
      this.play();
    }
  }
  
  /**
   * Play animations sequentially with proper timing
   */
  async play(): Promise<void> {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    console.log('[AnimationQueue] Starting sequential playback');
    
    while (this.currentIndex < this.queue.length && !this.isPaused) {
      const item = this.queue[this.currentIndex];
      
      // Check if we're starting a new step
      if (item.section?.stepId !== this.currentStepId) {
        // DON'T clear canvas - accumulate content like 3Blue1Brown lectures
        if (this.currentStepId !== null) {
          console.log(`[AnimationQueue] Step ${this.currentStepId} complete, moving to next step`);
          // Just pause between steps, don't clear
          await this.wait(this.DELAYS.betweenSteps);
        }
        this.currentStepId = item.section?.stepId;
        console.log(`[AnimationQueue] Starting Step ${this.currentStepId}`);
      }
      
      console.log(`[AnimationQueue] Action ${this.currentIndex + 1}/${this.queue.length}: ${item.action.op}`);
      console.log(`[AnimationQueue] Action details:`, JSON.stringify(item.action).substring(0, 200));
      
      try {
        console.log(`[AnimationQueue] Starting processAction for ${item.action.op}...`);
        await this.renderer.processAction(item.action, item.section);
        console.log(`[AnimationQueue] ✅ Completed ${item.action.op}`);
        
        // Force immediate visual update
        if (item.section?.layer) {
          item.section.layer.batchDraw();
        }
        
        // Update stage if needed
        if (this.renderer.stage) {
          this.renderer.stage.batchDraw();
        }
      } catch (error) {
        console.error(`[AnimationQueue] ❌ ERROR processing ${item.action.op}:`, error);
        console.error('[AnimationQueue] Error stack:', error.stack);
        // CRITICAL: Continue despite error
      }
      
      // Get appropriate delay for this action type
      const delay = this.getDelay(item.action);
      
      // Wait for student comprehension
      await this.wait(delay * this.playbackSpeed);
      
      this.currentIndex++;
      
      // Update progress callback
      const progress = (this.currentIndex / this.queue.length) * 100;
      if (this.onProgress) {
        this.onProgress(progress);
      }
      console.log(`[AnimationQueue] Progress: ${progress.toFixed(1)}%`);
    }
    
    if (!this.isPaused) {
      console.log('[AnimationQueue] Playback complete');
      this.isPlaying = false;
      if (this.currentStepId && this.onStepComplete) {
        this.onStepComplete(this.currentStepId);
      }
    }
  }
  
  /**
   * Get appropriate delay for action type
   */
  private getDelay(action: any): number {
    switch (action.op) {
      case 'clear':
        return this.DELAYS.afterClear;
      case 'drawTitle':
        return this.DELAYS.afterTitle;
      case 'drawLabel':
      case 'drawMathLabel':
        return this.DELAYS.afterLabel;
      case 'delay':
        // Use the specified delay duration
        return (action.duration || 1) * 1000;
      case 'drawCircle':
      case 'drawRect':
      case 'drawVector':
        return this.DELAYS.afterVisual;
      case 'orbit':
        return this.DELAYS.afterOrbit;
      case 'wave':
        return this.DELAYS.afterWave;
      case 'particle':
        return this.DELAYS.afterParticle;
      default:
        return this.DELAYS.default;
    }
  }
  
  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clear the canvas between steps
   */
  private async clearCanvas(): Promise<void> {
    if (this.renderer.stage) {
      // Fade out current content
      const layers = this.renderer.stage.getLayers();
      for (const layer of layers) {
        await this.fadeOut(layer);
      }
      
      // Clear all layers
      this.renderer.stage.destroyChildren();
      
      // Add fresh layer for next step
      const newLayer = new (window as any).Konva.Layer();
      this.renderer.stage.add(newLayer);
      this.renderer.stage.batchDraw();
    }
  }
  
  /**
   * Smooth fade out animation
   */
  private fadeOut(layer: any): Promise<void> {
    return new Promise(resolve => {
      const tween = new (window as any).Konva.Tween({
        node: layer,
        duration: 0.5,
        opacity: 0,
        onFinish: resolve
      });
      tween.play();
    });
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    this.isPaused = true;
    console.log('[AnimationQueue] Paused');
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.play();
    }
  }
  
  /**
   * Skip to next step
   */
  nextStep(): void {
    // Find next step boundary
    const nextStepIndex = this.queue.findIndex((item, idx) => 
      idx > this.currentIndex && item.section?.stepId !== this.currentStepId
    );
    
    if (nextStepIndex !== -1) {
      this.currentIndex = nextStepIndex - 1;
      this.resume();
    }
  }
  
  /**
   * Go to previous step
   */
  previousStep(): void {
    // Find previous step boundary
    const currentStepStart = this.queue.findIndex(item => 
      item.section?.stepId === this.currentStepId
    );
    
    if (currentStepStart > 0) {
      // Find the start of previous step
      const prevStepId = this.queue[currentStepStart - 1].section?.stepId;
      const prevStepStart = this.queue.findIndex(item => 
        item.section?.stepId === prevStepId
      );
      
      if (prevStepStart !== -1) {
        this.currentIndex = prevStepStart - 1;
        this.currentStepId = prevStepId;
        this.resume();
      }
    }
  }
  
  /**
   * Set callbacks
   */
  setCallbacks(onStepComplete?: (stepId: number) => void, onProgress?: (progress: number) => void): void {
    this.onStepComplete = onStepComplete;
    this.onProgress = onProgress;
  }
  
  /**
   * Clear queue and reset
   */
  clear(): void {
    this.queue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    console.log('[AnimationQueue] Queue cleared');
  }
  
  /**
   * Set playback speed (0.5 = half speed, 2.0 = double speed)
   */
  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
    console.log(`[AnimationQueue] Speed set to ${this.playbackSpeed}x`);
  }
  
  /**
   * Get queue status
   */
  getStatus(): { total: number; current: number; isPlaying: boolean } {
    return {
      total: this.queue.length,
      current: this.currentIndex,
      isPlaying: this.isPlaying
    };
  }
}
