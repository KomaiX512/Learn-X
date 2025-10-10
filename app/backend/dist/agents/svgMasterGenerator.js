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
    return `Generate educational visual operations for:

Topic: "${topic}"
Description: "${description}"

🎯 YOUR MISSION: Generate 50-80 operations that create a STUNNING, 3Blue1Brown-quality visual.

🔥 CRITICAL REQUIREMENTS FOR BEATING 3BLUE1BROWN:

1. COMPLEX SVG PATHS (NOT simple shapes):
   - Use Bezier curves (C command) for smooth organic shapes
   - Use Quadratic curves (Q command) for mathematical functions  
   - Use Arc commands (A command) for circular structures
   - Combine multiple subpaths in single customPath for complex structures
   
2. MATHEMATICAL PRECISION:
   - Graphs must use actual function calculations
   - Coordinate systems must show proper perspective
   - Geometric shapes must be mathematically accurate
   
3. LAYERED COMPLEXITY:
   - Background layer (grids, coordinate systems)
   - Main structure layer (primary visual elements)
   - Detail layer (internal components, annotations)
   - Animation layer (particles, waves, motion)
   
4. RICH LABELING:
   - Every important element MUST have a label
   - Use subscripts/superscripts in labels (H₂O, x², etc.)
   - Include equations where relevant
   - Add value annotations (measurements, quantities)

5. VISUAL HIERARCHY:
   - Primary elements: strokeWidth 3-4, bright colors
   - Secondary elements: strokeWidth 2, medium colors
   - Details: strokeWidth 1, subtle colors
   - Use opacity for depth (back=0.3, mid=0.6, front=1.0)

📊 OPERATION DISTRIBUTION (MANDATORY):
- 30-40% customPath operations (complex structures)
- 20-30% drawLabel operations (rich annotations)
- 10-15% particle/wave/orbit (animations)
- 5-10% drawVector/drawLine (connections)
- 5-10% mathematical operations (graphs, equations)

🎨 COLOR PALETTE FOR PROFESSIONAL LOOK:
- Primary: #2196F3 (blue), #4CAF50 (green), #FF5722 (orange)
- Secondary: #9C27B0 (purple), #00BCD4 (cyan), #FFC107 (amber)
- Neutral: #37474F (dark), #78909C (medium), #CFD8DC (light)
- Use gradients: rgba() with varying opacity for depth

⚡ ANIMATION REQUIREMENTS:
- Particles showing flow/movement (electrons, photons, molecules)
- Waves for energy/signal propagation
- Orbit for circular motion (planets, electrons)
- Sequential delays for step-by-step revelation

📐 SVG PATH EXAMPLES FOR COMPLEX STRUCTURES:

Chloroplast (biology):
${SVG_PATTERNS.chloroplast}

Benzene Ring (chemistry):
${SVG_PATTERNS.benzene_ring}

3D Coordinate System (math):
${SVG_PATTERNS.coordinate_3d}

🚨 QUALITY CHECKS:
✅ Every customPath must have 10+ path commands (not just M L L Z)
✅ Every visual element must contribute to understanding
✅ No placeholder text - use real scientific terms
✅ Animations must illustrate processes, not just decoration
✅ Total visual must tell a complete story without words

OUTPUT FORMAT:
[
  {"op":"customPath","path":"[COMPLEX PATH WITH 10+ COMMANDS]","stroke":"#2196F3","strokeWidth":3,"fill":"rgba(33,150,243,0.1)"},
  {"op":"drawLabel","text":"[Scientific Term]","x":0.5,"y":0.1,"fontSize":18,"color":"#37474F"},
  {"op":"particle","x":0.5,"y":0.5,"count":12,"spread":0.15,"speed":0.02,"lifetime":2000,"color":"#FFC107"},
  ...
]

Generate 50-70 operations for a complete, educational visual.

🎯 OUTPUT REQUIREMENTS:
- Output ONLY a valid JSON array
- NO explanations, NO markdown, NO comments
- Start with [ and end with ]
- Each operation must be a valid JSON object

EXAMPLE FORMAT:
[
  {"op":"customPath","path":"M 0.2,0.3 C 0.3,0.4 0.5,0.5 0.7,0.6","stroke":"#2196F3","strokeWidth":2},
  {"op":"drawLabel","text":"Main Structure","x":0.5,"y":0.1,"fontSize":16,"color":"#333"}
]

Output ONLY the JSON array now:`;
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
    // Scoring
    if (operations.length >= 50)
        score += 20;
    if (customPathCount >= 15)
        score += 20;
    if (avgPathComplexity >= 8)
        score += 30;
    if (labelCount >= 10)
        score += 15;
    if (animationCount >= 5)
        score += 15;
    // Issues
    if (operations.length < 30)
        issues.push('Too few operations (need 50+)');
    if (customPathCount < 10)
        issues.push('Too few complex structures');
    if (avgPathComplexity < 5)
        issues.push('Paths too simple (need more curves/commands)');
    if (labelCount < 8)
        issues.push('Insufficient labeling');
    if (animationCount < 3)
        issues.push('Lacks dynamic elements');
    return {
        valid: score >= 60,
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
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logger_1.logger.info(`[SVG-MASTER] Attempt ${attempt}/${maxRetries} for quality generation`);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // Highest RPM model
            generationConfig: {
                temperature: 0.85, // Balanced creativity
                maxOutputTokens: 16000, // Reduced for faster response
                topK: 50,
                topP: 0.95
            },
            systemInstruction: 'You are a JSON-only visual operation generator. Output ONLY a valid JSON array of operations. NO markdown, NO comments, NO explanations. Just pure JSON array starting with [ and ending with ].'
        });
        const prompt = createInsaneQualityPrompt(topic, description);
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            logger_1.logger.info(`[SVG-MASTER] Raw response length: ${text.length} chars`);
            // CRITICAL: Handle empty or too-short responses
            if (!text || text.trim().length === 0) {
                logger_1.logger.error(`[SVG-MASTER] Empty response from Gemini API`);
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
            // Validate quality
            const validation = validateQuality(operations);
            logger_1.logger.info(`[SVG-MASTER] Quality Score: ${validation.score}/100`);
            // LOWERED THRESHOLD: Accept 50+ instead of 60+ for production reliability
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
