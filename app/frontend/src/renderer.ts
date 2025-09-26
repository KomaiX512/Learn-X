import Konva from 'konva';

type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' }
  | { op: 'delay'; duration: number }
  | { op: 'drawTitle'; text: string; y?: number; duration?: number };

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
// Queue chunks that arrive before the stage is initialized
const pendingChunks: RenderChunk[] = [];

function ensureLayer(stepId: number): Konva.Layer {
  if (!stage) throw new Error('Stage not initialized');
  let layer = layers.get(stepId) || null;

  // If we have a cached layer but it's no longer attached to a stage
  // (e.g., after clear() with destroyChildren), discard and recreate it.
  if (layer && !layer.getStage()) {
    console.log(`[renderer] ensureLayer: Cached layer for stepId=${stepId} is detached, recreating.`);
    layers.delete(stepId);
    layer = null;
  }

  if (!layer) {
    console.log(`[renderer] ensureLayer: Creating new layer for stepId=${stepId} at currentY=${currentY}`);
    const layerTop = currentY;
    layer = new Konva.Layer({ y: layerTop });
    stage.add(layer);
    layers.set(stepId, layer);
    const newHeight = currentY + stepHeight;
    stage.height(newHeight);
    if (overlay) overlay.style.height = `${newHeight}px`;
    console.log(`[renderer] ensureLayer: Stage dimensions now ${stage.width()}x${newHeight}, layer at y=${currentY}`);
    currentY += stepHeight;
    // Scroll to the new layer
    stage.container().parentElement?.scrollTo({ top: layerTop, behavior: 'smooth' });
  } else {
    console.log(`[renderer] ensureLayer: Reusing existing layer for stepId=${stepId}`);
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

function clear(target?: 'all' | 'layer') {
  if (!stage) {
    console.log('[renderer] clear: No stage available');
    return;
  }
  if (target === 'all' || !target) {
    console.log('[renderer] clear: Clearing all - destroying children and resetting');
    stage.destroyChildren();
    layers.clear();
    if (overlay) overlay.innerHTML = '';
    currentY = 0;
    stage.height(stepHeight);
    stage.container().parentElement?.scrollTo({ top: 0 });
    console.log(`[renderer] clear: Reset complete - stage now ${stage.width()}x${stepHeight}`);
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

function drawMathLabel(tex: string, x: number, y: number, normalized?: boolean) {
  if (!overlay || !stage) return;
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = px + 'px';
  div.style.top = (currentY - stepHeight + py) + 'px';
  div.style.color = '#2c3e50';
  div.style.fontSize = '18px';
  div.style.fontFamily = 'KaTeX_Main, serif';
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.8s ease-in';
  div.style.background = 'rgba(255,255,255,0.9)';
  div.style.padding = '4px 8px';
  div.style.borderRadius = '4px';
  div.style.border = '1px solid #e0e0e0';
  
  // Enhanced LaTeX-like rendering
  let rendered = tex
    .replace(/\$\$/g, '')
    .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\_/g, '₋')
    .replace(/\^([0-9]+)/g, '⁺$1')
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
  if (!stage) return;
  const pts = points.map(([x, y]) => (normalized ? [nx(x), ny(y)] : [x, y])).flat();
  const line = new Konva.Line({
    points: [],
    stroke: color || '#0b82f0',
    strokeWidth: width || 2,
    lineCap: 'round',
    lineJoin: 'round'
  });
  layer.add(line);

  const total = points.length;
  const duration = Math.max(0.2, durationSec || 1.0);
  const start = performance.now();

  return new Promise<void>((resolve) => {
    function step(now: number) {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const count = Math.max(2, Math.floor(t * total));
      const sub = pts.slice(0, count * 2);
      line.points(sub);
      layer.batchDraw();
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
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
  let layer = ensureLayer(chunk.stepId);

  for (const action of chunk.actions) {
    switch (action.op) {
      case 'clear':
        // Clearing the stage destroys all children, including our current layer.
        // Recreate/re-ensure the layer immediately after clearing so subsequent
        // draw operations render to a live layer attached to the stage.
        clear(action.target);
        layer = ensureLayer(chunk.stepId);
        break;
      case 'drawAxis':
        drawAxis(layer, { xLabel: action.xLabel, yLabel: action.yLabel });
        break;
      case 'drawLabel':
        drawLabel(layer, action.text, action.x, action.y, action.normalized, action.color);
        break;
      case 'drawMathLabel':
        drawMathLabel(action.tex, action.x, action.y, action.normalized);
        break;
      case 'drawCurve':
        await drawCurve(layer, action.points, action.normalized, action.color, action.duration, action.width);
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
