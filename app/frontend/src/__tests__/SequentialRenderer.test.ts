/**
 * Unit tests for SequentialRenderer
 * Tests caption generation, sentence splitting, and visual sequencing
 */

import { SequentialRenderer } from '../renderer/SequentialRenderer';
import Konva from 'konva';

// Mock Konva Stage
const createMockStage = () => {
  const mockContainer = document.createElement('div');
  mockContainer.id = 'test-container';
  document.body.appendChild(mockContainer);
  
  return new Konva.Stage({
    container: 'test-container',
    width: 800,
    height: 600
  });
};

describe('SequentialRenderer - Caption & Transcript', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'test-container',
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
    mockStage.destroy();
    document.body.innerHTML = '';
  });

  test('splitSentences should split transcript correctly', () => {
    const transcript = "This is sentence one. This is sentence two! This is sentence three?";
    
    // Access private method via type assertion for testing
    const sentences = (renderer as any).splitSentences(transcript);
    
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe("This is sentence one.");
    expect(sentences[1]).toBe("This is sentence two!");
    expect(sentences[2]).toBe("This is sentence three?");
  });

  test('splitSentences should handle empty text', () => {
    const sentences = (renderer as any).splitSentences('');
    expect(sentences).toHaveLength(0);
  });

  test('splitSentences should normalize whitespace', () => {
    const transcript = "Sentence   one.    Sentence    two!";
    const sentences = (renderer as any).splitSentences(transcript);
    
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toBe("Sentence one.");
    expect(sentences[1]).toBe("Sentence two!");
  });

  test('processChunk should capture and split transcript on new step', async () => {
    const chunk = {
      stepId: 1,
      actions: [
        { op: 'drawLabel', text: 'Test', x: 0.5, y: 0.5 }
      ],
      transcript: "First sentence. Second sentence. Third sentence."
    };

    renderer.processChunk(chunk);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check internal state
    expect((renderer as any).currentTranscript).toBe(chunk.transcript);
    expect((renderer as any).transcriptSentences).toHaveLength(3);
    expect((renderer as any).visualIndexInStep).toBe(0);
  });

  test('processChunk should reset caption state on new step', async () => {
    // First step
    const chunk1 = {
      stepId: 1,
      actions: [{ op: 'drawLabel', text: 'Step 1', x: 0.5, y: 0.5 }],
      transcript: "Step one transcript."
    };
    renderer.processChunk(chunk1);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second step - should reset state
    const chunk2 = {
      stepId: 2,
      actions: [{ op: 'drawLabel', text: 'Step 2', x: 0.5, y: 0.5 }],
      transcript: "Step two transcript."
    };
    renderer.processChunk(chunk2);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect((renderer as any).currentTranscript).toBe(chunk2.transcript);
    expect((renderer as any).visualIndexInStep).toBe(0);
  });

  test('showCaptionForVisual should create caption element', async () => {
    // Set up transcript
    (renderer as any).currentTranscript = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    (renderer as any).transcriptSentences = (renderer as any).splitSentences((renderer as any).currentTranscript);
    (renderer as any).verticalOffset = 100;

    await (renderer as any).showCaptionForVisual(0);

    // Check caption was created and appended
    const stageContainer = mockStage.container();
    const captions = stageContainer.querySelectorAll('div');
    
    // Should have at least one caption div
    expect(captions.length).toBeGreaterThan(0);
    
    // Caption should be stored in renderer
    expect((renderer as any).captionEl).not.toBeNull();
  });

  test('showCaptionForVisual should show correct sentences for visual index', async () => {
    (renderer as any).currentTranscript = "S1. S2. S3. S4. S5. S6.";
    (renderer as any).transcriptSentences = (renderer as any).splitSentences((renderer as any).currentTranscript);
    (renderer as any).verticalOffset = 100;

    await (renderer as any).showCaptionForVisual(1); // Should get sentences 2-4 (index 2,3)

    const captionEl = (renderer as any).captionEl;
    expect(captionEl).not.toBeNull();
    
    const captionText = captionEl.textContent;
    expect(captionText).toContain('S3');
    expect(captionText).toContain('S4');
  });

  test('showCaptionForVisual should remove previous caption', async () => {
    (renderer as any).currentTranscript = "First. Second. Third. Fourth.";
    (renderer as any).transcriptSentences = (renderer as any).splitSentences((renderer as any).currentTranscript);
    (renderer as any).verticalOffset = 100;

    // Show first caption
    await (renderer as any).showCaptionForVisual(0);
    const firstCaption = (renderer as any).captionEl;
    
    // Show second caption
    await (renderer as any).showCaptionForVisual(1);
    const secondCaption = (renderer as any).captionEl;

    // First caption should be removed from DOM
    expect(firstCaption.parentElement).toBeNull();
    expect(secondCaption).not.toBe(firstCaption);
  });
});

describe('SequentialRenderer - Visual Sequencing', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;

  beforeEach(() => {
    const container = document.createElement('div');
    container.id = 'test-container-2';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'test-container-2',
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
    mockStage.destroy();
    document.body.innerHTML = '';
  });

  test('customSVG action should increment visualIndexInStep', async () => {
    const chunk = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'test'
        }
      ],
      transcript: "Test visual one. Test visual two."
    };

    renderer.processChunk(chunk);
    
    const initialIndex = (renderer as any).visualIndexInStep;
    expect(initialIndex).toBe(0);

    // Wait for action to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Index should have incremented after customSVG
    const finalIndex = (renderer as any).visualIndexInStep;
    expect(finalIndex).toBe(1);
  });

  test('multiple customSVG actions should create multiple captions', async () => {
    const chunk = {
      stepId: 1,
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
      transcript: "First visual. Second visual. Third visual. Fourth visual."
    };

    renderer.processChunk(chunk);

    // Wait for both actions to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // visualIndexInStep should be 2 after both visuals
    expect((renderer as any).visualIndexInStep).toBe(2);
  });
});

describe('SequentialRenderer - Playback Controls', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;

  beforeEach(() => {
    const container = document.createElement('div');
    container.id = 'test-container-3';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'test-container-3',
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
    mockStage.destroy();
    document.body.innerHTML = '';
  });

  test('pause() should exist and be callable', () => {
    expect(typeof renderer.pause).toBe('function');
    expect(() => renderer.pause()).not.toThrow();
  });

  test('resume() should exist and be callable', () => {
    expect(typeof renderer.resume).toBe('function');
    expect(() => renderer.resume()).not.toThrow();
  });

  test('nextStep() should exist and be callable', () => {
    expect(typeof renderer.nextStep).toBe('function');
    expect(() => renderer.nextStep()).not.toThrow();
  });

  test('previousStep() should exist and be callable', () => {
    expect(typeof renderer.previousStep).toBe('function');
    expect(() => renderer.previousStep()).not.toThrow();
  });

  test('getStage() should return the stage', () => {
    const stage = renderer.getStage();
    expect(stage).toBe(mockStage);
  });

  test('cleanup() should exist and be callable', () => {
    expect(typeof renderer.cleanup).toBe('function');
    expect(() => renderer.cleanup()).not.toThrow();
  });
});

describe('SequentialRenderer - Action Callbacks', () => {
  let renderer: SequentialRenderer;
  let mockStage: Konva.Stage;

  beforeEach(() => {
    const container = document.createElement('div');
    container.id = 'test-container-4';
    document.body.appendChild(container);
    
    mockStage = new Konva.Stage({
      container: 'test-container-4',
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
    mockStage.destroy();
    document.body.innerHTML = '';
  });

  test('setActionCallbacks should register callbacks', async () => {
    const onStartMock = jest.fn();
    const onCompleteMock = jest.fn();

    renderer.setActionCallbacks(onStartMock, onCompleteMock);

    const chunk = {
      stepId: 1,
      actions: [
        {
          op: 'customSVG',
          svgCode: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
          visualGroup: 'test'
        }
      ],
      transcript: "Test visual."
    };

    renderer.processChunk(chunk);

    // Wait for action to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Callbacks should have been called
    expect(onStartMock).toHaveBeenCalled();
    expect(onCompleteMock).toHaveBeenCalled();
  });
});

console.log('SequentialRenderer unit tests defined. Run with: npm test SequentialRenderer.test.ts');
