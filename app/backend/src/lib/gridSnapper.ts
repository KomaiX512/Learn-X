/**
 * GRID SNAPPER - Mathematical guarantee of grid alignment
 * 
 * Problem: LLMs generate random decimals (0.5684394472)
 * Solution: Snap all positions to nearest 0.05 grid point
 * Result: 100% grid alignment guaranteed
 */

import { Action } from '../types';
import { logger } from '../logger';

const GRID_SIZE = 0.05;

/**
 * Snap a single position value to the nearest grid point
 */
export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap all position values in an action to grid
 */
export function snapActionToGrid(action: Action): Action {
  const snapped = { ...action };
  
  // Snap x/y positions
  if ('x' in snapped && typeof snapped.x === 'number') {
    snapped.x = snapToGrid(snapped.x);
  }
  if ('y' in snapped && typeof snapped.y === 'number') {
    snapped.y = snapToGrid(snapped.y);
  }
  
  // Snap arrays of positions (for paths, trajectories, etc.)
  if ('from' in snapped && Array.isArray(snapped.from)) {
    snapped.from = (snapped.from as number[]).map((val, idx) => 
      idx < 2 ? snapToGrid(val) : val
    );
  }
  if ('to' in snapped && Array.isArray(snapped.to)) {
    snapped.to = (snapped.to as number[]).map((val, idx) => 
      idx < 2 ? snapToGrid(val) : val
    );
  }
  if ('path' in snapped && Array.isArray(snapped.path)) {
    snapped.path = (snapped.path as any[]).map((point: any) => {
      if (Array.isArray(point) && point.length >= 2) {
        return [snapToGrid(point[0]), snapToGrid(point[1]), ...point.slice(2)];
      }
      return point;
    });
  }
  
  // Snap connection points if they have x/y
  if ('connectedTo' in snapped && typeof snapped.connectedTo === 'object') {
    const conn = snapped.connectedTo as any;
    if ('x' in conn) conn.x = snapToGrid(conn.x);
    if ('y' in conn) conn.y = snapToGrid(conn.y);
  }
  
  return snapped;
}

/**
 * Snap all actions in an array to grid
 */
export function snapAllToGrid(actions: Action[]): Action[] {
  const snapped = actions.map(snapActionToGrid);
  
  // Count how many positions were snapped
  let totalPositions = 0;
  let snappedPositions = 0;
  
  actions.forEach((original, idx) => {
    const snap = snapped[idx];
    if ('x' in original && 'x' in snap) {
      totalPositions++;
      if ((original as any).x !== (snap as any).x) snappedPositions++;
    }
    if ('y' in original && 'y' in snap) {
      totalPositions++;
      if ((original as any).y !== (snap as any).y) snappedPositions++;
    }
  });
  
  const alignmentPercent = totalPositions > 0 
    ? Math.round((totalPositions - snappedPositions) / totalPositions * 100)
    : 100;
  
  logger.info(`[gridSnapper] Snapped ${snappedPositions}/${totalPositions} positions to grid`);
  logger.info(`[gridSnapper] Grid alignment: ${alignmentPercent}% → 100%`);
  
  return snapped;
}

/**
 * Check grid alignment percentage (for validation)
 */
export function checkGridAlignment(actions: Action[]): number {
  let totalPositions = 0;
  let alignedPositions = 0;
  
  actions.forEach(action => {
    if ('x' in action && typeof action.x === 'number') {
      totalPositions++;
      const remainder = Math.abs((action.x % GRID_SIZE));
      if (remainder < 0.001 || remainder > GRID_SIZE - 0.001) {
        alignedPositions++;
      }
    }
    if ('y' in action && typeof action.y === 'number') {
      totalPositions++;
      const remainder = Math.abs((action.y % GRID_SIZE));
      if (remainder < 0.001 || remainder > GRID_SIZE - 0.001) {
        alignedPositions++;
      }
    }
  });
  
  return totalPositions > 0 ? (alignedPositions / totalPositions) * 100 : 100;
}
