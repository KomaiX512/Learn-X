import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { initRenderer } from '../renderer';

export default function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });

  // Window resize handler: updates size state only
  useEffect(() => {
    function handleResize() {
      const w = Math.min(window.innerWidth - 40, 1000);
      const h = Math.min(window.innerHeight - 200, 700);
      setSize({ w: Math.max(600, w), h: Math.max(400, h) });
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
    initRenderer(stage, overlayRef.current);

    return () => {
      stage.destroy();
      stageRef.current = null;
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
    <div style={{ position: 'relative', border: '1px solid #ddd', borderRadius: 8, overflowY: 'auto', height: size.h }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div ref={overlayRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  );
}
