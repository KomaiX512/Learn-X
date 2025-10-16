import React, { useState } from 'react';

interface KeyNote {
  category: string;
  items: Array<{
    title: string;
    formula?: string;
    description?: string;
    useCase?: string;
    edgeCase?: string;
  }>;
}

interface KeyNotesGeneratorProps {
  visible: boolean;
  lectureComplete: boolean;
  sessionId: string | null;
  planTitle?: string;
}

export const KeyNotesGenerator: React.FC<KeyNotesGeneratorProps> = ({ 
  visible,
  lectureComplete,
  sessionId,
  planTitle = 'Topic'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<KeyNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ stepsAvailable: number; stepsTotal: number; isPartial: boolean } | null>(null);
  
  if (!visible) return null;
  
  const generateNotes = async () => {
    if (!sessionId) {
      setError('No session ID available');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate notes: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.notes) {
        setNotes(data.notes);
        setMetadata(data.metadata || null);
        setIsExpanded(true);
        
        // Log partial generation info
        if (data.metadata?.isPartial) {
          console.log(`[KeyNotes] Generated from ${data.metadata.stepsAvailable}/${data.metadata.stepsTotal} steps (partial context + gap filling)`);
        }
      } else {
        throw new Error(data.error || 'Failed to generate notes');
      }
    } catch (err: any) {
      console.error('[KeyNotesGenerator] Error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Minimized state
  if (!isExpanded && !notes) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 100,
        animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <button
          onClick={generateNotes}
          disabled={!sessionId || isGenerating}
          style={{
            padding: '14px 28px',
            background: sessionId && !isGenerating 
              ? 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)' 
              : 'rgba(0, 255, 65, 0.2)',
            color: sessionId && !isGenerating ? '#000' : 'rgba(0, 255, 65, 0.5)',
            border: `2px solid ${sessionId && !isGenerating ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'}`,
            borderRadius: '8px',
            cursor: sessionId && !isGenerating ? 'pointer' : 'not-allowed',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            letterSpacing: '1px',
            boxShadow: sessionId && !isGenerating 
              ? '0 0 25px rgba(0, 255, 65, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)' 
              : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (sessionId && !isGenerating) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 255, 65, 0.6), 0 6px 16px rgba(0, 0, 0, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (sessionId && !isGenerating) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 65, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)';
            }
          }}
        >
          {isGenerating ? (
            <>
              <span style={{ 
                animation: 'spin 1s linear infinite',
                display: 'inline-block'
              }}>⚡</span>
              GENERATING...
            </>
          ) : (
            <>
              📝 Generate Key Notes & Formulas
            </>
          )}
        </button>
        
        {error && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '6px',
            color: '#ff4444',
            fontSize: '11px',
            fontFamily: 'Courier New, monospace'
          }}>
            ❌ {error}
          </div>
        )}
        
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // Minimized state with notes generated
  if (!isExpanded && notes) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '320px',
        background: '#000',
        border: '2px solid #00ff41',
        borderRadius: '12px',
        fontFamily: 'Courier New, monospace',
        boxShadow: '0 0 30px rgba(0, 255, 65, 0.3)',
        zIndex: 100,
        animation: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* Compact Header */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15) 0%, rgba(0, 255, 65, 0.05) 100%)',
          borderBottom: '1px solid #00ff41',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(true)}
        >
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#00ff41',
              textShadow: '0 0 8px rgba(0, 255, 65, 0.5)',
              letterSpacing: '1px'
            }}>
              📝 KEY NOTES
            </div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(0, 255, 65, 0.5)',
              marginTop: '2px'
            }}>
              Click to expand
            </div>
          </div>
          
          <button
            style={{
              background: 'rgba(0, 255, 65, 0.2)',
              border: '1px solid #00ff41',
              borderRadius: '6px',
              color: '#00ff41',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              transition: 'all 0.2s'
            }}
          >
            EXPAND ▲
          </button>
        </div>
        
        {/* Compact Preview */}
        <div style={{
          padding: '12px 16px',
          fontSize: '11px',
          color: 'rgba(0, 255, 65, 0.6)',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          {notes.slice(0, 2).map((category, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{
                fontWeight: 'bold',
                color: '#00ff41',
                fontSize: '10px',
                marginBottom: '4px'
              }}>
                {category.category}
              </div>
              <div style={{ color: 'rgba(0, 255, 65, 0.5)' }}>
                {category.items.length} item(s)...
              </div>
            </div>
          ))}
        </div>
        
        <style>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }
  
  // Expanded state - Full modal
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
      zIndex: 9999,
      fontFamily: 'Courier New, monospace',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        background: '#000',
        border: '2px solid #00ff41',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 50px rgba(0, 255, 65, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15) 0%, rgba(0, 255, 65, 0.05) 100%)',
          borderBottom: '2px solid #00ff41',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#00ff41',
              textShadow: '0 0 15px rgba(0, 255, 65, 0.6)',
              letterSpacing: '2px'
            }}>
              📝 KEY NOTES
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(0, 255, 65, 0.5)',
              marginTop: '4px',
              letterSpacing: '1px'
            }}>
              {planTitle}
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid #00ff41',
              borderRadius: '6px',
              color: '#00ff41',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
          >
            MINIMIZE ▼
          </button>
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          color: '#00ff41'
        }}>
          {notes && notes.map((category, catIdx) => (
            <div key={catIdx} style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'rgba(0, 255, 65, 0.03)',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              borderRadius: '8px'
            }}>
              {/* Category Header */}
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#00ff41',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
                textShadow: '0 0 10px rgba(0, 255, 65, 0.4)',
                letterSpacing: '1.5px'
              }}>
                {category.category}
              </div>
              
              {/* Items */}
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} style={{
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: itemIdx < category.items.length - 1 
                    ? '1px solid rgba(0, 255, 65, 0.1)' 
                    : 'none'
                }}>
                  {/* Title */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#00ff41',
                    marginBottom: '8px'
                  }}>
                    → {item.title}
                  </div>
                  
                  {/* Formula */}
                  {item.formula && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 255, 65, 0.08)',
                      border: '1px solid rgba(0, 255, 65, 0.3)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#00ff41',
                      fontFamily: 'Courier New, monospace',
                      marginBottom: '8px',
                      overflowX: 'auto'
                    }}>
                      {item.formula}
                    </div>
                  )}
                  
                  {/* Description */}
                  {item.description && (
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(0, 255, 65, 0.7)',
                      lineHeight: '1.6',
                      marginBottom: '6px'
                    }}>
                      {item.description}
                    </div>
                  )}
                  
                  {/* Use Case */}
                  {item.useCase && (
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(0, 255, 65, 0.6)',
                      marginTop: '6px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid rgba(0, 255, 65, 0.3)'
                    }}>
                      <strong>Use:</strong> {item.useCase}
                    </div>
                  )}
                  
                  {/* Edge Case */}
                  {item.edgeCase && (
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255, 200, 0, 0.7)',
                      marginTop: '4px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid rgba(255, 200, 0, 0.3)'
                    }}>
                      <strong>⚠ Edge:</strong> {item.edgeCase}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Footer with Practice Button */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(0, 255, 65, 0.3)',
          background: 'rgba(0, 255, 65, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(0, 255, 65, 0.6)',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            {notes ? `Total: ${notes.reduce((sum, cat) => sum + cat.items.length, 0)} key points across ${notes.length} categories` : ''}
            {metadata?.isPartial && (
              <div style={{ 
                marginTop: '4px',
                fontSize: '10px',
                color: 'rgba(255, 200, 0, 0.7)'
              }}>
                ℹ️ Generated from {metadata.stepsAvailable}/{metadata.stepsTotal} lecture steps + essential missing topics
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              alert('🎯 PRACTICE MODE\n\nThis functionality will arrive as soon as possible.\n\nComing soon:\n• Interactive quizzes on these key points\n• Numerical problem practice\n• Instant feedback and solutions\n• Progress tracking\n\nThanks for waiting!');
            }}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              fontSize: '13px',
              letterSpacing: '1px',
              boxShadow: '0 0 20px rgba(0, 255, 65, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.4)';
            }}
          >
            🎯 PRACTICE THESE KEY POINTS
            <span style={{
              fontSize: '9px',
              opacity: 0.7,
              marginLeft: '8px',
              fontWeight: 'normal'
            }}>
              (COMING SOON)
            </span>
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        /* Custom scrollbar */
        div::-webkit-scrollbar {
          width: 8px;
        }
        
        div::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.05);
          border-radius: 4px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.3);
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.5);
        }
      `}</style>
    </div>
  );
};
