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
 * Capture ONLY VISIBLE VIEWPORT area (not entire canvas)
 * This reduces screenshot size dramatically for better performance
 */
export async function captureVisibleViewport(
  stage: Konva.Stage,
  scrollContainer: HTMLElement,
  options: {
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
  } = {}
): Promise<ScreenshotResult> {
  const {
    pixelRatio = 1.5, // Reduced from 2 for smaller file size
    mimeType = 'image/jpeg', // JPEG is much smaller than PNG
    quality = 0.7 // Reduced quality for smaller payload
  } = options;

  try {
    const scrollTop = scrollContainer.scrollTop || 0;
    const scrollLeft = scrollContainer.scrollLeft || 0;
    const viewportWidth = scrollContainer.clientWidth;
    const viewportHeight = scrollContainer.clientHeight;

    console.log('[canvasScreenshot] Capturing visible viewport:', {
      scrollTop,
      scrollLeft,
      viewportWidth,
      viewportHeight
    });

    // Capture only the visible portion
    const dataUrl = stage.toDataURL({
      x: scrollLeft,
      y: scrollTop,
      width: viewportWidth,
      height: viewportHeight,
      pixelRatio,
      mimeType,
      quality
    });

    // Convert data URL to Blob
    const blob = await dataUrlToBlob(dataUrl);
    const sizeKB = (blob.size / 1024).toFixed(2);
    
    console.log(`[canvasScreenshot] Screenshot size: ${sizeKB}KB`);

    return {
      dataUrl,
      blob,
      width: viewportWidth,
      height: viewportHeight,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[canvasScreenshot] Error capturing viewport:', error);
    throw error;
  }
}

/**
 * Capture canvas screenshot with specified quality
 * (Full canvas - use captureVisibleViewport for smaller payloads)
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
    pixelRatio = 1.5, // Reduced from 2
    mimeType = 'image/jpeg', // Changed to JPEG for smaller size
    quality = 0.7 // Reduced quality
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
    const sizeKB = (blob.size / 1024).toFixed(2);
    
    console.log(`[canvasScreenshot] Full canvas screenshot size: ${sizeKB}KB`);

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
 * Capture ONLY VISIBLE VIEWPORT area of TWO stages (base + overlay) and composite them.
 * Ensures overlay drawings (e.g., pen/pencil on a separate stage) are included.
 */
export async function captureVisibleViewportCombined(
  baseStage: Konva.Stage,
  overlayStage: Konva.Stage | null,
  scrollContainer: HTMLElement,
  options: {
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
  } = {}
): Promise<ScreenshotResult> {
  const {
    pixelRatio = 1.5,
    mimeType = 'image/jpeg',
    quality = 0.7
  } = options;

  const scrollTop = scrollContainer.scrollTop || 0;
  const scrollLeft = scrollContainer.scrollLeft || 0;
  const viewportWidth = scrollContainer.clientWidth;
  const viewportHeight = scrollContainer.clientHeight;

  // Render base stage portion
  const baseUrl = baseStage.toDataURL({
    x: scrollLeft,
    y: scrollTop,
    width: viewportWidth,
    height: viewportHeight,
    pixelRatio,
    mimeType,
    quality
  });

  // Render overlay stage portion if present
  const overlayUrl = overlayStage ? overlayStage.toDataURL({
    x: scrollLeft,
    y: scrollTop,
    width: viewportWidth,
    height: viewportHeight,
    pixelRatio,
    mimeType,
    quality
  }) : null;

  // Composite on an offscreen canvas
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(viewportWidth * pixelRatio));
  off.height = Math.max(1, Math.floor(viewportHeight * pixelRatio));
  const ctx = off.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  const baseImg = await dataUrlToImage(baseUrl);
  ctx.drawImage(baseImg, 0, 0, off.width, off.height);

  if (overlayUrl) {
    const overlayImg = await dataUrlToImage(overlayUrl);
    ctx.drawImage(overlayImg, 0, 0, off.width, off.height);
  }

  const combinedUrl = off.toDataURL(mimeType, quality);
  const blob = await dataUrlToBlob(combinedUrl);
  const sizeKB = (blob.size / 1024).toFixed(2);
  console.log(`[canvasScreenshot] Combined viewport screenshot size: ${sizeKB}KB`);

  return {
    dataUrl: combinedUrl,
    blob,
    width: viewportWidth,
    height: viewportHeight,
    timestamp: Date.now()
  };
}

/**
 * Convert data URL to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/** Load a data URL into an HTMLImageElement */
async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
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
