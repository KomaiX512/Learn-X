import { EventEmitter } from 'events';
/**
 * Enhanced Debug Logger for Complete Animation System Monitoring
 *
 * Tracks:
 * - Every AI generation step
 * - Animation action creation
 * - WebSocket message flow
 * - Rendering pipeline
 * - Error and fallback detection
 */
export interface LogEntry {
    timestamp: string;
    level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    category: 'AI' | 'ANIMATION' | 'WEBSOCKET' | 'RENDER' | 'SYSTEM';
    message: string;
    data?: any;
    sessionId?: string;
    stepId?: number;
}
export declare class DebugLogger extends EventEmitter {
    private static instance;
    private logFile;
    private detailedLogFile;
    private stream;
    private detailedStream;
    private buffer;
    private isDebugMode;
    private sessionMetrics;
    private constructor();
    static getInstance(): DebugLogger;
    private initializeStreams;
    log(level: LogEntry['level'], category: LogEntry['category'], message: string, data?: any, sessionId?: string, stepId?: number): void;
    private consoleLog;
    private updateSessionMetrics;
    logAIGeneration(sessionId: string, stepId: number, prompt: string, response: any): void;
    logAnimationCreation(sessionId: string, stepId: number, actions: any[]): void;
    logWebSocketMessage(sessionId: string, direction: 'sent' | 'received', message: any): void;
    logRenderOperation(sessionId: string, stepId: number, success: boolean, details?: any): void;
    private detectDummyContent;
    private hasComplexAnimations;
    private assessAnimationQuality;
    getSessionSummary(sessionId: string): any;
    getRecentLogs(count?: number, filter?: {
        level?: string;
        category?: string;
    }): LogEntry[];
    exportSessionData(sessionId: string, outputPath: string): Promise<boolean>;
    getMonitoringData(): {
        recentLogs: LogEntry[];
        activeSessions: any[];
        systemHealth: {
            totalErrors: number;
            totalWarnings: number;
            uptime: number;
            memoryUsage: NodeJS.MemoryUsage;
        };
    };
    close(): void;
}
export declare const debugLogger: DebugLogger;
//# sourceMappingURL=debugLogger.d.ts.map