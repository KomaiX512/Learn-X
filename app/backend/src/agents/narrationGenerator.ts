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
 * Enhanced prompt for batch narration generation with VISUAL FOCUS
 * Generates all narrations in one API call
 * TARGET: 2-3x longer narrations (120-240 words) with rich visual descriptions
 */
const NARRATION_PROMPT = `You are an educational voice-over script writer for animated educational content.

Your task: Generate DETAILED, VISUAL-FOCUSED narration scripts for multiple visuals in a learning step.

CRITICAL REQUIREMENTS:
1. **One detailed paragraph per visual** (10-15 sentences, 120-240 words)
2. **VISUAL-FIRST approach** - Actively guide the student's eye:
   - "See this part right here..."
   - "Notice how this element moves..."
   - "Look at the working of this mechanism..."
   - "Observe the relationship between these components..."
3. **Conversational and friendly tone** - Like an enthusiastic professor pointing at the board
4. **Rich knowledge content** - Include:
   - Detailed explanations of what's happening
   - WHY things work this way
   - Key principles and relationships
   - Practical implications
5. **Contextual flow** - Each narration builds on previous understanding
6. **Educational depth** - Go beyond surface description, teach the concept thoroughly
7. **Pacing guidance** - Each paragraph should take 45-90 seconds to speak (slower, more thoughtful)

OUTPUT FORMAT (JSON):
{
  "narrations": [
    {
      "visualNumber": 0,
      "type": "notes",
      "narration": "...",
      "duration": 60
    },
    {
      "visualNumber": 1,
      "type": "animation",
      "narration": "...",
      "duration": 70
    }
  ]
}

NARRATION STYLE GUIDE (VISUAL-FOCUSED):
✓ "See this region highlighted here - this is where the action potential begins. Notice how the voltage rapidly changes from negative to positive..."
✓ "Look at the working of this synapse. See how the neurotransmitter molecules cross this gap? This is the actual mechanism of communication between neurons..."
✓ "Observe the relationship between voltage and ion channels. See this part right here - when voltage reaches threshold, these gates open. This is why it's called voltage-gated..."
✓ "Notice the pattern emerging as we add more data points. See how the curve takes shape? This tells us something profound about the underlying relationship..."
✗ "This diagram shows a neuron..." (too generic)
✗ "The image displays..." (not visual-focused)
✗ "As you can see..." (weak visual guidance)

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanations.`;

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
      
      // Construct input summary for all visuals
      const visualsSummary = visuals.map(v => {
        if (v.type === 'notes') {
          const textElements = (v.svgCode?.match(/<text/g) || []).length;
          return `Visual ${v.visualNumber} (Notes Keynote): Educational content with ${textElements} text elements. ${v.description || ''}`;
        } else {
          return `Visual ${v.visualNumber} (Animation): ${v.actionCount || 0} animated operations. ${v.description || ''}`;
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
      fallbackText = `Now, see this visualization in action. Watch carefully how the elements interact and transform over time. Notice the working of each component as it contributes to the overall behavior. Look at this part right here - this is where the key mechanism operates. See how the change propagates through the system? This animation clarifies the dynamic principles we discussed. Observe the relationships forming and evolving. This visual representation helps bridge theory with actual behavior. Notice the patterns emerging as we progress through the sequence.`;
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
