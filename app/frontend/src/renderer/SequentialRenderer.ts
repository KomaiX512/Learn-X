/**
 * Sequential Renderer with Optimized Animations
 * Ensures one action at a time with proper delays for comprehension
 */

import Konva from 'konva';
import { AnimationQueue } from './AnimationQueue';
import { DomainRenderers } from './DomainRenderers';

export interface RendererConfig {
  // Either provide an existing stage/overlay (preferred) or a canvasId to create one
  canvasId?: string;
  stage?: Konva.Stage;
  overlay?: HTMLDivElement;
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
  private domainRenderers: DomainRenderers | null = null;
  // Track all active animations for cleanup
  private activeAnimations: Konva.Animation[] = [];
  // Track failed actions for reporting (but continue anyway)
  private failedActions: Array<{ op: string; error: string }> = [];
  
  constructor(config: RendererConfig) {
    this.initializeStage(config);
    this.animationQueue = new AnimationQueue(this);
    
    // Set callbacks
    if (config.onStepComplete || config.onProgress) {
      this.animationQueue.setCallbacks(config.onStepComplete, config.onProgress);
    }
  }
  
  private initializeStage(config: RendererConfig): void {
    // Reuse provided stage/overlay to avoid dual-stage conflicts
    if (config.stage) {
      this.stage = config.stage;
      // Apply provided size without re-creation
      if (config.width) this.stage.width(config.width);
      if (config.height) this.stage.height(config.height);

      // Ensure at least one layer exists for initial drawings
      this.currentLayer = new Konva.Layer();
      this.stage.add(this.currentLayer);

      // Initialize domain renderers bound to current layer
      this.domainRenderers = new DomainRenderers(this.stage, this.currentLayer);

      // Overlay handling
      const container = this.stage.container();
      container.style.position = 'relative';
      if (config.overlay) {
        this.overlay = config.overlay;
        // Normalize overlay styling
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '10';
        if (this.overlay.parentElement !== container) {
          try { container.appendChild(this.overlay); } catch {}
        }
      } else {
        // Create overlay if not provided
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.zIndex = '10';
        container.appendChild(this.overlay);
      }

      console.log('[SequentialRenderer] Stage initialized (reused external stage)');
      return;
    }

    // Otherwise create a new stage by canvasId
    const container = config.canvasId ? document.getElementById(config.canvasId) : null;
    if (!container) {
      console.error(`[SequentialRenderer] Container ${config.canvasId} not found`);
      return;
    }

    this.stage = new Konva.Stage({
      container: config.canvasId!,
      width: config.width || container.clientWidth,
      height: config.height || container.clientHeight
    });

    this.currentLayer = new Konva.Layer();
    this.stage.add(this.currentLayer);
    this.domainRenderers = new DomainRenderers(this.stage, this.currentLayer);

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

    console.log('[SequentialRenderer] Stage initialized (created new)');
  }
  
  /**
   * Process a chunk of actions sequentially
   */
  public processChunk(chunk: any): void {
    if (!chunk.actions || !Array.isArray(chunk.actions)) {
      console.error('[SequentialRenderer] Invalid chunk:', chunk);
      return;
    }
    
    console.log(`[SequentialRenderer] 🎬 Processing ${chunk.actions.length} actions for step ${chunk.stepId}`);
    
    // CRITICAL: When starting a NEW step, clear previous step's content
    if (this.currentStepId !== null && this.currentStepId !== chunk.stepId) {
      console.log(`[SequentialRenderer] 🔄 NEW STEP DETECTED: ${this.currentStepId} → ${chunk.stepId}`);
      console.log(`[SequentialRenderer] 🧹 CLEARING previous step content SYNCHRONOUSLY...`);
      
      // HARD RESET the animation queue immediately (stops everything)
      this.animationQueue.hardReset();
      
      // FIX: Use await to prevent race condition
      (async () => {
        await this.clearStepSynchronously();
        console.log('[SequentialRenderer] ✅ Cleanup complete, creating new layer');
        this.createNewStepLayer(chunk.stepId);
        this.enqueueActions(chunk);
        
        // CRITICAL FIX: Resume playback after hard reset
        console.log('[SequentialRenderer] 🎬 Resuming playback for new step');
        this.animationQueue.resume();
      })();
      return;
      
    } else {
      // First step or continuing same step - just create layer if needed
      if (this.currentStepId !== chunk.stepId) {
        this.createNewStepLayer(chunk.stepId);
      }
      this.enqueueActions(chunk);
    }
  }
  
  /**
   * Create a new layer for a step
   */
  private createNewStepLayer(stepId: number): void {
    this.currentStepId = stepId;
    this.currentLayer = new Konva.Layer();
    this.currentLayer.opacity(0); // Start invisible
    this.stage?.add(this.currentLayer);
    
    // Re-bind domain renderers to the new layer
    if (this.stage && this.currentLayer) {
      this.domainRenderers = new DomainRenderers(this.stage, this.currentLayer);
    }
    
    // Fade in the new layer
    new Konva.Tween({
      node: this.currentLayer,
      duration: 0.5,
      opacity: 1
    }).play();
    
    console.log(`[SequentialRenderer] ✅ Created fresh layer for step ${stepId}`);
  }
  
  /**
   * Stop all active animations to prevent memory leaks
   */
  private stopAllAnimations(): void {
    console.log(`[SequentialRenderer] Stopping ${this.activeAnimations.length} active animations`);
    
    // Stop all tracked animations
    this.activeAnimations.forEach(anim => {
      try {
        anim.stop();
      } catch (error) {
        console.error('[SequentialRenderer] Error stopping animation:', error);
      }
    });
    
    // Clear the array
    this.activeAnimations = [];
    
    // Also stop any global Konva animations not in our tracker
    if (typeof Konva !== 'undefined' && Konva.Animation) {
      const globalAnimations = (Konva.Animation as any).animations || [];
      globalAnimations.forEach((anim: Konva.Animation) => {
        try {
          anim.stop();
        } catch (error) {
          // Silent fail for animations we don't control
        }
      });
    }
    
    console.log('[SequentialRenderer] ✅ All animations stopped and cleaned up');
  }
  
  /**
   * Synchronously clear all content for step transition (Promise-based, no setTimeout race conditions)
   */
  private async clearStepSynchronously(): Promise<void> {
    console.log('[SequentialRenderer] 🧹 Starting synchronous step cleanup...');
    
    // 1. Stop all animations FIRST
    this.stopAllAnimations();
    console.log('[SequentialRenderer] ✅ Animations stopped');
    
    // 2. Clear math overlay
    if (this.overlay) {
      this.overlay.innerHTML = '';
      console.log('[SequentialRenderer] ✅ Overlay cleared');
    }
    
    // 3. Destroy all layers with Promise-based fade
    if (this.stage) {
      const allLayers = this.stage.getLayers();
      console.log(`[SequentialRenderer] Fading out ${allLayers.length} layers...`);
      
      const fadePromises = allLayers.map((layer, idx) => {
        return new Promise<void>(resolve => {
          const tween = new Konva.Tween({
            node: layer,
            duration: 0.3, // Faster fade for smoother transitions
            opacity: 0,
            onFinish: () => {
              layer.destroyChildren(); // Clean up all children first
              layer.destroy();
              console.log(`[SequentialRenderer] ✅ Destroyed layer ${idx}`);
              resolve();
            }
          });
          tween.play();
        });
      });
      
      await Promise.all(fadePromises);
      console.log('[SequentialRenderer] ✅ All layers destroyed');
    }
    
    console.log('[SequentialRenderer] ✅ Synchronous cleanup complete');
  }
  
  /**
   * Enqueue actions for playback
   */
  private enqueueActions(chunk: any): void {
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
    
    // CRITICAL ERROR HANDLING: Wrap in try-catch to prevent one error from stopping all rendering
    try {
      console.log(`[SequentialRenderer] 🎬 Processing: ${action.op}`);
      await this.processActionInternal(action, section);
      console.log(`[SequentialRenderer] ✅ Completed: ${action.op}`);
    } catch (error: any) {
      console.error(`[SequentialRenderer] ❌ ERROR processing ${action.op}:`, error);
      console.error(`[SequentialRenderer] Error stack:`, error?.stack);
      console.error(`[SequentialRenderer] Action data:`, JSON.stringify(action).substring(0, 200));
      
      // Track failed action for reporting
      this.failedActions.push({
        op: action.op,
        error: error?.message || String(error)
      });
      
      // CRITICAL: Don't show error on canvas (too distracting)
      // Just log it and continue - lecture quality > perfect rendering
      console.log(`[SequentialRenderer] ⏭️  Skipping failed action and continuing...`);
      console.log(`[SequentialRenderer] Total failures so far: ${this.failedActions.length}`);
      
      // If too many failures, report once
      if (this.failedActions.length === 5) {
        console.warn(`[SequentialRenderer] ⚠️  5 actions failed - system continues but quality may be affected`);
      }
    }
  }
  
  /**
   * Internal action processing with error boundary
   */
  private async processActionInternal(action: any, section: any): Promise<void> {
    if (!this.stage || !this.currentLayer) {
      console.warn(`[SequentialRenderer] No stage or layer for ${action.op}`);
      return;
    }
    
    // Validate action has required operation
    if (!action.op) {
      console.error('[SequentialRenderer] Action missing "op" field:', action);
      return;
    }
    
    console.log(`[SequentialRenderer] 🔍 Routing ${action.op} to handler`);
    
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
        
      case 'drawVector':
        await this.drawVector(action.x1, action.y1, action.x2, action.y2, action.color, action.label);
        break;
        
      case 'drawLine':
        // Transform backend format {x1,y1,x2,y2,stroke,strokeWidth} to function signature
        await this.drawLine(
          [action.x1, action.y1, action.x2, action.y2],
          action.stroke || action.color,
          action.strokeWidth || action.width
        );
        break;
        
      // V2 Domain-specific operations
      case 'drawCircuitElement':
        if (this.domainRenderers) {
          console.log('[SequentialRenderer] 🔌 Rendering circuit element:', action.type);
          await this.domainRenderers.drawCircuitElement(action);
        } else {
          console.warn('[SequentialRenderer] ⚠️ No domain renderers available for circuit element');
        }
        break;
        
      case 'drawSignalWaveform':
        if (this.domainRenderers) {
          await this.domainRenderers.drawSignalWaveform(action);
        }
        break;
        
      case 'drawConnection':
        if (this.domainRenderers) {
          await this.domainRenderers.drawConnection(action);
        }
        break;
        
      case 'drawForceVector':
        if (this.domainRenderers) {
          await this.domainRenderers.drawForceVector(action);
        }
        break;
        
      case 'drawMolecule':
        if (this.domainRenderers) {
          await this.domainRenderers.drawMolecule(action);
        }
        break;
        
      case 'drawPhysicsObject':
        if (this.domainRenderers) {
          await this.domainRenderers.drawPhysicsObject(action);
        }
        break;
        
      case 'drawAtom':
        if (this.domainRenderers) {
          await this.domainRenderers.drawAtom(action);
        }
        break;
        
      case 'drawDataStructure':
        if (this.domainRenderers) {
          await this.domainRenderers.drawDataStructure(action);
        }
        break;
        
      case 'drawNeuralNetwork':
        if (this.domainRenderers) {
          console.log('[SequentialRenderer] 🧠 Rendering neural network:', action.layers);
          await this.domainRenderers.drawNeuralNetwork(action);
        } else {
          console.warn('[SequentialRenderer] ⚠️ No domain renderers available for neural network');
        }
        break;
        
      case 'drawOrganSystem':
        if (this.domainRenderers) {
          await this.domainRenderers.drawOrganSystem(action);
        }
        break;
        
      case 'drawMembrane':
        if (this.domainRenderers) {
          await this.domainRenderers.drawMembrane(action);
        }
        break;
        
      case 'drawReaction':
        if (this.domainRenderers) {
          await this.domainRenderers.drawReaction(action);
        }
        break;
        
      case 'animate':
        if (this.domainRenderers) {
          await this.domainRenderers.animate(action);
        }
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
        
      case 'customPath':
        await this.drawCustomPath(action);
        break;
        
      // NEW ADVANCED OPERATIONS
      case 'latex':
        await this.renderLatex(action.equation, action.x, action.y, action.size, action.color, action.animated);
        break;
        
      case 'graph':
        await this.drawGraph(action.function, action.xMin, action.xMax, action.yMin, action.yMax,
                           action.gridOn, action.lineColor, action.gridColor);
        break;
        
      case 'simulate':
        await this.runSimulation(action.type, action.x, action.y, action.params);
        break;
        
      case 'linearMotion':
        await this.animateLinearMotion(action.startX, action.startY, action.endX, action.endY,
                                      action.duration, action.label, action.color);
        break;
        
      case 'circularMotion':
        await this.animateCircularMotion(action.centerX, action.centerY, action.radius,
                                        action.angularVelocity, action.color, action.object);
        break;
        
      case 'flowchart':
        await this.drawFlowchart(action.nodes, action.edges, action.x, action.y, action.scale);
        break;
        
      case 'neuralNetwork':
        await this.drawNeuralNetwork(action.layers, action.x, action.y, action.activation, action.showWeights);
        break;
        
      case 'delay':
      case 'drawDelay':
        // Duration is ALREADY in milliseconds from backend, use directly
        const delayMs = action.duration || 1000;
        console.log(`[SequentialRenderer] ⏱️  Delaying for ${delayMs}ms (${(delayMs/1000).toFixed(1)}s)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        console.log(`[SequentialRenderer] ✅ Delay complete`);
        break;
        
      case 'drawFlowchart':
        if (this.domainRenderers) {
          await this.domainRenderers.drawFlowchart(action);
        } else {
          console.warn('[SequentialRenderer] drawFlowchart: DomainRenderers not available');
        }
        break;
        
      case 'drawCoordinateSystem':
        if (this.domainRenderers) {
          await this.domainRenderers.drawCoordinateSystem(action);
        } else {
          console.warn('[SequentialRenderer] drawCoordinateSystem: DomainRenderers not available');
        }
        break;
        
      case 'drawGeometry':
        if (this.domainRenderers) {
          await this.domainRenderers.drawGeometry(action);
        } else {
          console.warn('[SequentialRenderer] drawGeometry: DomainRenderers not available');
        }
        break;
        
      case 'drawAlgorithmStep':
        if (this.domainRenderers) {
          await this.domainRenderers.drawAlgorithmStep(action);
        } else {
          console.warn('[SequentialRenderer] drawAlgorithmStep: DomainRenderers not available');
        }
        break;
        
      case 'drawTrajectory':
        if (this.domainRenderers) {
          await this.domainRenderers.drawTrajectory(action);
        } else {
          console.warn('[SequentialRenderer] drawTrajectory: DomainRenderers not available');
        }
        break;
        
      case 'drawFieldLines':
        if (this.domainRenderers) {
          await this.domainRenderers.drawFieldLines(action);
        } else {
          console.warn('[SequentialRenderer] drawFieldLines: DomainRenderers not available');
        }
        break;
        
      case 'drawCellStructure':
        if (this.domainRenderers) {
          await this.domainRenderers.drawCellStructure(action);
        } else {
          console.warn('[SequentialRenderer] drawCellStructure: DomainRenderers not available');
        }
        break;
        
      case 'drawMolecularStructure':
        if (this.domainRenderers) {
          await this.domainRenderers.drawMolecularStructure(action);
        } else {
          console.warn('[SequentialRenderer] drawMolecularStructure: DomainRenderers not available');
        }
        break;
        
      case 'drawBond':
        if (this.domainRenderers) {
          await this.domainRenderers.drawBond(action);
        } else {
          console.warn('[SequentialRenderer] drawBond: DomainRenderers not available');
        }
        break;
        
      case 'drawLatex':
        // Render LaTeX equation
        await this.renderLatex(action.equation || action.text, action.x, action.y, action.size, action.color, action.animated);
        break;
        
      case 'drawMathLabel':
        // Math labels are just LaTeX equations
        await this.renderLatex(action.tex || action.equation || action.text, action.x, action.y, action.size || action.fontSize, action.color, action.animated);
        break;
        
      case 'drawDiagram':
        // Delegate to domain renderers or render as placeholder
        if (this.domainRenderers && action.type) {
          console.log(`[SequentialRenderer] 📊 Rendering diagram: ${action.type}`);
          // Domain renderers will handle specific diagram types
          if (action.type === 'neuralNetwork') {
            await this.domainRenderers.drawNeuralNetwork(action);
          } else {
            console.warn(`[SequentialRenderer] Diagram type ${action.type} not implemented`);
          }
        }
        break;
        
      default:
        console.error(`[SequentialRenderer] ❌ UNIMPLEMENTED OPERATION: ${action.op}`);
        console.error(`[SequentialRenderer] Action data:`, JSON.stringify(action).substring(0, 200));
        // Don't silently fail - render a placeholder
        await this.renderPlaceholder(action.op, action.x || 0.5, action.y || 0.5);
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
      fill: '#667eea',
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
    this.currentLayer.batchDraw();
    
    // Animate in with TIMEOUT SAFETY
    return new Promise(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          console.log('[SequentialRenderer] drawTitle animation completed');
          resolve();
        }
      };
      
      // Safety timeout - resolve after duration + buffer
      setTimeout(safeResolve, (duration * 1000) + 100);
      
      try {
        const tween = new Konva.Tween({
          node: titleGroup,
          duration,
          opacity: 1,
          y: titleGroup.y() + 10,
          easing: Konva.Easings.EaseOut,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        console.error('[SequentialRenderer] Tween error:', error);
        safeResolve();
      }
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
      fill: color || '#ffffff',  // WHITE text for visibility!
      fontStyle: options?.italic ? 'italic' : 'normal',
      fontWeight: options?.bold ? 'bold' : 'normal'
    });
    
    this.currentLayer.add(label);
    
    // Typewriter effect with TIMEOUT SAFETY
    return new Promise(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          console.log('[SequentialRenderer] drawLabel typewriter completed');
          resolve();
        }
      };
      
      // Safety timeout - 30ms per character + buffer
      setTimeout(safeResolve, (text.length * 30) + 100);
      
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          label.text(text.slice(0, currentIndex));
          this.currentLayer!.batchDraw();
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          safeResolve();
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
      stroke: color || '#00d9ff',  // Bright cyan!
      strokeWidth: 3,
      fill: fill ? (color || '#00d9ff') : undefined,
      opacity: fill ? 0.3 : 1
    });
    
    this.currentLayer.add(circle);
    this.currentLayer.batchDraw();
    
    // Animate radius expansion with TIMEOUT SAFETY
    return new Promise(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      
      setTimeout(safeResolve, 600);  // 0.5s + buffer
      
      try {
        const tween = new Konva.Tween({
          node: circle,
          duration: 0.5,
          radius: radius * Math.min(this.stage!.width(), this.stage!.height()),
          easing: Konva.Easings.EaseOut,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        console.error('[SequentialRenderer] drawCircle tween error:', error);
        safeResolve();
      }
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
      stroke: color || '#00ff88',  // Bright green!
      strokeWidth: 3,
      fill: fill ? (color || '#00ff88') : undefined,
      opacity: fill ? 0.3 : 1,
      cornerRadius: 4
    });
    
    this.currentLayer.add(rect);
    this.currentLayer.batchDraw();
    
    // Animate size expansion with TIMEOUT SAFETY
    return new Promise(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      
      setTimeout(safeResolve, 700);  // 0.6s + buffer
      
      try {
        const tween = new Konva.Tween({
          node: rect,
          duration: 0.6,
          width: width * this.stage!.width(),
          height: height * this.stage!.height(),
          easing: Konva.Easings.EaseOut,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        console.error('[SequentialRenderer] drawRect tween error:', error);
        safeResolve();
      }
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
    
    // CRITICAL: Track animation for cleanup to prevent memory leaks
    this.activeAnimations.push(anim);
    console.log(`[SequentialRenderer] Tracking orbit animation (total: ${this.activeAnimations.length})`);
  }
  
  /**
   * Create wave animation
   */
  private async createWaveAnimation(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    // CRITICAL FIX: Validate all required properties to prevent NaN
    const amplitude = (action.amplitude || 0.05) * this.stage.height();
    const frequency = action.frequency || 2;
    const speed = action.speed || 1;
    
    // Support both old format (y) and new format (startY)
    const startY = action.startY !== undefined ? action.startY : action.y || 0.5;
    const y = startY * this.stage.height();
    
    // Validate numbers
    if (isNaN(amplitude) || isNaN(frequency) || isNaN(y) || isNaN(speed)) {
      console.error('[SequentialRenderer] Invalid wave parameters:', { amplitude, frequency, y, speed });
      return;
    }
    
    const points: number[] = [];
    
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
      const phase = frame.time * 0.001 * speed;
      
      for (let x = 0; x <= this.stage!.width(); x += 5) {
        const waveY = y + Math.sin((x / this.stage!.width()) * frequency * Math.PI * 2 + phase) * amplitude;
        
        // CRITICAL: Validate before pushing to prevent NaN pollution
        if (!isNaN(waveY)) {
          newPoints.push(x, waveY);
        }
      }
      
      // Only update if we have valid points
      if (newPoints.length > 0) {
        line.points(newPoints);
      }
    }, this.currentLayer);
    
    anim.start();
    
    // CRITICAL: Track animation for cleanup to prevent memory leaks
    this.activeAnimations.push(anim);
    console.log(`[SequentialRenderer] Tracking wave animation (total: ${this.activeAnimations.length})`);
  }
  
  /**
   * Create particle animation
   */
  private async createParticleAnimation(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    // CRITICAL FIX: Handle both center format and x/y format
    let centerX, centerY;
    if (action.center && Array.isArray(action.center) && action.center.length === 2) {
      centerX = action.center[0] * this.stage.width();
      centerY = action.center[1] * this.stage.height();
    } else if (action.x !== undefined && action.y !== undefined) {
      centerX = action.x * this.stage.width();
      centerY = action.y * this.stage.height();
    } else {
      console.error('[SequentialRenderer] Invalid particle action - missing center or x/y:', action);
      return;
    }
    
    // Validate numbers
    if (isNaN(centerX) || isNaN(centerY)) {
      console.error('[SequentialRenderer] Invalid particle center:', { centerX, centerY });
      return;
    }
    
    const particles: Konva.Circle[] = [];
    
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
    
    // CRITICAL: Track animation for cleanup to prevent memory leaks
    this.activeAnimations.push(anim);
    console.log(`[SequentialRenderer] Tracking particle animation (total: ${this.activeAnimations.length})`);
  }
  
  /**
   * Scale SVG path coordinates from normalized (0.0-1.0) to pixels
   * CRITICAL FIX for invisible paths issue
   */
  private scalePathCoordinates(pathData: string, width: number, height: number): string {
    if (!pathData) return '';
    
    // Replace all number pairs in the path with scaled versions
    return pathData.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (match, x, y) => {
      const scaledX = parseFloat(x) * width;
      const scaledY = parseFloat(y) * height;
      return `${scaledX.toFixed(2)},${scaledY.toFixed(2)}`;
    });
  }
  
  /**
   * Draw custom SVG path (CRITICAL FIX: Scaled coordinates)
   */
  private async drawCustomPath(action: any): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    try {
      console.log(`[SequentialRenderer] 🎨 Drawing custom path: ${action.path?.substring(0, 50)}...`);
      
      // CRITICAL FIX: Scale normalized coordinates (0.0-1.0) to pixel coordinates
      const scaledPath = this.scalePathCoordinates(action.path, this.stage.width(), this.stage.height());
      
      // Parse SVG path and create Konva.Path
      const path = new Konva.Path({
        data: scaledPath,
        x: (action.x || 0) * this.stage.width(),
        y: (action.y || 0) * this.stage.height(),
        scale: { x: action.scale || 1, y: action.scale || 1 },
        stroke: action.stroke || '#00d9ff',
        strokeWidth: action.strokeWidth || 2,
        fill: action.fill || 'transparent',
        opacity: 0
      });
      
      // Add glow effect if requested
      if (action.glow) {
        path.shadowColor(action.stroke || '#00d9ff');
        path.shadowBlur(15);
        path.shadowOpacity(0.8);
      }
      
      this.currentLayer.add(path);
      
      // Animate in with fade and scale
      return new Promise(resolve => {
        new Konva.Tween({
          node: path,
          duration: 0.6,
          opacity: action.fill === 'transparent' ? 1 : 0.7,
          scaleX: (action.scale || 1) * 1.05,
          scaleY: (action.scale || 1) * 1.05,
          easing: Konva.Easings.EaseOut,
          onFinish: () => {
            // Scale back slightly for bounce effect
            new Konva.Tween({
              node: path,
              duration: 0.2,
              scaleX: action.scale || 1,
              scaleY: action.scale || 1,
              onFinish: resolve
            }).play();
          }
        }).play();
      });
    } catch (error) {
      console.error('[SequentialRenderer] ❌ customPath error:', error);
      console.error('[SequentialRenderer] Path data:', action.path);
      // Don't fail silently - render a placeholder
      await this.renderPlaceholder('customPath', action.x || 0.5, action.y || 0.5);
    }
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
   * Render LaTeX equation using KaTeX - PRODUCTION GRADE
   */
  private async renderLatex(equation: string, x: number, y: number, size: number, color: string, animated: boolean): Promise<void> {
    if (!this.stage || !this.overlay) return;
    
    console.log(`[SequentialRenderer] 🔢 Rendering LaTeX: "${equation}"`);
    
    // Create container for the LaTeX
    const latexContainer = document.createElement('div');
    latexContainer.className = 'latex-equation';
    latexContainer.style.position = 'absolute';
    latexContainer.style.left = `${x * this.stage.width()}px`;
    latexContainer.style.top = `${y * this.stage.height()}px`;
    latexContainer.style.fontSize = `${size}px`;
    latexContainer.style.opacity = '0';
    latexContainer.style.padding = '12px 16px';
    latexContainer.style.background = 'rgba(0, 0, 0, 0.85)';
    latexContainer.style.borderRadius = '8px';
    latexContainer.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    latexContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    latexContainer.style.backdropFilter = 'blur(10px)';
    latexContainer.style.transform = 'translateY(-10px)';
    latexContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    try {
      // Try to use KaTeX for proper rendering
      if (typeof (window as any).katex !== 'undefined') {
        console.log('[SequentialRenderer] ✅ KaTeX available, rendering...');
        (window as any).katex.render(equation, latexContainer, {
          throwOnError: false,
          displayMode: true,
          output: 'html',
          trust: true,
          macros: {
            "\\RR": "\\mathbb{R}",
            "\\NN": "\\mathbb{N}",
            "\\ZZ": "\\mathbb{Z}",
            "\\QQ": "\\mathbb{Q}"
          }
        });
        
        // Apply custom color to KaTeX output
        const katexHtml = latexContainer.querySelector('.katex');
        if (katexHtml) {
          (katexHtml as HTMLElement).style.color = color || '#ffffff';
          (katexHtml as HTMLElement).style.fontSize = `${size}px`;
        }
      } else {
        // KaTeX not loaded - try dynamic import
        console.log('[SequentialRenderer] ⚠️ KaTeX not loaded, attempting dynamic import...');
        
        try {
          const katex = await import('katex');
          
          // Also import KaTeX CSS if not already loaded
          if (!document.querySelector('link[href*="katex.min.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
            document.head.appendChild(link);
          }
          
          katex.default.render(equation, latexContainer, {
            throwOnError: false,
            displayMode: true,
            output: 'html',
            trust: true
          });
          
          console.log('[SequentialRenderer] ✅ KaTeX dynamically imported and rendered!');
          
          // Apply custom color
          const katexHtml = latexContainer.querySelector('.katex');
          if (katexHtml) {
            (katexHtml as HTMLElement).style.color = color || '#ffffff';
            (katexHtml as HTMLElement).style.fontSize = `${size}px`;
          }
        } catch (importError) {
          // Fallback to enhanced plain text rendering
          console.warn('[SequentialRenderer] ⚠️ KaTeX import failed, using enhanced fallback:', importError);
          this.renderLatexFallback(equation, latexContainer, color, size);
        }
      }
    } catch (error) {
      console.error('[SequentialRenderer] ❌ KaTeX rendering error:', error);
      // Fallback to enhanced plain text
      this.renderLatexFallback(equation, latexContainer, color, size);
    }
    
    this.overlay.appendChild(latexContainer);
    
    // Animate in
    return new Promise(resolve => {
      setTimeout(() => {
        latexContainer.style.opacity = '1';
        latexContainer.style.transform = 'translateY(0)';
        setTimeout(resolve, animated ? 500 : 100);
      }, 100);
    });
  }
  
  /**
   * Enhanced fallback for LaTeX when KaTeX is unavailable
   */
  private renderLatexFallback(equation: string, container: HTMLElement, color: string, size: number): void {
    console.log('[SequentialRenderer] 📝 Using enhanced LaTeX fallback');
    
    // Clean up LaTeX syntax for better readability
    let cleaned = equation
      .replace(/\\\\/g, '\n')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\int/g, '∫')
      .replace(/\\sum/g, '∑')
      .replace(/\\prod/g, '∏')
      .replace(/\\lim/g, 'lim')
      .replace(/\\to/g, '→')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\Sigma/g, 'Σ')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·')
      .replace(/\^\{([^}]+)\}/g, (_, sup) => this.toSuperscript(sup))
      .replace(/\_\{([^}]+)\}/g, (_, sub) => this.toSubscript(sub))
      .replace(/\{([^}]+)\}/g, '$1')
      .replace(/\\/g, '');
    
    container.innerHTML = `<pre style="
      font-family: 'Times New Roman', 'Computer Modern', serif;
      font-size: ${size}px;
      color: ${color || '#ffffff'};
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.4;
      text-align: center;
      font-style: italic;
    ">${cleaned}</pre>`;
    
    // Add notice that KaTeX is recommended
    const notice = document.createElement('div');
    notice.style.fontSize = '10px';
    notice.style.color = 'rgba(255, 255, 255, 0.5)';
    notice.style.marginTop = '4px';
    notice.style.textAlign = 'center';
    notice.textContent = '(Enhanced text mode - KaTeX recommended for best quality)';
    container.appendChild(notice);
  }
  
  /**
   * Convert to superscript unicode
   */
  private toSuperscript(text: string): string {
    const map: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ'
    };
    return text.split('').map(c => map[c] || c).join('');
  }
  
  /**
   * Convert to subscript unicode
   */
  private toSubscript(text: string): string {
    const map: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
      'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ',
      's': 'ₛ', 't': 'ₜ'
    };
    return text.split('').map(c => map[c] || c).join('');
  }
  
  /**
   * Draw a mathematical graph
   */
  private async drawGraph(func: string, xMin: number, xMax: number, yMin: number, yMax: number, 
                         gridOn: boolean, lineColor: string, gridColor: string): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const width = this.stage.width();
    const height = this.stage.height();
    
    // Draw grid if requested
    if (gridOn) {
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        const y = (i / 10) * height;
        
        // Vertical lines
        const vLine = new Konva.Line({
          points: [x, 0, x, height],
          stroke: gridColor,
          strokeWidth: 1,
          opacity: 0.3
        });
        this.currentLayer.add(vLine);
        
        // Horizontal lines
        const hLine = new Konva.Line({
          points: [0, y, width, y],
          stroke: gridColor,
          strokeWidth: 1,
          opacity: 0.3
        });
        this.currentLayer.add(hLine);
      }
    }
    
    // Draw the function curve
    const points: number[] = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = xMin + t * (xMax - xMin);
      
      // Evaluate the function (simplified - in production would use a proper parser)
      let y = 0;
      try {
        // Basic evaluation for simple functions
        if (func.includes('x^2')) y = x * x;
        else if (func.includes('sin')) y = Math.sin(x);
        else if (func.includes('cos')) y = Math.cos(x);
        else y = x; // Default linear
      } catch (e) {
        y = 0;
      }
      
      const px = ((x - xMin) / (xMax - xMin)) * width;
      const py = height - ((y - yMin) / (yMax - yMin)) * height;
      
      points.push(px, py);
    }
    
    const curve = new Konva.Line({
      points,
      stroke: lineColor,
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round'
    });
    
    this.currentLayer.add(curve);
  }
  
  /**
   * Run physics simulation
   */
  private async runSimulation(type: string, x: number, y: number, params: any[]): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const px = x * this.stage.width();
    const py = y * this.stage.height();
    
    switch (type) {
      case 'pendulum':
        // Create pendulum simulation
        const length = parseFloat(params[0]) || 0.3;
        const mass = parseFloat(params[1]) || 1;
        
        const pendulum = new Konva.Circle({
          x: px,
          y: py + length * this.stage.height(),
          radius: mass * 10,
          fill: '#3498db'
        });
        
        const rod = new Konva.Line({
          points: [px, py, px, py + length * this.stage.height()],
          stroke: '#666',
          strokeWidth: 2
        });
        
        this.currentLayer.add(rod);
        this.currentLayer.add(pendulum);
        
        // Animate pendulum swing
        const anim = new Konva.Animation((frame: any) => {
          const angle = Math.sin(frame.time * 0.002) * 0.5;
          const newX = px + Math.sin(angle) * length * this.stage!.height();
          const newY = py + Math.cos(angle) * length * this.stage!.height();
          
          pendulum.x(newX);
          pendulum.y(newY);
          rod.points([px, py, newX, newY]);
        }, this.currentLayer);
        
        anim.start();
        
        // Stop after 3 seconds
        setTimeout(() => anim.stop(), 3000);
        break;
    }
  }
  
  /**
   * Animate linear motion
   */
  private async animateLinearMotion(startX: number, startY: number, endX: number, endY: number,
                                   duration: number, label: string, color: string): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const object = new Konva.Circle({
      x: startX * this.stage.width(),
      y: startY * this.stage.height(),
      radius: 10,
      fill: color
    });
    
    if (label) {
      const text = new Konva.Text({
        text: label,
        x: startX * this.stage.width() - 20,
        y: startY * this.stage.height() - 25,
        fill: color,
        fontSize: 14
      });
      this.currentLayer.add(text);
    }
    
    this.currentLayer.add(object);
    
    return new Promise(resolve => {
      new Konva.Tween({
        node: object,
        duration,
        x: endX * this.stage!.width(),
        y: endY * this.stage!.height(),
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Animate circular motion
   */
  private async animateCircularMotion(centerX: number, centerY: number, radius: number,
                                     angularVelocity: number, color: string, objectType: string): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const cx = centerX * this.stage.width();
    const cy = centerY * this.stage.height();
    const r = radius * this.stage.width();
    
    const object = new Konva.Circle({
      x: cx + r,
      y: cy,
      radius: 8,
      fill: color
    });
    
    this.currentLayer.add(object);
    
    // Create circular motion animation
    const anim = new Konva.Animation((frame: any) => {
      const angle = (frame.time * angularVelocity * 0.001) % (2 * Math.PI);
      object.x(cx + r * Math.cos(angle));
      object.y(cy + r * Math.sin(angle));
    }, this.currentLayer);
    
    anim.start();
    
    // Stop after 3 seconds
    setTimeout(() => anim.stop(), 3000);
  }
  
  /**
   * Draw flowchart diagram
   */
  private async drawFlowchart(nodes: any[], edges: any[], x: number, y: number, scale: number): Promise<void> {
    // Simplified flowchart rendering
    // In production, would use a proper graph layout algorithm
    console.log('[SequentialRenderer] Flowchart rendering not yet implemented');
  }
  
  /**
   * Draw neural network visualization
   */
  private async drawNeuralNetwork(layers: number[], x: number, y: number, activation: string, showWeights: boolean): Promise<void> {
    // Simplified neural network rendering
    // In production, would render proper network visualization
    console.log('[SequentialRenderer] Neural network rendering not yet implemented');
  }
  
  /**
   * Draw vector with arrow
   */
  private async drawVector(x1: number, y1: number, x2: number, y2: number, color: string, label: string): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const arrow = new Konva.Arrow({
      points: [
        x1 * this.stage.width(),
        y1 * this.stage.height(),
        x2 * this.stage.width(),
        y2 * this.stage.height()
      ],
      pointerLength: 10,
      pointerWidth: 10,
      fill: color,
      stroke: color,
      strokeWidth: 2
    });
    
    this.currentLayer.add(arrow);
    
    if (label) {
      const midX = (x1 + x2) / 2 * this.stage.width();
      const midY = (y1 + y2) / 2 * this.stage.height();
      
      const text = new Konva.Text({
        text: label,
        x: midX,
        y: midY - 20,
        fill: color,
        fontSize: 14
      });
      
      this.currentLayer.add(text);
    }
  }
  
  /**
   * Render placeholder for unimplemented operations
   */
  private async renderPlaceholder(operation: string, x: number, y: number): Promise<void> {
    if (!this.stage || !this.currentLayer) return;
    
    const px = x * this.stage.width();
    const py = y * this.stage.height();
    
    // Warning box
    const box = new Konva.Rect({
      x: px - 60,
      y: py - 20,
      width: 120,
      height: 40,
      fill: '#fff3cd',
      stroke: '#ffc107',
      strokeWidth: 2,
      cornerRadius: 5
    });
    
    // Warning text
    const text = new Konva.Text({
      x: px - 55,
      y: py - 8,
      text: `TODO: ${operation}`,
      fontSize: 12,
      fill: '#856404',
      width: 110,
      align: 'center'
    });
    
    this.currentLayer.add(box);
    this.currentLayer.add(text);
    this.currentLayer.batchDraw();
    
    console.warn(`[SequentialRenderer] ⚠️ Placeholder rendered for: ${operation}`);
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
