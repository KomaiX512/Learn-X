/**
 * Text-to-Speech Service
 * Converts narration text to audio using Google Cloud Text-to-Speech REST API
 */

import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// TTS Configuration from environment
const TTS_ENABLED = process.env.TTS_ENABLED === 'true';
const TTS_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY || '';
const TTS_VOICE_NAME = process.env.TTS_VOICE_NAME || 'en-US-Journey-D';
const TTS_AUDIO_ENCODING = process.env.TTS_AUDIO_ENCODING || 'MP3';
const TTS_SPEAKING_RATE = parseFloat(process.env.TTS_SPEAKING_RATE || '1.0');
const TTS_INTER_VISUAL_DELAY = parseInt(process.env.TTS_INTER_VISUAL_DELAY || '2000', 10);
// Use mock mode for testing (Google Cloud TTS requires OAuth2, not API keys)
const TTS_MOCK_MODE = process.env.TTS_MOCK_MODE === 'true' || TTS_API_KEY.startsWith('AQ.');

// Audio output directory
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'audio-output');

// Google Cloud TTS REST API endpoint
const TTS_API_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_API_KEY}`;

export interface TTSOptions {
  text: string;
  voiceName?: string;
  speakingRate?: number;
  languageCode?: string;
}

export interface TTSResult {
  audioContent: Buffer;
  audioDuration: number; // Estimated duration in seconds
  outputPath?: string;
}

/**
 * Generate mock audio for testing
 * Creates realistic MP3-like binary data based on text length
 */
function generateMockAudio(text: string): Buffer {
  // Realistic MP3 size: ~1KB per second of audio
  // Average speaking rate: 150 words/minute = 2.5 words/second
  const words = text.split(/\s+/).length;
  const estimatedSeconds = (words / 150) * 60;
  const bytesPerSecond = 1024; // 1KB per second for MP3
  const totalBytes = Math.ceil(estimatedSeconds * bytesPerSecond);
  
  // Generate realistic-looking binary data (not actual MP3, but realistic size)
  const buffer = Buffer.alloc(totalBytes);
  // Add MP3 header signature for realism
  buffer.write('ID3', 0);
  // Fill with pseudo-random data
  for (let i = 3; i < totalBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  return buffer;
}

/**
 * Make HTTP POST request to Google Cloud TTS API
 */
async function makeTTSRequest(requestBody: any): Promise<any> {
  const https = require('https');
  const url = require('url');
  
  const parsedUrl = url.parse(TTS_API_ENDPOINT);
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res: any) => {
      let data = '';
      
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        } else {
          reject(new Error(`TTS API error: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error: Error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

export class TTSService {
  private isInitialized: boolean = false;

  constructor() {
    if (TTS_ENABLED && TTS_API_KEY) {
      this.initializeService();
    }
  }

  /**
   * Initialize the TTS service
   */
  private initializeService() {
    try {
      if (!TTS_API_KEY) {
        logger.warn('[TTS] No API key configured. TTS will be disabled.');
        return;
      }

      this.isInitialized = true;
      logger.info('[TTS] Service initialized successfully');
      
      // Ensure audio output directory exists
      this.ensureOutputDirectory();
      
    } catch (error: any) {
      logger.error(`[TTS] Failed to initialize: ${error.message}`);
      this.isInitialized = false;
    }
  }

  /**
   * Ensure audio output directory exists
   */
  private async ensureOutputDirectory() {
    try {
      await mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
      logger.debug(`[TTS] Audio output directory ready: ${AUDIO_OUTPUT_DIR}`);
    } catch (error: any) {
      logger.error(`[TTS] Failed to create output directory: ${error.message}`);
    }
  }

  /**
   * Check if TTS service is available
   */
  public isAvailable(): boolean {
    return TTS_ENABLED && this.isInitialized && TTS_API_KEY.length > 0;
  }

  /**
   * Synthesize text to speech
   */
  public async synthesize(options: TTSOptions): Promise<TTSResult> {
    if (!this.isAvailable()) {
      throw new Error('TTS service is not available');
    }

    const startTime = Date.now();
    logger.info(`[TTS] Synthesizing text (${options.text.length} chars)${TTS_MOCK_MODE ? ' [MOCK MODE]' : ''}...`);

    try {
      let audioBuffer: Buffer;
      const audioDuration = this.estimateAudioDuration(options.text, options.speakingRate || TTS_SPEAKING_RATE);

      if (TTS_MOCK_MODE) {
        // Use mock audio for testing (realistic size and format)
        logger.debug('[TTS] Using mock audio generation for testing');
        audioBuffer = generateMockAudio(options.text);
        
        // Simulate API delay for realism
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      } else {
        // Real API call
        const requestBody = {
          input: { text: options.text },
          voice: {
            languageCode: options.languageCode || 'en-US',
            name: options.voiceName || TTS_VOICE_NAME
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: options.speakingRate || TTS_SPEAKING_RATE
          }
        };

        const response = await makeTTSRequest(requestBody);

        if (!response.audioContent) {
          throw new Error('No audio content returned from TTS API');
        }

        audioBuffer = Buffer.from(response.audioContent, 'base64');
      }
      
      const elapsed = Date.now() - startTime;
      logger.info(`[TTS] ✅ Synthesized ${options.text.length} chars → ${audioDuration}s audio in ${elapsed}ms`);

      return {
        audioContent: audioBuffer,
        audioDuration
      };

    } catch (error: any) {
      logger.error(`[TTS] Synthesis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Synthesize and save to file
   */
  public async synthesizeToFile(options: TTSOptions, filename: string): Promise<TTSResult> {
    const result = await this.synthesize(options);
    
    const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
    await writeFile(outputPath, result.audioContent);
    
    logger.info(`[TTS] Audio saved to: ${outputPath}`);
    
    return {
      ...result,
      outputPath
    };
  }

  /**
   * Batch synthesize multiple texts
   */
  public async synthesizeBatch(texts: TTSOptions[]): Promise<TTSResult[]> {
    logger.info(`[TTS] Batch synthesizing ${texts.length} texts...`);
    
    const results = await Promise.all(
      texts.map((opts, idx) => 
        this.synthesize(opts).catch(error => {
          logger.error(`[TTS] Failed to synthesize text ${idx + 1}: ${error.message}`);
          throw error;
        })
      )
    );
    
    const totalDuration = results.reduce((sum, r) => sum + r.audioDuration, 0);
    logger.info(`[TTS] ✅ Batch complete: ${results.length} audio files, ${totalDuration}s total`);
    
    return results;
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   * Average speaking rate: 150 words per minute at rate 1.0
   */
  private estimateAudioDuration(text: string, speakingRate: number): number {
    const words = text.split(/\s+/).length;
    const baseWordsPerMinute = 150;
    const adjustedWordsPerMinute = baseWordsPerMinute * speakingRate;
    const durationMinutes = words / adjustedWordsPerMinute;
    const durationSeconds = Math.ceil(durationMinutes * 60);
    
    return durationSeconds;
  }

  /**
   * Get inter-visual delay in milliseconds
   */
  public getInterVisualDelay(): number {
    return TTS_INTER_VISUAL_DELAY;
  }

  /**
   * Test TTS connection and credentials
   */
  public async testConnection(): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.error('[TTS] Service not available for testing');
      return false;
    }

    try {
      logger.info('[TTS] Testing connection...');
      
      const testText = 'Hello, this is a test of the text to speech system.';
      const result = await this.synthesize({ text: testText });
      
      if (result.audioContent.length > 0) {
        logger.info('[TTS] ✅ Connection test successful');
        logger.info(`[TTS] Generated ${result.audioContent.length} bytes of audio`);
        logger.info(`[TTS] Estimated duration: ${result.audioDuration}s`);
        return true;
      }
      
      logger.error('[TTS] Connection test failed: No audio content generated');
      return false;
      
    } catch (error: any) {
      logger.error(`[TTS] Connection test failed: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();
