import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep } from '../types';
import { logger } from '../logger';
import { CircuitBreaker } from '../services/circuit-breaker';
import { QualityEnforcer } from './qualityEnforcer';

const MODEL = 'gemini-2.5-flash'; // DO NOT CHANGE - PRODUCTION MODEL
const TIMEOUT = 90000; // 90 seconds for RICH QUALITY generation (not speed)
const BATCH_SIZE = 60; // Generate COMPLETE educational narrative with storytelling
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
    'formalism': '📐 The Mathematics - Precise & Beautiful',
    'exploration': '🔬 Deeper Exploration - What If?',
    'mastery': '🚀 Mastery - Real World Power'
  };
  
  // Detect topic requirements for validation
  const topicLower = topic.toLowerCase();
  const requiresLatex = topicLower.match(/calculus|derivative|integral|equation|formula|theorem|proof|algebra|geometry|math|physics|trigonometry|logarithm|exponential|pythagorean|euler|fourier/);
  const requiresDiagram = topicLower.match(/neuron|brain|heart|anatomy|cell|dna|molecule|circuit|network|structure/);
  
  const prompt = `Generate exactly 50-70 operations for creating a COMPLETE EDUCATIONAL EXPERIENCE about "${topic}" in the "${step.tag}" step.

YOU ARE GRANT SANDERSON (3Blue1Brown). Create an engaging, story-driven lesson that builds understanding progressively.

⚠️ CRITICAL PHILOSOPHY:
- STORYTELLING FIRST: Every visual appears in a narrative context with EXPLANATORY TEXT
- TEXT BEFORE VISUALS: Always explain WHAT you're about to show BEFORE showing it
- MINIMUM 35% TEXT: At least 20-25 of your 50-70 operations must be drawLabel (teacher narration)
- MOTIVATION before information: Explain WHY before WHAT
- BUILD CURIOSITY: Hook the learner emotionally before teaching
- LABEL EVERYTHING: No unlabeled diagrams or visuals
- SIMULATE, DON'T SHOW: Animate processes, don't display static diagrams
- INTERACT WITH DIAGRAMS: Zoom, highlight, point to specific parts

🎙️ TEACHER NARRATION RULES:
- Every visual MUST have drawLabel explaining it
- Use conversational tone: "Let's look at...", "Notice how...", "Here's why..."
- Each concept needs 2-3 sentences of explanation
- Labels should guide the learner's attention: "Watch what happens when..."

Step ${step.id}: ${stepTitles[step.tag] || step.tag}
Context: ${step.desc}

🎬 MANDATORY NARRATIVE STRUCTURE (50-70 operations):

=== ACT 1: HOOK & MOTIVATION (12-15 operations) ===
Purpose: Create emotional engagement BEFORE teaching

1. drawTitle "${stepTitles[step.tag] || step.tag}" 0.5 0.08
2. delay 1
3. drawLabel "ENGAGING OPENING SENTENCE that creates curiosity" 0.5 0.15 #ffffff 18
4. delay 1
5. drawLabel "Follow-up sentence building interest" 0.5 0.20 #ffffff 16
6-8. Teaser visual that creates curiosity
9. delay 1
10. drawLabel "Explanation of what you just saw" 0.5 0.50 #ffffff 16
11. drawLabel "Connection to learner's real-world experience" 0.5 0.55 #ffffff 16
12. delay 1.5

EXAMPLE (for circuits topic):
drawLabel "Your phone screen lights up instantly when you touch it." 0.5 0.15 #ffffff 18
delay 1
drawLabel "Behind that simple tap, electrons are racing through tiny circuits at near light speed." 0.5 0.20 #ffffff 16
particle 0.3 0.3 30 2 0.8 #00ff88
drawLabel "Let's slow down time and watch these electrons work their magic." 0.5 0.50 #ffffff 16

=== ACT 2: VISUAL INTRODUCTION (18-22 operations) ===
Purpose: Build the main concept step-by-step with full labeling

13. drawLabel "Now let's build this concept piece by piece." 0.5 0.15 #ffffff 16
14. delay 0.5
15-17. BUILD first component with explanation:
   drawLabel "First, here's the foundation..." 0.3 0.25 #ffffff 16
   drawCircle 0.3 0.35 0.05 #3498db false
   drawLabel "This represents..." 0.3 0.50 #ffffff 14
   
18. delay 1
19-21. ADD second component:
   drawLabel "Next, we add..." 0.6 0.25 #ffffff 16
   drawCircle 0.6 0.35 0.05 #e74c3c false
   drawVector 0.35 0.35 0.55 0.35 #ffaa00 "Connection"
   
22-24. HIGHLIGHT key interaction:
   drawLabel "Watch what happens when these interact..." 0.5 0.60 #ffffff 16
   particle 0.3 0.35 20 1.5 0.5 #00ff88
   delay 1.5
   
25. drawLabel "Notice the flow pattern here" 0.5 0.70 #ffffff 16
26. delay 1

=== ACT 3: DEEP UNDERSTANDING (18-22 operations) ===
Purpose: Show HOW and WHY it works

27. drawLabel "Here's the key insight that makes everything click..." 0.5 0.15 #ffffff 18
28. delay 1
29-30. drawLabel explaining the MECHANISM:
   drawLabel "The reason this works is because..." 0.5 0.25 #ffffff 16
   drawLabel "When X happens, Y responds by..." 0.5 0.32 #ffffff 16
   
31. delay 0.5
32-38. Interactive simulation showing the process:
   drawLabel "Watch carefully as we demonstrate this in action:" 0.5 0.42 #ffffff 16
   [simulation operations: orbit/wave/particle/etc.]
   delay 1
   drawLabel "Did you notice how..." 0.5 0.65 #ffffff 16
   drawLabel "This explains why..." 0.5 0.72 #ffffff 16
   
39-42. Mathematical relationships (if applicable):
   drawLabel "The math behind this is elegant:" 0.5 0.15 #ffffff 16
   latex "[equation]" 0.5 0.25 24 #00ff88 true
   drawLabel "This tells us that..." 0.5 0.45 #ffffff 16
   
43. delay 2

=== ACT 4: SYNTHESIS & APPLICATION (8-10 operations) ===
Purpose: Connect to bigger picture and real world

51-53. drawLabel showing connection to broader concept
54-57. Real-world application example visual
58-60. drawLabel with practical implications

=== ACT 5: CONCLUSION & PREVIEW (5-8 operations) ===
Purpose: Solidify understanding and transition

61-63. Summary drawLabel of key takeaways
64-66. Visual callback to opening hook (full circle)
67-68. Preview of next step
69-70. delay 1

ENHANCED OPERATIONS FOR TRUE 3BLUE1BROWN:

=== MATHEMATICAL OPERATIONS (USE THESE FOR MATH TOPICS!) ===
latex "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}" x y size #color animated(true/false)
latex "a^2 + b^2 = c^2" x y size #color animated
latex "\\frac{dy}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" x y size #color animated
equation "f(x) = ax^2 + bx + c" x y #color
matrix [[a,b],[c,d]] x y scale #color animated
graph "sin(x)" xMin xMax yMin yMax gridOn #lineColor #gridColor

=== COMPLEX DIAGRAMS (USE THESE FOR ANATOMY/BIOLOGY/CIRCUITS!) ===
neuralNetwork [3,4,2,1] x y activation showWeights
molecule "H2O" x y bondAngles atomColors
anatomy "heart" x y layer detail
circuit "RC" x y components connections
flowchart {nodes:["A","B","C"], edges:[[0,1],[1,2]]} x y scale
plot [dataPoints] x y width height type(line/bar/scatter) #color

=== SIMULATIONS & PHYSICS ===
simulate "pendulum" x y length mass gravity damping
linearMotion startX startY endX endY duration "label" #color
circularMotion centerX centerY radius angularVelocity #color "object"
springOscillation x y amplitude frequency damping #color
fieldLines type(electric/magnetic) sourceX sourceY strength #color
waveInterference source1X source1Y source2X source2Y frequency amplitude

=== COMPLEX DIAGRAMS ===
flowchart {nodes:[...], edges:[...]} x y scale
neuralNetwork [layers] x y activation showWeights
circuitDiagram components connections x y scale
molecularStructure "H2O" x y bondLength animated
anatomyDiagram "heart" x y scale showLabels animated
dataFlow {sources:[...], transformations:[...], sinks:[...]} x y

=== BASIC SHAPES (use sparingly, <30%) ===
drawCircle x y radius #color fill(true/false)
drawRect x y width height #color fill(true/false)
drawVector x1 y1 x2 y2 #color "label"
arrow x y length angle #color curved(true/false)

=== ANIMATIONS ===
morph shape1 shape2 duration x y
rotate object angle duration centerX centerY
scale object factor duration originX originY
fadeIn object duration
fadeOut object duration
pulse object minScale maxScale frequency

=== TIMING ===
delay seconds

CONTEXTUAL EXAMPLE for "${topic}" (adapt based on subject):

⚠️ CRITICAL: For MATHEMATICAL topics, you MUST include LaTeX equations!
⚠️ CRITICAL: For BIOLOGY/ANATOMY topics, use neuralNetwork, molecule, or anatomy operations!

For Mathematics (MANDATORY LaTeX):
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
latex "\\frac{d}{dx}[x^n] = nx^{n-1}" 0.5 0.2 28 #3498db true
delay 1.5
drawLabel "The power rule in action" 0.5 0.3 #ffffff 18
graph "x^2" -2 2 0 8 true #e74c3c #333333
delay 1
latex "\\frac{d}{dx}[x^2] = 2x" 0.7 0.5 24 #00ff88 true
linearMotion 0.2 0.6 0.8 0.4 2 "tangent line" #00ff88
delay 1

For Physics (MANDATORY LaTeX for equations):
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
latex "F = ma" 0.5 0.2 32 #ffffff true
delay 1
simulate "pendulum" 0.5 0.4 0.3 1 9.8 0.02
fieldLines electric 0.3 0.6 5 #3498db
latex "E = \\frac{1}{2}mv^2" 0.7 0.75 24 #00ff88 true
linearMotion 0.2 0.8 0.8 0.8 3 "projectile" #e74c3c
delay 1

For Computer Science / Algorithms:
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
flowchart {nodes:["Start","Process","Decision","End"], edges:[[0,1],[1,2],[2,3]]} 0.5 0.4 1
delay 1.5
neuralNetwork [3,4,2,1] 0.5 0.7 "ReLU" true
drawLabel "Neural network architecture" 0.5 0.9 #ffffff 16
delay 1

For Biology / Anatomy:
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
anatomy "heart" 0.3 0.4 2 high
drawLabel "Blood flow pathway" 0.3 0.7 #ffffff 16
delay 1
molecule "DNA" 0.7 0.4 double-helix #3498db
drawLabel "Double helix structure" 0.7 0.7 #ffffff 16
delay 1

For Molecules / Chemistry:
molecule "H2O" 0.3 0.3 bent 104.5
drawLabel "Water molecule (bent shape)" 0.3 0.5 #ffffff 16
molecule "CO2" 0.7 0.3 linear 180
drawLabel "Carbon dioxide (linear)" 0.7 0.5 #ffffff 16
delay 1

Now generate the COMPLETE NARRATIVE for: "${topic}" - ${step.tag}

⚠️ CRITICAL REQUIREMENTS YOU MUST FOLLOW:
1. 📝 STORYTELLING: Start with WHY this matters, not WHAT it is
2. 🏷️ LABEL EVERYTHING: Every diagram component must have drawLabel pointing to it
3. 🎬 SIMULATE: Use orbit/wave/particle to show motion and flow
4. 🔍 INTERACT: Use drawCircle/drawVector to point and highlight specific parts
5. ⏱️ PACE: Use delay (1-2 seconds) between major concepts for comprehension
6. 📊 SHOW MATH: Use latex for equations (if math/physics/engineering topic)
7. 🔎 ZOOM IN: Build diagrams step-by-step, don't dump everything at once

🚫 FORBIDDEN MISTAKES:
- ❌ Unlabeled diagrams (every part needs a label!)
- ❌ Static displays without simulation
- ❌ Showing complete diagram at once (build it step-by-step!)
- ❌ Starting with definition (start with curiosity/question!)
- ❌ Missing delays between concepts
- ❌ Generic visuals not specific to "${topic}"

Generate ${requiresLatex ? "WITH LaTeX equations" : ""} ${requiresDiagram ? "WITH detailed labeled diagrams" : ""}.`;

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
          
          // DEBUG: Log first 500 chars of response
          logger.debug('[visual] Gemini response preview: ' + text.substring(0, 500));
          
          // Check if latex is in response
          if (text.includes('latex')) {
            logger.debug('[visual] LaTeX FOUND in Gemini response!');
          } else {
            logger.debug('[visual] NO LaTeX in Gemini response');
          }
          
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
                
              case 'latex':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'latex',
                    equation: parts[1],
                    x: parseFloat(parts[2]) || 0.5,
                    y: parseFloat(parts[3]) || 0.5,
                    size: parseInt(parts[4]) || 24,
                    color: parts[5] || '#ffffff',
                    animated: parts[6] === 'true'
                  } as any);
                }
                break;
                
              case 'graph':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'graph',
                    function: parts[1],
                    xMin: parseFloat(parts[2]) || -5,
                    xMax: parseFloat(parts[3]) || 5,
                    yMin: parseFloat(parts[4]) || -5,
                    yMax: parseFloat(parts[5]) || 5,
                    gridOn: parts[6] === 'true',
                    lineColor: parts[7] || '#3498db',
                    gridColor: parts[8] || '#333333'
                  } as any);
                }
                break;
                
              case 'simulate':
                if (parts.length >= 4) {
                  batchActions.push({
                    op: 'simulate',
                    type: parts[1],
                    x: parseFloat(parts[2]) || 0.5,
                    y: parseFloat(parts[3]) || 0.5,
                    params: parts.slice(4)
                  } as any);
                }
                break;
                
              case 'linearmotion':
                if (parts.length >= 6) {
                  batchActions.push({
                    op: 'linearMotion',
                    startX: parseFloat(parts[1]) || 0,
                    startY: parseFloat(parts[2]) || 0,
                    endX: parseFloat(parts[3]) || 1,
                    endY: parseFloat(parts[4]) || 1,
                    duration: parseFloat(parts[5]) || 2,
                    label: parts[6] || '',
                    color: parts[7] || '#3498db'
                  } as any);
                }
                break;
                
              case 'circularmotion':
                if (parts.length >= 5) {
                  batchActions.push({
                    op: 'circularMotion',
                    centerX: parseFloat(parts[1]) || 0.5,
                    centerY: parseFloat(parts[2]) || 0.5,
                    radius: parseFloat(parts[3]) || 0.2,
                    angularVelocity: parseFloat(parts[4]) || 1,
                    color: parts[5] || '#3498db',
                    object: parts[6] || 'point'
                  } as any);
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
  
  // DEBUG: Log operation types
  const opTypes = new Set(allActions.map(a => a.op));
  logger.debug('[visual] Operation types: ' + Array.from(opTypes).join(', '));
  
  if (allActions.length === 0) {
    // NO FALLBACK - return null to trigger retry in codegen
    logger.error('[visual] No content generated - failing properly for retry');
    return null;
  }
  
  // QUALITY ENFORCEMENT - Validate content meets 3Blue1Brown standards
  const qualityReport = QualityEnforcer.validateActions(allActions, step, topic);
  QualityEnforcer.logReport(qualityReport, step, topic);
  
  if (!qualityReport.passed) {
    // REJECT poor quality - return null to trigger retry with enhanced prompt
    logger.error(`[visual] Quality check FAILED (${qualityReport.score}%) - rejecting for retry`);
    logger.error('[visual] Issues: ' + qualityReport.issues.join('; '));
    
    // Return null to trigger retry in parent (codegenV2 will retry with better prompt)
    return null;
  }
  
  logger.info(`[visual] Quality check PASSED (${qualityReport.score}%) - excellent content!`);
  
  // NO INJECTIONS - Trust validated Gemini content
  logger.debug('[visual] NO injections - trusting validated generated content');
  
  return {
    type: 'visuals',
    stepId: step.id,
    actions: allActions
  };
}
