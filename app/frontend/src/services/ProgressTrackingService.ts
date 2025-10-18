/**
 * Progress Tracking Service
 * Tracks real-time rendering progress for lecture steps and visuals
 */

import { StepProgress, VisualProgress } from '../components/LectureProgressTracker';

export type ProgressUpdateCallback = (steps: StepProgress[]) => void;

export class ProgressTrackingService {
  private steps: Map<number, StepProgress> = new Map();
  private listeners: Set<ProgressUpdateCallback> = new Set();
  private currentStepId: number | null = null;
  private currentVisualId: string | null = null;

  /**
   * Initialize step structure from plan
   */
  initializeSteps(planSteps: Array<{ id: number; desc: string; tag?: string; complexity?: number }>): void {
    console.log('[ProgressTracker] Initializing', planSteps.length, 'steps');
    
    this.steps.clear();
    
    planSteps.forEach((planStep) => {
      const difficulty = this.mapComplexityToDifficulty(planStep.complexity || 5);
      
      // Create visual items: 1 notes + 4 animations
      const visuals: VisualProgress[] = [
        {
          id: `step-${planStep.id}-notes`,
          name: 'Notes Keynote',
          type: 'notes',
          status: 'pending',
          progress: 0
        },
        {
          id: `step-${planStep.id}-animation-1`,
          name: 'Visual Animation 1',
          type: 'visual',
          status: 'pending',
          progress: 0
        },
        {
          id: `step-${planStep.id}-animation-2`,
          name: 'Visual Animation 2',
          type: 'visual',
          status: 'pending',
          progress: 0
        },
        {
          id: `step-${planStep.id}-animation-3`,
          name: 'Visual Animation 3',
          type: 'visual',
          status: 'pending',
          progress: 0
        },
        {
          id: `step-${planStep.id}-animation-4`,
          name: 'Visual Animation 4',
          type: 'visual',
          status: 'pending',
          progress: 0
        }
      ];

      const stepProgress: StepProgress = {
        stepId: planStep.id,
        stepTitle: planStep.desc || planStep.tag || `Step ${planStep.id}`,
        difficulty,
        visuals,
        totalActions: 0,
        completedActions: 0
      };

      this.steps.set(planStep.id, stepProgress);
    });

    this.notifyListeners();
  }

  /**
   * Update step with actual action count
   */
  setStepActions(stepId: number, actionCount: number): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.totalActions = actionCount;
      this.notifyListeners();
    }
  }

  /**
   * Start rendering a visual
   */
  startVisual(visualGroup: string, stepId: number): void {
    console.log('[ProgressTracker] Starting visual:', visualGroup);
    
    const step = this.steps.get(stepId);
    if (!step) {
      console.warn('[ProgressTracker] Step not found:', stepId);
      return;
    }

    const visual = step.visuals.find(v => v.id === visualGroup);
    if (!visual) {
      console.warn('[ProgressTracker] Visual not found:', visualGroup);
      return;
    }

    visual.status = 'in-progress';
    visual.progress = 0;
    
    this.currentStepId = stepId;
    this.currentVisualId = visualGroup;
    
    this.notifyListeners();
  }

  /**
   * Update visual progress (0-100)
   */
  updateVisualProgress(visualGroup: string, progress: number): void {
    for (const step of this.steps.values()) {
      const visual = step.visuals.find(v => v.id === visualGroup);
      if (visual) {
        visual.progress = Math.min(100, Math.max(0, progress));
        if (visual.status === 'pending') {
          visual.status = 'in-progress';
        }
        this.notifyListeners();
        break;
      }
    }
  }

  /**
   * Complete a visual
   */
  completeVisual(visualGroup: string): void {
    console.log('[ProgressTracker] Completing visual:', visualGroup);
    
    for (const step of this.steps.values()) {
      const visual = step.visuals.find(v => v.id === visualGroup);
      if (visual) {
        visual.status = 'completed';
        visual.progress = 100;
        this.notifyListeners();
        break;
      }
    }
  }

  /**
   * Update action progress within a visual
   */
  updateActionProgress(stepId: number, completedActions: number, totalActions: number): void {
    const step = this.steps.get(stepId);
    if (!step) return;

    step.completedActions = completedActions;
    step.totalActions = totalActions;

    // Calculate which visual we're on based on actions
    // Rough approximation: divide actions across visuals
    if (totalActions > 0 && step.visuals.length > 0) {
      const actionsPerVisual = totalActions / step.visuals.length;
      const currentVisualIndex = Math.floor(completedActions / actionsPerVisual);
      const progressInVisual = ((completedActions % actionsPerVisual) / actionsPerVisual) * 100;

      // Update visual progress
      step.visuals.forEach((visual, index) => {
        if (index < currentVisualIndex) {
          visual.status = 'completed';
          visual.progress = 100;
        } else if (index === currentVisualIndex) {
          visual.status = 'in-progress';
          visual.progress = progressInVisual;
          this.currentVisualId = visual.id;
        }
      });
    }

    this.notifyListeners();
  }

  /**
   * Get current step ID
   */
  getCurrentStepId(): number | null {
    return this.currentStepId;
  }

  /**
   * Get current visual ID
   */
  getCurrentVisualId(): string | null {
    return this.currentVisualId;
  }

  /**
   * Get all steps
   */
  getSteps(): StepProgress[] {
    return Array.from(this.steps.values());
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressUpdateCallback): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getSteps());
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const steps = this.getSteps();
    this.listeners.forEach(callback => callback(steps));
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.steps.clear();
    this.currentStepId = null;
    this.currentVisualId = null;
    this.notifyListeners();
  }

  /**
   * Map complexity (1-10) to difficulty level
   */
  private mapComplexityToDifficulty(complexity: number): 'easy' | 'medium' | 'hard' {
    if (complexity <= 3) return 'easy';
    if (complexity <= 7) return 'medium';
    return 'hard';
  }

  /**
   * Calculate estimated time remaining (in seconds)
   */
  getEstimatedTimeRemaining(): number {
    const SECONDS_PER_VISUAL = 30; // Rough estimate
    
    let remainingVisuals = 0;
    for (const step of this.steps.values()) {
      remainingVisuals += step.visuals.filter(v => v.status !== 'completed').length;
    }
    
    return remainingVisuals * SECONDS_PER_VISUAL;
  }
}

// Singleton instance
export const progressTracker = new ProgressTrackingService();
