/**
 * Interactive Learning Integration Example
 * Copy this pattern into your main app initialization
 */

import { InteractiveQueries } from './renderer/InteractiveQueries';
import { socket } from './socket';

// Example: Integration in your main app component
export function setupInteractiveLearning(
  stage: any, // Your Konva stage
  container: HTMLElement, // Canvas container element
  animationQueue: any, // Your AnimationQueue instance
  sessionId: string,
  apiUrl: string = 'http://localhost:3001'
) {
  
  console.log('[App] Setting up interactive learning...');
  
  // Initialize InteractiveQueries component
  const interactiveQueries = new InteractiveQueries({
    stage,
    container,
    sessionId,
    onSubmitQuery: async (query, screenshot, stepContext) => {
      console.log('[App] Submitting query:', query);
      console.log('[App] Step context:', stepContext);
      
      try {
        const response = await fetch(`${apiUrl}/api/clarify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            question: query,
            screenshot,
            stepContext
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit question');
        }
        
        const result = await response.json();
        console.log('[App] ✅ Question submitted:', result);
        
        // Show success notification
        showNotification('AI is analyzing your question...', 'info');
        
      } catch (error) {
        console.error('[App] ❌ Failed to submit question:', error);
        showNotification('Failed to submit question. Please try again.', 'error');
        throw error;
      }
    }
  });
  
  // Listen for clarification responses from backend
  socket.on('clarification', (data: any) => {
    console.log('[App] 🧠 Received clarification:', data);
    
    // Show notification that AI responded
    showNotification(`AI answered: "${data.title}"`, 'success');
    
    // Enqueue clarification actions to animation queue
    // This will render them inline with existing content
    animationQueue.enqueue(data.actions, {
      stepId: data.stepId,
      stepTag: data.title,
      stepDesc: data.explanation,
      type: 'clarification'
    });
    
    console.log(`[App] ✅ Queued ${data.actions.length} clarification actions`);
  });
  
  // Return cleanup function
  return {
    updateSessionId: (newSessionId: string) => {
      interactiveQueries.updateSessionId(newSessionId);
    },
    updateStepContext: (context: any) => {
      interactiveQueries.updateStepContext(context);
    },
    destroy: () => {
      interactiveQueries.destroy();
      socket.off('clarification');
    }
  };
}

// Example notification helper (customize to your UI)
function showNotification(message: string, type: 'info' | 'success' | 'error') {
  // Use your existing notification system or create a simple one
  console.log(`[Notification ${type}]:`, message);
  
  // Example simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
    color: white;
    border-radius: 8px;
    z-index: 10001;
    animation: slideDown 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Example: How to use in your main app initialization
/*
import { setupInteractiveLearning } from './interactiveIntegration.example';

// After initializing your renderer
const interactive = setupInteractiveLearning(
  yourKonvaStage,
  yourCanvasContainer,
  yourAnimationQueue,
  currentSessionId,
  'http://localhost:3001' // Your backend URL
);

// When starting a new session
function onNewSession(sessionId: string) {
  interactive.updateSessionId(sessionId);
}

// Optional: Manual step context updates for better tracking
yourAnimationQueue.setActionCallbacks(
  (action, index) => {
    if (action.stepId) {
      interactive.updateStepContext({
        stepId: action.stepId,
        tag: action.stepTag || `Step ${action.stepId}`,
        desc: action.stepDesc || '',
        scrollY: window.scrollY || 0
      });
    }
  },
  undefined
);

// Cleanup on unmount
window.addEventListener('beforeunload', () => {
  interactive.destroy();
});
*/
