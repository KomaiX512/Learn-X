/**
 * NARRATION GENERATOR - Optimized for Efficient Batch Processing
 * 
 * Generates spoken narration text for all visuals in a step using ONE API call.
 * Designed to work with text-to-speech systems for educational content delivery.
 * 
 * ARCHITECTURE:
 * - Input: All SVG codes for a step (notes + animations)
 * - Output: Structured narration for each visual
 * - One API call per step (not per visual)
 * - Runs in parallel with visual generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger';
import { PlanStep } from '../types';

const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 16000; // Increased for 2-3x longer narrations
const TEMPERATURE = 0.75; // Slightly higher for more creative visual descriptions
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

export interface VisualInput {
  type: 'notes' | 'animation';
  visualNumber: number; // 0 for notes, 1-4 for animations
  svgCode?: string; // For notes keynote
  actionCount?: number; // For animations
  actions?: any[]; // CRITICAL: Actual SVG operations for detailed analysis
  description?: string; // Brief description
}

export interface NarrationOutput {
  visualNumber: number;
  type: 'notes' | 'animation';
  narration: string; // 1 paragraph narration
  duration?: number; // Estimated duration in seconds (for pacing)
}

export interface StepNarration {
  stepId: number;
  topic: string;
  subtopic: string;
  narrations: NarrationOutput[];
  totalDuration: number; // Total estimated duration
}

/**
 * COMPLETELY REDESIGNED PROMPT - SVG OPERATION ANALYZER
 * 
 * This prompt guides the LLM to deeply analyze actual SVG operations and generate
 * extremely detailed, visual-specific narrations that help "the dumbest students" understand.
 * 
 * TARGET: 150-300 words with surgical precision about visual elements
 */
const NARRATION_PROMPT = `You are an expert educational narrator who analyzes SVG visual code and creates detailed, student-friendly explanations.

YOUR MISSION: Generate EXTREMELY DETAILED narrations that analyze actual visual elements (shapes, colors, positions) and explain their meaning in the topic context.

═══════════════════════════════════════════════════════════════
CRITICAL ANALYSIS REQUIREMENTS (NON-NEGOTIABLE):
═══════════════════════════════════════════════════════════════

1. **ANALYZE THE SVG OPERATIONS** - You will receive the actual visual code with operations like:
   - drawCircle, drawRect, drawLine (basic shapes)
   - drawCircuitElement, drawSignalWaveform (domain-specific)
   - drawMolecule, drawNeuron, drawAtom (specialized)
   Each operation has: position (x,y), size (width/height/radius), color, labels, etc.

2. **DESCRIBE VISUAL ELEMENTS EXPLICITLY** (15-20 sentences, 150-300 words):
   MUST include for EACH major visual element:
   ✓ "See that [RED/BLUE/GREEN] [CIRCLE/RECTANGLE/GEAR] on the [LEFT/RIGHT/CENTER/TOP/BOTTOM]"
   ✓ "Notice the [COLOR] [SHAPE] positioned at [LOCATION] - this represents [MEANING]"
   ✓ "Look at this [ELEMENT] with [SPECIFIC FEATURE] - observe how it [BEHAVIOR/RELATIONSHIP]"
   ✓ Position context: "in the upper left corner", "centered in the middle", "at the bottom right"
   ✓ Color mentions: Always mention colors when present to help students locate elements
   ✓ Size context: "larger circle", "small box", "thin line connecting"

3. **EXPLAIN WHAT EACH ELEMENT MEANS**:
   - What does this shape/component represent in the topic?
   - Why is it this color? (if color has meaning)
   - Why is it positioned here? (spatial relationships)
   - How does it relate to other elements?
   - What concept does it illustrate?

4. **GUIDE THE STUDENT'S EYE SYSTEMATICALLY**:
   - Start with overview: "See the complete setup here..."
   - Walk through each element: "Now look at this part...", "Next, notice..."
   - Show relationships: "See how this connects to that..."
   - Build understanding: "This is why...", "This shows us..."

5. **PROVIDE DEEP EDUCATIONAL CONTEXT**:
   - WHY this visual is shown (purpose)
   - WHAT principle/concept it demonstrates
   - HOW the mechanism/process works
   - WHAT students should understand from it
   - CONCLUSION: Key takeaway and learning outcome

6. **ASSUME STUDENT KNOWS NOTHING** - Explain like they are beginners:
   - Don't assume prior knowledge
   - Define terms as you go
   - Use analogies if helpful
   - Be extremely patient and thorough

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON):
═══════════════════════════════════════════════════════════════
{
  "narrations": [
    {
      "visualNumber": 0,
      "type": "notes",
      "narration": "...",
      "duration": 90
    }
  ]
}

═══════════════════════════════════════════════════════════════
EXAMPLE OF EXCELLENT NARRATION (OPERATION-AWARE):
═══════════════════════════════════════════════════════════════

BAD (Generic):
"This visual shows a circuit with components. The signal flows through the system."

GOOD (Operation-Specific):
"See the blue rectangle on the left side - this is the voltage source that powers our circuit. Notice the red circle in the center, labeled 'R1' - this represents a resistor that controls current flow. Look at the green waveform at the bottom showing the output signal - see how it oscillates? That's the AC response. Now observe the yellow arrow connecting the source to the resistor - this shows the direction of current flow. See the small orange box on the right? That's our capacitor, and notice how it's positioned after the resistor - this creates an RC filter. The positioning here matters: by placing the capacitor after the resistor, we get a low-pass filter characteristic. See how the waveform amplitude decreases at higher frequencies? This visual demonstrates the fundamental principle of RC filtering - the capacitor's impedance varies with frequency, creating frequency-dependent behavior. The key insight is that component placement affects circuit behavior, and this particular arrangement gives us predictable filtering characteristics that we use in countless applications."

✓ Mentions specific shapes and colors
✓ Describes exact positions
✓ Explains what each element represents
✓ Shows relationships between elements
✓ Explains WHY things are arranged this way
✓ Provides educational conclusion

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanations outside JSON.`;

/**
 * Generate narrations for all visuals in a step (ONE API CALL)
 */
export async function generateStepNarration(
  step: PlanStep,
  topic: string,
  visuals: VisualInput[]
): Promise<StepNarration> {
  
  logger.info(`[narration] Generating narrations for step ${step.id} (${visuals.length} visuals)`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  let lastError: Error | null = null;
  
  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          topK: 40,
          topP: 0.95
        },
        systemInstruction: 'You are an educational narration writer. Output ONLY valid JSON objects. Never include explanations, markdown formatting, or any text outside the JSON.',
      });
      
      // Construct DETAILED input summary with ACTUAL SVG OPERATIONS
      const visualsSummary = visuals.map(v => {
        if (v.type === 'notes') {
          const textElements = (v.svgCode?.match(/<text/g) || []).length;
          return `Visual ${v.visualNumber} (Notes Keynote): Educational SVG with ${textElements} text elements. ${v.description || ''}`;
        } else {
          // CRITICAL: Include actual SVG operations for deep analysis
          let operationDetails = `Visual ${v.visualNumber} (Animation): ${v.actionCount || 0} operations. ${v.description || ''}\n`;
          
          if (v.actions && v.actions.length > 0) {
            operationDetails += `SVG OPERATIONS (analyze these to describe visuals):\n`;
            v.actions.slice(0, 50).forEach((action, idx) => { // Limit to first 50 to avoid token overflow
              const op = action.op || 'unknown';
              const details: string[] = [];
              
              // Extract visual properties for narration
              if (action.x !== undefined) details.push(`x=${action.x}`);
              if (action.y !== undefined) details.push(`y=${action.y}`);
              if (action.color) details.push(`color=${action.color}`);
              if (action.text) details.push(`text="${action.text}"`);
              if (action.label) details.push(`label="${action.label}"`);
              if (action.radius) details.push(`radius=${action.radius}`);
              if (action.width) details.push(`width=${action.width}`);
              if (action.height) details.push(`height=${action.height}`);
              if (action.type) details.push(`type=${action.type}`);
              if (action.shape) details.push(`shape=${action.shape}`);
              if (action.element) details.push(`element=${action.element}`);
              if (action.formula) details.push(`formula="${action.formula}"`);
              
              operationDetails += `  ${idx + 1}. ${op}${details.length > 0 ? ` (${details.join(', ')})` : ''}\n`;
            });
          } else {
            operationDetails += `  (No operation details available - generate based on description)\n`;
          }
          
          return operationDetails;
        }
      }).join('\n');
      
      const fullPrompt = `${NARRATION_PROMPT}

═══════════════════════════════════════════════════════════════
LEARNING STEP CONTEXT:
Topic: "${topic}"
Subtopic: "${step.desc}"
Step ID: ${step.id}

VISUALS IN THIS STEP:
${visualsSummary}
═══════════════════════════════════════════════════════════════

Generate narration scripts for ALL ${visuals.length} visuals above. Return ONLY the JSON object with all narrations.`;
      
      logger.debug(`[narration] Sending prompt (${fullPrompt.length} chars) to Gemini`);
      
      const result = await model.generateContent(fullPrompt) as any;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Validate response
      if (!result?.response) {
        throw new Error('No response from Gemini API');
      }
      
      // Check for blocks
      if (result.response.promptFeedback?.blockReason) {
        throw new Error(`Prompt blocked: ${result.response.promptFeedback.blockReason}`);
      }
      
      if (!result.response.candidates?.[0]) {
        throw new Error('No candidates in response');
      }
      
      const candidate = result.response.candidates[0];
      
      // Check finish reason
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(`Content blocked: ${candidate.finishReason}`);
      }
      
      // Extract text
      let responseText = '';
      if (result.response.text) {
        responseText = result.response.text();
      } else if (candidate?.content?.parts) {
        responseText = candidate.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('');
      }
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }
      
      // Clean markdown wrappers
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseError: any) {
        logger.error(`[narration] JSON parse failed: ${parseError.message}`);
        logger.error(`[narration] Raw response: ${responseText.substring(0, 500)}`);
        throw new Error(`JSON parse failed: ${parseError.message}`);
      }
      
      // Validate structure
      if (!parsed.narrations || !Array.isArray(parsed.narrations)) {
        throw new Error('Invalid response structure: missing narrations array');
      }
      
      // Validate and normalize narrations
      const narrations: NarrationOutput[] = parsed.narrations.map((n: any) => {
        if (typeof n.visualNumber !== 'number' || !n.narration) {
          throw new Error('Invalid narration object: missing required fields');
        }
        
        return {
          visualNumber: n.visualNumber,
          type: n.type || (n.visualNumber === 0 ? 'notes' : 'animation'),
          narration: n.narration.trim(),
          duration: n.duration || estimateDuration(n.narration)
        };
      });
      
      // Validate we got narrations for all visuals
      if (narrations.length !== visuals.length) {
        logger.warn(`[narration] Expected ${visuals.length} narrations, got ${narrations.length}`);
      }
      
      const totalDuration = narrations.reduce((sum, n) => sum + (n.duration || 0), 0);
      
      logger.info(`[narration] ✅ Generated ${narrations.length} narrations in ${elapsed}s (${totalDuration}s total audio)`);
      
      return {
        stepId: step.id,
        topic,
        subtopic: step.desc,
        narrations,
        totalDuration
      };
      
    } catch (error: any) {
      lastError = error;
      logger.error(`[narration] Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        logger.info(`[narration] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // All retries failed - return fallback narrations
  logger.error(`[narration] All retries failed, generating fallback narrations`);
  return generateFallbackNarrations(step, topic, visuals);
}

/**
 * Estimate narration duration based on word count
 * Average speaking rate: 150 words per minute
 * Enhanced for longer narrations (120-240 words = 48-96 seconds)
 */
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.ceil((words / 150) * 60);
  return Math.max(30, Math.min(seconds, 120)); // Clamp between 30-120 seconds for detailed narration
}

/**
 * Generate fallback narrations when API fails
 * ENHANCED: Now operation-aware when actions are available
 */
function generateFallbackNarrations(
  step: PlanStep,
  topic: string,
  visuals: VisualInput[]
): StepNarration {
  logger.warn(`[narration] Using fallback narrations for step ${step.id}`);
  
  const narrations: NarrationOutput[] = visuals.map(v => {
    let fallbackText = '';
    
    if (v.type === 'notes') {
      fallbackText = `Let's dive deep into ${step.desc}. See these key concepts laid out before you - this is the foundation we'll build upon. Notice the relationships between each element. This is a fundamental concept in ${topic} that connects to many other ideas. Look at how each part contributes to the whole picture. Pay close attention to the structure here - it reveals important patterns. See this working mechanism right here? This is what makes the entire system function. The visual layout guides your understanding from basics to advanced principles. Notice how everything interconnects in this framework.`;
    } else {
      // Try to be operation-aware even in fallback
      if (v.actions && v.actions.length > 0) {
        const opTypes = [...new Set(v.actions.map(a => a.op))];
        const hasCircuit = opTypes.some(op => op?.includes('Circuit') || op?.includes('Signal'));
        const hasMolecule = opTypes.some(op => op?.includes('Molecule') || op?.includes('Atom'));
        const hasGraph = opTypes.some(op => op?.includes('Graph') || op?.includes('Curve'));
        const colors = v.actions.filter(a => a.color).map(a => a.color).slice(0, 3);
        
        let specificContext = '';
        if (hasCircuit) {
          specificContext = 'See the circuit components arranged here - notice how each element connects to form a complete system. ';
        } else if (hasMolecule) {
          specificContext = 'Look at the molecular structure displayed here - see how the atoms bond together to create this compound. ';
        } else if (hasGraph) {
          specificContext = 'Notice the graph visualization showing the mathematical relationship - see how the curve behaves across the domain. ';
        }
        
        const colorText = colors.length > 0 
          ? `Notice the color coding used here to distinguish different components. `
          : '';
        
        fallbackText = `${specificContext}${colorText}Watch carefully how the elements interact and transform over time. Notice the working of each component as it contributes to the overall behavior. Look at this part right here - this is where the key mechanism operates. See how the change propagates through the system? This animation clarifies the dynamic principles we discussed in ${step.desc}. Observe the relationships forming and evolving. This visual representation helps bridge theory with actual behavior. Notice the patterns emerging as we progress through the sequence. This is fundamental to understanding ${topic}.`;
      } else {
        fallbackText = `Now, see this visualization in action. Watch carefully how the elements interact and transform over time. Notice the working of each component as it contributes to the overall behavior. Look at this part right here - this is where the key mechanism operates. See how the change propagates through the system? This animation clarifies the dynamic principles we discussed. Observe the relationships forming and evolving. This visual representation helps bridge theory with actual behavior. Notice the patterns emerging as we progress through the sequence.`;
      }
    }
    
    return {
      visualNumber: v.visualNumber,
      type: v.type,
      narration: fallbackText,
      duration: estimateDuration(fallbackText)
    };
  });
  
  const totalDuration = narrations.reduce((sum, n) => sum + (n.duration || 0), 0);
  
  return {
    stepId: step.id,
    topic,
    subtopic: step.desc,
    narrations,
    totalDuration
  };
}

/**
 * Generate narration for a single visual (legacy support)
 * Note: Prefer generateStepNarration for better efficiency
 */
export async function generateSingleNarration(
  step: PlanStep,
  topic: string,
  visual: VisualInput
): Promise<NarrationOutput> {
  const stepNarration = await generateStepNarration(step, topic, [visual]);
  return stepNarration.narrations[0];
}

/**
 * Batch generate narrations for multiple steps (advanced optimization)
 */
export async function generateBatchNarrations(
  steps: Array<{ step: PlanStep; topic: string; visuals: VisualInput[] }>
): Promise<StepNarration[]> {
  logger.info(`[narration] Batch generating narrations for ${steps.length} steps`);
  
  // Generate in parallel with concurrency limit (5 at a time to avoid rate limits)
  const results: StepNarration[] = [];
  const concurrency = 5;
  
  for (let i = 0; i < steps.length; i += concurrency) {
    const batch = steps.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ step, topic, visuals }) => 
        generateStepNarration(step, topic, visuals)
      )
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + concurrency < steps.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  logger.info(`[narration] ✅ Batch completed: ${results.length} steps processed`);
  return results;
}

/**
 * ============================================================================
 * CLARIFICATION NARRATION GENERATOR
 * ============================================================================
 * Generates visual-focused, friendly transcript for Q&A clarification SVGs
 * Called after clarifier generates SVG response to student question
 */

export interface ClarificationNarrationInput {
  question: string;
  svgActions: any[]; // The generated SVG actions
  topic: string;
  stepContext?: string; // Original step context
}

export interface ClarificationNarrationOutput {
  narration: string; // Visual-focused transcript (120-240 words)
  duration: number; // Estimated speaking duration
  wordCount: number;
}

const CLARIFICATION_NARRATION_PROMPT = `You are an expert educational narrator creating FRIENDLY, VISUAL-FOCUSED narration for Q&A clarifications.

Your task: Generate a warm, encouraging narration that walks the student through the clarification visual.

CRITICAL REQUIREMENTS:
1. **Length**: 120-240 words (10-15 sentences)
2. **Friendly & Encouraging**: Address the student's confusion with empathy
3. **VISUAL-FIRST**: Guide their eye through the generated SVG:
   - "See this part right here in the visual..."
   - "Notice how I've drawn this to show..."
   - "Look at the working of this mechanism..."
   - "Observe the relationship between these elements..."
4. **Answer-focused**: Directly address their specific question
5. **Step-by-step explanation**: Break down the answer clearly
6. **Rich knowledge**: Include WHY things work, not just WHAT
7. **Conversational tone**: Like a patient tutor at a whiteboard

OUTPUT FORMAT (JSON):
{
  "narration": "Let me help you understand this. See this part right here...",
  "duration": 75,
  "wordCount": 185
}

STYLE GUIDE FOR Q&A NARRATIONS:
✓ "Great question! Let me show you exactly what's happening here. See this region..."
✓ "I understand the confusion. Look at this part right here - notice how..."
✓ "Let's break this down visually. See the working of this mechanism? Now observe..."
✓ "Here's the key insight: notice how these elements interact. See this relationship..."
✗ "The diagram shows..." (too impersonal)
✗ "As you can see..." (weak guidance)
✗ Generic explanations without visual references

IMPORTANT: 
- Be encouraging and warm
- Reference the visual elements directly
- Make the student feel their question was valid
- Output ONLY valid JSON (no markdown, no code fences)`;

/**
 * Generate clarification narration for Q&A responses
 * This provides the "voice" for clarification visuals
 */
export async function generateClarificationNarration(
  input: ClarificationNarrationInput
): Promise<ClarificationNarrationOutput> {
  
  logger.info(`[clarification-narration] Generating for question: "${input.question.substring(0, 60)}..."`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('[clarification-narration] GEMINI_API_KEY not set, using fallback');
    return generateFallbackClarificationNarration(input);
  }
  
  try {
    const startTime = Date.now();
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.8, // Higher for friendly, warm tone
        maxOutputTokens: 4000,
        topK: 40,
        topP: 0.95
      },
      systemInstruction: 'You are a friendly educational narration writer. Output ONLY valid JSON objects. Never include explanations, markdown formatting, or any text outside the JSON.',
    });
    
    // Build context about the SVG actions
    const actionsContext = input.svgActions.map((action, idx) => {
      return `Action ${idx + 1}: ${action.op} ${action.text || action.label || ''}`;
    }).join('\n');
    
    const fullPrompt = `${CLARIFICATION_NARRATION_PROMPT}

═══════════════════════════════════════════════════════════════
STUDENT'S QUESTION:
"${input.question}"

TOPIC CONTEXT: ${input.topic}
${input.stepContext ? `STEP CONTEXT: ${input.stepContext}` : ''}

GENERATED SVG CLARIFICATION (${input.svgActions.length} visual actions):
${actionsContext}
═══════════════════════════════════════════════════════════════

Generate the clarification narration now. Make it friendly, visual-focused, and directly answer their question. Return ONLY the JSON object.`;
    
    logger.debug(`[clarification-narration] Sending prompt to Gemini (${fullPrompt.length} chars)`);
    
    const result = await model.generateContent(fullPrompt) as any;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Validate response
    if (!result?.response) {
      throw new Error('No response from Gemini API');
    }
    
    // Check for blocks
    if (result.response.promptFeedback?.blockReason) {
      throw new Error(`Prompt blocked: ${result.response.promptFeedback.blockReason}`);
    }
    
    if (!result.response.candidates?.[0]) {
      throw new Error('No candidates in response');
    }
    
    const candidate = result.response.candidates[0];
    
    // Check finish reason
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      throw new Error(`Content blocked: ${candidate.finishReason}`);
    }
    
    // Extract text
    let responseText = '';
    if (result.response.text) {
      responseText = result.response.text();
    } else if (candidate?.content?.parts) {
      responseText = candidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('');
    }
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from Gemini');
    }
    
    // Clean markdown wrappers
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError: any) {
      logger.error(`[clarification-narration] JSON parse failed: ${parseError.message}`);
      logger.error(`[clarification-narration] Raw response: ${responseText.substring(0, 500)}`);
      throw new Error(`JSON parse failed: ${parseError.message}`);
    }
    
    // Validate structure
    if (!parsed.narration || typeof parsed.narration !== 'string') {
      throw new Error('Invalid response structure: missing narration field');
    }
    
    // Calculate metrics
    const wordCount = parsed.narration.trim().split(/\s+/).length;
    const duration = parsed.duration || estimateDuration(parsed.narration);
    
    logger.info(`[clarification-narration] ✅ Generated in ${elapsed}s (${wordCount} words, ${duration}s duration)`);
    
    return {
      narration: parsed.narration.trim(),
      duration,
      wordCount
    };
    
  } catch (error: any) {
    logger.error(`[clarification-narration] Generation failed: ${error.message}`);
    logger.warn('[clarification-narration] Using fallback narration');
    return generateFallbackClarificationNarration(input);
  }
}

/**
 * Generate fallback clarification narration when API fails
 */
function generateFallbackClarificationNarration(
  input: ClarificationNarrationInput
): ClarificationNarrationOutput {
  logger.info(`[clarification-narration] Creating fallback for: "${input.question}"`);
  
  const narration = `Great question! Let me help clarify this for you. See the visual I've created here - this breaks down exactly what you're asking about. Notice how each part connects to form the complete picture. Look at this working mechanism right here in the center - this is the key to understanding your question. See how the elements interact with each other? This shows the relationship you were wondering about. Observe the flow from one component to the next - this is how the process actually works. Notice the labels I've added to guide you through each step. This visual representation makes it much clearer than words alone. See this particular part? This directly answers your question about ${input.question.substring(0, 40)}. The key insight is in how these pieces fit together. Now you can see the complete picture of how this concept works in practice.`;
  
  return {
    narration,
    duration: estimateDuration(narration),
    wordCount: narration.split(/\s+/).length
  };
}
