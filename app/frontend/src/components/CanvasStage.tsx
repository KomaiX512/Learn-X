import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Konva from 'konva';
import { initRenderer } from '../renderer';
import { SequentialRenderer } from '../renderer/SequentialRenderer';

export interface CanvasStageRef {
  pause: () => void;
  resume: () => void;
  nextStep: () => void;
  previousStep: () => void;
  processChunk: (chunk: any) => void;
}

const CanvasStage = forwardRef<CanvasStageRef>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const sequentialRendererRef = useRef<SequentialRenderer | null>(null);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    pause: () => sequentialRendererRef.current?.pause(),
    resume: () => sequentialRendererRef.current?.resume(),
    nextStep: () => sequentialRendererRef.current?.nextStep(),
    previousStep: () => sequentialRendererRef.current?.previousStep(),
    processChunk: (chunk: any) => sequentialRendererRef.current?.processChunk(chunk)
  }));
  // Fixed aspect ratio canvas dimensions
  const ASPECT_RATIO = 16 / 10; // 16:10 aspect ratio
  const MIN_WIDTH = 800;
  const MIN_HEIGHT = 500;
  const MAX_WIDTH = 1400;
  const MAX_HEIGHT = 875;
  const [size, setSize] = useState({ w: MIN_WIDTH, h: MIN_HEIGHT });

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

  // Initialize stage when both container and size are ready
  useEffect(() => {
    // Clean up previous stage if it exists
    if (stageRef.current) {
      console.log('[CanvasStage] Cleaning up previous stage');
      if (sequentialRendererRef.current) {
        sequentialRendererRef.current.cleanup?.();
      }
      stageRef.current.destroy();
      stageRef.current = null;
      sequentialRendererRef.current = null;
      delete (window as any).sequentialRenderer;
    }

    // Check prerequisites
    if (!containerRef.current || !overlayRef.current) {
      console.log('[CanvasStage] Container not ready');
      return;
    }
    if (size.w === 0 || size.h === 0) {
      console.log('[CanvasStage] Size not set yet');
      return;
    }

    console.log('[CanvasStage] Creating Konva stage');
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
        
        // Create a layer and add a test circle
        const layer = new Konva.Layer();
        const testCircle = new Konva.Circle({
          x: size.w / 2,
          y: size.h / 2,
          radius: 30,
          fill: 'blue',
          stroke: 'black',
          strokeWidth: 2
        });
        layer.add(testCircle);
        stage.add(layer);
        layer.draw();
        
        console.log('[CanvasStage] Test circle added');
        console.log('[CanvasStage] Canvas element exists:', !!document.querySelector(`#${containerId} canvas`));
        
        // Initialize sequential renderer for optimized playback
        sequentialRendererRef.current = new SequentialRenderer({
          canvasId: containerId,
          width: size.w,
          height: size.h,
          onStepComplete: (stepId) => {
            console.log(`[CanvasStage] Step ${stepId} complete`);
          },
          onProgress: (progress) => {
            console.log(`[CanvasStage] Progress: ${progress}%`);
          }
        });
        
        (window as any).sequentialRenderer = sequentialRendererRef.current;
        
        // Also initialize standard renderer for compatibility
        initRenderer(stage, overlayRef.current);
        
        console.log('[CanvasStage] Sequential renderer initialized');
        
        // Force initial draw to ensure canvas is visible
        stage.batchDraw();
        console.log('[CanvasStage] Initial draw complete');
      } catch (error) {
        console.error('[CanvasStage] Failed to create stage:', error);
      }
    }, 100); // Small delay to ensure DOM is ready
  }, [size.w, size.h]); // Re-run when size changes

  // Apply size updates to existing stage without recreating
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.width(size.w);
      stageRef.current.height(size.h);
    }
  }, [size.w, size.h]);

  return (
    <div 
      ref={scrollContainerRef}
      style={{ 
        position: 'relative', 
        border: '2px solid #e0e0e0', 
        borderRadius: 12, 
        width: size.w,
        height: size.h,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        margin: '0 auto'
      }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: size.w, 
          minHeight: size.h,
          background: 'white'
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
