/**
 * WEBSOCKET FULL SYSTEM TEST
 * 
 * Complete end-to-end test with WebSocket monitoring
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:8000';
const TEST_TOPIC = 'Teach me about Photosynthesis: light reactions, Calvin cycle, and electron transport chain';

interface StepAnalysis {
  stepNumber: number;
  title: string;
  hasNotes: boolean;
  notesLength: number;
  animationCount: number;
  animationsHaveAnimateTags: boolean;
  contextKeywordsFound: string[];
  errors: string[];
  success: boolean;
  receivedAt: number;
}

interface TestMetrics {
  topic: string;
  sessionId: string;
  planReceived: boolean;
  planTime: number;
  totalSteps: number;
  stepsReceived: number;
  stepAnalysis: StepAnalysis[];
  totalTime: number;
  success: boolean;
}

async function runFullTest(): Promise<TestMetrics> {
  console.log('\n' + '='.repeat(100));
  console.log('WEBSOCKET FULL SYSTEM TEST - BRUTAL HONESTY MODE');
  console.log('='.repeat(100));
  console.log(`Topic: ${TEST_TOPIC}`);
  console.log('='.repeat(100) + '\n');

  const startTime = Date.now();
  const metrics: TestMetrics = {
    topic: TEST_TOPIC,
    sessionId: '',
    planReceived: false,
    planTime: 0,
    totalSteps: 0,
    stepsReceived: 0,
    stepAnalysis: [],
    totalTime: 0,
    success: false,
  };

  return new Promise(async (resolve) => {
    // Step 1: Check health
    console.log('📡 Checking server health...');
    try {
      await axios.get(`${BACKEND_URL}/health`, { timeout: 3000 });
      console.log('✅ Server is UP\n');
    } catch (err) {
      console.error('❌ Server is DOWN');
      metrics.totalTime = Date.now() - startTime;
      resolve(metrics);
      return;
    }

    // Step 2: Create session
    console.log('🔧 Creating session...');
    let sessionId: string;
    try {
      const response = await axios.post(`${BACKEND_URL}/api/query`, {
        query: TEST_TOPIC,
      });
      sessionId = response.data.sessionId;
      metrics.sessionId = sessionId;
      console.log(`✅ Session created: ${sessionId}\n`);
    } catch (err: any) {
      console.error('❌ Failed to create session:', err.message);
      metrics.totalTime = Date.now() - startTime;
      resolve(metrics);
      return;
    }

    // Step 3: Connect WebSocket
    console.log('🔌 Connecting WebSocket...');
    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    let timeout: NodeJS.Timeout;

    // Set overall timeout (5 minutes)
    timeout = setTimeout(() => {
      console.log('\n⏱️  TEST TIMEOUT (5 minutes) - Analyzing partial results...\n');
      socket.disconnect();
      metrics.totalTime = Date.now() - startTime;
      printFinalReport(metrics);
      resolve(metrics);
    }, 300000);

    socket.on('connect', () => {
      console.log(`✅ WebSocket connected: ${socket.id}`);
      console.log(`📤 Joining session: ${sessionId}\n`);
      socket.emit('join', { sessionId });
    });

    socket.on('joined', (data: any) => {
      console.log(`✅ Joined session: ${data.sessionId}\n`);
      console.log('⏳ Waiting for plan and steps...\n');
    });

    socket.on('plan', (data: any) => {
      metrics.planReceived = true;
      metrics.planTime = Date.now() - startTime;
      metrics.totalSteps = data.steps?.length || 0;

      console.log('='.repeat(100));
      console.log(`📋 PLAN RECEIVED (${(metrics.planTime / 1000).toFixed(2)}s)`);
      console.log('='.repeat(100));
      console.log(`Title: ${data.title}`);
      console.log(`Subtitle: ${data.subtitle}`);
      console.log(`Total Steps: ${metrics.totalSteps}`);
      console.log('='.repeat(100) + '\n');
    });

    socket.on('rendered', (data: any) => {
      metrics.stepsReceived++;
      const stepNum = data.step?.id || metrics.stepsReceived;
      const receivedAt = Date.now() - startTime;

      console.log('='.repeat(100));
      console.log(`📦 STEP ${stepNum}/${metrics.totalSteps} RECEIVED (${(receivedAt / 1000).toFixed(2)}s)`);
      console.log('='.repeat(100));

      const analysis: StepAnalysis = {
        stepNumber: stepNum,
        title: data.step?.desc || 'Unknown',
        hasNotes: false,
        notesLength: 0,
        animationCount: 0,
        animationsHaveAnimateTags: false,
        contextKeywordsFound: [],
        errors: [],
        success: false,
        receivedAt,
      };

      console.log(`Description: ${analysis.title.substring(0, 100)}...`);

      if (!data.actions || !Array.isArray(data.actions)) {
        analysis.errors.push('No actions array');
        console.log('❌ No actions array\n');
      } else {
        console.log(`\n📦 Total Actions: ${data.actions.length}`);

        // Analyze Notes
        const notesAction = data.actions.find((a: any) => a.op === 'customSVG' && a.isNotesKeynote === true);
        if (notesAction?.svgCode) {
          analysis.hasNotes = true;
          analysis.notesLength = notesAction.svgCode.length;
          console.log(`✅ Notes: ${analysis.notesLength} chars`);

          // Check SVG quality
          const textCount = (notesAction.svgCode.match(/<text/g) || []).length;
          const hasViewBox = notesAction.svgCode.includes('viewBox');
          console.log(`   - Text elements: ${textCount}`);
          console.log(`   - Has viewBox: ${hasViewBox ? '✅' : '❌'}`);

          if (analysis.notesLength < 3000) {
            analysis.errors.push(`Notes too short: ${analysis.notesLength} chars`);
            console.log(`   ⚠️  Quality warning: content is short`);
          }
        } else {
          analysis.errors.push('No notes keynote');
          console.log('❌ No notes keynote found');
        }

        // Analyze Animations
        const animActions = data.actions.filter((a: any) => a.op === 'customSVG' && a.isNotesKeynote !== true);
        analysis.animationCount = animActions.length;
        
        if (animActions.length > 0) {
          console.log(`✅ Animations: ${animActions.length} animations`);
          
          let hasAnimateTags = false;
          animActions.forEach((anim: any, idx: number) => {
            const length = anim.svgCode?.length || 0;
            const hasAnimate = anim.svgCode?.includes('<animate');
            const hasAnimateMotion = anim.svgCode?.includes('<animateMotion');
            const hasAnyAnimation = hasAnimate || hasAnimateMotion;
            
            if (hasAnyAnimation) hasAnimateTags = true;
            
            console.log(`   Animation ${idx + 1}: ${length} chars, ${hasAnyAnimation ? '✅ animated' : '❌ static'}`);
          });
          
          analysis.animationsHaveAnimateTags = hasAnimateTags;
          if (!hasAnimateTags) {
            analysis.errors.push('Animations have no <animate> tags');
            console.log('   ⚠️  WARNING: No <animate> or <animateMotion> tags found!');
          }
        } else {
          analysis.errors.push('No animations generated');
          console.log('❌ No animations found');
        }

        // Check Contextuality
        const allSVG = data.actions
          .filter((a: any) => a.op === 'customSVG')
          .map((a: any) => a.svgCode || '')
          .join(' ')
          .toLowerCase();

        const topicKeywords = ['photosynthesis', 'chloroplast', 'light', 'calvin', 'cycle', 'electron', 'transport', 'atp', 'nadph', 'glucose', 'thylakoid', 'stroma'];
        analysis.contextKeywordsFound = topicKeywords.filter(kw => allSVG.includes(kw));

        if (analysis.contextKeywordsFound.length > 0) {
          console.log(`✅ Context keywords: ${analysis.contextKeywordsFound.join(', ')}`);
        } else {
          analysis.errors.push('No topic keywords - may be generic/fallback content');
          console.log('⚠️  NO TOPIC KEYWORDS FOUND - Content may be generic!');
        }
      }

      analysis.success = analysis.hasNotes && analysis.animationCount > 0 && analysis.contextKeywordsFound.length > 0;

      console.log(`\n${analysis.success ? '✅ STEP SUCCESS' : '❌ STEP FAILED'}`);
      if (!analysis.success) {
        console.log(`Errors: ${analysis.errors.join(', ')}`);
      }
      console.log('='.repeat(100) + '\n');

      metrics.stepAnalysis.push(analysis);

      // Check if all steps received
      if (metrics.stepsReceived === metrics.totalSteps && metrics.totalSteps > 0) {
        clearTimeout(timeout);
        console.log('✅ All steps received!\n');
        socket.disconnect();
        metrics.totalTime = Date.now() - startTime;
        printFinalReport(metrics);
        resolve(metrics);
      }
    });

    socket.on('error', (err: any) => {
      console.error('❌ Socket error:', err.message);
    });

    socket.on('disconnect', () => {
      console.log('\n🔌 WebSocket disconnected\n');
    });

    socket.on('connect_error', (err: any) => {
      console.error('❌ Connection error:', err.message);
      clearTimeout(timeout);
      metrics.totalTime = Date.now() - startTime;
      resolve(metrics);
    });
  });
}

function printFinalReport(metrics: TestMetrics) {
  console.log('\n' + '='.repeat(100));
  console.log('FINAL BRUTAL HONESTY REPORT');
  console.log('='.repeat(100));
  
  console.log(`\n📊 Overall Metrics:`);
  console.log(`   Total Time: ${(metrics.totalTime / 1000).toFixed(2)}s`);
  console.log(`   Plan Received: ${metrics.planReceived ? '✅' : '❌'} ${metrics.planReceived ? `(${(metrics.planTime / 1000).toFixed(2)}s)` : ''}`);
  console.log(`   Total Steps Expected: ${metrics.totalSteps}`);
  console.log(`   Steps Received: ${metrics.stepsReceived}/${metrics.totalSteps}`);
  
  if (metrics.stepAnalysis.length > 0) {
    const successfulSteps = metrics.stepAnalysis.filter(s => s.success).length;
    const failedSteps = metrics.stepAnalysis.filter(s => !s.success).length;
    const withNotes = metrics.stepAnalysis.filter(s => s.hasNotes).length;
    const withAnimations = metrics.stepAnalysis.filter(s => s.animationCount > 0).length;
    const withContext = metrics.stepAnalysis.filter(s => s.contextKeywordsFound.length > 0).length;
    
    console.log(`\n📈 Quality Metrics:`);
    console.log(`   Successful Steps: ${successfulSteps}/${metrics.totalSteps} (${((successfulSteps / metrics.totalSteps) * 100).toFixed(1)}%)`);
    console.log(`   Failed Steps: ${failedSteps}/${metrics.totalSteps}`);
    console.log(`   Steps with Notes: ${withNotes}/${metrics.totalSteps}`);
    console.log(`   Steps with Animations: ${withAnimations}/${metrics.totalSteps}`);
    console.log(`   Steps with Context Keywords: ${withContext}/${metrics.totalSteps}`);
    
    metrics.success = successfulSteps === metrics.totalSteps && metrics.totalSteps > 0;
    
    console.log(`\n🎯 Architectural Assessment:`);
    console.log(`   ✓ No Fallbacks: ${withContext === metrics.totalSteps ? '✅ YES' : '❌ NO - Generic content detected'}`);
    console.log(`   ✓ Dynamic Generation: ${withContext > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   ✓ Contextual Content: ${((withContext / metrics.totalSteps) * 100).toFixed(1)}%`);
    console.log(`   ✓ Animation Quality: ${metrics.stepAnalysis.filter(s => s.animationsHaveAnimateTags).length}/${withAnimations} have <animate> tags`);
  }
  
  console.log(`\n${metrics.success ? '✅ OVERALL: SUCCESS - All quality checks passed!' : '❌ OVERALL: FAILED - Quality issues detected'}`);
  console.log('='.repeat(100) + '\n');
}

// Run test
runFullTest()
  .then(metrics => {
    process.exit(metrics.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
  });
