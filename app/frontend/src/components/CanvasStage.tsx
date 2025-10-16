import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import Konva from 'konva';
import { SequentialRenderer } from '../renderer/SequentialRenderer';
import { CanvasToolbar, PlaybackMode, CanvasTool } from './CanvasToolbar';
import { HandRaiseButton } from './HandRaiseButton';
import { PenDrawingLayer } from './PenDrawingLayer';
import { CanvasQuestionInput } from './CanvasQuestionInput';
import { captureVisibleViewport, captureCanvasScreenshot } from '../utils/canvasScreenshot';
import type { ScreenshotResult } from '../utils/canvasScreenshot';
import { browserTTS } from '../services/browser-tts';

export interface CanvasStageRef {
  pause: () => void;
  resume: () => void;
  nextStep: () => void;
  previousStep: () => void;
  processChunk: (chunk: any) => void;
  getStage: () => Konva.Stage | null;
  getContainer: () => HTMLDivElement | null;
  getCurrentStep: () => any;
  enableQuestionMode: () => void;
  disableQuestionMode: () => void;
}

interface CanvasStageProps {
  onVisualStart?: (index: number, action: any) => void;
  onVisualComplete?: (index: number, action: any) => void;
  onQuestionSubmit?: (question: string, screenshot: string | null, context: any) => void;
  sessionId?: string | null;
}

const CanvasStage = forwardRef<CanvasStageRef, CanvasStageProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const sequentialRendererRef = useRef<SequentialRenderer | null>(null);
  const pendingChunksRef = useRef<any[]>([]);
  const visualCounterRef = useRef<number>(0);
  const lastStepIdRef = useRef<number | null>(null);
  const expectedStepIdRef = useRef<number | null>(null);
  const stepBufferRef = useRef<Record<number, any>>({});
  const isRenderingRef = useRef<boolean>(false);
  const scaleRef = useRef<number>(1);
  const currentStepRef = useRef<any>(null);
  const selectionAnchorYRef = useRef<number>(0);
  
  // Interactive mode state
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('auto');
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [isQuestionMode, setIsQuestionMode] = useState<boolean>(false);
  const [isPenEnabled, setIsPenEnabled] = useState<boolean>(false);
  const [isPencilDrawing, setIsPencilDrawing] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [questionInputVisible, setQuestionInputVisible] = useState<boolean>(false);
  const [questionInputPosition, setQuestionInputPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [frozenStepContext, setFrozenStepContext] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // In-order step gating helpers
  const flushBufferedIfAvailable = () => {
    const expected = expectedStepIdRef.current;
    if (!sequentialRendererRef.current || expected == null) return;
    const buffered = stepBufferRef.current[expected];
    if (buffered) {
      delete stepBufferRef.current[expected];
      isRenderingRef.current = true;
      sequentialRendererRef.current.processChunk(buffered);
    }
  };
  
  const routeChunk = (chunk: any) => {
    console.log('[CanvasStage] processChunk called');
    console.log('[CanvasStage] chunk:', JSON.stringify(chunk, null, 2).substring(0, 500));
    console.log('[CanvasStage] sequentialRendererRef.current exists:', !!sequentialRendererRef.current);
    if (chunk?.type === 'clarification') {
      console.log('[CanvasStage] 🟢 Clarification chunk: bypassing step gating');
      if (sequentialRendererRef.current) {
        isRenderingRef.current = true;
        sequentialRendererRef.current.processChunk(chunk);
      } else {
        console.warn('[CanvasStage] ⚠️ Renderer not ready, queuing clarification chunk');
        pendingChunksRef.current.push(chunk);
        console.log('[CanvasStage] Pending chunks:', pendingChunksRef.current.length);
      }
      return;
    }

    if (chunk && typeof chunk.stepId !== 'undefined' && Number.isFinite(Number(chunk.stepId))) {
      if (lastStepIdRef.current !== chunk.stepId) {
        lastStepIdRef.current = chunk.stepId;
        visualCounterRef.current = 0;
      }
      // CRITICAL FIX: Always start expecting step 1, not first received step!
      // Steps are generated in parallel and may arrive out of order
      if (expectedStepIdRef.current === null) {
        expectedStepIdRef.current = 1; // Always start from step 1
        console.log('[CanvasStage] 🎯 Initialized expectedStep to 1');
      }
      const sId = Number(chunk.stepId);
      // Buffer out-of-order steps or if a step is currently rendering
      if (sId !== expectedStepIdRef.current || isRenderingRef.current) {
        stepBufferRef.current[sId] = chunk;
        console.log(`[CanvasStage] 📦 Buffered step ${sId} (expected ${expectedStepIdRef.current}, rendering=${isRenderingRef.current})`);
        return;
      }
    }
    if (sequentialRendererRef.current) {
      console.log('[CanvasStage] ✅ Calling sequentialRenderer.processChunk');
      isRenderingRef.current = true;
      sequentialRendererRef.current.processChunk(chunk);
    } else {
      console.warn('[CanvasStage] ⚠️ Renderer not ready, queuing chunk');
      pendingChunksRef.current.push(chunk);
      console.log('[CanvasStage] Pending chunks:', pendingChunksRef.current.length);
    }
  };
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    pause: () => sequentialRendererRef.current?.pause(),
    resume: () => sequentialRendererRef.current?.resume(),
    nextStep: () => sequentialRendererRef.current?.nextStep(),
    previousStep: () => sequentialRendererRef.current?.previousStep(),
    processChunk: (chunk: any) => {
      // Store current step context
      if (chunk?.step) {
        currentStepRef.current = chunk.step;
      }
      routeChunk(chunk);
    },
    getStage: () => stageRef.current,
    getContainer: () => scrollContainerRef.current,
    getCurrentStep: () => currentStepRef.current,
    enableQuestionMode: () => handleHandRaise(),
    disableQuestionMode: () => handleCancelQuestion()
  }));
  // Dynamic canvas dimensions with horizontal expansion support
  const ASPECT_RATIO = 16 / 10; // 16:10 aspect ratio for vertical dimension
  const MIN_WIDTH = 800;
  const MIN_HEIGHT = 500;
  const MAX_WIDTH = 1400;  // Keep for viewport calculations
  const MAX_HEIGHT = 875;
  const [size, setSize] = useState({ w: MIN_WIDTH, h: MIN_HEIGHT });
  const [canvasWidth, setCanvasWidth] = useState(MIN_WIDTH); // Dynamic width for horizontal scroll

  // Window resize handler: maintains aspect ratio
  useEffect(() => {
    function handleResize() {
      const availableWidth = window.innerWidth - 60;
      const availableHeight = window.innerHeight - 250;
      
      // Calculate dimensions maintaining aspect ratio
      let w = Math.min(availableWidth, MAX_WIDTH);
      let h = w / ASPECT_RATIO;
      
      // If height exceeds available space, scale based on height
      if (h > availableHeight || h > MAX_HEIGHT) {
        h = Math.min(availableHeight, MAX_HEIGHT);
        w = h * ASPECT_RATIO;
      }
      
      // Ensure minimum dimensions
      w = Math.max(MIN_WIDTH, w);
      h = Math.max(MIN_HEIGHT, h);
      
      setSize({ w: Math.round(w), h: Math.round(h) });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize stage ONCE when component mounts - NEVER destroy during rendering!
  useEffect(() => {
    // Check prerequisites
    if (!containerRef.current || !overlayRef.current) {
      console.log('[CanvasStage] Container not ready');
      return;
    }
    if (size.w === 0 || size.h === 0) {
      console.log('[CanvasStage] Size not set yet');
      return;
    }

    // CRITICAL: Only create stage if it doesn't exist
    if (stageRef.current) {
      console.log('[CanvasStage] Stage already exists - skipping recreation');
      return;
    }

    console.log('[CanvasStage] Creating Konva stage (ONCE)');
    console.log('[CanvasStage] Container:', containerRef.current);
    console.log('[CanvasStage] Size:', size.w, 'x', size.h);
    
    // Create a unique ID for the container
    const containerId = 'konva-stage-' + Date.now();
    containerRef.current.id = containerId;
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!containerRef.current) return;
      
      try {
        // Create stage using the container ID
        const stage = new Konva.Stage({
          container: containerId,
          width: size.w,
          height: size.h
        });
        
        stageRef.current = stage;
        console.log('[CanvasStage] Stage created successfully');
        console.log('[CanvasStage] Canvas element exists:', !!document.querySelector(`#${containerId} canvas`));
        
        // Ctrl+Wheel zoom (only inside canvas)
        const onWheel = (e: WheelEvent) => {
          if (!e.ctrlKey) return; // only intercept Ctrl+scroll
          e.preventDefault(); // prevent page zoom
          const s = stageRef.current;
          if (!s) return;
          const oldScale = scaleRef.current || 1;
          const scaleBy = 1.05;
          const direction = e.deltaY > 0 ? 1 : -1; // wheel down => zoom out
          const newScale = Math.max(0.3, Math.min(5, direction > 0 ? oldScale / scaleBy : oldScale * scaleBy));
          const pointer = s.getPointerPosition();
          if (pointer) {
            const mousePointTo = {
              x: (pointer.x - s.x()) / oldScale,
              y: (pointer.y - s.y()) / oldScale
            };
            s.scale({ x: newScale, y: newScale });
            const newPos = {
              x: pointer.x - mousePointTo.x * newScale,
              y: pointer.y - mousePointTo.y * newScale
            };
            s.position(newPos as any);
          } else {
            s.scale({ x: newScale, y: newScale });
          }
          scaleRef.current = newScale;
          s.batchDraw();
        };
        const scrollEl = scrollContainerRef.current;
        if (scrollEl) {
          scrollEl.addEventListener('wheel', onWheel, { passive: false });
        }
        
        // Initialize sequential renderer for optimized playback
        sequentialRendererRef.current = new SequentialRenderer({
          // Reuse the stage we just created; do NOT create a second stage
          stage: stage,
          overlay: overlayRef.current!,
          width: size.w,
          height: size.h,
          onStepComplete: (stepId) => {
            console.log(`[CanvasStage] Step ${stepId} complete`);
            // Advance expected step and flush buffer
            isRenderingRef.current = false;
            const numeric = Number(stepId);
            if (Number.isFinite(numeric)) {
              if (expectedStepIdRef.current !== null) {
                expectedStepIdRef.current = (expectedStepIdRef.current || 0) + 1;
              }
            } else {
              console.log('[CanvasStage] Non-numeric stepId (likely clarification) - not advancing expectedStep');
            }
            flushBufferedIfAvailable();
          },
          onProgress: (progress) => {
            console.log(`[CanvasStage] Progress: ${progress}%`);
          }
        });
        sequentialRendererRef.current.setActionCallbacks(
          (action: any) => {
            if (action?.op === 'customSVG') {
              const idx = visualCounterRef.current;
              if (props.onVisualStart) props.onVisualStart(idx, action);
              visualCounterRef.current = idx + 1;
            }
          },
          (action: any) => {
            if (action?.op === 'customSVG') {
              const idx = Math.max(0, visualCounterRef.current - 1);
              if (props.onVisualComplete) props.onVisualComplete(idx, action);
            }
          }
        );
        
        (window as any).sequentialRenderer = sequentialRendererRef.current;
        
        console.log('[CanvasStage] Sequential renderer initialized');
        if (pendingChunksRef.current.length > 0) {
          const items = pendingChunksRef.current.splice(0, pendingChunksRef.current.length);
          items.forEach((chunk) => routeChunk(chunk));
        }
        
        // Force initial draw to ensure canvas is visible
        stage.batchDraw();
        console.log('[CanvasStage] Initial draw complete');
      } catch (error) {
        console.error('[CanvasStage] Failed to create stage:', error);
      }
    }, 100); // Small delay to ensure DOM is ready
    
    // Cleanup ONLY on unmount
    return () => {
      console.log('[CanvasStage] Component unmounting - cleaning up stage');
      // Remove zoom listener
      const scrollEl = scrollContainerRef.current;
      if (scrollEl) {
        // best-effort removal; we used an inline handler so cannot easily remove it by ref
        // but React unmount will remove the element and its listeners
      }
      if (sequentialRendererRef.current) {
        sequentialRendererRef.current.cleanup?.();
      }
      if (stageRef.current) {
        stageRef.current.destroy();
        stageRef.current = null;
      }
      sequentialRendererRef.current = null;
      delete (window as any).sequentialRenderer;
    };
  }, []); // ← EMPTY DEPS - RUN ONCE!

  // Connect playback mode to renderer
  useEffect(() => {
    if (sequentialRendererRef.current) {
      console.log(`[CanvasStage] Setting playback mode to: ${playbackMode}`);
      sequentialRendererRef.current.setMode(playbackMode);
    }
  }, [playbackMode]);

  // Handle tool changes (pencil, select, pan)
  useEffect(() => {
    console.log(`[CanvasStage] Active tool changed to: ${activeTool}`);
    if (activeTool === 'pencil') {
      // Enable pencil drawing (different from hand-raise question mode)
      setIsPencilDrawing(true);
      console.log('[CanvasStage] Pencil drawing enabled');
    } else {
      setIsPencilDrawing(false);
      setCanUndo(false);
      setCanRedo(false);
      console.log('[CanvasStage] Pencil drawing disabled');
    }
  }, [activeTool]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPencilDrawing) return;
      
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          console.log('[CanvasStage] Keyboard shortcut: Undo');
          (window as any).__undoCanvasDrawing?.();
        }
      }
      
      // Ctrl+Y or Cmd+Shift+Z for Redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) {
          console.log('[CanvasStage] Keyboard shortcut: Redo');
          (window as any).__redoCanvasDrawing?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPencilDrawing, canUndo, canRedo]);

  // Apply size updates to existing stage WITHOUT recreating
  useEffect(() => {
    if (stageRef.current) {
      console.log('[CanvasStage] Updating stage size:', size.w, 'x', size.h);
      stageRef.current.width(size.w);
      stageRef.current.height(size.h);
      stageRef.current.batchDraw();
    };
  }, [size.w, size.h]);

  // Interactive handlers
  const handleHandRaise = async () => {
    if (!stageRef.current) return;
    
    if (isQuestionMode) {
      // Cancel question mode
      handleCancelQuestion();
    } else {
      // Enable question mode
      setIsQuestionMode(true);
      setIsPenEnabled(true);
      setErrorMessage(null);
      
      // CRITICAL FIX: Freeze step context NOW
      setFrozenStepContext(currentStepRef.current);
      
      // Pause rendering
      sequentialRendererRef.current?.pause();
      
      // Capture initial screenshot - VIEWPORT ONLY for smaller size
      try {
        if (!scrollContainerRef.current) {
          throw new Error('Scroll container not found');
        }
        const screenshot = await captureVisibleViewport(stageRef.current, scrollContainerRef.current);
        setCapturedScreenshot(screenshot.dataUrl);
        console.log(`[CanvasStage] Viewport screenshot captured: ${screenshot.width}x${screenshot.height}`);
      } catch (error) {
        console.error('[CanvasStage] Failed to capture screenshot:', error);
        setErrorMessage('Failed to capture screenshot. Please try again.');
      }

      // Friendly TTS prompt (no popup): invite the user to ask
      try {
        browserTTS.speak({
          text: "Please tell me where the confusion is. Circle the area and type your question.",
          rate: 1,
          pitch: 1,
          volume: 1,
          lang: 'en-US'
        });
      } catch {}
    }
  };

  const handleCancelQuestion = () => {
    setIsQuestionMode(false);
    setIsPenEnabled(false);
    setQuestionInputVisible(false);
    setCapturedScreenshot(null);
    setFrozenStepContext(null);
    setErrorMessage(null);
    
    // Clear any drawings
    if ((window as any).__clearCanvasDrawing) {
      (window as any).__clearCanvasDrawing();
    }
    
    // Resume rendering
    sequentialRendererRef.current?.resume();
  };

  const handleDrawingComplete = (drawing: { dataUrl: string; bounds: { x: number; y: number; width: number; height: number } }) => {
    console.log('[CanvasStage] Drawing complete callback received:', drawing.bounds);
    
    // Show input field at the drawing location
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      console.warn('[CanvasStage] No container rect found');
      return;
    }
    
    // CRITICAL FIX: Account for scroll position
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    const viewportY = drawing.bounds.y - scrollTop;
    // Anchor where clarification should appear (bottom of selection)
    selectionAnchorYRef.current = drawing.bounds.y + drawing.bounds.height + 40; // slight margin
    
    // Calculate position relative to visible viewport
    const inputX = Math.min(
      Math.max(drawing.bounds.x + drawing.bounds.width / 2 - 160, 20),
      size.w - 340
    );
    const inputY = Math.max(viewportY - 120, 80); // Below toolbar, viewport-relative
    
    console.log('[CanvasStage] ===== INPUT POSITIONING DEBUG =====');
    console.log('[CanvasStage] Drawing bounds:', drawing.bounds);
    console.log('[CanvasStage] Container rect:', containerRect);
    console.log('[CanvasStage] Scroll top:', scrollTop);
    console.log('[CanvasStage] Viewport Y:', viewportY);
    console.log('[CanvasStage] Calculated position:', { x: inputX, y: inputY });
    console.log('[CanvasStage] Canvas size:', size);
    console.log('[CanvasStage] =====================================');
    
    setQuestionInputPosition({ x: inputX, y: inputY });
    setQuestionInputVisible(true);
    
    console.log('[CanvasStage] ✅ Input state updated: visible=true, position=', { x: inputX, y: inputY });
  };

  const handleQuestionSubmit = async (question: string) => {
    // CRITICAL FIX: Validate inputs
    if (!props.onQuestionSubmit || !props.sessionId) {
      setErrorMessage('Please start a lecture before asking questions.');
      return;
    }
    
    if (!question.trim()) {
      setErrorMessage('Please enter a question before submitting.');
      return;
    }
    
    if (question.length < 5) {
      setErrorMessage('Question too short. Please provide more details.');
      return;
    }
    
    if (question.length > 500) {
      setErrorMessage('Question too long. Please keep it under 500 characters.');
      return;
    }
    
    setIsSubmittingQuestion(true);
    setErrorMessage(null);
    
    try {
      // CRITICAL FIX: Force render completion before screenshot
      if (stageRef.current) {
        stageRef.current.batchDraw();
        // Small delay to ensure all layers rendered
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Capture fresh screenshot with drawings - VIEWPORT ONLY
      let finalScreenshot = capturedScreenshot;
      if (stageRef.current && scrollContainerRef.current) {
        const screenshot = await captureVisibleViewport(stageRef.current, scrollContainerRef.current);
        finalScreenshot = screenshot.dataUrl;
        console.log(`[CanvasStage] Final screenshot captured: ${screenshot.width}x${screenshot.height}`);
      }
      
      // CRITICAL FIX: Use frozen step context
      const stepContext = frozenStepContext || currentStepRef.current || { id: 'unknown', desc: 'Unknown step' };
      
      console.log('[CanvasStage] Submitting with frozen context:', stepContext);
      
      // Submit question with context
      await props.onQuestionSubmit(question, finalScreenshot, {
        stepId: stepContext.id,
        stepDesc: stepContext.desc,
        stepTag: stepContext.tag,
        scrollY: selectionAnchorYRef.current
      });
      
      // Clean up
      handleCancelQuestion();
    } catch (error: any) {
      console.error('[CanvasStage] Failed to submit question:', error);
      
      // CRITICAL FIX: Show error to user
      setErrorMessage(`Failed to submit question: ${error.message || 'Network error'}. Please try again.`);
      setIsSubmittingQuestion(false);
      // DON'T clean up - let user retry
      return;
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleZoomIn = () => {
    console.log('[CanvasStage] Zoom In clicked');
    if (!stageRef.current) {
      console.warn('[CanvasStage] No stage ref for zoom');
      return;
    }
    const oldScale = scaleRef.current || 1;
    const newScale = Math.min(5, oldScale * 1.2);
    console.log(`[CanvasStage] Zooming from ${oldScale} to ${newScale}`);
    stageRef.current.scale({ x: newScale, y: newScale });
    scaleRef.current = newScale;
    stageRef.current.batchDraw();
  };

  const handleZoomOut = () => {
    console.log('[CanvasStage] Zoom Out clicked');
    if (!stageRef.current) {
      console.warn('[CanvasStage] No stage ref for zoom');
      return;
    }
    const oldScale = scaleRef.current || 1;
    const newScale = Math.max(0.3, oldScale / 1.2);
    console.log(`[CanvasStage] Zooming from ${oldScale} to ${newScale}`);
    stageRef.current.scale({ x: newScale, y: newScale });
    scaleRef.current = newScale;
    stageRef.current.batchDraw();
  };

  // Interactive UI overlay for controls
  const overlayStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: size.w,
    height: size.h,
    pointerEvents: 'none' as const,
    zIndex: 100
  }), [size.w, size.h]);

  return (
    <div 
      ref={scrollContainerRef}
      style={{ 
        position: 'relative', 
        border: '2px solid #00ff41', 
        borderRadius: 12, 
        width: size.w,
        height: size.h,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#1a1a2e',
        boxShadow: '0 0 30px rgba(0, 255, 65, 0.3)',
        margin: '0 auto'
      }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: size.w,
          height: 'auto',
          minHeight: size.h,
          background: '#000'
        }} 
      />
      <div ref={overlayRef} style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: size.w, 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 10
      }} />
      
      {/* Interactive UI Overlay - STICKY to canvas viewport */}
      <div style={overlayStyle}>
        {/* Toolbar */}
        <CanvasToolbar
          mode={playbackMode}
          onModeChange={setPlaybackMode}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onNext={() => {
            console.log('[CanvasStage] NEXT button clicked');
            sequentialRendererRef.current?.triggerNext();
          }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          disabled={isQuestionMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => (window as any).__undoCanvasDrawing?.()}
          onRedo={() => (window as any).__redoCanvasDrawing?.()}
        />
        
        {/* Hand Raise Button */}
        <HandRaiseButton
          onClick={handleHandRaise}
          isActive={isQuestionMode}
        />
        
        {/* Question Input */}
        {questionInputVisible && (
          <CanvasQuestionInput
            visible={questionInputVisible}
            position={questionInputPosition}
            onSubmit={handleQuestionSubmit}
            onCancel={handleCancelQuestion}
            onContinueMarking={() => {
              // Hide input, keep pen enabled for more marking
              setQuestionInputVisible(false);
              console.log('[CanvasStage] Continue marking - input hidden, pen still active');
            }}
            isLoading={isSubmittingQuestion}
          />
        )}
        
        {/* Error Message Display */}
        {errorMessage && (
          <div style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            fontWeight: 600,
            fontSize: 14,
            maxWidth: 400,
            textAlign: 'center',
            zIndex: 1001,
            pointerEvents: 'auto',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{ marginBottom: 8 }}>⚠️ {errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      {/* Pen Drawing Layer for Hand Raise (Question Mode) */}
      {stageRef.current && isPenEnabled && (
        <PenDrawingLayer
          stage={stageRef.current}
          enabled={isPenEnabled}
          onDrawingComplete={handleDrawingComplete}
        />
      )}
      
      {/* Pen Drawing Layer for Pencil Tool (General Drawing) */}
      {stageRef.current && isPencilDrawing && !isPenEnabled && (
        <PenDrawingLayer
          stage={stageRef.current}
          enabled={isPencilDrawing}
          onDrawingComplete={() => {
            console.log('[CanvasStage] Pencil drawing complete (no action required)');
            // For general pencil tool, we just let user draw - no question submission
          }}
          onUndoRedoChange={(undo, redo) => {
            setCanUndo(undo);
            setCanRedo(redo);
          }}
        />
      )}
    </div>
  );
});

CanvasStage.displayName = 'CanvasStage';

export default CanvasStage;
