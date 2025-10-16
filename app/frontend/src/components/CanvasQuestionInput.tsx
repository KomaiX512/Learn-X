/**
 * Canvas Question Input
 * Minimalist input field that appears on canvas when user highlights an area
 */

import React, { useState, useRef, useEffect } from 'react';

interface CanvasQuestionInputProps {
  visible: boolean;
  position: { x: number; y: number };
  onSubmit: (question: string) => void;
  onCancel: () => void;
  onContinueMarking?: () => void;
  isLoading?: boolean;
}

export function CanvasQuestionInput({
  visible,
  position,
  onSubmit,
  onCancel,
  onContinueMarking,
  isLoading = false
}: CanvasQuestionInputProps) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const handleSubmit = () => {
    if (question.trim() && !isLoading) {
      onSubmit(question.trim());
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!visible) {
    console.log('[CanvasQuestionInput] Not rendering - visible is false');
    return null;
  }
  
  console.log('[CanvasQuestionInput] Rendering at position:', position);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        background: 'rgba(26, 26, 46, 0.98)',
        border: '3px solid #a0f542',  // Thicker border for debugging
        borderRadius: 12,
        padding: 12,
        minWidth: 320,
        maxWidth: 450,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
        animation: 'slideUp 0.3s ease-out',
        pointerEvents: 'auto'
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div style={{ marginBottom: 8, fontSize: 12, color: '#a0f542', fontWeight: 600 }}>
        💭 Ask about this visual
      </div>

      <input
        ref={inputRef}
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="What's your question?"
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(160, 245, 66, 0.3)',
          borderRadius: 8,
          outline: 'none',
          marginBottom: 10
        }}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#a0f542',
            border: '1px solid rgba(160, 245, 66, 0.3)',
            borderRadius: 6,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {onContinueMarking && (
            <button
              onClick={() => {
                onContinueMarking();
                setQuestion('');
              }}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 6,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              ✏️ Mark More
            </button>
          )}
          <button
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 700,
            background: question.trim() && !isLoading ? '#a0f542' : 'rgba(160, 245, 66, 0.3)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: 6,
            cursor: question.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                border: '2px solid rgba(26, 26, 46, 0.3)',
                borderTopColor: '#1a1a2e',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Asking...
            </>
          ) : (
            <>✨ Ask</>
          )}
        </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
