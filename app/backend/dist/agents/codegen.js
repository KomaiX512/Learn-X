"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenAgent = codegenAgent;
const logger_1 = require("../logger");
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
async function codegenAgent(step, params = {}) {
    const { R = 1000, C = 0.000001, V = 5 } = params;
    switch (step.tag) {
        case 'rc_axes': {
            return {
                type: 'actions',
                stepId: step.id,
                actions: [
                    { op: 'clear', target: 'all' },
                    { op: 'drawAxis', normalized: true, xLabel: 'time (s)', yLabel: 'voltage (V)' },
                    { op: 'drawLabel', normalized: true, text: 'RC Charging: v(t) = V(1 - e^{-t/RC})', x: 0.1, y: 0.05, color: '#222' }
                ]
            };
        }
        case 'rc_curve': {
            const tau = R * C;
            const tEnd = 5 * tau;
            const N = 200;
            const points = [];
            for (let i = 0; i <= N; i++) {
                const t = (i / N) * tEnd;
                const v = V * (1 - Math.exp(-t / tau));
                const x = i / N; // 0..1
                const y = 1 - clamp(v / V, 0, 1); // invert for canvas (0 top)
                points.push([x, y]);
            }
            return {
                type: 'actions',
                stepId: step.id,
                actions: [
                    { op: 'drawCurve', normalized: true, points, color: '#0b82f0', duration: 1.0, width: 2 }
                ]
            };
        }
        case 'rc_annotation': {
            const tau = R * C;
            const x = clamp(tau / (5 * tau), 0, 1);
            const y = 1 - 0.632;
            return {
                type: 'actions',
                stepId: step.id,
                actions: [
                    { op: 'drawLabel', normalized: true, text: `tau = R*C = ${tau.toExponential(2)} s`, x: clamp(x + 0.05, 0.05, 0.9), y: clamp(y - 0.08, 0.05, 0.95), color: '#c2185b' }
                ]
            };
        }
        default: {
            logger_1.logger.debug(`codegenAgent: unknown step.tag=${step.tag}, no-op.`);
            return { type: 'actions', stepId: step.id, actions: [] };
        }
    }
}
