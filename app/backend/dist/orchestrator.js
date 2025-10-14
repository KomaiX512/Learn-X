"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOrchestrator = initOrchestrator;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const planner_1 = require("./agents/planner");
const codegen_1 = require("./agents/codegen");
const codegenV2_1 = __importDefault(require("./agents/codegenV2"));
const codegenV3WithRetry_1 = require("./agents/codegenV3WithRetry");
const transcriptGenerator_1 = require("./agents/transcriptGenerator");
const audio_narration_service_1 = require("./services/audio-narration-service");
const router_1 = require("./compiler/router");
const debugger_1 = require("./agents/debugger");
const cache_manager_1 = require("./services/cache-manager");
const performance_monitor_1 = require("./services/performance-monitor");
const PLAN_KEY = (sessionId) => `session:${sessionId}:plan`;
const QUERY_KEY = (sessionId) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId, stepId) => `session:${sessionId}:step:${stepId}:chunk`;
const LEARNING_STATE_KEY = (sessionId) => `session:${sessionId}:learning_state`;
// Production config: Notes + 4 animations per step
const VISUALS_PER_STEP = 4; // Animation visuals only
const ENABLE_NOTES_GENERATION = true; // Set to false to disable notes keynotes
// Progressive learning timing - NOT USED anymore (immediate emission)
// Kept for reference only
const TIMING_BY_COMPLEXITY = {
    1: 0, // Immediate
    2: 0, // Immediate  
    3: 0, // Immediate
    4: 0, // Immediate
    5: 0 // Immediate
};
/**
 * Generate notes keynote + multiple animation visuals + narrations for a single step
 * OPTIMIZED ARCHITECTURE:
 * - Notes keynote generated FIRST (priority visual)
 * - 4 animation visuals generated in parallel
 * - Narrations generated ONCE for all visuals (single API call)
 * - Notes rendered at top, animations vertically below
 * - Parallel generation to save time
 */
async function generateStepVisuals(step, topic, sessionId) {
    logger_1.logger.info(`[stepVisuals] 🎯 OPTIMIZED ARCHITECTURE: Notes + ${VISUALS_PER_STEP} animations + narrations for step ${step.id}`);
    const visualDescriptions = [];
    const allPromises = [];
    let notesPromise = null;
    let notesSvgCode = null;
    // PRIORITY 1: Generate notes keynote (if enabled)
    if (ENABLE_NOTES_GENERATION) {
        logger_1.logger.info(`[stepVisuals] 📝 Starting NOTES generation (priority visual) for step ${step.id}`);
        notesPromise = (async () => {
            try {
                const subtopic = step.desc; // Use step description as subtopic
                const svgCode = await (0, transcriptGenerator_1.generateNotes)(step, topic, subtopic);
                if (!svgCode) {
                    logger_1.logger.error(`[stepVisuals] ❌ Notes generation failed for step ${step.id}`);
                    return null;
                }
                notesSvgCode = svgCode; // Store for narration generator
                logger_1.logger.info(`[stepVisuals] ✅ Notes generated (${svgCode.length} chars)`);
                // Return as customSVG action with special marking
                return {
                    op: 'customSVG',
                    svgCode,
                    visualGroup: `step-${step.id}-notes`,
                    isNotesKeynote: true, // Special flag for frontend prioritization
                    priority: 1 // Highest priority - render first
                };
            }
            catch (error) {
                logger_1.logger.error(`[stepVisuals] Notes generation error: ${error.message}`);
                return null;
            }
        })();
        allPromises.push(notesPromise);
    }
    // PRIORITY 2: Generate animation visuals in parallel
    const animationMetadata = [];
    const animationPromises = Array.from({ length: VISUALS_PER_STEP }, async (_, index) => {
        const visualNumber = index + 1;
        logger_1.logger.info(`[stepVisuals] 🎬 Starting animation ${visualNumber}/${VISUALS_PER_STEP} for step ${step.id}`);
        try {
            // Each visual uses the SAME codegenV3WithRetry - proven to work
            const result = await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, topic);
            if (!result || !result.actions || result.actions.length === 0) {
                logger_1.logger.warn(`[stepVisuals] Animation ${visualNumber} returned no actions`);
                return null;
            }
            // Store metadata for narration generator
            animationMetadata.push({
                index,
                result,
                actionCount: result.actions.length
            });
            // Store description
            const description = `Animated SVG visualization ${visualNumber}: ${step.desc.substring(0, 80)}`;
            visualDescriptions.push({ visualNumber, description });
            logger_1.logger.info(`[stepVisuals] ✅ Animation ${visualNumber} complete with ${result.actions.length} actions`);
            // Mark as animation with lower priority
            const action = result.actions[0];
            return {
                ...action,
                visualGroup: `step-${step.id}-animation-${visualNumber}`,
                isNotesKeynote: false,
                priority: 2 + visualNumber // Lower priority - render after notes
            };
        }
        catch (error) {
            logger_1.logger.error(`[stepVisuals] Animation ${visualNumber} failed: ${error.message}`);
            return null;
        }
    });
    allPromises.push(...animationPromises);
    // PARALLEL EXECUTION: Wait for all (notes + animations) to complete
    logger_1.logger.info(`[stepVisuals] ⚡ Running ${allPromises.length} parallel visual generations...`);
    const allResults = await Promise.all(allPromises);
    // Separate notes from animations
    const notesAction = ENABLE_NOTES_GENERATION ? allResults[0] : null;
    const animationResults = ENABLE_NOTES_GENERATION ? allResults.slice(1) : allResults;
    // Filter out nulls from animations
    const successfulAnimations = animationResults.filter(v => v !== null);
    logger_1.logger.info(`[stepVisuals] ✅ VISUALS COMPLETE: Notes=${notesAction ? 'YES' : 'NO'}, Animations=${successfulAnimations.length}/${VISUALS_PER_STEP}`);
    // PRIORITY 3: Generate narrations + audio for ALL visuals in ONE API call
    let stepNarration = undefined;
    try {
        logger_1.logger.info(`[stepVisuals] 🎤 Starting NARRATION + AUDIO generation (single API call for all visuals)`);
        // Prepare visual inputs for narration + audio generator
        const visualInputs = [];
        // Add notes visual
        if (notesAction && notesSvgCode) {
            visualInputs.push({
                type: 'notes',
                visualNumber: 0,
                svgCode: notesSvgCode,
                description: step.desc
            });
        }
        // Add animation visuals
        successfulAnimations.forEach((anim, idx) => {
            const metadata = animationMetadata.find(m => m.index === idx);
            visualInputs.push({
                type: 'animation',
                visualNumber: idx + 1,
                actionCount: metadata?.actionCount || 0,
                description: step.desc
            });
        });
        if (visualInputs.length > 0) {
            stepNarration = await (0, audio_narration_service_1.generateStepNarrationWithAudio)(step, topic, visualInputs, sessionId);
            const hasAudioStr = stepNarration.hasAudio ? 'with audio' : 'text-only';
            const audioSizeMB = (stepNarration.totalAudioSize / 1024 / 1024).toFixed(2);
            logger_1.logger.info(`[stepVisuals] ✅ NARRATIONS generated: ${stepNarration.narrations.length} narrations (${stepNarration.totalDuration}s total, ${hasAudioStr}, ${audioSizeMB}MB)`);
        }
    }
    catch (error) {
        logger_1.logger.error(`[stepVisuals] ⚠️ Narration/audio generation failed (non-critical): ${error.message}`);
        // Continue without narrations - they're optional
    }
    // Generate transcript summary
    const transcript = stepNarration
        ? `Step ${step.id}: ${step.desc}`
        : `Step ${step.id}: ${step.desc} (Notes: ${notesAction ? 'generated' : 'skipped'}, Animations: ${successfulAnimations.length})`;
    return {
        notesAction,
        animationActions: successfulAnimations,
        transcript,
        visualDescriptions,
        narration: stepNarration
    };
}
async function initOrchestrator(io, redis) {
    // BullMQ requires separate Redis connections for queues and workers
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    // Create separate connections for BullMQ
    const queueConnection = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
    const workerConnection = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
    // Initialize services with original redis connection
    const cacheManager = new cache_manager_1.CacheManager(redis);
    const perfMonitor = new performance_monitor_1.PerformanceMonitor();
    // Clear any stale jobs on startup
    console.log('🧹 Clearing stale job queues on startup...');
    // Create queues with queue connection
    const planQueue = new bullmq_1.Queue('plan-jobs', { connection: queueConnection });
    const genQueue = new bullmq_1.Queue('gen-jobs', { connection: queueConnection });
    const parallelQueue = new bullmq_1.Queue('parallel-gen-jobs', { connection: queueConnection });
    // Clean up stale jobs ONLY on startup, not continuously
    // await planQueue.obliterate({ force: true }).catch(() => {});
    // await genQueue.obliterate({ force: true }).catch(() => {});
    // await parallelQueue.obliterate({ force: true }).catch(() => {});
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
        const { query, sessionId } = job.data;
        console.log('\n' + '─'.repeat(70));
        console.log('📋 PLAN WORKER STARTED');
        console.log('─'.repeat(70));
        console.log('Session:', sessionId);
        console.log('Query:', query);
        console.log('Time:', new Date().toISOString());
        console.log('─'.repeat(70));
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
        // EMIT PLAN EVENT TO FRONTEND (CRITICAL FIX)
        io.to(sessionId).emit('plan', {
            title: plan.title,
            subtitle: plan.subtitle,
            toc: plan.toc,
            steps: plan.steps.map(s => ({ id: s.id, tag: s.tag, desc: s.desc }))
        });
        logger_1.logger.debug(`[plan] Emitted plan event to session ${sessionId}`);
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
    }, { connection: workerConnection });
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
            const version = process.env.USE_VISUAL_VERSION || 'v3';
            logger_1.logger.info(`[orchestrator] 🚀 Using ${version} pipeline for step ${step.id}`);
            // Use retry wrapper for V3
            const code = version === 'v3' ? await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, query) :
                version === 'v2' ? await (0, codegenV2_1.default)(step, query) :
                    await (0, codegen_1.codegenAgent)(step, query);
            // CRITICAL: Handle null from codegen
            if (!code) {
                logger_1.logger.error(`[gen] ❌ PREFETCH FAILED: codegen returned null for step ${step.id}`);
                return; // Skip caching, will retry on actual emit
            }
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
                const version = process.env.USE_VISUAL_VERSION || 'v3';
                logger_1.logger.info(`[orchestrator] 🚀 Using ${version} pipeline for step ${step.id}`);
                // Use retry wrapper for V3
                const code = version === 'v3' ? await (0, codegenV3WithRetry_1.codegenV3WithRetry)(step, query) :
                    version === 'v2' ? await (0, codegenV2_1.default)(step, query) :
                        await (0, codegen_1.codegenAgent)(step, query);
                // CRITICAL: Handle null from codegen
                if (!code) {
                    logger_1.logger.error(`[gen] ❌ GENERATION FAILED: codegen returned null after all retries for step ${step.id}`);
                    throw new Error(`Generation failed after ${3} retry attempts for step ${step.id}`);
                }
                logger_1.logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
                const compiled = await (0, router_1.compilerRouter)(code, step.compiler);
                checked = await (0, debugger_1.debugAgent)(compiled);
                await redis.set(key, JSON.stringify(checked));
            }
            catch (error) {
                logger_1.logger.error(`[gen] CRITICAL FAILURE for session=${sessionId} step=${step.id}: ${error}`);
                // Let it fail but with better error message
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
    }, { connection: workerConnection, concurrency: 2 });
    logger_1.logger.debug('NEW Gen worker created');
    // NEW: Parallel generation worker - generates ALL steps simultaneously
    const parallelWorker = new bullmq_1.Worker('parallel-gen-jobs', async (job) => {
        console.log('\n' + '='.repeat(100));
        console.log('🔥 PARALLEL WORKER CALLED');
        console.log('='.repeat(100));
        console.log('Job ID:', job.id);
        console.log('Job name:', job.name);
        console.log('Job data keys:', Object.keys(job.data || {}));
        console.log('='.repeat(100) + '\n');
        if (job.name !== 'parallel-generate') {
            logger_1.logger.error(`[parallel] SKIPPING: Job name is '${job.name}', expected 'parallel-generate'`);
            return;
        }
        const { sessionId, plan, query } = job.data;
        console.log('\n' + '─'.repeat(70));
        console.log('⚡ PARALLEL WORKER STARTED');
        console.log('─'.repeat(70));
        console.log('Session:', sessionId);
        console.log('Query:', query);
        console.log('Steps to generate:', plan.steps.length);
        console.log('Time:', new Date().toISOString());
        console.log('─'.repeat(70));
        logger_1.logger.info(`[parallel] ⚡ STARTING parallel generation for ${plan.steps.length} steps (session: ${sessionId})`);
        const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
        const params = paramsRaw ? JSON.parse(paramsRaw) : {};
        // Track generation progress
        const generationPromises = [];
        const startTime = Date.now();
        // CRITICAL FIX: Store results in memory for direct emit (don't rely on cache)
        const stepResults = new Map();
        // Emit initial progress
        io.to(sessionId).emit('generation_progress', {
            phase: 'starting',
            totalSteps: plan.steps.length,
            completedSteps: 0,
            message: `🚀 Starting generation of ${plan.steps.length} steps...`
        });
        let completedCount = 0;
        // Generate all steps in parallel WITH IMMEDIATE EMISSION
        // Optimized for Gemini 2.5 Flash Paid Tier (1,000-4,000 RPM)
        // Stagger by 2s for optimal throughput without hitting burst limits
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            // Add 2-second staggered delay (optimized for paid tier)
            if (i > 0) {
                const delay = 2000; // Reduced from 5s to 2s for faster user experience
                logger_1.logger.info(`[parallel] ⏸️  Staggering ${delay}ms before step ${step.id} (optimized for paid tier)`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
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
                            message: `Generating ${VISUALS_PER_STEP} visuals for ${step.tag}...`
                        });
                        // NEW ARCHITECTURE: Generate notes + animations + narrations
                        logger_1.logger.info(`[parallel] 🚀 Step ${step.id}: Generating notes + ${VISUALS_PER_STEP} animations + narrations`);
                        const { notesAction, animationActions, transcript, visualDescriptions, narration } = await generateStepVisuals(step, query, sessionId);
                        // CRITICAL: Combine notes + animations into prioritized actions array
                        const allActions = [];
                        // Add notes FIRST (priority 1)
                        if (notesAction) {
                            allActions.push(notesAction);
                            logger_1.logger.info(`[parallel] ✅ Notes keynote included (priority 1)`);
                        }
                        // Add animations AFTER notes (priority 2+)
                        if (animationActions && animationActions.length > 0) {
                            allActions.push(...animationActions);
                            logger_1.logger.info(`[parallel] ✅ ${animationActions.length} animations included (priority 2+)`);
                        }
                        // Validate we have at least something to render
                        if (allActions.length === 0) {
                            logger_1.logger.error(`[parallel] ❌ Step ${step.id} generated no visuals (notes or animations)`);
                            throw new Error(`Step ${step.id} generation produced no visuals`);
                        }
                        // Build the result chunk with transcript and narrations
                        checked = {
                            type: 'actions',
                            stepId: step.id,
                            actions: allActions, // Prioritized: notes first, then animations
                            transcript,
                            narration, // Include structured narrations for each visual
                            meta: {
                                hasNotes: notesAction !== null,
                                animationCount: animationActions.length,
                                totalVisuals: allActions.length,
                                transcriptLength: transcript.length,
                                hasNarration: narration !== undefined,
                                narrationCount: narration?.narrations?.length || 0,
                                totalAudioDuration: narration?.totalDuration || 0
                            }
                        };
                        // Cache the result in both places
                        const key = CHUNK_KEY(sessionId, step.id);
                        await redis.set(key, JSON.stringify(checked));
                        await cacheManager.cacheChunk(query, step.id, checked);
                    }
                    const genTime = Date.now() - stepStartTime;
                    perfMonitor.endStepGeneration(sessionId, step.id, true);
                    logger_1.logger.info(`[parallel] ✅ Step ${step.id} COMPLETE in ${genTime}ms with ${checked.actions?.length || 0} actions`);
                    // CRITICAL: Store in memory
                    stepResults.set(step.id, checked);
                    // IMMEDIATE EMISSION - Don't wait for other steps!
                    const eventData = {
                        type: 'actions',
                        actions: checked.actions,
                        transcript: checked.transcript || '', // Legacy transcript
                        narration: checked.narration, // NEW: Structured narrations + audio for TTS
                        stepId: step.id,
                        step: step,
                        plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc },
                        totalSteps: plan.steps.length,
                        meta: checked.meta, // Include metadata about visual count
                        // TTS synchronization configuration
                        ttsConfig: {
                            enabled: (0, audio_narration_service_1.isAudioNarrationAvailable)(),
                            interVisualDelay: (0, audio_narration_service_1.getInterVisualDelay)(), // ms to wait between visuals
                            waitForNarration: true, // Must wait for narration to complete
                            waitForAnimation: true // Must wait for animation to complete
                        }
                    };
                    // DEBUGGING: Log room membership
                    const roomSockets = io.sockets.adapter.rooms.get(sessionId);
                    const socketCount = roomSockets ? roomSockets.size : 0;
                    console.log('');
                    console.log('═'.repeat(70));
                    console.log('🚀 ABOUT TO EMIT STEP');
                    console.log('═'.repeat(70));
                    console.log('SessionId:', sessionId);
                    console.log('StepId:', step.id);
                    console.log('Actions:', checked.actions.length);
                    console.log('Room sockets:', socketCount);
                    console.log('═'.repeat(70));
                    io.to(sessionId).emit('rendered', eventData);
                    console.log('✅ EMITTED SUCCESSFULLY');
                    console.log('');
                    logger_1.logger.info(`[parallel] 🚀 IMMEDIATELY EMITTED step ${step.id} to frontend (${socketCount} sockets)`);
                    // Emit progress
                    completedCount++;
                    const progressPercent = Math.round((completedCount / plan.steps.length) * 100);
                    io.to(sessionId).emit('progress', {
                        stepId: step.id,
                        status: 'ready',
                        generationTime: genTime,
                        actionsCount: checked.actions?.length || 0,
                        message: `Step ${step.id} ready (${checked.actions?.length || 0} actions)`
                    });
                    io.to(sessionId).emit('generation_progress', {
                        phase: 'generating',
                        totalSteps: plan.steps.length,
                        completedSteps: completedCount,
                        progress: progressPercent,
                        message: `✅ ${completedCount}/${plan.steps.length} steps ready (${progressPercent}%)`
                    });
                    return { stepId: step.id, success: true, time: genTime, actions: checked.actions?.length };
                }
                catch (error) {
                    const genTime = Date.now() - stepStartTime;
                    perfMonitor.endStepGeneration(sessionId, step.id, false);
                    logger_1.logger.error(`[parallel] Step ${step.id} failed: ${error}`);
                    // Store null for failed steps
                    stepResults.set(step.id, null);
                    // Emit error immediately
                    io.to(sessionId).emit('rendered', {
                        type: 'error',
                        stepId: step.id,
                        step: step,
                        message: `Step ${step.id} failed to generate`,
                        error: String(error)
                    });
                    io.to(sessionId).emit('progress', {
                        stepId: step.id,
                        status: 'error',
                        error: String(error),
                        message: `Step ${step.id} generation failed`
                    });
                    return { stepId: step.id, success: false, error: String(error), time: genTime };
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
        // Emit final progress update
        io.to(sessionId).emit('generation_progress', {
            phase: 'complete',
            totalSteps: plan.steps.length,
            completedSteps: successful,
            progress: 100,
            message: `🎉 Generation complete! ${successful}/${plan.steps.length} steps ready in ${(totalTime / 1000).toFixed(1)}s`
        });
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
        // NO SEQUENTIAL DELIVERY - Steps are emitted immediately as they complete above!
        logger_1.logger.debug(`[parallel] Job complete for session ${sessionId}`);
    }, { connection: workerConnection, concurrency: 2 } // Reduced to 2 parallel to avoid API overload
    );
    logger_1.logger.debug('NEW Parallel worker created');
    // REMOVED: Old emit worker - we now emit directly from parallel worker
    // const emitWorker = new Worker(...);
    planWorker.on('failed', (job, err) => logger_1.logger.error(`[plan:failed] id=${job?.id} ${String(err)}`));
    genWorker.on('failed', (job, err) => logger_1.logger.error(`[gen:failed] id=${job?.id} ${String(err)}`));
    parallelWorker.on('failed', (job, err) => {
        logger_1.logger.error(`[parallel:FAILED] id=${job?.id} session=${job?.data?.sessionId}`);
        logger_1.logger.error(`[parallel:FAILED] Error: ${String(err)}`);
        logger_1.logger.error(`[parallel:FAILED] Stack: ${err.stack}`);
    });
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
