/**
 * LectureStateManager
 * Manages lecture state, completion tracking, and step navigation
 */

export interface StepData {
  stepId: string;
  stepTitle: string;
  actions: any[];
  timestamp: number;
  completed: boolean;
}

export interface LectureState {
  sessionId: string;
  totalSteps: number;
  currentStepIndex: number;
  completedSteps: Set<string>;
  allSteps: StepData[];
  isCompleted: boolean;
  isInterrupted: boolean;
  interruptedAtStep: string | null;
  clarificationActive: boolean;
}

export class LectureStateManager {
  private state: LectureState;
  private listeners: Set<(state: LectureState) => void> = new Set();

  constructor(sessionId: string) {
    this.state = {
      sessionId,
      totalSteps: 0,
      currentStepIndex: 0,
      completedSteps: new Set(),
      allSteps: [],
      isCompleted: false,
      isInterrupted: false,
      interruptedAtStep: null,
      clarificationActive: false
    };
  }

  /**
   * Add a step to the lecture
   */
  addStep(stepId: string, stepTitle: string, actions: any[]): void {
    const existing = this.state.allSteps.find(s => s.stepId === stepId);
    if (existing) {
      // Update existing step
      existing.actions = actions;
      existing.timestamp = Date.now();
    } else {
      // Add new step
      this.state.allSteps.push({
        stepId,
        stepTitle,
        actions,
        timestamp: Date.now(),
        completed: false
      });
      this.state.totalSteps = this.state.allSteps.length;
    }
    this.notifyListeners();
  }

  /**
   * Mark a step as completed
   */
  completeStep(stepId: string): void {
    this.state.completedSteps.add(stepId);
    const step = this.state.allSteps.find(s => s.stepId === stepId);
    if (step) {
      step.completed = true;
    }
    
    // Check if all steps are completed
    if (this.state.completedSteps.size === this.state.totalSteps && this.state.totalSteps > 0) {
      this.state.isCompleted = true;
      console.log('[LectureStateManager] All steps completed! Navigation enabled.');
    }
    
    this.notifyListeners();
  }

  /**
   * Interrupt the lecture at current step
   */
  interrupt(stepId: string): void {
    this.state.isInterrupted = true;
    this.state.interruptedAtStep = stepId;
    console.log(`[LectureStateManager] Lecture interrupted at step: ${stepId}`);
    this.notifyListeners();
  }

  /**
   * Resume the lecture from interruption
   */
  resume(): void {
    this.state.isInterrupted = false;
    this.state.clarificationActive = false;
    console.log('[LectureStateManager] Lecture resumed');
    this.notifyListeners();
  }

  /**
   * Start clarification mode
   */
  startClarification(): void {
    this.state.clarificationActive = true;
    this.notifyListeners();
  }

  /**
   * End clarification mode
   */
  endClarification(): void {
    this.state.clarificationActive = false;
    this.notifyListeners();
  }

  /**
   * Get step by ID
   */
  getStep(stepId: string): StepData | undefined {
    return this.state.allSteps.find(s => s.stepId === stepId);
  }

  /**
   * Get step by index
   */
  getStepByIndex(index: number): StepData | undefined {
    return this.state.allSteps[index];
  }

  /**
   * Navigate to specific step (only if lecture completed)
   */
  navigateToStep(index: number): StepData | null {
    if (!this.state.isCompleted && !this.state.isInterrupted) {
      console.warn('[LectureStateManager] Cannot navigate - lecture not completed');
      return null;
    }
    
    if (index < 0 || index >= this.state.allSteps.length) {
      console.warn(`[LectureStateManager] Invalid step index: ${index}`);
      return null;
    }
    
    this.state.currentStepIndex = index;
    this.notifyListeners();
    return this.state.allSteps[index];
  }

  /**
   * Get current state
   */
  getState(): LectureState {
    return { ...this.state, completedSteps: new Set(this.state.completedSteps) };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: LectureState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Reset the lecture state
   */
  reset(): void {
    this.state = {
      sessionId: this.state.sessionId,
      totalSteps: 0,
      currentStepIndex: 0,
      completedSteps: new Set(),
      allSteps: [],
      isCompleted: false,
      isInterrupted: false,
      interruptedAtStep: null,
      clarificationActive: false
    };
    this.notifyListeners();
  }

  /**
   * Check if navigation is allowed
   */
  canNavigate(): boolean {
    return this.state.isCompleted || this.state.isInterrupted;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    if (this.state.totalSteps === 0) return 0;
    return (this.state.completedSteps.size / this.state.totalSteps) * 100;
  }
}
