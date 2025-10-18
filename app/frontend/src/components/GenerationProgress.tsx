import React, { useState, useEffect, useMemo } from 'react';

interface GenerationProgressProps {
  visible: boolean;
  phase: 'starting' | 'generating' | 'complete';
  totalSteps: number;
  completedSteps: number;
  currentStepMessage?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  visible,
  phase,
  totalSteps,
  completedSteps,
  currentStepMessage
}) => {
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());
  const [shimmerOffset, setShimmerOffset] = useState(0);
  
  // Calculate progress percentage
  const progressPercent = totalSteps > 0 
    ? Math.round((completedSteps / totalSteps) * 100) 
    : 0;
  
  // Estimate time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (completedSteps === 0 || phase === 'starting') {
      return '~4 min';
    }
    
    const avgTimePerStep = elapsedTime / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    const estimatedSeconds = Math.ceil((avgTimePerStep * remainingSteps) / 1000);
    
    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds}s`;
    } else {
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = estimatedSeconds % 60;
      return seconds > 0 ? `~${minutes}m ${seconds}s` : `~${minutes}m`;
    }
  }, [elapsedTime, completedSteps, totalSteps, phase]);
  
  // Animated dots
  useEffect(() => {
    if (!visible || phase === 'complete') return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    
    return () => clearInterval(interval);
  }, [visible, phase]);
  
  // Elapsed time tracker
  useEffect(() => {
    if (!visible || phase === 'complete') return;
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, phase, startTime]);
  
  // Shimmer animation
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setShimmerOffset(prev => (prev + 1) % 100);
    }, 30);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible) return null;
  
  const phaseMessages = {
    starting: 'Initializing Generation Engine',
    generating: 'Creating Your Content',
    complete: 'Complete'
  };
  
  const phaseDescriptions = {
    starting: 'Warming up AI models and preparing your lecture...',
    generating: 'Crafting visuals, animations, and interactive content...',
    complete: 'Your lecture is ready!'
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.98) 100%)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Courier New", monospace',
      animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      
      {/* Floating Particles Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity: 0.15
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              borderRadius: '50%',
              background: '#00ff41',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: '0 0 10px #00ff41'
            }}
          />
        ))}
      </div>
      
      {/* Main Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 600,
        padding: '0 40px'
      }}>
        
        {/* Central Animated Logo/Icon */}
        <div style={{
          position: 'relative',
          width: 120,
          height: 120,
          marginBottom: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Outer Ring - Rotating */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#00ff41',
            borderRightColor: '#00ff41',
            animation: 'spin 3s linear infinite',
            boxShadow: '0 0 30px rgba(0, 255, 65, 0.3)'
          }} />
          
          {/* Middle Ring - Counter Rotating */}
          <div style={{
            position: 'absolute',
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            border: '2px solid transparent',
            borderBottomColor: '#00cc33',
            borderLeftColor: '#00cc33',
            animation: 'spinReverse 2s linear infinite',
            boxShadow: '0 0 20px rgba(0, 204, 51, 0.2)'
          }} />
          
          {/* Inner Core - Pulsing */}
          <div style={{
            position: 'absolute',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00ff41 0%, #00cc33 100%)',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(0, 255, 65, 0.6), inset 0 0 20px rgba(0, 255, 65, 0.8)'
          }} />
          
          {/* Progress Percentage in Center */}
          <div style={{
            position: 'relative',
            fontSize: 22,
            fontWeight: '700',
            color: '#000',
            zIndex: 1,
            textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          }}>
            {progressPercent}%
          </div>
        </div>
        
        {/* Phase Title */}
        <div style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#00ff41',
          marginBottom: 12,
          textAlign: 'center',
          letterSpacing: '-0.5px',
          textShadow: '0 0 20px rgba(0, 255, 65, 0.4)'
        }}>
          {phaseMessages[phase]}{phase !== 'complete' && dots}
        </div>
        
        {/* Phase Description */}
        <div style={{
          fontSize: 14,
          color: 'rgba(0, 255, 65, 0.6)',
          marginBottom: 30,
          textAlign: 'center',
          lineHeight: 1.5,
          fontWeight: '400'
        }}>
          {phaseDescriptions[phase]}
        </div>
        
        {/* Progress Bar Container */}
        <div style={{
          width: '100%',
          maxWidth: 500,
          marginBottom: 20
        }}>
          {/* Progress Track */}
          <div style={{
            width: '100%',
            height: 6,
            background: 'rgba(0, 255, 65, 0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(0, 255, 65, 0.2)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Progress Fill */}
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #00ff41 0%, #00cc33 100%)',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              boxShadow: '0 0 15px rgba(0, 255, 65, 0.6)',
              overflow: 'hidden'
            }}>
              {/* Shimmer effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) ${shimmerOffset}%, transparent ${shimmerOffset + 20}%)`,
                animation: 'shimmer 2s ease-in-out infinite'
              }} />
            </div>
          </div>
          
          {/* Progress Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            fontSize: 13,
            color: 'rgba(0, 255, 65, 0.7)',
            fontWeight: '500'
          }}>
            <div>
              <span style={{ color: '#00ff41' }}>{completedSteps}</span>
              <span style={{ opacity: 0.5 }}> / {totalSteps} steps</span>
            </div>
            <div style={{
              color: '#00ff41',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '0.5px'
            }}>
              {estimatedTimeRemaining}
            </div>
          </div>
        </div>
        
        {/* Current Step Message */}
        {currentStepMessage && (
          <div style={{
            marginTop: 25,
            padding: '14px 24px',
            background: 'rgba(0, 255, 65, 0.05)',
            border: '1px solid rgba(0, 255, 65, 0.2)',
            borderRadius: 12,
            fontSize: 13,
            color: 'rgba(0, 255, 65, 0.8)',
            textAlign: 'center',
            maxWidth: 450,
            fontWeight: '400',
            lineHeight: 1.5,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}>
            {currentStepMessage}
          </div>
        )}
        
        {/* Quality Indicators */}
        <div style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: '100%',
          maxWidth: 500
        }}>
          {[
            { label: 'AI Models', icon: '🧠', status: phase !== 'starting' },
            { label: 'Visuals', icon: '🎨', status: completedSteps > 0 },
            { label: 'Quality', icon: '✨', status: progressPercent > 50 }
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '12px 8px',
                background: item.status 
                  ? 'rgba(0, 255, 65, 0.08)' 
                  : 'rgba(0, 255, 65, 0.03)',
                border: `1px solid ${item.status ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.1)'}`,
                borderRadius: 10,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: item.status 
                  ? '0 0 15px rgba(0, 255, 65, 0.15)' 
                  : 'none'
              }}
            >
              <div style={{ 
                fontSize: 24,
                filter: item.status ? 'none' : 'grayscale(1) opacity(0.3)',
                transition: 'all 0.5s ease'
              }}>
                {item.icon}
              </div>
              <div style={{
                fontSize: 11,
                color: item.status ? '#00ff41' : 'rgba(0, 255, 65, 0.4)',
                fontWeight: '600',
                letterSpacing: '0.5px',
                transition: 'all 0.5s ease'
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Motivational Text */}
        <div style={{
          marginTop: 45,
          fontSize: 12,
          color: 'rgba(0, 255, 65, 0.4)',
          textAlign: 'center',
          fontStyle: 'italic',
          maxWidth: 400,
          lineHeight: 1.6
        }}>
          "We're crafting something extraordinary for you. Every visual, every animation, every detail — designed to make learning unforgettable."
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.15); 
            opacity: 0.85; 
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-50px) translateX(30px); 
            opacity: 0.8;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};
