/**
 * QUALITY ENFORCEMENT SYSTEM
 * 
 * Validates generated content meets 3Blue1Brown standards
 * REJECTS poor quality and forces retry (not hardcoded fallback)
 * 
 * Philosophy: If Gemini produces garbage, REJECT it and regenerate
 * NOT inject hardcoded content
 */

import { Action, PlanStep } from '../types';
import { logger } from '../logger';

export interface QualityReport {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export class QualityEnforcer {
  /**
   * Validate generated actions meet minimum quality standards
   * REJECTS if quality too poor, forcing regeneration
   */
  static validateActions(
    actions: Action[],
    step: PlanStep,
    topic: string
  ): QualityReport {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 1. CHECK QUANTITY (50-70 operations for professional multi-diagram content)
    if (actions.length < 20) {
      issues.push(`CRITICAL: Only ${actions.length} operations (need 50-70 for professional diagrams)`);
      score -= 40;
    } else if (actions.length < 40) {
      issues.push(`WARNING: Only ${actions.length} operations (target 50-70)`);
      score -= 20;
    } else if (actions.length >= 50 && actions.length <= 70) {
      // Perfect range
      recommendations.push(`Excellent: ${actions.length} operations in optimal range`);
    }

    // 2. CHECK STORYTELLING (must start with title/engaging content)
    const firstOp = actions[0];
    if (firstOp?.op !== 'drawTitle') {
      issues.push('CRITICAL: Must start with drawTitle');
      score -= 20;
      recommendations.push('First operation MUST be drawTitle');
    }

    // Check for early storytelling (labels in first 5 ops)
    const earlyLabels = actions.slice(0, 5).filter(a => a.op === 'drawLabel');
    if (earlyLabels.length === 0) {
      issues.push('WARNING: No early context labels (storytelling missing)');
      score -= 10;
      recommendations.push('Add drawLabel in first 5 operations for context');
    }

    // 3. CHECK LABELING (need 8-12 labels for professional multi-diagram content)
    const labelCount = actions.filter(a => a.op === 'drawLabel').length;
    if (labelCount < 5) {
      issues.push(`CRITICAL: Only ${labelCount} labels (need 8-12)`);
      score -= 30;
      recommendations.push('Add more drawLabel operations to explain ALL visual elements');
    } else if (labelCount < 8) {
      issues.push(`WARNING: Only ${labelCount} labels (target 8-12)`);
      score -= 15;
    } else if (labelCount >= 8 && labelCount <= 12) {
      recommendations.push(`Excellent: ${labelCount} labels provide complete explanations`);
    } else if (labelCount > 15) {
      issues.push(`WARNING: Too many labels (${labelCount}) - may be text-heavy`);
      score -= 5;
    }

    // 4. CHECK PACING (need 3-5 delays for human-readable multi-diagram pace)
    const delayCount = actions.filter(a => a.op === 'delay').length;
    if (delayCount < 2) {
      issues.push(`CRITICAL: Only ${delayCount} delays (need 3-5)`);
      score -= 20;
      recommendations.push('Add delay operations between each diagram/concept');
    } else if (delayCount < 3) {
      issues.push(`WARNING: Only ${delayCount} delays (target 3-5)`);
      score -= 10;
    } else if (delayCount >= 3 && delayCount <= 5) {
      recommendations.push(`Good pacing: ${delayCount} delays`);
    } else if (delayCount > 7) {
      issues.push(`WARNING: Too many delays (${delayCount}) - may feel sluggish`);
      score -= 5;
    }

    // 5. CHECK SECTION MARKERS (need 4-5 for professional organization)
    const sectionMarkers = actions.filter(a => {
      if (a.op !== 'drawLabel') return false;
      const text = (a as any).text || '';
      return text.match(/^[①②③④⑤⑥]/);
    });
    
    if (sectionMarkers.length < 3) {
      issues.push(`CRITICAL: Only ${sectionMarkers.length} section markers (need 4-5 for professional organization)`);
      score -= 25;
      recommendations.push('Add section labels using ① ② ③ ④ ⑤ symbols to organize content');
    } else if (sectionMarkers.length < 4) {
      issues.push(`WARNING: Only ${sectionMarkers.length} section markers (target 4-5)`);
      score -= 10;
    } else {
      recommendations.push(`Excellent: ${sectionMarkers.length} section markers provide clear organization`);
    }

    // 6. CHECK TOPIC-SPECIFIC REQUIREMENTS
    const topicLower = topic.toLowerCase();
    
    // Math topics MUST have LaTeX
    if (topicLower.match(/calculus|derivative|integral|equation|formula|theorem|math|physics/)) {
      const hasLatex = actions.some(a => {
        const op = String(a.op);
        return op === 'latex' || op === 'drawLatex' || op.includes('atex');
      });
      if (!hasLatex && step.tag !== 'hook') {
        issues.push('CRITICAL: Math topic missing LaTeX equations');
        score -= 25;
        recommendations.push('Add latex operations for mathematical expressions');
      }
    }

    // Circuit topics MUST have circuit operations
    if (topicLower.match(/circuit|nodal|mesh|voltage|current|resistor|capacitor/)) {
      const hasCircuit = actions.some(a => {
        const op = String(a.op);
        return op.includes('Circuit') || op.includes('Connection') || op.includes('Waveform');
      });
      if (!hasCircuit) {
        issues.push('CRITICAL: Circuit topic missing circuit operations');
        score -= 25;
        recommendations.push('Add drawCircuitElement operations');
      }
    }

    // Biology/Anatomy topics MUST have diagrams
    if (topicLower.match(/heart|brain|cell|anatomy|organ|neuron|biology/)) {
      const hasDiagram = actions.some(a => {
        const op = String(a.op);
        return op.includes('Organ') || op.includes('Cell') || op.includes('Membrane') || op.includes('Molecule');
      });
      if (!hasDiagram) {
        issues.push('CRITICAL: Biology topic missing anatomy diagrams');
        score -= 25;
        recommendations.push('Add drawOrganSystem or drawCellStructure operations');
      }
    }

    // 6. CHECK INTERACTION (need simulation/highlighting)
    const hasSimulation = actions.some(a => {
      const op = String(a.op);
      return op === 'orbit' || 
        op === 'wave' || 
        op === 'particle' ||
        op.includes('Waveform') ||
        op.includes('Motion');
    });
    const hasHighlighting = actions.some(a => 
      a.op === 'drawCircle' || 
      a.op === 'drawVector'
    );
    
    if (!hasSimulation && !hasHighlighting) {
      issues.push('WARNING: No simulation or highlighting (static content)');
      score -= 10;
      recommendations.push('Add orbit/wave/particle or drawCircle/drawVector for interaction');
    }

    // 7. CHECK VARIETY (don't use same operation 20+ times)
    const opCounts: Record<string, number> = {};
    actions.forEach(a => {
      opCounts[a.op] = (opCounts[a.op] || 0) + 1;
    });
    
    for (const [op, count] of Object.entries(opCounts)) {
      if (count > 20 && op !== 'delay' && op !== 'drawLabel') {
        issues.push(`WARNING: Overuse of ${op} (${count} times)`);
        score -= 5;
        recommendations.push(`Reduce ${op} operations, add variety`);
      }
    }

    // FINAL VERDICT - Require quality for professional diagrams
    const passed = score >= 50; // Minimum 50% to pass

    return {
      passed,
      score,
      issues,
      recommendations
    };
  }

  /**
   * Generate enhanced retry prompt based on quality issues
   * Tells Gemini EXACTLY what was wrong and how to fix it
   */
  static generateRetryPrompt(
    originalPrompt: string,
    report: QualityReport,
    topic: string,
    step: PlanStep
  ): string {
    const criticalIssues = report.issues.filter(i => i.startsWith('CRITICAL'));
    const warnings = report.issues.filter(i => i.startsWith('WARNING'));

    let retryPrompt = `REGENERATE - Previous attempt scored ${report.score}% (FAILED)

🚨 CRITICAL ISSUES YOU MUST FIX:
${criticalIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

⚠️ WARNINGS TO ADDRESS:
${warnings.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

✅ SPECIFIC FIXES REQUIRED:
${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

NOW REGENERATE WITH THESE FIXES APPLIED.

Original requirements still apply:
${originalPrompt}`;

    return retryPrompt;
  }

  /**
   * Log quality report for monitoring
   */
  static logReport(report: QualityReport, step: PlanStep, topic: string): void {
    logger.info(`[quality] Step ${step.id} (${step.tag}) for "${topic}": ${report.passed ? 'PASSED' : 'FAILED'} (${report.score}%)`);
    
    if (report.issues.length > 0) {
      logger.warn(`[quality] Issues found:`);
      report.issues.forEach(issue => {
        logger.warn(`[quality]   - ${issue}`);
      });
    }

    if (report.recommendations.length > 0) {
      logger.info(`[quality] Recommendations:`);
      report.recommendations.forEach(rec => {
        logger.info(`[quality]   + ${rec}`);
      });
    }
  }
}
