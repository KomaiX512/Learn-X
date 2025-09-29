import Konva from 'konva';
import { CanvasManager } from '../canvas/CanvasManager';
import { AnimationEngine } from '../animations/AnimationEngine';
import { AnimationQueue } from './AnimationQueue';

export interface EnhancedAction {
  op: string;
  [key: string]: any;
}

export interface RenderContext {
  stepId: string;
  stepTitle?: string;
  actions: EnhancedAction[];
  plan?: {
    title?: string;
    subtitle?: string;
    toc?: Array<{ minute: number; title: string; summary?: string }>;
  };
}

export class EnhancedRenderer {
  private canvasManager: CanvasManager;
  private animationEngine: AnimationEngine;
  private animationQueue: AnimationQueue;
  private stage: Konva.Stage;
  private overlay: HTMLDivElement;
  // Per-section simple flow-layout state to avoid overlaps (with recorded segments)
  private layouts: Map<string, { cursorY: number; spacing: number; marginX: number; contentTop: number; segments: Array<{ y1: number; y2: number }> }>; 
  
  constructor(stage: Konva.Stage, overlay: HTMLDivElement) {
    this.stage = stage;
    this.overlay = overlay;
    this.canvasManager = new CanvasManager(stage, stage.container());
    this.animationQueue = new AnimationQueue(this);
    this.layouts = new Map();
  }

  async renderStep(context: RenderContext): Promise<void> {
    console.log('[EnhancedRenderer] Rendering step:', context.stepId, 'with', context.actions?.length || 0, 'actions');
    
    // CRITICAL FIX: Clear the queue before adding new step to prevent overflow
    if (this.animationQueue.getStatus().total > 100) {
      console.log('[EnhancedRenderer] Queue overflow detected, clearing old animations');
      this.animationQueue.clear();
    }
    
    // Create or get section for this step
    const section = this.canvasManager.createSection(
      context.stepId,
      context.stepTitle || `Step ${context.stepId}`
    );
    
    // Ensure section.id matches context.stepId for layout lookup
    console.log('[EnhancedRenderer] Section created with id:', section.id, 'Expected:', context.stepId);
    console.log('[EnhancedRenderer] Processing actions for step:', context.stepId);
    
    // Initialize flow layout for this section if missing
    if (!this.layouts.has(context.stepId)) {
      this.layouts.set(context.stepId, {
        cursorY: 100, // Start 100px from top
        spacing: 20,
        marginX: 50,
        contentTop: 100,
        segments: []
      });
    }
    
    // ADD TO QUEUE instead of processing immediately
    // This decouples frontend speed from backend
    console.log('[EnhancedRenderer] Adding', context.actions.length, 'actions to queue');
    this.animationQueue.enqueue(context.actions, section);
    
    // NO AUTO-SCROLLING - Keep canvas completely static
    // NO IMMEDIATE PROCESSING - Let queue handle at human pace
    
    // Draw will happen as queue processes
  }

  public async processAction(action: EnhancedAction, section: any): Promise<void> {
    const layer = section.layer;
    
    switch (action.op) {
      case 'clear':
        await this.handleClear(action, section);
        break;
        
      case 'drawAxis':
        await this.drawAnimatedAxis(action, layer, section);
        break;
        
      case 'drawCurve':
        await this.drawAnimatedCurve(action, layer, section);
        break;
        
      case 'drawLabel':
        await this.drawAnimatedLabel(action, layer, section);
        break;
        
      case 'drawMathLabel':
        await this.drawEnhancedMathLabel(action, layer, section);
        break;
        
      case 'drawTitle':
        await this.drawAnimatedTitle(action, layer, section);
        break;
        
      case 'delay':
        await this.handleDelay(action.duration || 1);
        break;
        
      // New enhanced actions
      case 'drawParticles':
        await this.drawParticles(action, layer);
        break;
        
      case 'drawSpiral':
        await this.drawSpiral(action, layer);
        break;
        
      case 'drawRipple':
        await this.drawRipple(action, layer);
        break;
        
      case 'drawDiagram':
        await this.drawAnimatedDiagram(action, layer);
        break;
        
      case 'drawEquation':
        await this.drawAnimatedEquation(action, layer);
        break;
        
      case 'drawGraph':
        await this.drawInteractiveGraph(action, layer);
        break;
        
      case 'drawMolecule':
        await this.drawMoleculeStructure(action, layer);
        break;
        
      case 'drawFlowchart':
        await this.drawFlowchart(action, layer);
        break;
      
      // NEW VISUAL OPERATIONS FOR 3BLUE1BROWN STYLE
      case 'drawCircle':
        await this.drawCircle(action, layer, section);
        break;
      
      case 'drawRect':
        await this.drawRect(action, layer, section);
        break;
      
      case 'drawVector':
        await this.drawVector(action, layer, section);
        break;
      
      case 'orbit':
        await this.drawOrbit(action, layer, section);
        break;
      
      case 'wave':
        await this.drawWave(action, layer, section);
        break;
      
      case 'particle':
        await this.drawParticleSystem(action, layer, section);
        break;
      
      case 'arrow':
        await this.drawArrow(action, layer, section);
        break;
      
      case 'field':
        await this.drawField(action, layer, section);
        break;
      
      case 'flow':
        await this.drawFlow(action, layer, section);
        break;
        
      default:
        console.warn('[EnhancedRenderer] Unknown action:', action.op);
    }
  }

  private async handleClear(action: EnhancedAction, section: any): Promise<void> {
    if (action.target === 'all') {
      // Clear all sections with animation
      const sections = this.canvasManager.getAllSections();
      for (const s of sections) {
        this.canvasManager.clearSection(s.id);
      }
    } else {
      this.canvasManager.clearSection(section.id);
    }
    await this.handleDelay(0.3);
  }

  private async drawAnimatedAxis(action: EnhancedAction, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = 400; // block height reserved for axis region
    const margin = 50;
    // Reserve vertical space using flow layout (prevents overlap)
    const baseY = this.placeBlock(section, h, undefined);
    const x0 = margin;
    const y0 = baseY + h - margin;
    const x1 = w - margin;
    const y1 = baseY + margin;

    // Create axis lines with animation
    const xAxis = new Konva.Line({
      points: [x0, y0, x0, y0],
      stroke: '#333',
      strokeWidth: 2,
      lineCap: 'round'
    });
    
    const yAxis = new Konva.Line({
      points: [x0, y0, x0, y0],
      stroke: '#333',
      strokeWidth: 2,
      lineCap: 'round'
    });
    
    layer.add(xAxis);
    layer.add(yAxis);
    
    // Add grid lines for better visualization
    const gridLines: Konva.Line[] = [];
    const gridCount = 10;
    
    for (let i = 1; i < gridCount; i++) {
      const xGrid = x0 + (x1 - x0) * (i / gridCount);
      const yGrid = y0 - (y0 - y1) * (i / gridCount);
      
      const vLine = new Konva.Line({
        points: [xGrid, y0, xGrid, y1],
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        opacity: 0
      });
      
      const hLine = new Konva.Line({
        points: [x0, yGrid, x1, yGrid],
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        opacity: 0
      });
      
      gridLines.push(vLine, hLine);
      layer.add(vLine);
      layer.add(hLine);
    }
    
    // Animate grid appearance
    gridLines.forEach((line, index) => {
      const tween = new Konva.Tween({
        node: line,
        duration: 0.3,
        opacity: 0.3,
        delay: index * 0.02,
        easing: Konva.Easings.EaseOut
      });
      tween.play();
    });
    
    // Animate axis expansion with particle effect at origin
    await this.animationEngine.createParticleBurst(layer, x0, y0, {
      count: 15,
      color: '#0b82f0',
      size: 2,
      speed: 100,
      lifetime: 800
    });
    
    // X-axis animation
    const xTween = new Konva.Tween({
      node: xAxis,
      duration: 0.8,
      points: [x0, y0, x1, y0],
      easing: Konva.Easings.EaseOut
    });
    
    // Y-axis animation
    const yTween = new Konva.Tween({
      node: yAxis,
      duration: 0.8,
      points: [x0, y0, x0, y1],
      easing: Konva.Easings.EaseOut
    });
    
    xTween.play();
    setTimeout(() => yTween.play(), 200);
    
    // Add animated labels with typewriter effect
    await this.handleDelay(1);
    
    const xLabel = new Konva.Text({
      text: action.xLabel || 'x',
      x: x1 - 30,
      y: y0 + 10,
      fontSize: 16,
      fill: '#333',
      opacity: 0
    });
    
    const yLabel = new Konva.Text({
      text: action.yLabel || 'y',
      x: x0 - 35,
      y: y1,
      fontSize: 16,
      fill: '#333',
      opacity: 0
    });
    
    layer.add(xLabel);
    layer.add(yLabel);
    
    // Glow effect on labels
    await this.animationEngine.createGlow(xLabel, { color: '#0b82f0', duration: 0.5 });
    await this.animationEngine.createGlow(yLabel, { color: '#0b82f0', duration: 0.5 });
    
    // Fade in labels
    const xLabelTween = new Konva.Tween({ node: xLabel, duration: 0.5, opacity: 1 });
    const yLabelTween = new Konva.Tween({ node: yLabel, duration: 0.5, opacity: 1 });
    xLabelTween.play();
    yLabelTween.play();
    
    layer.batchDraw();
  }

  private async drawAnimatedCurve(action: EnhancedAction, layer: Konva.Layer, section: any): Promise<void> {
    const points = action.points as [number, number][];
    const normalized = action.normalized !== false;
    const color = action.color || '#0b82f0';
    const width = action.width || 2;
    const duration = action.duration || 2;
    // Estimate required height based on point range when normalized
    let estimatedHeight = 240;
    if (normalized) {
      let minY = 1, maxY = 0;
      for (const [, y] of points) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      estimatedHeight = Math.max(160, (maxY - minY) * 400 + 60);
    }
    const baseY = this.placeBlock(section, estimatedHeight, undefined);
    
    // Convert points if normalized and apply vertical offset
    const pts = points.map(([x, y]) => {
      if (normalized) {
        return [x * this.stage.width(), baseY + y * 400];
      }
      return [x, baseY + y];
    }).flat();
    
    // Create the curve line
    const line = new Konva.Line({
      points: [],
      stroke: color,
      strokeWidth: width,
      lineCap: 'round',
      lineJoin: 'round',
      shadowColor: color,
      shadowBlur: 0,
      shadowOpacity: 0.5
    });
    
    layer.add(line);
    
    // Add leading particle effect
    const particle = new Konva.Circle({
      radius: width * 2,
      fill: color,
      shadowColor: color,
      shadowBlur: 10,
      shadowOpacity: 0.8
    });
    layer.add(particle);
    
    // Animate the curve drawing with particle leading
    const totalPoints = points.length;
    const animDuration = duration * 1000;
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / animDuration);
        const currentIndex = Math.floor(progress * totalPoints);
        const currentPoints = pts.slice(0, currentIndex * 2);
        
        line.points(currentPoints);
        
        // Position particle at the end of the line
        if (currentPoints.length >= 2) {
          const lastX = currentPoints[currentPoints.length - 2];
          const lastY = currentPoints[currentPoints.length - 1];
          particle.x(lastX);
          particle.y(lastY);
          
          // Create trail effect
          if (Math.random() > 0.7) {
            this.animationEngine.createParticleBurst(layer, lastX, lastY, {
              count: 3,
              color: color,
              size: 1,
              speed: 30,
              lifetime: 500
            });
          }
        }
        
        // Add glow effect
        const glowIntensity = Math.sin(progress * Math.PI) * 15;
        line.shadowBlur(glowIntensity);
        
        layer.batchDraw();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Remove particle and finish
          particle.destroy();
          line.shadowBlur(5);
          layer.batchDraw();
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  private async drawAnimatedLabel(action: EnhancedAction, layer: Konva.Layer, section: any): Promise<void> {
    const text = action.text || '';
    const color = action.color || '#333';
    const layout = this.layouts.get(section.id) || { cursorY: 60, spacing: 12, marginX: 24, contentTop: 60, segments: [] };
    console.log('[drawAnimatedLabel] Section:', section.id, 'Layout cursor:', layout.cursorY, 'Segments:', layout.segments.length);

    // Measure text to decide placement (use word-wrapped width)
    const maxWidth = Math.max(200, this.stage.width() - layout.marginX * 2);
    const measure = new Konva.Text({ text, fontSize: 16, width: maxWidth, wrap: 'word', lineHeight: 1.25 });
    const estimatedHeight = Math.max(24, measure.height());

    // Flow layout by default unless explicitly absolute
    const absolute = action.absolute === true;
    const preferredX = action.x !== undefined ? (action.normalized ? action.x * this.stage.width() : action.x) : layout.marginX;
    const preferredY = absolute && action.y !== undefined ? (action.normalized ? action.y * 400 : action.y) : undefined;
    const finalY = this.placeBlock(section, estimatedHeight, preferredY);

    // Create the label at computed position
    const label = new Konva.Text({
      text: '',
      x: preferredX,
      y: finalY,
      width: maxWidth,
      wrap: 'word',
      lineHeight: 1.25,
      fontSize: 16,
      fill: color,
      opacity: 0,
      listening: false
    });
    layer.add(label);

    // Entry effects
    await this.animationEngine.createRipple(layer, label.x(), label.y(), { maxRadius: 30, duration: 0.5, color, count: 1 });
    new Konva.Tween({ node: label, duration: 0.3, opacity: 1, easing: Konva.Easings.EaseOut }).play();

    // Typewriter effect
    const chars = text.split('');
    let currentText = '';
    for (let i = 0; i < chars.length; i++) {
      currentText += chars[i];
      label.text(currentText);
      layer.batchDraw();
      await this.handleDelay(0.02);
    }

    await this.animationEngine.createPulse(label, { scale: 1.05, duration: 0.25, repeat: 1 });
  }

  private async drawEnhancedMathLabel(action: EnhancedAction, layer: Konva.Layer, section: any): Promise<void> {
    const tex = action.tex || '';
    const layout = this.layouts.get(section.id) || { cursorY: 60, spacing: 12, marginX: 24, contentTop: 60, segments: [] };
    const padding = 10;

    // Prepare text to measure
    const rendered = this.renderLatex(tex);
    const measure = new Konva.Text({ text: rendered, fontSize: 18, fontFamily: 'KaTeX_Main, Times New Roman, serif' });
    const estimatedHeight = measure.height() + padding * 2;

    const absolute = action.absolute === true;
    const preferredX = action.x !== undefined ? (action.normalized ? action.x * this.stage.width() : action.x) : layout.marginX;
    const preferredY = absolute && action.y !== undefined ? (action.normalized ? action.y * 400 : action.y) : undefined;
    const finalY = this.placeBlock((layer.getParent() as any), estimatedHeight, preferredY);

    // Create a group for the math label
    const group = new Konva.Group({ x: preferredX, y: finalY, opacity: 0 });

    const bg = new Konva.Rect({
      x: -padding,
      y: -padding,
      width: measure.width() + padding * 2,
      height: measure.height() + padding * 2,
      fill: 'white',
      stroke: '#0b82f0',
      strokeWidth: 1,
      cornerRadius: 5,
      shadowColor: '#0b82f0',
      shadowBlur: 10,
      shadowOpacity: 0.3
    });

    const mathText = new Konva.Text({
      text: rendered,
      fontSize: 18,
      fill: '#2c3e50',
      fontFamily: 'KaTeX_Main, Times New Roman, serif'
    });

    group.add(bg);
    group.add(mathText);
    layer.add(group);

    await this.animationEngine.createSpiral(layer, group.x(), group.y(), { radius: 30, rotations: 1, duration: 0.5, color: '#0b82f0', width: 1 });

    group.scaleX(0.5);
    group.scaleY(0.5);
    new Konva.Tween({ node: group, duration: 0.5, opacity: 1, scaleX: 1, scaleY: 1, easing: Konva.Easings.BackEaseOut }).play();

    await this.handleDelay(0.3);
    await this.animationEngine.createGlow(group, { color: '#0b82f0', duration: 0.4, intensity: 12 });
    layer.batchDraw();
  }

  private renderLatex(tex: string): string {
    // Enhanced LaTeX to Unicode conversion
    const replacements: { [key: string]: string } = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
      '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
      '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
      '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
      '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
      '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
      '\\Psi': 'Ψ', '\\Omega': 'Ω',
      '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\oint': '∮',
      '\\partial': '∂', '\\nabla': '∇', '\\pm': '±', '\\mp': '∓',
      '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\circ': '∘',
      '\\bullet': '•', '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮',
      '\\ddots': '⋱', '\\infty': '∞', '\\aleph': 'ℵ', '\\beth': 'ℶ',
      '\\gimel': 'ℷ', '\\daleth': 'ℸ',
      '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
      '\\equiv': '≡', '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅',
      '\\propto': '∝', '\\perp': '⊥', '\\parallel': '∥',
      '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
      '\\in': '∈', '\\notin': '∉', '\\ni': '∋', '\\notni': '∌',
      '\\cap': '∩', '\\cup': '∪', '\\wedge': '∧', '\\vee': '∨',
      '\\neg': '¬', '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
      '\\emptyset': '∅', '\\varnothing': '∅',
      '\\leftarrow': '←', '\\rightarrow': '→', '\\leftrightarrow': '↔',
      '\\Leftarrow': '⇐', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔',
      '\\uparrow': '↑', '\\downarrow': '↓', '\\updownarrow': '↕',
      '\\mapsto': '↦', '\\to': '→',
      '\\sqrt': '√', '\\cbrt': '∛', '\\fourth': '∜'
    };
    
    let result = tex;
    
    // Remove $$ delimiters
    result = result.replace(/\$\$/g, '');
    
    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key.replace(/\\/g, '\\\\'), 'g'), value);
    }
    
    // Handle fractions
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
    
    // Handle vectors
    result = result.replace(/\\vec\{([^}]+)\}/g, '$1⃗');
    
    // Handle text
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');
    
    // Subscript and superscript helpers
    const subMap: { [key: string]: string } = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
      'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ',
      's': 'ₛ', 't': 'ₜ'
    };
    const supMap: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
    };
    const toSub = (s: string) => s.split('').map(c => subMap[c] || c).join('');
    const toSup = (s: string) => s.split('').map(c => supMap[c] || c).join('');

    // Braced forms: _{...} and ^{...}
    result = result.replace(/_\{([^}]+)\}/g, (_, sub) => toSub(sub));
    result = result.replace(/\^\{([^}]+)\}/g, (_, sup) => toSup(sup));
    // Simple single-char forms: _x and ^x
    result = result.replace(/_([a-zA-Z0-9+\-=()])/g, (_, sub) => toSub(sub));
    result = result.replace(/\^([a-zA-Z0-9+\-=()])/g, (_, sup) => toSup(sup));
    
    return result;
  }

  private async drawAnimatedTitle(action: EnhancedAction, layer: Konva.Layer, section: any): Promise<void> {
    const text = action.text || '';
    // Use flow layout unless absolute is requested
    const absolute = action.absolute === true;
    const layout = this.layouts.get(section.id) || { cursorY: 60, spacing: 12, marginX: 24, contentTop: 60, segments: [] };
    const estimatedHeight = 36;
    const preferredY = absolute && action.y !== undefined ? (action.normalized ? action.y * 400 : action.y) : undefined;
    const y = this.placeBlock(section, estimatedHeight, preferredY);
    const duration = action.duration || 1;
    
    // Create title with gradient effect
    const title = new Konva.Text({
      text: text,
      x: 0,
      y: y,
      width: this.stage.width(),
      align: 'center',
      fontSize: 28,
      fontStyle: 'bold',
      fill: '#111',
      opacity: 0,
      shadowColor: '#0b82f0',
      shadowBlur: 0,
      shadowOpacity: 0.5
    });
    
    layer.add(title);
    
    // Wave animation for title characters
    const chars = text.split('').map((char, index) => {
      const charText = new Konva.Text({
        text: char,
        x: (this.stage.width() / 2) - (text.length * 14 / 2) + (index * 14),
        y: y,
        fontSize: 28,
        fontStyle: 'bold',
        fill: '#111',
        opacity: 0
      });
      layer.add(charText);
      return charText;
    });
    
    // Remove the original title as we're using individual characters
    title.destroy();
    
    // Animate characters with wave effect
    await this.animationEngine.createWaveAnimation(chars, {
      duration: duration,
      delay: 0.03
    });
    
    // Fade in characters
    chars.forEach((char, index) => {
      const tween = new Konva.Tween({
        node: char,
        duration: 0.3,
        opacity: 1,
        delay: index * 0.03,
        easing: Konva.Easings.EaseOut
      });
      tween.play();
    });
    
    layer.batchDraw();
  }

  private async drawParticles(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    const x = action.normalized ? action.x * this.stage.width() : action.x;
    const y = action.normalized ? action.y * 400 : action.y;
    
    await this.animationEngine.createParticleBurst(layer, x, y, {
      count: action.count || 20,
      color: action.color || '#0b82f0',
      size: action.size || 3,
      speed: action.speed || 150,
      spread: action.spread || 360,
      lifetime: action.lifetime || 1000
    });
  }

  private async drawSpiral(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    const x = action.normalized ? action.x * this.stage.width() : action.x;
    const y = action.normalized ? action.y * 400 : action.y;
    
    await this.animationEngine.createSpiral(layer, x, y, {
      radius: action.radius || 100,
      rotations: action.rotations || 3,
      duration: action.duration || 2,
      color: action.color || '#0b82f0',
      width: action.width || 2
    });
  }

  private async drawRipple(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    const x = action.normalized ? action.x * this.stage.width() : action.x;
    const y = action.normalized ? action.y * 400 : action.y;
    
    await this.animationEngine.createRipple(layer, x, y, {
      maxRadius: action.maxRadius || 100,
      duration: action.duration || 1,
      color: action.color || '#0b82f0',
      count: action.count || 3
    });
  }

  private async drawAnimatedDiagram(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    // Implementation for complex diagrams with animations
    const { type, data, x = 0.5, y = 0.5, normalized = true } = action;
    const centerX = normalized ? x * this.stage.width() : x;
    const centerY = normalized ? y * 400 : y;
    
    // Example: Draw a simple animated diagram
    const group = new Konva.Group({ x: centerX, y: centerY });
    
    // Add diagram elements with animations
    // This would be expanded based on diagram type
    layer.add(group);
    layer.batchDraw();
  }

  private async drawAnimatedEquation(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    // Implementation for animated equation rendering
    const { equation, steps, x = 0.5, y = 0.5, normalized = true } = action;
    const startX = normalized ? x * this.stage.width() : x;
    const startY = normalized ? y * 400 : y;
    
    // Render equation with step-by-step animation
    // This would show equation transformations
    layer.batchDraw();
  }

  private async drawInteractiveGraph(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    // Implementation for interactive graphs
    const { function: fn, range, interactive = true } = action;
    
    // Create interactive graph with hover effects
    // This would allow users to explore the graph
    layer.batchDraw();
  }

  private async drawMoleculeStructure(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    // Implementation for molecular structures
    const { molecule, bonds, atoms, x = 0.5, y = 0.5, normalized = true } = action;
    const centerX = normalized ? x * this.stage.width() : x;
    const centerY = normalized ? y * 400 : y;
    
    // Draw atoms and bonds with 3D-like effects
    // This would create an animated molecule visualization
    layer.batchDraw();
  }

  private async drawFlowchart(action: EnhancedAction, layer: Konva.Layer): Promise<void> {
    // Implementation for flowcharts
    const { nodes, connections, layout = 'vertical' } = action;
    
    // Create animated flowchart with connected nodes
    // This would show process flows with animations
    layer.batchDraw();
  }

  private async handleDelay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // ===== Layout helpers to prevent overlapping =====
  private placeBlock(section: any, estimatedHeight: number, preferredY?: number): number {
    const layout = this.layouts.get(section.id) || { cursorY: 60, spacing: 12, marginX: 24, contentTop: 60, segments: [] };
    console.log('[placeBlock] Section:', section.id, 'Current cursor:', layout.cursorY, 'EstimatedHeight:', estimatedHeight, 'PreferredY:', preferredY);
    // Never place a block above the current cursor to avoid overlap.
    // If a preferredY is given (absolute intent), clamp it to be at least cursorY.
    let y = preferredY !== undefined ? Math.max(preferredY, layout.cursorY) : layout.cursorY;
    // Ensure y is below section title area
    y = Math.max(y, layout.contentTop);

    // If this block would overflow current section height, grow the section
    const needed = y + estimatedHeight + layout.spacing + 20;
    if (needed > section.height) {
      this.canvasManager.resizeSection(section.id, needed);
    }

    // Collision avoidance: nudge below any overlapping recorded segments
    const overlaps = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && a2 > b1;
    let moved = false;
    while (true) {
      let collided = false;
      for (const seg of layout.segments) {
        if (overlaps(y, y + estimatedHeight, seg.y1, seg.y2)) {
          y = seg.y2 + layout.spacing;
          collided = true;
          moved = true;
        }
      }
      if (!collided) break;
    }

    // Grow section if nudged beyond current height
    const neededAfterNudge = y + estimatedHeight + layout.spacing + 20;
    if (neededAfterNudge > section.height) {
      this.canvasManager.resizeSection(section.id, neededAfterNudge);
    }

    // Update cursor for subsequent blocks
    layout.cursorY = Math.max(layout.cursorY, y + estimatedHeight + layout.spacing);
    // Record segment for this block
    layout.segments.push({ y1: y, y2: y + estimatedHeight });
    this.layouts.set(section.id, layout);
    console.log('[placeBlock] Placed at Y:', y, 'New cursor:', layout.cursorY, 'Total segments:', layout.segments.length);
    return y;
  }

  createTimeline(steps: { id: string; title: string; duration: number }[]): void {
    this.canvasManager.createTimeline(steps);
  }

  scrollToStep(stepId: string): void {
    this.canvasManager.scrollToSection(stepId);
  }

  // NEW VISUAL OPERATIONS IMPLEMENTATIONS

  private async drawCircle(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const padding = 50; // Keep animations away from edges
    
    // Clamp positions to visible area
    const rawX = action.normalized ? action.x * w : action.x;
    const rawY = action.normalized ? action.y * h : action.y;
    
    const x = Math.max(padding, Math.min(w - padding, rawX));
    const y = Math.max(padding, Math.min(h - padding, rawY));
    const radius = action.normalized ? action.radius * Math.min(w, h) : action.radius;
    
    const circle = new Konva.Circle({
      x: x,
      y: y,
      radius: 0,
      fill: action.fill ? (action.color || '#3498db') : undefined,
      stroke: !action.fill ? (action.color || '#3498db') : undefined,
      strokeWidth: 2,
      shadowColor: action.color || '#3498db',
      shadowBlur: 10,
      shadowOpacity: 0.3
    });
    
    layer.add(circle);
    console.log('[drawCircle] Added circle to layer at', x, y, 'with radius', radius);
    
    // IMMEDIATE DRAW - Don't animate for now to ensure visibility
    circle.radius(radius);
    layer.batchDraw();
    console.log('[drawCircle] Circle drawn immediately');
    
    // Skip animation for now to ensure content is visible
    await this.handleDelay(0.1);
  }

  private async drawRect(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const x = action.normalized ? action.x * w : action.x;
    const y = action.normalized ? action.y * h : action.y;
    const width = action.normalized ? action.width * w : action.width;
    const height = action.normalized ? action.height * h : action.height;
    
    const rect = new Konva.Rect({
      x: x,
      y: y,
      width: 0,
      height: 0,
      fill: action.fill ? (action.color || '#2ecc71') : undefined,
      stroke: !action.fill ? (action.color || '#2ecc71') : undefined,
      strokeWidth: 2,
      shadowColor: action.color || '#2ecc71',
      shadowBlur: 8,
      shadowOpacity: 0.2
    });
    
    layer.add(rect);
    
    // Animate rectangle expansion
    await new Promise<void>(resolve => {
      const anim = new Konva.Animation((frame) => {
        const progress = Math.min(frame.time / 500, 1);
        rect.width(width * progress);
        rect.height(height * progress);
        if (progress >= 1) {
          anim.stop();
          resolve();
        }
      }, layer);
      anim.start();
    });
  }

  private async drawVector(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const x1 = action.normalized ? action.x1 * w : action.x1;
    const y1 = action.normalized ? action.y1 * h : action.y1;
    const x2 = action.normalized ? action.x2 * w : action.x2;
    const y2 = action.normalized ? action.y2 * h : action.y2;
    
    const arrow = new Konva.Arrow({
      points: [x1, y1, x1, y1],
      pointerLength: 10,
      pointerWidth: 10,
      fill: action.color || '#9b59b6',
      stroke: action.color || '#9b59b6',
      strokeWidth: action.width || 3,
      shadowColor: action.color || '#9b59b6',
      shadowBlur: 10,
      shadowOpacity: 0.4
    });
    
    layer.add(arrow);
    
    // Animate vector drawing
    await new Promise<void>(resolve => {
      const anim = new Konva.Animation((frame) => {
        const progress = Math.min(frame.time / 600, 1);
        const currentX = x1 + (x2 - x1) * progress;
        const currentY = y1 + (y2 - y1) * progress;
        arrow.points([x1, y1, currentX, currentY]);
        if (progress >= 1) {
          anim.stop();
          resolve();
        }
      }, layer);
      anim.start();
    });
  }

  private async drawOrbit(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const centerX = action.centerX * w;
    const centerY = action.centerY * h;
    const radius = action.radius * Math.min(w, h);
    const objectRadius = action.objectRadius * Math.min(w, h);
    
    // Draw orbit path
    const orbitPath = new Konva.Circle({
      x: centerX,
      y: centerY,
      radius: radius,
      stroke: '#444',
      strokeWidth: 1,
      dash: [5, 5],
      opacity: 0.3
    });
    layer.add(orbitPath);
    
    // Draw center point
    const center = new Konva.Circle({
      x: centerX,
      y: centerY,
      radius: 3,
      fill: '#fff',
      stroke: action.color || '#FFD700',
      strokeWidth: 2
    });
    layer.add(center);
    
    // Draw orbiting object
    const object = new Konva.Circle({
      x: centerX + radius,
      y: centerY,
      radius: objectRadius,
      fill: action.color || '#FFD700',
      shadowColor: action.color || '#FFD700',
      shadowBlur: 20,
      shadowOpacity: 0.8
    });
    layer.add(object);
    
    // Add trail if requested
    let trail: Konva.Line | null = null;
    const trailPoints: number[] = [];
    if (action.trail) {
      trail = new Konva.Line({
        points: [],
        stroke: action.color || '#FFD700',
        strokeWidth: 1,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layer.add(trail);
      trail.moveToBottom();
      orbitPath.moveToBottom();
    }
    
    // Animate orbit
    const anim = new Konva.Animation((frame) => {
      const angle = (frame.time / (action.period * 1000)) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      object.x(x);
      object.y(y);
      
      // Update trail
      if (trail && action.trail) {
        trailPoints.push(x, y);
        if (trailPoints.length > 200) {
          trailPoints.splice(0, 2);
        }
        trail.points(trailPoints);
      }
    }, layer);
    anim.start();
    
    // Store animation for cleanup
    (layer as any).orbitAnim = anim;
  }

  private async drawWave(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const startX = action.startX * w;
    const startY = action.startY * h;
    const width = action.width * w;
    const amplitude = action.amplitude * h;
    
    const wave = new Konva.Line({
      points: [],
      stroke: action.color || '#00bbff',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      shadowColor: action.color || '#00bbff',
      shadowBlur: 10,
      shadowOpacity: 0.5
    });
    layer.add(wave);
    
    // Animate wave
    const anim = new Konva.Animation((frame) => {
      const points: number[] = [];
      const segments = 100;
      const phase = (frame.time / 1000) * action.speed;
      
      for (let i = 0; i <= segments; i++) {
        const x = startX + (width * i / segments);
        const angle = (i / segments) * Math.PI * 2 * action.frequency + phase;
        const y = startY + Math.sin(angle) * amplitude;
        points.push(x, y);
      }
      
      wave.points(points);
    }, layer);
    anim.start();
    
    // Store animation for cleanup
    (layer as any).waveAnim = anim;
  }

  private async drawParticleSystem(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const centerX = action.x * w;
    const centerY = action.y * h;
    const spread = action.spread * Math.min(w, h);
    
    const particles: Konva.Circle[] = [];
    
    // Create particles
    for (let i = 0; i < action.count; i++) {
      const particle = new Konva.Circle({
        x: centerX,
        y: centerY,
        radius: Math.random() * 3 + 1,
        fill: action.color || '#FFD700',
        opacity: 1
      });
      layer.add(particle);
      particles.push(particle);
      
      // Random velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * action.speed + action.speed / 2;
      (particle as any).vx = Math.cos(angle) * speed;
      (particle as any).vy = Math.sin(angle) * speed;
      (particle as any).life = 0;
    }
    
    // Animate particles
    const anim = new Konva.Animation((frame) => {
      const dt = frame.timeDiff / 1000;
      
      particles.forEach(particle => {
        const vx = (particle as any).vx;
        const vy = (particle as any).vy;
        let life = (particle as any).life;
        
        particle.x(particle.x() + vx * dt);
        particle.y(particle.y() + vy * dt);
        
        life += dt;
        (particle as any).life = life;
        
        // Fade out
        const opacity = Math.max(0, 1 - life / action.lifetime);
        particle.opacity(opacity);
        
        // Reset particle
        if (life > action.lifetime) {
          particle.x(centerX);
          particle.y(centerY);
          particle.opacity(1);
          (particle as any).life = 0;
          
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * action.speed + action.speed / 2;
          (particle as any).vx = Math.cos(angle) * speed;
          (particle as any).vy = Math.sin(angle) * speed;
        }
      });
    }, layer);
    anim.start();
    
    // Store animation for cleanup
    (layer as any).particleAnim = anim;
  }

  private async drawArrow(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const x = action.x * w;
    const y = action.y * h;
    const length = action.length * Math.min(w, h);
    const angle = action.angle;
    
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    
    const arrow = new Konva.Arrow({
      points: [x, y, x2, y2],
      pointerLength: 15,
      pointerWidth: 15,
      fill: action.color || '#00ff88',
      stroke: action.color || '#00ff88',
      strokeWidth: 3,
      shadowColor: action.color || '#00ff88',
      shadowBlur: 15,
      shadowOpacity: 0.6
    });
    
    layer.add(arrow);
    
    if (action.animated) {
      // Pulsing animation
      const anim = new Konva.Animation((frame) => {
        const scale = 1 + Math.sin(frame.time / 200) * 0.1;
        arrow.scaleX(scale);
        arrow.scaleY(scale);
      }, layer);
      anim.start();
      
      // Store animation for cleanup
      (layer as any).arrowAnim = anim;
    }
  }

  private async drawField(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    const gridSize = action.gridSize;
    const cellWidth = w / gridSize;
    const cellHeight = h / gridSize;
    
    const arrows: Konva.Arrow[] = [];
    
    // Create field vectors
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i + 0.5) * cellWidth;
        const y = (j + 0.5) * cellHeight;
        
        let angle = 0;
        let magnitude = action.strength / 10;
        
        if (action.type === 'electric') {
          // Radial field from center
          const dx = x - w / 2;
          const dy = y - h / 2;
          angle = Math.atan2(dy, dx);
          magnitude = Math.min(1, action.strength / (Math.sqrt(dx * dx + dy * dy) + 1));
        } else if (action.type === 'magnetic') {
          // Circular field
          const dx = x - w / 2;
          const dy = y - h / 2;
          angle = Math.atan2(dy, dx) + Math.PI / 2;
          magnitude = action.strength / 10;
        } else {
          // Vector field
          angle = Math.sin(x / 100) * Math.cos(y / 100) * Math.PI;
          magnitude = action.strength / 10;
        }
        
        const arrow = new Konva.Arrow({
          points: [x, y, x + Math.cos(angle) * magnitude * 20, y + Math.sin(angle) * magnitude * 20],
          pointerLength: 5,
          pointerWidth: 5,
          fill: '#0b82f0',
          stroke: '#0b82f0',
          strokeWidth: 1,
          opacity: 0.3
        });
        
        layer.add(arrow);
        arrows.push(arrow);
      }
    }
    
    // Animate field
    const anim = new Konva.Animation((frame) => {
      const time = frame.time / 1000;
      arrows.forEach((arrow, index) => {
        const opacity = 0.2 + Math.sin(time + index * 0.1) * 0.1;
        arrow.opacity(opacity);
      });
    }, layer);
    anim.start();
    
    // Store animation for cleanup
    (layer as any).fieldAnim = anim;
  }

  private async drawFlow(action: any, layer: Konva.Layer, section: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    // Convert path points
    const path = action.path.map((p: [number, number]) => [p[0] * w, p[1] * h]);
    
    // Draw path line
    const pathLine = new Konva.Line({
      points: path.flat(),
      stroke: '#333',
      strokeWidth: 2,
      dash: [10, 5],
      opacity: 0.3
    });
    layer.add(pathLine);
    
    // Create flow particles
    const particles: Konva.Circle[] = [];
    for (let i = 0; i < action.particleCount; i++) {
      const particle = new Konva.Circle({
        x: path[0][0],
        y: path[0][1],
        radius: 4,
        fill: action.color || '#00bbff',
        shadowColor: action.color || '#00bbff',
        shadowBlur: 10,
        shadowOpacity: 0.8
      });
      layer.add(particle);
      particles.push(particle);
      
      // Stagger particle positions
      (particle as any).pathProgress = i / action.particleCount;
    }
    
    // Animate flow
    const anim = new Konva.Animation((frame) => {
      const dt = frame.timeDiff / 1000;
      
      particles.forEach(particle => {
        let progress = (particle as any).pathProgress;
        progress += dt * action.speed / 10;
        if (progress > 1) progress -= 1;
        (particle as any).pathProgress = progress;
        
        // Interpolate position along path
        const segmentCount = path.length - 1;
        const segment = Math.floor(progress * segmentCount);
        const segmentProgress = (progress * segmentCount) - segment;
        
        if (segment < segmentCount) {
          const x = path[segment][0] + (path[segment + 1][0] - path[segment][0]) * segmentProgress;
          const y = path[segment][1] + (path[segment + 1][1] - path[segment][1]) * segmentProgress;
          particle.x(x);
          particle.y(y);
        }
      });
    }, layer);
    anim.start();
    
    // Store animation for cleanup
    (layer as any).flowAnim = anim;
  }

  cleanup(): void {
    this.canvasManager.cleanup();
  }
}
