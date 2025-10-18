/**
 * SUB-PLANNER AGENT - ENFORCES DIVERSE VISUAL ASPECTS
 *
 * Generates 4 COMPLEMENTARY visual descriptions for a single step
 * Each visual MUST cover a DIFFERENT aspect to avoid repetition
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PlanStep } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 40000;

export interface VisualScript {
  type: 'structure' | 'mechanism' | 'analysis' | 'context';
  title: string;
  description: string;
  focus: string;
  mustInclude: string[];
}

export interface SubPlan {
  stepId: number;
  visualScripts: VisualScript[];
}

function createSubPlanPrompt(step: PlanStep, topic: string): string {
  return `You are planning 4 COMPLEMENTARY SVG visualizations for this learning step.

TOPIC: "${topic}"
STEP: ${step.desc}

⚠️ CRITICAL REQUIREMENTS:
1. Each visual MUST focus on ONE DISTINCT aspect - NO REPETITION
2. Descriptions MUST be 2-3 lines MAXIMUM - compact, to-the-point, NO verbose explanations
3. Each description should be laser-focused on what to show, not why or how

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 1: STRUCTURE - Show components and their spatial relationships
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Carnot: 4-reservoir cycle with hot/cold sources, piston-cylinder system
✓ Neuron: Dendrites→soma→axon→synapses with ion channels marked
✓ Algorithm: Flowchart blocks showing input→process→output flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 2: MECHANISM - Animate the core process/transformation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Carnot: Animate piston through 4 stages (isothermal expansion→adiabatic expansion→compression)
✓ Neuron: Animate Na⁺/K⁺ ion flow creating action potential wave
✓ Algorithm: Animate data elements moving through each operation step

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 3: MATHEMATICAL - Graph or equation showing quantitative relationships
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Carnot: P-V diagram with 4 curves (2 isothermal, 2 adiabatic) and efficiency η=1-Tc/Th
✓ Neuron: Voltage vs time graph showing -70mV→+40mV spike with threshold line
✓ Algorithm: Time complexity graph O(n²) vs O(n log n) curves

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL 4: APPLICATION - Real-world example or comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Carnot: Bar chart comparing Carnot (100%) vs real engine efficiency (30-40%)
✓ Neuron: Show motor vs sensory vs interneuron types in spinal reflex arc
✓ Algorithm: Side-by-side comparison with alternative approach showing trade-offs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DESCRIPTION FORMAT RULES:
- MAX 2-3 short sentences (under 200 characters total)
- Start with action verb: "Show...", "Animate...", "Graph...", "Compare..."
- Be specific about what to include (components, values, labels)
- NO explanations of why - just WHAT to visualize
- NO verbose storytelling - pure visual instructions

Output ONLY valid JSON (no markdown, no explanations):
{
  "visualScripts": [
    {
      "type": "structure",
      "title": "Concise title (max 5 words)",
      "description": "2-3 line compact description of WHAT to show. No verbose explanation.",
      "focus": "One specific aspect (1 short phrase)",
      "mustInclude": ["specific", "elements", "to", "include"]
    },
    {
      "type": "mechanism",
      "title": "Concise title (max 5 words)",
      "description": "2-3 line compact description of WHAT to animate. No verbose explanation.",
      "focus": "One specific process (1 short phrase)",
      "mustInclude": ["specific", "animation", "elements"]
    },
    {
      "type": "analysis",
      "title": "Concise title (max 5 words)",
      "description": "2-3 line compact description of WHAT to graph/calculate. No verbose explanation.",
      "focus": "One specific relationship (1 short phrase)",
      "mustInclude": ["axes", "equations", "values"]
    },
    {
      "type": "context",
      "title": "Concise title (max 5 words)",
      "description": "2-3 line compact description of WHAT to compare/apply. No verbose explanation.",
      "focus": "One specific application (1 short phrase)",
      "mustInclude": ["real-world", "elements"]
    }
  ]
}`;
}

export async function subPlannerAgent(step: PlanStep, topic: string): Promise<SubPlan | null> {
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
        temperature: 0.85, // High creativity for diverse aspects
        maxOutputTokens: 3000, // Reduced - we want concise descriptions
        topK: 50,
        topP: 0.95
      },
      systemInstruction: 'You are a JSON-only visual planning agent. Create 4 DIVERSE visualizations, each covering ONE DISTINCT aspect. Descriptions MUST be 2-3 lines MAX (under 200 chars) - compact, focused, no verbose explanations. Output ONLY valid JSON. No markdown, no text outside JSON.'
    });

    const prompt = createSubPlanPrompt(step, topic);
    logger.debug(`[subPlanner] Planning 4 DIVERSE visuals for step ${step.id}: ${topic}`);
    
    const generationPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('SubPlanner timeout')), TIMEOUT_MS)
    );
    
    const result = await Promise.race([generationPromise, timeoutPromise]) as any;
    
    if (!result?.response) {
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
      
      // Pad with concise default visuals following the diversity framework
      const defaults = [
        { type: 'structure', title: 'Component Structure', description: `Show key components of ${topic} with labels and spatial relationships.`, focus: 'Structural layout', mustInclude: ['labels', 'components'] },
        { type: 'mechanism', title: 'Process Animation', description: `Animate ${topic} process flow from start to end with step markers.`, focus: 'Dynamic transformation', mustInclude: ['animation', 'flow', 'steps'] },
        { type: 'analysis', title: 'Mathematical Model', description: `Graph or equation showing quantitative relationships in ${topic}.`, focus: 'Quantitative data', mustInclude: ['graph', 'equation', 'values'] },
        { type: 'context', title: 'Real-World Use', description: `Compare ${topic} applications or show practical example with trade-offs.`, focus: 'Practical applications', mustInclude: ['example', 'comparison'] }
      ];
      
      while (parsed.visualScripts.length < 4) {
        const idx = parsed.visualScripts.length;
        parsed.visualScripts.push(defaults[idx]);
      }
    }

    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[subPlanner] ✅ Generated 4 DIVERSE visual scripts in ${genTime}s for step ${step.id}`);
    
    // Log the visual types to verify diversity
    const types = parsed.visualScripts.map((s: any) => s.type).join(', ');
    const titles = parsed.visualScripts.map((s: any) => s.title).join(' | ');
    logger.info(`[subPlanner] 📊 Visual types: ${types}`);
    logger.info(`[subPlanner] 🎯 Visual titles: ${titles}`);
    
    return {
      stepId: step.id,
      visualScripts: parsed.visualScripts.slice(0, 4) // Take first 4
    };
    
  } catch (error: any) {
    logger.error(`[subPlanner] Failed: ${error.message}`);
    return null;
  }
}
