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
  private currentIndex: number = 0;
  private renderer: any;
  private playbackSpeed: number = 1.0; // 1.0 = normal speed
  
  // Timing constants (in milliseconds) - HUMAN PACE
  private readonly DELAYS = {
    afterTitle: 2000,      // 2 seconds after title
    afterLabel: 1500,      // 1.5 seconds after label
    afterVisual: 500,      // 0.5 seconds after visual
    betweenSteps: 5000,    // 5 seconds between steps for grasping
    afterClear: 1000,      // 1 second after clear
    afterOrbit: 1000,      // 1 second for orbit
    afterParticle: 800,    // 0.8 seconds for particles
    afterWave: 800,        // 0.8 seconds for wave
    default: 400           // 0.4 seconds default
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
   * Play animations at human pace
   */
  private async play(): Promise<void> {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    console.log('[AnimationQueue] Starting playback');
    
    while (this.currentIndex < this.queue.length) {
      const item = this.queue[this.currentIndex];
      
      console.log(`[AnimationQueue] Processing action ${this.currentIndex + 1}/${this.queue.length}: ${item.action.op}`);
      
      try {
        // Process the action
        await this.renderer.processAction(item.action, item.section);
        
        // CRITICAL: Force layer redraw after each action
        if (item.section && item.section.layer) {
          item.section.layer.batchDraw();
        }
      } catch (error) {
        console.error('[AnimationQueue] Error processing action:', error);
      }
      
      // Calculate appropriate delay - FULL timing for proper viewing
      const delay = this.getDelay(item.action);
      
      // Wait before next animation
      await this.wait(delay * this.playbackSpeed);
      
      this.currentIndex++;
      
      // Update progress
      const progress = (this.currentIndex / this.queue.length) * 100;
      console.log(`[AnimationQueue] Progress: ${progress.toFixed(1)}%`);
    }
    
    console.log('[AnimationQueue] Playback complete');
    this.isPlaying = false;
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
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    console.log('[AnimationQueue] Paused');
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (!this.isPlaying && this.currentIndex < this.queue.length) {
      this.play();
    }
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
