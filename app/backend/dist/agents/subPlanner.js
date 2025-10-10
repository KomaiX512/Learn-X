"use strict";
/**
 * SUB-PLANNER: Creates detailed visual descriptions for each step
 *
 * This agent breaks down a step into 4-6 SPECIFIC visual concepts,
 * each with EXACT details about what to create, how to structure it,
 * what to label, and what to animate.
 *
 * NO GENERIC PROMPTS - Everything is PINPOINT specific!
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVisualPlan = createVisualPlan;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
/**
 * Generate 4-6 detailed visual concepts for a step
 * Each concept has PINPOINT specifications
 */
async function createVisualPlan(step, topic, apiKey) {
    logger_1.logger.info(`[subPlanner] Creating visual plan for step ${step.id}: ${step.tag}`);
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 4000,
            topK: 50,
            topP: 0.95
        },
        systemInstruction: `You are an expert visual education planner. Create DETAILED, SPECIFIC visual concepts with EXACT structural details.

CRITICAL: Each description must include:
1. What structure to create (e.g., "double helix with 10 base pairs")
2. Key elements and their relationships (e.g., "sugar-phosphate backbone on outside, bases paired inside")
3. What to label (e.g., "label adenine-thymine pair, show hydrogen bonds")
4. Spatial organization (e.g., "helical structure spanning 0.2 to 0.8 width")
5. What to animate if applicable (e.g., "animate DNA unwinding, show replication fork movement")

Output ONLY valid JSON.`
    });
    const prompt = `Topic: "${topic}"
Step: ${step.tag} - ${step.desc}

Create 4-6 SPECIFIC visual concepts for this step. Each must have PINPOINT details.

EXAMPLES OF GOOD DESCRIPTIONS:
- "Create a detailed DNA double helix structure spanning from x=0.2 to x=0.8. Show 12 base pairs with alternating A-T and G-C pairs. Label the sugar-phosphate backbone (phosphate groups as orange circles, deoxyribose as pentagons). Draw hydrogen bonds between complementary bases as dashed lines. Color adenine/thymine blue, guanine/cytosine red. Add measurements: 3.4nm per turn, 0.34nm between base pairs."

- "Illustrate DNA replication fork as a Y-shaped structure. Show the parent DNA splitting at x=0.4. Draw leading strand synthesis (continuous, green arrow) and lagging strand with Okazaki fragments (discontinuous, red segments). Label helicase enzyme (blue circle) unwinding the helix, DNA polymerase (yellow) adding nucleotides, primase (orange) creating RNA primers. Animate the helicase moving and DNA strands separating."

- "Diagram the base pairing rules with molecular detail. Create 4 pairs side-by-side: A-T with 2 hydrogen bonds (dashed lines), G-C with 3 hydrogen bonds. Show the molecular structure of each base (purines: double ring, pyrimidines: single ring). Label functional groups (amine, carbonyl, methyl). Use color coding: purines green, pyrimidines purple. Add arrows showing hydrogen bond donors and acceptors."

Your descriptions must be THIS specific - include:
✓ Exact structures to create
✓ Spatial positions and relationships
✓ What to label and where
✓ Colors and visual encoding
✓ Measurements and dimensions
✓ What to animate

Generate 4-6 visual concepts for "${topic}" - ${step.desc}

Output as JSON array:
[
  {
    "id": 1,
    "title": "Concept Title",
    "description": "3-4 line DETAILED description with exact specifications for structure, labels, positions, colors, and animations",
    "structureType": "diagram|process|animation|comparison|mechanism|structure",
    "animations": ["what to animate 1", "what to animate 2"]
  }
]

Output ONLY the JSON array, no markdown, no explanations.`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[subPlanner] Received ${text.length} chars`);
        logger_1.logger.debug(`[subPlanner] First 300 chars: ${text.substring(0, 300)}`);
        // Parse JSON
        const cleaned = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        const concepts = JSON.parse(cleaned);
        if (!Array.isArray(concepts) || concepts.length === 0) {
            throw new Error('Invalid visual concepts format');
        }
        logger_1.logger.info(`[subPlanner] ✅ Created ${concepts.length} visual concepts`);
        logger_1.logger.info(`[subPlanner] 📋 DETAILED CONCEPT BREAKDOWN:`);
        concepts.forEach((c, i) => {
            logger_1.logger.info(`[subPlanner]`);
            logger_1.logger.info(`[subPlanner] 📌 CONCEPT ${i + 1}/${concepts.length}:`);
            logger_1.logger.info(`[subPlanner]    Title: "${c.title}"`);
            logger_1.logger.info(`[subPlanner]    Type: ${c.structureType}`);
            logger_1.logger.info(`[subPlanner]    Description (FULL):`);
            logger_1.logger.info(`[subPlanner]    ${c.description}`);
            if (c.animations && c.animations.length > 0) {
                logger_1.logger.info(`[subPlanner]    Animations: ${c.animations.join(', ')}`);
            }
            logger_1.logger.info(`[subPlanner]`);
        });
        return concepts;
    }
    catch (error) {
        logger_1.logger.error(`[subPlanner] ❌ Failed to create visual plan:`, error);
        throw error;
    }
}
