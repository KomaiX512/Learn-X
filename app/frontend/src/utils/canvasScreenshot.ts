/**
 * Canvas Screenshot Utility
 * Captures canvas as image for contextual question-answering
 */

import Konva from 'konva';

export interface ScreenshotResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  timestamp: number;
}

/**
 * Capture canvas screenshot with specified quality
 */
export async function captureCanvasScreenshot(
  stage: Konva.Stage,
  options: {
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
  } = {}
): Promise<ScreenshotResult> {
  const {
    pixelRatio = 2, // High DPI for clarity
    mimeType = 'image/png',
    quality = 0.95
  } = options;

  try {
    // Get the data URL from Konva stage
    const dataUrl = stage.toDataURL({
      pixelRatio,
      mimeType,
      quality
    });

    // Convert data URL to Blob for upload
    const blob = await dataUrlToBlob(dataUrl);

    return {
      dataUrl,
      blob,
      width: stage.width(),
      height: stage.height(),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[canvasScreenshot] Error capturing screenshot:', error);
    throw error;
  }
}

/**
 * Convert data URL to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Add visual feedback for screenshot capture
 */
export function showScreenshotFlash(container: HTMLElement): void {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    pointer-events: none;
    z-index: 9999;
    animation: flash 0.3s ease-out;
  `;

  // Add animation keyframes if not already present
  if (!document.getElementById('screenshot-flash-style')) {
    const style = document.createElement('style');
    style.id = 'screenshot-flash-style';
    style.textContent = `
      @keyframes flash {
        0% { opacity: 0.8; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(flash);
  setTimeout(() => flash.remove(), 300);
}

/**
 * Download screenshot to user's device
 */
export function downloadScreenshot(dataUrl: string, filename: string = 'canvas-screenshot.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Setup double-click handler for canvas
 */
export function setupDoubleClickScreenshot(
  stage: Konva.Stage,
  container: HTMLElement,
  onScreenshot: (screenshot: ScreenshotResult) => void
): () => void {
  const handleDoubleClick = async () => {
    try {
      console.log('[canvasScreenshot] Double-click detected, capturing screenshot...');
      showScreenshotFlash(container);
      
      const screenshot = await captureCanvasScreenshot(stage);
      console.log('[canvasScreenshot] Screenshot captured:', screenshot.width, 'x', screenshot.height);
      
      onScreenshot(screenshot);
    } catch (error) {
      console.error('[canvasScreenshot] Error in double-click handler:', error);
    }
  };

  container.addEventListener('dblclick', handleDoubleClick);

  // Return cleanup function
  return () => {
    container.removeEventListener('dblclick', handleDoubleClick);
  };
}
