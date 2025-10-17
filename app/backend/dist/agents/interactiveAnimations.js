"use strict";
/**
 * INTERACTIVE ANIMATIONS LIBRARY (SIMPLIFIED)
 * Adds engaging animations to make learning fun
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInteractiveAnimations = addInteractiveAnimations;
/**
 * Add interactive animations to any step
 * Enhances engagement with pointing, clicking, and highlighting
 */
function addInteractiveAnimations(operations, topic) {
    const enhanced = [...operations];
    // Only add animations if we have enough content
    if (operations.length > 30) {
        // Add pointing animation (using customPath for hand)
        enhanced.push({
            op: 'customPath',
            path: 'M 0.1,0.5 L 0.12,0.48 L 0.13,0.485 L 0.125,0.52 L 0.115,0.525 Z',
            fill: '#FDB813'
        });
        // Add click effect particles
        enhanced.push({
            op: 'particle',
            x: 0.5,
            y: 0.5,
            count: 8,
            spread: 0.05,
            speed: 0.02,
            color: '#FFD700',
            lifetime: 500
        });
        // Add pulsing highlight rectangle
        enhanced.push({
            op: 'drawRect',
            x: 0.5,
            y: 0.4,
            width: 0.3,
            height: 0.2,
            fill: 'rgba(255, 235, 59, 0.2)'
        });
        // Add attention arrow
        enhanced.push({
            op: 'drawLine',
            x1: 0.2,
            y1: 0.3,
            x2: 0.5,
            y2: 0.5,
            color: '#E74C3C',
            width: 3
        });
        // Add wave animation for engagement
        enhanced.push({
            op: 'wave',
            x: 0.8,
            y: 0.3,
            amplitude: 0.02,
            frequency: 3,
            color: '#3498db'
        });
        // Add orbiting elements for visual interest
        enhanced.push({
            op: 'orbit',
            x: 0.7,
            y: 0.7,
            radius: 0.05,
            period: 2,
            color: '#9C27B0'
        });
    }
    return enhanced;
}
//# sourceMappingURL=interactiveAnimations.js.map