import React, { useState, useEffect } from 'react';

interface InlineProgressBarProps {
  visible: boolean;
  totalSteps: number;
  completedSteps: number;
  estimatedTimeRemaining?: string;
}

export const InlineProgressBar: React.FC<InlineProgressBarProps> = ({
  visible,
  totalSteps,
  completedSteps,
  estimatedTimeRemaining
}) => {
  const [shimmerOffset, setShimmerOffset] = useState(0);
  
  const progressPercent = totalSteps > 0 
    ? Math.round((completedSteps / totalSteps) * 100) 
    : 0;
  
  // Shimmer animation
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setShimmerOffset(prev => (prev + 2) % 100);
    }, 30);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <div style={{
      marginTop: 16,
      padding: '16px 20px',
      background: 'rgba(0, 255, 65, 0.03)',
      border: '1px solid rgba(0, 255, 65, 0.2)',
      borderRadius: 12,
      backdropFilter: 'blur(10px)',
      animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 65, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#00ff41',
          letterSpacing: '0.5px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Courier New", monospace'
        }}>
          {progressPercent === 100 ? '✓ Generation Complete' : '◉ Generating Content'}
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(0, 255, 65, 0.7)',
          fontWeight: '500',
          fontFamily: 'Courier New, monospace'
        }}>
          {estimatedTimeRemaining || '~4 min'}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: 8,
        background: 'rgba(0, 255, 65, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid rgba(0, 255, 65, 0.15)',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Progress Fill */}
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #00ff41 0%, #00cc33 100%)',
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
          overflow: 'hidden'
        }}>
          {/* Shimmer effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent ${shimmerOffset}%, rgba(255, 255, 255, 0.4) ${shimmerOffset + 10}%, transparent ${shimmerOffset + 20}%)`,
          }} />
        </div>
      </div>
      
      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        fontSize: 11,
        color: 'rgba(0, 255, 65, 0.6)',
        fontWeight: '500'
      }}>
        <div>
          <span style={{ color: '#00ff41', fontWeight: '600' }}>{completedSteps}</span>
          <span style={{ opacity: 0.6 }}> of {totalSteps}</span>
          <span style={{ opacity: 0.5, marginLeft: 4 }}>steps generated</span>
        </div>
        <div style={{
          fontSize: 16,
          color: '#00ff41',
          fontWeight: '600'
        }}>
          {progressPercent}%
        </div>
      </div>
      
      <style>{`
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
      `}</style>
    </div>
  );
};
