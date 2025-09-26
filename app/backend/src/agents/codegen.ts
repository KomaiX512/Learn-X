import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep, RenderChunk, SessionParams } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 60000);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  logger.debug(`[timeout] Setting ${ms}ms timeout for ${label}`);
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        logger.debug(`[timeout] ${label} timed out after ${ms}ms`);
        reject(new Error(`${label} timeout after ${ms}ms`));
      }, ms);
      p.finally(() => clearTimeout(timer));
    })
  ]) as Promise<T>;
}

function fixJsonSyntax(jsonText: string): string {
  let fixed = jsonText
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double
    .replace(/\\n/g, ' ')  // Replace newlines with spaces
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  
  for (let i = 0; i < openBraces - closeBraces; i++) {
    fixed += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    fixed += ']';
  }
  
  return fixed;
}

export async function codegenAgent(
  step: PlanStep,
  params: SessionParams = {},
  query?: string,
  onChunk?: (chunk: RenderChunk) => void
): Promise<RenderChunk> {
  logger.debug(`[codegen] START: stepId=${step.id} tag=${step.tag}`, { params, query });

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set - NO FALLBACKS ALLOWED');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });

  // Intelligent decision algorithm for visual approach
  const topicLower = (query || step.desc).toLowerCase();
  
  // Determine if we need custom sketches vs shapes
  const needsCustomSketch = 
    topicLower.includes('anatomy') || 
    topicLower.includes('neuron') || 
    topicLower.includes('biological') ||
    topicLower.includes('comet') ||
    topicLower.includes('structure') ||
    topicLower.includes('organ') ||
    topicLower.includes('cell') ||
    topicLower.includes('body') ||
    topicLower.includes('tissue') ||
    // CIRCUITS NEED CUSTOM SYMBOLS, NOT CIRCLES!
    topicLower.includes('circuit') ||
    topicLower.includes('rlc') ||
    topicLower.includes('resistor') ||
    topicLower.includes('capacitor') ||
    topicLower.includes('inductor') ||
    topicLower.includes('transistor');
    
  const needsShapes = 
    topicLower.includes('network') && !topicLower.includes('neural') ||
    topicLower.includes('geometric') ||
    topicLower.includes('solar') ||
    topicLower.includes('orbit') ||
    topicLower.includes('matrix') ||
    topicLower.includes('vector') && !topicLower.includes('circuit');
    
  const needsMath = 
    topicLower.includes('function') ||
    topicLower.includes('equation') ||
    topicLower.includes('derivative') ||
    topicLower.includes('integral') ||
    topicLower.includes('sine') ||
    topicLower.includes('cosine') ||
    topicLower.includes('exponential');

  const prompt = [
    'You are a 3Blue1Brown-style educator creating profound visual mathematics animations.',
    'Output STRICT JSON: { "type": "actions", "actions": [action_objects] }',
    '',
    '⚠️ CRITICAL JSON RULES:',
    '- Output ONLY valid JSON, no JavaScript expressions',
    '- Use numbers not Math.PI (use 3.14159 instead)',
    '- Use numbers not Math.sin() (calculate the value)',
    '- All strings must be in double quotes',
    '- No comments, no trailing commas',
    '',
    '🎯 INTELLIGENT VISUAL SELECTION BASED ON CONTEXT:',
    '',
    needsCustomSketch ? 
    '🎨 CUSTOM SKETCH MODE - This topic needs technical symbols or anatomical sketches:' +
    '\n- For CIRCUITS: Draw proper electrical symbols using curves and lines:' +
    '\n  • Resistor: zigzag line using drawCurve with points [[x,y],[x+0.02,y+0.01],[x+0.04,y-0.01]...]' +
    '\n  • Capacitor: two parallel lines using drawRect or drawVector' +
    '\n  • Inductor: coil using drawCurve with sinusoidal points' +
    '\n  • NEVER use circles for circuit components!' +
    '\n- For ANATOMY: Use multiple curves to create organic shapes' +
    '\n- ADD precise arrows pointing EXACTLY at components (not vibrating wildly!)' +
    '\n- LABEL each component clearly' :
    needsShapes ?
    '📐 GEOMETRIC SHAPES MODE - This topic works well with predefined shapes:' +
    '\n- USE drawCircle for nodes, planets, atoms' +
    '\n- USE drawRect for matrices, grids, components' +
    '\n- USE drawVector for connections, forces' +
    '\n- COMBINE shapes to build complex structures' +
    '\n- ADD arrows to show relationships' :
    needsMath ?
    '📊 MATHEMATICAL VISUALIZATION MODE - This topic needs graphs and equations:' +
    '\n- USE drawAxis for coordinate systems' +
    '\n- USE drawCurve with 50-100 points for smooth functions' +
    '\n- USE drawMathLabel for equations' +
    '\n- ADD arrows at critical points (maxima, minima, inflection)' :
    '⚖️ BALANCED MODE - Mix custom sketches and shapes as needed:' +
    '\n- ANALYZE what needs organic shapes vs geometric shapes' +
    '\n- USE drawCurve for irregular/organic forms' +
    '\n- USE shapes for regular/geometric forms' +
    '\n- COMBINE both approaches intelligently',
    '',
    '📍 UNIVERSAL RULES - ALWAYS APPLY:',
    '- Add arrow pointers to highlight important features',
    '- Use labels to explain what viewers are seeing',
    '- Include 10-15 visual actions minimum',
    '- Add delays for proper pacing',
    '',
    '⚠️ CRITICAL: AVOID REPETITION!',
    '- NEVER repeat the same diagram in multiple steps',
    '- Each step MUST show a NEW aspect or perspective',
    '- Build upon previous concepts, don\'t redraw them',
    '- Step 1: Basic structure',
    '- Step 2: Add dynamics/forces/interactions',
    '- Step 3: Show variations/applications',
    '- Step 4: Advanced concepts/edge cases',
    '- Step 5: Summary with NEW insights',
    '',
    '🎨 CUSTOM SKETCH TECHNIQUE (when needed):',
    '- Use drawCurve with irregular points to create organic shapes',
    '- Build structures with multiple overlapping curves',
    '- Example for neuron body:',
    '  { "op": "drawCurve", "points": [[0.4,0.5],[0.42,0.48],[0.45,0.47]...], "color": "#8B4513" }',
    '- Example for comet nucleus:',
    '  { "op": "drawCurve", "points": [[0.5,0.5],[0.52,0.51],[0.53,0.53]...], "color": "#696969" }',
    '',
    '📊 AVAILABLE ANIMATION OPERATIONS:',
    '- { "op": "orbit", "centerX": 0.5, "centerY": 0.5, "radius": 0.2, "period": 5, "objectRadius": 0.03, "color": "#FFD700", "trail": true }',
    '  For: Planets, electrons, circular motion. centerX/Y are normalized (0-1), period in seconds',
    '',
    '- { "op": "wave", "startX": 0.1, "startY": 0.5, "width": 0.8, "amplitude": 0.1, "frequency": 2, "speed": 1, "color": "#00bbff" }',
    '  For: Sound waves, light waves, oscillations. All positions normalized',
    '',
    '- { "op": "particle", "x": 0.5, "y": 0.5, "count": 20, "spread": 0.5, "speed": 50, "color": "#FFD700", "lifetime": 3 }',
    '  For: Explosions, emissions, particle clouds',
    '',
    '- { "op": "arrow", "x": 0.3, "y": 0.5, "angle": 1.57, "length": 0.2, "color": "#00ff88", "animated": true }',
    '  For: Vectors, forces. Angle in NUMBERS (1.57 for 90°, 3.14 for 180°, NOT Math.PI!)',
    '',
    '- { "op": "field", "type": "electric", "gridSize": 30, "strength": 10 }',
    '  For: Electric/magnetic/vector fields. Types: "vector", "electric", "magnetic"',
    '',
    '- { "op": "flow", "path": [[0.1,0.5], [0.9,0.5]], "particleCount": 10, "speed": 2, "color": "#00bbff" }',
    '  For: Current flow, fluid dynamics',
    '',
    '📐 FUNDAMENTAL DRAWING OPERATIONS (essential for math/graphs):',
    '- { "op": "clear", "target": "all" }',
    '- { "op": "drawAxis", "normalized": true, "xLabel": "x", "yLabel": "y" }',
    '- { "op": "drawCurve", "normalized": true, "points": [[x,y],...], "color": "#3498db", "duration": 2, "width": 3 }',
    '  IMPORTANT: For smooth curves, use 50-100 points!',
    '- { "op": "drawLabel", "normalized": true, "text": "label", "x": 0.5, "y": 0.5, "color": "#fff" }',
    '- { "op": "drawMathLabel", "normalized": true, "tex": "\\\\sin(x)", "x": 0.5, "y": 0.5 }',
    '- { "op": "drawCircle", "normalized": true, "x": 0.5, "y": 0.5, "radius": 0.1, "color": "#e74c3c", "fill": true }',
    '- { "op": "drawRect", "normalized": true, "x": 0.3, "y": 0.3, "width": 0.4, "height": 0.4, "color": "#2ecc71" }',
    '- { "op": "drawVector", "normalized": true, "x1": 0.2, "y1": 0.2, "x2": 0.8, "y2": 0.8, "color": "#9b59b6" }',
    '- { "op": "delay", "duration": 2 } // Let viewers absorb the visual',
    '- { "op": "drawTitle", "text": "Title", "y": 0.9, "duration": 1.5 }',
    '',
    `Step description: ${step.desc}`,
    `Topic: ${query || 'general educational content'}`,
    '',
    '🎯 YOUR SPECIFIC INSTRUCTIONS:',
    needsCustomSketch ? 
      'CREATE ANATOMICAL/STRUCTURAL SKETCHES:\n' +
      '1. Use multiple drawCurve operations to build organic shapes\n' +
      '2. Layer curves to create complex structures\n' +
      '3. Add arrows pointing to each part\n' +
      '4. Label every component\n' +
      '5. Use irregular points for natural appearance' :
    needsShapes ?
      'USE GEOMETRIC SHAPES APPROACH:\n' +
      '1. Build with circles, rectangles, vectors\n' +
      '2. Connect shapes with lines or arrows\n' +
      '3. Use consistent sizing and spacing\n' +
      '4. Add labels and pointers\n' +
      '5. Animate connections if needed' :
    needsMath ?
      'CREATE MATHEMATICAL VISUALIZATIONS:\n' +
      '1. Start with coordinate axes\n' +
      '2. Plot functions with smooth curves (50+ points)\n' +
      '3. Add equations with LaTeX\n' +
      '4. Mark critical points with arrows\n' +
      '5. Show transformations step by step' :
      'BALANCE BOTH APPROACHES:\n' +
      '1. Use shapes for regular forms\n' +
      '2. Use curves for irregular forms\n' +
      '3. Combine as needed\n' +
      '4. Add arrows and labels throughout',
    '',
    'MINIMUM OUTPUT: 12-15 actions including:',
    '- 1 clear + 1 title',
    '- 4-6 main visual elements (shapes OR curves based on context)',
    '- 3-4 arrows pointing at key features',
    '- 2-3 labels explaining concepts',
    '- 2-3 delays for pacing',
    '',
    'Remember: Choose the RIGHT approach for THIS specific topic!'
  ].join('\n');

  logger.debug(`[codegen] Sending prompt to Gemini for tag=${step.tag}`);
  const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'codegen/gemini');
  const text = res.response.text();
  logger.debug(`[codegen] Received response from Gemini for tag=${step.tag}, length: ${text.length}`);

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON found in response - NO FALLBACKS');
  }
  let jsonText = text.slice(jsonStart, jsonEnd + 1);
  jsonText = jsonText.replace(/```json|```/g, "").trim();
  
  let chunk: RenderChunk;
  try {
    chunk = JSON.parse(jsonText) as RenderChunk;
    logger.debug('[codegen] JSON parsed successfully on first attempt');
  } catch (firstError) {
    logger.debug(`[codegen] JSON parse failed, attempting to fix: ${firstError}`);
    const fixedJson = fixJsonSyntax(jsonText);
    try {
      chunk = JSON.parse(fixedJson) as RenderChunk;
      logger.debug('[codegen] JSON parsed successfully after syntax fix');
    } catch (secondError) {
      logger.error(`[codegen] JSON parse failed completely: ${secondError}`);
      throw new Error(`Failed to parse codegen response: ${secondError}`);
    }
  }
  
  if (!chunk.actions || !Array.isArray(chunk.actions)) {
    throw new Error('Invalid actions in response - NO FALLBACKS');
  }
  
  chunk.stepId = step.id;
  logger.debug(`[codegen] SUCCESS: Generated ${chunk.actions.length} actions for step ${step.id}`);
  return chunk;
}
