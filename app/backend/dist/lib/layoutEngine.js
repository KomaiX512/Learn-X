"use strict";
/**
 * LAYOUT ENGINE - PREVENT TEXT OVERLAP
 *
 * Uses force-directed algorithm to separate overlapping labels
 * while keeping them near their anchor points.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSITIONING_STRATEGIES = void 0;
exports.calculateTextDimensions = calculateTextDimensions;
exports.applyAntiOverlapLayout = applyAntiOverlapLayout;
exports.fixLabelOverlap = fixLabelOverlap;
const DEFAULT_CONFIG = {
    minDistance: 0.05,
    anchorStrength: 0.1,
    repulsionStrength: 0.01,
    iterations: 50,
    bounds: {
        minX: 0.05,
        maxX: 0.95,
        minY: 0.05,
        maxY: 0.95
    }
};
/**
 * Calculate bounding box for text
 */
function calculateTextDimensions(text, fontSize = 16) {
    // Approximate character width (in normalized coordinates)
    const charWidth = fontSize * 0.0006; // Adjust based on canvas size
    const lineHeight = fontSize * 0.0012;
    const lines = text.split('\n');
    const width = Math.max(...lines.map(line => line.length * charWidth));
    const height = lines.length * lineHeight;
    return { width, height };
}
/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(r1, r2, margin = 0.01) {
    return !(r1.x + r1.width + margin < r2.x ||
        r2.x + r2.width + margin < r1.x ||
        r1.y + r1.height + margin < r2.y ||
        r2.y + r2.height + margin < r1.y);
}
/**
 * Calculate repulsion force between two labels
 */
function calculateRepulsion(label1, label2, config) {
    const dx = label2.x - label1.x;
    const dy = label2.y - label1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.001) {
        // Labels at same position, push apart randomly
        return {
            fx: (Math.random() - 0.5) * config.repulsionStrength,
            fy: (Math.random() - 0.5) * config.repulsionStrength
        };
    }
    // Check if bounding boxes overlap
    const overlap = rectanglesOverlap(label1, label2, config.minDistance);
    if (overlap || distance < config.minDistance) {
        // Apply repulsion force inversely proportional to distance
        const force = config.repulsionStrength / (distance * distance);
        return {
            fx: -(dx / distance) * force,
            fy: -(dy / distance) * force
        };
    }
    return { fx: 0, fy: 0 };
}
/**
 * Calculate anchor attraction force
 */
function calculateAnchorForce(label, config) {
    if (!label.anchorX || !label.anchorY) {
        return { fx: 0, fy: 0 };
    }
    const dx = label.anchorX - label.x;
    const dy = label.anchorY - label.y;
    return {
        fx: dx * config.anchorStrength,
        fy: dy * config.anchorStrength
    };
}
/**
 * Apply layout algorithm to prevent overlap
 */
function applyAntiOverlapLayout(labels, config = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const positions = labels.map(l => ({ ...l }));
    // Iterate to resolve overlaps
    for (let iter = 0; iter < fullConfig.iterations; iter++) {
        const forces = positions.map(() => ({ fx: 0, fy: 0 }));
        // Calculate forces
        for (let i = 0; i < positions.length; i++) {
            if (positions[i].fixed)
                continue;
            // Repulsion from other labels
            for (let j = 0; j < positions.length; j++) {
                if (i !== j) {
                    const repulsion = calculateRepulsion(positions[i], positions[j], fullConfig);
                    forces[i].fx += repulsion.fx;
                    forces[i].fy += repulsion.fy;
                }
            }
            // Attraction to anchor point
            const anchor = calculateAnchorForce(positions[i], fullConfig);
            forces[i].fx += anchor.fx;
            forces[i].fy += anchor.fy;
        }
        // Apply forces
        for (let i = 0; i < positions.length; i++) {
            if (positions[i].fixed)
                continue;
            positions[i].x += forces[i].fx;
            positions[i].y += forces[i].fy;
            // Keep within bounds
            positions[i].x = Math.max(fullConfig.bounds.minX, Math.min(fullConfig.bounds.maxX - positions[i].width, positions[i].x));
            positions[i].y = Math.max(fullConfig.bounds.minY, Math.min(fullConfig.bounds.maxY - positions[i].height, positions[i].y));
        }
        // Check if layout has stabilized (early exit)
        const totalForce = forces.reduce((sum, f) => sum + Math.abs(f.fx) + Math.abs(f.fy), 0);
        if (totalForce < 0.0001) {
            break;
        }
    }
    return positions;
}
/**
 * Post-process generated actions to fix label overlap
 */
function fixLabelOverlap(actions) {
    // Extract all labels
    const labelActions = [];
    const labelIndices = [];
    actions.forEach((action, index) => {
        if (action.op === 'drawLabel' && action.avoidOverlap) {
            labelActions.push(action);
            labelIndices.push(index);
        }
    });
    if (labelActions.length === 0) {
        return actions;
    }
    // Convert to LabelPosition format
    const labels = labelActions.map((action, i) => {
        const dims = calculateTextDimensions(action.text, action.fontSize || 16);
        return {
            id: `label_${i}`,
            text: action.text,
            x: action.x,
            y: action.y,
            width: dims.width,
            height: dims.height,
            anchorX: action.connectedTo?.x || action.x,
            anchorY: action.connectedTo?.y || action.y,
            fixed: false
        };
    });
    // Apply layout
    const layouted = applyAntiOverlapLayout(labels);
    // Update actions with new positions
    const result = [...actions];
    layouted.forEach((label, i) => {
        const actionIndex = labelIndices[i];
        result[actionIndex] = {
            ...result[actionIndex],
            x: label.x,
            y: label.y
        };
    });
    return result;
}
/**
 * Smart positioning strategies for different scenarios
 */
exports.POSITIONING_STRATEGIES = {
    /**
     * Arrange labels in a grid to avoid overlap
     */
    grid(labels, columns = 3) {
        const positions = [];
        const margin = 0.05;
        const cellWidth = (1 - margin * 2) / columns;
        const cellHeight = 0.15;
        labels.forEach((label, i) => {
            const row = Math.floor(i / columns);
            const col = i % columns;
            positions.push({
                x: margin + col * cellWidth + cellWidth / 2,
                y: margin + row * cellHeight + cellHeight / 2
            });
        });
        return positions;
    },
    /**
     * Arrange in a circle around a center point
     */
    circular(count, centerX = 0.5, centerY = 0.5, radius = 0.3) {
        const positions = [];
        const angleStep = (2 * Math.PI) / count;
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start at top
            positions.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }
        return positions;
    },
    /**
     * Arrange vertically down the side
     */
    vertical(count, startX = 0.1, startY = 0.2, spacing = 0.08) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            positions.push({
                x: startX,
                y: startY + i * spacing
            });
        }
        return positions;
    }
};
exports.default = {
    applyAntiOverlapLayout,
    fixLabelOverlap,
    calculateTextDimensions,
    POSITIONING_STRATEGIES: exports.POSITIONING_STRATEGIES
};
//# sourceMappingURL=layoutEngine.js.map