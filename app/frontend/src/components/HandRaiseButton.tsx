/**
 * Hand Raise Button Component
 * Bottom-right button to interrupt and ask questions
 */

import React from 'react';

interface HandRaiseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function HandRaiseButton({ onClick, disabled = false, isActive = false }: HandRaiseButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 70,
        height: 70,
        borderRadius: '50%',
        border: `3px solid ${isActive ? '#f59e0b' : '#00ff41'}`,
        background: isActive 
          ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(0, 255, 65, 0.2)',
        color: isActive ? '#f59e0b' : '#00ff41',
        fontSize: 28,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: isActive
          ? '0 0 30px rgba(245, 158, 11, 0.6)'
          : '0 0 30px rgba(0, 255, 65, 0.4)',
        transition: 'all 0.3s ease',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
        pointerEvents: 'auto'
      }}
      title={isActive ? 'Click to cancel question mode' : 'Raise hand to ask a question'}
    >
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
            }
            50% {
              box-shadow: 0 0 50px rgba(245, 158, 11, 0.9);
            }
          }
        `}
      </style>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
      </svg>
    </button>
  );
}
