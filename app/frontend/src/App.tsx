import React, { useEffect, useMemo, useState, useRef } from 'react';
import CanvasStage from './components/CanvasStage';
import { getSocket, waitForJoin } from './socket';
import { LectureStateManager } from './services/LectureStateManager';
import { InterruptionPanel } from './components/InterruptionPanel';
import { captureCanvasScreenshot, setupDoubleClickScreenshot, showScreenshotFlash } from './utils/canvasScreenshot';
import type { ScreenshotResult } from './utils/canvasScreenshot';

export default function App() {
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planSubtitle, setPlanSubtitle] = useState<string>('');
  const [toc, setToc] = useState<Array<{ minute: number; title: string; summary?: string }>>([]);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Navigation and playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lectureComplete, setLectureComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Interruption and question state
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [interruptionVisible, setInterruptionVisible] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isGeneratingClarification, setIsGeneratingClarification] = useState(false);
  
  // Canvas reference for control
  const canvasRef = useRef<any>(null);
  const lectureStateRef = useRef<LectureStateManager | null>(null);

  // Ensure we have a session and that the socket has joined it before enqueuing work
  function ensureSession(): string {
    const sid =
      sessionId ||
      (typeof window !== 'undefined' && (window as any).crypto?.randomUUID
        ? (window as any).crypto.randomUUID()
        : Math.random().toString(36).slice(2));
    if (!sessionId) {
      setSessionId(sid);
    }
    // Eagerly connect and join the room to avoid missing early renders
    getSocket(sid);
    return sid;
  }

  const socket = useMemo(() => (sessionId ? getSocket(sessionId) : null), [sessionId]);

  // Initialize lecture state manager when session starts
  useEffect(() => {
    if (sessionId && !lectureStateRef.current) {
      lectureStateRef.current = new LectureStateManager(sessionId);
      
      // Subscribe to state changes
      lectureStateRef.current.subscribe((state) => {
        setLectureComplete(state.isCompleted);
        setTotalSteps(state.totalSteps);
        setCurrentStepIndex(state.currentStepIndex);
        setProgress(lectureStateRef.current?.getProgress() || 0);
      });
      
      console.log('[App] LectureStateManager initialized');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;
    
    // Add connection event logging
    socket.on('connect', () => {
      console.log('[socket] Connected to backend, socket ID:', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected from backend:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error);
    });
    
    // Handle clarification responses
    socket.on('clarification', (e) => {
      console.log('[App] Received clarification:', e.title);
      
      if (e.actions && e.actions.length > 0 && canvasRef.current) {
        // Process clarification actions
        canvasRef.current.processChunk({
          type: 'clarification',
          actions: e.actions,
          stepId: e.stepId,
          title: e.title,
          explanation: e.explanation
        });
      }
      
      setIsGeneratingClarification(false);
      setInterruptionVisible(false);
      
      // Resume lecture after clarification
      setTimeout(() => {
        if (lectureStateRef.current) {
          lectureStateRef.current.endClarification();
          lectureStateRef.current.resume();
        }
        if (canvasRef.current) {
          canvasRef.current.resume();
        }
        setIsInterrupted(false);
        setIsPaused(false);
        setIsPlaying(true);
      }, 1000);
    });
    
    socket.on('rendered', (e) => {
      // Check if this event is for our session (handle broadcast fallback)
      if (e.targetSession && e.targetSession !== sessionId) {
        console.log('[socket] Ignoring event for different session:', e.targetSession);
        return;
      }
      
      console.log('=== FRONTEND RECEIVED RENDERED EVENT ===');
      console.log('Event data:', e);
      console.log('Session match:', e.targetSession === sessionId || !e.targetSession);
      console.log('Step:', e.step);
      console.log('Actions:', e.actions?.length || 0, 'actions');
      console.log('Plan title:', e.plan?.title);
      console.log('Plan subtitle:', e.plan?.subtitle);
      console.log('Plan toc:', e.plan?.toc);
      console.log('=== END FRONTEND EVENT ===');
      
      // Update plan title
      if (e.plan?.title) {
        setPlanTitle(e.plan.title);
      }
      if (e.plan?.subtitle) {
        setPlanSubtitle(e.plan.subtitle);
      }
      if (Array.isArray(e.plan?.toc)) {
        setToc(e.plan.toc);
      }
      
      // Update current step
      setCurrentStep(e.step);
      
      // Add step to lecture state
      if (lectureStateRef.current && e.step) {
        lectureStateRef.current.addStep(
          e.stepId || e.step?.id,
          e.step?.desc || `Step ${e.stepId}`,
          e.actions || []
        );
      }
      
      // CRITICAL FIX: Use SequentialRenderer instead of old execChunk
      if (e.actions && e.actions.length > 0) {
        console.log('[App] Routing', e.actions.length, 'actions to SequentialRenderer');
        
        // Route to SequentialRenderer via CanvasStage ref
        if (canvasRef.current) {
          canvasRef.current.processChunk({
            type: 'actions',
            actions: e.actions,
            stepId: e.stepId || e.step?.id,
            step: e.step,
            plan: e.plan
          });
        } else {
          console.error('[App] CanvasRef not available - cannot render!');
        }
        
        setCurrentStep(e.stepId || 0);
        setIsPlaying(true);
      }
      
      setIsReady(true);
      setIsLoading(false);
    });
    
    
    return () => {
      socket.off('connect');
      socket.off('disconnect'); 
      socket.off('connect_error');
      socket.off('clarification');
    };
  }, [socket]);

  // Auto-run once on mount to kick off the demo (pre-join socket to avoid race)
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const sid = ensureSession();
  //       console.log('Fetching /api/query');
  //       const res = await fetch('/api/query', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ query, params: { R, C, V }, sessionId: sid })
  //       });
  //       const data = await res.json();
  //       console.log('auto-run session', data);
  //       setSessionId((prev) => prev || data.sessionId || sid);
  //     } catch (e) {
  //       console.error('auto-run error', e);
  //     }
  //   })();
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  async function submit() {
    setIsReady(false);
    setIsLoading(true);
    const sid = ensureSession();
    try {
      await waitForJoin(sid, 3000);
    } catch (e) {
      console.warn('[submit] join wait failed, proceeding anyway:', e);
    }
    const res = await fetch('http://localhost:3001/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId: sid })
    });
    const data = await res.json();
    // keep existing sid if backend echoes a different one
    setSessionId((prev) => prev || data.sessionId || sid);
  }

  async function nextStep() {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/next`, { method: 'POST' });
  }

  // Setup double-click screenshot when canvas is ready
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const stage = canvasRef.current.getStage();
    const container = canvasRef.current.getContainer();
    
    if (!stage || !container) return;
    
    const cleanup = setupDoubleClickScreenshot(
      stage,
      container,
      (capturedScreenshot: ScreenshotResult) => {
        console.log('[App] Screenshot captured:', capturedScreenshot.width, 'x', capturedScreenshot.height);
        setScreenshot(capturedScreenshot.dataUrl);
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = '📸 Screenshot captured!';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
      }
    );
    
    return cleanup;
  }, [canvasRef.current]);

  // Handle interruption
  const handleInterrupt = () => {
    if (!lectureStateRef.current) return;
    
    // Pause the lecture
    if (canvasRef.current) {
      canvasRef.current.pause();
    }
    
    setIsInterrupted(true);
    setIsPaused(true);
    setIsPlaying(false);
    setInterruptionVisible(true);
    
    // Mark as interrupted in state
    lectureStateRef.current.interrupt(currentStep?.id || 'unknown');
    lectureStateRef.current.startClarification();
    
    console.log('[App] Lecture interrupted for question');
  };

  // Handle question submission
  const handleSubmitQuestion = async (question: string, screenshotData: string | null) => {
    if (!sessionId) return;
    
    setIsGeneratingClarification(true);
    
    try {
      console.log('[App] Submitting question:', question);
      
      // Ensure socket is connected and joined to session
      try {
        await waitForJoin(sessionId, 3000);
        console.log('[App] Socket connection verified');
      } catch (e) {
        console.warn('[App] Socket join timeout, proceeding anyway:', e);
      }
      
      const response = await fetch('http://localhost:3001/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          question,
          screenshot: screenshotData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[App] Clarification response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Clarification request failed');
      }
      
      // Clarification will arrive via socket.on('clarification')
    } catch (error: any) {
      console.error('[App] Error submitting question:', error);
      setIsGeneratingClarification(false);
      alert(`Failed to get clarification: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  // Handle cancel interruption
  const handleCancelInterruption = () => {
    setInterruptionVisible(false);
    setScreenshot(null);
    
    // Resume lecture
    if (lectureStateRef.current) {
      lectureStateRef.current.endClarification();
      lectureStateRef.current.resume();
    }
    
    if (canvasRef.current) {
      canvasRef.current.resume();
    }
    
    setIsInterrupted(false);
    setIsPaused(false);
    setIsPlaying(true);
  };


  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', padding: 16 }}>
      <h2>Universal Interactive Learning Engine (MVP)</h2>
      {planTitle && <h3 style={{ marginTop: 0 }}>{planTitle}</h3>}
      {planSubtitle && <div style={{ marginTop: 4, color: '#555' }}>{planSubtitle}</div>}
      {toc.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, background: '#fafafa', border: '1px solid #eee', borderRadius: 6 }}>
          <strong>Table of Contents (5-minute plan)</strong>
          <ol style={{ margin: '8px 0 0 20px' }}>
            {toc.sort((a,b)=>a.minute-b.minute).map((item) => (
              <li key={item.minute}>
                <span style={{ fontWeight: 600 }}>Minute {item.minute}:</span> {item.title}
                {item.summary ? <div style={{ color: '#666' }}>{item.summary}</div> : null}
              </li>
            ))}
          </ol>
        </div>
      )}
      {planSubtitle && <h4 style={{ marginTop: 0 }}>{planSubtitle}</h4>}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Query</label>
          <textarea 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            rows={3} 
            style={{ 
              width: '100%', 
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              padding: 8,
              borderRadius: 4,
              border: '1px solid #ddd'
            }} 
            placeholder="Type your topic (e.g., 'Explain binary search algorithm')" 
          />
          
          {/* Control Buttons */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button 
              onClick={submit} 
              disabled={!query.trim() || isLoading}
              style={{
                padding: '8px 16px',
                background: isLoading ? '#ccc' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {isLoading ? 'Generating...' : 'Start Lecture'}
            </button>
          </div>

          {/* Navigation Controls */}
          {isReady && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              background: '#f8f9fa', 
              borderRadius: 8,
              border: '1px solid #e0e0e0'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Playback Controls</h4>
              
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button 
                  onClick={() => {
                    if (lectureStateRef.current?.canNavigate()) {
                      const prevStep = lectureStateRef.current.navigateToStep(currentStepIndex - 1);
                      if (prevStep && canvasRef.current) {
                        canvasRef.current.processChunk({
                          type: 'actions',
                          actions: prevStep.actions,
                          stepId: prevStep.stepId,
                          stepTitle: prevStep.stepTitle
                        });
                      }
                    }
                  }}
                  disabled={currentStepIndex === 0 || !lectureStateRef.current?.canNavigate()}
                  style={{
                    padding: '6px 12px',
                    background: currentStepIndex === 0 || !lectureStateRef.current?.canNavigate() ? '#e0e0e0' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: currentStepIndex === 0 || !lectureStateRef.current?.canNavigate() ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Previous
                </button>
                
                <button 
                  onClick={() => {
                    if (isPaused) {
                      canvasRef.current?.resume();
                      setIsPaused(false);
                      setIsPlaying(true);
                    } else if (isPlaying) {
                      canvasRef.current?.pause();
                      setIsPaused(true);
                      setIsPlaying(false);
                    } else {
                      canvasRef.current?.resume();
                      setIsPlaying(true);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  {isPaused ? '▶ Resume' : isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                
                <button 
                  onClick={() => {
                    if (lectureStateRef.current?.canNavigate()) {
                      const nextStep = lectureStateRef.current.navigateToStep(currentStepIndex + 1);
                      if (nextStep && canvasRef.current) {
                        canvasRef.current.processChunk({
                          type: 'actions',
                          actions: nextStep.actions,
                          stepId: nextStep.stepId,
                          stepTitle: nextStep.stepTitle
                        });
                      }
                    }
                  }}
                  disabled={currentStepIndex >= totalSteps - 1 || !lectureStateRef.current?.canNavigate()}
                  style={{
                    padding: '6px 12px',
                    background: currentStepIndex >= totalSteps - 1 || !lectureStateRef.current?.canNavigate() ? '#e0e0e0' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: currentStepIndex >= totalSteps - 1 || !lectureStateRef.current?.canNavigate() ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>
                
                <button 
                  onClick={handleInterrupt}
                  disabled={!isPlaying || isInterrupted}
                  style={{
                    padding: '6px 12px',
                    background: !isPlaying || isInterrupted ? '#e0e0e0' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: !isPlaying || isInterrupted ? 'not-allowed' : 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  ❓ Ask Question
                </button>
              </div>
              
              {/* Progress Bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: 12, 
                  color: '#666',
                  marginBottom: 4
                }}>
                  <span>Step {currentStepIndex + 1} of {totalSteps || 5}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: 8, 
                  background: '#e0e0e0', 
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Current Step Info */}
          {currentStep && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 8,
              color: 'white'
            }}>
              <h4 style={{ margin: '0 0 4px 0' }}>Current Step</h4>
              <div style={{ fontSize: 14, opacity: 0.95 }}>{currentStep?.desc}</div>
            </div>
          )}
        </div>
        
        {/* Canvas Container */}
        <div style={{ flex: 1, minWidth: 600 }}>
          <CanvasStage ref={canvasRef} />
          
          {/* Interruption Panel */}
          <InterruptionPanel
            visible={interruptionVisible}
            currentStep={currentStep?.desc || 'Unknown step'}
            screenshot={screenshot}
            onSubmitQuestion={handleSubmitQuestion}
            onCancel={handleCancelInterruption}
            isGenerating={isGeneratingClarification}
          />
        </div>
      </div>
    </div>
  );
}
