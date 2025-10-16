/**
 * SUB-PLANNER AGENT - ENFORCES DIVERSE VISUAL ASPECTS
 *
 * Generates 4 COMPLEMENTARY visual descriptions for a single step
 * Each visual MUST cover a DIFFERENT aspect to avoid repetition
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger';
const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 40000;
function createSubPlanPrompt(step, topic) {
    return `You are planning 4 COMPLEMENTARY SVG visualizations for this learning step.

TOPIC: "${topic}"
STEP: ${step.desc}

⚠️ CRITICAL: Each visual MUST show a DIFFERENT aspect. NO REPETITION!

Generate 4 visual scripts following this STRICT diversity framework:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 1: STRUCTURE/ANATOMY - "What does it look like?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Focus: Physical structure, components, layout, architecture
- Show the COMPONENTS and their RELATIONSHIPS
- Label all parts with their names/functions
- Use static or minimal animation
- Example for Carnot: 4 connected reservoirs in cycle diagram
- Example for Neuron: Dendrites, soma, axon, synapses labeled
- Example for Algorithm: Flowchart blocks with data structures

Must include: Labels, arrows showing connections, component names

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 2: MECHANISM/PROCESS - "How does it work?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Focus: Step-by-step process, transformation, dynamic behavior
- Show MOTION and TRANSFORMATION over time
- Animate the process from start to end
- Include time labels or step numbers
- Example for Carnot: Show gas expansion/compression stages with moving piston
- Example for Neuron: Show action potential propagating along axon
- Example for Algorithm: Show data moving through operations step-by-step

Must include: Animation, arrows showing flow, step indicators, before/after states

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 3: MATHEMATICAL/ANALYTICAL - "What are the numbers/relationships?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Focus: Equations, graphs, plots, quantitative relationships
- Show GRAPHS, EQUATIONS, or DATA PLOTS
- Use coordinate systems, axes, curves
- Display mathematical formulas with LaTeX
- Example for Carnot: P-V diagram showing isothermal/adiabatic curves
- Example for Neuron: Voltage-time graph of action potential with numbers
- Example for Algorithm: Time complexity graph or performance comparison chart

Must include: Axes/grid, equations/formulas, numerical values, curves/plots

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 4: CONTEXT/APPLICATION - "Why does it matter? Where is it used?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Focus: Real-world examples, applications, comparisons, implications
- Show PRACTICAL USAGE or COMPARISON
- Connect to everyday examples or broader context
- Can show efficiency, performance, or trade-offs
- Example for Carnot: Compare efficiency of Carnot vs real engines with bar chart
- Example for Neuron: Show different neuron types or synaptic transmission in brain
- Example for Algorithm: Show use case scenario or comparison with alternative approaches

Must include: Real-world example, comparison elements, context labels, practical implications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 VALIDATION CHECKLIST (ALL 4 VISUALS MUST PASS):
□ Visual 1 shows structure/components (NOT process or graphs)
□ Visual 2 shows dynamic mechanism (NOT static structure)
□ Visual 3 shows mathematical/quantitative data (NOT just diagrams)
□ Visual 4 shows context/application (NOT repeating earlier visuals)
□ Each visual has UNIQUE content (no overlap > 20%)
□ Together they give COMPLETE understanding of "${topic}"

Output ONLY valid JSON (no markdown, no explanations):
{
  "visualScripts": [
    {
      "type": "structure",
      "title": "Specific title for structure visual",
      "description": "Detailed description of what to show: components, labels, layout, relationships",
      "focus": "What specific structural aspect this emphasizes",
      "mustInclude": ["list", "of", "required", "elements"]
    },
    {
      "type": "mechanism",
      "title": "Specific title for mechanism visual",
      "description": "Detailed description of process flow: steps, transformations, animations",
      "focus": "What specific process/mechanism this demonstrates",
      "mustInclude": ["list", "of", "required", "elements"]
    },
    {
      "type": "analysis",
      "title": "Specific title for analytical visual",
      "description": "Detailed description of graphs/equations: axes, formulas, numerical relationships",
      "focus": "What specific quantitative relationship this reveals",
      "mustInclude": ["list", "of", "required", "elements"]
    },
    {
      "type": "context",
      "title": "Specific title for context visual",
      "description": "Detailed description of application/comparison: real examples, use cases, implications",
      "focus": "What specific practical context this provides",
      "mustInclude": ["list", "of", "required", "elements"]
    }
  ]
}`;
}
export async function subPlannerAgent(step, topic) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error('[subPlanner] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                temperature: 0.8, // Increased for more creative diversity
                maxOutputTokens: 6000, // More space for detailed descriptions
                topK: 50,
                topP: 0.95
            },
            systemInstruction: 'You are a JSON-only visual planning agent specializing in creating DIVERSE, COMPLEMENTARY visualizations. Each visual MUST cover a distinct aspect. Output ONLY valid JSON. Never include explanations, markdown, or text outside JSON.'
        });
        const prompt = createSubPlanPrompt(step, topic);
        logger.debug(`[subPlanner] Planning 4 DIVERSE visuals for step ${step.id}: ${topic}`);
        const generationPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SubPlanner timeout')), TIMEOUT_MS));
        const result = await Promise.race([generationPromise, timeoutPromise]);
        if (!(result === null || result === void 0 ? void 0 : result.response)) {
            throw new Error('No response from API');
        }
        let text = result.response.text();
        // Clean markdown wrappers
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Parse JSON
        const parsed = JSON.parse(text);
        if (!parsed.visualScripts || !Array.isArray(parsed.visualScripts)) {
            throw new Error('Invalid sub-plan structure');
        }
        // Ensure exactly 4 visuals
        if (parsed.visualScripts.length < 4) {
            logger.warn(`[subPlanner] Only ${parsed.visualScripts.length} visuals planned, expected 4`);
            // Pad with default visuals following the diversity framework
            const defaults = [
                { type: 'structure', title: 'Component Structure', description: `Show the key components of ${topic}`, focus: 'Structural overview', mustInclude: ['labels', 'components'] },
                { type: 'mechanism', title: 'Process Flow', description: `Animate how ${topic} works`, focus: 'Dynamic behavior', mustInclude: ['animation', 'flow'] },
                { type: 'analysis', title: 'Quantitative Analysis', description: `Graph or equation for ${topic}`, focus: 'Mathematical relationships', mustInclude: ['graph', 'equation'] },
                { type: 'context', title: 'Real-World Application', description: `Show practical use of ${topic}`, focus: 'Applications', mustInclude: ['example', 'comparison'] }
            ];
            while (parsed.visualScripts.length < 4) {
                const idx = parsed.visualScripts.length;
                parsed.visualScripts.push(defaults[idx]);
            }
        }
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`[subPlanner] ✅ Generated 4 DIVERSE visual scripts in ${genTime}s for step ${step.id}`);
        // Log the visual types to verify diversity
        const types = parsed.visualScripts.map((s) => s.type).join(', ');
        const titles = parsed.visualScripts.map((s) => s.title).join(' | ');
        logger.info(`[subPlanner] 📊 Visual types: ${types}`);
        logger.info(`[subPlanner] 🎯 Visual titles: ${titles}`);
        return {
            stepId: step.id,
            visualScripts: parsed.visualScripts.slice(0, 4) // Take first 4
        };
    }
    catch (error) {
        logger.error(`[subPlanner] Failed: ${error.message}`);
        return null;
    }
}
