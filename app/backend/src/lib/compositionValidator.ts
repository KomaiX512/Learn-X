/**
 * COMPOSITION VALIDATOR
 * 
 * Validates professional diagram composition standards:
 * - Grid alignment (positions on 0.05 multiples)
 * - Sectioning (multiple distinct concepts)
 * - Spacing (no overlap, proper margins)
 * 
 * This is NOT a fallback generator - it only validates and provides feedback
 */

import { Action } from '../types';
import { logger } from '../logger';

export interface CompositionReport {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  metrics: {
    gridAlignmentScore: number;
    sectioningScore: number;
    spacingScore: number;
    densityScore: number;
  };
}

export class CompositionValidator {
  /**
   * Validate composition quality
   */
  static validate(actions: Action[], topic: string): CompositionReport {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const metrics = {
      gridAlignmentScore: 0,
      sectioningScore: 0,
      spacingScore: 0,
      densityScore: 0
    };

    // 1. CHECK GRID ALIGNMENT
    metrics.gridAlignmentScore = this.checkGridAlignment(actions, issues, suggestions);

    // 2. CHECK SECTIONING (multiple concepts)
    metrics.sectioningScore = this.checkSectioning(actions, issues, suggestions);

    // 3. CHECK SPACING (no overlaps)
    metrics.spacingScore = this.checkSpacing(actions, issues, suggestions);

    // 4. CHECK DENSITY (balanced content)
    metrics.densityScore = this.checkDensity(actions, issues, suggestions);

    // Overall score
    const score = Math.round(
      (metrics.gridAlignmentScore * 0.25) +
      (metrics.sectioningScore * 0.35) +
      (metrics.spacingScore * 0.25) +
      (metrics.densityScore * 0.15)
    );

    const passed = score >= 70; // Professional quality threshold

    return {
      passed,
      score,
      issues,
      suggestions,
      metrics
    };
  }

  /**
   * Check if positions use grid alignment (0.05 multiples)
   */
  private static checkGridAlignment(
    actions: Action[],
    issues: string[],
    suggestions: string[]
  ): number {
    let alignedCount = 0;
    let totalPositions = 0;
    const randomPositions: string[] = [];

    actions.forEach((action, idx) => {
      // Type-safe access to x and y properties
      const actionAny = action as any;
      const x = actionAny.x;
      const y = actionAny.y;
      
      if (x !== undefined && typeof x === 'number' && y !== undefined && typeof y === 'number') {
        totalPositions += 2;
        
        // Check if x is on grid (multiple of 0.05)
        const xAligned = Math.abs((x * 20) - Math.round(x * 20)) < 0.01;
        if (xAligned) alignedCount++;
        else randomPositions.push(`op ${idx}: x=${x}`);

        // Check if y is on grid
        const yAligned = Math.abs((y * 20) - Math.round(y * 20)) < 0.01;
        if (yAligned) alignedCount++;
        else randomPositions.push(`op ${idx}: y=${y}`);
      } else if (x !== undefined && typeof x === 'number') {
        totalPositions++;
        const xAligned = Math.abs((x * 20) - Math.round(x * 20)) < 0.01;
        if (xAligned) alignedCount++;
        else randomPositions.push(`op ${idx}: x=${x}`);
      } else if (y !== undefined && typeof y === 'number') {
        totalPositions++;
        const yAligned = Math.abs((y * 20) - Math.round(y * 20)) < 0.01;
        if (yAligned) alignedCount++;
        else randomPositions.push(`op ${idx}: y=${y}`);
      }
    });

    const alignmentRatio = totalPositions > 0 ? alignedCount / totalPositions : 1;
    const score = Math.round(alignmentRatio * 100);

    if (score < 70) {
      issues.push(`GRID: Only ${score}% positions aligned to grid (need 70%+)`);
      if (randomPositions.length > 0) {
        issues.push(`Random positions: ${randomPositions.slice(0, 3).join(', ')}...`);
      }
      suggestions.push('Use grid positions: 0.05, 0.1, 0.15, 0.2, 0.25, 0.3... NOT 0.47, 0.23, etc.');
    }

    return score;
  }

  /**
   * Check if content is divided into distinct sections/concepts
   */
  private static checkSectioning(
    actions: Action[],
    issues: string[],
    suggestions: string[]
  ): number {
    // Look for section markers (labels with numbers/letters)
    const sectionMarkers = actions.filter(a => {
      const actionAny = a as any;
      return a.op === 'drawLabel' && 
        actionAny.text && 
        (actionAny.text.match(/^[①②③④⑤⑥]/) || actionAny.text.match(/^[1-5]\./) || actionAny.text.match(/^[A-E]\./));
    });

    const conceptCount = sectionMarkers.length;

    // Also check spatial distribution (are operations spread across canvas?)
    const xPositions = actions
      .filter(a => {
        const actionAny = a as any;
        return actionAny.x !== undefined && typeof actionAny.x === 'number';
      })
      .map(a => (a as any).x as number);
    
    if (xPositions.length > 0) {
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      const xSpread = maxX - minX;

      let score = 0;

      // Score based on section markers
      if (conceptCount >= 4) {
        score += 50;
      } else if (conceptCount >= 3) {
        score += 35;
        suggestions.push('Add 1-2 more section labels for better organization');
      } else if (conceptCount >= 2) {
        score += 20;
        issues.push(`Only ${conceptCount} sections (need 4-5 distinct concepts)`);
      } else {
        issues.push(`Only ${conceptCount} sections (need 4-5 distinct concepts)`);
        suggestions.push('Add section labels: ① ② ③ ④ to organize content');
      }

      // Score based on spatial distribution
      if (xSpread > 0.6) {
        score += 50; // Good horizontal spread
      } else if (xSpread > 0.4) {
        score += 30;
      } else {
        score += 10;
        issues.push(`Content too narrow (spread: ${Math.round(xSpread * 100)}%)`);
        suggestions.push('Spread diagrams across canvas: left, center, right sections');
      }

      return Math.min(100, score);
    }

    return 0;
  }

  /**
   * Check spacing and overlap prevention
   */
  private static checkSpacing(
    actions: Action[],
    issues: string[],
    suggestions: string[]
  ): number {
    // Group operations by approximate position
    const positionGroups: Map<string, number> = new Map();

    actions.forEach(action => {
      const actionAny = action as any;
      const x = actionAny.x;
      const y = actionAny.y;
      
      if (x !== undefined && typeof x === 'number' && y !== undefined && typeof y === 'number') {
        // Round to nearest 0.1 to group nearby operations
        const gridKey = `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
        positionGroups.set(gridKey, (positionGroups.get(gridKey) || 0) + 1);
      }
    });

    // Check for overcrowding
    const crowdedAreas = Array.from(positionGroups.entries())
      .filter(([_, count]) => count > 8); // More than 8 ops in 0.1x0.1 area

    let score = 100;
    
    if (crowdedAreas.length > 0) {
      score -= crowdedAreas.length * 15;
      issues.push(`${crowdedAreas.length} overcrowded areas detected`);
      suggestions.push('Spread content more evenly across canvas');
      suggestions.push('Use left/center/right sections for different concepts');
    }

    // Check for good use of space
    const usedPositions = positionGroups.size;
    if (usedPositions < 8) {
      score -= 20;
      issues.push(`Only ${usedPositions} distinct areas used (canvas underutilized)`);
      suggestions.push('Create 4-5 separate diagrams in different canvas regions');
    }

    return Math.max(0, score);
  }

  /**
   * Check content density balance
   */
  private static checkDensity(
    actions: Action[],
    issues: string[],
    suggestions: string[]
  ): number {
    const totalOps = actions.length;
    const labels = actions.filter(a => a.op === 'drawLabel').length;
    const delays = actions.filter(a => a.op === 'delay').length;
    const visuals = totalOps - labels - delays;

    const visualRatio = totalOps > 0 ? visuals / totalOps : 0;
    const labelRatio = totalOps > 0 ? labels / totalOps : 0;

    let score = 100;

    // Check visual-to-label balance
    if (visualRatio < 0.5) {
      score -= 30;
      issues.push(`Only ${Math.round(visualRatio * 100)}% visual ops (too text-heavy)`);
      suggestions.push('Add more visual elements (circuits, graphs, diagrams)');
    } else if (visualRatio > 0.85) {
      score -= 20;
      issues.push(`${Math.round(visualRatio * 100)}% visual ops (needs more labels)`);
      suggestions.push('Add more explanatory labels (target 8-12 per step)');
    }

    if (labelRatio < 0.12) {
      score -= 20;
      issues.push(`Only ${labels} labels (need 8-12 for professional quality)`);
    }

    return Math.max(0, score);
  }

  /**
   * Log composition report
   */
  static logReport(report: CompositionReport, stepId: number): void {
    logger.info(`[composition] Step ${stepId}: ${report.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'} (${report.score}%)`);
    logger.info(`[composition]   Grid: ${report.metrics.gridAlignmentScore}%`);
    logger.info(`[composition]   Sections: ${report.metrics.sectioningScore}%`);
    logger.info(`[composition]   Spacing: ${report.metrics.spacingScore}%`);
    logger.info(`[composition]   Density: ${report.metrics.densityScore}%`);

    if (report.issues.length > 0) {
      logger.warn(`[composition] Issues:`);
      report.issues.forEach(issue => {
        logger.warn(`[composition]   - ${issue}`);
      });
    }

    if (report.suggestions.length > 0) {
      logger.info(`[composition] Suggestions:`);
      report.suggestions.forEach(suggestion => {
        logger.info(`[composition]   + ${suggestion}`);
      });
    }
  }
}
