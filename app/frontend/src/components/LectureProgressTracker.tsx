import React, { useState, useEffect } from 'react';

export interface VisualProgress {
  id: string;
  name: string;
  type: 'notes' | 'visual';
  status: 'pending' | 'in-progress' | 'completed';
  progress: number; // 0-100
}

export interface StepProgress {
  stepId: number;
  stepTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  visuals: VisualProgress[];
  totalActions: number;
  completedActions: number;
}

interface LectureProgressTrackerProps {
  visible: boolean;
  steps: StepProgress[];
  currentStepId: number | null;
  currentVisualId: string | null;
  estimatedTimeRemaining?: number; // in seconds
}

export const LectureProgressTracker: React.FC<LectureProgressTrackerProps> = ({
  visible,
  steps,
  currentStepId,
  currentVisualId,
  estimatedTimeRemaining
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => 
    s.visuals.every(v => v.status === 'completed')
  ).length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 100,
      width: collapsed ? 60 : 320,
      height: 'calc(100vh - 100px)',
      background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%)',
      borderRight: '2px solid rgba(0, 255, 65, 0.3)',
      borderTop: '1px solid rgba(0, 255, 65, 0.2)',
      boxShadow: '0 0 30px rgba(0, 255, 65, 0.2)',
      zIndex: 100,
      overflow: 'hidden',
      transition: 'width 0.3s ease',
      fontFamily: 'Courier New, monospace'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 255, 65, 0.05)'
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#00ff41',
              marginBottom: 4,
              letterSpacing: 1
            }}>
              LECTURE PROGRESS
            </div>
            <div style={{
              fontSize: 10,
              color: 'rgba(0, 255, 65, 0.6)'
            }}>
              {completedSteps} / {totalSteps} Steps
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(0, 255, 65, 0.5)',
            color: '#00ff41',
            width: 28,
            height: 28,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 65, 0.2)';
            e.currentTarget.style.borderColor = '#00ff41';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 65, 0.5)';
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Overall Progress Bar */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(0, 255, 65, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6
            }}>
              <span style={{ fontSize: 10, color: 'rgba(0, 255, 65, 0.7)' }}>
                OVERALL
              </span>
              <span style={{ fontSize: 10, color: '#00ff41', fontWeight: 'bold' }}>
                {overallProgress.toFixed(0)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'rgba(0, 255, 65, 0.1)',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid rgba(0, 255, 65, 0.3)'
            }}>
              <div style={{
                width: `${overallProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00ff41, #00cc33)',
                transition: 'width 0.3s ease',
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)'
              }} />
            </div>
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <div style={{
                fontSize: 9,
                color: 'rgba(0, 255, 65, 0.5)',
                marginTop: 4,
                textAlign: 'center'
              }}>
                ~{Math.ceil(estimatedTimeRemaining / 60)}min remaining
              </div>
            )}
          </div>

          {/* Steps List */}
          <div style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            height: 'calc(100% - 140px)',
            padding: '8px 0'
          }}>
            {steps.map((step, stepIndex) => (
              <StepProgressItem
                key={step.stepId}
                step={step}
                isActive={step.stepId === currentStepId}
                currentVisualId={currentVisualId}
                stepNumber={stepIndex + 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface StepProgressItemProps {
  step: StepProgress;
  isActive: boolean;
  currentVisualId: string | null;
  stepNumber: number;
}

const StepProgressItem: React.FC<StepProgressItemProps> = ({
  step,
  isActive,
  currentVisualId,
  stepNumber
}) => {
  const [expanded, setExpanded] = useState(isActive);

  // Auto-expand when step becomes active
  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  const completedVisuals = step.visuals.filter(v => v.status === 'completed').length;
  const totalVisuals = step.visuals.length;
  const stepProgress = totalVisuals > 0 ? (completedVisuals / totalVisuals) * 100 : 0;

  const difficultyColor = {
    easy: '#00ff41',
    medium: '#ffaa00',
    hard: '#ff4444'
  }[step.difficulty];

  return (
    <div style={{
      marginBottom: 4,
      borderBottom: '1px solid rgba(0, 255, 65, 0.1)',
      background: isActive ? 'rgba(0, 255, 65, 0.08)' : 'transparent',
      transition: 'background 0.3s ease'
    }}>
      {/* Step Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 255, 65, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Expand/Collapse Icon */}
        <span style={{
          fontSize: 10,
          color: 'rgba(0, 255, 65, 0.6)',
          transition: 'transform 0.2s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▶
        </span>

        {/* Step Number */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: stepProgress === 100 ? '#00ff41' : 'rgba(0, 255, 65, 0.2)',
          border: `2px solid ${difficultyColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 'bold',
          color: stepProgress === 100 ? '#000' : '#00ff41',
          flexShrink: 0
        }}>
          {stepProgress === 100 ? '✓' : stepNumber}
        </div>

        {/* Step Title and Progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            color: isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.8)',
            fontWeight: isActive ? 'bold' : 'normal',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {step.stepTitle}
          </div>
          <div style={{
            fontSize: 9,
            color: 'rgba(0, 255, 65, 0.5)'
          }}>
            {completedVisuals}/{totalVisuals} items
          </div>
        </div>
      </div>

      {/* Visual Items (when expanded) */}
      {expanded && (
        <div style={{
          paddingLeft: 32,
          paddingRight: 12,
          paddingBottom: 8
        }}>
          {step.visuals.map((visual, index) => (
            <VisualProgressItem
              key={visual.id}
              visual={visual}
              isActive={visual.id === currentVisualId}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface VisualProgressItemProps {
  visual: VisualProgress;
  isActive: boolean;
  index: number;
}

const VisualProgressItem: React.FC<VisualProgressItemProps> = ({
  visual,
  isActive,
  index
}) => {
  const icon = visual.type === 'notes' ? '📝' : '🎬';
  const statusIcon = visual.status === 'completed' ? '✓' : 
                      visual.status === 'in-progress' ? '⟳' : '○';

  return (
    <div style={{
      padding: '8px 12px',
      marginBottom: 4,
      background: isActive ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0, 0, 0, 0.3)',
      border: `1px solid ${isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.2)'}`,
      borderRadius: 4,
      transition: 'all 0.2s ease',
      boxShadow: isActive ? '0 0 10px rgba(0, 255, 65, 0.3)' : 'none'
    }}>
      {/* Visual Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: visual.status === 'in-progress' ? 6 : 0
      }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            color: isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.7)',
            fontWeight: isActive ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {visual.name}
          </div>
        </div>
        <span style={{
          fontSize: 12,
          color: visual.status === 'completed' ? '#00ff41' : 
                 visual.status === 'in-progress' ? '#ffaa00' : 
                 'rgba(0, 255, 65, 0.4)',
          animation: visual.status === 'in-progress' ? 'spin 1s linear infinite' : 'none'
        }}>
          {statusIcon}
        </span>
      </div>

      {/* Progress Bar (only for in-progress items) */}
      {visual.status === 'in-progress' && (
        <div style={{
          width: '100%',
          height: 4,
          background: 'rgba(0, 255, 65, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(0, 255, 65, 0.3)'
        }}>
          <div style={{
            width: `${visual.progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00ff41, #00cc33)',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 8px rgba(0, 255, 65, 0.6)'
          }} />
        </div>
      )}
    </div>
  );
};

// Add spinning animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
