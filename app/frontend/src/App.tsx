import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import CanvasStage, { CanvasStageRef } from './components/CanvasStage';
import { getSocket, waitForJoin } from './socket';
import { captureCanvasScreenshot, setupDoubleClickScreenshot, showScreenshotFlash } from './utils/canvasScreenshot';
import type { ScreenshotResult } from './utils/canvasScreenshot';
import { LectureStateManager } from './services/LectureStateManager';
import { ttsPlayback } from './services/tts-playback';
import { InterruptionPanel } from './components/InterruptionPanel';
import { browserTTS } from './services/browser-tts';
import { ThinkingAnimation } from './components/ThinkingAnimation';
import { TableOfContents } from './components/TableOfContents';
import { KeyNotesGenerator } from './components/KeyNotesGenerator';
import { TopicDisplay } from './components/TopicDisplay';
import { LectureHistory } from './components/LectureHistory';

export default function App() {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
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
  const [clarificationAckRequired, setClarificationAckRequired] = useState(false);
  const [clarificationPromptVisible, setClarificationPromptVisible] = useState(false);
  
  // New UI state
  const [showThinking, setShowThinking] = useState(false);
  const [thinkingStage, setThinkingStage] = useState<'initializing' | 'planning' | 'generating' | 'rendering'>('initializing');
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  
  // Canvas reference for control
  const canvasRef = useRef<any>(null);
  const lectureStateRef = useRef<LectureStateManager | null>(null);
  const pendingRenderedRef = useRef<any[]>([]);
  const lastClarificationIdRef = useRef<string | null>(null);

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
    if (!socket) {
      console.log('[App useEffect] No socket yet, skipping listener setup');
      return;
    }
    
    console.log('[App useEffect] 🔌 Setting up socket event listeners');
    console.log('[App useEffect] Socket ID:', socket.id);
    console.log('[App useEffect] Socket connected:', socket.connected);
    
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
    
    // Plan and progress telemetry (helps verify socket delivery early)
    socket.on('plan', (e) => {
      console.log('[App] Received plan:', e?.title, e?.toc?.length ?? 0, 'items');
      if (e?.title) setPlanTitle(e.title);
      if (e?.subtitle) setPlanSubtitle(e.subtitle);
      if (Array.isArray(e?.toc)) setToc(e.toc);
    });
    socket.on('progress', (e) => {
      console.log('[App] Progress event:', e);
    });
    socket.on('generation_progress', (e) => {
      console.log('[App] Generation progress:', e);
    });
    
    // Test socket connection
    socket.on('pong', () => {
      console.log('[App] 🏓 Received pong from backend - socket is working!');
    });

    // Handle clarification responses
    socket.on('clarification', (e) => {
      if (lastClarificationIdRef.current === e.stepId) {
        console.warn('[App] 🔁 Duplicate clarification received, ignoring:', e.stepId);
        return;
      }
      lastClarificationIdRef.current = e.stepId;
      console.log('');
      console.log('═'.repeat(70));
      console.log('🧠 CLARIFICATION RECEIVED FROM BACKEND');
      console.log('═'.repeat(70));
      console.log('[App] Socket event "clarification" fired!');
      console.log('[App] Timestamp:', new Date().toISOString());
      console.log('[App] Title:', e.title);
      console.log('[App] Actions count:', e.actions?.length);
      console.log('[App] StepId:', e.stepId);
      console.log('[App] Has canvasRef:', !!canvasRef.current);
      console.log('[App] Full clarification data:', JSON.stringify(e, null, 2));
      console.log('═'.repeat(70));
      
      if (e.actions && e.actions.length > 0 && canvasRef.current) {
        // Auto-scroll to the selection anchor if provided
        try {
          const anchor = e.insertAfterScroll || 0;
          const container = canvasRef.current.getContainer?.();
          if (container && typeof anchor === 'number' && anchor > 0) {
            const target = Math.max(0, anchor - 80);
            console.log('[App] 🔽 Auto-scrolling to clarification anchor at', target);
            container.scrollTop = target;
          }
        } catch {}
        console.log('[App] ✅ Sending clarification to SequentialRenderer...');
        // Process clarification actions
        canvasRef.current.processChunk({
          type: 'clarification',
          actions: e.actions,
          stepId: e.stepId,
          title: e.title,
          explanation: e.explanation
        });
        console.log('[App] ✅ Clarification sent to renderer');
      } else {
        console.error('[App] ❌ Cannot render clarification - missing actions or canvasRef');
        console.error('[App] Actions:', e.actions?.length);
        console.error('[App] CanvasRef:', !!canvasRef.current);
      }
      
      // Do NOT auto-resume. Require explicit user acknowledgement to continue.
      setIsGeneratingClarification(false);
      setInterruptionVisible(false);
      setClarificationAckRequired(true);
      console.log('[App] ⏸ Lecture remains paused until user confirms clarification');
      // Show confirmation after a short grace period to let the visual settle
      setTimeout(() => {
        setClarificationPromptVisible(true);
      }, 3000);
    });
    
    const handleRendered = (e: any) => {
      // Interrupt priority: Buffer normal lecture while clarification is pending
      if (isGeneratingClarification || clarificationAckRequired || interruptionVisible) {
        console.warn('[App] ⏸ Buffering rendered event during clarification/interrupt. Step:', e.step?.id || e.stepId);
        pendingRenderedRef.current.push(e);
        return;
      }
      
      // Check if this event is for our session (handle broadcast fallback)
      if (e.targetSession && e.targetSession !== sessionId) {
        console.log('[socket] Ignoring event for different session:', e.targetSession);
        return;
      }
      
      console.log('');
      console.log('═'.repeat(70));
      console.log('🎬 FRONTEND RECEIVED RENDERED EVENT');
      console.log('═'.repeat(70));
      console.log('Event data:', JSON.stringify(e, null, 2));
      console.log('Session match:', e.targetSession === sessionId || !e.targetSession);
      console.log('Step:', e.step);
      console.log('Actions array exists:', !!e.actions);
      console.log('Actions is array:', Array.isArray(e.actions));
      console.log('Actions count:', e.actions?.length || 0);
      if (e.actions && e.actions.length > 0) {
        console.log('First 3 actions:', e.actions.slice(0, 3));
      }
      console.log('Plan title:', e.plan?.title);
      console.log('Plan subtitle:', e.plan?.subtitle);
      console.log('Plan toc:', e.plan?.toc);
      console.log('canvasRef.current exists:', !!canvasRef.current);
      console.log('═'.repeat(70));
      console.log('');
      
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
      
      // Update current step and transcript
      setCurrentStep(e.step);
      if (e.transcript) {
        setCurrentTranscript(e.transcript);
        console.log('[App] Transcript received:', e.transcript.substring(0, 100) + '...');
      }
      
      // CRITICAL: Load TTS narrations if available
      if (e.narration) {
        console.log('[App] 🎤 Loading TTS narrations...');
        ttsPlayback.loadNarrations(e.narration, e.ttsConfig);
        console.log(`[App] ✅ TTS loaded: ${e.narration.narrations?.length || 0} narrations`);
      } else {
        console.log('[App] No narration data in event');
      }
      
      // Add step to lecture state
      if (lectureStateRef.current && e.step) {
        lectureStateRef.current.addStep(
          e.stepId || e.step?.id,
          e.step?.desc || `Step ${e.stepId}`,
          e.actions || []
        );
      }
      
      // CRITICAL FIX: Use SequentialRenderer instead of old execChunk
      console.log('[App] Checking actions for rendering...');
      console.log('[App] e.actions:', e.actions);
      console.log('[App] canvasRef.current:', canvasRef.current);
      
      if (e.actions && e.actions.length > 0) {
        console.log('[App] ✅ Routing', e.actions.length, 'actions to SequentialRenderer');
        
        // Route to SequentialRenderer via CanvasStage ref
        if (canvasRef.current) {
          const chunk = {
            type: 'actions',
            actions: e.actions,
            transcript: e.transcript || '',
            stepId: e.stepId || e.step?.id,
            step: e.step,
            plan: e.plan,
            meta: e.meta
          };
          console.log('[App] Calling processChunk with:', JSON.stringify(chunk, null, 2).substring(0, 500));
          canvasRef.current.processChunk(chunk);
          console.log('[App] ✅ processChunk called successfully');
        } else {
          console.error('[App] ❌ CanvasRef not available - cannot render!');
        }
        
        // Auto-play by default for seamless experience
        setIsPlaying(true);
        setIsPaused(false);
      } else {
        console.warn('[App] ⚠️ No actions to render - e.actions:', e.actions);
        
        setCurrentStep(e.stepId || 0);
        setIsPlaying(true);
      }
      
      setIsReady(true);
      setIsLoading(false);
      
      // Auto-show Table of Contents when first step renders
      if (!showTableOfContents) {
        setShowTableOfContents(true);
      }
    };
    
    console.log('[App useEffect] Attaching "rendered" event listener');
    socket.on('rendered', handleRendered);
    console.log('[App useEffect] ✅ All event listeners attached');
    
    // CRITICAL: After listeners are attached, re-emit join to trigger cached replay
    if (sessionId) {
      console.log('[App] Re-joining room to request cached replay for session:', sessionId);
      socket.emit('join', { sessionId });
    }
    
    
    return () => {
      console.log('[App useEffect] Cleaning up socket listeners');
      socket.off('connect');
      socket.off('disconnect'); 
      socket.off('connect_error');
      socket.off('plan');
      socket.off('progress');
      socket.off('generation_progress');
      socket.off('pong');
      socket.off('rendered', handleRendered);
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
    console.log('[submit] 🚀 Starting submission');
    setIsReady(false);
    setIsLoading(true);
    
    // Show thinking animation
    setShowThinking(true);
    setThinkingStage('initializing');
    
    const sid = ensureSession();
    console.log('[submit] Session ID:', sid);
    
    // CRITICAL: Ensure socket is created and listeners are attached
    const sock = getSocket(sid);
    console.log('[submit] Socket created:', !!sock);
    
    // TTS: friendly acknowledgement on lecture start
    try {
      browserTTS.speak({
        text: 'Thanks! Let me prepare an answer for you.',
        rate: 1,
        pitch: 1,
        volume: 1,
        lang: 'en-US'
      });
    } catch {}

    // Wait for socket to join the room
    try {
      console.log('[submit] Waiting for socket to join room...');
      setThinkingStage('planning');
      await waitForJoin(sid, 5000); // Increased timeout
      console.log('[submit] ✅ Socket joined room successfully');
    } catch (e) {
      console.error('[submit] ❌ Socket join failed:', e);
      console.warn('[submit] Proceeding anyway, but events may be missed');
    }
    
    // Small delay to ensure event listeners are definitely attached
    console.log('[submit] Waiting 100ms to ensure listeners are attached...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setThinkingStage('generating');
    console.log('[submit] Making API call to /api/query');
    console.log('[submit] Difficulty level:', difficulty);
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId: sid, difficulty })
    });
    const data = await res.json();
    console.log('[submit] API response:', data);
    
    setThinkingStage('rendering');
    
    // keep existing sid if backend echoes a different one
    setSessionId((prev) => prev || data.sessionId || sid);
    
    // Hide thinking animation after a short delay
    setTimeout(() => setShowThinking(false), 1000);
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

    // TTS: invite the user to ask (no popup)
    try {
      browserTTS.speak({
        text: 'Please tell me where the confusion is. Circle the area and type your question.',
        rate: 1,
        pitch: 1,
        volume: 1,
        lang: 'en-US'
      });
    } catch {}
  };

  // Handle question submission
  const handleSubmitQuestion = async (question: string, screenshotData: string | null) => {
    if (!sessionId) return;
    
    setIsGeneratingClarification(true);
    
    try {
      console.log('[App] Submitting question:', question);
      // TTS: acknowledge question
      try {
        browserTTS.speak({
          text: "Thank you, that's a great question. Let me make that simple for you.",
          rate: 1,
          pitch: 1,
          volume: 1,
          lang: 'en-US'
        });
      } catch {}
      
      // Ensure socket is connected and joined to session
      try {
        await waitForJoin(sessionId, 3000);
        console.log('[App] Socket connection verified');
      } catch (e) {
        console.warn('[App] Socket join timeout, proceeding anyway:', e);
      }
      
      console.time('clarifyRequest');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      let responseObj;
      try {
        responseObj = await fetch('/api/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            question,
            screenshot: screenshotData
          }),
          signal: controller.signal
        });
      } catch (primaryErr) {
        clearTimeout(timeoutId);
        try {
          responseObj = await fetch('http://127.0.0.1:8000/api/clarify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              question,
              screenshot: screenshotData
            })
          });
        } catch (_fallbackErr) {
          throw primaryErr;
        }
      }
      clearTimeout(timeoutId);
      console.timeEnd('clarifyRequest');
      if (!responseObj.ok) {
        const errorText = await responseObj.text();
        throw new Error(`HTTP ${responseObj.status}: ${errorText || responseObj.statusText}`);
      }
      const data = await responseObj.json();
      console.log('[App] Clarification response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Clarification request failed');
      }
      
      // HTTP fallback: if actions are present, render immediately
      if (data?.clarification?.actions && data.clarification.actions.length > 0) {
        const c = data.clarification;
        if (lastClarificationIdRef.current !== c.stepId) {
          lastClarificationIdRef.current = c.stepId;
          if (canvasRef.current) {
            console.log('[App] 📥 Rendering clarification from HTTP response fallback');
            // Auto-scroll to the selection anchor if provided
            try {
              const anchor = c.insertAfterScroll || 0;
              const container = canvasRef.current.getContainer?.();
              if (container && typeof anchor === 'number' && anchor > 0) {
                const target = Math.max(0, anchor - 80);
                console.log('[App] 🔽 Auto-scrolling (HTTP fallback) to clarification anchor at', target);
                container.scrollTop = target;
              }
            } catch {}
            canvasRef.current.processChunk({
              type: 'clarification',
              actions: c.actions,
              stepId: c.stepId,
              title: c.title,
              explanation: c.explanation
            });
          }
        } else {
          console.log('[App] Skipping HTTP fallback render (already processed via socket)');
        }
        // Show confirmation prompt and keep lecture paused
        setIsGeneratingClarification(false);
        setInterruptionVisible(false);
        setClarificationAckRequired(true);
        setClarificationPromptVisible(true);
      }
      
      // Clarification also arrives via socket.on('clarification')
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
    <div style={{ 
      fontFamily: 'Courier New, monospace', 
      background: '#000',
      minHeight: '100vh',
      color: '#00ff41',
      overflow: 'hidden'
    }}>
      {/* Thinking Animation Overlay */}
      <ThinkingAnimation 
        visible={showThinking} 
        stage={thinkingStage}
        currentStep={currentStep?.desc}
      />
      
      {/* Table of Contents - Confined Right Panel */}
      <TableOfContents
        visible={showTableOfContents}
        planTitle={planTitle}
        steps={toc.length > 0 ? toc : []}
        currentStepIndex={currentStepIndex}
      />
      
      {/* Key Notes Generator - Available anytime during lecture */}
      <KeyNotesGenerator
        visible={!!sessionId}
        lectureComplete={lectureComplete}
        sessionId={sessionId}
        planTitle={planTitle}
      />
      
      {/* Topic Display and Lecture History removed per user request */}
      
      {/* Main Header */}
      <div style={{
        padding: '20px 40px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
        background: 'rgba(0, 0, 0, 0.95)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: '#00ff41',
            textShadow: '0 0 20px rgba(0, 255, 65, 0.8)',
            letterSpacing: 4
          }}>
            LEAF
          </div>
          
          {/* Tagline */}
          <div style={{
            fontSize: 14,
            color: 'rgba(0, 255, 65, 0.6)',
            fontStyle: 'italic',
            textAlign: 'center',
            flex: 1,
            marginLeft: 40
          }}>
            {'<'}Whatever you learn here, you might not forget upto death day{'>'}
          </div>
          
          {/* User Icon */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00ff41, #00cc33)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 0 15px rgba(0, 255, 65, 0.5)'
          }}>
            👤
          </div>
        </div>
      </div>
      
      {/* Input Section */}
      <div style={{
        padding: '30px 40px',
        background: 'rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', maxWidth: 1400, margin: '0 auto' }}>
        {/* Query Input */}
        <div style={{ flex: 1 }}>
          <textarea 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            rows={1} 
            style={{ 
              width: '100%', 
              fontFamily: 'Courier New, monospace',
              fontSize: 14,
              padding: '12px 16px',
              borderRadius: 8,
              border: '2px solid #00ff41',
              background: 'rgba(0, 255, 65, 0.05)',
              color: '#00ff41',
              outline: 'none',
              resize: 'none',
              boxShadow: '0 0 15px rgba(0, 255, 65, 0.2)'
            }} 
            placeholder="<learn any (compleX) topic!>" 
          />
          
        </div>
        
        {/* Difficulty Level Selector */}
        <div>
          <div style={{ 
            fontSize: 12, 
            marginBottom: 8, 
            color: 'rgba(0, 255, 65, 0.7)',
            fontWeight: 'bold',
            letterSpacing: 1
          }}>
            DEFICULTY LEVEL
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setDifficulty('easy')}
              style={{
                padding: '10px 20px',
                background: difficulty === 'easy' ? '#00ff41' : 'transparent',
                color: difficulty === 'easy' ? '#000' : '#00ff41',
                border: `2px solid ${difficulty === 'easy' ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: 'bold',
                fontSize: 12,
                transition: 'all 0.2s ease',
                boxShadow: difficulty === 'easy' ? '0 0 15px rgba(0, 255, 65, 0.5)' : 'none'
              }}
            >
              EASY
            </button>
            <button
              onClick={() => setDifficulty('medium')}
              style={{
                padding: '10px 20px',
                background: difficulty === 'medium' ? '#00ff41' : 'transparent',
                color: difficulty === 'medium' ? '#000' : '#00ff41',
                border: `2px solid ${difficulty === 'medium' ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: 'bold',
                fontSize: 12,
                transition: 'all 0.2s ease',
                boxShadow: difficulty === 'medium' ? '0 0 15px rgba(0, 255, 65, 0.5)' : 'none'
              }}
            >
              MEDIUM
            </button>
            <button
              onClick={() => setDifficulty('hard')}
              style={{
                padding: '10px 20px',
                background: difficulty === 'hard' ? '#00ff41' : 'transparent',
                color: difficulty === 'hard' ? '#000' : '#00ff41',
                border: `2px solid ${difficulty === 'hard' ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: 'bold',
                fontSize: 12,
                transition: 'all 0.2s ease',
                boxShadow: difficulty === 'hard' ? '0 0 15px rgba(0, 255, 65, 0.5)' : 'none'
              }}
            >
              HARD
            </button>
          </div>
          
          {/* Submit Button */}
          <button
            onClick={submit}
            disabled={!query.trim() || isLoading}
            style={{
              marginTop: 12,
              padding: '10px 24px',
              background: !query.trim() || isLoading ? 'rgba(0, 255, 65, 0.3)' : '#00ff41',
              color: !query.trim() || isLoading ? 'rgba(0, 0, 0, 0.5)' : '#000',
              border: '2px solid #00ff41',
              borderRadius: 6,
              cursor: !query.trim() || isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              fontSize: 12,
              width: '100%',
              boxShadow: !query.trim() || isLoading ? 'none' : '0 0 20px rgba(0, 255, 65, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? '>>> GENERATING...' : '>>> START LECTURE'}
          </button>
        </div>
      </div>
    </div>
      
      {/* Table of Contents Toggle Button */}
      {isReady && (
        <button
          onClick={() => setShowTableOfContents(!showTableOfContents)}
          style={{
            position: 'fixed',
            top: 100,
            right: showTableOfContents ? 360 : 20,
            padding: '10px 18px',
            background: showTableOfContents 
              ? 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)'
              : 'rgba(0, 255, 65, 0.1)',
            border: '2px solid #00ff41',
            borderRadius: 8,
            color: showTableOfContents ? '#000' : '#00ff41',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: showTableOfContents 
              ? '0 0 20px rgba(0, 255, 65, 0.4)'
              : '0 0 15px rgba(0, 255, 65, 0.2)',
            zIndex: 101,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            letterSpacing: '1px'
          }}
        >
          {showTableOfContents ? '◀ HIDE' : 'TABLE ▶'}
        </button>
      )}

              
      
      {/* Main Canvas Area */}
      <div style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <CanvasStage 
            ref={canvasRef} 
            sessionId={sessionId}
            onQuestionSubmit={async (question, screenshot, context) => {
              if (!sessionId) return;
              
              setIsGeneratingClarification(true);
              
              console.log('[App] Canvas question submitted:', question);
              console.log('[App] Context:', context);

              // TTS: acknowledge question
              try {
                browserTTS.speak({
                  text: "Thank you, that's a great question. Let me make that simple for you.",
                  rate: 1,
                  pitch: 1,
                  volume: 1,
                  lang: 'en-US'
                });
              } catch {}
              
              // Fire-and-forget: Send request but don't wait for HTTP response
              // The clarification will arrive via socket.on('clarification')
              console.log('[App] 📤 Sending clarification request via proxy /api/clarify');
              console.log('[App] Socket ID:', socket.id);
              console.log('[App] Socket connected:', socket.connected);
              console.log('[App] Session ID:', sessionId);
              
              // Ensure we're in the room before sending request
              socket.emit('join', { sessionId });
              console.log('[App] Re-joined room to ensure socket is in session:', sessionId);
              
              // Test socket connection by emitting a ping
              socket.emit('ping');
              console.log('[App] Sent ping to test socket connection');
              
              // CRITICAL: Wait for socket to join room before sending HTTP request
              // Otherwise backend might emit before frontend is listening
              await new Promise(resolve => setTimeout(resolve, 100));
              console.log('[App] ✅ Socket join delay complete, sending request now');
              
              // Ensure socket joined before sending (best effort)
              try { await waitForJoin(sessionId, 2000); } catch {}
              
              fetch('/api/clarify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  question,
                  screenshot,
                  stepContext: context
                })
              }).then(resp => {
                console.log('[App] Proxy request completed, status:', resp.status);
                if (!resp.ok) {
                  console.error('[App] HTTP error:', resp.status, resp.statusText);
                }
                return resp.json();
              }).then(data => {
                console.log('[App] Canvas clarification response:', data);
                // HTTP fallback path from canvas flow
                if (data?.clarification?.actions && data.clarification.actions.length > 0) {
                  const c = data.clarification;
                  if (lastClarificationIdRef.current !== c.stepId) {
                    lastClarificationIdRef.current = c.stepId;
                    if (canvasRef.current) {
                      console.log('[App] 📥 Rendering clarification (canvas) from HTTP response fallback');
                      // Auto-scroll to the selection anchor if provided
                      try {
                        const anchor = c.insertAfterScroll || 0;
                        const container = canvasRef.current.getContainer?.();
                        if (container && typeof anchor === 'number' && anchor > 0) {
                          const target = Math.max(0, anchor - 80);
                          console.log('[App] 🔽 Auto-scrolling (canvas HTTP fallback) to clarification anchor at', target);
                          container.scrollTop = target;
                        }
                      } catch {}
                      canvasRef.current.processChunk({
                        type: 'clarification',
                        actions: c.actions,
                        stepId: c.stepId,
                        title: c.title,
                        explanation: c.explanation
                      });
                    }
                  }
                  setIsGeneratingClarification(false);
                  setInterruptionVisible(false);
                  setClarificationAckRequired(true);
                  // Delay popup by 3s to allow visual settle
                  setTimeout(() => setClarificationPromptVisible(true), 3000);
                }
              }).catch(err => {
                console.warn('[App] Fetch failed but backend may have received request:', err.message);
                console.warn('[App] Waiting for socket event instead...');
              });
              
              // Don't throw errors - just wait for the socket event
              console.log('[App] ⏳ Waiting for clarification via socket...')
              
              // Set a timeout to clear loading state if no response after 60s
              setTimeout(() => {
                if (isGeneratingClarification) {
                  console.error('[App] ⏰ Timeout: No clarification received after 60s');
                  setIsGeneratingClarification(false);
                  alert('Clarification request timed out. Please try again.');
                }
              }, 60000)
            }}
          />

        {/* Post-clarification confirmation prompt */}
        {clarificationPromptVisible && (
            <div style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              zIndex: 2001,
              minWidth: 360
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Did that clarification help?</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>If yes, we'll resume the lecture where we left off.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    // Keep prompt open and allow another question
                    setClarificationPromptVisible(false);
                    setIsInterrupted(true);
                    setIsPaused(true);
                    setIsPlaying(false);
                    console.log('[App] User wants to stay in question mode');
                    try {
                      browserTTS.speak({
                        text: "Sure. Please tell me what's still confusing, and I will clarify further.",
                        rate: 1,
                        pitch: 1,
                        volume: 1,
                        lang: 'en-US'
                      });
                    } catch {}
                  }}
                  style={{
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    color: '#111827',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Ask another question
                </button>
                <button
                  onClick={() => {
                    console.log('[App] ✅ User confirmed clarification - resuming lecture');
                    setClarificationPromptVisible(false);
                    setClarificationAckRequired(false);
                    setIsGeneratingClarification(false);
                    try {
                      browserTTS.speak({
                        text: "Great! Thank you. Let's proceed with the lecture.",
                        rate: 1,
                        pitch: 1,
                        volume: 1,
                        lang: 'en-US'
                      });
                    } catch {}
                    
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
                    
                    // Flush buffered 'rendered' events in order
                    const queued = [...pendingRenderedRef.current];
                    pendingRenderedRef.current = [];
                    console.log(`[App] 🔄 Flushing ${queued.length} buffered lecture events`);
                    for (const e of queued) {
                      if (e?.actions && canvasRef.current) {
                        const chunk = {
                          type: 'actions',
                          actions: e.actions,
                          transcript: e.transcript || '',
                          stepId: e.stepId || e.step?.id,
                          step: e.step,
                          plan: e.plan,
                          meta: e.meta
                        };
                        canvasRef.current.processChunk(chunk);
                      }
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Continue lecture
                </button>
              </div>
            </div>
          )}
        
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
  );
}
