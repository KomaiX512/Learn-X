import React from 'react';

interface TopicDisplayProps {
  currentStep?: any;
  totalSteps?: number;
  currentStepIndex?: number;
}

export const TopicDisplay: React.FC<TopicDisplayProps> = ({ 
  currentStep,
  totalSteps = 0,
  currentStepIndex = 0
}) => {
  if (!currentStep) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #00ff41',
      borderRadius: 8,
      padding: '12px 20px',
      maxWidth: 300,
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.2)',
      zIndex: 100,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      {/* Step Counter */}
      <div style={{
        fontSize: 11,
        color: 'rgba(0, 255, 65, 0.6)',
        marginBottom: 6,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>STEP {currentStepIndex + 1}/{totalSteps}</span>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00ff41',
          boxShadow: '0 0 10px #00ff41',
          animation: 'pulse 2s infinite'
        }} />
      </div>
      
      {/* Topic Title */}
      <div style={{
        fontSize: 14,
        color: '#00ff41',
        fontWeight: 'bold',
        lineHeight: 1.4,
        textShadow: '0 0 5px rgba(0, 255, 65, 0.5)'
      }}>
        {'<'}{currentStep.title || currentStep.desc || 'Learning...'}{'/>'}
      </div>
      
      {/* Tag if available */}
      {currentStep.tag && (
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: 'rgba(0, 255, 65, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          [{currentStep.tag}]
        </div>
      )}
      
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};
