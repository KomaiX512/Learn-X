import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Konva from 'konva';
import { SequentialRenderer } from '../renderer/SequentialRenderer';

export interface CanvasStageRef {
  pause: () => void;
  resume: () => void;
  nextStep: () => void;
  previousStep: () => void;
  processChunk: (chunk: any) => void;
  getStage: () => Konva.Stage | null;
  getContainer: () => HTMLDivElement | null;
}

interface CanvasStageProps {
  onVisualStart?: (index: number, action: any) => void;
  onVisualComplete?: (index: number, action: any) => void;
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
    if (chunk && typeof chunk.stepId !== 'undefined') {
      if (lastStepIdRef.current !== chunk.stepId) {
        lastStepIdRef.current = chunk.stepId;
        visualCounterRef.current = 0;
      }
      // Initialize expected step to first received stepId for robust ordering
      if (expectedStepIdRef.current === null) {
        expectedStepIdRef.current = Number(chunk.stepId);
      }
      const sId = Number(chunk.stepId);
      // Buffer out-of-order steps or if a step is currently rendering
      if (sId !== expectedStepIdRef.current || isRenderingRef.current) {
        stepBufferRef.current[sId] = chunk;
        console.log(`[CanvasStage] 📦 Buffered step ${sId} (expected ${expectedStepIdRef.current})`);
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
    processChunk: (chunk: any) => routeChunk(chunk),
    getStage: () => stageRef.current,
    getContainer: () => scrollContainerRef.current
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
            if (expectedStepIdRef.current !== null) {
              expectedStepIdRef.current = (expectedStepIdRef.current || 0) + 1;
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

  // Apply size updates to existing stage WITHOUT recreating
  useEffect(() => {
    if (stageRef.current) {
      console.log('[CanvasStage] Updating stage size:', size.w, 'x', size.h);
      stageRef.current.width(size.w);
      stageRef.current.height(size.h);
      stageRef.current.batchDraw();
    }
  }, [size.w, size.h]);

  return (
    <div 
      ref={scrollContainerRef}
      style={{ 
        position: 'relative', 
        border: '2px solid #2d2d44', 
        borderRadius: 12, 
        width: size.w,
        height: size.h,
        overflowY: 'auto',  // Enable vertical scrolling for stacked visuals
        overflowX: 'hidden',  // Disable horizontal (canvas width is fixed)
        background: '#1a1a2e',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        margin: '0 auto'
      }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: size.w,
          height: 'auto',  // Let canvas grow vertically with content
          minHeight: size.h,
          background: '#1a1a2e'
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
    </div>
  );
});

CanvasStage.displayName = 'CanvasStage';

export default CanvasStage;
