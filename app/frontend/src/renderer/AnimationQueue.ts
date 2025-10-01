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
  
  // FAST RESPONSIVE TIMING - User can see progress immediately
  private readonly DELAYS = {
    afterTitle: 500,       // 0.5 seconds after title (fast)
    afterLabel: 300,       // 0.3 seconds after label (fast)
    afterVisual: 200,      // 0.2 seconds after visual (fast)
    betweenSteps: 1000,    // 1 second between steps (reasonable pause)
    afterClear: 200,       // 0.2 seconds after clear
    afterOrbit: 500,       // 0.5 seconds for orbit animation
    afterParticle: 300,    // 0.3 seconds for particles
    afterWave: 300,        // 0.3 seconds for wave
    afterDrawing: 300,     // 0.3 seconds after drawing operations
    default: 200           // 0.2 seconds default (fast but visible)
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
    
    console.log(`[AnimationQueue] Queue now has ${this.queue.length} total actions`);
    console.log(`[AnimationQueue] Current status: isPlaying=${this.isPlaying}, isPaused=${this.isPaused}, currentIndex=${this.currentIndex}`);
    
    // Start playing if not already
    // The play() loop will automatically process new actions as they arrive
    if (!this.isPlaying && !this.isPaused) {
      console.log('[AnimationQueue] Starting playback...');
      this.play();
    } else {
      console.log('[AnimationQueue] Playback already active, new actions will be processed automatically');
    }
  }
  
  /**
   * Play all animations in queue sequentially
   */
  async play(): Promise<void> {
    // If already playing, the existing loop will process new items
    if (this.isPlaying) {
      console.log('[AnimationQueue] Already playing, existing loop will process new items');
      return;
    }
    
    // Don't start if paused
    if (this.isPaused) {
      console.log('[AnimationQueue] Currently paused, call resume() to continue');
      return;
    }
    
    this.isPlaying = true;
    console.log(`[AnimationQueue] 🚀 Starting sequential playback - ${this.queue.length} actions in queue`);
    console.log(`[AnimationQueue] Starting at index: ${this.currentIndex}`);
    
    // CRITICAL: Keep looping as long as there are items in the queue
    // New items can be added while we're processing, the loop will handle them
    while (this.currentIndex < this.queue.length && this.isPlaying && !this.isPaused) {
      try {
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
          
          // Add timeout to prevent hanging forever on a single action
          const processWithTimeout = Promise.race([
            this.renderer.processAction(item.action, item.section),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Action timeout after 10 seconds')), 10000)
            )
          ]);
          
          await processWithTimeout;
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
          console.error('[AnimationQueue] Error stack:', error?.stack);
          console.error('[AnimationQueue] Error details:', error);
          console.error(`[AnimationQueue] Skipping action ${this.currentIndex} and continuing...`);
          // CRITICAL: Continue despite error - DO NOT STOP PLAYBACK!
        }
        
        // Get appropriate delay for this action type
        const delay = this.getDelay(item.action);
        console.log(`[AnimationQueue] Waiting ${delay}ms before next action...`);
        
        // Wait for student comprehension
        await this.wait(delay * this.playbackSpeed);
        
        this.currentIndex++;
        
        // Update progress callback
        const progress = (this.currentIndex / this.queue.length) * 100;
        if (this.onProgress) {
          this.onProgress(progress);
        }
        console.log(`[AnimationQueue] Progress: ${progress.toFixed(1)}% (${this.currentIndex}/${this.queue.length})`);
      } catch (loopError) {
        console.error(`[AnimationQueue] 🔥 CRITICAL ERROR in main loop:`, loopError);
        console.error('[AnimationQueue] Loop error stack:', loopError?.stack);
        console.error('[AnimationQueue] Attempting to continue...');
        this.currentIndex++; // Skip problematic action
      }
    }
    
    console.log(`[AnimationQueue] Loop ended. isPaused: ${this.isPaused}, currentIndex: ${this.currentIndex}, queueLength: ${this.queue.length}`);
    
    if (!this.isPaused) {
      console.log('[AnimationQueue] 🎉 Playback complete - ALL ACTIONS RENDERED!');
      this.isPlaying = false;
      if (this.currentStepId && this.onStepComplete) {
        this.onStepComplete(this.currentStepId);
      }
    } else {
      console.log('[AnimationQueue] Playback paused');
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
        // Delay is already handled by renderer, no additional wait needed
        return 0; // Don't wait again after delay operation
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
