"use strict";
/**
 * SUB-PLANNER AGENT - ENFORCES DIVERSE VISUAL ASPECTS
 *
 * Generates 4 COMPLEMENTARY visual descriptions for a single step
 * Each visual MUST cover a DIFFERENT aspect to avoid repetition
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subPlannerAgent = subPlannerAgent;
var generative_ai_1 = require("@google/generative-ai");
var logger_1 = require("../logger");
var MODEL = 'gemini-2.5-flash';
var TIMEOUT_MS = 40000;
function createSubPlanPrompt(step, topic) {
    return "You are planning 4 COMPLEMENTARY SVG visualizations for this learning step.\n\nTOPIC: \"".concat(topic, "\"\nSTEP: ").concat(step.desc, "\n\n\u26A0\uFE0F CRITICAL: Each visual MUST show a DIFFERENT aspect. NO REPETITION!\n\nGenerate 4 visual scripts following this STRICT diversity framework:\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nVISUAL 1: STRUCTURE/ANATOMY - \"What does it look like?\"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nFocus: Physical structure, components, layout, architecture\n- Show the COMPONENTS and their RELATIONSHIPS\n- Label all parts with their names/functions\n- Use static or minimal animation\n- Example for Carnot: 4 connected reservoirs in cycle diagram\n- Example for Neuron: Dendrites, soma, axon, synapses labeled\n- Example for Algorithm: Flowchart blocks with data structures\n\nMust include: Labels, arrows showing connections, component names\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nVISUAL 2: MECHANISM/PROCESS - \"How does it work?\"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nFocus: Step-by-step process, transformation, dynamic behavior\n- Show MOTION and TRANSFORMATION over time\n- Animate the process from start to end\n- Include time labels or step numbers\n- Example for Carnot: Show gas expansion/compression stages with moving piston\n- Example for Neuron: Show action potential propagating along axon\n- Example for Algorithm: Show data moving through operations step-by-step\n\nMust include: Animation, arrows showing flow, step indicators, before/after states\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nVISUAL 3: MATHEMATICAL/ANALYTICAL - \"What are the numbers/relationships?\"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nFocus: Equations, graphs, plots, quantitative relationships\n- Show GRAPHS, EQUATIONS, or DATA PLOTS\n- Use coordinate systems, axes, curves\n- Display mathematical formulas with LaTeX\n- Example for Carnot: P-V diagram showing isothermal/adiabatic curves\n- Example for Neuron: Voltage-time graph of action potential with numbers\n- Example for Algorithm: Time complexity graph or performance comparison chart\n\nMust include: Axes/grid, equations/formulas, numerical values, curves/plots\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nVISUAL 4: CONTEXT/APPLICATION - \"Why does it matter? Where is it used?\"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nFocus: Real-world examples, applications, comparisons, implications\n- Show PRACTICAL USAGE or COMPARISON\n- Connect to everyday examples or broader context\n- Can show efficiency, performance, or trade-offs\n- Example for Carnot: Compare efficiency of Carnot vs real engines with bar chart\n- Example for Neuron: Show different neuron types or synaptic transmission in brain\n- Example for Algorithm: Show use case scenario or comparison with alternative approaches\n\nMust include: Real-world example, comparison elements, context labels, practical implications\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n\uD83D\uDEA8 VALIDATION CHECKLIST (ALL 4 VISUALS MUST PASS):\n\u25A1 Visual 1 shows structure/components (NOT process or graphs)\n\u25A1 Visual 2 shows dynamic mechanism (NOT static structure)\n\u25A1 Visual 3 shows mathematical/quantitative data (NOT just diagrams)\n\u25A1 Visual 4 shows context/application (NOT repeating earlier visuals)\n\u25A1 Each visual has UNIQUE content (no overlap > 20%)\n\u25A1 Together they give COMPLETE understanding of \"").concat(topic, "\"\n\nOutput ONLY valid JSON (no markdown, no explanations):\n{\n  \"visualScripts\": [\n    {\n      \"type\": \"structure\",\n      \"title\": \"Specific title for structure visual\",\n      \"description\": \"Detailed description of what to show: components, labels, layout, relationships\",\n      \"focus\": \"What specific structural aspect this emphasizes\",\n      \"mustInclude\": [\"list\", \"of\", \"required\", \"elements\"]\n    },\n    {\n      \"type\": \"mechanism\",\n      \"title\": \"Specific title for mechanism visual\",\n      \"description\": \"Detailed description of process flow: steps, transformations, animations\",\n      \"focus\": \"What specific process/mechanism this demonstrates\",\n      \"mustInclude\": [\"list\", \"of\", \"required\", \"elements\"]\n    },\n    {\n      \"type\": \"analysis\",\n      \"title\": \"Specific title for analytical visual\",\n      \"description\": \"Detailed description of graphs/equations: axes, formulas, numerical relationships\",\n      \"focus\": \"What specific quantitative relationship this reveals\",\n      \"mustInclude\": [\"list\", \"of\", \"required\", \"elements\"]\n    },\n    {\n      \"type\": \"context\",\n      \"title\": \"Specific title for context visual\",\n      \"description\": \"Detailed description of application/comparison: real examples, use cases, implications\",\n      \"focus\": \"What specific practical context this provides\",\n      \"mustInclude\": [\"list\", \"of\", \"required\", \"elements\"]\n    }\n  ]\n}");
}
function subPlannerAgent(step, topic) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, startTime, genAI, model, prompt_1, generationPromise, timeoutPromise, result, text, parsed, defaults, idx, genTime, types, titles, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                        logger_1.logger.error('[subPlanner] GEMINI_API_KEY not set');
                        return [2 /*return*/, null];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    startTime = Date.now();
                    genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
                    model = genAI.getGenerativeModel({
                        model: MODEL,
                        generationConfig: {
                            temperature: 0.8, // Increased for more creative diversity
                            maxOutputTokens: 6000, // More space for detailed descriptions
                            topK: 50,
                            topP: 0.95
                        },
                        systemInstruction: 'You are a JSON-only visual planning agent specializing in creating DIVERSE, COMPLEMENTARY visualizations. Each visual MUST cover a distinct aspect. Output ONLY valid JSON. Never include explanations, markdown, or text outside JSON.'
                    });
                    prompt_1 = createSubPlanPrompt(step, topic);
                    logger_1.logger.debug("[subPlanner] Planning 4 DIVERSE visuals for step ".concat(step.id, ": ").concat(topic));
                    generationPromise = model.generateContent(prompt_1);
                    timeoutPromise = new Promise(function (_, reject) {
                        return setTimeout(function () { return reject(new Error('SubPlanner timeout')); }, TIMEOUT_MS);
                    });
                    return [4 /*yield*/, Promise.race([generationPromise, timeoutPromise])];
                case 2:
                    result = _a.sent();
                    if (!(result === null || result === void 0 ? void 0 : result.response)) {
                        throw new Error('No response from API');
                    }
                    text = result.response.text();
                    // Clean markdown wrappers
                    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    parsed = JSON.parse(text);
                    if (!parsed.visualScripts || !Array.isArray(parsed.visualScripts)) {
                        throw new Error('Invalid sub-plan structure');
                    }
                    // Ensure exactly 4 visuals
                    if (parsed.visualScripts.length < 4) {
                        logger_1.logger.warn("[subPlanner] Only ".concat(parsed.visualScripts.length, " visuals planned, expected 4"));
                        defaults = [
                            { type: 'structure', title: 'Component Structure', description: "Show the key components of ".concat(topic), focus: 'Structural overview', mustInclude: ['labels', 'components'] },
                            { type: 'mechanism', title: 'Process Flow', description: "Animate how ".concat(topic, " works"), focus: 'Dynamic behavior', mustInclude: ['animation', 'flow'] },
                            { type: 'analysis', title: 'Quantitative Analysis', description: "Graph or equation for ".concat(topic), focus: 'Mathematical relationships', mustInclude: ['graph', 'equation'] },
                            { type: 'context', title: 'Real-World Application', description: "Show practical use of ".concat(topic), focus: 'Applications', mustInclude: ['example', 'comparison'] }
                        ];
                        while (parsed.visualScripts.length < 4) {
                            idx = parsed.visualScripts.length;
                            parsed.visualScripts.push(defaults[idx]);
                        }
                    }
                    genTime = ((Date.now() - startTime) / 1000).toFixed(2);
                    logger_1.logger.info("[subPlanner] \u2705 Generated 4 DIVERSE visual scripts in ".concat(genTime, "s for step ").concat(step.id));
                    types = parsed.visualScripts.map(function (s) { return s.type; }).join(', ');
                    titles = parsed.visualScripts.map(function (s) { return s.title; }).join(' | ');
                    logger_1.logger.info("[subPlanner] \uD83D\uDCCA Visual types: ".concat(types));
                    logger_1.logger.info("[subPlanner] \uD83C\uDFAF Visual titles: ".concat(titles));
                    return [2 /*return*/, {
                            stepId: step.id,
                            visualScripts: parsed.visualScripts.slice(0, 4) // Take first 4
                        }];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error("[subPlanner] Failed: ".concat(error_1.message));
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
