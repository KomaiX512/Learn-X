import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { initRenderer } from '../renderer';
import { EnhancedRenderer } from '../renderer/EnhancedRenderer';

export default function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const enhancedRendererRef = useRef<EnhancedRenderer | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });

  // Window resize handler: updates size state only
  useEffect(() => {
    function handleResize() {
      const w = Math.min(window.innerWidth - 40, 1200);
      const h = Math.min(window.innerHeight - 200, 800);
      setSize({ w: Math.max(800, w), h: Math.max(600, h) });
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
    <div style={{ 
      position: 'relative', 
      border: '1px solid #ddd', 
      borderRadius: 8, 
      height: size.h,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'linear-gradient(to bottom, #fafafa, #ffffff)'
    }}>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100%' }} />
      <div ref={overlayRef} style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 10
      }} />
    </div>
  );
}
