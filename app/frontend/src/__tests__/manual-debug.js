/**
 * Manual debugging script for sequential rendering
 * Copy this into browser console to test real-time behavior
 * 
 * Usage:
 * 1. Open your app in browser
 * 2. Open DevTools console
 * 3. Copy and paste this entire script
 * 4. Run: testSequentialRendering()
 */

window.debugSequentialRenderer = {
  /**
   * Test 1: Check if renderer auto-starts
   */
  testAutoStart: function() {
    console.log('🧪 TEST 1: Auto-start playback');
    console.log('Expected: AnimationQueue should start playing automatically when chunk arrives');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found on window');
      return;
    }

    const queueBefore = renderer.animationQueue.getStatus();
    console.log('Queue status before:', queueBefore);

    // Simulate a chunk
    const testChunk = {
      stepId: 999,
      actions: [
        { op: 'drawLabel', text: 'Auto-start test', x: 0.5, y: 0.5 }
      ],
      transcript: 'This should auto-start rendering.'
    };

    renderer.processChunk(testChunk);

    setTimeout(() => {
      const queueAfter = renderer.animationQueue.getStatus();
      console.log('Queue status after:', queueAfter);
      
      if (queueAfter.isPlaying) {
        console.log('✅ PASS: Auto-start working');
      } else {
        console.error('❌ FAIL: Auto-start not working - isPlaying is false');
      }
    }, 500);
  },

  /**
   * Test 2: Check sequential timing
   */
  testSequentialTiming: function() {
    console.log('\n🧪 TEST 2: Sequential timing (visuals should appear with gaps)');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found');
      return;
    }

    const processingTimes = [];
    const originalProcess = renderer.processAction.bind(renderer);
    
    renderer.processAction = async function(action, section) {
      processingTimes.push({ time: Date.now(), op: action.op });
      console.log(`🎬 Processing: ${action.op} at ${Date.now()}`);
      return originalProcess(action, section);
    };

    const testChunk = {
      stepId: 998,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'test1'
        },
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>',
          visualGroup: 'test2'
        }
      ],
      transcript: 'First visual. Second visual. Third visual. Fourth visual.'
    };

    renderer.processChunk(testChunk);

    setTimeout(() => {
      console.log('Processing times:', processingTimes);
      
      if (processingTimes.length >= 2) {
        const gap = processingTimes[1].time - processingTimes[0].time;
        console.log(`Gap between visuals: ${gap}ms`);
        
        if (gap >= 2000) {
          console.log('✅ PASS: Visuals have proper gap (>= 2000ms)');
        } else {
          console.error(`❌ FAIL: Gap too short (${gap}ms < 2000ms expected)`);
        }
      } else {
        console.error('❌ FAIL: Not enough processing events captured');
      }
      
      // Restore original
      renderer.processAction = originalProcess;
    }, 6000);
  },

  /**
   * Test 3: Check caption appearance
   */
  testCaptions: function() {
    console.log('\n🧪 TEST 3: Caption appearance before visuals');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found');
      return;
    }

    const testChunk = {
      stepId: 997,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>',
          visualGroup: 'caption-test'
        }
      ],
      transcript: 'This is the caption text. It should appear before the visual. Testing caption functionality.'
    };

    renderer.processChunk(testChunk);

    // Check after caption should appear
    setTimeout(() => {
      const captionEl = renderer.captionEl;
      
      if (captionEl) {
        console.log('✅ PASS: Caption element exists');
        console.log('Caption text:', captionEl.textContent);
        console.log('Caption position:', captionEl.style.top);
        
        if (captionEl.textContent.includes('caption')) {
          console.log('✅ PASS: Caption contains transcript text');
        } else {
          console.error('❌ FAIL: Caption text incorrect');
        }
      } else {
        console.error('❌ FAIL: No caption element found');
      }
    }, 1200);
  },

  /**
   * Test 4: Check auto-scroll
   */
  testAutoScroll: function() {
    console.log('\n🧪 TEST 4: Auto-scroll behavior');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found');
      return;
    }

    const stage = renderer.stage;
    if (!stage) {
      console.error('❌ FAIL: No stage found');
      return;
    }

    const container = stage.container();
    const scrollParent = container.parentElement;
    
    if (!scrollParent) {
      console.error('❌ FAIL: No scroll parent found');
      return;
    }

    const initialScroll = scrollParent.scrollTop;
    console.log('Initial scroll position:', initialScroll);

    const testChunk = {
      stepId: 996,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="600" height="800"><circle cx="300" cy="400" r="100" fill="purple"/></svg>',
          visualGroup: 'scroll-test'
        }
      ],
      transcript: 'Testing auto-scroll functionality.'
    };

    renderer.processChunk(testChunk);

    setTimeout(() => {
      const finalScroll = scrollParent.scrollTop;
      console.log('Final scroll position:', finalScroll);
      
      if (finalScroll > initialScroll) {
        console.log(`✅ PASS: Auto-scroll working (scrolled ${finalScroll - initialScroll}px)`);
      } else {
        console.error('❌ FAIL: No scroll detected');
      }
    }, 2500);
  },

  /**
   * Test 5: Check step transitions
   */
  testStepTransitions: function() {
    console.log('\n🧪 TEST 5: Step transitions and state reset');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found');
      return;
    }

    // Step 1
    const step1 = {
      stepId: 995,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'step1'
        }
      ],
      transcript: 'Step one. First visual.'
    };

    console.log('Processing Step 1...');
    renderer.processChunk(step1);

    setTimeout(() => {
      const indexAfterStep1 = renderer.visualIndexInStep;
      console.log('Visual index after step 1:', indexAfterStep1);

      // Step 2 - should reset index
      const step2 = {
        stepId: 994,
        actions: [
          {
            op: 'customSVG',
            svgCode: '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>',
            visualGroup: 'step2'
          }
        ],
        transcript: 'Step two. New step starts.'
      };

      console.log('Processing Step 2...');
      renderer.processChunk(step2);

      setTimeout(() => {
        const indexAfterStep2 = renderer.visualIndexInStep;
        console.log('Visual index after step 2 start:', indexAfterStep2);
        
        if (indexAfterStep2 === 0) {
          console.log('✅ PASS: Visual index reset on new step');
        } else {
          console.error(`❌ FAIL: Visual index not reset (expected 0, got ${indexAfterStep2})`);
        }
      }, 500);
    }, 3500);
  },

  /**
   * Test 6: Check playback controls
   */
  testPlaybackControls: function() {
    console.log('\n🧪 TEST 6: Playback controls (pause/resume)');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ FAIL: sequentialRenderer not found');
      return;
    }

    const testChunk = {
      stepId: 993,
      actions: [
        { op: 'drawLabel', text: 'Test 1', x: 0.5, y: 0.1 },
        { op: 'drawLabel', text: 'Test 2', x: 0.5, y: 0.2 },
        { op: 'drawLabel', text: 'Test 3', x: 0.5, y: 0.3 },
        { op: 'drawLabel', text: 'Test 4', x: 0.5, y: 0.4 }
      ],
      transcript: 'Testing pause and resume.'
    };

    renderer.processChunk(testChunk);

    setTimeout(() => {
      console.log('Pausing...');
      renderer.pause();
      
      const indexAtPause = renderer.animationQueue.getStatus().current;
      console.log('Index at pause:', indexAtPause);

      setTimeout(() => {
        const indexWhilePaused = renderer.animationQueue.getStatus().current;
        console.log('Index while paused:', indexWhilePaused);
        
        if (indexWhilePaused === indexAtPause) {
          console.log('✅ PASS: Pause working (index unchanged)');
        } else {
          console.error('❌ FAIL: Pause not working (index changed)');
        }

        console.log('Resuming...');
        renderer.resume();

        setTimeout(() => {
          const indexAfterResume = renderer.animationQueue.getStatus().current;
          console.log('Index after resume:', indexAfterResume);
          
          if (indexAfterResume > indexAtPause) {
            console.log('✅ PASS: Resume working (index advanced)');
          } else {
            console.error('❌ FAIL: Resume not working (index did not advance)');
          }
        }, 1500);
      }, 1000);
    }, 300);
  },

  /**
   * Run all tests
   */
  runAll: function() {
    console.log('🚀 Running all sequential rendering tests...\n');
    console.log('Make sure you have loaded a topic first!\n');
    
    this.testAutoStart();
    
    setTimeout(() => this.testSequentialTiming(), 2000);
    setTimeout(() => this.testCaptions(), 10000);
    setTimeout(() => this.testAutoScroll(), 16000);
    setTimeout(() => this.testStepTransitions(), 22000);
    setTimeout(() => this.testPlaybackControls(), 32000);
    
    console.log('\n⏱️  All tests scheduled. Total runtime: ~45 seconds');
    console.log('Watch console for results...\n');
  },

  /**
   * Quick diagnostic
   */
  diagnose: function() {
    console.log('🔍 DIAGNOSTIC REPORT\n');
    
    const renderer = window.sequentialRenderer;
    if (!renderer) {
      console.error('❌ CRITICAL: sequentialRenderer not available on window');
      console.log('Check CanvasStage.tsx - should have: (window as any).sequentialRenderer = sequentialRendererRef.current');
      return;
    }
    console.log('✅ Renderer available');

    console.log('\n📊 Current State:');
    console.log('  Current Step ID:', renderer.currentStepId || 'none');
    console.log('  Visual Index:', renderer.visualIndexInStep);
    console.log('  Vertical Offset:', renderer.verticalOffset, 'px');
    console.log('  Current Transcript:', renderer.currentTranscript ? `"${renderer.currentTranscript.substring(0, 50)}..."` : 'none');
    console.log('  Transcript Sentences:', renderer.transcriptSentences?.length || 0);

    const queueStatus = renderer.animationQueue.getStatus();
    console.log('\n⏯️  AnimationQueue Status:');
    console.log('  Total actions:', queueStatus.total);
    console.log('  Current index:', queueStatus.current);
    console.log('  Is playing:', queueStatus.isPlaying);

    console.log('\n🎨 Stage Info:');
    const stage = renderer.stage;
    if (stage) {
      console.log('  Stage size:', stage.width(), 'x', stage.height());
      console.log('  Layers:', stage.getLayers().length);
    } else {
      console.error('  ❌ No stage');
    }

    console.log('\n💬 Caption:');
    const caption = renderer.captionEl;
    if (caption) {
      console.log('  Caption exists:', 'YES');
      console.log('  Caption text:', caption.textContent.substring(0, 100));
      console.log('  Caption position:', caption.style.top);
    } else {
      console.log('  Caption exists:', 'NO');
    }

    console.log('\n✅ Diagnostic complete');
  }
};

console.log('🧪 Sequential Renderer Debug Tools Loaded!');
console.log('\nAvailable commands:');
console.log('  debugSequentialRenderer.diagnose() - Show current state');
console.log('  debugSequentialRenderer.testAutoStart() - Test auto-start');
console.log('  debugSequentialRenderer.testSequentialTiming() - Test timing');
console.log('  debugSequentialRenderer.testCaptions() - Test captions');
console.log('  debugSequentialRenderer.testAutoScroll() - Test scroll');
console.log('  debugSequentialRenderer.testStepTransitions() - Test steps');
console.log('  debugSequentialRenderer.testPlaybackControls() - Test pause/resume');
console.log('  debugSequentialRenderer.runAll() - Run all tests');
console.log('\nStart with: debugSequentialRenderer.diagnose()');
