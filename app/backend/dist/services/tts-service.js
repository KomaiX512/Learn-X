"use strict";
/**
 * Text-to-Speech Service
 * Converts narration text to audio using Google Cloud Text-to-Speech REST API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsService = exports.TTSService = void 0;
const logger_1 = require("../logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const writeFile = (0, util_1.promisify)(fs.writeFile);
const mkdir = (0, util_1.promisify)(fs.mkdir);
// TTS Configuration from environment
const TTS_ENABLED = process.env.TTS_ENABLED === 'true';
const TTS_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY || '';
const TTS_VOICE_NAME = process.env.TTS_VOICE_NAME || 'en-US-Journey-D';
const TTS_AUDIO_ENCODING = process.env.TTS_AUDIO_ENCODING || 'MP3';
const TTS_SPEAKING_RATE = parseFloat(process.env.TTS_SPEAKING_RATE || '1.0');
const TTS_INTER_VISUAL_DELAY = parseInt(process.env.TTS_INTER_VISUAL_DELAY || '2000', 10);
// NO MOCK MODE - ALWAYS USE REAL GOOGLE CLOUD TTS API
// Audio output directory
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'audio-output');
// Google Cloud TTS REST API endpoint
const TTS_API_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_API_KEY}`;
// REMOVED: No mock audio - always use real Google Cloud TTS API
/**
 * Make HTTP POST request to Google Cloud TTS API
 */
async function makeTTSRequest(requestBody) {
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
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse response: ${error}`));
                    }
                }
                else {
                    reject(new Error(`TTS API error: ${res.statusCode} - ${data}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(postData);
        req.end();
    });
}
class TTSService {
    isInitialized = false;
    constructor() {
        if (TTS_ENABLED && TTS_API_KEY) {
            this.initializeService();
        }
    }
    /**
     * Initialize the TTS service
     */
    initializeService() {
        try {
            if (!TTS_API_KEY) {
                logger_1.logger.warn('[TTS] No API key configured. TTS will be disabled.');
                return;
            }
            this.isInitialized = true;
            logger_1.logger.info('[TTS] Service initialized successfully');
            // Ensure audio output directory exists
            this.ensureOutputDirectory();
        }
        catch (error) {
            logger_1.logger.error(`[TTS] Failed to initialize: ${error.message}`);
            this.isInitialized = false;
        }
    }
    /**
     * Ensure audio output directory exists
     */
    async ensureOutputDirectory() {
        try {
            await mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
            logger_1.logger.debug(`[TTS] Audio output directory ready: ${AUDIO_OUTPUT_DIR}`);
        }
        catch (error) {
            logger_1.logger.error(`[TTS] Failed to create output directory: ${error.message}`);
        }
    }
    /**
     * Check if TTS service is available
     */
    isAvailable() {
        return TTS_ENABLED && this.isInitialized && TTS_API_KEY.length > 0;
    }
    /**
     * Synthesize text to speech
     */
    async synthesize(options) {
        if (!this.isAvailable()) {
            throw new Error('TTS service is not available');
        }
        const startTime = Date.now();
        logger_1.logger.info(`[TTS] Synthesizing text (${options.text.length} chars) with REAL Google Cloud TTS...`);
        try {
            const audioDuration = this.estimateAudioDuration(options.text, options.speakingRate || TTS_SPEAKING_RATE);
            // ALWAYS use real API - NO MOCK MODE
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
            logger_1.logger.debug(`[TTS] Calling Google Cloud TTS API...`);
            const response = await makeTTSRequest(requestBody);
            if (!response.audioContent) {
                throw new Error('No audio content returned from TTS API');
            }
            const audioBuffer = Buffer.from(response.audioContent, 'base64');
            const elapsed = Date.now() - startTime;
            logger_1.logger.info(`[TTS] ✅ Synthesized ${options.text.length} chars → ${audioDuration}s audio in ${elapsed}ms`);
            return {
                audioContent: audioBuffer,
                audioDuration
            };
        }
        catch (error) {
            logger_1.logger.error(`[TTS] Synthesis failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Synthesize and save to file
     */
    async synthesizeToFile(options, filename) {
        const result = await this.synthesize(options);
        const outputPath = path.join(AUDIO_OUTPUT_DIR, filename);
        await writeFile(outputPath, result.audioContent);
        logger_1.logger.info(`[TTS] Audio saved to: ${outputPath}`);
        return {
            ...result,
            outputPath
        };
    }
    /**
     * Batch synthesize multiple texts
     */
    async synthesizeBatch(texts) {
        logger_1.logger.info(`[TTS] Batch synthesizing ${texts.length} texts...`);
        const results = await Promise.all(texts.map((opts, idx) => this.synthesize(opts).catch(error => {
            logger_1.logger.error(`[TTS] Failed to synthesize text ${idx + 1}: ${error.message}`);
            throw error;
        })));
        const totalDuration = results.reduce((sum, r) => sum + r.audioDuration, 0);
        logger_1.logger.info(`[TTS] ✅ Batch complete: ${results.length} audio files, ${totalDuration}s total`);
        return results;
    }
    /**
     * Estimate audio duration based on text length and speaking rate
     * Average speaking rate: 150 words per minute at rate 1.0
     */
    estimateAudioDuration(text, speakingRate) {
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
    getInterVisualDelay() {
        return TTS_INTER_VISUAL_DELAY;
    }
    /**
     * Test TTS connection and credentials
     */
    async testConnection() {
        if (!this.isAvailable()) {
            logger_1.logger.error('[TTS] Service not available for testing');
            return false;
        }
        try {
            logger_1.logger.info('[TTS] Testing connection...');
            const testText = 'Hello, this is a test of the text to speech system.';
            const result = await this.synthesize({ text: testText });
            if (result.audioContent.length > 0) {
                logger_1.logger.info('[TTS] ✅ Connection test successful');
                logger_1.logger.info(`[TTS] Generated ${result.audioContent.length} bytes of audio`);
                logger_1.logger.info(`[TTS] Estimated duration: ${result.audioDuration}s`);
                return true;
            }
            logger_1.logger.error('[TTS] Connection test failed: No audio content generated');
            return false;
        }
        catch (error) {
            logger_1.logger.error(`[TTS] Connection test failed: ${error.message}`);
            return false;
        }
    }
}
exports.TTSService = TTSService;
// Export singleton instance
exports.ttsService = new TTSService();
