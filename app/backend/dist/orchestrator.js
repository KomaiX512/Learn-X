"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOrchestrator = initOrchestrator;
const bullmq_1 = require("bullmq");
const logger_1 = require("./logger");
const planner_1 = require("./agents/planner");
const codegen_1 = require("./agents/codegen");
const debugger_1 = require("./agents/debugger");
const router_1 = require("./compiler/router");
const PLAN_KEY = (sessionId) => `session:${sessionId}:plan`;
const PARAMS_KEY = (sessionId) => `session:${sessionId}:params`;
function initOrchestrator(io, redis) {
    const connection = redis;
    const taskQueue = new bullmq_1.Queue('tasks', { connection });
    const defaultJobOpts = {
        attempts: 2,
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
        backoff: { type: 'exponential', delay: 500 }
    };
    // Plan worker
    const planWorker = new bullmq_1.Worker('tasks', async (job) => {
        if (job.name !== 'plan')
            return;
        const { query, sessionId } = job.data;
        logger_1.logger.debug(`[plan] session=${sessionId} query=${query}`);
        const plan = await (0, planner_1.plannerAgent)(query);
        await redis.set(PLAN_KEY(sessionId), JSON.stringify(plan));
        for (const step of plan.steps) {
            await taskQueue.add('gen', { step, sessionId }, { ...defaultJobOpts });
        }
    }, { connection });
    // Gen worker (concurrent)
    const genWorker = new bullmq_1.Worker('tasks', async (job) => {
        if (job.name !== 'gen')
            return;
        const { sessionId, step } = job.data;
        logger_1.logger.debug(`[gen] session=${sessionId} step=${step.id} tag=${step.tag}`);
        const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
        const params = paramsRaw ? JSON.parse(paramsRaw) : {};
        // Codegen -> Compile -> Debug
        const code = await (0, codegen_1.codegenAgent)(step, params);
        const compiled = await (0, router_1.compilerRouter)(code, step.compiler);
        const checked = await (0, debugger_1.debugAgent)(compiled);
        io.to(sessionId).emit('rendered', checked);
    }, { connection, concurrency: 4 });
    planWorker.on('failed', (job, err) => logger_1.logger.debug(`[plan:failed] id=${job?.id} ${String(err)}`));
    genWorker.on('failed', (job, err) => logger_1.logger.debug(`[gen:failed] id=${job?.id} ${String(err)}`));
    async function enqueuePlan(query, sessionId) {
        await taskQueue.add('plan', { query, sessionId }, { ...defaultJobOpts });
    }
    async function setParams(sessionId, params) {
        await redis.set(PARAMS_KEY(sessionId), JSON.stringify(params));
    }
    return {
        enqueuePlan,
        setParams
    };
}
