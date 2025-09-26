import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { initRenderer } from '../renderer';
import { EnhancedRenderer } from '../renderer/EnhancedRenderer';

export default function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const enhancedRendererRef = useRef<EnhancedRenderer | null>(null);
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

  // Initialize stage once on mount; destroy on unmount
  useEffect(() => {
    if (!containerRef.current || !overlayRef.current) return;
    if (stageRef.current) return; // already initialized

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: size.w,
      height: size.h
    });
    stageRef.current = stage;
    
    // Initialize both renderers
    initRenderer(stage, overlayRef.current);
    enhancedRendererRef.current = new EnhancedRenderer(stage, overlayRef.current);
    
    // Export enhanced renderer for external use
    (window as any).enhancedRenderer = enhancedRendererRef.current;

    return () => {
      if (enhancedRendererRef.current) {
        enhancedRendererRef.current.cleanup();
      }
      stage.destroy();
      stageRef.current = null;
      enhancedRendererRef.current = null;
      delete (window as any).enhancedRenderer;
    };
  }, []);

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
}
