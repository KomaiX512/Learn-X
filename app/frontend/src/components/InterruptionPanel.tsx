/**
 * InterruptionPanel
 * Displays when student interrupts lecture to ask a question
 */

import React, { useState, useRef, useEffect } from 'react';

export interface InterruptionPanelProps {
  visible: boolean;
  currentStep: string;
  screenshot: string | null;
  onSubmitQuestion: (question: string, screenshot: string | null) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export function InterruptionPanel({
  visible,
  currentStep,
  screenshot,
  onSubmitQuestion,
  onCancel,
  isGenerating
}: InterruptionPanelProps) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const handleSubmit = () => {
    if (question.trim()) {
      onSubmitQuestion(question, screenshot);
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 8,
        padding: 16,
        marginTop: 12,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>💭</span>
          Ask a Question
        </h4>
        <button
          onClick={onCancel}
          disabled={isGenerating}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            width: 28,
            height: 28,
            borderRadius: 14,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isGenerating ? 0.5 : 1
          }}
        >
          ×
        </button>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.15)', borderRadius: 6, padding: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 4 }}>
          <strong>Current Step:</strong> {currentStep}
        </div>
        {screenshot && (
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📸</span>
            <span>Canvas screenshot attached</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          placeholder="What would you like to clarify? (Ctrl+Enter to submit)"
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: 6,
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.95)',
            resize: 'vertical',
            outline: 'none',
            opacity: isGenerating ? 0.6 : 1
          }}
        />

        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
            {screenshot ? (
              <span>💡 Double-click canvas to update screenshot</span>
            ) : (
              <span>💡 Double-click canvas to attach a screenshot</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCancel}
              disabled={isGenerating}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: 6,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14,
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || isGenerating}
              style={{
                padding: '8px 16px',
                background: question.trim() && !isGenerating ? 'white' : 'rgba(255, 255, 255, 0.3)',
                color: question.trim() && !isGenerating ? '#764ba2' : 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: 6,
                cursor: question.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Ask Question
                </>
              )}
            </button>
          </div>
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
