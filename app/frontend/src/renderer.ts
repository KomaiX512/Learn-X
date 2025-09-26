import Konva from 'konva';

type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string; isTitle?: boolean; isDefinition?: boolean; isImportant?: boolean; fontSize?: number; bold?: boolean; italic?: boolean; align?: string; bgColor?: string }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' }
  | { op: 'delay'; duration: number }
  | { op: 'drawTitle'; text: string; y?: number; duration?: number }
  | { op: 'drawVector'; normalized?: boolean; x1: number; y1: number; x2: number; y2: number; color?: string; label?: string }
  | { op: 'drawCircle'; normalized?: boolean; x: number; y: number; radius: number; color?: string; fill?: boolean }
  | { op: 'drawRect'; normalized?: boolean; x: number; y: number; width: number; height: number; color?: string; fill?: boolean }
  | { op: 'highlight'; targetId: string; color?: string; duration?: number }
  // New 3Blue1Brown-style animations
  | { op: 'orbit'; centerX: number; centerY: number; radius: number; period: number; objectRadius: number; color?: string; trail?: boolean; centerColor?: string; showCenterArrow?: boolean }
  | { op: 'wave'; startX: number; startY: number; width: number; amplitude: number; frequency: number; speed: number; color?: string }
  | { op: 'particle'; x: number; y: number; count: number; spread: number; speed: number; color?: string; lifetime: number }
  | { op: 'arrow'; x: number; y: number; angle: number; length: number; color?: string; animated?: boolean }
  | { op: 'field'; type: 'vector' | 'electric' | 'magnetic'; gridSize: number; strength: number }
  | { op: 'morph'; fromShape: any; toShape: any; duration: number }
  | { op: 'rotate'; targetId: string; angle: number; duration: number; centerX?: number; centerY?: number }
  | { op: 'pulse'; targetId: string; scale: number; duration: number; repeat?: number }
  | { op: 'flow'; path: [number, number][]; particleCount: number; speed: number; color?: string }
  // Enhanced educational animations
  | { op: 'transform'; targetId: string; matrix: number[]; duration: number; description?: string }
  | { op: 'trace'; path: [number, number][]; color?: string; width?: number; speed?: number; showHead?: boolean }
  | { op: 'spotlight'; x: number; y: number; radius: number; intensity?: number; color?: string }
  | { op: 'fadeIn'; targetId: string; duration: number; delay?: number }
  | { op: 'fadeOut'; targetId: string; duration: number; delay?: number }
  | { op: 'parallel'; actions: Action[]; syncDelay?: number }
  | { op: 'sequence'; actions: Action[]; stepDelay?: number }
  | { op: 'pendulum'; x: number; y: number; length: number; angle: number; period: number; color?: string }
  | { op: 'spring'; x1: number; y1: number; x2: number; y2: number; coils: number; amplitude: number; color?: string }
  | { op: 'graph3d'; func: string; xRange: [number, number]; yRange: [number, number]; resolution: number };

export interface RenderChunk {
  type: 'actions';
  actions: Action[];
  stepId?: number;
  step?: any;
  plan?: {
    title?: string;
    subtitle?: string;
    toc?: Array<{ minute: number; title: string; summary?: string }>;
  };
}

let stage: Konva.Stage | null = null;
const layers: Map<number, Konva.Layer> = new Map();
let overlay: HTMLDivElement | null = null;
let currentY = 0;
const stepHeight = 800; // Increased height to prevent overlapping
const MAX_CANVAS_HEIGHT = 50000; // Maximum canvas height to prevent memory issues
// Queue chunks that arrive before the stage is initialized
const pendingChunks: RenderChunk[] = [];
// Track sub-steps to ensure each part gets its own layer
const subStepCounters: Map<number, number> = new Map();
// Track content progression for smooth learning experience
const contentProgression: Map<number, { concepts: string[], depth: number }> = new Map();
// Enhanced layer management for continuous content accumulation
function ensureLayer(stepId: number, forceNew: boolean = false): Konva.Layer {
  if (!stage) throw new Error('Stage not initialized');
  
  // Generate unique layer ID for sub-steps - ALWAYS create new layers for content accumulation
  let layerId = stepId;
  const subStepCount = subStepCounters.get(stepId) || 0;
  subStepCounters.set(stepId, subStepCount + 1);
  layerId = stepId * 10000 + subStepCount; // Larger multiplier for more unique IDs
  
  let layer = layers.get(layerId) || null;

  // If we have a cached layer but it's no longer attached to a stage
  // (e.g., after clear() with destroyChildren), discard and recreate it.
  if (layer && !layer.getStage()) {
    console.log(`[renderer] ensureLayer: Cached layer for layerId=${layerId} is detached, recreating.`);
    layers.delete(layerId);
    layer = null;
  }

  if (!layer) {
    console.log(`[renderer] ensureLayer: Creating new layer for layerId=${layerId} (stepId=${stepId}) at currentY=${currentY}`);
    const layerTop = currentY;
    layer = new Konva.Layer({ y: layerTop });
    stage.add(layer);
    layers.set(layerId, layer);
    
    // Calculate new height with maximum limit
    const newHeight = Math.min(currentY + stepHeight, MAX_CANVAS_HEIGHT);
    
    // Always expand canvas to accommodate new content
    if (currentY < MAX_CANVAS_HEIGHT) {
      stage.height(newHeight);
      if (overlay) overlay.style.height = `${newHeight}px`;
      currentY += stepHeight;
    } else {
      // If we've hit max height, warn but continue
      console.warn(`[renderer] Approaching max canvas height (${MAX_CANVAS_HEIGHT}px)`);
      stage.height(MAX_CANVAS_HEIGHT);
      if (overlay) overlay.style.height = `${MAX_CANVAS_HEIGHT}px`;
    }
    
    console.log(`[renderer] ensureLayer: Stage dimensions now ${stage.width()}x${stage.height()}, layer at y=${layerTop}`);
    
    // Scroll to the new layer
    const scrollContainer = stage.container().parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: layerTop, behavior: 'smooth' });
    }
  } else {
    console.log(`[renderer] ensureLayer: Reusing existing layer for layerId=${layerId}`);
  }
  console.log(`[renderer] ensureLayer: Layer position - x:${layer.x()}, y:${layer.y()}, visible:${layer.visible()} stageAttached=${!!layer.getStage()}`);
  return layer;
}

function nx(x: number) {
  return Math.round(x * (stage?.width() || 800));
}
function ny(y: number) {
  return Math.round(y * stepHeight);
}

// REMOVED: reserveY function was causing visual element separation
// Now using direct coordinate positioning to keep related elements together

function clear(target?: 'all' | 'layer') {
  if (!stage) {
    console.log('[renderer] clear: No stage available');
    return;
  }
  if (target === 'all' || !target) {
    console.log('[renderer] clear: Clearing all - destroying children and resetting');
    stage.destroyChildren();
    layers.clear();
    subStepCounters.clear(); // Reset sub-step counters
    if (overlay) overlay.innerHTML = '';
    currentY = 0;
    
    // Reset to initial height, not expanding
    const initialHeight = Math.min(stepHeight, stage.container().parentElement?.clientHeight || stepHeight);
    stage.height(initialHeight);
    
    stage.container().parentElement?.scrollTo({ top: 0 });
    console.log(`[renderer] clear: Reset complete - stage now ${stage.width()}x${initialHeight}`);
    return;
  }
}

function drawAxis(layer: Konva.Layer, opts: { xLabel?: string; yLabel?: string }) {
  if (!stage) {
    console.error('[renderer] drawAxis: No stage available!');
    return;
  }
  const w = stage.width();
  const h = stepHeight;
  const margin = 50;
  const x0 = margin;
  const y0 = h - margin;
  const x1 = w - margin;
  const y1 = margin;

  console.log(`[renderer] drawAxis: stage=${w}x${h}, stepHeight=${stepHeight}, coords: (${x0},${y0}) to (${x1},${y1})`);

  // Animated axis drawing - start as points, then expand
  const xAxis = new Konva.Line({
    points: [x0, y0, x0, y0], // Start as point
    stroke: '#333',
    strokeWidth: 2
  });
  
  const yAxis = new Konva.Line({
    points: [x0, y0, x0, y0], // Start as point
    stroke: '#333',
    strokeWidth: 2
  });
  
  layer.add(xAxis);
  layer.add(yAxis);
  layer.draw();

  // Animate X-axis expansion
  const xTween = new Konva.Tween({
    node: xAxis,
    duration: 0.8,
    points: [x0, y0, x1, y0]
  });
  
  // Animate Y-axis expansion after X-axis
  const yTween = new Konva.Tween({
    node: yAxis,
    duration: 0.8,
    points: [x0, y0, x0, y1]
  });
  
  xTween.play();
  setTimeout(() => yTween.play(), 400);

  // Add labels with fade-in animation
  setTimeout(() => {
    const xText = new Konva.Text({ 
      text: opts.xLabel || 'x', 
      x: x1 - 30, 
      y: y0 + 8, 
      fill: '#333', 
      fontSize: 16,
      opacity: 0
    });
    const yText = new Konva.Text({ 
      text: opts.yLabel || 'y', 
      x: x0 - 35, 
      y: y1 - 20, 
      rotation: -90, 
      fill: '#333', 
      fontSize: 16,
      opacity: 0
    });
    
    layer.add(xText);
    layer.add(yText);
    layer.draw();
    
    // Fade in labels
    const xLabelTween = new Konva.Tween({ node: xText, duration: 0.5, opacity: 1 });
    const yLabelTween = new Konva.Tween({ node: yText, duration: 0.5, opacity: 1 });
    xLabelTween.play();
    yLabelTween.play();
    
    console.log(`[renderer] drawAxis: Animated labels added - x:"${opts.xLabel}" y:"${opts.yLabel}"`);
  }, 1200);

  console.log(`[renderer] drawAxis: Starting animated axis drawing`);
}

function drawLabel(layer: Konva.Layer, text: string, x: number, y: number, normalized?: boolean, color?: string, options?: any) {
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  
  // Enhanced options for production-quality rendering
  const fontSize = options?.fontSize || (options?.isTitle ? 28 : options?.isDefinition ? 20 : 16);
  const fontWeight = options?.bold || options?.isTitle ? 'bold' : 'normal';
  const fontStyle = options?.italic ? 'italic' : 'normal';
  const align = options?.align || 'left';
  const actualColor = color || (options?.isTitle ? '#FFD700' : options?.isDefinition ? '#00FF88' : '#ffffff');
  
  console.log(`[renderer] drawLabel: "${text}" at (${x},${y}) normalized=${normalized} -> canvas (${px},${py}) [${options?.isTitle ? 'TITLE' : options?.isDefinition ? 'DEFINITION' : 'TEXT'}]`);
  
  // Add background for important text with gradient for 3Blue1Brown style
  if (options?.isDefinition || options?.isImportant || options?.isTitle) {
    const padding = options?.isTitle ? 20 : 12;
    const gradientBg = new Konva.Rect({
      x: px - padding,
      y: py - padding / 2, // Fix Y position for proper text alignment
      width: text.length * fontSize * 0.65 + padding * 2, // Better width estimation
      height: fontSize * 1.8 + padding,
      fill: options?.bgColor || 'rgba(0, 0, 0, 0.85)',
      cornerRadius: 8,
      opacity: 0,
      strokeWidth: options?.isTitle ? 2 : 1,
      stroke: options?.isTitle ? '#FFD700' : 'rgba(255, 255, 255, 0.1)'
    });
    layer.add(gradientBg);
    
    // Fade in background
    const bgFade = new Konva.Tween({
      node: gradientBg,
      duration: 0.3,
      opacity: 0.8
    });
    bgFade.play();
  }
  
  const label = new Konva.Text({ 
    text: '', // Start empty for typewriter effect
    x: px, 
    y: py, 
    fill: actualColor,
    fontSize: fontSize,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontStyle: fontStyle,
    fontWeight: fontWeight,
    align: align,
    opacity: 1,
    // Add shadow for better readability
    shadowColor: 'black',
    shadowBlur: options?.isTitle ? 15 : 8,
    shadowOpacity: 0.5,
    shadowOffsetX: 2,
    shadowOffsetY: 2
  });
  
  layer.add(label);
  layer.draw();
  
  // Typewriter animation with variable speed
  const fullText = text;
  let currentIndex = 0;
  const typeSpeed = options?.isTitle ? 50 : 30; // Slower for titles
  
  const typeInterval = setInterval(() => {
    if (currentIndex <= fullText.length) {
      label.text(fullText.slice(0, currentIndex));
      layer.draw();
      currentIndex++;
    } else {
      clearInterval(typeInterval);
    }
  }, typeSpeed);
  
  console.log(`[renderer] drawLabel: Starting typewriter animation for "${text}" with speed ${typeSpeed}ms`);
}

function drawTitle(layer: Konva.Layer, text: string, y?: number, durationSec?: number) {
  if (!stage) return;
  const py = typeof y === 'number' ? ny(y) : ny(0.06);
  // Centered title across the full stage width
  const title = new Konva.Text({
    text,
    x: 0,
    y: py,
    width: stage.width(),
    align: 'center',
    fill: '#111',
    fontStyle: 'bold',
    fontSize: 28
  });
  title.opacity(0);
  layer.add(title);
  layer.draw();
  const tween = new Konva.Tween({ node: title, duration: Math.max(0.2, durationSec || 0.5), opacity: 1 });
  tween.play();
}

function drawMathLabel(tex: string, x: number, y: number, normalized?: boolean, stepId?: number) {
  if (!overlay || !stage) return;
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  
  // Get the actual layer for correct positioning - FIX for text disposition
  let actualLayerY = 0;
  if (stepId !== undefined) {
    // Find the most recent layer for this step
    for (const [key, layer] of layers) {
      if (Math.floor(key / 10000) === stepId) {
        actualLayerY = layer.y();
      }
    }
  }
  
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = px + 'px';
  // Correct positioning - no subtraction needed
  div.style.top = (actualLayerY + py) + 'px';
  div.style.color = '#FFE4B5';
  div.style.fontSize = '20px';
  div.style.fontFamily = 'Computer Modern, KaTeX_Main, serif';
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.8s ease-in';
  div.style.background = 'linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(40,40,55,0.95) 100%)';
  div.style.padding = '8px 12px';
  div.style.borderRadius = '6px';
  div.style.border = '1px solid rgba(255, 215, 0, 0.3)';
  div.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
  
  // Improved LaTeX-like rendering with ^{...}/_{...}
  let rendered = tex.replace(/\$\$/g, '');
  rendered = rendered.replace(/\\vec\{([^}]+)\}/g, '$1⃗');
  rendered = rendered.replace(/\\text\{([^}]+)\}/g, '$1');
  rendered = rendered.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  const subMap: { [k: string]: string } = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ','h':'ₕ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','p':'ₚ','s':'ₛ','t':'ₜ'};
  const supMap: { [k: string]: string } = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾' };
  const toSub = (s: string) => s.split('').map(c => subMap[c] || c).join('');
  const toSup = (s: string) => s.split('').map(c => supMap[c] || c).join('');
  rendered = rendered.replace(/_\{([^}]+)\}/g, (_, sub) => toSub(sub));
  rendered = rendered.replace(/\^\{([^}]+)\}/g, (_, sup) => toSup(sup));
  rendered = rendered.replace(/_([a-zA-Z0-9+\-=()])/g, (_, sub) => toSub(sub));
  rendered = rendered.replace(/\^([a-zA-Z0-9+\-=()])/g, (_, sup) => toSup(sup));
  rendered = rendered
    .replace(/\\cdot/g, '·')
    .replace(/\\sum/g, '∑')
    .replace(/\\int/g, '∫')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\infty/g, '∞')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥');
  
  div.innerHTML = rendered;
  overlay.appendChild(div);
  
  // Fade in animation
  setTimeout(() => {
    div.style.opacity = '1';
  }, 100);
  
  console.log(`[renderer] Enhanced math label: "${tex}" → "${rendered}" at (${px},${py})`);
}

async function drawCurve(layer: Konva.Layer, points: [number, number][], normalized?: boolean, color?: string, durationSec?: number, width?: number) {
  if (!stage || points.length < 2) return;
  
  // Convert points to canvas coordinates
  const canvasPoints = points.map(([x, y]) => 
    normalized ? [nx(x), ny(y)] : [x, y]
  ).flat();
  
  // Create the line with initial opacity 0
  const line = new Konva.Line({
    points: [],
    stroke: color || '#3b82f6',
    strokeWidth: width || 3,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 0,
    shadowColor: color || '#3b82f6',
    shadowBlur: 10,
    shadowOpacity: 0.3
  });
  layer.add(line);
  
  // Fade in the line
  const fadeIn = new Konva.Tween({
    node: line,
    duration: 0.3,
    opacity: 1
  });
  fadeIn.play();
  
  // Animate the curve drawing
  const duration = Math.max(0.5, durationSec || 2.0) * 1000;
  const totalPoints = points.length;
  const startTime = performance.now();
  
  return new Promise<void>((resolve) => {
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Ease-in-out animation
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const pointCount = Math.max(2, Math.floor(eased * totalPoints));
      const currentPoints = canvasPoints.slice(0, pointCount * 2);
      
      line.points(currentPoints);
      layer.batchDraw();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Add a subtle pulse at the end
        const pulse = new Konva.Tween({
          node: line,
          duration: 0.3,
          strokeWidth: (width || 3) * 1.2,
          onFinish: () => {
            const shrink = new Konva.Tween({
              node: line,
              duration: 0.3,
              strokeWidth: width || 3
            });
            shrink.play();
          }
        });
        pulse.play();
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// 3Blue1Brown-style vector drawing
function drawVector(layer: Konva.Layer, x1: number, y1: number, x2: number, y2: number, normalized?: boolean, color?: string, label?: string) {
  const px1 = normalized ? nx(x1) : x1;
  const py1 = normalized ? ny(y1) : y1;
  const px2 = normalized ? nx(x2) : x2;
  const py2 = normalized ? ny(y2) : y2;
  
  const vectorColor = color || '#ef4444';
  
  // Create arrow with animation
  const arrow = new Konva.Arrow({
    points: [px1, py1, px1, py1], // Start as point
    pointerLength: 10,
    pointerWidth: 10,
    fill: vectorColor,
    stroke: vectorColor,
    strokeWidth: 3,
    opacity: 0
  });
  
  layer.add(arrow);
  
  // Fade in and extend animation
  const fadeIn = new Konva.Tween({
    node: arrow,
    duration: 0.3,
    opacity: 1
  });
  
  const extend = new Konva.Tween({
    node: arrow,
    duration: 0.8,
    points: [px1, py1, px2, py2],
    easing: Konva.Easings.EaseInOut
  });
  
  fadeIn.play();
  setTimeout(() => extend.play(), 300);
  
  // Add label if provided
  if (label) {
    setTimeout(() => {
      const midX = (px1 + px2) / 2;
      const midY = (py1 + py2) / 2;
      const text = new Konva.Text({
        text: label,
        x: midX + 10,
        y: midY - 10,
        fill: vectorColor,
        fontSize: 14,
        fontStyle: 'italic',
        opacity: 0
      });
      layer.add(text);
      const textFade = new Konva.Tween({ node: text, duration: 0.5, opacity: 1 });
      textFade.play();
    }, 1100);
  }
  
  layer.draw();
  console.log(`[renderer] Vector drawn from (${px1},${py1}) to (${px2},${py2})`);
}

// Draw circle with animation
function drawCircle(layer: Konva.Layer, x: number, y: number, radius: number, normalized?: boolean, color?: string, fill?: boolean) {
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  const pr = normalized ? radius * (stage?.width() || 800) : radius;
  
  const circle = new Konva.Circle({
    x: px,
    y: py,
    radius: 0, // Start with radius 0
    stroke: color || '#10b981',
    strokeWidth: 2,
    fill: fill ? (color || '#10b981') : undefined,
    opacity: fill ? 0.3 : 1
  });
  
  layer.add(circle);
  
  // Animate radius expansion
  const expand = new Konva.Tween({
    node: circle,
    duration: 0.6,
    radius: pr,
    easing: Konva.Easings.BackEaseOut
  });
  
  expand.play();
  layer.draw();
  console.log(`[renderer] Circle drawn at (${px},${py}) with radius ${pr}`);
}

// Create orbital animation (for planets, electrons, etc.) - ENHANCED
function createOrbit(layer: Konva.Layer, action: any) {
  if (!stage) return;
  
  const centerX = action.centerX * (stage.width() || 800);
  const centerY = action.centerY * (stage.height() || 600);
  const orbitRadius = action.radius * Math.min(stage.width() || 800, stage.height() || 600);
  const objectRadius = action.objectRadius * 50; // Scale object size
  const color = action.color || '#3498db';
  
  // Add center object (sun/nucleus) with gradient and pulsing
  const center = new Konva.Circle({
    x: centerX,
    y: centerY,
    radius: objectRadius * 1.5,
    fill: action.centerColor || '#FFD700',
    shadowColor: action.centerColor || '#FFD700',
    shadowBlur: 30,
    shadowOpacity: 0.9
  });
  layer.add(center);
  
  // Add pulsing animation to center
  const centerPulse = new Konva.Animation((frame) => {
    if (!frame) return;
    const scale = 1 + Math.sin(frame.time * 0.002) * 0.1;
    center.scaleX(scale);
    center.scaleY(scale);
  }, layer);
  centerPulse.start();
  
  // Add pointer arrow to center if specified
  if (action.showCenterArrow) {
    const arrow = new Konva.Arrow({
      points: [centerX - 100, centerY - 100, centerX - 20, centerY - 20],
      pointerLength: 10,
      pointerWidth: 10,
      fill: '#FF0000',
      stroke: '#FF0000',
      strokeWidth: 2,
      opacity: 0
    });
    layer.add(arrow);
    
    const arrowFade = new Konva.Tween({
      node: arrow,
      duration: 0.5,
      opacity: 0.8
    });
    arrowFade.play();
  }
  
  // Create orbit path
  const orbitPath = new Konva.Circle({
    x: centerX,
    y: centerY,
    radius: orbitRadius,
    stroke: 'rgba(255, 255, 255, 0.2)',
    strokeWidth: 1,
    dash: [5, 5],
    opacity: 0
  });
  layer.add(orbitPath);
  
  // Fade in orbit path
  const pathFade = new Konva.Tween({
    node: orbitPath,
    duration: 0.5,
    opacity: 1
  });
  pathFade.play();
  
  // Create orbiting object
  const object = new Konva.Circle({
    x: centerX + orbitRadius,
    y: centerY,
    radius: 0,
    fill: color,
    shadowColor: color,
    shadowBlur: 20,
    shadowOpacity: 0.6
  });
  layer.add(object);
  
  // Animate object appearance
  const objectAppear = new Konva.Tween({
    node: object,
    duration: 0.5,
    radius: objectRadius,
    easing: Konva.Easings.BackEaseOut
  });
  objectAppear.play();
  
  // Create trail if requested
  let trail: Konva.Line | null = null;
  const trailPoints: number[] = [];
  if (action.trail) {
    trail = new Konva.Line({
      points: [],
      stroke: color,
      strokeWidth: 2,
      opacity: 0.3,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(trail);
    trail.moveToBottom();
    orbitPath.moveToBottom();
  }
  
  // Create orbital motion
  const orbitAnimation = new Konva.Animation((frame) => {
    if (!frame) return;
    const angle = (frame.time / (action.period * 1000)) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    object.position({ x, y });
    
    // Update trail
    if (trail && action.trail) {
      trailPoints.push(x, y);
      if (trailPoints.length > 200) { // Keep last 100 points
        trailPoints.splice(0, 2);
      }
      trail.points(trailPoints);
    }
  }, layer);
  
  // Start animation after appearance
  setTimeout(() => orbitAnimation.start(), 500);
  
  return orbitAnimation;
}

// Create wave animation
function createWave(layer: Konva.Layer, action: any) {
  if (!stage) return;
  
  const startX = action.startX * (stage.width() || 800);
  const startY = action.startY * (stage.height() || 600);
  const width = action.width * (stage.width() || 800);
  const amplitude = action.amplitude * 100;
  const color = action.color || '#00bbff';
  
  const waveLine = new Konva.Line({
    points: [],
    stroke: color,
    strokeWidth: 3,
    lineCap: 'round',
    lineJoin: 'round',
    tension: 0.5,
    opacity: 0,
    shadowColor: color,
    shadowBlur: 10,
    shadowOpacity: 0.5
  });
  layer.add(waveLine);
  
  // Fade in
  const fadeIn = new Konva.Tween({
    node: waveLine,
    duration: 0.5,
    opacity: 1
  });
  fadeIn.play();
  
  // Wave animation
  const waveAnimation = new Konva.Animation((frame) => {
    if (!frame) return;
    const time = frame.time * 0.001 * action.speed;
    const points: number[] = [];
    
    for (let x = 0; x <= width; x += 2) {
      const normalizedX = x / width;
      const y = Math.sin(2 * Math.PI * action.frequency * normalizedX - time) * amplitude;
      points.push(startX + x, startY + y);
    }
    
    waveLine.points(points);
  }, layer);
  
  waveAnimation.start();
  return waveAnimation;
}

// Create particle system
function createParticles(layer: Konva.Layer, action: any) {
  if (!stage) return;
  
  const centerX = action.x * (stage.width() || 800);
  const centerY = action.y * (stage.height() || 600);
  const particles: any[] = [];
  const particleGroup = new Konva.Group();
  layer.add(particleGroup);
  
  // Create particles
  for (let i = 0; i < action.count; i++) {
    const angle = (Math.PI * 2 * i) / action.count + Math.random() * action.spread;
    const speed = action.speed * (0.5 + Math.random());
    
    const particle = {
      node: new Konva.Circle({
        x: centerX,
        y: centerY,
        radius: 2 + Math.random() * 2,
        fill: action.color || '#FFD700',
        opacity: 1,
        shadowColor: action.color || '#FFD700',
        shadowBlur: 10,
        shadowOpacity: 0.8
      }),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: action.lifetime
    };
    
    particleGroup.add(particle.node);
    particles.push(particle);
  }
  
  // Animate particles
  const particleAnimation = new Konva.Animation((frame) => {
    if (!frame) return;
    const dt = frame.timeDiff * 0.001;
    
    particles.forEach(particle => {
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.node.opacity(0);
        return;
      }
      
      const opacity = Math.max(0, particle.life / action.lifetime);
      particle.node.opacity(opacity);
      
      const x = particle.node.x() + particle.vx * dt;
      const y = particle.node.y() + particle.vy * dt;
      particle.node.position({ x, y });
    });
  }, layer);
  
  particleAnimation.start();
  
  // Clean up after lifetime
  setTimeout(() => {
    particleAnimation.stop();
    particleGroup.destroy();
  }, action.lifetime * 1000);
  
  return particleAnimation;
}

// Create animated arrow with ENHANCED educational features
function createAnimatedArrow(layer: Konva.Layer, action: any) {
  if (!stage) return;
  
  const x = action.x * (stage.width() || 800);
  const y = action.y * (stage.height() || 600);
  const length = action.length * 100;
  const angle = action.angle || 0;
  const color = action.color || '#00ff88';
  
  // Add glow effect for emphasis
  const glowCircle = new Konva.Circle({
    x: x,
    y: y,
    radius: 15,
    fill: color,
    opacity: 0.2,
    shadowColor: color,
    shadowBlur: 25,
    shadowOpacity: 0.5
  });
  layer.add(glowCircle);
  
  // Animate glow expansion
  const glowTween = new Konva.Tween({
    node: glowCircle,
    duration: 0.5,
    radius: 30,
    opacity: 0,
    onFinish: () => glowCircle.destroy()
  });
  glowTween.play();
  
  // Calculate end point PRECISELY
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  
  const arrow = new Konva.Arrow({
    points: [x, y, x, y], // Start collapsed
    pointerLength: 12,
    pointerWidth: 12,
    fill: color,
    stroke: color,
    strokeWidth: 3,
    opacity: 0,
    shadowColor: color,
    shadowBlur: 15,
    shadowOpacity: 0.5
  });
  layer.add(arrow);
  
  // Fade in and extend
  const fadeIn = new Konva.Tween({
    node: arrow,
    duration: 0.3,
    opacity: 1
  });
  
  const extend = new Konva.Tween({
    node: arrow,
    duration: 0.8,
    points: [x, y, endX, endY],
    easing: Konva.Easings.EaseInOut
  });
  
  fadeIn.play();
  setTimeout(() => extend.play(), 300);
  
  // Add pulsing animation if requested
  if (action.animated) {
    // Create SUBTLE pulsing animation (not wild vibration!)
    const pulseAnimation = new Konva.Animation((frame) => {
      if (!frame) return;
      // Much smaller amplitude for precise pointing
      const scale = 1 + Math.sin(frame.time * 0.003) * 0.05; // Only 5% variation
      arrow.scaleX(scale);
      arrow.scaleY(scale);
      // Slight position adjustment for pointing effect
      const offsetX = Math.sin(frame.time * 0.002) * 2; // Max 2px movement
      const offsetY = Math.cos(frame.time * 0.002) * 2;
      arrow.points([x + offsetX, y + offsetY, endX, endY]);
    }, layer);
    pulseAnimation.start();
    return pulseAnimation;
  }
}

// Create vector field
function createVectorField(layer: Konva.Layer, action: any) {
  if (!stage) return;
  
  const width = stage.width() || 800;
  const height = stage.height() || 600;
  const gridSize = action.gridSize;
  const arrows: Konva.Arrow[] = [];
  
  // Create grid of arrows
  for (let x = gridSize; x < width; x += gridSize) {
    for (let y = gridSize; y < height; y += gridSize) {
      const arrow = new Konva.Arrow({
        points: [x, y, x, y],
        pointerLength: 5,
        pointerWidth: 5,
        fill: '#10b981',
        stroke: '#10b981',
        strokeWidth: 1,
        opacity: 0.4
      });
      layer.add(arrow);
      arrows.push(arrow);
    }
  }
  
  // Animate field
  const fieldAnimation = new Konva.Animation((frame) => {
    if (!frame) return;
    const time = frame.time * 0.001;
    
    arrows.forEach(arrow => {
      const points = arrow.points();
      const x = points[0];
      const y = points[1];
      
      let vx = 0, vy = 0;
      
      switch (action.type) {
        case 'vector':
          // Circular vector field
          vx = -(y - height/2) / 100;
          vy = (x - width/2) / 100;
          break;
        case 'electric':
          // Radial field from center
          const dx = x - width/2;
          const dy = y - height/2;
          const dist = Math.sqrt(dx*dx + dy*dy) + 1;
          vx = (dx / dist) * action.strength;
          vy = (dy / dist) * action.strength;
          break;
        case 'magnetic':
          // Rotating field
          vx = Math.sin(time + x * 0.01) * action.strength;
          vy = Math.cos(time + y * 0.01) * action.strength;
          break;
      }
      
      const scale = 20;
      arrow.points([x, y, x + vx * scale, y + vy * scale]);
    });
  }, layer);
  
  fieldAnimation.start();
  return fieldAnimation;
}

// Draw rectangle with animation
function drawRect(layer: Konva.Layer, x: number, y: number, width: number, height: number, normalized?: boolean, color?: string, fill?: boolean) {
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  const pw = normalized ? width * (stage?.width() || 800) : width;
  const ph = normalized ? height * stepHeight : height;
  
  const rect = new Konva.Rect({
    x: px,
    y: py,
    width: 0,
    height: 0,
    stroke: color || '#f59e0b',
    strokeWidth: 2,
    fill: fill ? (color || '#f59e0b') : undefined,
    opacity: fill ? 0.2 : 1
  });
  
  layer.add(rect);
  
  // Animate size expansion
  const expand = new Konva.Tween({
    node: rect,
    duration: 0.7,
    width: pw,
    height: ph,
    easing: Konva.Easings.EaseInOut
  });
  
  expand.play();
  layer.draw();
  console.log(`[renderer] Rectangle drawn at (${px},${py}) with size ${pw}x${ph}`);
}

export async function initRenderer(s: Konva.Stage, overlayDiv: HTMLDivElement) {
  stage = s;
  overlay = overlayDiv;
  console.log(`[renderer] initRenderer: stage size ${stage.width()}x${stage.height()}`);
  
  // Fix purple/colorful blinking - set proper background
  const container = stage.container();
  container.style.background = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)';
  container.style.transition = 'none'; // Remove transition that causes blinking
  
  clear('all');
  // Flush any chunks that arrived before init
  if (pendingChunks.length) {
    const queued = pendingChunks.splice(0);
    console.log(`[renderer] Flushing queued chunks: ${queued.length}`);
    for (const c of queued) {
      await execChunk(c);
    }
  }
}

export async function execChunk(chunk: RenderChunk) {
  if (chunk.type !== 'actions' || chunk.stepId === undefined || chunk.stepId === null) {
    console.error('[renderer] Invalid chunk received:', chunk);
    return;
  }
  
  // Try to use enhanced renderer if available
  const enhancedRenderer = (window as any).enhancedRenderer;
  if (enhancedRenderer) {
    console.log('[renderer] Using enhanced renderer for step:', chunk.stepId);
    try {
      await enhancedRenderer.renderStep({
        stepId: String(chunk.stepId),
        stepTitle: chunk.step?.desc,
        actions: chunk.actions || [],
        plan: chunk.plan
      });
      return;
    } catch (error) {
      console.warn('[renderer] Enhanced renderer failed, falling back to standard:', error);
    }
  }
  
  if (!stage) {
    console.warn('[renderer] Stage not initialized yet; queuing chunk for later flush:', {
      stepId: chunk.stepId,
      actions: chunk.actions?.length || 0
    });
    pendingChunks.push(chunk);
    return;
  }
  
  // Always create a new layer for each chunk to accumulate content
  // This ensures each part (Part A, Part B, etc.) gets its own layer
  let layer = ensureLayer(chunk.stepId, true);

  for (const action of chunk.actions) {
    switch (action.op) {
      case 'clear':
        // Clearing the stage destroys all children, including our current layer.
        // Recreate/re-ensure the layer immediately after clearing so subsequent
        // draw operations render to a live layer attached to the stage.
        clear(action.target);
        layer = ensureLayer(chunk.stepId, true);
        break;
      case 'drawAxis':
        drawAxis(layer, { xLabel: action.xLabel, yLabel: action.yLabel });
        break;
      case 'drawLabel':
        drawLabel(layer, action.text, action.x, action.y, action.normalized, action.color, {
          isTitle: action.isTitle,
          isDefinition: action.isDefinition,
          isImportant: action.isImportant,
          fontSize: action.fontSize,
          bold: action.bold,
          italic: action.italic,
          align: action.align,
          bgColor: action.bgColor
        });
        break;
      case 'drawMathLabel':
        drawMathLabel(action.tex, action.x, action.y, action.normalized, chunk.stepId);
        break;
      case 'drawCurve':
        await drawCurve(layer, action.points, action.normalized, action.color, action.duration, action.width);
        break;
      case 'drawVector':
        drawVector(layer, action.x1, action.y1, action.x2, action.y2, action.normalized, action.color, action.label);
        await new Promise(resolve => setTimeout(resolve, 1200)); // Wait for animation
        break;
      case 'drawCircle':
        drawCircle(layer, action.x, action.y, action.radius, action.normalized, action.color, action.fill);
        await new Promise(resolve => setTimeout(resolve, 700)); // Wait for animation
        break;
      case 'drawRect':
        drawRect(layer, action.x, action.y, action.width, action.height, action.normalized, action.color, action.fill);
        await new Promise(resolve => setTimeout(resolve, 800)); // Wait for animation
        break;
      case 'delay':
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, (action.duration || 0) * 1000)));
        break;
      case 'drawTitle':
        drawTitle(layer, action.text, (action as any).y, (action as any).duration);
        break;
      // New 3Blue1Brown-style animations
      case 'orbit':
        createOrbit(layer, action);
        // Let orbit animation run for at least one full cycle
        await new Promise(resolve => setTimeout(resolve, Math.min(action.period * 1000, 5000)));
        break;
      case 'wave':
        createWave(layer, action);
        // Let wave animation establish pattern
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      case 'particle':
        createParticles(layer, action);
        // Let particles spread and be visible
        await new Promise(resolve => setTimeout(resolve, Math.min(action.lifetime * 500, 2000)));
        break;
      case 'arrow':
        createAnimatedArrow(layer, action);
        // Ensure arrow is fully extended and visible
        await new Promise(resolve => setTimeout(resolve, action.animated ? 2000 : 1500));
        break;
      case 'field':
        createVectorField(layer, action);
        // Let field pattern establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      case 'pulse':
        // Pulse animation for existing objects
        if (action.targetId) {
          const target = layer.findOne(`#${action.targetId}`);
          if (target) {
            const pulseAnim = new Konva.Animation((frame) => {
              if (!frame) return;
              const scale = 1 + Math.sin(frame.time * 0.003) * (action.scale - 1);
              target.scaleX(scale);
              target.scaleY(scale);
            }, layer);
            pulseAnim.start();
            if (action.repeat && action.repeat > 0) {
              setTimeout(() => pulseAnim.stop(), action.duration * 1000);
            }
          }
        }
        break;
      case 'rotate':
        // Rotation animation for existing objects
        if (action.targetId) {
          const target = layer.findOne(`#${action.targetId}`);
          if (target) {
            const rotateTween = new Konva.Tween({
              node: target,
              duration: action.duration,
              rotation: action.angle,
              easing: Konva.Easings.EaseInOut
            });
            rotateTween.play();
            await new Promise(resolve => setTimeout(resolve, action.duration * 1000));
          }
        }
        break;
      case 'flow':
        // Particle flow along a path
        const flowParticles: any[] = [];
        const flowGroup = new Konva.Group();
        layer.add(flowGroup);
        
        // Create flow path visualization
        const flowPath = new Konva.Line({
          points: action.path.flat(),
          stroke: 'rgba(255, 255, 255, 0.1)',
          strokeWidth: 2,
          dash: [5, 5]
        });
        layer.add(flowPath);
        flowPath.moveToBottom();
        
        // Create flowing particles
        for (let i = 0; i < action.particleCount; i++) {
          const particle = new Konva.Circle({
            x: action.path[0][0],
            y: action.path[0][1],
            radius: 3,
            fill: action.color || '#00bbff',
            opacity: 0.8,
            shadowColor: action.color || '#00bbff',
            shadowBlur: 10,
            shadowOpacity: 0.5
          });
          flowGroup.add(particle);
          flowParticles.push({
            node: particle,
            pathIndex: 0,
            progress: i * (1 / action.particleCount)
          });
        }
        
        // Animate flow
        const flowAnimation = new Konva.Animation((frame) => {
          if (!frame) return;
          const dt = frame.timeDiff * 0.001;
          
          flowParticles.forEach(p => {
            p.progress += action.speed * dt * 0.1;
            if (p.progress >= 1) {
              p.progress = 0;
              p.pathIndex = (p.pathIndex + 1) % (action.path.length - 1);
            }
            
            const start = action.path[p.pathIndex];
            const end = action.path[p.pathIndex + 1] || action.path[0];
            const x = start[0] + (end[0] - start[0]) * p.progress;
            const y = start[1] + (end[1] - start[1]) * p.progress;
            p.node.position({ x, y });
          });
        }, layer);
        flowAnimation.start();
        break;
      default:
        console.warn('[renderer] Unknown action operation:', action);
        break;
    }
  }
}
