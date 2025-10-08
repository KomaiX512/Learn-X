"use strict";
/**
 * OPERATION EXPANDER - Intelligently add visuals to reach 50-70 operations
 *
 * Problem: Gemini generates 27-33 operations (below target)
 * Solution: Identify gaps and add complementary visuals
 * Result: Achieve 50-70 operations without overwhelming Gemini
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandOperations = expandOperations;
exports.needsExpansion = needsExpansion;
const logger_1 = require("../logger");
const MIN_OPS = 65;
const MAX_OPS = 85;
const TARGET_OPS = 72;
/**
 * Identify visual gaps and opportunities for expansion
 */
function identifyExpansionOpportunities(actions) {
    const opportunities = [];
    // Find sections (labels with ① ② ③ symbols)
    const sections = actions.filter(a => a.op === 'drawLabel' &&
        a.text?.match(/^[①②③④⑤]/));
    // For each section, check if it has enough visuals
    sections.forEach((section, idx) => {
        const sectionLabel = section.text || '';
        const sectionY = section.y || 0.5;
        const sectionX = section.x || 0.5;
        // Find operations near this section (within 0.3 vertical distance)
        const nearbyOps = actions.filter(a => {
            if (!('y' in a))
                return false;
            const y = a.y;
            return Math.abs(y - sectionY) < 0.3;
        });
        // Count visuals vs labels in this section
        const visuals = nearbyOps.filter(a => !['drawLabel', 'drawTitle', 'delay'].includes(a.op)).length;
        const labels = nearbyOps.filter(a => a.op === 'drawLabel' && !a.text?.match(/^[①②③④⑤]/)).length;
        // If section has more labels than visuals, add visual opportunities
        if (labels > visuals) {
            const gap = labels - visuals;
            for (let i = 0; i < Math.min(gap, 3); i++) {
                opportunities.push({
                    type: 'complement_label',
                    position: {
                        x: sectionX + (i * 0.1),
                        y: sectionY + 0.15
                    },
                    context: sectionLabel.replace(/^[①②③④⑤]\s*/, '')
                });
            }
        }
    });
    return opportunities;
}
/**
 * Detect topic domain from context to add appropriate V2 tools
 */
function detectDomain(context, allActions) {
    const ctx = context.toLowerCase();
    const allText = allActions
        .filter(a => 'text' in a || 'label' in a)
        .map(a => (a.text || a.label || '').toLowerCase())
        .join(' ');
    if (ctx.includes('circuit') || ctx.includes('electrical') || ctx.includes('voltage') ||
        allText.includes('resistor') || allText.includes('capacitor') || allText.includes('transistor')) {
        return 'electrical';
    }
    if (ctx.includes('molecule') || ctx.includes('atom') || ctx.includes('chemical') ||
        allText.includes('bond') || allText.includes('reaction') || allText.includes('chemistry')) {
        return 'chemistry';
    }
    if (ctx.includes('cell') || ctx.includes('biology') || ctx.includes('organ') ||
        allText.includes('membrane') || allText.includes('protein') || allText.includes('dna')) {
        return 'biology';
    }
    if (ctx.includes('array') || ctx.includes('tree') || ctx.includes('algorithm') || ctx.includes('data structure') ||
        allText.includes('node') || allText.includes('pointer') || allText.includes('stack')) {
        return 'cs';
    }
    if (ctx.includes('force') || ctx.includes('mass') || ctx.includes('physics') ||
        allText.includes('velocity') || allText.includes('acceleration') || allText.includes('energy')) {
        return 'physics';
    }
    if (ctx.includes('function') || ctx.includes('equation') || ctx.includes('graph') ||
        allText.includes('coordinate') || allText.includes('axis') || allText.includes('plot')) {
        return 'math';
    }
    return 'generic';
}
/**
 * Generate complementary V2 DOMAIN TOOLS (not generic shapes)
 * This RAISES V2 ratio instead of lowering it
 */
function generateComplementaryVisuals(opportunities, currentOps, targetOps, allActions = []) {
    const additions = [];
    const needed = Math.min(targetOps - currentOps, opportunities.length * 2);
    opportunities.slice(0, Math.ceil(needed / 2)).forEach((opp, idx) => {
        const { x, y } = opp.position;
        const context = opp.context;
        const domain = detectDomain(context, allActions);
        // Add V2 DOMAIN TOOLS based on detected domain
        if (domain === 'electrical') {
            additions.push({
                op: 'drawCircuitElement',
                type: 'resistor',
                x: x,
                y: y,
                value: '1kΩ',
                label: 'R' + (idx + 1)
            });
            additions.push({
                op: 'drawSignalWaveform',
                type: 'sine',
                x: x + 0.15,
                y: y,
                width: 0.1,
                height: 0.05,
                frequency: 2
            });
        }
        else if (domain === 'chemistry') {
            additions.push({
                op: 'drawMolecule',
                type: 'atom',
                x: x,
                y: y,
                atomicNumber: 6 + idx,
                electrons: true
            });
            additions.push({
                op: 'orbit',
                centerX: x,
                centerY: y,
                radius: 0.05,
                period: 3000,
                objectRadius: 0.01,
                color: '#3498db',
                trail: true
            });
        }
        else if (domain === 'biology') {
            additions.push({
                op: 'drawCellStructure',
                type: 'organelle',
                x: x,
                y: y,
                organelleType: 'mitochondria',
                size: 0.06
            });
            additions.push({
                op: 'particle',
                center: [x, y], // FIXED: Frontend expects 'center', not 'source/target'
                count: 15,
                spread: 0.05,
                speed: 1.5,
                lifetime: 2000,
                color: '#27ae60'
            });
        }
        else if (domain === 'cs') {
            additions.push({
                op: 'drawDataStructure',
                type: 'node',
                x: x,
                y: y,
                value: idx + 1,
                size: 0.05
            });
            additions.push({
                op: 'drawConnection',
                from: [x, y],
                to: [x + 0.1, y],
                type: 'arrow',
                color: '#e74c3c',
                strokeWidth: 2,
                showArrow: true
            });
        }
        else if (domain === 'physics') {
            additions.push({
                op: 'drawPhysicsObject',
                type: 'mass',
                x: x,
                y: y,
                mass: 2,
                size: 0.05
            });
            additions.push({
                op: 'wave',
                startX: x - 0.1,
                startY: y,
                width: 0.2,
                amplitude: 0.03,
                frequency: 2,
                speed: 1,
                color: '#f39c12'
            });
        }
        else if (domain === 'math') {
            additions.push({
                op: 'drawMathShape',
                type: 'polygon',
                x: x,
                y: y,
                sides: 5,
                radius: 0.04,
                fill: '#9b59b6',
                stroke: '#8e44ad'
            });
            additions.push({
                op: 'drawVector',
                x: x,
                y: y,
                dx: 0.08,
                dy: 0,
                color: '#27ae60',
                strokeWidth: 2
            });
        }
        else {
            // NO GENERIC FALLBACK ANIMATIONS - Let LLM handle animations contextually
            // Instead, add domain-neutral structural elements
            additions.push({
                op: 'drawLabel',
                text: '•',
                x: x,
                y: y,
                fontSize: 12,
                color: '#3498db',
                avoidOverlap: true
            });
        }
    });
    return additions.slice(0, needed);
}
/**
 * Intelligently merge new operations into existing flow
 */
function intelligentMerge(original, additions) {
    if (additions.length === 0)
        return original;
    const merged = [];
    let additionIdx = 0;
    // Find delays and insert additions before them
    for (let i = 0; i < original.length; i++) {
        merged.push(original[i]);
        // After each delay, insert some additions if available
        if (original[i].op === 'delay' && additionIdx < additions.length) {
            const toInsert = additions.slice(additionIdx, additionIdx + 2);
            merged.push(...toInsert);
            additionIdx += toInsert.length;
        }
    }
    // If we still have additions left, add them before the last delay
    if (additionIdx < additions.length) {
        // Find last delay manually (findLastIndex not available in ES2022)
        let lastDelayIdx = -1;
        for (let i = merged.length - 1; i >= 0; i--) {
            if (merged[i].op === 'delay') {
                lastDelayIdx = i;
                break;
            }
        }
        if (lastDelayIdx >= 0) {
            merged.splice(lastDelayIdx, 0, ...additions.slice(additionIdx));
        }
        else {
            merged.push(...additions.slice(additionIdx));
        }
    }
    return merged;
}
/**
 * Main expansion function
 */
function expandOperations(actions, targetRange = { min: MIN_OPS, max: MAX_OPS }) {
    const currentCount = actions.length;
    // Already in target range
    if (currentCount >= targetRange.min && currentCount <= targetRange.max) {
        logger_1.logger.info(`[expander] Operations already in range: ${currentCount}`);
        return actions;
    }
    // Too many operations (trim later if needed)
    if (currentCount > targetRange.max) {
        logger_1.logger.warn(`[expander] Too many operations: ${currentCount} (max ${targetRange.max})`);
        return actions;
    }
    // Need to expand
    const target = TARGET_OPS;
    const needed = target - currentCount;
    logger_1.logger.info(`[expander] Expanding from ${currentCount} to ~${target} operations (+${needed})`);
    // Identify opportunities
    const opportunities = identifyExpansionOpportunities(actions);
    logger_1.logger.info(`[expander] Found ${opportunities.length} expansion opportunities`);
    // Generate additions
    const additions = generateComplementaryVisuals(opportunities, currentCount, target);
    logger_1.logger.info(`[expander] Generated ${additions.length} additional operations`);
    // Merge intelligently
    const expanded = intelligentMerge(actions, additions);
    logger_1.logger.info(`[expander] Final count: ${currentCount} → ${expanded.length} operations`);
    return expanded;
}
/**
 * Check if operations need expansion
 */
function needsExpansion(actions) {
    return actions.length < MIN_OPS;
}
