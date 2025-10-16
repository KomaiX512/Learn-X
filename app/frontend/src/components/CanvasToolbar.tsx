/**
 * Canvas Toolbar Component
 * Top toolbar with playback controls and canvas tools
 */

import React from 'react';

export type PlaybackMode = 'auto' | 'manual';
export type CanvasTool = 'select' | 'pan' | 'zoom';

interface CanvasToolbarProps {
  mode: PlaybackMode;
  onModeChange: (mode: PlaybackMode) => void;
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  disabled?: boolean;
}

export function CanvasToolbar({
  mode,
  onModeChange,
  activeTool,
  onToolChange,
  onNext,
  onZoomIn,
  onZoomOut,
  disabled = false
}: CanvasToolbarProps) {
  const buttonStyle = (isActive: boolean) => ({
    padding: '6px 16px',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Courier New, monospace',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: isActive ? '#00ff41' : 'transparent',
    color: isActive ? '#000' : '#00ff41',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1
  });

  const toolButtonStyle = (isActive: boolean) => ({
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.1)',
    color: isActive ? '#000' : '#00ff41',
    transition: 'all 0.2s ease',
    fontSize: 20,
    opacity: disabled ? 0.5 : 1
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 150,
        pointerEvents: 'auto'
      }}
    >
      {/* Left: Playback Mode Controls */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #00ff41',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 255, 65, 0.3)'
        }}
      >
        <button
          onClick={() => !disabled && onModeChange('auto')}
          disabled={disabled}
          style={buttonStyle(mode === 'auto')}
        >
          AUTO
        </button>
        <button
          onClick={() => !disabled && onModeChange('manual')}
          disabled={disabled}
          style={buttonStyle(mode === 'manual')}
        >
          MANUAL
        </button>
        {mode === 'manual' && (
          <button
            onClick={() => !disabled && onNext()}
            disabled={disabled}
            style={{
              ...buttonStyle(false),
              borderLeft: '1px solid rgba(0, 255, 65, 0.3)',
              paddingLeft: 20,
              paddingRight: 20
            }}
          >
            NEXT →
          </button>
        )}
      </div>

      {/* Right: Canvas Tools */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: 'rgba(0, 0, 0, 0.95)',
          padding: '6px 8px',
          borderRadius: 12,
          border: '2px solid rgba(0, 255, 65, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 255, 65, 0.2)'
        }}
      >
        {/* Zoom Out */}
        <button
          onClick={() => !disabled && onZoomOut()}
          disabled={disabled}
          style={toolButtonStyle(false)}
          title="Zoom Out (Ctrl+Wheel)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        {/* Zoom In */}
        <button
          onClick={() => !disabled && onZoomIn()}
          disabled={disabled}
          style={toolButtonStyle(false)}
          title="Zoom In (Ctrl+Wheel)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        {/* Pan Tool */}
        <button
          onClick={() => !disabled && onToolChange('pan')}
          disabled={disabled}
          style={toolButtonStyle(activeTool === 'pan')}
          title="Pan Canvas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 9v6m14-6v6"/>
            <path d="M12 3v18"/>
            <path d="m9 6-3 3 3 3m6-6 3 3-3 3"/>
          </svg>
        </button>

        {/* Select Tool */}
        <button
          onClick={() => !disabled && onToolChange('select')}
          disabled={disabled}
          style={toolButtonStyle(activeTool === 'select')}
          title="Selection Tool"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
