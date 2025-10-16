import React from 'react';

interface LectureItem {
  id: string;
  topic: string;
  subtopics: string[];
  timestamp?: Date;
}

interface LectureHistoryProps {
  lectures?: LectureItem[];
}

export const LectureHistory: React.FC<LectureHistoryProps> = ({ lectures = [] }) => {
  // Sample data if none provided
  const sampleLectures: LectureItem[] = lectures.length > 0 ? lectures : [
    {
      id: '1',
      topic: 'Chemistry',
      subtopics: ['Stoichometry', 'VASPR'],
      timestamp: new Date()
    },
    {
      id: '2',
      topic: 'Chemistry',
      subtopics: ['Stoichometry', 'VASPR'],
      timestamp: new Date()
    },
    {
      id: '3',
      topic: 'Chemistry',
      subtopics: ['Stoichometry', 'VASPR'],
      timestamp: new Date()
    }
  ];
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 280,
      maxHeight: 400,
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #00ff41',
      borderRadius: 8,
      padding: 16,
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.2)',
      zIndex: 99,
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        fontSize: 14,
        color: '#00ff41',
        fontWeight: 'bold',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span>LECTURES</span>
        <div style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(90deg, rgba(0, 255, 65, 0.3), transparent)'
        }} />
      </div>
      
      {/* Lecture Tree */}
      <div style={{
        fontSize: 12,
        color: '#00ff41'
      }}>
        {sampleLectures.map((lecture, index) => (
          <div key={lecture.id} style={{ marginBottom: 16 }}>
            {/* Folder Icon + Topic */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              cursor: 'pointer',
              opacity: 0.9,
              transition: 'opacity 0.2s'
            }}>
              <span>📁</span>
              <span style={{ fontWeight: 'bold' }}>{lecture.topic}</span>
            </div>
            
            {/* Subtopics */}
            <div style={{ marginLeft: 24 }}>
              {lecture.subtopics.map((subtopic, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                  opacity: 0.7,
                  fontSize: 11
                }}>
                  <span>{i === lecture.subtopics.length - 1 ? '└─' : '├─'}</span>
                  <span>📄</span>
                  <span>{subtopic}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        /* Custom Scrollbar */
        div::-webkit-scrollbar {
          width: 6px;
        }
        
        div::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.1);
          border-radius: 3px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.3);
          border-radius: 3px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.5);
        }
      `}</style>
    </div>
  );
};
