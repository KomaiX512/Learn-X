import React, { useState } from 'react';

interface TOCProps {
  visible: boolean;
  planTitle?: string;
  steps: Array<{ minute?: number; title: string; summary?: string; desc?: string }>;
  currentStepIndex?: number;
}

export const TableOfContents: React.FC<TOCProps> = ({ 
  visible, 
  planTitle = 'Topic',
  steps,
  currentStepIndex = 0
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('table');
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      width: '320px',
      maxHeight: 'calc(100vh - 140px)',
      background: '#000',
      border: '2px solid #00ff41',
      borderRadius: '12px',
      fontFamily: 'Courier New, monospace',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 30px rgba(0, 255, 65, 0.3)',
      zIndex: 100,
      animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header with Toggle */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #00ff41',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 255, 65, 0.05)'
      }}>
        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '0',
          background: 'rgba(0, 255, 65, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(0, 255, 65, 0.4)',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setViewMode('tree')}
            style={{
              padding: '6px 14px',
              background: viewMode === 'tree' ? '#00ff41' : 'transparent',
              color: viewMode === 'tree' ? '#000' : '#00ff41',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              fontSize: '11px',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing: '0.5px'
            }}
          >
            TREE
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
              background: viewMode === 'table' ? '#00ff41' : 'transparent',
              color: viewMode === 'table' ? '#000' : '#00ff41',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              fontSize: '11px',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing: '0.5px'
            }}
          >
            TABLE
          </button>
        </div>
      </div>
      
      {/* Topic Title */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 'bold',
          color: '#00ff41',
          textShadow: '0 0 10px rgba(0, 255, 65, 0.6)',
          letterSpacing: '1px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {'<'}{planTitle}{'>'}
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 12px',
        fontSize: '12px'
      }}>
        {viewMode === 'tree' ? (
          // Tree View
          <div>
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPast = index < currentStepIndex;
              
              return (
                <div key={index} style={{ marginBottom: '12px' }}>
                  {/* Step Node */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.3)' : 'transparent',
                      border: `2px solid ${isActive || isPast ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#000' : '#00ff41',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      flexShrink: 0,
                      boxShadow: isActive ? '0 0 12px rgba(0, 255, 65, 0.8)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                      {index + 1}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.6)' : 'rgba(0, 255, 65, 0.4)',
                        textShadow: isActive ? '0 0 8px rgba(0, 255, 65, 0.5)' : 'none',
                        lineHeight: '1.3',
                        wordBreak: 'break-word',
                        transition: 'all 0.3s ease'
                      }}>
                        {step.title}
                      </div>
                      
                      {(step.summary || step.desc) && (
                        <div style={{
                          marginTop: '4px',
                          paddingLeft: '8px',
                          borderLeft: `1px solid ${isActive || isPast ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.1)'}`,
                          fontSize: '10px',
                          color: 'rgba(0, 255, 65, 0.5)',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}>
                          {step.summary || step.desc}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div style={{
                      marginLeft: '9px',
                      width: '2px',
                      height: '8px',
                      background: isPast ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.1)',
                      marginTop: '2px',
                      marginBottom: '2px',
                      transition: 'all 0.3s ease'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Table View
          <div>
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPast = index < currentStepIndex;
              
              return (
                <div key={index} style={{
                  padding: '10px 8px',
                  marginBottom: '6px',
                  borderRadius: '6px',
                  background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                  border: `1px solid ${isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.2)'}`,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? '0 0 15px rgba(0, 255, 65, 0.2)' : 'none'
                }}>
                  {/* Step Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: isActive ? '#00ff41' : 'rgba(0, 255, 65, 0.5)'
                    }}>
                      SUBTOPIC: {index + 1}
                    </div>
                    <div style={{
                      fontSize: '9px',
                      color: 'rgba(0, 255, 65, 0.4)'
                    }}>
                      {isPast ? '✓' : isActive ? '▶' : '⋯'}
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div style={{
                    fontSize: '11px',
                    color: isActive ? '#00ff41' : isPast ? 'rgba(0, 255, 65, 0.6)' : 'rgba(0, 255, 65, 0.4)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    textShadow: isActive ? '0 0 6px rgba(0, 255, 65, 0.3)' : 'none'
                  }}>
                    the {step.title}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(0, 255, 65, 0.3)',
        fontSize: '10px',
        color: 'rgba(0, 255, 65, 0.5)',
        textAlign: 'center',
        background: 'rgba(0, 255, 65, 0.02)',
        letterSpacing: '0.5px'
      }}>
        {currentStepIndex + 1}/{steps.length} COMPLETE
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Custom scrollbar */
        div::-webkit-scrollbar {
          width: 6px;
        }
        
        div::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.05);
          border-radius: 3px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.3);
          border-radius: 3px;
          transition: all 0.2s;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.5);
        }
      `}</style>
    </div>
  );
};
