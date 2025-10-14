"use strict";
/**
 * Audio-Narration Service
 * Combines narration generation with TTS to produce audio files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStepNarrationWithAudio = generateStepNarrationWithAudio;
exports.getInterVisualDelay = getInterVisualDelay;
exports.isAudioNarrationAvailable = isAudioNarrationAvailable;
const narrationGenerator_1 = require("../agents/narrationGenerator");
const tts_service_1 = require("./tts-service");
const logger_1 = require("../logger");
/**
 * Generate narrations with audio for a complete step
 */
async function generateStepNarrationWithAudio(step, topic, visuals, sessionId) {
    logger_1.logger.info(`[AudioNarration] Generating narrations with audio for step ${step.id}`);
    // Step 1: Generate text narrations (batch API call)
    const textNarrations = await (0, narrationGenerator_1.generateStepNarration)(step, topic, visuals);
    logger_1.logger.info(`[AudioNarration] Text narrations generated: ${textNarrations.narrations.length}`);
    // Step 2: Generate audio for each narration (if TTS enabled)
    const audioNarrations = [];
    let totalAudioSize = 0;
    let hasAudio = false;
    if (tts_service_1.ttsService.isAvailable()) {
        logger_1.logger.info(`[AudioNarration] 🎤 Generating audio for ${textNarrations.narrations.length} narrations...`);
        try {
            const audioStartTime = Date.now();
            // Generate audio for each narration
            for (let i = 0; i < textNarrations.narrations.length; i++) {
                const narration = textNarrations.narrations[i];
                try {
                    logger_1.logger.debug(`[AudioNarration] Synthesizing audio ${i + 1}/${textNarrations.narrations.length}`);
                    // Generate audio file
                    const filename = `step-${step.id}-visual-${narration.visualNumber}-${sessionId}.mp3`;
                    const result = await tts_service_1.ttsService.synthesizeToFile({ text: narration.narration }, filename);
                    // Convert to base64 for easy transmission
                    const audioBase64 = result.audioContent.toString('base64');
                    const audioSize = result.audioContent.length;
                    audioNarrations.push({
                        ...narration,
                        audioBase64,
                        audioUrl: `/audio/${filename}`, // URL endpoint for streaming
                        audioSize,
                        duration: result.audioDuration // Use actual TTS duration
                    });
                    totalAudioSize += audioSize;
                    hasAudio = true;
                    logger_1.logger.debug(`[AudioNarration] ✅ Audio ${i + 1} generated: ${audioSize} bytes, ${result.audioDuration}s`);
                }
                catch (error) {
                    logger_1.logger.error(`[AudioNarration] Failed to generate audio for narration ${i + 1}: ${error.message}`);
                    // Include narration without audio
                    audioNarrations.push({
                        ...narration,
                        audioBase64: undefined,
                        audioUrl: undefined
                    });
                }
            }
            const audioElapsed = Date.now() - audioStartTime;
            logger_1.logger.info(`[AudioNarration] ✅ Audio generation complete in ${audioElapsed}ms`);
            logger_1.logger.info(`[AudioNarration] Total audio size: ${(totalAudioSize / 1024 / 1024).toFixed(2)} MB`);
        }
        catch (error) {
            logger_1.logger.error(`[AudioNarration] Batch audio generation failed: ${error.message}`);
            // Fallback: return narrations without audio
            audioNarrations.push(...textNarrations.narrations.map(n => ({
                ...n,
                audioBase64: undefined,
                audioUrl: undefined
            })));
        }
    }
    else {
        logger_1.logger.warn(`[AudioNarration] TTS service not available, returning text-only narrations`);
        // Return narrations without audio
        audioNarrations.push(...textNarrations.narrations.map(n => ({
            ...n,
            audioBase64: undefined,
            audioUrl: undefined
        })));
    }
    return {
        ...textNarrations,
        narrations: audioNarrations,
        hasAudio,
        totalAudioSize
    };
}
/**
 * Get the inter-visual delay (time to wait between visuals)
 */
function getInterVisualDelay() {
    return tts_service_1.ttsService.getInterVisualDelay();
}
/**
 * Check if audio narration is available
 */
function isAudioNarrationAvailable() {
    return tts_service_1.ttsService.isAvailable();
}
