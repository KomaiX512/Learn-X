"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOrchestrator = initOrchestrator;
const bullmq_1 = require("bullmq");
const logger_1 = require("./logger");
const planner_1 = require("./agents/planner");
const codegen_1 = require("./agents/codegen");
const debugger_1 = require("./agents/debugger");
const router_1 = require("./compiler/router");
const cache_manager_1 = require("./services/cache-manager");
const performance_monitor_1 = require("./services/performance-monitor");
const PLAN_KEY = (sessionId) => `session:${sessionId}:plan`;
const QUERY_KEY = (sessionId) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId, stepId) => `session:${sessionId}:step:${stepId}:chunk`;
const LEARNING_STATE_KEY = (sessionId) => `session:${sessionId}:learning_state`;
// Progressive learning timing based on complexity
// INCREASED to prevent race conditions with generation
const TIMING_BY_COMPLEXITY = {
    1: 10000, // Hook - quick engagement
    2: 15000, // Intuition - time to absorb
    3: 20000, // Formalism - complex concepts
    4: 25000, // Exploration - deep dive (MORE TIME)
    5: 20000 // Mastery - synthesis (MORE TIME)
};
function initOrchestrator(io, redis) {
    const connection = redis;
    // Initialize services
    const cacheManager = new cache_manager_1.CacheManager(redis);
    const perfMonitor = new performance_monitor_1.PerformanceMonitor();
    // Clear any stale jobs on startup
    console.log('🧹 Clearing stale job queues on startup...');
    // Create separate queues for plan and gen jobs
    const planQueue = new bullmq_1.Queue('plan-jobs', { connection });
    const genQueue = new bullmq_1.Queue('gen-jobs', { connection });
    const parallelQueue = new bullmq_1.Queue('parallel-gen-jobs', { connection }); // New parallel generation queue
    // Clean up stale jobs - COMMENTED OUT TO DEBUG
    // planQueue.obliterate({ force: true }).catch(() => console.log('Plan queue already clean'));
    // genQueue.obliterate({ force: true }).catch(() => console.log('Gen queue already clean'));
    // parallelQueue.obliterate({ force: true }).catch(() => console.log('Parallel queue already clean'));
    // Performance monitoring updates
    perfMonitor.on('metrics-updated', (metrics) => {
        logger_1.logger.debug('[monitor] Metrics updated:', metrics.averageTotalTime + 'ms avg');
    });
    const defaultJobOpts = {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
        backoff: { type: 'exponential', delay: 500 }
    };
    // Plan worker - NO FALLBACKS
    const planWorker = new bullmq_1.Worker('plan-jobs', async (job) => {
        console.log('=== PLAN WORKER PROCESSING JOB ===');
        console.log('Job ID:', job.id);
        console.log('Job name:', job.name);
        console.log('Job data:', JSON.stringify(job.data));
        logger_1.logger.debug(`[planWorker] Received job: ${job.name} id=${job.id}`);
        if (job.name !== 'plan') {
            console.log(`PLAN WORKER: SKIPPING non-plan job: ${job.name}`);
            return;
        }
        const { query, sessionId } = job.data;
        logger_1.logger.debug(`[plan] START: session=${sessionId} query=${query}`);
        // Track request in performance monitor
        perfMonitor.startRequest(sessionId);
        perfMonitor.startPlanGeneration(sessionId);
        // Check cache first
        let plan = await cacheManager.getCachedPlan(query);
        if (plan) {
            logger_1.logger.debug(`[plan] Using cached plan for query: ${query}`);
            perfMonitor.recordCacheHit();
            perfMonitor.endPlanGeneration(sessionId, true);
        }
        else {
            perfMonitor.recordCacheMiss();
            await redis.del(PLAN_KEY(sessionId));
            plan = await (0, planner_1.plannerAgent)(query); // NO TRY/CATCH - LET IT FAIL IF NEEDED
            perfMonitor.endPlanGeneration(sessionId, true);
            // Cache the generated plan
            await cacheManager.cachePlan(query, plan);
        }
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
        // NEW: Enqueue parallel generation of ALL steps immediately
        if (plan.steps.length > 0) {
            logger_1.logger.debug(`[plan] Enqueuing PARALLEL generation of all ${plan.steps.length} steps`);
            // Emit progress update
            io.to(sessionId).emit('status', {
                type: 'plan_ready',
                plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc },
                totalSteps: plan.steps.length,
                message: 'Starting parallel generation of all steps...'
            });
            // Generate all steps in parallel
            await parallelQueue.add('parallel-generate', {
                plan,
                sessionId,
                query
            }, { ...defaultJobOpts });
        }
        logger_1.logger.debug(`[plan] END: session=${sessionId}`);
    }, { connection });
    logger_1.logger.debug('NEW Plan worker created');
    // Start the plan worker
    planWorker.on('completed', (job) => {
        logger_1.logger.debug(`[planWorker] Job ${job.id} completed`);
    });
    planWorker.on('failed', (job, err) => {
        logger_1.logger.error(`[planWorker] Job ${job?.id} failed: ${err.message}`);
    });
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
                logger_1.logger.error(`[gen] CRITICAL FAILURE for session=${sessionId} step=${step.id}: ${error}`);
                // NO FALLBACKS - Let it fail properly
                throw new Error(`Generation failed for step ${step.id}: ${error}`);
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
            // Start prefetch immediately
            await genQueue.add('gen', { step: nextStep, sessionId, prefetch: true }, { ...defaultJobOpts });
            // CRITICAL FIX: Use nextStep's complexity, not current step's!
            const delayMs = TIMING_BY_COMPLEXITY[nextStep.complexity || 1];
            logger_1.logger.debug(`[orchestrator] Scheduling step ${nextStep.id} emission with ${delayMs}ms delay (complexity ${nextStep.complexity})`);
            // Add extra buffer time to prevent race conditions with generation
            const bufferMs = nextStep.complexity >= 4 ? 5000 : 2000; // Extra time for complex steps
            await genQueue.add('gen', { step: nextStep, sessionId, prefetch: false }, {
                ...defaultJobOpts,
                delay: delayMs + bufferMs
            });
            await redis.set(CURRENT_STEP_KEY(sessionId), String(idx + 1));
        }
        else {
            logger_1.logger.debug(`[orchestrator] All steps completed for session ${sessionId}`);
        }
    }, { connection, concurrency: 2 });
    logger_1.logger.debug('NEW Gen worker created');
    // NEW: Parallel generation worker - generates ALL steps simultaneously
    const parallelWorker = new bullmq_1.Worker('parallel-gen-jobs', async (job) => {
        if (job.name !== 'parallel-generate')
            return;
        const { sessionId, plan, query } = job.data;
        logger_1.logger.debug(`[parallel] Starting parallel generation for ${plan.steps.length} steps`);
        const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
        const params = paramsRaw ? JSON.parse(paramsRaw) : {};
        // Track generation progress
        const generationPromises = [];
        const startTime = Date.now();
        // Generate all steps in parallel
        for (const step of plan.steps) {
            generationPromises.push((async () => {
                const stepStartTime = Date.now();
                try {
                    perfMonitor.startStepGeneration(sessionId, step.id);
                    // Check cache first
                    let checked = await cacheManager.getCachedChunk(query, step.id);
                    if (checked) {
                        logger_1.logger.debug(`[parallel] Using cached chunk for step ${step.id}`);
                        perfMonitor.recordCacheHit();
                        // Still cache it in session-specific key for quick access
                        const key = CHUNK_KEY(sessionId, step.id);
                        await redis.set(key, JSON.stringify(checked));
                    }
                    else {
                        perfMonitor.recordCacheMiss();
                        // Emit progress for this specific step starting
                        io.to(sessionId).emit('progress', {
                            stepId: step.id,
                            status: 'generating',
                            message: `Generating ${step.tag}: ${step.desc.slice(0, 50)}...`
                        });
                        // Generate the step
                        const code = await (0, codegen_1.codegenAgent)(step, params, query);
                        const compiled = await (0, router_1.compilerRouter)(code, step.compiler);
                        checked = await (0, debugger_1.debugAgent)(compiled);
                        // Cache the result in both places
                        const key = CHUNK_KEY(sessionId, step.id);
                        await redis.set(key, JSON.stringify(checked));
                        await cacheManager.cacheChunk(query, step.id, checked);
                    }
                    const genTime = Date.now() - stepStartTime;
                    perfMonitor.endStepGeneration(sessionId, step.id, true);
                    logger_1.logger.debug(`[parallel] Step ${step.id} generated in ${genTime}ms`);
                    // Emit progress for this specific step completed
                    io.to(sessionId).emit('progress', {
                        stepId: step.id,
                        status: 'ready',
                        generationTime: genTime,
                        actionsCount: checked.actions?.length || 0,
                        message: `Step ${step.id} ready (${checked.actions?.length || 0} actions)`
                    });
                    // CRITICAL FIX: Emit the rendered event immediately after generation!
                    const eventData = {
                        ...checked,
                        step,
                        plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc }
                    };
                    io.to(sessionId).emit('rendered', eventData);
                    logger_1.logger.debug(`[parallel] Emitted rendered event for step ${step.id}`);
                    return { success: true, stepId: step.id, time: genTime, actions: checked.actions?.length };
                }
                catch (error) {
                    const genTime = Date.now() - stepStartTime;
                    perfMonitor.endStepGeneration(sessionId, step.id, false);
                    logger_1.logger.error(`[parallel] Step ${step.id} failed: ${error}`);
                    io.to(sessionId).emit('progress', {
                        stepId: step.id,
                        status: 'error',
                        error: String(error),
                        message: `Step ${step.id} generation failed`
                    });
                    // Don't stop entire process - continue with other steps
                    return { success: false, stepId: step.id, error: String(error), time: genTime };
                }
            })());
        }
        // Wait for all parallel generations
        const results = await Promise.allSettled(generationPromises);
        const totalTime = Date.now() - startTime;
        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        logger_1.logger.debug(`[parallel] Parallel generation complete: ${successful}/${results.length} successful in ${totalTime}ms`);
        // Complete performance tracking
        perfMonitor.completeRequest(sessionId, successful > 0);
        // Emit overall status with performance metrics
        const metrics = perfMonitor.getMetrics();
        io.to(sessionId).emit('status', {
            type: 'generation_complete',
            successful,
            failed,
            totalTime,
            message: `Generated ${successful} of ${results.length} steps in ${(totalTime / 1000).toFixed(1)}s`,
            performance: {
                cacheHitRate: metrics.cacheHitRate,
                avgPlanTime: metrics.averagePlanTime,
                avgStepTime: metrics.averageStepTime
            }
        });
        // Start streaming the first successful step immediately
        if (successful > 0) {
            const firstStep = plan.steps[0];
            const cached = await redis.get(CHUNK_KEY(sessionId, firstStep.id));
            if (cached) {
                const chunk = JSON.parse(cached);
                const eventData = {
                    ...chunk,
                    step: firstStep,
                    plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc }
                };
                io.to(sessionId).emit('rendered', eventData);
                logger_1.logger.debug(`[parallel] Emitted first step immediately`);
                // Schedule remaining steps with proper timing
                for (let i = 1; i < plan.steps.length; i++) {
                    const step = plan.steps[i];
                    const delayMs = TIMING_BY_COMPLEXITY[step.complexity || 1];
                    await genQueue.add('emit-cached', { step, sessionId, plan }, {
                        ...defaultJobOpts,
                        delay: delayMs * i // Stagger the emissions
                    });
                }
            }
        }
        logger_1.logger.debug(`[parallel] Job complete for session ${sessionId}`);
    }, { connection, concurrency: 2 } // Reduced to 2 parallel to avoid API overload
    );
    logger_1.logger.debug('NEW Parallel worker created');
    // NEW: Worker to emit pre-generated cached steps
    const emitWorker = new bullmq_1.Worker('gen-jobs', async (job) => {
        if (job.name !== 'emit-cached')
            return;
        const { sessionId, step, plan } = job.data;
        const cached = await redis.get(CHUNK_KEY(sessionId, step.id));
        if (cached) {
            const chunk = JSON.parse(cached);
            const eventData = {
                ...chunk,
                step,
                plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc }
            };
            io.to(sessionId).emit('rendered', eventData);
            logger_1.logger.debug(`[emit] Emitted cached step ${step.id} for session ${sessionId}`);
        }
    }, { connection, concurrency: 2 });
    planWorker.on('failed', (job, err) => logger_1.logger.error(`[plan:failed] id=${job?.id} ${String(err)}`));
    genWorker.on('failed', (job, err) => logger_1.logger.error(`[gen:failed] id=${job?.id} ${String(err)}`));
    parallelWorker.on('failed', (job, err) => logger_1.logger.error(`[parallel:failed] id=${job?.id} ${String(err)}`));
    emitWorker.on('failed', (job, err) => logger_1.logger.error(`[emit:failed] id=${job?.id} ${String(err)}`));
    async function enqueuePlan(query, sessionId) {
        logger_1.logger.debug(`[orchestrator] Enqueuing plan for session ${sessionId}`);
        await redis.set(QUERY_KEY(sessionId), query);
        const job = await planQueue.add('plan', { query, sessionId }, { ...defaultJobOpts });
        logger_1.logger.debug(`[orchestrator] Plan job added with id ${job.id} for session ${sessionId}`);
    }
    async function setParams(sessionId, params) {
        await redis.set(PARAMS_KEY(sessionId), JSON.stringify(params));
    }
    // Add API endpoints for monitoring
    const getPerformanceReport = () => perfMonitor.generateReport();
    const getCacheStats = () => cacheManager.getStats();
    const clearCache = () => cacheManager.clearAll();
    return {
        enqueuePlan,
        setParams,
        getPerformanceReport,
        getCacheStats,
        clearCache
    };
}
