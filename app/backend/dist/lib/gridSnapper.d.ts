/**
 * GRID SNAPPER - Mathematical guarantee of grid alignment
 *
 * Problem: LLMs generate random decimals (0.5684394472)
 * Solution: Snap all positions to nearest 0.05 grid point
 * Result: 100% grid alignment guaranteed
 */
import { Action } from '../types';
/**
 * Snap a single position value to the nearest grid point
 */
export declare function snapToGrid(value: number, gridSize?: number): number;
/**
 * Snap all position values in an action to grid
 */
export declare function snapActionToGrid(action: Action): Action;
/**
 * Snap all actions in an array to grid
 */
export declare function snapAllToGrid(actions: Action[]): Action[];
/**
 * Check grid alignment percentage (for validation)
 */
export declare function checkGridAlignment(actions: Action[]): number;
//# sourceMappingURL=gridSnapper.d.ts.map