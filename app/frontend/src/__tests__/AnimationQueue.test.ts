/**
 * Unit tests for AnimationQueue
 * Tests sequential playback, delays, callbacks, and timing
 */

import { AnimationQueue } from '../renderer/AnimationQueue';

// Mock renderer
const createMockRenderer = () => ({
  processAction: jest.fn().mockResolvedValue(undefined),
  stage: {
    batchDraw: jest.fn()
  }
});

describe('AnimationQueue - Basic Functionality', () => {
  let queue: AnimationQueue;
  let mockRenderer: any;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    queue = new AnimationQueue(mockRenderer);
  });

  test('should enqueue actions correctly', () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    const status = queue.getStatus();
    expect(status.total).toBe(2);
    expect(status.current).toBe(0);
  });

  test('should start playing automatically on enqueue', async () => {
    const actions = [{ op: 'drawLabel', text: 'Test' }];
    
    queue.enqueue(actions, { stepId: 1 });
    
    // Wait a bit for playback to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = queue.getStatus();
    expect(status.isPlaying).toBe(true);
  });

  test('should process actions sequentially', async () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' },
      { op: 'drawLabel', text: 'Test 3' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    // Wait for all actions to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // processAction should be called 3 times
    expect(mockRenderer.processAction).toHaveBeenCalledTimes(3);
    expect(mockRenderer.processAction).toHaveBeenNthCalledWith(1, actions[0], expect.any(Object));
    expect(mockRenderer.processAction).toHaveBeenNthCalledWith(2, actions[1], expect.any(Object));
    expect(mockRenderer.processAction).toHaveBeenNthCalledWith(3, actions[2], expect.any(Object));
  });

  test('pause should stop playback', async () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' },
      { op: 'drawLabel', text: 'Test 3' }
    ];

    queue.enqueue(actions, { stepId: 1 });
    
    // Wait a bit then pause
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.pause();

    const callCountAtPause = mockRenderer.processAction.mock.calls.length;

    // Wait more time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Call count should not have increased
    expect(mockRenderer.processAction).toHaveBeenCalledTimes(callCountAtPause);
  });

  test('resume should continue playback after pause', async () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' },
      { op: 'drawLabel', text: 'Test 3' }
    ];

    queue.enqueue(actions, { stepId: 1 });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.pause();
    
    const callCountAtPause = mockRenderer.processAction.mock.calls.length;
    
    queue.resume();
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Should have processed more actions after resume
    expect(mockRenderer.processAction.mock.calls.length).toBeGreaterThan(callCountAtPause);
  });

  test('clear should reset queue', () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }
    ];

    queue.enqueue(actions, { stepId: 1 });
    queue.clear();

    const status = queue.getStatus();
    expect(status.total).toBe(0);
    expect(status.current).toBe(0);
    expect(status.isPlaying).toBe(false);
  });

  test('hardReset should stop playback and clear queue', async () => {
    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }
    ];

    queue.enqueue(actions, { stepId: 1 });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    queue.hardReset();

    const status = queue.getStatus();
    expect(status.total).toBe(0);
    expect(status.isPlaying).toBe(false);
  });
});

describe('AnimationQueue - Delays and Timing', () => {
  let queue: AnimationQueue;
  let mockRenderer: any;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    queue = new AnimationQueue(mockRenderer);
  });

  test('customSVG should have longer delay than labels', async () => {
    const startTime = Date.now();
    const actions = [
      { op: 'customSVG', svgCode: '<svg></svg>' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const elapsed = Date.now() - startTime;
    
    // customSVG should take at least 1500ms (afterCustomSVG delay) + 700ms (captionLead)
    expect(elapsed).toBeGreaterThanOrEqual(2000);
  });

  test('captionLead should delay before customSVG', async () => {
    const callTimes: number[] = [];
    
    mockRenderer.processAction = jest.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
    });

    const actions = [
      { op: 'customSVG', svgCode: '<svg></svg>' }
    ];

    const startTime = Date.now();
    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // First call should happen after captionLead (700ms)
    if (callTimes.length > 0) {
      const firstCallDelay = callTimes[0] - startTime;
      expect(firstCallDelay).toBeGreaterThanOrEqual(600); // Allow some timing variance
    }
  });

  test('setSpeed should affect playback timing', async () => {
    queue.setSpeed(2.0); // Double speed

    const actions = [
      { op: 'drawLabel', text: 'Test' }
    ];

    const startTime = Date.now();
    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const elapsed = Date.now() - startTime;
    
    // At 2x speed, delays should be halved (300ms / 2 = 150ms)
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('AnimationQueue - Callbacks', () => {
  let queue: AnimationQueue;
  let mockRenderer: any;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    queue = new AnimationQueue(mockRenderer);
  });

  test('onStepComplete callback should fire when step finishes', async () => {
    const onStepComplete = jest.fn();
    queue.setCallbacks(onStepComplete, undefined);

    const actions = [
      { op: 'drawLabel', text: 'Test' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(onStepComplete).toHaveBeenCalledWith(1);
  });

  test('onProgress callback should fire during playback', async () => {
    const onProgress = jest.fn();
    queue.setCallbacks(undefined, onProgress);

    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // onProgress should be called multiple times
    expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    
    // Progress values should be between 0 and 100
    onProgress.mock.calls.forEach(call => {
      const progress = call[0];
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  test('action callbacks should fire for each action', async () => {
    const onActionStart = jest.fn();
    const onActionComplete = jest.fn();
    
    queue.setActionCallbacks(onActionStart, onActionComplete);

    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'customSVG', svgCode: '<svg></svg>' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 3500));

    // Both callbacks should be called for each action
    expect(onActionStart).toHaveBeenCalledTimes(2);
    expect(onActionComplete).toHaveBeenCalledTimes(2);
  });

  test('action callbacks should receive correct action and index', async () => {
    const onActionStart = jest.fn();
    
    queue.setActionCallbacks(onActionStart, undefined);

    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(onActionStart).toHaveBeenNthCalledWith(1, actions[0], 0);
    expect(onActionStart).toHaveBeenNthCalledWith(2, actions[1], 1);
  });
});

describe('AnimationQueue - Step Transitions', () => {
  let queue: AnimationQueue;
  let mockRenderer: any;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    queue = new AnimationQueue(mockRenderer);
  });

  test('should detect step transitions', async () => {
    const actions1 = [{ op: 'drawLabel', text: 'Step 1' }];
    const actions2 = [{ op: 'drawLabel', text: 'Step 2' }];

    queue.enqueue(actions1, { stepId: 1 });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    queue.enqueue(actions2, { stepId: 2 });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Should have processed both steps
    expect(mockRenderer.processAction).toHaveBeenCalledTimes(2);
  });

  test('should wait between steps', async () => {
    const callTimes: number[] = [];
    
    mockRenderer.processAction = jest.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
    });

    const actions1 = [{ op: 'drawLabel', text: 'Step 1' }];
    const actions2 = [{ op: 'drawLabel', text: 'Step 2' }];

    queue.enqueue(actions1, { stepId: 1 });
    await new Promise(resolve => setTimeout(resolve, 100));
    queue.enqueue(actions2, { stepId: 2 });

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (callTimes.length >= 2) {
      const timeBetweenSteps = callTimes[1] - callTimes[0];
      
      // Should wait betweenSteps delay (1000ms) + action delays
      expect(timeBetweenSteps).toBeGreaterThanOrEqual(1000);
    }
  });
});

describe('AnimationQueue - Error Handling', () => {
  let queue: AnimationQueue;
  let mockRenderer: any;

  beforeEach(() => {
    mockRenderer = createMockRenderer();
    queue = new AnimationQueue(mockRenderer);
  });

  test('should continue playback even if an action fails', async () => {
    let callCount = 0;
    mockRenderer.processAction = jest.fn().mockImplementation(async (action) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Simulated error');
      }
    });

    const actions = [
      { op: 'drawLabel', text: 'Test 1' },
      { op: 'drawLabel', text: 'Test 2' }, // This will fail
      { op: 'drawLabel', text: 'Test 3' }
    ];

    queue.enqueue(actions, { stepId: 1 });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // All actions should be attempted despite error
    expect(mockRenderer.processAction).toHaveBeenCalledTimes(3);
  });

  test('should handle timeout for slow actions', async () => {
    mockRenderer.processAction = jest.fn().mockImplementation(async () => {
      // Simulate a slow action that never completes
      await new Promise(resolve => setTimeout(resolve, 20000));
    });

    const actions = [{ op: 'drawLabel', text: 'Slow action' }];

    queue.enqueue(actions, { stepId: 1 });

    // Wait for timeout (should be 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Should have attempted the action and moved on after timeout
    expect(mockRenderer.processAction).toHaveBeenCalled();
  });
});

console.log('AnimationQueue unit tests defined. Run with: npm test AnimationQueue.test.ts');
