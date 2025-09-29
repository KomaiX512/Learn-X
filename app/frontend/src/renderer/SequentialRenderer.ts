/**
 * Sequential Renderer with Optimized Animations
 * Ensures one action at a time with proper delays for comprehension
 */

import Konva from 'konva';
import { AnimationQueue } from './AnimationQueue';

export interface RendererConfig {
  canvasId: string;
  width?: number;
  height?: number;
  onStepComplete?: (stepId: number) => void;
  onProgress?: (progress: number) => void;
}

export class SequentialRenderer {
  private stage: Konva.Stage | null = null;
  private currentLayer: Konva.Layer | null = null;
  private animationQueue: AnimationQueue;
  private overlay: HTMLDivElement | null = null;
  private currentStepId: number | null = null;
  
  constructor(config: RendererConfig) {
    this.initializeStage(config);
    this.animationQueue = new AnimationQueue(this);
    
    // Set callbacks
    if (config.onStepComplete || config.onProgress) {
      this.animationQueue.setCallbacks(config.onStepComplete, config.onProgress);
    }
  }
  
  private initializeStage(config: RendererConfig): void {
    const container = document.getElementById(config.canvasId);
    if (!container) {
      console.error(`[SequentialRenderer] Container ${config.canvasId} not found`);
      return;
    }
    
    // Create stage with smooth rendering
    this.stage = new Konva.Stage({
      container: config.canvasId,
      width: config.width || container.clientWidth,
      height: config.height || container.clientHeight
    });
    
    // Create initial layer
    this.currentLayer = new Konva.Layer();
    this.stage.add(this.currentLayer);
    
    // Create overlay for math labels
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '10';
    container.style.position = 'relative';
    container.appendChild(this.overlay);
    
    console.log('[SequentialRenderer] Stage initialized');
  }
  
  /**
   * Process a chunk of actions sequentially
   */
  public processChunk(chunk: any): void {
    if (!chunk.actions || !Array.isArray(chunk.actions)) {
      console.error('[SequentialRenderer] Invalid chunk:', chunk);
      return;
    }
    
    console.log(`[SequentialRenderer] Processing ${chunk.actions.length} actions for step ${chunk.stepId}`);
    
    // Create new layer for this step to accumulate content
    if (this.currentStepId !== chunk.stepId) {
      this.currentStepId = chunk.stepId;
      this.currentLayer = new Konva.Layer();
      this.stage?.add(this.currentLayer);
      console.log(`[SequentialRenderer] Created new layer for step ${chunk.stepId}`);
    }
    
    // Add to animation queue for sequential playback
    this.animationQueue.enqueue(chunk.actions, {
      stepId: chunk.stepId,
      layer: this.currentLayer,
      stage: this.stage
    });
    
    // Start playing automatically for cinematic experience
    this.animationQueue.play();
  }
  
  /**
   * Process a single action (called by AnimationQueue)
   */
  public async processAction(action: any, section: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    switch (action.op) {
      case 'clear':
        await this.clearCanvas(action.target);
        break;
        
      case 'drawTitle':
        await this.drawTitle(action.text, action.y, action.duration);
        break;
        
      case 'drawLabel':
        await this.drawLabel(action.text, action.x, action.y, action.color, action.options);
        break;
        
      case 'drawCircle':
        await this.drawCircle(action.x, action.y, action.radius, action.color, action.fill);
        break;
        
      case 'drawRect':
        await this.drawRect(action.x, action.y, action.width, action.height, action.color, action.fill);
        break;
        
      case 'drawLine':
        await this.drawLine(action.points, action.color, action.width);
        break;
        
      case 'orbit':
        await this.createOrbitAnimation(action);
        break;
        
      case 'wave':
        await this.createWaveAnimation(action);
        break;
        
      case 'particle':
        await this.createParticleAnimation(action);
        break;
        
      case 'arrow':
        await this.drawArrow(action.from, action.to, action.color, action.label);
        break;
        
      default:
        console.warn('[SequentialRenderer] Unknown action:', action.op);
    }
    
    // Force redraw after each action
    this.currentLayer.batchDraw();
  }
  
  /**
   * Clear canvas with fade animation
   */
  private async clearCanvas(target?: string): Promise<void> {
    return new Promise(resolve => {
      if (target === 'all' && this.stage) {
        // Fade out all layers
        const layers = this.stage.getLayers();
        layers.forEach(layer => {
          new Konva.Tween({
            node: layer,
            duration: 0.5,
            opacity: 0,
            onFinish: () => {
              layer.destroy();
            }
          }).play();
        });
        
        // Create new layer after fade
        setTimeout(() => {
          this.currentLayer = new Konva.Layer();
          this.stage!.add(this.currentLayer);
          this.currentLayer.opacity(0);
          
          // Fade in new layer
          new Konva.Tween({
            node: this.currentLayer,
            duration: 0.3,
            opacity: 1,
            onFinish: resolve
          }).play();
        }, 500);
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Draw title with animation
   */
  private async drawTitle(text: string, y: number = 0.1, duration: number = 1): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const titleGroup = new Konva.Group({
      x: this.stage.width() / 2,
      y: y * this.stage.height(),
      opacity: 0
    });
    
    // Background box
    const padding = 20;
    const titleBg = new Konva.Rect({
      x: -200,
      y: -padding,
      width: 400,
      height: 60,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      cornerRadius: 8,
      shadowColor: 'black',
      shadowBlur: 15,
      shadowOpacity: 0.3,
      shadowOffsetY: 5
    });
    
    // Title text
    const titleText = new Konva.Text({
      text,
      x: -200,
      y: 0,
      width: 400,
      align: 'center',
      fontSize: 28,
      fontFamily: 'Inter, Helvetica Neue, sans-serif',
      fontStyle: 'bold',
      fill: 'white',
      letterSpacing: 1
    });
    
    titleGroup.add(titleBg);
    titleGroup.add(titleText);
    this.currentLayer.add(titleGroup);
    
    // Animate in
    return new Promise(resolve => {
      new Konva.Tween({
        node: titleGroup,
        duration,
        opacity: 1,
        y: titleGroup.y() + 10,
        easing: Konva.Easings.EaseOut,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw label with typewriter effect
   */
  private async drawLabel(text: string, x: number, y: number, color?: string, options?: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const label = new Konva.Text({
      text: '',
      x: x * this.stage.width(),
      y: y * this.stage.height(),
      fontSize: options?.fontSize || 18,
      fontFamily: 'Inter, Helvetica Neue, sans-serif',
      fill: color || '#333',
      fontStyle: options?.italic ? 'italic' : 'normal',
      fontWeight: options?.bold ? 'bold' : 'normal'
    });
    
    this.currentLayer.add(label);
    
    // Typewriter effect
    return new Promise(resolve => {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          label.text(text.slice(0, currentIndex));
          this.currentLayer!.batchDraw();
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          resolve();
        }
      }, 30); // 30ms per character for smooth typing
    });
  }
  
  /**
   * Draw circle with smooth animation
   */
  private async drawCircle(x: number, y: number, radius: number, color?: string, fill?: boolean): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const circle = new Konva.Circle({
      x: x * this.stage.width(),
      y: y * this.stage.height(),
      radius: 0,
      stroke: color || '#3b82f6',
      strokeWidth: 2,
      fill: fill ? (color || '#3b82f6') : undefined,
      opacity: fill ? 0.3 : 1
    });
    
    this.currentLayer.add(circle);
    
    // Animate radius expansion
    return new Promise(resolve => {
      new Konva.Tween({
        node: circle,
        duration: 0.5,
        radius: radius * Math.min(this.stage!.width(), this.stage!.height()),
        easing: Konva.Easings.EaseOut,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw rectangle with animation
   */
  private async drawRect(x: number, y: number, width: number, height: number, color?: string, fill?: boolean): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const rect = new Konva.Rect({
      x: x * this.stage.width(),
      y: y * this.stage.height(),
      width: 0,
      height: 0,
      stroke: color || '#10b981',
      strokeWidth: 2,
      fill: fill ? (color || '#10b981') : undefined,
      opacity: fill ? 0.3 : 1,
      cornerRadius: 4
    });
    
    this.currentLayer.add(rect);
    
    // Animate size expansion
    return new Promise(resolve => {
      new Konva.Tween({
        node: rect,
        duration: 0.6,
        width: width * this.stage!.width(),
        height: height * this.stage!.height(),
        easing: Konva.Easings.EaseOut,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw line with animation
   */
  private async drawLine(points: number[], color?: string, width?: number): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const scaledPoints = points.map((p, i) => 
      i % 2 === 0 ? p * this.stage!.width() : p * this.stage!.height()
    );
    
    const line = new Konva.Line({
      points: [scaledPoints[0], scaledPoints[1]],
      stroke: color || '#6366f1',
      strokeWidth: width || 2,
      lineCap: 'round',
      lineJoin: 'round'
    });
    
    this.currentLayer.add(line);
    
    // Animate line drawing
    return new Promise(resolve => {
      let progress = 0;
      const animate = () => {
        progress += 0.05;
        if (progress >= 1) {
          line.points(scaledPoints);
          this.currentLayer!.batchDraw();
          resolve();
        } else {
          const currentPoints = [];
          for (let i = 0; i < scaledPoints.length; i += 2) {
            const idx = Math.floor((i / 2) * progress) * 2;
            if (idx < scaledPoints.length - 1) {
              currentPoints.push(scaledPoints[idx], scaledPoints[idx + 1]);
            }
          }
          line.points(currentPoints);
          this.currentLayer!.batchDraw();
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }
  
  /**
   * Create orbit animation
   */
  private async createOrbitAnimation(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const centerX = action.center[0] * this.stage.width();
    const centerY = action.center[1] * this.stage.height();
    const radius = action.radius * Math.min(this.stage.width(), this.stage.height());
    
    // Center point
    const center = new Konva.Circle({
      x: centerX,
      y: centerY,
      radius: 5,
      fill: action.color || '#ef4444',
      opacity: 0
    });
    
    // Orbiting object
    const orbiter = new Konva.Circle({
      x: centerX + radius,
      y: centerY,
      radius: action.objectRadius || 8,
      fill: action.objectColor || '#3b82f6',
      opacity: 0
    });
    
    this.currentLayer.add(center);
    this.currentLayer.add(orbiter);
    
    // Fade in
    new Konva.Tween({
      node: center,
      duration: 0.3,
      opacity: 1
    }).play();
    
    new Konva.Tween({
      node: orbiter,
      duration: 0.3,
      opacity: 1
    }).play();
    
    // Orbit animation
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const angle = (frame.time * action.speed * 0.001) % (Math.PI * 2);
      orbiter.x(centerX + Math.cos(angle) * radius);
      orbiter.y(centerY + Math.sin(angle) * radius);
    }, this.currentLayer);
    
    anim.start();
    
    // Store animation for cleanup
    (orbiter as any)._orbitAnim = anim;
  }
  
  /**
   * Create wave animation
   */
  private async createWaveAnimation(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const points: number[] = [];
    const amplitude = action.amplitude * this.stage.height();
    const frequency = action.frequency;
    const y = action.y * this.stage.height();
    
    const line = new Konva.Line({
      points: points,
      stroke: action.color || '#8b5cf6',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0
    });
    
    this.currentLayer.add(line);
    
    // Fade in
    new Konva.Tween({
      node: line,
      duration: 0.3,
      opacity: 1
    }).play();
    
    // Wave animation
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const newPoints: number[] = [];
      const phase = frame.time * 0.001 * action.speed;
      
      for (let x = 0; x <= this.stage!.width(); x += 5) {
        const waveY = y + Math.sin((x / this.stage!.width()) * frequency * Math.PI * 2 + phase) * amplitude;
        newPoints.push(x, waveY);
      }
      
      line.points(newPoints);
    }, this.currentLayer);
    
    anim.start();
    
    // Store animation for cleanup
    (line as any)._waveAnim = anim;
  }
  
  /**
   * Create particle animation
   */
  private async createParticleAnimation(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const particles: Konva.Circle[] = [];
    const centerX = action.center[0] * this.stage.width();
    const centerY = action.center[1] * this.stage.height();
    
    for (let i = 0; i < action.count; i++) {
      const particle = new Konva.Circle({
        x: centerX,
        y: centerY,
        radius: action.size || 3,
        fill: action.color || '#fbbf24',
        opacity: 0
      });
      
      this.currentLayer.add(particle);
      particles.push(particle);
      
      // Fade in with delay
      setTimeout(() => {
        new Konva.Tween({
          node: particle,
          duration: 0.3,
          opacity: 0.8
        }).play();
      }, i * 50);
    }
    
    // Particle movement animation
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      particles.forEach((particle, i) => {
        const angle = (i / action.count) * Math.PI * 2;
        const radius = (Math.sin(frame.time * 0.001 * action.speed) + 1) * action.spread * this.stage!.width();
        particle.x(centerX + Math.cos(angle) * radius);
        particle.y(centerY + Math.sin(angle) * radius);
      });
    }, this.currentLayer);
    
    anim.start();
    
    // Store animation for cleanup
    (particles as any)._particleAnim = anim;
  }
  
  /**
   * Draw arrow with animation
   */
  private async drawArrow(from: number[], to: number[], color?: string, label?: string): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const fromX = from[0] * this.stage.width();
    const fromY = from[1] * this.stage.height();
    const toX = to[0] * this.stage.width();
    const toY = to[1] * this.stage.height();
    
    // Arrow line
    const arrow = new Konva.Arrow({
      points: [fromX, fromY, fromX, fromY],
      stroke: color || '#dc2626',
      strokeWidth: 2,
      fill: color || '#dc2626',
      pointerLength: 10,
      pointerWidth: 10
    });
    
    this.currentLayer.add(arrow);
    
    // Animate arrow drawing
    return new Promise(resolve => {
      new Konva.Tween({
        node: arrow,
        duration: 0.5,
        points: [fromX, fromY, toX, toY],
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          // Add label if provided
          if (label) {
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            const text = new Konva.Text({
              text: label,
              x: midX - 30,
              y: midY - 10,
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              fill: color || '#dc2626',
              opacity: 0
            });
            
            this.currentLayer!.add(text);
            
            new Konva.Tween({
              node: text,
              duration: 0.3,
              opacity: 1,
              onFinish: resolve
            }).play();
          } else {
            resolve();
          }
        }
      }).play();
    });
  }
  
  /**
   * Pause playback
   */
  public pause(): void {
    this.animationQueue.pause();
  }
  
  /**
   * Resume playback
   */
  public resume(): void {
    this.animationQueue.resume();
  }
  
  /**
   * Skip to next step
   */
  public nextStep(): void {
    this.animationQueue.nextStep();
  }
  
  /**
   * Go to previous step
   */
  public previousStep(): void {
    this.animationQueue.previousStep();
  }
  
  /**
   * Get stage reference
   */
  public getStage(): Konva.Stage | null {
    return this.stage;
  }
  
  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
