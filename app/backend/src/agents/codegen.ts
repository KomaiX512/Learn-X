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

// Aggressive JSON sanitizer to remove JavaScript expressions
function sanitizeJsonResponse(text: string): string {
  logger.debug('[sanitizer] Starting aggressive JSON sanitization');
  
  let sanitized = text;
  
  // Step 1: Remove JavaScript function expressions
  sanitized = sanitized.replace(/\(function\s*\([^)]*\)\s*\{[^}]*\}\)/g, '[]');
  sanitized = sanitized.replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, '""');
  
  // Step 2: Replace Math expressions with calculated values
  sanitized = sanitized.replace(/Math\.PI/g, '3.14159');
  sanitized = sanitized.replace(/Math\.E/g, '2.71828');
  sanitized = sanitized.replace(/Math\.sqrt\(2\)/g, '1.41421');
  sanitized = sanitized.replace(/Math\.sin\(([^)]+)\)/g, (match, angle) => {
    // Try to parse and calculate, otherwise use 0
    try {
      const val = parseFloat(angle);
      if (!isNaN(val)) return String(Math.sin(val));
    } catch {}
    return '0';
  });
  sanitized = sanitized.replace(/Math\.cos\(([^)]+)\)/g, (match, angle) => {
    try {
      const val = parseFloat(angle);
      if (!isNaN(val)) return String(Math.cos(val));
    } catch {}
    return '1';
  });
  sanitized = sanitized.replace(/Math\.tan\(([^)]+)\)/g, (match, angle) => {
    try {
      const val = parseFloat(angle);
      if (!isNaN(val)) return String(Math.tan(val));
    } catch {}
    return '0';
  });
  
  // Step 3: Replace any remaining Math.* calls with 0
  sanitized = sanitized.replace(/Math\.[a-zA-Z]+\([^)]*\)/g, '0');
  
  // Step 4: Remove inline calculations and expressions
  sanitized = sanitized.replace(/"[^"]*\+[^"]*"/g, (match) => {
    // If it's a string concatenation, try to evaluate
    if (match.includes(' + ')) {
      return '"calculated_value"';
    }
    return match;
  });
  
  // Step 5: Fix array generation patterns
  // Replace [...Array(n)].map(...) patterns
  sanitized = sanitized.replace(/\[\.\.\.Array\([^)]+\)\]\.map\([^)]+\)/g, '[[0.1, 0.2], [0.3, 0.4]]');
  
  // Step 6: Replace for loop array generators
  sanitized = sanitized.replace(/\(\(\)\s*=>\s*\{[^}]*return\s*\[[^\]]*\];?\s*\}\)\(\)/g, '[[0, 0], [1, 1]]');
  
  // Step 7: Clean up invalid JSON patterns
  sanitized = sanitized
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double
    .replace(/undefined/g, 'null')  // Replace undefined with null
    .replace(/NaN/g, '0')  // Replace NaN with 0
    .replace(/Infinity/g, '999999')  // Replace Infinity with large number
    .replace(/-Infinity/g, '-999999')  // Replace -Infinity
    .replace(/\\n/g, ' ')  // Replace newlines with spaces
    .replace(/\\t/g, ' ')  // Replace tabs with spaces
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  // Step 8: Balance braces and brackets
  const openBraces = (sanitized.match(/\{/g) || []).length;
  const closeBraces = (sanitized.match(/\}/g) || []).length;
  const openBrackets = (sanitized.match(/\[/g) || []).length;
  const closeBrackets = (sanitized.match(/\]/g) || []).length;
  
  for (let i = 0; i < openBraces - closeBraces; i++) {
    sanitized += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    sanitized += ']';
  }
  
  logger.debug('[sanitizer] Sanitization complete');
  return sanitized;
}

// Legacy function for backward compatibility
function fixJsonSyntax(jsonText: string): string {
  return sanitizeJsonResponse(jsonText);
}

// Enhanced teaching complexity levels
const TEACHING_COMPLEXITY_MAP: { [key: string]: any } = {
  'hook': { minActions: 15, visualDensity: 'medium', animationSpeed: 'slow', explanationDepth: 'intuitive' },
  'intuition': { minActions: 20, visualDensity: 'high', animationSpeed: 'medium', explanationDepth: 'analogical' },
  'formalism': { minActions: 25, visualDensity: 'high', animationSpeed: 'precise', explanationDepth: 'mathematical' },
  'exploration': { minActions: 30, visualDensity: 'very-high', animationSpeed: 'dynamic', explanationDepth: 'comprehensive' },
  'mastery': { minActions: 25, visualDensity: 'elegant', animationSpeed: 'smooth', explanationDepth: 'unified' }
};

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
  
  // Get teaching parameters based on step tag
  const teachingParams = TEACHING_COMPLEXITY_MAP[step.tag || 'hook'] || TEACHING_COMPLEXITY_MAP['hook'];

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
    '🌟 You are channeling Grant Sanderson (3Blue1Brown) to create PROFOUND educational visualizations.',
    `LEARNING STAGE: ${step.tag?.toUpperCase() || 'HOOK'} (Complexity: ${step.complexity}/5)`,
    `MINIMUM ACTIONS REQUIRED: ${teachingParams.minActions}`,
    '',
    'Output STRICT JSON: { "type": "actions", "actions": [action_objects] }',
    '',
    '🎯 3BLUE1BROWN VISUAL PHILOSOPHY:',
    '1. MOTIVATION BEFORE INFORMATION: Start with WHY this matters',
    '2. VISUAL BEFORE SYMBOLIC: Show the concept visually before equations',
    '3. CONCRETE BEFORE ABSTRACT: Use specific examples before generalizing',
    '4. MOTION REVEALS STRUCTURE: Use animation to reveal relationships',
    '5. MULTIPLE REPRESENTATIONS: Show same concept from different angles',
    '6. PROGRESSIVE DISCLOSURE: Reveal complexity gradually',
    '',
    '⚠️ CRITICAL JSON RULES:',
    '- Output ONLY valid JSON, no JavaScript expressions',
    '- Use numbers not Math.PI (use 3.14159 instead)',
    '- Use numbers not Math.sin() (calculate the value)',
    '- All strings must be in double quotes',
    '- No comments, no trailing commas',
    '',
    '📦 EXAMPLE VALID JSON OUTPUT:',
    '{',
    '  "type": "actions",',
    '  "actions": [',
    '    { "op": "clear", "target": "all" },',
    '    { "op": "drawLabel", "normalized": true, "text": "The Magic of Sine Waves", "x": 0.5, "y": 0.1, "isTitle": true },',
    '    { "op": "drawAxis", "normalized": true, "xLabel": "time", "yLabel": "amplitude" },',
    '    { "op": "drawCurve", "normalized": true, "points": [[0, 0.5], [0.1, 0.7], [0.2, 0.9], [0.3, 0.7], [0.4, 0.5]], "color": "#3498db", "duration": 2 },',
    '    { "op": "orbit", "centerX": 0.5, "centerY": 0.5, "radius": 0.2, "period": 4, "objectRadius": 0.02, "color": "#FFD700" },',
    '    { "op": "drawMathLabel", "normalized": true, "tex": "y = \\\\sin(x)", "x": 0.7, "y": 0.3 },',
    '    { "op": "delay", "duration": 2 }',
    '  ]',
    '}',
    '',
    '❌ NEVER OUTPUT JAVASCRIPT LIKE THIS:',
    '"points": (function() { return [...Array(100)].map((_, i) => [i/100, Math.sin(i/10)]); })()',
    '"points": Math.PI * 2',
    '',
    '✅ ALWAYS OUTPUT PURE JSON LIKE THIS:',
    '"points": [[0, 0], [0.1, 0.59], [0.2, 0.95], [0.3, 0.95], [0.4, 0.59]]',
    '"angle": 3.14159',
    '"radius": 0.25',
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
    '🔍 COORDINATE SYSTEM:',
    '- All normalized coordinates are 0 to 1',
    '- (0, 0) is top-left, (1, 1) is bottom-right',
    '- For curves, provide 20-100 actual coordinate pairs',
    '- Calculate all values, never use expressions',
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
    `MINIMUM OUTPUT: ${teachingParams.minActions} actions including:`,
    `- 1 clear + 1-2 titles/definitions (use drawLabel with isTitle:true for main title)`,
    `- ${Math.floor(teachingParams.minActions * 0.4)}-${Math.floor(teachingParams.minActions * 0.5)} main visual elements`,
    `- ${Math.floor(teachingParams.minActions * 0.2)}-${Math.floor(teachingParams.minActions * 0.3)} arrows/pointers`,
    `- ${Math.floor(teachingParams.minActions * 0.15)}-${Math.floor(teachingParams.minActions * 0.2)} labels/equations`,
    `- ${Math.floor(teachingParams.minActions * 0.1)}-${Math.floor(teachingParams.minActions * 0.15)} delays/transitions`,
    '',
    '🔥 PROGRESSIVE TEACHING BY STAGE:',
    step.tag === 'hook' ? 
      'CURIOSITY HOOK - Create "AHA!" moment:\n' +
      '1. Start with surprising visual or paradox\n' +
      '2. Use orbit/wave/particle animations for engagement\n' +
      '3. Pose the central question visually\n' +
      '4. Show what\'s at stake - why this matters\n' +
      '5. End with teaser of what\'s to come' :
    step.tag === 'intuition' ?
      'BUILD INTUITION - Develop mental models:\n' +
      '1. Start with simplest possible case\n' +
      '2. Use familiar analogies (water flow, springs, etc.)\n' +
      '3. Build up complexity step by step\n' +
      '4. Use colors to group related concepts\n' +
      '5. Animate transitions between states' :
    step.tag === 'formalism' ?
      'MATHEMATICAL FORMALISM - Precise definitions:\n' +
      '1. Introduce formal notation with visual meaning\n' +
      '2. Show equations emerging from visuals\n' +
      '3. Prove key relationships visually\n' +
      '4. Use vector fields for derivatives/gradients\n' +
      '5. Connect symbols to geometric interpretation' :
    step.tag === 'exploration' ?
      'DEEP EXPLORATION - Edge cases & variations:\n' +
      '1. Show what happens at extremes\n' +
      '2. Visualize parameter changes dynamically\n' +
      '3. Compare multiple approaches side-by-side\n' +
      '4. Reveal hidden patterns and symmetries\n' +
      '5. Challenge assumptions with counterexamples' :
    step.tag === 'mastery' ?
      'SYNTHESIS & MASTERY - Unified understanding:\n' +
      '1. Connect all previous concepts visually\n' +
      '2. Show real-world applications\n' +
      '3. Demonstrate problem-solving process\n' +
      '4. Reveal the elegant core principle\n' +
      '5. Leave with memorable visual summary' :
      'STANDARD TEACHING APPROACH',
    '',
    'Remember: Choose the RIGHT approach for THIS specific topic!'
  ].join('\n');

  // Add retry counter
  let attemptCount = 0;
  const maxAttempts = 3;
  let lastError: Error | null = null;
  
  while (attemptCount < maxAttempts) {
    attemptCount++;
    logger.debug(`[codegen] Attempt ${attemptCount}/${maxAttempts} - Sending prompt to Gemini for tag=${step.tag}`);
    
    // Add stronger instructions on retry
    const attemptPrompt = attemptCount > 1 ? 
      prompt + `\n\n⚠️ CRITICAL (Attempt ${attemptCount}): Your previous response had invalid JSON. Remember:\n` +
      '- Output ONLY pure JSON, no JavaScript code\n' +
      '- Use numbers like 3.14159, NOT Math.PI\n' +
      '- Use actual coordinates like [[0.1, 0.2], [0.3, 0.4]], NOT functions\n' +
      '- Example valid action: {"op": "drawCircle", "x": 0.5, "y": 0.5, "radius": 0.1}\n' +
      '- NEVER use: function(), Math.*, for loops, arrow functions, or any JavaScript!'
      : prompt;
    
    try {
      const res = await withTimeout(model.generateContent(attemptPrompt), DEFAULT_TIMEOUT, 'codegen/gemini');
      const text = res.response.text();
      logger.debug(`[codegen] Received response from Gemini for tag=${step.tag}, length: ${text.length}`);

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response');
      }
      
      let jsonText = text.slice(jsonStart, jsonEnd + 1);
      jsonText = jsonText.replace(/```json|```/g, "").trim();
      
      // Try aggressive sanitization first
      const sanitized = sanitizeJsonResponse(jsonText);
      
      let chunk: RenderChunk;
      try {
        chunk = JSON.parse(sanitized) as RenderChunk;
        logger.debug(`[codegen] JSON parsed successfully on attempt ${attemptCount}`);
        
        // Validate the chunk
        if (!chunk.actions || !Array.isArray(chunk.actions)) {
          throw new Error('Invalid actions in response');
        }
        
        // Additional validation: ensure no function strings
        const actionString = JSON.stringify(chunk.actions);
        if (actionString.includes('function') || actionString.includes('Math.')) {
          throw new Error('JavaScript expressions detected in actions');
        }
        
        chunk.stepId = step.id;
        logger.debug(`[codegen] SUCCESS: Generated ${chunk.actions.length} actions for step ${step.id}`);
        return chunk;
        
      } catch (parseError) {
        lastError = parseError as Error;
        logger.warn(`[codegen] Attempt ${attemptCount} failed: ${parseError}`);
        if (attemptCount === maxAttempts) {
          throw parseError;
        }
        // Continue to next attempt
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(`[codegen] Attempt ${attemptCount} failed completely: ${error}`);
      if (attemptCount === maxAttempts) {
        break;
      }
    }
    
    // Wait before retry
    if (attemptCount < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // All attempts failed - NO FALLBACKS!
  logger.error(`[codegen] All ${maxAttempts} attempts failed for step ${step.id}`);
  throw new Error(`Failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}
