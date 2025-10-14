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
  logger.debug(`[clarifier] Screenshot provided: ${!!request.screenshot}`);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // PAID MODEL - NEVER DOWNGRADE
      generationConfig: {
        temperature: 0.75, // Slightly higher for creative clarifications
        maxOutputTokens: 4000
      },
      systemInstruction: 'You are a JSON-only clarifier. Output ONLY a valid JSON object with fields: title, explanation, actions (array). Never include markdown, comments, or any text outside the JSON.'
    });

    // Build multimodal prompt
    const promptParts = await buildMultimodalPrompt(request);
    
    logger.debug(`[clarifier] Sending ${promptParts.length}-part multimodal request to Gemini...`);
    const result = await model.generateContent(promptParts);
    let response = '';
    try {
      response = result.response.text();
    } catch {}

    // Fallback: extract from candidate parts if text() is empty
    if (!response || response.trim().length === 0) {
      const candidate: any = (result as any)?.response?.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        response = parts.map((p: any) => p?.text || '').join('').trim();
      }
    }

    if (!response || response.trim().length === 0) {
      throw new Error('Empty LLM response');
    }

    logger.debug(`[clarifier] Raw response length: ${response.length} chars`);
    
    // Clean JSON response (remove markdown code blocks if present)
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Parse and validate response
    const parsed = JSON.parse(cleanedResponse);
    
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
 * Build multimodal prompt with optional screenshot
 */
async function buildMultimodalPrompt(request: ClarificationRequest): Promise<any[]> {
  const { query, step, question, plan, screenshot } = request;

  const textPrompt = `You are an elite AI professor creating a CONTEXTUAL CLARIFICATION for a confused student.

LECTURE CONTEXT:
- Topic: ${query}
- Current Step: ${step.tag} - ${step.desc}
- Plan: ${plan.title}

STUDENT'S QUESTION:
"${question}"

${screenshot ? '📸 SCREENSHOT PROVIDED: Analyze the visual content to understand what the student is confused about.' : ''}

YOUR TASK:
Generate a FOCUSED, SVG-BASED clarification that:
1. Directly addresses the student's specific confusion
2. Builds on what was shown in "${step.tag}"
3. Uses SVG operations to create clear visual explanations
4. Provides 10-15 visual actions maximum
5. Makes the concept crystal clear

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Clear Answer Title",
  "explanation": "One sentence summary",
  "actions": [
    {"op": "drawLabel", "text": "Let me clarify...", "x": 0.1, "y": 0.1, "fontSize": 16, "normalized": true},
    {"op": "drawCircle", "x": 0.5, "y": 0.3, "radius": 0.05, "color": "#4CAF50", "normalized": true},
    {"op": "drawVector", "x": 0.5, "y": 0.3, "dx": 0.2, "dy": 0.1, "color": "#2196F3", "label": "Force", "normalized": true},
    {"op": "delay", "ms": 800}
  ]
}

AVAILABLE OPERATIONS:
- drawTitle, drawLabel (text with fontSize, color)
- drawCircle, drawRect, drawLine (basic shapes)
- drawVector, arrow (arrows with labels)
- orbit, wave, particle (animations)
- drawAxis, drawCurve, graph (math visualizations)
- delay (pacing for comprehension)

CRITICAL RULES:
- 10-15 actions MAXIMUM
- ALL coordinates normalized (0-1 range)
- Use "normalized": true for all spatial operations
- SPECIFIC to their question, not generic
- Pure JSON output - NO markdown, NO comments`;

  const parts: any[] = [{ text: textPrompt }];

  // Add screenshot as image part if provided
  if (screenshot) {
    try {
      // Extract base64 data from data URL
      const base64Match = screenshot.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (base64Match) {
        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];
        
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
        
        logger.debug(`[clarifier] Added screenshot as ${mimeType} image part`);
      } else {
        logger.warn('[clarifier] Screenshot format not recognized, using text-only prompt');
      }
    } catch (error) {
      logger.error(`[clarifier] Error processing screenshot: ${error}`);
    }
  }

  return parts;
}
