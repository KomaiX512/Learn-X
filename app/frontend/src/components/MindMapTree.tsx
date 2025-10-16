import React, { useState } from 'react';

interface MindMapNode {
  id: string;
  title: string;
  subtopics?: string[];
  level: number;
}

interface MindMapTreeProps {
  visible: boolean;
  onClose: () => void;
  planTitle?: string;
  steps: Array<{ minute?: number; title: string; summary?: string; desc?: string }>;
  currentStepIndex?: number;
}

export const MindMapTree: React.FC<MindMapTreeProps> = ({ 
  visible, 
  onClose, 
  planTitle = 'Lecture Overview',
  steps,
  currentStepIndex = 0
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
      fontFamily: 'Courier New, monospace',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        width: '90%',
        maxWidth: 1200,
        height: '90%',
        background: '#000',
        border: '2px solid #00ff41',
        borderRadius: 8,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0, 255, 65, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #00ff41'
        }}>
          <div style={{
            fontSize: 24,
            color: '#00ff41',
            fontWeight: 'bold',
            textShadow: '0 0 10px #00ff41'
          }}>
            {'<'}{planTitle}{'>'}
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: 4,
              background: 'rgba(0, 255, 65, 0.1)',
              padding: 4,
              borderRadius: 6,
              border: '1px solid rgba(0, 255, 65, 0.3)'
            }}>
              <button
                onClick={() => setViewMode('tree')}
                style={{
                  padding: '6px 16px',
                  background: viewMode === 'tree' ? '#00ff41' : 'transparent',
                  color: viewMode === 'tree' ? '#000' : '#00ff41',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 'bold',
                  fontSize: 12,
                  transition: 'all 0.2s'
                }}
              >
                TREE
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 16px',
                  background: viewMode === 'table' ? '#00ff41' : 'transparent',
                  color: viewMode === 'table' ? '#000' : '#00ff41',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 'bold',
                  fontSize: 12,
                  transition: 'all 0.2s'
                }}
              >
                TABLE
              </button>
            </div>
            
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#00ff41',
                border: '1px solid #00ff41',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace',
                fontWeight: 'bold',
                fontSize: 12
              }}
            >
              [ESC]
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          color: '#00ff41',
          fontSize: 14
        }}>
          {viewMode === 'tree' ? (
            <div style={{ padding: '0 20px' }}>
              {steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isPast = index < currentStepIndex;
                
                return (
                  <div key={index} style={{ marginBottom: 24 }}>
                    {/* Main Step */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 8
                    }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.3)' : 'transparent',
                        border: `2px solid ${isActive || isPast ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? '#000' : '#00ff41',
                        fontWeight: 'bold',
                        fontSize: 12,
                        boxShadow: isActive ? '0 0 15px #00ff41' : 'none'
                      }}>
                        {index + 1}
                      </div>
                      
                      <div style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.6)' : 'rgba(0, 255, 65, 0.4)',
                        textShadow: isActive ? '0 0 10px #00ff41' : 'none'
                      }}>
                        {step.title}
                        {isActive && <span style={{ marginLeft: 8, animation: 'blink 1s infinite' }}>▶</span>}
                      </div>
                    </div>
                    
                    {/* Subtopics */}
                    {(step.summary || step.desc) && (
                      <div style={{
                        marginLeft: 48,
                        paddingLeft: 16,
                        borderLeft: `2px solid ${isActive || isPast ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.1)'}`,
                        fontSize: 13,
                        color: 'rgba(0, 255, 65, 0.7)',
                        lineHeight: 1.6
                      }}>
                        <div>├─ {step.summary || step.desc}</div>
                      </div>
                    )}
                    
                    {/* Connection Line to Next */}
                    {index < steps.length - 1 && (
                      <div style={{
                        marginLeft: 11,
                        width: 2,
                        height: 16,
                        background: isPast ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.1)',
                        marginTop: 4
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid #00ff41',
                  color: '#00ff41'
                }}>
                  <th style={{ padding: 12, textAlign: 'left', width: 60 }}>STEP</th>
                  <th style={{ padding: 12, textAlign: 'left', width: 100 }}>TIME</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>TOPIC</th>
                  <th style={{ padding: 12, textAlign: 'left', width: 100 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isPast = index < currentStepIndex;
                  
                  return (
                    <tr key={index} style={{
                      borderBottom: '1px solid rgba(0, 255, 65, 0.2)',
                      background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                      color: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.6)' : 'rgba(0, 255, 65, 0.4)'
                    }}>
                      <td style={{ padding: 12, fontWeight: 'bold' }}>
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td style={{ padding: 12 }}>
                        {step.minute ? `${step.minute}:00` : '—'}
                      </td>
                      <td style={{ padding: 12 }}>
                        {step.title}
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                          {step.summary || step.desc || ''}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        {isPast ? '✓ COMPLETE' : isActive ? '▶ ACTIVE' : '⋯ PENDING'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Stats */}
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(0, 255, 65, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'rgba(0, 255, 65, 0.6)'
        }}>
          <div>TOTAL STEPS: {steps.length}</div>
          <div>CURRENT: {currentStepIndex + 1}/{steps.length}</div>
          <div>PROGRESS: {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
