/**
 * Text-to-Speech Service
 * Converts narration text to audio using Google Cloud Text-to-Speech REST API
 */
export interface TTSOptions {
    text: string;
    voiceName?: string;
    speakingRate?: number;
    languageCode?: string;
}
export interface TTSResult {
    audioContent: Buffer;
    audioDuration: number;
    outputPath?: string;
}
export declare class TTSService {
    private isInitialized;
    constructor();
    /**
     * Initialize the TTS service
     */
    private initializeService;
    /**
     * Ensure audio output directory exists
     */
    private ensureOutputDirectory;
    /**
     * Check if TTS service is available
     */
    isAvailable(): boolean;
    /**
     * Synthesize text to speech
     */
    synthesize(options: TTSOptions): Promise<TTSResult>;
    /**
     * Synthesize and save to file
     */
    synthesizeToFile(options: TTSOptions, filename: string): Promise<TTSResult>;
    /**
     * Batch synthesize multiple texts
     */
    synthesizeBatch(texts: TTSOptions[]): Promise<TTSResult[]>;
    /**
     * Estimate audio duration based on text length and speaking rate
     * Average speaking rate: 150 words per minute at rate 1.0
     */
    private estimateAudioDuration;
    /**
     * Get inter-visual delay in milliseconds
     */
    getInterVisualDelay(): number;
    /**
     * Test TTS connection and credentials
     */
    testConnection(): Promise<boolean>;
}
export declare const ttsService: TTSService;
//# sourceMappingURL=tts-service.d.ts.map