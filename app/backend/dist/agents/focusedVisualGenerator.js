"use strict";
/**
 * FOCUSED VISUAL GENERATOR
 *
 * Takes a DETAILED 3-4 line description and generates EXACT visual operations
 * NO GENERIC SHAPES - Everything based on the specific description
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVisualFromConcept = generateVisualFromConcept;
exports.generateAllVisuals = generateAllVisuals;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const syntaxRecoveryAgent_1 = require("./syntaxRecoveryAgent");
const MODEL = 'gemini-2.5-flash';
/**
 * Generate visual operations for ONE specific concept
 */
async function generateVisualFromConcept(concept, topic, apiKey, yOffset = 0) {
    logger_1.logger.info(`[focusedGen] Generating visual for: "${concept.title}"`);
    logger_1.logger.debug(`[focusedGen] Description: ${concept.description.substring(0, 150)}...`);
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
            temperature: 0.75, // Less random, more precise
            maxOutputTokens: 8000,
            topK: 40,
            topP: 0.90
        },
        systemInstruction: `You are a precision visual code generator. You translate detailed structural descriptions into EXACT visual operations.

CRITICAL RULES:
1. Follow the description EXACTLY - create what's specified, not generic shapes
2. Use proper operations for structures (customPath for complex shapes, drawMolecule for molecules, etc.)
3. Implement ALL labels mentioned in the description
4. Create ALL animations mentioned
5. Use domain-specific colors and styling
6. Round all coordinates to 0.05 precision
7. Output ONLY valid JSON array of operations

AVAILABLE OPERATIONS:
- drawCircle, drawRect, drawLine, drawLabel, drawTitle
- customPath (for complex shapes/structures)
- drawMolecule, drawAtom, drawBond, drawMolecularStructure
- drawCellStructure, drawMembrane, drawOrganSystem  
- drawGraph, drawLatex, drawMathLabel, drawVector
- drawNeuralNetwork, drawDataStructure, drawAlgorithmStep
- drawCircuitElement, drawSignalWaveform
- particle, wave, orbit, animate
- drawDiagram, drawFlowchart, drawCoordinateSystem

NO GENERIC CIRCLES WITHOUT PURPOSE - Create the actual structures described!`
    });
    const prompt = `VISUAL CONCEPT TO IMPLEMENT:
Title: ${concept.title}
Type: ${concept.structureType}
Topic: ${topic}

DETAILED SPECIFICATION:
${concept.description}

${concept.animations && concept.animations.length > 0 ? `
ANIMATIONS TO CREATE:
${concept.animations.map((a, i) => `${i + 1}. ${a}`).join('\n')}
` : ''}

SPATIAL PLACEMENT:
- Y-offset: ${yOffset.toFixed(2)} (add this to all y coordinates)
- Use vertical space from y=${yOffset.toFixed(2)} to y=${(yOffset + 0.25).toFixed(2)}
- Span horizontally from x=0.1 to x=0.9

QUALITY REQUIREMENTS:
✓ Implement the EXACT structure described (not generic shapes!)
✓ Create ALL labels mentioned
✓ Use customPath for complex structures (DNA helices, molecular structures, etc.)
✓ Implement animations as specified
✓ Use scientifically accurate colors and styling
✓ Add measurements and scale indicators where mentioned
✓ Create detailed structures, not simplified diagrams

Generate 8-15 operations to create this visual EXACTLY as described.

OUTPUT FORMAT:
[
  {"op":"drawLabel","text":"[exact text from description]","x":0.5,"y":${(yOffset + 0.02).toFixed(2)},"fontSize":18,"color":"#333"},
  {"op":"customPath","path":"M 0.2,${(yOffset + 0.1).toFixed(2)} L ...","stroke":"#color","strokeWidth":2,"fill":"none"},
  ...
]

Output ONLY the JSON array, no explanations.`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[focusedGen] 📥 Received ${text.length} chars for "${concept.title}"`);
        // VERBOSE: Log first 500 chars of generated code
        logger_1.logger.info(`[focusedGen] 📄 Generated code preview:\n${text.substring(0, 500)}...`);
        // Parse and validate
        const cleaned = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid JSON format - not an array');
        }
        const validated = (0, syntaxRecoveryAgent_1.validateOperations)(parsed);
        logger_1.logger.info(`[focusedGen] ✅ Generated ${validated.length} operations for "${concept.title}"`);
        // VERBOSE: Log operation types for debugging
        const opTypes = validated.reduce((acc, op) => {
            acc[op.op] = (acc[op.op] || 0) + 1;
            return acc;
        }, {});
        logger_1.logger.info(`[focusedGen] 📊 Operation breakdown for "${concept.title}":`, opTypes);
        // VERBOSE: Cross-verify operations match description
        logger_1.logger.info(`[focusedGen] 🔍 CROSS-VERIFICATION:`);
        logger_1.logger.info(`[focusedGen]    Description: ${concept.description}`);
        logger_1.logger.info(`[focusedGen]    Generated: ${validated.length} ops using: ${Object.keys(opTypes).join(', ')}`);
        // Check for generic shapes (should be minimal!)
        const genericCount = (opTypes['drawCircle'] || 0) + (opTypes['drawRect'] || 0);
        const advancedCount = (opTypes['customPath'] || 0) + (opTypes['drawMolecule'] || 0) +
            (opTypes['drawCellStructure'] || 0) + (opTypes['drawNeuralNetwork'] || 0) +
            (opTypes['drawMolecularStructure'] || 0);
        if (genericCount > advancedCount && validated.length > 5) {
            logger_1.logger.warn(`[focusedGen] ⚠️  Too many generic shapes! Generic: ${genericCount}, Advanced: ${advancedCount}`);
        }
        else {
            logger_1.logger.info(`[focusedGen] ✅ Good shape distribution! Generic: ${genericCount}, Advanced: ${advancedCount}`);
        }
        return validated;
    }
    catch (error) {
        logger_1.logger.error(`[focusedGen] ❌ Failed to generate visual for "${concept.title}":`, error);
        throw error;
    }
}
/**
 * Generate visuals for all concepts in parallel
 */
async function generateAllVisuals(concepts, topic, apiKey) {
    logger_1.logger.info(`[focusedGen] Generating ${concepts.length} visuals in parallel`);
    const promises = concepts.map((concept, index) => {
        // Calculate y-offset for vertical stacking
        const yOffset = index * 0.28; // 0.25 for content + 0.03 gap
        // Add small delay to prevent API overload (stagger by 500ms)
        return new Promise(resolve => {
            setTimeout(async () => {
                try {
                    const ops = await generateVisualFromConcept(concept, topic, apiKey, yOffset);
                    resolve(ops);
                }
                catch (error) {
                    logger_1.logger.error(`[focusedGen] Failed visual ${index + 1}, continuing...`);
                    resolve([]); // Return empty instead of failing entire step
                }
            }, index * 500);
        });
    });
    const results = await Promise.all(promises);
    const allOperations = results.flat();
    logger_1.logger.info(`[focusedGen] ✅ Generated total ${allOperations.length} operations from ${concepts.length} concepts`);
    return allOperations;
}
