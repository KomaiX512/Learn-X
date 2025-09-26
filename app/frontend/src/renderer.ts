import Konva from 'konva';

type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' }
  | { op: 'delay'; duration: number }
  | { op: 'drawTitle'; text: string; y?: number; duration?: number }
  | { op: 'drawVector'; normalized?: boolean; x1: number; y1: number; x2: number; y2: number; color?: string; label?: string }
  | { op: 'drawCircle'; normalized?: boolean; x: number; y: number; radius: number; color?: string; fill?: boolean }
  | { op: 'drawRect'; normalized?: boolean; x: number; y: number; width: number; height: number; color?: string; fill?: boolean }
  | { op: 'highlight'; targetId: string; color?: string; duration?: number };

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
const stepHeight = 500; // Height of each step/layer
const MAX_CANVAS_HEIGHT = 10000; // Increased to allow more content
// Queue chunks that arrive before the stage is initialized
const pendingChunks: RenderChunk[] = [];
// Track sub-steps to ensure each part gets its own layer
const subStepCounters: Map<number, number> = new Map();

function ensureLayer(stepId: number, forceNew: boolean = false): Konva.Layer {
  if (!stage) throw new Error('Stage not initialized');
  
  // Generate unique layer ID for sub-steps
  let layerId = stepId;
  if (forceNew) {
    const subStepCount = subStepCounters.get(stepId) || 0;
    subStepCounters.set(stepId, subStepCount + 1);
    layerId = stepId * 1000 + subStepCount; // Create unique ID for sub-step
  }
  
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

function drawLabel(layer: Konva.Layer, text: string, x: number, y: number, normalized?: boolean, color?: string) {
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  console.log(`[renderer] drawLabel: "${text}" at (${x},${y}) normalized=${normalized} -> canvas (${px},${py})`);
  
  const label = new Konva.Text({ 
    text: '', // Start empty for typewriter effect
    x: px, 
    y: py, 
    fill: color || '#111', 
    fontSize: 16,
    opacity: 1
  });
  
  layer.add(label);
  layer.draw();
  
  // Typewriter animation
  const fullText = text;
  let currentIndex = 0;
  
  const typeInterval = setInterval(() => {
    if (currentIndex <= fullText.length) {
      label.text(fullText.slice(0, currentIndex));
      layer.draw();
      currentIndex++;
    } else {
      clearInterval(typeInterval);
    }
  }, 30); // 30ms per character for smooth typewriter effect
  
  console.log(`[renderer] drawLabel: Starting typewriter animation for "${text}"`);
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
  
  // Get the layer's Y position for this step
  const layer = stepId !== undefined ? layers.get(stepId) : null;
  const layerY = layer ? layer.y() : 0;
  
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = px + 'px';
  // Position relative to the layer's position
  div.style.top = (layerY + py) + 'px';
  div.style.color = '#2c3e50';
  div.style.fontSize = '18px';
  div.style.fontFamily = 'KaTeX_Main, serif';
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.8s ease-in';
  div.style.background = 'rgba(255,255,255,0.9)';
  div.style.padding = '4px 8px';
  div.style.borderRadius = '4px';
  div.style.border = '1px solid #e0e0e0';
  
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
        drawLabel(layer, action.text, action.x, action.y, action.normalized, action.color);
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
      default:
        console.warn('[renderer] Unknown action operation:', action);
        break;
    }
  }
}
