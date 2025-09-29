import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep } from '../types';
import { logger } from '../logger';
import { CircuitBreaker } from '../services/circuit-breaker';

const MODEL = 'gemini-2.0-flash-exp';
const TIMEOUT = 30000; // 30 seconds for QUALITY generation
const BATCH_SIZE = 20; // Generate comprehensive visual story with labels
const MAX_RETRIES = 2; // Allow retries for quality

// Circuit breaker for Gemini API
const geminiBreaker = new CircuitBreaker('gemini-visual', {
  failureThreshold: 2,
  resetTimeout: 5000,
  monitoringPeriod: 30000
});

export interface VisualChunk {
  type: 'visuals';
  stepId: number;
  actions: Action[];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after ' + ms + 'ms')), ms)
    )
  ]) as Promise<T>;
}

// Production-optimized visual generation with RICH EDUCATIONAL CONTENT
export async function visualAgent(
  step: PlanStep,
  topic: string
): Promise<VisualChunk | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  // CINEMATIC 3BLUE1BROWN QUALITY PROMPT
  const stepTitles: Record<string, string> = {
    'hook': '✨ The Hook - Why Should You Care?',
    'intuition': '💡 Building Intuition - See It First',
    'formalism': '📐 The Mathematics - Precise & Beautiful',
    'exploration': '🔬 Deeper Exploration - What If?',
    'mastery': '🚀 Mastery - Real World Power'
  };
  
  const stepTitle = stepTitles[step.tag] || step.tag;
  
  const prompt = `You are Grant Sanderson creating a 3Blue1Brown masterpiece on "${topic}".
This is Step ${step.id}: ${stepTitle}

CONTEXT: ${step.desc}

CINEMATIC REQUIREMENTS FOR 3BLUE1BROWN QUALITY:
1. START with elegant title in a box: drawTitle
2. EVERY concept needs visual + label explanation
3. Generate 40-50 operations for RICH cinematic experience
4. Use delays (1-2 seconds) between major concepts
5. ALL content MUST be about "${topic}" specifically

MANDATORY CINEMATIC STRUCTURE (40-50 operations):
1. Title Sequence (3-4 ops):
   - drawTitle with elegant formatting
   - drawLabel with subtitle/question
   - Visual accent (particles or glow)

2. Opening Visual Hook (8-10 ops):
   - Start with surprising visual
   - Build curiosity with animation
   - Label key observations

3. Core Concept Development (15-20 ops):
   - Progressive visual building
   - Each visual has explanatory label
   - Use colors to show relationships
   - Animate transformations

4. Deep Insight Moment (8-10 ops):
   - The "aha!" visualization
   - Connect to bigger picture
   - Mathematical beauty revealed

5. Conclusion & Transition (5-6 ops):
   - Summarize visually
   - Preview next concept
   - Elegant fade/transition

OPERATIONS WITH PROPER SYNTAX:
drawTitle "Step Title Text" 0.5 0.1
drawLabel "Explanation text" x y #color fontSize
drawCircle x y radius #color fill(true/false)
drawVector x1 y1 x2 y2 #color "label"
drawRect x y width height #color fill(true/false)
orbit centerX centerY radius speed #color
wave startX startY amplitude frequency #color
particle x y count lifetime speed #color
arrow x y length angle #color true
drawAxis "X-label" "Y-label"
drawCurve "function" xMin xMax #color
customPath "SVG_path_data" x y #fillColor #strokeColor strokeWidth scale glow(true/false)
drawDiagram type x y (type: neuralNetwork/molecule/circuit/anatomy)
delay seconds

EXAMPLE OUTPUT for "${step.tag}" step:
drawTitle "${stepTitle}: ${topic}" 0.5 0.08
delay 1.5
drawLabel "Let's explore: ${step.desc.substring(0, 50)}..." 0.5 0.18 #ffffff 20
delay 1
drawLabel "Key Concept:" 0.15 0.28 #00ff88 18
drawCircle 0.2 0.4 0.08 #3498db true
drawLabel "This represents..." 0.35 0.4 #ffffff 16
drawVector 0.28 0.4 0.5 0.45 #e74c3c "relationship"
delay 0.8
drawLabel "Notice how..." 0.15 0.55 #ffffff 16
orbit 0.5 0.6 0.12 1.5 #2ecc71
drawLabel "The motion shows..." 0.7 0.6 #ffffff 16
particle 0.5 0.6 25 3 0.8 #ffff00
delay 1
drawLabel "In summary:" 0.15 0.75 #00ff88 18
drawRect 0.4 0.8 0.3 0.08 #9b59b6 false
drawLabel "Key takeaway here" 0.55 0.8 #ffffff 16
delay 2

For complex topics like anatomy, circuits, or molecules, use:
drawDiagram molecule 0.5 0.5
drawLabel "Molecular structure" 0.5 0.7 #ffffff 16
OR
customPath "M10,10 L20,20 Q30,10 40,20" 0.5 0.5 #3498db #ffffff 2 1.5 true
drawLabel "Custom shape explanation" 0.5 0.65 #ffffff 16

Now generate COMPLETE, LABELED animations for: "${topic}" - ${step.tag}
Remember: EVERY visual needs a label explaining what it represents!`;

  const allActions: Action[] = [];
  const targetBatches = 1; // Single comprehensive generation
  
  // Generate batches in parallel for speed
  const batchPromises = [];
  
  for (let batch = 0; batch < targetBatches; batch++) {
    const batchPromise = (async () => {
      for (let retry = 0; retry <= MAX_RETRIES; retry++) {
        try {
          const res = await geminiBreaker.execute(async () => 
            withTimeout(model.generateContent(prompt), TIMEOUT)
          );
          const text = res.response.text().trim();
          
          // Parse rich operation format
          const lines = text.split('\n').filter(line => line.trim());
          const batchActions: Action[] = [];
          
          for (const line of lines) {
            // Handle quoted text in operations
            const quotedTextMatch = line.match(/"([^"]*)"/g);
            const quotedTexts = quotedTextMatch ? quotedTextMatch.map(t => t.slice(1, -1)) : [];
            
            // Replace quoted text with placeholders
            let processedLine = line;
            quotedTexts.forEach((text, i) => {
              processedLine = processedLine.replace(`"${text}"`, `__QUOTE_${i}__`);
            });
            
            const parts = processedLine.trim().split(/\s+/);
            if (parts.length < 2) continue;
            
            // Restore quoted text
            parts.forEach((part, i) => {
              const match = part.match(/__QUOTE_(\d+)__/);
              if (match) {
                parts[i] = quotedTexts[parseInt(match[1])];
              }
            });
            
            const cmd = parts[0].toLowerCase();
            
            // Parse all rich operations
            switch(cmd) {
              case 'drawtitle':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'drawTitle',
                    text: parts[1],
                    y: parseFloat(parts[3]) || 0.1
                  } as any);
                }
                break;
                
              case 'drawlabel':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'drawLabel',
                    text: parts[1],
                    x: parseFloat(parts[2]) || 0.5,
                    y: parseFloat(parts[3]) || 0.5,
                    color: parts[4] || '#ffffff',
                    fontSize: parseInt(parts[5]) || 16,
                    normalized: true
                  } as any);
                }
                break;
                
              case 'drawcircle':
                if (parts.length >= 4) {
                  const x = parseFloat(parts[1]);
                  const y = parseFloat(parts[2]);
                  const r = parseFloat(parts[3]);
                  if (!isNaN(x) && !isNaN(y) && !isNaN(r)) {
                    batchActions.push({
                      op: 'drawCircle',
                      x: Math.max(0, Math.min(1, x)),
                      y: Math.max(0, Math.min(1, y)),
                      radius: Math.max(0.02, Math.min(0.3, r)),
                      color: parts[4] || '#3498db',
                      fill: parts[5] === 'true',
                      normalized: true
                    });
                  }
                }
                break;
                
              case 'drawvector':
                if (parts.length >= 5) {
                  const x1 = parseFloat(parts[1]);
                  const y1 = parseFloat(parts[2]);
                  const x2 = parseFloat(parts[3]);
                  const y2 = parseFloat(parts[4]);
                  if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                    batchActions.push({
                      op: 'drawVector',
                      x1: Math.max(0, Math.min(1, x1)),
                      y1: Math.max(0, Math.min(1, y1)),
                      x2: Math.max(0, Math.min(1, x2)),
                      y2: Math.max(0, Math.min(1, y2)),
                      color: parts[5] || '#e74c3c',
                      label: parts[6] || '',
                      normalized: true
                    } as any);
                  }
                }
                break;
                
              case 'orbit':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'orbit',
                    centerX: parseFloat(parts[1]) || 0.5,
                    centerY: parseFloat(parts[2]) || 0.5,
                    radius: parseFloat(parts[3]) || 0.2,
                    speed: parseFloat(parts[4]) || 1,
                    color: parts[5] || '#00ff88'
                  } as any);
                }
                break;
                
              case 'wave':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'wave',
                    startX: parseFloat(parts[1]) || 0.1,
                    startY: parseFloat(parts[2]) || 0.5,
                    amplitude: parseFloat(parts[3]) || 0.1,
                    frequency: parseFloat(parts[4]) || 2,
                    color: parts[5] || '#00bbff'
                  } as any);
                }
                break;
                
              case 'particle':
                if (parts.length >= 6) {
                  batchActions.push({
                    op: 'particle',
                    x: parseFloat(parts[1]) || 0.5,
                    y: parseFloat(parts[2]) || 0.5,
                    count: parseInt(parts[3]) || 20,
                    lifetime: parseFloat(parts[4]) || 3,
                    speed: parseFloat(parts[5]) || 0.5,
                    color: parts[6] || '#ffff00'
                  } as any);
                }
                break;
                
              case 'delay':
                if (parts.length >= 2) {
                  batchActions.push({
                    op: 'delay',
                    duration: parseFloat(parts[1]) || 1
                  } as any);
                }
                break;
                
              case 'drawaxis':
                batchActions.push({
                  op: 'drawAxis',
                  xLabel: parts[1] || 'X',
                  yLabel: parts[2] || 'Y'
                } as any);
                break;
                
              case 'drawrect':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'drawRect',
                    x: parseFloat(parts[1]) || 0.5,
                    y: parseFloat(parts[2]) || 0.5,
                    width: parseFloat(parts[3]) || 0.2,
                    height: parseFloat(parts[4]) || 0.2,
                    color: parts[5] || '#f59e0b',
                    fill: parts[6] === 'true',
                    normalized: true
                  } as any);
                }
                break;
                
              case 'drawcurve':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'drawGraph',
                    func: parts[1],
                    domain: [parseFloat(parts[2]) || -5, parseFloat(parts[3]) || 5],
                    color: parts[4] || '#00ff88',
                    scale: 50
                  } as any);
                }
                break;
                
              case 'arrow':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'arrow',
                    x: parseFloat(parts[1]) || 0.5,
                    y: parseFloat(parts[2]) || 0.5,
                    length: parseFloat(parts[3]) || 0.2,
                    angle: parseFloat(parts[4]) || 0,
                    color: parts[5] || '#ffffff',
                    animated: parts[6] === 'true'
                  } as any);
                }
                break;
                
              case 'field':
                if (parts.length >= 3) {
                  batchActions.push({
                    op: 'field',
                    type: parts[1] || 'vector',
                    gridSize: parseInt(parts[2]) || 10,
                    strength: parseFloat(parts[3]) || 1
                  } as any);
                }
                break;
                
              case 'custompath':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'customPath',
                    path: parts[1],
                    x: parseFloat(parts[2]) || 0.5,
                    y: parseFloat(parts[3]) || 0.5,
                    fill: parts[4] || 'transparent',
                    stroke: parts[5] || '#ffffff',
                    strokeWidth: parseFloat(parts[6]) || 2,
                    scale: parseFloat(parts[7]) || 1,
                    glow: parts[8] === 'true'
                  } as any);
                }
                break;
                
              case 'drawdiagram':
                if (parts.length >= 2) {
                  const diagramType = parts[1];
                  const diagramAction: any = {
                    op: 'drawDiagram',
                    type: diagramType,
                    x: parseFloat(parts[2]) || 0.5,
                    y: parseFloat(parts[3]) || 0.5
                  };
                  
                  // Add type-specific parameters
                  if (diagramType === 'neuralNetwork' && parts.length > 4) {
                    diagramAction.layers = parts.slice(4).map(p => parseInt(p)).filter(n => !isNaN(n));
                  }
                  
                  batchActions.push(diagramAction);
                }
                break;
            }
          }
          
          if (batchActions.length > 0) {
            return batchActions;
          }
        } catch (error: any) {
          logger.debug('[visual] Batch ' + batch + ' retry ' + retry + ' failed: ' + error.message);
          if (retry >= MAX_RETRIES || error.message.includes('Circuit breaker')) {
            // NO FALLBACK - fail properly for true generation
            logger.error('[visual] Generation failed - no fallback used');
            return [];
          }
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return [];
    })();
    
    batchPromises.push(batchPromise);
  }
  
  // Wait for all batches to complete
  const batchResults = await Promise.all(batchPromises);
  
  // Combine all successful batch results
  for (const batchActions of batchResults) {
    if (batchActions && batchActions.length > 0) {
      allActions.push(...batchActions);
    }
  }
  
  logger.debug('[visual] Generated ' + allActions.length + ' visuals for step ' + step.id);
  
  if (allActions.length === 0) {
    // NO FALLBACK - return null to trigger retry in codegen
    logger.error('[visual] No content generated - failing properly for retry');
    return null;
  }
  
  return {
    type: 'visuals',
    stepId: step.id,
    actions: allActions
  };
}
