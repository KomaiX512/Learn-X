/**
 * Clarifier Agent
 * Generates contextual clarification for student questions during lecture
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger';
import { Plan } from '../types';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is required for clarifier agent');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface ClarificationRequest {
  query: string; // Original lecture topic
  step: any; // Step where question was asked
  question: string; // Student's question
  screenshot?: string; // Base64 screenshot if available
  plan: Plan; // Full lesson plan for context
}

export interface ClarificationResult {
  title: string;
  explanation: string;
  actions: any[]; // Visual actions for clarification
}

/**
 * Generate contextual clarification based on student question
 */
export async function clarifierAgent(request: ClarificationRequest): Promise<ClarificationResult> {
  const startTime = Date.now();
  logger.info(`[clarifier] Generating clarification for: "${request.question}"`);
  logger.debug(`[clarifier] Context - Topic: ${request.query}, Step: ${request.step.id} (${request.step.tag})`);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite', // Highest RPM model
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    });

    const prompt = buildClarificationPrompt(request);
    
    logger.debug('[clarifier] Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    logger.debug(`[clarifier] Raw response length: ${response.length} chars`);
    
    // Parse and validate response
    const parsed = JSON.parse(response);
    
    if (!parsed.title || !parsed.explanation || !Array.isArray(parsed.actions)) {
      throw new Error('Invalid clarification response structure');
    }

    const duration = Date.now() - startTime;
    logger.info(`[clarifier] ✅ Clarification generated in ${duration}ms - ${parsed.actions.length} actions`);

    return {
      title: parsed.title,
      explanation: parsed.explanation,
      actions: parsed.actions
    };
  } catch (error) {
    logger.error(`[clarifier] Error generating clarification: ${error}`);
    throw error;
  }
}

/**
 * Build prompt for clarification generation
 */
function buildClarificationPrompt(request: ClarificationRequest): string {
  const { query, step, question, plan, screenshot } = request;

  return `You are an elite AI professor creating a CONTEXTUAL CLARIFICATION for a confused student.

LECTURE CONTEXT:
- Topic: ${query}
- Current Step: ${step.tag} - ${step.desc}
- Step Complexity: ${step.complexity}/5
- Plan: ${plan.title}

STUDENT'S QUESTION:
"${question}"

${screenshot ? '📸 VISUAL CONTEXT: The student attached a screenshot of the current canvas state.\n' : ''}

YOUR TASK:
Generate a FOCUSED, VISUAL clarification that:
1. Directly addresses the student's specific confusion
2. Builds on what was shown in "${step.tag}"
3. Uses the SAME visual language and metaphors from the lesson
4. Provides a COMPLETE mini-lesson (10-15 actions)
5. Ends with confidence that the concept is now clear

CLARIFICATION STRUCTURE:
{
  "title": "Clear, Direct Answer (e.g., 'Let me explain why X happens')",
  "explanation": "One sentence summary of what you'll clarify",
  "actions": [
    // 1. Acknowledge the confusion (1 drawLabel)
    {"op": "drawLabel", "text": "Great question! Let's break this down...", "x": 0.05, "y": 0.05, "normalized": true},
    
    // 2. Visual re-explanation (8-12 visual actions)
    // Use: drawCircle, drawRect, drawVector, orbit, wave, particle, arrow, drawAxis, drawCurve
    // Focus on the SPECIFIC confusion point
    
    // 3. Concrete example (2-3 actions)
    
    // 4. Confirmation (1 drawLabel)
    {"op": "drawLabel", "text": "Does this make it clearer?", "x": 0.05, "y": 0.9, "normalized": true}
  ]
}

CRITICAL RULES:
- 10-15 actions MAXIMUM (concise, focused clarification)
- 80% VISUAL operations (drawCircle, drawVector, orbit, wave, etc.)
- Reference the SPECIFIC step context
- Use normalized coordinates (0-1 range)
- Include proper delays (0.5-1.5s) for comprehension
- NO generic explanations - make it SPECIFIC to their question
- Use the SAME teaching style as the main lecture

VISUAL OPERATIONS AVAILABLE:
- drawTitle, drawLabel (text)
- drawCircle, drawRect (shapes)
- drawVector, arrow (directions)
- orbit, wave, particle (animations)
- drawAxis, drawCurve (graphs)
- delay (timing)

Generate the JSON now:`;
}
