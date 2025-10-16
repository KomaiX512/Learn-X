import React, { useState, useEffect } from 'react';

interface ThinkingAnimationProps {
  visible: boolean;
  stage?: 'initializing' | 'planning' | 'generating' | 'rendering';
  currentStep?: string;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ 
  visible, 
  stage = 'initializing',
  currentStep 
}) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible) return null;
  
  const stageMessages = {
    initializing: 'Initializing AI Engine',
    planning: 'Structuring Lecture Plan',
    generating: 'Generating Visuals',
    rendering: 'Rendering Content'
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Courier New, monospace'
    }}>
      {/* Animated Brain/Neural Network */}
      <div style={{
        position: 'relative',
        width: 200,
        height: 200,
        marginBottom: 40
      }}>
        {/* Pulsing Core */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #00ff41 0%, #00cc33 100%)',
          animation: 'pulse 2s ease-in-out infinite',
          boxShadow: '0 0 30px #00ff41, 0 0 60px #00ff41'
        }} />
        
        {/* Orbiting Nodes */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#00ff41',
              transform: `rotate(${angle}deg) translateY(-80px)`,
              animation: `orbit 3s linear infinite ${i * 0.5}s`,
              boxShadow: '0 0 10px #00ff41'
            }}
          />
        ))}
        
        {/* Connection Lines */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.3
        }}>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 100;
            const y1 = 100;
            const x2 = 100 + Math.sin(rad) * 80;
            const y2 = 100 - Math.cos(rad) * 80;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#00ff41"
                strokeWidth="1"
                style={{ animation: `fadeInOut 2s ease-in-out infinite ${i * 0.3}s` }}
              />
            );
          })}
        </svg>
      </div>
      
      {/* Status Text */}
      <div style={{
        fontSize: 24,
        color: '#00ff41',
        fontWeight: 'bold',
        marginBottom: 16,
        textShadow: '0 0 10px #00ff41',
        letterSpacing: 2
      }}>
        {stageMessages[stage]}{dots}
      </div>
      
      {/* Current Step */}
      {currentStep && (
        <div style={{
          fontSize: 14,
          color: '#00cc33',
          marginBottom: 24,
          maxWidth: 600,
          textAlign: 'center',
          opacity: 0.8
        }}>
          {currentStep}
        </div>
      )}
      
      {/* Progress Bar */}
      <div style={{
        width: 400,
        height: 4,
        background: 'rgba(0, 255, 65, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(0, 255, 65, 0.3)'
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00ff41, #00cc33)',
          animation: 'progressSlide 2s ease-in-out infinite',
          boxShadow: '0 0 10px #00ff41'
        }} />
      </div>
      
      {/* Terminal-style Messages */}
      <div style={{
        marginTop: 40,
        fontSize: 12,
        color: '#00ff41',
        fontFamily: 'Courier New, monospace',
        opacity: 0.6,
        textAlign: 'left'
      }}>
        <div>{'>'} Quantum processor: ACTIVE</div>
        <div>{'>'} Neural networks: SYNCHRONIZED</div>
        <div>{'>'} Knowledge base: CONNECTED</div>
        <div>{'>'} Visual engine: RENDERING...</div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateY(-80px); }
          to { transform: rotate(360deg) translateY(-80px); }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes progressSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};
