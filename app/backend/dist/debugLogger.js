"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLogger = exports.DebugLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
class DebugLogger extends events_1.EventEmitter {
    static instance;
    logFile;
    detailedLogFile;
    stream = null;
    detailedStream = null;
    buffer = [];
    isDebugMode = true;
    sessionMetrics = new Map();
    constructor() {
        super();
        this.logFile = path_1.default.join(__dirname, '..', 'debug.log');
        this.detailedLogFile = path_1.default.join(__dirname, '..', 'debug-detailed.json');
        this.initializeStreams();
    }
    static getInstance() {
        if (!DebugLogger.instance) {
            DebugLogger.instance = new DebugLogger();
        }
        return DebugLogger.instance;
    }
    initializeStreams() {
        try {
            // Create log directory if it doesn't exist
            const logDir = path_1.default.dirname(this.logFile);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
            // Main log stream
            this.stream = fs_1.default.createWriteStream(this.logFile, { flags: 'a' });
            // Detailed JSON log stream
            this.detailedStream = fs_1.default.createWriteStream(this.detailedLogFile, { flags: 'a' });
            this.log('INFO', 'SYSTEM', 'Debug logger initialized');
        }
        catch (error) {
            console.error('Failed to initialize debug logger:', error);
        }
    }
    log(level, category, message, data, sessionId, stepId) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data,
            sessionId,
            stepId
        };
        // Add to buffer
        this.buffer.push(entry);
        if (this.buffer.length > 1000) {
            this.buffer.shift(); // Keep only last 1000 entries
        }
        // Write to file
        if (this.stream) {
            const logLine = `[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;
            this.stream.write(logLine + '\n');
        }
        // Write detailed JSON
        if (this.detailedStream && data) {
            this.detailedStream.write(JSON.stringify(entry) + '\n');
        }
        // Emit for real-time monitoring
        this.emit('log', entry);
        // Console output in debug mode
        if (this.isDebugMode) {
            this.consoleLog(entry);
        }
        // Update session metrics
        if (sessionId) {
            this.updateSessionMetrics(sessionId, entry);
        }
    }
    consoleLog(entry) {
        const colors = {
            DEBUG: '\x1b[90m', // Gray
            INFO: '\x1b[36m', // Cyan
            WARNING: '\x1b[33m', // Yellow
            ERROR: '\x1b[31m', // Red
            SUCCESS: '\x1b[32m' // Green
        };
        const reset = '\x1b[0m';
        const color = colors[entry.level] || reset;
        console.log(`${color}[${entry.category}] ${entry.message}${reset}`);
        if (entry.data && entry.level === 'ERROR') {
            console.log('  Data:', JSON.stringify(entry.data, null, 2));
        }
    }
    updateSessionMetrics(sessionId, entry) {
        if (!this.sessionMetrics.has(sessionId)) {
            this.sessionMetrics.set(sessionId, {
                startTime: new Date(),
                steps: 0,
                animations: 0,
                errors: 0,
                warnings: 0,
                aiCalls: 0,
                renderCalls: 0
            });
        }
        const metrics = this.sessionMetrics.get(sessionId);
        switch (entry.category) {
            case 'AI':
                metrics.aiCalls++;
                if (entry.stepId)
                    metrics.steps = Math.max(metrics.steps, entry.stepId);
                break;
            case 'ANIMATION':
                metrics.animations++;
                break;
            case 'RENDER':
                metrics.renderCalls++;
                break;
        }
        if (entry.level === 'ERROR')
            metrics.errors++;
        if (entry.level === 'WARNING')
            metrics.warnings++;
    }
    // AI Generation Logging
    logAIGeneration(sessionId, stepId, prompt, response) {
        this.log('INFO', 'AI', `Generating step ${stepId}`, {
            prompt: prompt.substring(0, 200) + '...',
            responseLength: JSON.stringify(response).length,
            hasActions: response.actions?.length > 0
        }, sessionId, stepId);
        // Detect fallback/dummy content
        if (this.detectDummyContent(response)) {
            this.log('WARNING', 'AI', `Possible dummy content detected in step ${stepId}`, {
                response: response
            }, sessionId, stepId);
        }
    }
    // Animation Creation Logging
    logAnimationCreation(sessionId, stepId, actions) {
        const actionTypes = actions.map(a => a.op);
        const uniqueTypes = [...new Set(actionTypes)];
        this.log('INFO', 'ANIMATION', `Created ${actions.length} animations for step ${stepId}`, {
            actionTypes: uniqueTypes,
            totalActions: actions.length,
            hasComplexAnimations: this.hasComplexAnimations(actions)
        }, sessionId, stepId);
        // Validate animation quality
        const quality = this.assessAnimationQuality(actions);
        if (quality.score < 0.7) {
            this.log('WARNING', 'ANIMATION', `Low quality animations in step ${stepId}`, {
                quality: quality,
                actions: actions
            }, sessionId, stepId);
        }
    }
    // WebSocket Communication Logging
    logWebSocketMessage(sessionId, direction, message) {
        this.log('DEBUG', 'WEBSOCKET', `Message ${direction}`, {
            type: message.type,
            dataSize: JSON.stringify(message).length
        }, sessionId);
    }
    // Rendering Pipeline Logging
    logRenderOperation(sessionId, stepId, success, details) {
        const level = success ? 'SUCCESS' : 'ERROR';
        const message = success ?
            `Successfully rendered step ${stepId}` :
            `Failed to render step ${stepId}`;
        this.log(level, 'RENDER', message, details, sessionId, stepId);
    }
    // Content Quality Detection
    detectDummyContent(content) {
        const dummyIndicators = [
            'placeholder',
            'dummy',
            'fallback',
            'example',
            'todo',
            'implement',
            'hardcoded',
            'lorem ipsum',
            'test data'
        ];
        const contentStr = JSON.stringify(content).toLowerCase();
        return dummyIndicators.some(indicator => contentStr.includes(indicator));
    }
    hasComplexAnimations(actions) {
        const complexTypes = [
            'drawCurve',
            'drawVector',
            'particle',
            'physics',
            'animate',
            'transform',
            'morph'
        ];
        return actions.some(action => complexTypes.includes(action.op) ||
            (action.duration && action.duration > 0));
    }
    assessAnimationQuality(actions) {
        let score = 1.0;
        const issues = [];
        // Check variety
        const uniqueTypes = new Set(actions.map(a => a.op));
        if (uniqueTypes.size < 3) {
            score -= 0.3;
            issues.push('Limited animation variety');
        }
        // Check for mathematical content
        const hasMath = actions.some(a => a.op === 'drawMathLabel' || a.op === 'equation');
        if (!hasMath && actions.length > 5) {
            score -= 0.2;
            issues.push('No mathematical notation');
        }
        // Check for timing/sequencing
        const hasSequencing = actions.some(a => a.op === 'delay' || a.duration);
        if (!hasSequencing) {
            score -= 0.2;
            issues.push('No timing/sequencing');
        }
        // Check for visual complexity
        const hasComplexVisuals = actions.some(a => a.points?.length > 10 ||
            a.particles ||
            a.physics);
        if (!hasComplexVisuals) {
            score -= 0.1;
            issues.push('Simple visuals only');
        }
        return { score, issues };
    }
    // Session Summary
    getSessionSummary(sessionId) {
        const metrics = this.sessionMetrics.get(sessionId);
        if (!metrics)
            return null;
        const duration = (new Date().getTime() - metrics.startTime.getTime()) / 1000;
        return {
            sessionId,
            duration: `${duration.toFixed(2)}s`,
            steps: metrics.steps,
            animations: metrics.animations,
            errors: metrics.errors,
            warnings: metrics.warnings,
            aiCalls: metrics.aiCalls,
            renderCalls: metrics.renderCalls,
            successRate: metrics.errors === 0 ? '100%' :
                `${((metrics.renderCalls - metrics.errors) / metrics.renderCalls * 100).toFixed(1)}%`
        };
    }
    // Get recent logs
    getRecentLogs(count = 100, filter) {
        let logs = [...this.buffer].reverse().slice(0, count);
        if (filter) {
            if (filter.level) {
                logs = logs.filter(log => log.level === filter.level);
            }
            if (filter.category) {
                logs = logs.filter(log => log.category === filter.category);
            }
        }
        return logs;
    }
    // Export session data for analysis
    async exportSessionData(sessionId, outputPath) {
        const sessionLogs = this.buffer.filter(log => log.sessionId === sessionId);
        const summary = this.getSessionSummary(sessionId);
        const exportData = {
            summary,
            logs: sessionLogs,
            timestamp: new Date().toISOString()
        };
        try {
            await fs_1.default.promises.writeFile(outputPath, JSON.stringify(exportData, null, 2));
            this.log('SUCCESS', 'SYSTEM', `Session data exported to ${outputPath}`, null, sessionId);
            return true;
        }
        catch (error) {
            this.log('ERROR', 'SYSTEM', `Failed to export session data: ${error}`, null, sessionId);
            return false;
        }
    }
    // Real-time monitoring endpoint data
    getMonitoringData() {
        return {
            recentLogs: this.getRecentLogs(50),
            activeSessions: Array.from(this.sessionMetrics.keys()).map(id => this.getSessionSummary(id)),
            systemHealth: {
                totalErrors: this.buffer.filter(log => log.level === 'ERROR').length,
                totalWarnings: this.buffer.filter(log => log.level === 'WARNING').length,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        };
    }
    // Cleanup
    close() {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
        if (this.detailedStream) {
            this.detailedStream.end();
            this.detailedStream = null;
        }
    }
}
exports.DebugLogger = DebugLogger;
// Export singleton instance
exports.debugLogger = DebugLogger.getInstance();
//# sourceMappingURL=debugLogger.js.map