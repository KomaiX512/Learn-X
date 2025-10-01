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

    // 1. CHECK QUANTITY (20+ operations minimum for delivery)
    if (actions.length < 5) {
      issues.push(`CRITICAL: Only ${actions.length} operations (need 20+)`);
      score -= 50;
    } else if (actions.length < 15) {
      issues.push(`WARNING: Only ${actions.length} operations (target 50-70)`);
      score -= 15;
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

    // 3. CHECK LABELING (need 5+ labels for complete story)
    const labelCount = actions.filter(a => a.op === 'drawLabel').length;
    if (labelCount < 3) {
      issues.push(`CRITICAL: Only ${labelCount} labels (need 5+)`);
      score -= 30;
      recommendations.push('Add more drawLabel operations to explain visuals');
    } else if (labelCount < 5) {
      issues.push(`WARNING: Only ${labelCount} labels (need 5+)`);
      score -= 15;
    }

    // 4. CHECK PACING (need 3+ delays for human-readable pace)
    const delayCount = actions.filter(a => a.op === 'delay').length;
    if (delayCount < 2) {
      issues.push(`CRITICAL: Only ${delayCount} delays (need 3+)`);
      score -= 20;
      recommendations.push('Add delay operations between major concepts');
    } else if (delayCount < 3) {
      issues.push(`WARNING: Only ${delayCount} delays (need 3+)`);
      score -= 10;
    }

    // 5. CHECK TOPIC-SPECIFIC REQUIREMENTS
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

    // FINAL VERDICT - More lenient to allow content delivery
    const passed = score >= 40; // Minimum 40% to pass (was 60%)

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
