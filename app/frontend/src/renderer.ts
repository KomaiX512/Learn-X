import Konva from 'konva';

type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' };

export interface RenderChunk {
  type: 'actions';
  actions: Action[];
  stepId?: number;
  step?: any;
}

let stage: Konva.Stage | null = null;
const layers: Map<number, Konva.Layer> = new Map();
let overlay: HTMLDivElement | null = null;
let currentY = 0;
const stepHeight = 500; // Height of each step/layer

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

  const axis = new Konva.Line({
    points: [x0, y0, x1, y0, x0, y0, x0, y1],
    stroke: '#333',
    strokeWidth: 2
  });
  layer.add(axis);
  console.log('[renderer] drawAxis: Line added to layer');

  const xText = new Konva.Text({ text: opts.xLabel || 'x', x: x1 - 30, y: y0 + 8, fill: '#333', fontSize: 16 });
  const yText = new Konva.Text({ text: opts.yLabel || 'y', x: x0 - 35, y: y1 - 20, rotation: -90, fill: '#333', fontSize: 16 });
  layer.add(xText);
  layer.add(yText);
  console.log(`[renderer] drawAxis: Text labels added - x:"${opts.xLabel}" y:"${opts.yLabel}"`);

  layer.draw();
  console.log(`[renderer] drawAxis: Layer draw() called - layer children count: ${layer.children.length}`);
}

function drawLabel(layer: Konva.Layer, text: string, x: number, y: number, normalized?: boolean, color?: string) {
  const px = normalized ? nx(x) : x;
  const py = normalized ? ny(y) : y;
  console.log(`[renderer] drawLabel: "${text}" at (${x},${y}) normalized=${normalized} -> canvas (${px},${py})`);
  
  const label = new Konva.Text({ text, x: px, y: py, fill: color || '#111', fontSize: 16 });
  label.opacity(0);
  layer.add(label);
  layer.draw();
  console.log(`[renderer] drawLabel: Added to layer, starting tween animation`);
  
  const tween = new Konva.Tween({ node: label, duration: 0.4, opacity: 1 });
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
  div.style.color = '#111';
  div.style.fontSize = '16px';
  overlay.appendChild(div);
  div.textContent = tex;
  (window as any).MathJax?.typesetPromise?.([div]);
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

export function initRenderer(s: Konva.Stage, overlayDiv: HTMLDivElement) {
  console.log('[renderer] Initializing renderer with stage:', s, 'overlay:', overlayDiv);
  stage = s;
  overlay = overlayDiv;
  clear('all');
  console.log('[renderer] Renderer initialized successfully');
}

export async function execChunk(chunk: RenderChunk) {
  console.log(`[renderer] START: Executing chunk for stepId=${chunk.stepId}`);
  if (chunk.type !== 'actions' || !chunk.stepId) {
    console.error('[renderer] Invalid chunk received:', chunk);
    return;
  }
  let layer = ensureLayer(chunk.stepId);
  console.log(`[renderer] Ensured layer for stepId=${chunk.stepId}`);

  for (const action of chunk.actions) {
    console.log(`[renderer] Executing action:`, action);
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
      default:
        console.warn('[renderer] Unknown action operation:', action);
        break;
    }
  }
  console.log(`[renderer] END: Finished executing chunk for stepId=${chunk.stepId}`);
}
