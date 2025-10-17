"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyNotes = generateKeyNotes;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 60000);
function withTimeout(p, ms, label) {
    logger_1.logger.debug(`[timeout] Setting ${ms}ms timeout for ${label}`);
    return Promise.race([
        p,
        new Promise((_, reject) => {
            const timer = setTimeout(() => {
                logger_1.logger.debug(`[timeout] ${label} timed out after ${ms}ms`);
                reject(new Error(`${label} timeout after ${ms}ms`));
            }, ms);
            p.finally(() => clearTimeout(timer));
        })
    ]);
}
function fixJsonSyntax(jsonText) {
    let fixed = jsonText;
    // 1. Remove markdown code blocks
    fixed = fixed.replace(/```json|```/gi, '').trim();
    // 2. Protect LaTeX expressions
    const latexPatterns = [];
    fixed = fixed.replace(/\$([^$]+)\$/g, (match) => {
        latexPatterns.push(match);
        return `__LATEX_${latexPatterns.length - 1}__`;
    });
    // 3. Remove literal backslash-n
    fixed = fixed.replace(/\\n/g, ' ');
    fixed = fixed.replace(/\\t/g, ' ');
    fixed = fixed.replace(/\\r/g, ' ');
    // 4. Restore LaTeX patterns
    latexPatterns.forEach((pattern, idx) => {
        const escapedPattern = pattern.replace(/\\/g, '\\\\');
        fixed = fixed.replace(`__LATEX_${idx}__`, escapedPattern);
    });
    // 5. Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    // 6. Fix smart quotes
    fixed = fixed.replace(/'/g, "'");
    fixed = fixed.replace(/"/g, '"');
    fixed = fixed.replace(/"/g, '"');
    fixed = fixed.replace(/–/g, '-');
    fixed = fixed.replace(/—/g, '-');
    // 7. Remove control characters
    fixed = fixed.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ');
    // 8. Balance braces and brackets
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
async function generateKeyNotes(topic, lectureSummary, steps, stepContents, isPartial // Flag if lecture is not complete yet
) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Missing GEMINI_API_KEY');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    // Build comprehensive context from ALL AVAILABLE lecture transcripts
    let lectureContext = '';
    let availableContext = '';
    let pendingContext = '';
    let contextStatus = 'COMPLETE';
    if (stepContents && stepContents.length > 0) {
        const availableSteps = stepContents.filter(s => s.isAvailable && s.transcript);
        const pendingSteps = stepContents.filter(s => !s.isAvailable || !s.transcript);
        // Build context from available steps
        if (availableSteps.length > 0) {
            availableContext = availableSteps.map((content, i) => {
                return `
═══════════════════════════════════════════════════════════
STEP ${content.stepId}: ${content.title}
═══════════════════════════════════════════════════════════
${content.transcript}
`;
            }).join('\n');
        }
        // Build context for pending/upcoming steps
        if (pendingSteps.length > 0) {
            pendingContext = pendingSteps.map(s => `- ${s.title}`).join('\n');
            contextStatus = 'PARTIAL';
        }
        lectureContext = availableContext;
    }
    else if (steps) {
        // Fallback to basic step information
        lectureContext = steps.map((s, i) => `${i + 1}. ${s.title || s.desc || 'Untitled'}`).join('\n');
    }
    const prompt = `You are an ADVANCED KEY NOTES GENERATOR specialized in NUMERICAL PROBLEMS, QUIZZES, and EXAMINATION PREPARATION.

🎯 MISSION: Create comprehensive KEY NOTES for exam preparation with strong focus on:
- Numerical problem-solving techniques
- Formula applications
- Common exam question patterns
- Step-by-step solution methods
- Edge cases and tricky scenarios

📚 TOPIC: ${topic}

${lectureSummary ? `📝 OVERVIEW: ${lectureSummary}\n` : ''}

📊 LECTURE CONTEXT STATUS: ${contextStatus}
${contextStatus === 'PARTIAL' ? '⚠️  Some steps are not yet covered in the lecture. Fill in CRITICAL missing information!\n' : ''}

📖 AVAILABLE LECTURE CONTENT (ANALYZE THOROUGHLY):
${lectureContext || '(Limited context available)'}

${pendingContext ? `\n📋 UPCOMING TOPICS (Not Yet Covered):\n${pendingContext}\n` : ''}

⚡ CRITICAL REQUIREMENTS:

1. **USE AVAILABLE CONTEXT**: Extract ALL key concepts from the available lecture transcript above
2. **FILL IN GAPS**: If lecture is incomplete (${contextStatus}), ADD CRITICAL information that:
   - Is ESSENTIAL for the topic "${topic}"
   - Students MUST know for exams
   - Was NOT covered yet but is FUNDAMENTAL
   - Includes key formulas, definitions, and concepts
3. **~20 KEY POINTS TOTAL**: Aim for approximately 20 important items across all categories
4. **NUMERICAL FOCUS**: Emphasize formulas, calculations, and problem-solving steps
5. **EXAM-ORIENTED**: Include question patterns that could appear in tests
6. **FORMULA-FIRST**: Every mathematical concept MUST have its formula
7. **PROBLEM TYPES**: Identify different types of questions that can be asked
8. **STEP-BY-STEP**: For complex problems, include solution methodology
9. **EDGE CASES**: Critical scenarios that students often miss
10. **COMPLETE COVERAGE**: Ensure notes cover COMPLETE topic even if lecture is partial

📋 STRUCTURE YOUR OUTPUT:

Group notes into 4-6 categories based on lecture content:
- "Essential Formulas" (mathematical expressions)
- "Problem-Solving Steps" (methodologies)
- "Common Question Types" (exam patterns)
- "Important Definitions" (core concepts)
- "Critical Edge Cases" (tricky scenarios)
- "Quick Reference" (one-liner facts)

For EACH item:
- **title**: Clear, descriptive identifier (3-7 words)
- **formula**: Mathematical notation, equation, or algorithm (MANDATORY for math/science)
- **description**: Concise explanation focusing on application (15-25 words)
- **useCase**: When/where to use this in problem-solving
- **edgeCase**: Common mistakes or special cases to watch for

🎯 OUTPUT STRICT JSON FORMAT:

{
  "notes": [
    {
      "category": "Essential Formulas",
      "items": [
        {
          "title": "Pythagorean Theorem",
          "formula": "a² + b² = c²",
          "description": "Fundamental relation between sides of a right triangle, foundation for distance calculations",
          "useCase": "Finding unknown side length, distance problems, trigonometry",
          "edgeCase": "Only valid for right triangles (90° angle required)"
        },
        {
          "title": "Quadratic Formula",
          "formula": "x = (-b ± √(b²-4ac)) / 2a",
          "description": "Solves any quadratic equation ax² + bx + c = 0 regardless of factorability",
          "useCase": "When factoring fails, optimization problems, parabola analysis",
          "edgeCase": "Check discriminant b²-4ac: negative means no real solutions"
        }
      ]
    },
    {
      "category": "Problem-Solving Steps",
      "items": [
        {
          "title": "Integration by Parts",
          "formula": "∫u dv = uv - ∫v du",
          "description": "Method for integrating products of functions by strategic choice of u and dv",
          "useCase": "Integrating polynomial × exponential, polynomial × trigonometric",
          "edgeCase": "Choose u using LIATE rule (Log, Inverse trig, Algebraic, Trig, Exponential)"
        }
      ]
    }
  ]
}

⚠️ STRICTNESS RULES:
- Output ONLY valid JSON (no markdown, no explanation)
- Target: ~20 total items across 4-6 categories
- Each item must have title + formula (if applicable) + description
- Include useCase and edgeCase for practical exam preparation
- Cover EVERYTHING taught in the lecture
- Focus on NUMERICAL PROBLEMS and EXAM QUESTIONS
- If lecture covered calculations, show the formulas
- If lecture showed examples, extract the pattern

🎯 GENERATE NOW - COMPREHENSIVE EXAM-READY NOTES:`;
    try {
        logger_1.logger.info(`[NotesGenerator] Generating key notes for: ${topic} (Context: ${contextStatus}${isPartial ? ' - PARTIAL' : ''})`);
        if (contextStatus === 'PARTIAL') {
            logger_1.logger.info(`[NotesGenerator] ⚠️  Working with partial context - will fill in missing critical information`);
        }
        const result = await withTimeout(model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4, // Balanced for comprehensive coverage
                maxOutputTokens: 12000, // Increased for ~20 items
                topK: 30,
                topP: 0.9
            },
            systemInstruction: 'You are a JSON-only key notes generator for exam preparation. Output ONLY valid JSON objects. Never include explanations, markdown formatting, or any text outside the JSON.'
        }), DEFAULT_TIMEOUT, 'NotesGenerator');
        const rawText = result.response.text();
        logger_1.logger.debug(`[NotesGenerator] Raw response length: ${rawText.length}`);
        // Fix and parse JSON
        const fixedJson = fixJsonSyntax(rawText);
        const parsed = JSON.parse(fixedJson);
        // Validate structure
        if (!parsed.notes || !Array.isArray(parsed.notes)) {
            throw new Error('Invalid notes structure: missing notes array');
        }
        // Validate each category
        for (const category of parsed.notes) {
            if (!category.category || !Array.isArray(category.items)) {
                throw new Error('Invalid category structure');
            }
            for (const item of category.items) {
                if (!item.title) {
                    throw new Error('Invalid item: missing title');
                }
            }
        }
        logger_1.logger.info(`[NotesGenerator] ✅ Generated ${parsed.notes.length} categories`);
        return parsed;
    }
    catch (error) {
        logger_1.logger.error('[NotesGenerator] Generation failed:', error);
        throw new Error(`Failed to generate key notes: ${error.message}`);
    }
}
//# sourceMappingURL=notesGenerator.js.map