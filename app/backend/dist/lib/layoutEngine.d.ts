/**
 * LAYOUT ENGINE - PREVENT TEXT OVERLAP
 *
 * Uses force-directed algorithm to separate overlapping labels
 * while keeping them near their anchor points.
 */
export interface LabelPosition {
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    anchorX?: number;
    anchorY?: number;
    fixed?: boolean;
}
export interface LayoutConfig {
    minDistance: number;
    anchorStrength: number;
    repulsionStrength: number;
    iterations: number;
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}
/**
 * Calculate bounding box for text
 */
export declare function calculateTextDimensions(text: string, fontSize?: number): {
    width: number;
    height: number;
};
/**
 * Apply layout algorithm to prevent overlap
 */
export declare function applyAntiOverlapLayout(labels: LabelPosition[], config?: Partial<LayoutConfig>): LabelPosition[];
/**
 * Post-process generated actions to fix label overlap
 */
export declare function fixLabelOverlap(actions: any[]): any[];
/**
 * Smart positioning strategies for different scenarios
 */
export declare const POSITIONING_STRATEGIES: {
    /**
     * Arrange labels in a grid to avoid overlap
     */
    grid(labels: {
        text: string;
        fontSize?: number;
    }[], columns?: number): {
        x: number;
        y: number;
    }[];
    /**
     * Arrange in a circle around a center point
     */
    circular(count: number, centerX?: number, centerY?: number, radius?: number): {
        x: number;
        y: number;
    }[];
    /**
     * Arrange vertically down the side
     */
    vertical(count: number, startX?: number, startY?: number, spacing?: number): {
        x: number;
        y: number;
    }[];
};
declare const _default: {
    applyAntiOverlapLayout: typeof applyAntiOverlapLayout;
    fixLabelOverlap: typeof fixLabelOverlap;
    calculateTextDimensions: typeof calculateTextDimensions;
    POSITIONING_STRATEGIES: {
        /**
         * Arrange labels in a grid to avoid overlap
         */
        grid(labels: {
            text: string;
            fontSize?: number;
        }[], columns?: number): {
            x: number;
            y: number;
        }[];
        /**
         * Arrange in a circle around a center point
         */
        circular(count: number, centerX?: number, centerY?: number, radius?: number): {
            x: number;
            y: number;
        }[];
        /**
         * Arrange vertically down the side
         */
        vertical(count: number, startX?: number, startY?: number, spacing?: number): {
            x: number;
            y: number;
        }[];
    };
};
export default _default;
//# sourceMappingURL=layoutEngine.d.ts.map