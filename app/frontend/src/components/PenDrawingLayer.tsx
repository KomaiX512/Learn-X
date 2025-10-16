/**
 * Pen Drawing Layer
 * Allows user to draw/highlight areas on canvas when in question mode
 */

import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';

interface PenDrawingLayerProps {
  stage: Konva.Stage;
  enabled: boolean;
  onDrawingComplete?: (drawing: { dataUrl: string; bounds: { x: number; y: number; width: number; height: number } }) => void;
  onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export function PenDrawingLayer({ stage, enabled, onDrawingComplete, onUndoRedoChange }: PenDrawingLayerProps) {
  const drawingLayerRef = useRef<Konva.Layer | null>(null);
  const currentLineRef = useRef<Konva.Line | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [bounds, setBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const drawingHistoryRef = useRef<Konva.Line[]>([]);
  const redoStackRef = useRef<Konva.Line[]>([]);

  useEffect(() => {
    if (!stage || !enabled) {
      // Clean up drawing layer when disabled
      if (drawingLayerRef.current) {
        drawingLayerRef.current.destroy();
        drawingLayerRef.current = null;
        stage.batchDraw();
      }
      return;
    }

    // Create drawing layer with high z-index
    const drawingLayer = new Konva.Layer({ 
      name: 'drawing-layer',
      listening: true  // Ensure it receives events
    });
    stage.add(drawingLayer);
    drawingLayer.moveToTop();  // Move to top of all layers
    drawingLayer.setZIndex(9999);  // Ensure it's on top
    drawingLayerRef.current = drawingLayer;
    
    console.log('[PenDrawingLayer] Drawing layer created, zIndex:', drawingLayer.getZIndex());

    // Mouse handlers for drawing
    const handleMouseDown = (e: any) => {
      if (!enabled || !drawingLayerRef.current) return;
      
      isDrawingRef.current = true;
      const pos = stage.getPointerPosition();
      if (!pos) {
        console.warn('[PenDrawingLayer] No pointer position on mousedown');
        return;
      }
      
      console.log('[PenDrawingLayer] Starting drawing at:', pos);

      currentLineRef.current = new Konva.Line({
        stroke: '#f59e0b',
        strokeWidth: 4,
        globalCompositeOperation: 'source-over',
        lineCap: 'round',
        lineJoin: 'round',
        points: [pos.x, pos.y, pos.x, pos.y],
        opacity: 0.8
      });

      drawingLayerRef.current.add(currentLineRef.current);
      drawingLayer.batchDraw();
      console.log('[PenDrawingLayer] Line added to layer, children count:', drawingLayerRef.current.children?.length);
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawingRef.current || !currentLineRef.current || !enabled) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const newPoints = currentLineRef.current.points().concat([pos.x, pos.y]);
      currentLineRef.current.points(newPoints);
      drawingLayerRef.current?.batchDraw();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !enabled) return;
      
      isDrawingRef.current = false;

      // Add completed line to history
      if (currentLineRef.current) {
        drawingHistoryRef.current.push(currentLineRef.current);
        redoStackRef.current = []; // Clear redo stack on new drawing
        updateUndoRedoState();
      }

      // Calculate bounds of all drawings and trigger callback immediately
      if (drawingLayerRef.current && onDrawingComplete) {
        const children = drawingLayerRef.current.children;
        if (children.length > 0) {
          const clientRect = drawingLayerRef.current.getClientRect();
          const calculatedBounds = {
            x: clientRect.x,
            y: clientRect.y,
            width: clientRect.width,
            height: clientRect.height
          };
          setBounds(calculatedBounds);
          
          // Trigger callback immediately after drawing
          console.log('[PenDrawingLayer] Drawing complete, triggering callback with bounds:', calculatedBounds);
          onDrawingComplete({
            dataUrl: '', // Not needed for input positioning
            bounds: calculatedBounds
          });
        }
      }
    };

    const updateUndoRedoState = () => {
      if (onUndoRedoChange) {
        onUndoRedoChange(
          drawingHistoryRef.current.length > 0,
          redoStackRef.current.length > 0
        );
      }
    };

    // Attach handlers
    stage.on('mousedown touchstart', handleMouseDown);
    stage.on('mousemove touchmove', handleMouseMove);
    stage.on('mouseup touchend', handleMouseUp);

    // Change cursor to pen
    const container = stage.container();
    if (container) {
      container.style.cursor = 'crosshair';
    }

    // Cleanup
    return () => {
      stage.off('mousedown touchstart', handleMouseDown);
      stage.off('mousemove touchmove', handleMouseMove);
      stage.off('mouseup touchend', handleMouseUp);
      
      if (container) {
        container.style.cursor = 'default';
      }

      if (drawingLayerRef.current) {
        drawingLayerRef.current.destroy();
        drawingLayerRef.current = null;
        stage.batchDraw();
      }
    };
  }, [stage, enabled]);

  // Clear drawing
  const clearDrawing = () => {
    if (drawingLayerRef.current) {
      drawingLayerRef.current.destroyChildren();
      drawingLayerRef.current.batchDraw();
      setBounds(null);
    }
  };

  // Undo last drawing
  const undo = () => {
    if (drawingHistoryRef.current.length === 0) return;
    
    const lastLine = drawingHistoryRef.current.pop();
    if (lastLine && drawingLayerRef.current) {
      redoStackRef.current.push(lastLine);
      lastLine.remove();
      drawingLayerRef.current.batchDraw();
      console.log('[PenDrawingLayer] Undo - History:', drawingHistoryRef.current.length, 'Redo:', redoStackRef.current.length);
    }
    if (onUndoRedoChange) {
      onUndoRedoChange(
        drawingHistoryRef.current.length > 0,
        redoStackRef.current.length > 0
      );
    }
  };

  // Redo last undone drawing
  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    
    const lineToRedo = redoStackRef.current.pop();
    if (lineToRedo && drawingLayerRef.current) {
      drawingHistoryRef.current.push(lineToRedo);
      drawingLayerRef.current.add(lineToRedo);
      drawingLayerRef.current.batchDraw();
      console.log('[PenDrawingLayer] Redo - History:', drawingHistoryRef.current.length, 'Redo:', redoStackRef.current.length);
    }
    if (onUndoRedoChange) {
      onUndoRedoChange(
        drawingHistoryRef.current.length > 0,
        redoStackRef.current.length > 0
      );
    }
  };

  // CRITICAL FIX: Expose methods with proper dependency
  useEffect(() => {
    (window as any).__clearCanvasDrawing = clearDrawing;
    (window as any).__undoCanvasDrawing = undo;
    (window as any).__redoCanvasDrawing = redo;
    return () => {
      delete (window as any).__clearCanvasDrawing;
      delete (window as any).__undoCanvasDrawing;
      delete (window as any).__redoCanvasDrawing;
    };
  }, [clearDrawing, undo, redo]);

  return null; // This is a logical component, no DOM rendering
}
