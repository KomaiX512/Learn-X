/**
 * Integration tests for SequentialRenderer + AnimationQueue
 * Tests the complete flow from chunk processing to visual rendering
 */

import { SequentialRenderer } from '../renderer/SequentialRenderer';
import Konva from 'konva';

describe('Integration - Sequential Rendering Flow', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'integration-test-container';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'integration-test-container',
      width: 800,
      height: 600
    });

    renderer = new SequentialRenderer({
      stage: mockStage,
      width: 800,
      height: 600
    });
  });

  afterEach(() => {
    renderer.cleanup();
    document.body.innerHTML = '';
  });

  test('CRITICAL: Auto-start playback on processChunk', async () => {
    const chunk = {
      stepId: 1,
      actions: [
        { op: 'drawLabel', text: 'Auto-start test', x: 0.5, y: 0.5 }
      ],
      transcript: "This should auto-start."
    };

    // Track if AnimationQueue starts playing
    const queueStatus = (renderer as any).animationQueue.getStatus();
    expect(queueStatus.isPlaying).toBe(false);

    renderer.processChunk(chunk);

    // Wait a bit for auto-start
    await new Promise(resolve => setTimeout(resolve, 200));

    const statusAfter = (renderer as any).animationQueue.getStatus();
    expect(statusAfter.isPlaying).toBe(true);
  });

  test('CRITICAL: Visuals appear sequentially, not all at once', async () => {
    const processingTimes: number[] = [];
    const originalProcessAction = (renderer as any).processAction.bind(renderer);
    
    (renderer as any).processAction = async function(action: any, section: any) {
      processingTimes.push(Date.now());
      return originalProcessAction(action, section);
    };

    const chunk = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'vis1'
        },
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>',
          visualGroup: 'vis2'
        }
      ],
      transcript: "First visual. Second visual. Third visual. Fourth visual."
    };

    renderer.processChunk(chunk);

    // Wait for both to process
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Should have two processing times
    expect(processingTimes.length).toBe(2);

    if (processingTimes.length >= 2) {
      const timeBetween = processingTimes[1] - processingTimes[0];
      
      // Should be at least 2 seconds apart (captionLead + afterCustomSVG)
      console.log(`Time between visuals: ${timeBetween}ms`);
      expect(timeBetween).toBeGreaterThanOrEqual(2000);
    }
  });

  test('CRITICAL: Caption appears before each visual', async () => {
    const chunk = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'vis1'
        }
      ],
      transcript: "This is the caption text. It should appear before the visual."
    };

    renderer.processChunk(chunk);

    // Wait for caption to appear (should be before visual)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if caption element exists
    const captionEl = (renderer as any).captionEl;
    expect(captionEl).not.toBeNull();
    expect(captionEl.textContent).toContain('caption');
  });

  test('CRITICAL: Auto-scroll happens when caption/visual appears', async () => {
    // Create scrollable container
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = '400px';
    scrollContainer.style.overflow = 'auto';
    scrollContainer.appendChild(mockStage.container());
    document.body.appendChild(scrollContainer);

    const initialScrollTop = scrollContainer.scrollTop;

    const chunk = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="800"><circle cx="50" cy="400" r="40" fill="blue"/></svg>',
          visualGroup: 'vis1'
        }
      ],
      transcript: "This visual should trigger auto-scroll."
    };

    renderer.processChunk(chunk);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll should have changed
    const finalScrollTop = scrollContainer.scrollTop;
    expect(finalScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test('Step transition should reset visual index', async () => {
    // First step
    const chunk1 = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'step1-vis1'
        },
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>',
          visualGroup: 'step1-vis2'
        }
      ],
      transcript: "Step one. Visual one. Visual two."
    };

    renderer.processChunk(chunk1);
    await new Promise(resolve => setTimeout(resolve, 5000));

    const indexAfterStep1 = (renderer as any).visualIndexInStep;
    expect(indexAfterStep1).toBe(2);

    // Second step - index should reset
    const chunk2 = {
      stepId: 2,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>',
          visualGroup: 'step2-vis1'
        }
      ],
      transcript: "Step two. First visual of new step."
    };

    renderer.processChunk(chunk2);
    await new Promise(resolve => setTimeout(resolve, 100));

    const indexAfterStep2Start = (renderer as any).visualIndexInStep;
    expect(indexAfterStep2Start).toBe(0);
  });

  test('Multiple steps should stack vertically', async () => {
    const chunk1 = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="200"><rect x="10" y="10" width="80" height="180" fill="blue"/></svg>',
          visualGroup: 'step1'
        }
      ],
      transcript: "Step one."
    };

    renderer.processChunk(chunk1);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const offsetAfterStep1 = (renderer as any).verticalOffset;

    const chunk2 = {
      stepId: 2,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="200"><rect x="10" y="10" width="80" height="180" fill="red"/></svg>',
          visualGroup: 'step2'
        }
      ],
      transcript: "Step two."
    };

    renderer.processChunk(chunk2);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const offsetAfterStep2 = (renderer as any).verticalOffset;

    // Offset should have increased (steps stack)
    expect(offsetAfterStep2).toBeGreaterThan(offsetAfterStep1);
  });

  test('Playback controls should work during rendering', async () => {
    const chunk = {
      stepId: 1,
      actions: [
        { op: 'drawLabel', text: 'Test 1', x: 0.5, y: 0.1 },
        { op: 'drawLabel', text: 'Test 2', x: 0.5, y: 0.2 },
        { op: 'drawLabel', text: 'Test 3', x: 0.5, y: 0.3 }
      ],
      transcript: "Testing pause and resume."
    };

    renderer.processChunk(chunk);
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Pause during playback
    renderer.pause();
    
    const queueStatus = (renderer as any).animationQueue.getStatus();
    const currentIndexAtPause = queueStatus.current;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Index should not have advanced while paused
    const statusWhilePaused = (renderer as any).animationQueue.getStatus();
    expect(statusWhilePaused.current).toBe(currentIndexAtPause);

    // Resume
    renderer.resume();
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Index should have advanced after resume
    const statusAfterResume = (renderer as any).animationQueue.getStatus();
    expect(statusAfterResume.current).toBeGreaterThan(currentIndexAtPause);
  });
});

describe('Integration - Real-World Scenario', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;

  beforeEach(() => {
    const container = document.createElement('div');
    container.id = 'real-world-test';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'real-world-test',
      width: 800,
      height: 600
    });

    renderer = new SequentialRenderer({
      stage: mockStage,
      width: 800,
      height: 600
    });
  });

  afterEach(() => {
    renderer.cleanup();
    document.body.innerHTML = '';
  });

  test('Complete lecture flow: 3 steps with multiple visuals each', async () => {
    const onStepComplete = jest.fn();
    const onProgress = jest.fn();
    
    (renderer as any).animationQueue.setCallbacks(onStepComplete, onProgress);

    // Step 1: Introduction
    const step1 = {
      stepId: 1,
      actions: [
        { op: 'drawTitle', text: 'Introduction to Calculus', y: 0.1 },
        {
          op: 'customSVG',
          svgCode: '<svg width="600" height="400"><text x="300" y="200" text-anchor="middle" fill="white">Visual 1</text></svg>',
          visualGroup: 'intro-1'
        },
        {
          op: 'customSVG',
          svgCode: '<svg width="600" height="400"><text x="300" y="200" text-anchor="middle" fill="white">Visual 2</text></svg>',
          visualGroup: 'intro-2'
        }
      ],
      transcript: "Welcome to calculus. This is the first concept. Here's the second concept. Let's explore limits."
    };

    renderer.processChunk(step1);
    
    // Wait for step 1 to complete
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Step 2: Core concepts
    const step2 = {
      stepId: 2,
      actions: [
        { op: 'drawTitle', text: 'Understanding Derivatives', y: 0.1 },
        {
          op: 'customSVG',
          svgCode: '<svg width="600" height="400"><text x="300" y="200" text-anchor="middle" fill="white">Derivative Visual</text></svg>',
          visualGroup: 'deriv-1'
        }
      ],
      transcript: "Now let's understand derivatives. The derivative represents the rate of change."
    };

    renderer.processChunk(step2);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify state
    expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    expect((renderer as any).currentStepId).toBe(2);
    
    // Visual index should have reset for step 2
    const visualIndex = (renderer as any).visualIndexInStep;
    expect(visualIndex).toBeLessThanOrEqual(1);
  }, 20000); // Increase timeout for this long test
});

console.log('Integration tests defined. Run with: npm test integration.test.ts');
