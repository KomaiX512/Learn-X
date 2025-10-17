"use strict";
/**
 * GENERIC TO V2 CONVERTER - Upgrade generic shapes to domain-specific tools
 *
 * Problem: Gemini uses 77% generic operations (drawCircle, drawRect)
 * Solution: Intelligently convert generic shapes to domain-specific V2 tools
 * Result: Achieve 60-70% V2 operations without complexity in prompt
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertGenericToV2 = convertGenericToV2;
exports.calculateV2Percentage = calculateV2Percentage;
const logger_1 = require("../logger");
/**
 * Detect domain from topic keywords
 */
function detectDomain(topic) {
    const lower = topic.toLowerCase();
    const domains = [];
    if (lower.match(/circuit|voltage|current|resistor|capacitor|transistor|amplifier|op[-\s]?amp/)) {
        domains.push('electrical');
    }
    if (lower.match(/force|velocity|acceleration|momentum|energy|friction|gravity|newton/)) {
        domains.push('physics');
    }
    if (lower.match(/cell|neuron|organ|dna|protein|biology|anatomy|heart|brain/)) {
        domains.push('biology');
    }
    if (lower.match(/molecule|atom|reaction|bond|chemistry|chemical|compound/)) {
        domains.push('chemistry');
    }
    if (lower.match(/function|derivative|integral|equation|graph|calculus|algebra|geometry/)) {
        domains.push('math');
    }
    if (lower.match(/neural|network|algorithm|data structure|tree|graph|array|node|ai|machine learning|backprop/)) {
        domains.push('cs');
    }
    return domains.length > 0 ? domains : ['general'];
}
/**
 * Analyze context around an operation to determine what it represents
 */
function analyzeContext(action, idx, allActions, domains) {
    // Look at nearby labels for context
    const nearbyLabels = [];
    for (let i = Math.max(0, idx - 3); i < Math.min(allActions.length, idx + 3); i++) {
        const a = allActions[i];
        if (a.op === 'drawLabel' && a.text) {
            nearbyLabels.push(a.text.toLowerCase());
        }
    }
    const contextText = nearbyLabels.join(' ');
    // Detect role based on context and domains
    if (domains.includes('cs')) {
        if (contextText.match(/neuron|node|unit|layer|network/)) {
            return { role: 'neuron', context: contextText };
        }
        if (contextText.match(/weight|connection|synapse|edge/)) {
            return { role: 'connection', context: contextText };
        }
        if (contextText.match(/activation|output|signal/)) {
            return { role: 'activation', context: contextText };
        }
    }
    if (domains.includes('electrical')) {
        if (contextText.match(/resistor|resistance/)) {
            return { role: 'resistor', context: contextText };
        }
        if (contextText.match(/capacitor/)) {
            return { role: 'capacitor', context: contextText };
        }
        if (contextText.match(/op[-\s]?amp|amplifier/)) {
            return { role: 'op_amp', context: contextText };
        }
        if (contextText.match(/wire|connection|circuit/)) {
            return { role: 'wire', context: contextText };
        }
    }
    if (domains.includes('physics')) {
        if (contextText.match(/force|push|pull/)) {
            return { role: 'force', context: contextText };
        }
        if (contextText.match(/object|mass|body|block/)) {
            return { role: 'object', context: contextText };
        }
        if (contextText.match(/trajectory|path|motion/)) {
            return { role: 'trajectory', context: contextText };
        }
    }
    return { role: 'generic', context: contextText };
}
/**
 * Convert drawCircle to domain-specific operation
 */
function convertCircle(action, role, domains) {
    const circle = action;
    // CS domain: neuron/node
    if (domains.includes('cs') && role === 'neuron') {
        return {
            op: 'drawNeuron',
            x: circle.x,
            y: circle.y,
            radius: circle.radius || 0.04,
            activation: 0.7,
            label: circle.label || '',
            color: circle.fill || '#3498db',
            showValue: true
        };
    }
    // Physics domain: object
    if (domains.includes('physics') && role === 'object') {
        return {
            op: 'drawPhysicsObject',
            shape: 'circle',
            x: circle.x,
            y: circle.y,
            radius: circle.radius || 0.04,
            mass: 5,
            label: circle.label || '',
            color: circle.fill || '#e74c3c'
        };
    }
    // Chemistry domain: atom
    if (domains.includes('chemistry')) {
        return {
            op: 'drawAtom',
            x: circle.x,
            y: circle.y,
            radius: circle.radius || 0.04,
            element: 'C',
            showElectrons: false,
            color: circle.fill || '#9b59b6'
        };
    }
    return null;
}
/**
 * Convert drawRect to domain-specific operation
 */
function convertRect(action, role, domains) {
    const rect = action;
    const centerX = rect.x + (rect.width || 0.1) / 2;
    const centerY = rect.y + (rect.height || 0.08) / 2;
    // CS domain: data structure
    if (domains.includes('cs')) {
        return {
            op: 'drawDataStructure',
            type: 'node',
            x: centerX,
            y: centerY,
            width: rect.width || 0.1,
            height: rect.height || 0.08,
            value: '',
            color: rect.fill || '#3498db'
        };
    }
    // Electrical domain: circuit element
    if (domains.includes('electrical') && role === 'resistor') {
        return {
            op: 'drawCircuitElement',
            type: 'resistor',
            x: centerX,
            y: centerY,
            rotation: 0,
            label: '',
            value: ''
        };
    }
    // Physics domain: object
    if (domains.includes('physics')) {
        return {
            op: 'drawPhysicsObject',
            shape: 'box',
            x: centerX,
            y: centerY,
            width: rect.width || 0.1,
            height: rect.height || 0.08,
            mass: 10,
            label: rect.label || '',
            color: rect.fill || '#e74c3c'
        };
    }
    return null;
}
/**
 * Convert drawVector/drawLine to domain-specific operation
 */
function convertVector(action, role, domains) {
    const vec = action;
    // Physics domain: force vector
    if (domains.includes('physics') && role === 'force') {
        return {
            op: 'drawForceVector',
            x: vec.x || 0.5,
            y: vec.y || 0.5,
            dx: vec.dx || 0.1,
            dy: vec.dy || 0,
            magnitude: Math.sqrt((vec.dx || 0.1) ** 2 + (vec.dy || 0) ** 2) * 50,
            label: vec.label || 'F',
            color: vec.color || '#e74c3c'
        };
    }
    // Electrical domain: connection
    if (domains.includes('electrical') && role === 'wire') {
        return {
            op: 'drawConnection',
            from: [vec.x, vec.y],
            to: [vec.x + (vec.dx || 0.1), vec.y + (vec.dy || 0)],
            type: 'wire',
            color: vec.color || '#34495e',
            strokeWidth: 2,
            showArrow: false
        };
    }
    // CS domain: connection between nodes
    if (domains.includes('cs') && role === 'connection') {
        return {
            op: 'drawConnection',
            from: [vec.x, vec.y],
            to: [vec.x + (vec.dx || 0.1), vec.y + (vec.dy || 0)],
            type: 'arrow',
            color: vec.color || '#27ae60',
            strokeWidth: 2,
            showArrow: true,
            weight: 0.5
        };
    }
    return null;
}
/**
 * Main conversion function
 */
function convertGenericToV2(actions, topic) {
    const domains = detectDomain(topic);
    logger_1.logger.info(`[converter] Detected domains: ${domains.join(', ')}`);
    let converted = 0;
    const result = actions.map((action, idx) => {
        // Skip if already V2 operation
        if (action.op.startsWith('draw') && action.op.length > 10) {
            return action;
        }
        const { role, context } = analyzeContext(action, idx, actions, domains);
        let v2Action = null;
        switch (action.op) {
            case 'drawCircle':
                v2Action = convertCircle(action, role, domains);
                break;
            case 'drawRect':
                v2Action = convertRect(action, role, domains);
                break;
            case 'drawVector':
            case 'drawLine':
                v2Action = convertVector(action, role, domains);
                break;
        }
        if (v2Action) {
            converted++;
            logger_1.logger.debug(`[converter] ${action.op} → ${v2Action.op} (role: ${role})`);
            return v2Action;
        }
        return action;
    });
    const v2Before = actions.filter(a => !['drawCircle', 'drawRect', 'drawVector', 'drawLine', 'drawLabel', 'drawTitle', 'delay'].includes(a.op)).length;
    const v2After = result.filter(a => !['drawCircle', 'drawRect', 'drawVector', 'drawLine', 'drawLabel', 'drawTitle', 'delay'].includes(a.op)).length;
    const percentBefore = Math.round((v2Before / actions.length) * 100);
    const percentAfter = Math.round((v2After / result.length) * 100);
    logger_1.logger.info(`[converter] Converted ${converted} operations`);
    logger_1.logger.info(`[converter] V2 ratio: ${percentBefore}% → ${percentAfter}%`);
    return result;
}
/**
 * Calculate V2 operation percentage
 */
function calculateV2Percentage(actions) {
    const v2Ops = actions.filter(a => !['drawCircle', 'drawRect', 'drawVector', 'drawLine', 'drawLabel', 'drawTitle', 'delay'].includes(a.op)).length;
    return actions.length > 0 ? Math.round((v2Ops / actions.length) * 100) : 0;
}
//# sourceMappingURL=genericToV2Converter.js.map