/**
 * PACING CONTROLLER
 * 
 * Controls animation timing and delays for educational comprehension
 * Ensures students have time to understand each visual before moving to next
 */

export interface PacingConfig {
  // Base delays (milliseconds)
  beforeTitle: number;
  afterTitle: number;
  beforeHeading: number;
  afterHeading: number;
  beforeDiagram: number;
  afterDiagram: number;
  beforeDescription: number;
  afterDescription: number;
  betweenActions: number;
  beforeNewVisual: number;
  
  // Animation durations
  titleAnimationDuration: number;
  diagramAnimationDuration: number;
  textAnimationDuration: number;
  
  // Multipliers for different content types
  complexDiagramMultiplier: number;
  simpleTextMultiplier: number;
}

export type ContentType = 'title' | 'heading' | 'diagram' | 'description' | 'annotation' | 'action';

export class PacingController {
  private config: PacingConfig;
  private currentDelay: number = 0;
  
  // Default educational pacing (SLOW, HUMAN-LIKE for better comprehension)
  private static readonly DEFAULT_CONFIG: PacingConfig = {
    beforeTitle: 800,
    afterTitle: 2500,        // 2.5s to read title
    beforeHeading: 1000,
    afterHeading: 2000,      // 2s to read heading
    beforeDiagram: 1500,
    afterDiagram: 5000,      // 5s to understand diagram (INCREASED for human-like)
    beforeDescription: 800,
    afterDescription: 3500,  // 3.5s to read description
    betweenActions: 1500,    // 1.5s between individual actions (INCREASED for smooth flow)
    beforeNewVisual: 3000,   // 3s before starting new visual (INCREASED for clear separation)
    
    titleAnimationDuration: 1200,    // INCREASED for smooth, human-like rendering
    diagramAnimationDuration: 2000,  // INCREASED for smooth, human-like rendering
    textAnimationDuration: 800,      // INCREASED for smooth, human-like rendering
    
    complexDiagramMultiplier: 1.5,
    simpleTextMultiplier: 0.7
  };
  
  constructor(config?: Partial<PacingConfig>) {
    this.config = {
      ...PacingController.DEFAULT_CONFIG,
      ...config
    };
  }
  
  /**
   * Get delay before rendering a content type
   */
  public getDelayBefore(type: ContentType): number {
    switch (type) {
      case 'title':
        return this.config.beforeTitle;
      case 'heading':
        return this.config.beforeHeading;
      case 'diagram':
        return this.config.beforeDiagram;
      case 'description':
        return this.config.beforeDescription;
      case 'annotation':
        return this.config.betweenActions;
      case 'action':
        return this.config.betweenActions;
      default:
        return 500;
    }
  }
  
  /**
   * Get delay after rendering a content type (comprehension time)
   */
  public getDelayAfter(type: ContentType, complexity: number = 1): number {
    let baseDelay: number;
    
    switch (type) {
      case 'title':
        baseDelay = this.config.afterTitle;
        break;
      case 'heading':
        baseDelay = this.config.afterHeading;
        break;
      case 'diagram':
        baseDelay = this.config.afterDiagram;
        break;
      case 'description':
        baseDelay = this.config.afterDescription;
        break;
      case 'annotation':
        baseDelay = 1000;
        break;
      case 'action':
        baseDelay = this.config.betweenActions;
        break;
      default:
        baseDelay = 1000;
    }
    
    // Adjust for complexity
    return Math.round(baseDelay * complexity);
  }
  
  /**
   * Get animation duration for a content type
   */
  public getAnimationDuration(type: ContentType): number {
    switch (type) {
      case 'title':
        return this.config.titleAnimationDuration;
      case 'diagram':
        return this.config.diagramAnimationDuration;
      case 'description':
      case 'heading':
      case 'annotation':
        return this.config.textAnimationDuration;
      default:
        return 500;
    }
  }
  
  /**
   * Get total time for a content item (before + animation + after)
   */
  public getTotalTime(type: ContentType, complexity: number = 1): number {
    return (
      this.getDelayBefore(type) +
      this.getAnimationDuration(type) +
      this.getDelayAfter(type, complexity)
    );
  }
  
  /**
   * Get delay before starting a new visual group
   */
  public getNewVisualDelay(): number {
    return this.config.beforeNewVisual;
  }
  
  /**
   * Calculate complexity multiplier based on content
   */
  public calculateComplexity(content: {
    hasEquations?: boolean;
    hasAnimations?: boolean;
    elementCount?: number;
    textLength?: number;
  }): number {
    let complexity = 1.0;
    
    if (content.hasEquations) complexity += 0.3;
    if (content.hasAnimations) complexity += 0.2;
    if (content.elementCount && content.elementCount > 10) {
      complexity += (content.elementCount - 10) * 0.05;
    }
    if (content.textLength && content.textLength > 100) {
      complexity += (content.textLength - 100) / 500;
    }
    
    return Math.min(complexity, 2.0); // Cap at 2x
  }
  
  /**
   * Update pacing configuration
   */
  public updateConfig(config: Partial<PacingConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): PacingConfig {
    return { ...this.config };
  }
  
  /**
   * Reset pacing state
   */
  public reset(): void {
    this.currentDelay = 0;
  }
  
  /**
   * Create a promise that resolves after the appropriate delay
   */
  public async waitFor(type: ContentType, phase: 'before' | 'after', complexity: number = 1): Promise<void> {
    const delay = phase === 'before' 
      ? this.getDelayBefore(type)
      : this.getDelayAfter(type, complexity);
    
    if (delay > 0) {
      console.log(`[PacingController] Waiting ${delay}ms ${phase} ${type} (complexity: ${complexity.toFixed(1)})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  /**
   * Preset: Fast mode (for testing)
   */
  public static fastMode(): PacingConfig {
    return {
      beforeTitle: 100,
      afterTitle: 500,
      beforeHeading: 100,
      afterHeading: 300,
      beforeDiagram: 200,
      afterDiagram: 800,
      beforeDescription: 100,
      afterDescription: 500,
      betweenActions: 200,
      beforeNewVisual: 400,
      titleAnimationDuration: 300,
      diagramAnimationDuration: 500,
      textAnimationDuration: 200,
      complexDiagramMultiplier: 1.2,
      simpleTextMultiplier: 0.8
    };
  }
  
  /**
   * Preset: Slow mode (for complex topics)
   */
  public static slowMode(): PacingConfig {
    return {
      beforeTitle: 800,
      afterTitle: 3000,
      beforeHeading: 1000,
      afterHeading: 2500,
      beforeDiagram: 1500,
      afterDiagram: 6000,
      beforeDescription: 800,
      afterDescription: 4500,
      betweenActions: 1500,
      beforeNewVisual: 3000,
      titleAnimationDuration: 1200,
      diagramAnimationDuration: 2000,
      textAnimationDuration: 800,
      complexDiagramMultiplier: 2.0,
      simpleTextMultiplier: 0.6
    };
  }
}
