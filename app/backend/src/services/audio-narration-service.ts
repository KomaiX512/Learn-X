/**
 * Audio-Narration Service
 * Combines narration generation with TTS to produce audio files
 */

import { generateStepNarration, StepNarration, NarrationOutput } from '../agents/narrationGenerator';
import { ttsService } from './tts-service';
import { PlanStep } from '../types';
import { logger } from '../logger';
import * as path from 'path';

export interface AudioNarration extends NarrationOutput {
  audioUrl?: string; // URL to access audio file
  audioBase64?: string; // Base64 encoded audio (for embedding)
  audioSize?: number; // Audio file size in bytes
}

export interface StepAudioNarration extends StepNarration {
  narrations: AudioNarration[];
  hasAudio: boolean;
  totalAudioSize: number;
}

export interface VisualInput {
  type: 'notes' | 'animation';
  visualNumber: number;
  svgCode?: string;
  actionCount?: number;
  description?: string;
}

/**
 * Generate narrations with audio for a complete step
 */
export async function generateStepNarrationWithAudio(
  step: PlanStep,
  topic: string,
  visuals: VisualInput[],
  sessionId: string
): Promise<StepAudioNarration> {
  
  logger.info(`[AudioNarration] Generating narrations with audio for step ${step.id}`);
  
  // Step 1: Generate text narrations (batch API call)
  const textNarrations = await generateStepNarration(step, topic, visuals);
  logger.info(`[AudioNarration] Text narrations generated: ${textNarrations.narrations.length}`);
  
  // Step 2: Generate audio for each narration (if TTS enabled)
  const audioNarrations: AudioNarration[] = [];
  let totalAudioSize = 0;
  let hasAudio = false;
  
  if (ttsService.isAvailable()) {
    logger.info(`[AudioNarration] 🎤 Generating audio for ${textNarrations.narrations.length} narrations...`);
    
    try {
      const audioStartTime = Date.now();
      
      // Generate audio for each narration
      for (let i = 0; i < textNarrations.narrations.length; i++) {
        const narration = textNarrations.narrations[i];
        
        try {
          logger.debug(`[AudioNarration] Synthesizing audio ${i + 1}/${textNarrations.narrations.length}`);
          
          // Generate audio file
          const filename = `step-${step.id}-visual-${narration.visualNumber}-${sessionId}.mp3`;
          const result = await ttsService.synthesizeToFile(
            { text: narration.narration },
            filename
          );
          
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
          
          logger.debug(`[AudioNarration] ✅ Audio ${i + 1} generated: ${audioSize} bytes, ${result.audioDuration}s`);
          
        } catch (error: any) {
          logger.error(`[AudioNarration] Failed to generate audio for narration ${i + 1}: ${error.message}`);
          // Include narration without audio
          audioNarrations.push({
            ...narration,
            audioBase64: undefined,
            audioUrl: undefined
          });
        }
      }
      
      const audioElapsed = Date.now() - audioStartTime;
      logger.info(`[AudioNarration] ✅ Audio generation complete in ${audioElapsed}ms`);
      logger.info(`[AudioNarration] Total audio size: ${(totalAudioSize / 1024 / 1024).toFixed(2)} MB`);
      
    } catch (error: any) {
      logger.error(`[AudioNarration] Batch audio generation failed: ${error.message}`);
      // Fallback: return narrations without audio
      audioNarrations.push(...textNarrations.narrations.map(n => ({
        ...n,
        audioBase64: undefined,
        audioUrl: undefined
      })));
    }
    
  } else {
    logger.warn(`[AudioNarration] TTS service not available, returning text-only narrations`);
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
export function getInterVisualDelay(): number {
  return ttsService.getInterVisualDelay();
}

/**
 * Check if audio narration is available
 */
export function isAudioNarrationAvailable(): boolean {
  return ttsService.isAvailable();
}
