/**
 * Interactive Queries - Ultra Minimal (Keyboard Only)
 * Press Ctrl+Q to ask questions - NO buttons, NO pen tools
 */

import Konva from 'konva';
import { captureCanvasScreenshot, showScreenshotFlash } from '../utils/canvasScreenshot';

export interface QueryConfig {
  stage: Konva.Stage;
  container: HTMLElement;
  sessionId: string;
  onSubmitQuery: (query: string, screenshot: string, stepContext: StepContext) => Promise<void>;
}

export interface StepContext {
  stepId: number;
  tag: string;
  desc: string;
  scrollY: number;
}

export class InteractiveQueries {
  private stage: Konva.Stage;
  private container: HTMLElement;
  private sessionId: string;
  private onSubmitQuery: (query: string, screenshot: string, ctx: StepContext) => Promise<void>;
  
  // NO UI elements - keyboard only
  private modal: HTMLDivElement | null = null;
  private currentStepContext: StepContext = { stepId: 0, tag: '', desc: '', scrollY: 0 };
  
  constructor(config: QueryConfig) {
    this.stage = config.stage;
    this.container = config.container;
    this.sessionId = config.sessionId;
    this.onSubmitQuery = config.onSubmitQuery;
    
    this.setupKeyboardShortcut();
    this.trackStepContext();
    
    console.log('[InteractiveQueries] Keyboard-only mode active (Press Ctrl+Q to ask question)');
  }
  
  /**
   * Setup keyboard shortcut - Ctrl+Q to open query modal
   */
  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Q or Cmd+Q to open query modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        this.showQueryModal();
      }
      
      // ESC to close
      if (e.key === 'Escape' && this.modal) {
        this.closeModal();
      }
    });
  }
  
  /**
   * Track step context from scroll and DOM
   */
  private trackStepContext(): void {
    const updateScroll = () => {
      this.currentStepContext.scrollY = this.container.scrollTop || window.scrollY || 0;
    };
    
    this.container.addEventListener('scroll', updateScroll);
    window.addEventListener('scroll', updateScroll);
    
    const observer = new MutationObserver(() => {
      const stepTitles = document.querySelectorAll('[data-step-id]');
      if (stepTitles.length > 0) {
        const lastStep = stepTitles[stepTitles.length - 1];
        const stepId = parseInt(lastStep.getAttribute('data-step-id') || '0');
        const tag = lastStep.getAttribute('data-step-tag') || '';
        const desc = lastStep.getAttribute('data-step-desc') || '';
        
        this.currentStepContext = {
          stepId,
          tag,
          desc,
          scrollY: this.currentStepContext.scrollY
        };
      }
    });
    
    observer.observe(this.container, { childList: true, subtree: true });
  }
  
  /**
   * Show query modal (Ctrl+Q)
   */
  private showQueryModal(): void {
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Ask a Question';
    title.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
    `;
    
    const contextInfo = document.createElement('div');
    contextInfo.textContent = `About: ${this.currentStepContext.tag || 'Current step'}`;
    contextInfo.style.cssText = `
      font-size: 13px;
      color: #666;
      margin-bottom: 20px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 6px;
    `;
    
    const input = document.createElement('textarea');
    input.placeholder = 'What would you like me to explain?';
    input.style.cssText = `
      width: 100%;
      height: 100px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      resize: vertical;
      margin-bottom: 20px;
      box-sizing: border-box;
    `;
    input.focus();
    
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      color: #666;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.addEventListener('click', () => this.closeModal());
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.style.cssText = `
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: #667eea;
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    `;
    submitBtn.addEventListener('click', () => this.submitQuery(input.value));
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(submitBtn);
    content.appendChild(title);
    content.appendChild(contextInfo);
    content.appendChild(input);
    content.appendChild(btnContainer);
    this.modal.appendChild(content);
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.submitQuery(input.value);
      }
    });
    
    document.body.appendChild(this.modal);
  }
  
  /**
   * Close modal
   */
  private closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
  
  /**
   * Submit query
   */
  private async submitQuery(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    try {
      if (this.modal) {
        const content = this.modal.querySelector('div') as HTMLDivElement;
        content.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🤔</div>
            <div style="font-size: 18px; color: #666;">Capturing context...</div>
          </div>
        `;
      }
      
      showScreenshotFlash(this.container);
      const screenshot = await captureCanvasScreenshot(this.stage, {
        pixelRatio: 2,
        quality: 0.92
      });
      
      if (this.modal) {
        const content = this.modal.querySelector('div') as HTMLDivElement;
        content.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
            <div style="font-size: 18px; color: #666;">AI is thinking...</div>
          </div>
        `;
      }
      
      await this.onSubmitQuery(trimmedQuery, screenshot.dataUrl, this.currentStepContext);
      
      this.closeModal();
      
      console.log('[InteractiveQueries] Query submitted successfully');
      
    } catch (error) {
      console.error('[InteractiveQueries] Error:', error);
      
      if (this.modal) {
        const content = this.modal.querySelector('div') as HTMLDivElement;
        content.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <div style="font-size: 18px; color: #e53935; margin-bottom: 20px;">Failed to submit</div>
            <button onclick="this.closest('[style*=fixed]').remove()" style="
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              background: #667eea;
              color: white;
              cursor: pointer;
            ">Close</button>
          </div>
        `;
      }
    }
  }
  
  public updateSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
  
  public updateStepContext(context: Partial<StepContext>): void {
    this.currentStepContext = { ...this.currentStepContext, ...context };
  }
  
  public destroy(): void {
    this.closeModal();
  }
}
