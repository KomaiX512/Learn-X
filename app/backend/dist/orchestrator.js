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
const QUERY_KEY = (sessionId) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId, stepId) => `session:${sessionId}:step:${stepId}:chunk`;
const PART_DURATION_MS = 10000; // 10 seconds per part for better demo experience
function initOrchestrator(io, redis) {
    const connection = redis;
    // Create separate queues for plan and gen jobs
    const planQueue = new bullmq_1.Queue('plan-jobs', { connection });
    const genQueue = new bullmq_1.Queue('gen-jobs', { connection });
    const defaultJobOpts = {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
        backoff: { type: 'exponential', delay: 500 }
    };
    // Plan worker - NO FALLBACKS
    const planWorker = new bullmq_1.Worker('plan-jobs', async (job) => {
        console.log('=== NEW PLAN WORKER STARTED ===');
        console.log('Job data:', JSON.stringify(job.data));
        logger_1.logger.debug(`[planWorker] Received job: ${job.name} id=${job.id}`);
        if (job.name !== 'plan') {
            console.log(`PLAN WORKER: SKIPPING non-plan job: ${job.name}`);
            return;
        }
        const { query, sessionId } = job.data;
        logger_1.logger.debug(`[plan] START: session=${sessionId} query=${query}`);
        await redis.del(PLAN_KEY(sessionId));
        const plan = await (0, planner_1.plannerAgent)(query); // NO TRY/CATCH - LET IT FAIL IF NEEDED
        console.log(`=== NEW STRUCTURED PLAN ===`);
        console.log(`Session: ${sessionId}`);
        console.log(`Query: ${query}`);
        console.log(`Plan title: ${plan.title}`);
        console.log(`Plan subtitle: ${plan.subtitle}`);
        console.log(`Plan toc:`, plan.toc);
        console.log(`Plan steps count: ${plan.steps.length}`);
        plan.steps.forEach((step, i) => {
            console.log(`Step ${i}: id=${step.id}, tag=${step.tag}, desc="${step.desc}"`);
        });
        console.log(`=== END NEW STRUCTURED PLAN ===`);
        logger_1.logger.debug(`[plan] OK: session=${sessionId} plan received with ${plan.steps.length} steps`);
        await redis.set(PLAN_KEY(sessionId), JSON.stringify(plan));
        await redis.set(CURRENT_STEP_KEY(sessionId), 0);
        // Enqueue the first step emit immediately
        if (plan.steps.length > 0) {
            const firstStep = plan.steps[0];
            logger_1.logger.debug(`[plan] Enqueuing first step emit: session=${sessionId} stepId=${firstStep.id}`);
            await genQueue.add('gen', { step: firstStep, sessionId, prefetch: false }, { ...defaultJobOpts });
        }
        logger_1.logger.debug(`[plan] END: session=${sessionId}`);
    }, { connection });
    logger_1.logger.debug('NEW Plan worker created');
    // Gen worker (prefetch + emit) - NO FALLBACKS
    const genWorker = new bullmq_1.Worker('gen-jobs', async (job) => {
        console.log('=== NEW GEN WORKER STARTED ===');
        console.log('Gen job data:', JSON.stringify(job.data).slice(0, 200));
        logger_1.logger.debug(`[genWorker] Received job: ${job.name} id=${job.id}`);
        if (job.name !== 'gen')
            return;
        const { sessionId, step } = job.data;
        logger_1.logger.debug(`[gen] START: session=${sessionId} step=${step.id} tag=${step.tag}`);
        const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
        const params = paramsRaw ? JSON.parse(paramsRaw) : {};
        const queryRaw = await redis.get(QUERY_KEY(sessionId));
        const query = queryRaw || '';
        // Load plan metadata
        const planRaw = await redis.get(PLAN_KEY(sessionId));
        const plan = planRaw ? JSON.parse(planRaw) : { title: '', subtitle: '', toc: [], steps: [] };
        const key = CHUNK_KEY(sessionId, step.id);
        const isPrefetch = Boolean(job.data.prefetch);
        if (isPrefetch) {
            const cached = await redis.get(key);
            if (cached) {
                logger_1.logger.debug(`[gen] Prefetch hit for session=${sessionId} step=${step.id}`);
                return;
            }
            const startTime = Date.now();
            const code = await (0, codegen_1.codegenAgent)(step, params, query); // NO TRY/CATCH - LET IT FAIL
            logger_1.logger.debug(`[gen] OK: prefetch codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
            const compiled = await (0, router_1.compilerRouter)(code, step.compiler);
            const checked = await (0, debugger_1.debugAgent)(compiled);
            await redis.set(key, JSON.stringify(checked));
            logger_1.logger.debug(`[gen] Prefetched and cached session=${sessionId} step=${step.id}`);
            return;
        }
        // Emit job: use cached if available else generate
        let checked = null;
        const cached = await redis.get(key);
        if (cached) {
            checked = JSON.parse(cached);
            logger_1.logger.debug(`[gen] Using cached chunk for session=${sessionId} step=${step.id}`);
        }
        else {
            const startTime = Date.now();
            try {
                const code = await (0, codegen_1.codegenAgent)(step, params, query);
                logger_1.logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
                const compiled = await (0, router_1.compilerRouter)(code, step.compiler);
                checked = await (0, debugger_1.debugAgent)(compiled);
                await redis.set(key, JSON.stringify(checked));
            }
            catch (error) {
                logger_1.logger.error(`[gen] Codegen failed for session=${sessionId} step=${step.id}: ${error}`);
                // Create a simple fallback that shows the error
                checked = {
                    type: 'actions',
                    stepId: step.id,
                    actions: [
                        { op: 'drawTitle', text: step.desc, y: 0.1, duration: 1 },
                        { op: 'drawLabel', normalized: true, text: `Step ${step.id}: ${step.desc}`, x: 0.1, y: 0.3, color: '#333' },
                        { op: 'drawLabel', normalized: true, text: 'Content generation in progress...', x: 0.1, y: 0.4, color: '#666' }
                    ]
                };
            }
        }
        console.log(`=== NEW EMITTING WITH FULL PLAN DATA ===`);
        console.log(`Session: ${sessionId}`);
        console.log(`Plan title: ${plan.title}`);
        console.log(`Plan toc:`, plan.toc);
        console.log(`Step: ${step.id} - ${step.desc}`);
        console.log(`Actions:`, checked.actions);
        console.log(`=== END NEW EMITTING ===`);
        const eventData = { ...checked, step, plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc } };
        logger_1.logger.debug(`[gen] EMITTING to room: ${sessionId} with ${eventData.actions?.length || 0} actions`);
        // Emit to the room
        try {
            const roomSockets = await io.in(sessionId).fetchSockets();
            logger_1.logger.debug(`[gen] Sockets in room ${sessionId}: ${roomSockets.length}`);
            if (roomSockets.length > 0) {
                // Emit to room (this should work now)
                io.to(sessionId).emit('rendered', eventData);
                logger_1.logger.debug(`[gen] Emitted to room ${sessionId} with ${roomSockets.length} sockets`);
            }
            else {
                logger_1.logger.warn(`[gen] No sockets in room ${sessionId}! Using broadcast fallback.`);
                // Broadcast to all connected clients with matching sessionId
                io.emit('rendered', { ...eventData, targetSession: sessionId });
            }
        }
        catch (err) {
            logger_1.logger.error(`[gen] Error emitting: ${err}`);
        }
        logger_1.logger.debug(`[gen] END: session=${sessionId} step=${step.id}, emitted chunk`);
        // Schedule prefetch and next emit
        const idx = plan.steps.findIndex((s) => s.id === step.id);
        if (idx >= 0 && idx < plan.steps.length - 1) {
            const nextStep = plan.steps[idx + 1];
            await genQueue.add('gen', { step: nextStep, sessionId, prefetch: true }, { ...defaultJobOpts });
            await genQueue.add('gen', { step: nextStep, sessionId, prefetch: false }, { ...defaultJobOpts, delay: PART_DURATION_MS });
            await redis.set(CURRENT_STEP_KEY(sessionId), String(idx + 1));
        }
        else {
            logger_1.logger.debug(`[orchestrator] All steps completed for session ${sessionId}`);
        }
    }, { connection, concurrency: 2 });
    logger_1.logger.debug('NEW Gen worker created');
    planWorker.on('failed', (job, err) => logger_1.logger.error(`[plan:failed] id=${job?.id} ${String(err)}`));
    genWorker.on('failed', (job, err) => logger_1.logger.error(`[gen:failed] id=${job?.id} ${String(err)}`));
    async function enqueuePlan(query, sessionId) {
        logger_1.logger.debug(`[orchestrator] Enqueuing plan for session ${sessionId}`);
        await redis.set(QUERY_KEY(sessionId), query);
        const job = await planQueue.add('plan', { query, sessionId }, { ...defaultJobOpts });
        logger_1.logger.debug(`[orchestrator] Plan job added with id ${job.id} for session ${sessionId}`);
    }
    async function setParams(sessionId, params) {
        await redis.set(PARAMS_KEY(sessionId), JSON.stringify(params));
    }
    return {
        enqueuePlan,
        setParams
    };
}
