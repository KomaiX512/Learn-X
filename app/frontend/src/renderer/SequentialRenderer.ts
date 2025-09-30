/**
 * Sequential Renderer with Optimized Animations
 * Ensures one action at a time with proper delays for comprehension
 */

import Konva from 'konva';
import { AnimationQueue } from './AnimationQueue';
import { DomainRenderers } from './DomainRenderers';

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
  private domainRenderers: DomainRenderers | null = null;
  
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
    
    // Initialize domain renderers
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
        
      case 'drawVector':
        await this.drawVector(action.x1, action.y1, action.x2, action.y2, action.color, action.label);
        break;
        
      // V2 Domain-specific operations
      case 'drawCircuitElement':
        if (this.domainRenderers) {
          await this.domainRenderers.drawCircuitElement(action);
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
          await this.domainRenderers.drawNeuralNetwork(action);
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
        await new Promise(resolve => setTimeout(resolve, (action.duration || 1) * 1000));
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
   * Render LaTeX equation using KaTeX
   */
  private async renderLatex(equation: string, x: number, y: number, size: number, color: string, animated: boolean): Promise<void> {
    if (!this.stage || !this.overlay) return;
    
    // Create a div for the LaTeX
    const latexDiv = document.createElement('div');
    latexDiv.className = 'latex-equation';
    latexDiv.style.position = 'absolute';
    latexDiv.style.left = `${x * this.stage.width()}px`;
    latexDiv.style.top = `${y * this.stage.height()}px`;
    latexDiv.style.color = color;
    latexDiv.style.fontSize = `${size}px`;
    latexDiv.style.opacity = '0';
    
    // Render with KaTeX (requires KaTeX to be loaded)
    latexDiv.innerHTML = equation; // For now, just display the equation
    // TODO: Use KaTeX.render(equation, latexDiv) when KaTeX is loaded
    
    this.overlay.appendChild(latexDiv);
    
    // Animate in if requested
    if (animated) {
      return new Promise(resolve => {
        latexDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          latexDiv.style.opacity = '1';
          setTimeout(resolve, 500);
        }, 100);
      });
    }
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
