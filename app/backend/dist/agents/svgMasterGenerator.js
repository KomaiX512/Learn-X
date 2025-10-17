"use strict";
/**
 * SVG MASTER GENERATOR
 *
 * Creates INSANE quality visuals that beat 3Blue1Brown
 * Uses advanced SVG techniques for mind-blowing educational content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicSpecializations = void 0;
exports.createInsaneQualityPrompt = createInsaneQualityPrompt;
exports.validateQuality = validateQuality;
exports.generateInsaneVisuals = generateInsaneVisuals;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
/**
 * SVG COMPLEXITY PATTERNS - Teaching LLM how to create REAL structures
 */
const SVG_PATTERNS = {
    // BIOLOGY PATTERNS
    chloroplast: `
    <!-- Double membrane with internal thylakoid structures -->
    M 0.2,0.5 
    C 0.2,0.3 0.3,0.2 0.5,0.2
    C 0.7,0.2 0.8,0.3 0.8,0.5
    C 0.8,0.7 0.7,0.8 0.5,0.8
    C 0.3,0.8 0.2,0.7 0.2,0.5 Z
    M 0.25,0.5
    C 0.25,0.35 0.35,0.25 0.5,0.25
    C 0.65,0.25 0.75,0.35 0.75,0.5
    C 0.75,0.65 0.65,0.75 0.5,0.75
    C 0.35,0.75 0.25,0.65 0.25,0.5 Z
    <!-- Thylakoid stacks (grana) -->
    M 0.35,0.4 L 0.65,0.4 M 0.35,0.45 L 0.65,0.45 M 0.35,0.5 L 0.65,0.5
    M 0.35,0.55 L 0.65,0.55 M 0.35,0.6 L 0.65,0.6
  `,
    dna_helix: `
    <!-- Double helix with base pairs -->
    M 0.3,0.1
    Q 0.35,0.2 0.4,0.25
    T 0.5,0.35
    Q 0.55,0.4 0.6,0.45
    T 0.7,0.55
    Q 0.75,0.6 0.8,0.65
    T 0.85,0.75
    M 0.7,0.1
    Q 0.65,0.2 0.6,0.25
    T 0.5,0.35
    Q 0.45,0.4 0.4,0.45
    T 0.3,0.55
    Q 0.25,0.6 0.2,0.65
    T 0.15,0.75
    <!-- Base pairs -->
    M 0.35,0.2 L 0.65,0.2
    M 0.4,0.3 L 0.6,0.3
    M 0.45,0.4 L 0.55,0.4
    M 0.4,0.5 L 0.6,0.5
    M 0.35,0.6 L 0.65,0.6
    M 0.3,0.7 L 0.7,0.7
  `,
    // CHEMISTRY PATTERNS
    benzene_ring: `
    <!-- Hexagonal aromatic ring with alternating double bonds -->
    M 0.5,0.3
    L 0.65,0.38
    L 0.65,0.52
    L 0.5,0.6
    L 0.35,0.52
    L 0.35,0.38 Z
    <!-- Double bonds -->
    M 0.52,0.32 L 0.63,0.39
    M 0.37,0.51 L 0.48,0.58
    M 0.52,0.58 L 0.63,0.51
  `,
    // PHYSICS PATTERNS
    wave_interference: `
    <!-- Two waves creating interference pattern -->
    M 0.1,0.5
    C 0.15,0.3 0.2,0.7 0.25,0.5
    C 0.3,0.3 0.35,0.7 0.4,0.5
    C 0.45,0.3 0.5,0.7 0.55,0.5
    C 0.6,0.3 0.65,0.7 0.7,0.5
    C 0.75,0.3 0.8,0.7 0.85,0.5
    C 0.9,0.3 0.95,0.7 1.0,0.5
    M 0.1,0.5
    C 0.15,0.6 0.2,0.4 0.25,0.5
    C 0.3,0.6 0.35,0.4 0.4,0.5
    C 0.45,0.6 0.5,0.4 0.55,0.5
    C 0.6,0.6 0.65,0.4 0.7,0.5
    C 0.75,0.6 0.8,0.4 0.85,0.5
    C 0.9,0.6 0.95,0.4 1.0,0.5
  `,
    // MATHEMATICS PATTERNS  
    coordinate_3d: `
    <!-- 3D coordinate system with perspective -->
    M 0.5,0.7 L 0.5,0.2  <!-- Y axis -->
    M 0.5,0.7 L 0.15,0.7  <!-- X axis -->
    M 0.5,0.7 L 0.75,0.85  <!-- Z axis -->
    <!-- Grid lines for 3D perspective -->
    M 0.3,0.7 L 0.3,0.3 M 0.4,0.7 L 0.4,0.25
    M 0.6,0.7 L 0.6,0.25 M 0.7,0.7 L 0.7,0.3
    M 0.5,0.6 L 0.2,0.6 M 0.5,0.5 L 0.25,0.5
    M 0.5,0.4 L 0.3,0.4 M 0.5,0.3 L 0.35,0.3
    M 0.55,0.73 L 0.3,0.6 M 0.6,0.76 L 0.35,0.63
    M 0.65,0.79 L 0.4,0.66 M 0.7,0.82 L 0.45,0.69
  `,
    neural_network: `
    <!-- Multi-layer neural network with connections -->
    <!-- Input layer -->
    M 0.15,0.3 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    M 0.15,0.5 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    M 0.15,0.7 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    <!-- Hidden layer 1 -->
    M 0.35,0.25 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    M 0.35,0.4 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    M 0.35,0.55 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    M 0.35,0.7 m -0.02,0 a 0.02,0.02 0 1,0 0.04,0 a 0.02,0.02 0 1,0 -0.04,0
    <!-- Connections -->
    M 0.17,0.3 L 0.33,0.25 M 0.17,0.3 L 0.33,0.4 M 0.17,0.3 L 0.33,0.55
    M 0.17,0.5 L 0.33,0.25 M 0.17,0.5 L 0.33,0.4 M 0.17,0.5 L 0.33,0.55
    M 0.17,0.7 L 0.33,0.4 M 0.17,0.7 L 0.33,0.55 M 0.17,0.7 L 0.33,0.7
  `
};
/**
 * INSANE QUALITY PROMPT GENERATOR
 * Creates prompts that force Gemini to generate COMPLEX, BEAUTIFUL SVG
 */
function createInsaneQualityPrompt(topic, description) {
    return `Generate SVG operations for the following visual description.

TOPIC: ${topic}
DESCRIPTION: ${description}

YOUR TASK:
Create 40-80 operations that bring this visual to life with stunning detail and clarity.

QUALITY STANDARDS:

1. COMPLEX SVG STRUCTURES (CRITICAL - NO BASIC SHAPES):
   - MUST use customPath extensively - NOT drawCircle or drawRect and uniquely minimalist but detailed cnotextual
   - Every path MUST have 10-20 commands minimum with Bezier curves (C) and Quadratic (Q)
   - Example rich path: "M 0.1,0.2 C 0.15,0.18 0.2,0.22 0.25,0.25 C 0.3,0.28 0.35,0.26 0.4,0.3 Q 0.45,0.35 0.5,0.32 C 0.55,0.29 0.6,0.33 0.65,0.35 C 0.7,0.37 0.75,0.34 0.8,0.38 C 0.85,0.42 0.9,0.4 0.95,0.43"
   - For molecular structures: flowing curves for bonds, organic shapes for atoms
   - For biological structures: smooth curves for membranes, complex paths for organelles
   - For mathematical concepts: precise curves following actual function plots
   - Each structure should be built from multiple connected curve segments
  

2. COMPREHENSIVE LABELING (required):
   - Label every significant structure, component, or element
   - Use precise scientific terminology from the topic
   - Include measurements, values, or annotations where relevant
   - Position labels clearly near their corresponding elements
   - Font sizes: 14-18px for readability

3. VISUAL HIERARCHY (required):
   - Main structures: strokeWidth 2-3, bold colors
   - Secondary details: strokeWidth 1-2, medium colors  
   - Annotations: fontSize 14px, subtle colors
   - Use opacity for depth: background 0.3, foreground 1.0

4. DYNAMIC ELEMENTS when appropriate:
   - addParticle: show flow, movement, molecular motion 
   - drawWave: oscillations, signals, energy transfer
   - createOrbit: circular motion, electron shells, planetary systems
   - Particles should have clear purpose and direction

5. CONTEXTUAL COLORS:

CRITICAL RULES:
- NO placeholder text ("Label 1", "Component A", "Part 1")
- Use ACTUAL scientific terms from the description
- Create 40-80 operations for richness
- Every customPath must be complex (8+ commands)
- Coordinates: 0.0 to 1.0 normalized range
- Each operation MUST have "visualGroup":"main"

OUTPUT FORMAT (JSON array only):
[
  {"op":"customPath","path":"M 0.2,0.3 C 0.3,0.2 0.4,0.4 0.5,0.5 C ...","stroke":"#2196F3","strokeWidth":2,"visualGroup":"main"},
  {"op":"drawLabel","text":"<Actual Term>","x":0.3,"y":0.4,"fontSize":16,"color":"#ffffff","visualGroup":"main"},
  {"op":"addParticle","x":0.5,"y":0.6,"color":"#FF5722","speed":0.02,"label":"<Element Name>","visualGroup":"main"},
  ...
]

Generate the JSON array now (no markdown, no explanations):`;
}
/**
 * QUALITY VALIDATOR
 * Ensures generated operations meet our INSANE quality standards
 */
function validateQuality(operations) {
    const issues = [];
    let score = 0;
    // Count operation types
    const opCounts = {};
    let totalPathComplexity = 0;
    let labelCount = 0;
    let animationCount = 0;
    operations.forEach((op) => {
        opCounts[op.op] = (opCounts[op.op] || 0) + 1;
        if (op.op === 'customPath' && op.path) {
            // Count path commands (M, L, C, Q, A, Z)
            const commands = op.path.match(/[MLCQAZ]/gi);
            const complexity = commands ? commands.length : 0;
            totalPathComplexity += complexity;
            if (complexity < 5) {
                issues.push(`Simple path detected (only ${complexity} commands)`);
            }
            else if (complexity > 10) {
                score += 10; // Bonus for complex paths
            }
        }
        if (op.op === 'drawLabel' && op.text) {
            labelCount++;
            if (op.text.length > 20) {
                score += 5; // Bonus for detailed labels
            }
        }
        if (['particle', 'wave', 'orbit', 'animate'].includes(op.op)) {
            animationCount++;
            score += 3;
        }
    });
    // Calculate quality metrics
    const customPathCount = opCounts['customPath'] || 0;
    const avgPathComplexity = customPathCount > 0 ? totalPathComplexity / customPathCount : 0;
    // Scoring for 40-80 rich operations
    if (operations.length >= 40)
        score += 25;
    if (operations.length >= 60)
        score += 10; // Bonus for richness
    if (customPathCount >= 10)
        score += 25; // Many complex structures
    if (avgPathComplexity >= 8)
        score += 30; // Rich Bezier curves
    if (labelCount >= 10)
        score += 15; // Comprehensive labeling
    if (animationCount >= 3)
        score += 5; // Dynamic elements
    // Issues
    if (operations.length < 30)
        issues.push('Need 40-80 operations for richness');
    if (customPathCount < 8)
        issues.push('Need more complex SVG paths');
    if (avgPathComplexity < 6 && customPathCount > 0)
        issues.push('Paths need more curves/commands');
    if (labelCount < 8)
        issues.push('Need comprehensive labeling');
    return {
        valid: score >= 50, // Higher bar for quality
        score: Math.min(100, score),
        issues
    };
}
/**
 * MASTER GENERATION PIPELINE
 * Generates INSANE quality visuals with retry and quality validation
 */
async function generateInsaneVisuals(topic, description, apiKey, maxRetries = 2 // Reduced from 3 to 2
) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 120000);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logger_1.logger.info(`[SVG-MASTER] Attempt ${attempt}/${maxRetries} for quality generation`);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // Highest RPM model for production
            generationConfig: {
                temperature: 0.85, // Balanced creativity
                maxOutputTokens: 16000, // Reduced for faster response
                topK: 50,
                topP: 0.95
            },
            systemInstruction: 'You are a JSON-only visual operation generator. Output ONLY a valid JSON array of operations. NO markdown, NO comments, NO explanations. Just pure JSON array starting with [ and ending with ].'
        });
        const prompt = createInsaneQualityPrompt(topic, description);
        // Retry with exponential backoff for rate limiting
        let result;
        let lastError;
        for (let retryCount = 0; retryCount < 3; retryCount++) {
            try {
                if (retryCount > 0) {
                    const delayMs = retryCount * 3000; // 3s, 6s delays
                    logger_1.logger.info(`[SVG-MASTER] Retry ${retryCount}/2 after ${delayMs}ms delay`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                result = await Promise.race([
                    model.generateContent(prompt),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT}ms`)), TIMEOUT))
                ]);
                break; // Success, exit retry loop
            }
            catch (error) {
                lastError = error;
                if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                    logger_1.logger.warn(`[SVG-MASTER] Rate limit hit, will retry...`);
                    continue;
                }
                throw error; // Non-rate-limit error, fail immediately
            }
        }
        if (!result) {
            throw lastError || new Error('Failed after retries');
        }
        try {
            // CRITICAL: Check if response exists
            if (!result || !result.response) {
                logger_1.logger.error(`[SVG-MASTER] No response object from Gemini API`);
                logger_1.logger.error(`[SVG-MASTER] Result:`, JSON.stringify(result, null, 2).substring(0, 500));
                throw new Error('No response object from API');
            }
            // Check for blocked or safety issues
            if (result.response.promptFeedback?.blockReason) {
                logger_1.logger.error(`[SVG-MASTER] Content blocked: ${result.response.promptFeedback.blockReason}`);
                throw new Error(`Content blocked: ${result.response.promptFeedback.blockReason}`);
            }
            // Extract text robustly (handle empty text())
            let text = '';
            try {
                text = result.response.text();
            }
            catch { }
            if (!text || text.trim().length === 0) {
                const candidate = result?.response?.candidates?.[0];
                const parts = candidate?.content?.parts;
                if (Array.isArray(parts)) {
                    text = parts.map((p) => p?.text || '').join('').trim();
                }
            }
            logger_1.logger.info(`[SVG-MASTER] Raw response length: ${text.length} chars`);
            // CRITICAL: Handle empty or too-short responses
            if (!text || text.trim().length === 0) {
                logger_1.logger.error(`[SVG-MASTER] Empty response from Gemini API`);
                logger_1.logger.error(`[SVG-MASTER] Response object:`, JSON.stringify(result.response, null, 2).substring(0, 500));
                throw new Error('Empty LLM response');
            }
            if (text.length < 50) {
                logger_1.logger.error(`[SVG-MASTER] Response too short (${text.length} chars): ${text}`);
                throw new Error('Response too short to be valid JSON array');
            }
            logger_1.logger.debug(`[SVG-MASTER] First 500 chars: ${text.substring(0, 500)}`);
            // ROBUST JSON PARSING - Multiple strategies
            let operations = [];
            // Strategy 1: Clean and parse
            try {
                let cleaned = text
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .replace(/\/\/.*/g, '') // Remove // comments
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
                    .trim();
                // Remove any leading HTML/XML tags
                if (cleaned.startsWith('<')) {
                    const jsonStart = cleaned.indexOf('[');
                    if (jsonStart !== -1) {
                        cleaned = cleaned.substring(jsonStart);
                    }
                }
                operations = JSON.parse(cleaned);
                logger_1.logger.info(`[SVG-MASTER] ✅ Strategy 1: Parsed ${operations.length} operations`);
            }
            catch (e1) {
                logger_1.logger.warn(`[SVG-MASTER] Strategy 1 failed: ${e1.message}`);
                // Strategy 2: Extract JSON array with regex
                try {
                    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (match) {
                        operations = JSON.parse(match[0]);
                        logger_1.logger.info(`[SVG-MASTER] ✅ Strategy 2: Parsed ${operations.length} operations`);
                    }
                    else {
                        throw new Error('No JSON array found');
                    }
                }
                catch (e2) {
                    logger_1.logger.warn(`[SVG-MASTER] Strategy 2 failed: ${e2.message}`);
                    // Strategy 3: Extract individual operation objects
                    const opMatches = Array.from(text.matchAll(/\{[^{}]*"op"[^{}]*\}/g));
                    operations = opMatches.map(m => {
                        try {
                            return JSON.parse(m[0].replace(/,\s*}/g, '}'));
                        }
                        catch {
                            return null;
                        }
                    }).filter(op => op !== null);
                    if (operations.length > 0) {
                        logger_1.logger.info(`[SVG-MASTER] ✅ Strategy 3: Extracted ${operations.length} operations`);
                    }
                    else {
                        throw new Error('All JSON parsing strategies failed');
                    }
                }
            }
            operations = operations.map(op => {
                const clamped = { ...op };
                // Clamp x, y
                if (typeof clamped.x === 'number') {
                    clamped.x = Math.max(0, Math.min(1, clamped.x));
                }
                if (typeof clamped.y === 'number') {
                    clamped.y = Math.max(0, Math.min(1, clamped.y));
                }
                // Clamp x1, y1, x2, y2
                if (typeof clamped.x1 === 'number')
                    clamped.x1 = Math.max(0, Math.min(1, clamped.x1));
                if (typeof clamped.y1 === 'number')
                    clamped.y1 = Math.max(0, Math.min(1, clamped.y1));
                if (typeof clamped.x2 === 'number')
                    clamped.x2 = Math.max(0, Math.min(1, clamped.x2));
                if (typeof clamped.y2 === 'number')
                    clamped.y2 = Math.max(0, Math.min(1, clamped.y2));
                // Clamp center array
                if (Array.isArray(clamped.center) && clamped.center.length === 2) {
                    clamped.center = [
                        Math.max(0, Math.min(1, clamped.center[0])),
                        Math.max(0, Math.min(1, clamped.center[1]))
                    ];
                }
                return clamped;
            });
            logger_1.logger.info(`[SVG-MASTER] ✅ Coordinates clamped to 0-1 range`);
            // Validate quality
            const validation = validateQuality(operations);
            logger_1.logger.info(`[SVG-MASTER] Quality Score: ${validation.score}/100`);
            // Accept if quality score is good OR has minimum rich operations
            if (validation.score >= 50 || operations.length >= 30) {
                logger_1.logger.info(`[SVG-MASTER] ✅ Quality acceptable! Score: ${validation.score}, Ops: ${operations.length}`);
                return operations;
            }
            else {
                logger_1.logger.warn(`[SVG-MASTER] Low quality (${validation.score}): ${validation.issues.join(', ')}`);
                if (attempt < maxRetries) {
                    logger_1.logger.info(`[SVG-MASTER] Retrying...`);
                    continue;
                }
            }
            // CRITICAL: Return what we have on last attempt rather than failing
            if (operations.length >= 20) {
                logger_1.logger.warn(`[SVG-MASTER] ⚠️ Returning ${operations.length} operations despite low score`);
                return operations;
            }
            throw new Error(`Failed to generate sufficient operations (only ${operations.length})`);
        }
        catch (error) {
            logger_1.logger.error(`[SVG-MASTER] Attempt ${attempt} failed: ${error.message}`);
            // Handle rate limiting with exponential backoff
            if (error.message?.includes('rate limit') || error.message?.includes('overloaded') || error.message?.includes('503')) {
                const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
                logger_1.logger.warn(`[SVG-MASTER] Rate limited. Waiting ${backoffTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
    throw new Error('Failed to generate insane quality visuals after all retries');
}
/**
 * SPECIALIZED GENERATORS FOR DIFFERENT TOPICS
 */
exports.TopicSpecializations = {
    biology: (topic) => `
    BIOLOGY SPECIALIZATION:
    - Use organic curves, never straight lines for living structures
    - Show internal organelles with semi-transparent membranes
    - Add ATP/ADP particles for energy processes
    - Include DNA/RNA helixes where relevant
    - Use green tones for plants, blue for water, red for blood
  `,
    chemistry: (topic) => `
    CHEMISTRY SPECIALIZATION:
    - Show electron orbitals as probability clouds
    - Use dashed lines for hydrogen bonds
    - Show reaction arrows with energy annotations
    - Include molecular formulas with proper subscripts
    - Animate electron movement in reactions
  `,
    physics: (topic) => `
    PHYSICS SPECIALIZATION:
    - Show field lines with proper density gradients
    - Use vectors with magnitude proportional to length
    - Include coordinate systems with units
    - Show wave interference patterns
    - Animate particle trajectories with trails
  `,
    mathematics: (topic) => `
    MATHEMATICS SPECIALIZATION:
    - Use precise geometric constructions
    - Show function graphs with actual calculations
    - Include LaTeX equations for formulas
    - Use 3D perspective for spatial concepts
    - Animate transformations step-by-step
  `
};
exports.default = generateInsaneVisuals;
//# sourceMappingURL=svgMasterGenerator.js.map